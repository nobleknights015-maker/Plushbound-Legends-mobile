function normalizeId(value) {
  return String(value ?? '').trim().replace(/^\/+|\/+$/g, '');
}

function clone(value) {
  return value == null ? value : structuredClone(value);
}

export class ContentAssetCatalog {
  constructor({ assetManager = null, bindings = null, required = [] } = {}) {
    this.assetManager = assetManager;
    this.bindings = bindings;
    this.required = new Set(required.map(normalizeId).filter(Boolean));
    this.entries = new Map();
  }

  register(entry = {}) {
    const id = normalizeId(entry.id);
    if (!id) throw new Error('Asset catalog entry requires id');
    if (!entry.path) throw new Error(`Asset catalog entry ${id} requires path`);
    const normalized = {
      id,
      path: String(entry.path),
      type: String(entry.type || 'image'),
      width: entry.width == null ? null : Math.max(1, Number(entry.width) || 1),
      height: entry.height == null ? null : Math.max(1, Number(entry.height) || 1),
      tags: Array.isArray(entry.tags) ? [...new Set(entry.tags.map(String))] : [],
      preload: entry.preload === true,
      required: entry.required === true || this.required.has(id),
      meta: clone(entry.meta || {})
    };
    this.entries.set(id, normalized);
    this.assetManager?.register?.(id, normalized);
    return clone(normalized);
  }

  registerManifest(manifest = {}) {
    const assets = Array.isArray(manifest) ? manifest : manifest.assets;
    if (!Array.isArray(assets)) throw new Error('Asset manifest requires assets array');
    for (const entry of assets) this.register(entry);
    for (const [logicalId, assetId] of Object.entries(manifest.bindings || {})) this.bindings?.bind?.(logicalId, assetId);
    for (const id of manifest.required || []) this.required.add(normalizeId(id));
    return this.validation();
  }

  has(id) { return this.entries.has(normalizeId(id)); }
  get(id) { return clone(this.entries.get(normalizeId(id)) || null); }

  preloadIds() {
    return [...this.entries.values()].filter(entry => entry.preload).map(entry => entry.id);
  }

  referencedIds() {
    const ids = new Set();
    for (const id of this.required) if (id) ids.add(id);
    for (const assetId of Object.values(this.bindings?.snapshot?.() || {})) if (assetId) ids.add(normalizeId(assetId));
    return [...ids].sort();
  }

  validation() {
    const missingRequired = [...this.required].filter(id => id && !this.entries.has(id)).sort();
    const missingBindings = [];
    for (const [logicalId, assetId] of Object.entries(this.bindings?.snapshot?.() || {})) {
      if (assetId && !this.entries.has(normalizeId(assetId))) missingBindings.push({ logicalId, assetId: normalizeId(assetId) });
    }
    missingBindings.sort((a, b) => a.logicalId.localeCompare(b.logicalId));
    return {
      valid: missingRequired.length === 0 && missingBindings.length === 0,
      registered: this.entries.size,
      missingRequired,
      missingBindings
    };
  }

  snapshot() {
    return {
      assets: [...this.entries.values()].sort((a, b) => a.id.localeCompare(b.id)).map(clone),
      required: [...this.required].sort(),
      validation: this.validation()
    };
  }
}
