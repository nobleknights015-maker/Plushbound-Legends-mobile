function normalizeId(value) {
  return String(value ?? '').trim().replace(/^\/+|\/+$/g, '');
}

function clone(value) {
  return value == null ? value : structuredClone(value);
}

const DEFAULT_BINDINGS = Object.freeze({
  'ui/windowskin': 'ui/windowskin/plushbound-classic',
  'ui/cursor': 'ui/cursor/thread-glow',
  'ui/panel': 'ui/panel/stitch-frame',
  'ui/portrait-frame': 'ui/frame/portrait-thread',
  'ui/quest-active': 'ui/quest/active',
  'ui/quest-complete': 'ui/quest/complete',
  'ui/shop-buy': 'ui/shop/buy',
  'ui/shop-sell': 'ui/shop/sell',
  'ui/save-empty': 'ui/save/empty-thread',
  'ui/save-filled': 'ui/save/filled-thread',
  'icon/default-item': 'icons/item/threadmend-tonic',
  'icon/default-skill': 'icons/skill/thread-burst',
  'icon/default-weapon': 'icons/weapon/threadblade',
  'icon/default-armor': 'icons/armor/stitched-vest',
  'portrait/default-player': 'portraits/player/traveler',
  'portrait/default-guardian': 'portraits/guardian/cinder'
});

export class AssetBindingRegistry {
  constructor({ bindings = {}, fallback = true } = {}) {
    this.fallback = fallback !== false;
    this.bindings = new Map(Object.entries({ ...DEFAULT_BINDINGS, ...bindings }).map(([k, v]) => [normalizeId(k), normalizeId(v)]));
  }

  bind(logicalId, assetId) {
    const key = normalizeId(logicalId);
    const value = normalizeId(assetId);
    if (!key || !value) throw new Error('logicalId and assetId are required');
    this.bindings.set(key, value);
    return this;
  }

  unbind(logicalId) {
    return this.bindings.delete(normalizeId(logicalId));
  }

  has(logicalId) {
    return this.bindings.has(normalizeId(logicalId));
  }

  resolve(logicalId, fallbackId = null) {
    const key = normalizeId(logicalId);
    if (this.bindings.has(key)) return this.bindings.get(key);
    if (fallbackId) return normalizeId(fallbackId);
    if (!this.fallback) return null;
    return key || null;
  }

  itemIcon(item = {}) {
    if (item.iconAssetId) return normalizeId(item.iconAssetId);
    const kind = normalizeId(item.kind || 'item');
    const id = normalizeId(item.id);
    const direct = id ? `icons/${kind}/${id}` : null;
    if (direct && this.bindings.has(direct)) return this.bindings.get(direct);
    const fallbackKey = kind === 'skills' || kind === 'skill' ? 'icon/default-skill'
      : kind === 'weapons' || kind === 'weapon' ? 'icon/default-weapon'
      : kind === 'armor' ? 'icon/default-armor'
      : 'icon/default-item';
    return this.resolve(direct, this.resolve(fallbackKey));
  }

  portrait(entity = {}, role = 'player') {
    if (entity.portraitAssetId) return normalizeId(entity.portraitAssetId);
    if (entity.id) {
      const direct = `portraits/${normalizeId(role)}/${normalizeId(entity.id)}`;
      if (this.bindings.has(direct)) return this.bindings.get(direct);
    }
    return this.resolve(role === 'guardian' ? 'portrait/default-guardian' : 'portrait/default-player');
  }

  snapshot() {
    return clone(Object.fromEntries([...this.bindings.entries()].sort(([a], [b]) => a.localeCompare(b))));
  }
}

export { DEFAULT_BINDINGS as DEFAULT_UI_ASSET_BINDINGS };
