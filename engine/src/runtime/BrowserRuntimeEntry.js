import { AssetManager } from '../assets/AssetManager.js';
import { ContentAssetCatalog } from '../assets/ContentAssetCatalog.js';
import { AssetBindingRegistry } from '../ui/AssetBindingRegistry.js';
import { SceneRenderExecutor } from '../render/SceneRenderExecutor.js';

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

export async function bootPlushboundEngineV1({
  scope = globalThis,
  manifest = null,
  manifestUrl = null,
  backend = null,
  strictBindings = false
} = {}) {
  if (scope.__PLUSHBOUND_ENGINE_V1__?.booted) return scope.__PLUSHBOUND_ENGINE_V1__;

  const bindings = new AssetBindingRegistry({ fallback: !strictBindings });
  const assetManager = new AssetManager({ loader: descriptor => imageLoader(descriptor, scope), maxEntries: 128 });
  const catalog = new ContentAssetCatalog({ assetManager, bindings });
  const executor = new SceneRenderExecutor({ backend });

  let resolvedManifest = manifest;
  if (!resolvedManifest && manifestUrl && typeof scope.fetch === 'function') {
    const response = await scope.fetch(manifestUrl);
    if (!response.ok) throw new Error(`Unable to load Plushbound asset manifest: ${response.status}`);
    resolvedManifest = await response.json();
  }

  const validation = resolvedManifest ? catalog.registerManifest(resolvedManifest) : catalog.validation();
  const runtime = {
    booted: true,
    version: 'engine-v1',
    assetManager,
    bindings,
    catalog,
    executor,
    validation,
    composeScene: (scene, options = {}) => executor.compose(scene, options),
    renderScene: (scene, options = {}) => executor.execute(scene, options)
  };

  scope.__PLUSHBOUND_ENGINE_V1__ = runtime;
  scope.dispatchEvent?.(new (scope.CustomEvent || class { constructor(type, init) { this.type = type; this.detail = init?.detail; } })('plushbound-engine-v1-ready', {
    detail: { version: runtime.version, validAssets: validation.valid }
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
