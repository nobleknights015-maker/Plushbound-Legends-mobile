import './NativeRuntimeHardening.js';
import { AssetManager } from '../assets/AssetManager.js';
import { ContentAssetCatalog } from '../assets/ContentAssetCatalog.js';
import { AssetBindingRegistry } from '../ui/AssetBindingRegistry.js';
import { SceneRenderExecutor } from '../render/SceneRenderExecutor.js';
import { Canvas2DRenderBackend } from '../render/Canvas2DRenderBackend.js';
import { InputManager } from '../input/InputManager.js';
import { LiveInputRouter } from '../input/LiveInputRouter.js';
import { SceneInteractionController } from '../scenes/SceneInteractionController.js';
import { readCssSafeArea, normalizeSafeInsets, classifyScreen, responsiveAnchor } from '../platform/ScreenAdaptation.js';

function imageLoader(descriptor, scope = globalThis) {
  if (descriptor.type !== 'image' || typeof scope.Image !== 'function') return Promise.resolve({ id: descriptor.id, descriptor });
  return new Promise((resolve, reject) => {
    const image = new scope.Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Failed to load asset ${descriptor.id} from ${descriptor.path}`));
    image.src = descriptor.path;
  });
}

export function lockNativeGameSurface(scope = globalThis) {
  const document = scope.document;
  const html = document?.documentElement;
  const body = document?.body;
  if (!html?.style || !body?.style) return () => {};
  const props = ['overflow', 'overscrollBehavior', 'position', 'inset', 'width', 'height', 'margin', 'padding', 'touchAction', 'background'];
  const prior = new Map();
  for (const element of [html, body]) {
    prior.set(element, Object.fromEntries(props.map(prop => [prop, element.style[prop] || ''])));
    Object.assign(element.style, {
      overflow: 'hidden',
      overscrollBehavior: 'none',
      position: 'fixed',
      inset: '0',
      width: '100%',
      height: '100%',
      margin: '0',
      padding: '0',
      touchAction: 'none',
      background: '#000'
    });
  }
  scope.scrollTo?.(0, 0);
  return () => {
    for (const [element, values] of prior) Object.assign(element.style, values);
  };
}

function ensureCanvas(scope, canvas = null) {
  if (canvas) return canvas;
  const document = scope.document;
  if (!document?.createElement) return null;
  const existing = document.querySelector?.('[data-plushbound-engine-canvas]');
  if (existing) return existing;
  const created = document.createElement('canvas');
  created.dataset.plushboundEngineCanvas = 'true';
  created.setAttribute?.('data-plushbound-engine-canvas', '');
  if (created.style) Object.assign(created.style, {
    position: 'fixed', inset: '0', width: '100vw', height: '100vh', background: '#000',
    zIndex: '2147483000', touchAction: 'none', display: 'block'
  });
  document.body?.appendChild?.(created);
  return created;
}

function resolveUrl(value, base, scope = globalThis) {
  if (!value) return null;
  try {
    const Url = scope.URL || globalThis.URL;
    return Url && base ? new Url(String(value), String(base)).href : String(value);
  } catch {
    return String(value);
  }
}

function assetDiagnostics({ validation, manifestUrl, manifest, preloadIds = [] } = {}) {
  const missingRequired = [...(validation?.missingRequired || [])];
  const missingBindings = [...(validation?.missingBindings || [])];
  const messages = [];
  if (!manifest) messages.push('No asset manifest was loaded.');
  for (const id of missingRequired) messages.push(`Missing required asset: ${id}`);
  for (const item of missingBindings) messages.push(`Missing asset binding target: ${item.logicalId} -> ${item.assetId}`);
  return {
    manifestLoaded: !!manifest,
    manifestUrl: manifestUrl || null,
    valid: validation?.valid !== false,
    registered: Number(validation?.registered) || 0,
    preloadCount: preloadIds.length,
    missingRequired,
    missingBindings,
    messages
  };
}

export function resolveRuntimeScriptConfig(scope = globalThis) {
  const document = scope.document;
  if (!document) return { script: null, manifestUrl: null };
  const script = document.currentScript || document.querySelector?.('script[data-plushbound-engine-v1="runtime"]') || null;
  const manifest = script?.dataset?.assetManifest || script?.getAttribute?.('data-asset-manifest') || null;
  const base = script?.src || document.baseURI || scope.location?.href || null;
  return { script, manifestUrl: resolveUrl(manifest, base, scope) };
}

export async function bootPlushboundEngineV1({
  scope = globalThis,
  manifest = null,
  manifestUrl = null,
  backend = null,
  canvas = null,
  input = null,
  onAction = null,
  safeInsets = null,
  strictBindings = false,
  strictAssets = false
} = {}) {
  if (scope.__PLUSHBOUND_ENGINE_V1__?.booted) return scope.__PLUSHBOUND_ENGINE_V1__;

  const unlockSurface = lockNativeGameSurface(scope);
  const bindings = new AssetBindingRegistry({ fallback: !strictBindings });
  const assetManager = new AssetManager({ loader: descriptor => imageLoader(descriptor, scope), maxEntries: 128 });
  const catalog = new ContentAssetCatalog({ assetManager, bindings });

  let resolvedManifest = manifest;
  if (!resolvedManifest && manifestUrl && typeof scope.fetch === 'function') {
    const response = await scope.fetch(manifestUrl);
    if (!response.ok) throw new Error(`Unable to load Plushbound asset manifest: ${response.status}`);
    resolvedManifest = await response.json();
  }

  const validation = resolvedManifest ? catalog.registerManifest(resolvedManifest) : catalog.validation();
  const preloadIds = resolvedManifest ? catalog.preloadIds() : [];
  const diagnostics = assetDiagnostics({ validation, manifestUrl, manifest: resolvedManifest, preloadIds });
  if (strictAssets && !diagnostics.valid) {
    unlockSurface();
    throw new Error(`Plushbound asset validation failed: ${diagnostics.messages.join('; ') || 'unknown asset error'}`);
  }
  if (resolvedManifest) await assetManager.preload(preloadIds);

  const renderCanvas = backend ? canvas : ensureCanvas(scope, canvas);
  const liveBackend = backend || (renderCanvas ? new Canvas2DRenderBackend({ canvas: renderCanvas, assetManager, scope }) : null);
  const executor = new SceneRenderExecutor({ backend: liveBackend });
  const inputManager = input || new InputManager({ touchDeadzone: 14 });
  const actionListeners = new Set();
  const interactionErrors = [];
  const emitInteractionError = (error, action = null) => {
    const detail = { error: String(error?.stack || error), action };
    interactionErrors.push(detail);
    if (interactionErrors.length > 20) interactionErrors.shift();
    scope.dispatchEvent?.(new (scope.CustomEvent || class { constructor(type, init) { this.type = type; this.detail = init?.detail; } })('plushbound-engine-v1-interaction-error', { detail }));
    scope.console?.error?.('[Plushbound Engine v1] interaction failed', error);
    return detail;
  };
  const invokeActionListener = (listener, action) => {
    try {
      const result = listener(action);
      if (result && typeof result.then === 'function') result.catch(error => emitInteractionError(error, action));
      return result;
    } catch (error) {
      emitInteractionError(error, action);
      return null;
    }
  };
  if (typeof onAction === 'function') actionListeners.add(onAction);
  const inputRouter = new LiveInputRouter({
    input: inputManager,
    mapPoint: (x, y) => liveBackend?.pointFromClient?.(x, y) || { x: Number(x) || 0, y: Number(y) || 0 },
    onAction: action => {
      for (const listener of actionListeners) invokeActionListener(listener, action);
      scope.dispatchEvent?.(new (scope.CustomEvent || class { constructor(type, init) { this.type = type; this.detail = init?.detail; } })('plushbound-engine-v1-action', { detail: action }));
    }
  });
  inputRouter.attach(renderCanvas);

  const interaction = new SceneInteractionController({
    render: scene => {
      inputRouter.setScene(scene);
      return executor.execute(scene);
    }
  });
  actionListeners.add(action => interaction.handle(action));

  let runtimeSafeInsets = safeInsets ? normalizeSafeInsets(safeInsets) : readCssSafeArea(scope);
  const resize = () => liveBackend?.resize?.(
    renderCanvas?.clientWidth || scope.innerWidth || 1604,
    renderCanvas?.clientHeight || scope.innerHeight || 720,
    scope.devicePixelRatio || 1,
    runtimeSafeInsets
  );
  resize();
  scope.addEventListener?.('resize', resize, { passive: true });
  scope.addEventListener?.('orientationchange', resize, { passive: true });

  const runtime = {
    booted: true,
    version: 'engine-v1',
    assetManager,
    bindings,
    catalog,
    executor,
    backend: liveBackend,
    canvas: renderCanvas,
    input: inputManager,
    inputRouter,
    interaction,
    validation,
    diagnostics,
    resize,
    interactionErrors: () => structuredClone(interactionErrors),
    viewportInfo: () => liveBackend?.viewport?.snapshot?.() || null,
    screenProfile: () => {
      const info = liveBackend?.viewport?.snapshot?.();
      return classifyScreen({ width: info?.cssWidth || scope.innerWidth || 1604, height: info?.cssHeight || scope.innerHeight || 720 });
    },
    anchorUi: spec => {
      const info = liveBackend?.viewport?.snapshot?.();
      const safeArea = info?.safeArea || { x: 0, y: 0, width: 1604, height: 720 };
      return responsiveAnchor({ ...spec, safeArea });
    },
    setSafeAreaInsets: insets => {
      runtimeSafeInsets = normalizeSafeInsets(insets);
      return liveBackend?.setSafeAreaInsets?.(runtimeSafeInsets) || null;
    },
    refreshSafeAreaInsets: () => {
      runtimeSafeInsets = readCssSafeArea(scope);
      return liveBackend?.setSafeAreaInsets?.(runtimeSafeInsets) || null;
    },
    mapClientPoint: (x, y) => liveBackend?.pointFromClient?.(x, y) || { x: Number(x) || 0, y: Number(y) || 0 },
    onAction: listener => { if (typeof listener === 'function') actionListeners.add(listener); return () => actionListeners.delete(listener); },
    registerInteraction: (sceneType, id, handler) => { interaction.register(sceneType, id, handler); return runtime; },
    composeScene: (scene, options = {}) => executor.compose(scene, options),
    renderScene: (scene, options = {}) => {
      interaction.setScene(scene);
      inputRouter.setScene(scene);
      return executor.execute(scene, options);
    },
    handleAction: async action => {
      try { return await interaction.handle(action); }
      catch (error) { emitInteractionError(error, action); return { error: true }; }
    },
    destroy: () => {
      inputRouter.detach();
      inputManager.clearAll();
      scope.removeEventListener?.('resize', resize);
      scope.removeEventListener?.('orientationchange', resize);
      actionListeners.clear();
      unlockSurface();
    }
  };

  scope.__PLUSHBOUND_ENGINE_V1__ = runtime;
  scope.dispatchEvent?.(new (scope.CustomEvent || class { constructor(type, init) { this.type = type; this.detail = init?.detail; } })('plushbound-engine-v1-ready', {
    detail: {
      version: runtime.version,
      validAssets: validation.valid,
      liveRenderer: !!liveBackend,
      liveInput: !!renderCanvas,
      liveInteractions: true,
      screenProfile: runtime.screenProfile().profile,
      diagnostics
    }
  }));
  return runtime;
}

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  const { manifestUrl } = resolveRuntimeScriptConfig(window);
  bootPlushboundEngineV1({ scope: window, manifestUrl }).catch(error => {
    window.__PLUSHBOUND_ENGINE_V1_BOOT_ERROR__ = String(error?.stack || error);
    console.error('[Plushbound Engine v1] bootstrap failed', error);
  });
}
