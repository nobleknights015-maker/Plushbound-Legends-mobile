import { AssetManager } from '../assets/AssetManager.js';
import { ContentAssetCatalog } from '../assets/ContentAssetCatalog.js';
import { AssetBindingRegistry } from '../ui/AssetBindingRegistry.js';
import { SceneRenderExecutor } from '../render/SceneRenderExecutor.js';
import { Canvas2DRenderBackend } from '../render/Canvas2DRenderBackend.js';
import { InputManager } from '../input/InputManager.js';
import { LiveInputRouter } from '../input/LiveInputRouter.js';

function imageLoader(descriptor, scope = globalThis) {
  if (descriptor.type !== 'image' || typeof scope.Image !== 'function') {
    return Promise.resolve({ id: descriptor.id, descriptor });
  }
  return new Promise((resolve, reject) => {
    const image = new scope.Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Failed to load asset ${descriptor.id} from ${descriptor.path}`));
    image.src = descriptor.path;
  });
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
  if (created.style) {
    created.style.position = 'fixed';
    created.style.inset = '0';
    created.style.width = '100vw';
    created.style.height = '100vh';
    created.style.background = '#000';
    created.style.zIndex = '2147483000';
    created.style.touchAction = 'none';
  }
  document.body?.appendChild?.(created);
  return created;
}

export async function bootPlushboundEngineV1({
  scope = globalThis,
  manifest = null,
  manifestUrl = null,
  backend = null,
  canvas = null,
  input = null,
  onAction = null,
  strictBindings = false
} = {}) {
  if (scope.__PLUSHBOUND_ENGINE_V1__?.booted) return scope.__PLUSHBOUND_ENGINE_V1__;

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
  if (resolvedManifest) await assetManager.preload(catalog.preloadIds());

  const renderCanvas = backend ? canvas : ensureCanvas(scope, canvas);
  const liveBackend = backend || (renderCanvas ? new Canvas2DRenderBackend({ canvas: renderCanvas, assetManager, scope }) : null);
  const executor = new SceneRenderExecutor({ backend: liveBackend });
  const inputManager = input || new InputManager({ touchDeadzone: 14 });
  const actionListeners = new Set();
  if (typeof onAction === 'function') actionListeners.add(onAction);
  const inputRouter = new LiveInputRouter({
    input: inputManager,
    mapPoint: (x, y) => liveBackend?.pointFromClient?.(x, y) || { x: Number(x) || 0, y: Number(y) || 0 },
    onAction: action => {
      for (const listener of actionListeners) listener(action);
      scope.dispatchEvent?.(new (scope.CustomEvent || class { constructor(type, init) { this.type = type; this.detail = init?.detail; } })('plushbound-engine-v1-action', { detail: action }));
    }
  });
  inputRouter.attach(renderCanvas);

  const resize = () => liveBackend?.resize?.(
    renderCanvas?.clientWidth || scope.innerWidth || 1604,
    renderCanvas?.clientHeight || scope.innerHeight || 720,
    scope.devicePixelRatio || 1
  );
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
    validation,
    resize,
    mapClientPoint: (x, y) => liveBackend?.pointFromClient?.(x, y) || { x: Number(x) || 0, y: Number(y) || 0 },
    onAction: listener => { if (typeof listener === 'function') actionListeners.add(listener); return () => actionListeners.delete(listener); },
    composeScene: (scene, options = {}) => executor.compose(scene, options),
    renderScene: (scene, options = {}) => {
      inputRouter.setScene(scene);
      return executor.execute(scene, options);
    },
    destroy: () => {
      inputRouter.detach();
      inputManager.clearAll();
      scope.removeEventListener?.('resize', resize);
      scope.removeEventListener?.('orientationchange', resize);
      actionListeners.clear();
    }
  };

  scope.__PLUSHBOUND_ENGINE_V1__ = runtime;
  scope.dispatchEvent?.(new (scope.CustomEvent || class { constructor(type, init) { this.type = type; this.detail = init?.detail; } })('plushbound-engine-v1-ready', {
    detail: { version: runtime.version, validAssets: validation.valid, liveRenderer: !!liveBackend, liveInput: !!renderCanvas }
  }));
  return runtime;
}

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  const script = document.currentScript;
  const manifestUrl = script?.dataset?.assetManifest || null;
  bootPlushboundEngineV1({ scope: window, manifestUrl }).catch(error => {
    window.__PLUSHBOUND_ENGINE_V1_BOOT_ERROR__ = String(error?.stack || error);
    console.error('[Plushbound Engine v1] bootstrap failed', error);
  });
}
