/* Plushbound Legends Engine v1 environment scene registry.
 * Loads the deterministic 216-scene World Editor registry.
 * Ready scenes resolve only from explicit stable-ID bindings.
 * Missing/unproduced scenes fail closed; visual guessing and fallback substitution are forbidden.
 */
(() => {
  'use strict';

  const CONTRACT = Object.freeze({
    schema: 'plushbound.world_editor.environment_registry.v1',
    version: 1,
    sceneCount: 216,
    runtimeReady: 30,
    awaitingNewSource: 186,
  });

  let registry = null;
  let bySceneId = new Map();

  function fail(message) {
    throw new Error(`Plushbound environment registry rejected: ${message}`);
  }

  function readJson(url) {
    if (typeof fetch === 'function') {
      return fetch(url, { cache: 'no-store' }).then(response => {
        if (!response.ok) throw new Error(`HTTP ${response.status} loading ${url}`);
        return response.json();
      });
    }
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('GET', url, true);
      xhr.onreadystatechange = () => {
        if (xhr.readyState !== 4) return;
        if ((xhr.status >= 200 && xhr.status < 300) || xhr.status === 0) {
          try { resolve(JSON.parse(xhr.responseText)); }
          catch (e) { reject(e); }
        } else {
          reject(new Error(`HTTP ${xhr.status} loading ${url}`));
        }
      };
      xhr.onerror = () => reject(new Error(`failed loading ${url}`));
      xhr.send();
    });
  }

  function validateScene(scene) {
    if (!scene || typeof scene !== 'object') fail('scene entry must be an object');
    if (typeof scene.sceneId !== 'string' || !/^environment\/[^/]+\/[^/]+$/.test(scene.sceneId)) {
      fail(`invalid sceneId ${String(scene.sceneId)}`);
    }
    if (typeof scene.regionId !== 'string' || !scene.regionId) fail(`${scene.sceneId}: regionId required`);
    if (typeof scene.sceneSlot !== 'string' || !scene.sceneSlot) fail(`${scene.sceneId}: sceneSlot required`);
    if (scene.sceneId !== `environment/${scene.regionId}/${scene.sceneSlot}`) {
      fail(`${scene.sceneId}: sceneId does not match regionId/sceneSlot`);
    }

    const ready = scene.status === 'RUNTIME_READY_VERIFIED';
    const waiting = scene.status === 'AWAITING_NEW_SOURCE';
    if (!ready && !waiting) fail(`${scene.sceneId}: invalid status ${String(scene.status)}`);

    if (ready) {
      if (typeof scene.runtimeAssetId !== 'string' || !scene.runtimeAssetId) fail(`${scene.sceneId}: runtimeAssetId required`);
      if (typeof scene.runtimePath !== 'string' || !scene.runtimePath) fail(`${scene.sceneId}: runtimePath required`);
      if (!/^[0-9a-f]{64}$/.test(String(scene.sha256 || ''))) fail(`${scene.sceneId}: valid sha256 required`);
      if (scene.dimensions !== '816x624') fail(`${scene.sceneId}: runtime dimensions must be 816x624`);
      if (scene.mode !== 'RGB') fail(`${scene.sceneId}: runtime mode must be RGB`);
    } else {
      if (scene.runtimeAssetId !== null || scene.runtimePath !== null || scene.sha256 !== null) {
        fail(`${scene.sceneId}: unresolved scenes may not carry guessed runtime bindings`);
      }
    }
    return scene;
  }

  function validateRegistry(data) {
    if (!data || typeof data !== 'object') fail('registry must be an object');
    if (data.schema !== CONTRACT.schema) fail(`schema ${String(data.schema)}`);
    if (data.version !== CONTRACT.version) fail(`version ${String(data.version)}`);
    if (data.sceneCount !== CONTRACT.sceneCount) fail(`sceneCount ${String(data.sceneCount)}`);
    if (data.runtimeReady !== CONTRACT.runtimeReady) fail(`runtimeReady ${String(data.runtimeReady)}`);
    if (data.awaitingNewSource !== CONTRACT.awaitingNewSource) fail(`awaitingNewSource ${String(data.awaitingNewSource)}`);
    if (data.failClosed !== true) fail('failClosed must be true');
    if (data.visualGuessingForbidden !== true) fail('visualGuessingForbidden must be true');
    if (data.fallbackSubstitutionForbidden !== true) fail('fallbackSubstitutionForbidden must be true');
    if (!Array.isArray(data.scenes) || data.scenes.length !== CONTRACT.sceneCount) fail('scene array count mismatch');

    const map = new Map();
    let ready = 0;
    let waiting = 0;
    data.scenes.forEach(raw => {
      const scene = Object.freeze({ ...validateScene(raw) });
      if (map.has(scene.sceneId)) fail(`duplicate sceneId ${scene.sceneId}`);
      map.set(scene.sceneId, scene);
      if (scene.status === 'RUNTIME_READY_VERIFIED') ready += 1;
      else waiting += 1;
    });
    if (ready !== CONTRACT.runtimeReady || waiting !== CONTRACT.awaitingNewSource) {
      fail(`status totals ${ready}/${waiting}`);
    }
    return { registry: Object.freeze(data), map };
  }

  async function load(registryUrl = 'data/world_editor/environment_registry_v1.json') {
    const result = validateRegistry(await readJson(registryUrl));
    registry = result.registry;
    bySceneId = result.map;
    console.info(`PLUSHBOUND_ENV_REGISTRY=PASS scenes=${registry.sceneCount} ready=${registry.runtimeReady} waiting=${registry.awaitingNewSource}`);
    return registry;
  }

  function getScene(sceneId) {
    return bySceneId.get(sceneId) || null;
  }

  function requireReady(sceneId) {
    const scene = getScene(sceneId);
    if (!scene) fail(`unknown sceneId ${sceneId}`);
    if (scene.status !== 'RUNTIME_READY_VERIFIED') {
      fail(`${sceneId} is ${scene.status}; fallback substitution is forbidden`);
    }
    return scene;
  }

  function resolveRuntimePath(sceneId) {
    return requireReady(sceneId).runtimePath;
  }

  function stats() {
    return registry ? Object.freeze({
      sceneCount: registry.sceneCount,
      runtimeReady: registry.runtimeReady,
      awaitingNewSource: registry.awaitingNewSource,
    }) : null;
  }

  const api = {
    contract: CONTRACT,
    load,
    getScene,
    requireReady,
    resolveRuntimePath,
    stats,
    get loaded() { return registry !== null; },
  };

  window.PlushboundEnvironmentRegistry = Object.freeze(api);

  const boot = () => load().then(data => {
    window.dispatchEvent(new CustomEvent('plushbound:environment-registry-ready', { detail: stats() }));
    return data;
  }).catch(error => {
    console.error(error);
    window.dispatchEvent(new CustomEvent('plushbound:environment-registry-error', { detail: { message: error.message } }));
    throw error;
  });

  if (document.readyState === 'loading') {
    window.addEventListener('DOMContentLoaded', () => { api.bootPromise = boot(); }, { once: true });
  } else {
    api.bootPromise = boot();
  }
})();
