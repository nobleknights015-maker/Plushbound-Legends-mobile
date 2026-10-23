import { GameState } from '../../engine/src/core/GameState.js';
import { PlushboundGameSession } from './PlushboundGameSession.js';
import { GameShellBridge } from './GameShellBridge.js';
import { GameDomAdapter } from './GameDomAdapter.js';
import { attachPhoneViewportGuard } from './PhoneViewportGuard.js';
import { GameSavePersistence } from './GameSavePersistence.js';
import { createMVPluginRuntime, normalizeMVPluginManifest } from './MVPluginRuntime.js';
import { createMVDatabaseBridge, normalizeMVDatabaseIdRegistry } from './MVDatabaseBridge.js';
import { createMVEventCommandBridge } from './MVEventCommandBridge.js';
import { createMVUiRuntime } from './MVUiRuntime.js';

async function loadJson(url) {
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) throw new Error(`Failed to load ${url}: ${response.status}`);
  return response.json();
}

async function loadOptionalJson(url, fallback) {
  try {
    const response = await fetch(url, { cache: 'no-store' });
    if (response.status === 404) return fallback;
    if (!response.ok) throw new Error(`Failed to load ${url}: ${response.status}`);
    return response.json();
  } catch (error) {
    if (String(error?.message || '').includes(': 404')) return fallback;
    throw error;
  }
}

function resolveBase(scope = globalThis) {
  const script = scope.document?.currentScript;
  if (script?.src) return new URL('.', script.src);
  return new URL('./', scope.location?.href || 'file:///android_asset/');
}

export function ensureStructuredClone(scope = globalThis) {
  if (typeof scope.structuredClone === 'function') return scope.structuredClone;
  const fallback = value => value == null ? value : JSON.parse(JSON.stringify(value));
  scope.structuredClone = fallback;
  if (scope !== globalThis && typeof globalThis.structuredClone !== 'function') globalThis.structuredClone = fallback;
  return fallback;
}

function requiredEntries(entries = []) {
  return entries.filter(entry => entry?.required !== false && entry?.path);
}

async function loadIndexedPackages(index, contentBase) {
  const contentEntries = requiredEntries(index.packages);
  const runtimeEntries = requiredEntries(index.runtimePackages);
  const [contentPackages, runtimePackages] = await Promise.all([
    Promise.all(contentEntries.map(async entry => ({ entry, data: await loadJson(new URL(entry.path, contentBase)) }))),
    Promise.all(runtimeEntries.map(async entry => ({ entry, data: await loadJson(new URL(entry.path, contentBase)) })))
  ]);
  return { contentPackages, runtimePackages };
}

function combineMapPackages(runtimePackages, engineBaseline) {
  const maps = [], seen = new Set();
  for (const { entry, data } of runtimePackages) {
    if (!Array.isArray(data?.maps)) continue;
    if (data.engineBaseline && data.engineBaseline !== engineBaseline) throw new Error(`Runtime package ${entry.id} expects Engine ${data.engineBaseline}; packaged game requires ${engineBaseline}`);
    for (const map of data.maps) {
      const id = String(map?.id || '');
      if (!id) throw new Error(`Runtime package ${entry.id} contains a map without an id`);
      if (seen.has(id)) throw new Error(`Duplicate runtime map id ${id}`);
      seen.add(id); maps.push(map);
    }
  }
  if (!maps.length) throw new Error('No runtime maps were loaded from the content index');
  return { schemaVersion: 1, engineBaseline, maps };
}

export async function bootPlushboundGame({ scope = globalThis, baseUrl } = {}) {
  ensureStructuredClone(scope);
  const runtimeBase = baseUrl ? new URL(baseUrl, scope.location?.href) : resolveBase(scope);
  const root = new URL('../', runtimeBase), contentBase = new URL('content/', root), pluginBase = new URL('plugins/', root);
  const index = await loadJson(new URL('content-index.json', contentBase));
  const [pluginManifest, databaseIdRegistry] = await Promise.all([
    loadOptionalJson(new URL('plugins.json', pluginBase), { schemaVersion: 1, target: 'RPG Maker MV 1.6.x', plugins: [] }).then(normalizeMVPluginManifest),
    loadOptionalJson(new URL('mv-database-ids.json', pluginBase), { schemaVersion: 1, target: 'RPG Maker MV 1.6.x', ids: {} }).then(normalizeMVDatabaseIdRegistry)
  ]);

  const expectedBaseline = '160d9fd95bc0d3db39224f8bb4c5e1e3a1f54425';
  if (index.engineBaseline !== expectedBaseline) throw new Error(`Game content expects Engine ${index.engineBaseline}; packaged game requires ${expectedBaseline}`);

  const loaded = await loadIndexedPackages(index, contentBase);
  const mapPackage = combineMapPackages(loaded.runtimePackages, expectedBaseline);
  const contentPackages = loaded.contentPackages.map(record => record.data);
  const state = new GameState();
  const session = new PlushboundGameSession({ state, contentPackages, mapPackage });
  const autosave = new GameSavePersistence({ scope });
  const restoredSave = autosave.restore(session);
  if (!restoredSave) session.enter(index.start.mapId);

  const viewportGuard = scope.PlushboundPhoneViewportGuard || attachPhoneViewportGuard(scope);
  scope.PlushboundPhoneViewportGuard = viewportGuard;
  const runtime = {
    version: 1, engineBaseline: index.engineBaseline, contentIndex: index, contentPackages,
    runtimeBaseUrl: runtimeBase.href, pluginManifest, mvDatabaseIdRegistry: databaseIdRegistry,
    mvPlugins: null, mvDatabase: null, mvEventCommands: null, mvUi: null,
    loadedPackageIds: loaded.contentPackages.map(record => record.entry.id),
    loadedRuntimePackageIds: loaded.runtimePackages.map(record => record.entry.id),
    loadedMapIds: mapPackage.maps.map(map => map.id),
    state, session, viewportGuard, autosave, restoredSave,
    snapshot: () => session.snapshot(),
    saveNow: (reason = 'manual') => autosave.save(session, reason),
    clearAutosave: () => autosave.clear()
  };

  scope.PlushboundGame = runtime;
  autosave.attach({ session });
  const shellBridge = scope.PlushboundGameShell || new GameShellBridge({ scope }).attach();
  scope.PlushboundGameShell = shellBridge;
  if (scope.document && !scope.PlushboundGameDomAdapter) scope.PlushboundGameDomAdapter = new GameDomAdapter({ scope, bridge: shellBridge }).attach();

  const mvPlugins = createMVPluginRuntime({ scope, runtime, manifest: pluginManifest, baseUrl: pluginBase });
  runtime.mvPlugins = mvPlugins;
  const mvDatabase = createMVDatabaseBridge({ scope, runtime, idRegistry: databaseIdRegistry }).install({ mvPlugins });
  runtime.mvDatabase = mvDatabase;
  const mvEventCommands = createMVEventCommandBridge({ scope, runtime, mvPlugins }).install();
  runtime.mvEventCommands = mvEventCommands;
  const mvUi = createMVUiRuntime({ scope, runtime }).install();
  runtime.mvUi = mvUi;

  const databaseStatus = mvDatabase.snapshot(), eventCommandStatus = mvEventCommands.snapshot(), uiStatus = mvUi.snapshot();
  const pluginStatus = await mvPlugins.loadEnabledPlugins();

  scope.dispatchEvent?.(new CustomEvent('plushbound-game-ready', {
    detail: {
      engineBaseline: index.engineBaseline, startMapId: index.start.mapId, loadedMaps: mapPackage.maps.length, restoredSave,
      mvPluginTarget: pluginStatus.target, configuredPlugins: pluginStatus.configured, loadedPlugins: pluginStatus.loaded.length,
      mvDatabaseCounts: databaseStatus.counts, mvDatabaseMissingIds: databaseStatus.missingRegistryEntries.length,
      mvEventCommandsImplemented: eventCommandStatus.implementedCount, mvEventCommandsDeferred: eventCommandStatus.deferredCount,
      mvUiClassesInstalled: uiStatus.classCount, mvDeepPixiRenderer: uiStatus.deepPixiRenderer
    }
  }));
  viewportGuard.refresh?.(); shellBridge.publish?.('ready'); return runtime;
}

if (typeof window !== 'undefined' && window.document) {
  const script = document.currentScript;
  if (!script?.hasAttribute('data-plushbound-manual-boot')) {
    bootPlushboundGame({ scope: window }).catch(error => {
      console.error('Plushbound game boot failed', error);
      window.dispatchEvent?.(new CustomEvent('plushbound-game-boot-error', { detail: { message: String(error?.message || error) } }));
    });
  }
}
