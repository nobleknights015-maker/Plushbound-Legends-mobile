import { AssetBindingRegistry } from '../ui/AssetBindingRegistry.js';

function clamp(value, min, max) { return Math.max(min, Math.min(max, Number(value) || 0)); }
function rect(value = {}) {
  return {
    x: Math.round(Number(value.x) || 0),
    y: Math.round(Number(value.y) || 0),
    width: Math.max(1, Math.round(Number(value.width) || 1)),
    height: Math.max(1, Math.round(Number(value.height) || 1))
  };
}

export class ClassicUiRenderer {
  constructor({ assets = null, corner = 16, cursorPulseMs = 900 } = {}) {
    this.assets = assets || new AssetBindingRegistry();
    this.corner = Math.max(1, Math.round(Number(corner) || 16));
    this.cursorPulseMs = Math.max(120, Number(cursorPulseMs) || 900);
  }

  windowCommands(model, { skinAssetId = null, z = 100 } = {}) {
    if (!model?.rect) return [];
    const target = rect(model.rect);
    const skin = skinAssetId || this.assets.resolve('ui/windowskin');
    const c = Math.min(this.corner, Math.floor(target.width / 2), Math.floor(target.height / 2));
    const source = {
      tl: { x: 0, y: 0, width: c, height: c },
      t: { x: c, y: 0, width: c, height: c },
      tr: { x: c * 2, y: 0, width: c, height: c },
      l: { x: 0, y: c, width: c, height: c },
      center: { x: c, y: c, width: c, height: c },
      r: { x: c * 2, y: c, width: c, height: c },
      bl: { x: 0, y: c * 2, width: c, height: c },
      b: { x: c, y: c * 2, width: c, height: c },
      br: { x: c * 2, y: c * 2, width: c, height: c }
    };
    const x1 = target.x, x2 = target.x + c, x3 = target.x + target.width - c;
    const y1 = target.y, y2 = target.y + c, y3 = target.y + target.height - c;
    const middleW = Math.max(0, target.width - c * 2);
    const middleH = Math.max(0, target.height - c * 2);
    const part = (name, destination, order) => ({ kind: 'ui-nine-slice', assetId: skin, part: name, source: source[name], destination: rect(destination), z: z + order });
    return [
      part('center', { x: x2, y: y2, width: Math.max(1, middleW), height: Math.max(1, middleH) }, 0),
      part('t', { x: x2, y: y1, width: Math.max(1, middleW), height: c }, 1),
      part('b', { x: x2, y: y3, width: Math.max(1, middleW), height: c }, 1),
      part('l', { x: x1, y: y2, width: c, height: Math.max(1, middleH) }, 1),
      part('r', { x: x3, y: y2, width: c, height: Math.max(1, middleH) }, 1),
      part('tl', { x: x1, y: y1, width: c, height: c }, 2),
      part('tr', { x: x3, y: y1, width: c, height: c }, 2),
      part('bl', { x: x1, y: y3, width: c, height: c }, 2),
      part('br', { x: x3, y: y3, width: c, height: c }, 2)
    ];
  }

  iconCommand({ assetId = null, x = 0, y = 0, size = 32, opacity = 1, z = 200 } = {}) {
    return {
      kind: 'ui-image',
      role: 'icon',
      assetId: assetId || this.assets.resolve('icon/default-item'),
      destination: rect({ x, y, width: size, height: size }),
      opacity: clamp(opacity, 0, 1),
      z
    };
  }

  portraitCommands({ assetId = null, frameAssetId = null, x = 0, y = 0, width = 144, height = 144, z = 200 } = {}) {
    const target = rect({ x, y, width, height });
    return [
      { kind: 'ui-image', role: 'portrait', assetId: assetId || this.assets.resolve('portrait/default-player'), destination: target, opacity: 1, z },
      { kind: 'ui-image', role: 'portrait-frame', assetId: frameAssetId || this.assets.resolve('ui/portrait-frame'), destination: target, opacity: 1, z: z + 1 }
    ];
  }

  selectionCommands({ itemRect, cursorAssetId = null, timeMs = 0, enabled = true, z = 400 } = {}) {
    if (!itemRect) return [];
    const target = rect(itemRect);
    const phase = ((Math.max(0, Number(timeMs) || 0) % this.cursorPulseMs) / this.cursorPulseMs) * Math.PI * 2;
    const pulse = enabled ? 0.72 + (Math.sin(phase) + 1) * 0.14 : 0.35;
    return [
      { kind: 'ui-selection-highlight', destination: target, opacity: pulse, z },
      { kind: 'ui-image', role: 'cursor', assetId: cursorAssetId || this.assets.resolve('ui/cursor'), destination: rect({ x: target.x - 22, y: target.y + target.height / 2 - 10, width: 20, height: 20 }), opacity: enabled ? 1 : 0.5, z: z + 1 }
    ];
  }

  transitionCommands(model = {}, { progress = 0, viewportWidth = 1604, viewportHeight = 720, z = 100000 } = {}) {
    const p = clamp(progress, 0, 1);
    const direction = model.direction === 'out' ? 'out' : 'in';
    const opacity = direction === 'in' ? 1 - p : p;
    if (model.type === 'battle' && model.assetId) {
      const slide = direction === 'in' ? (1 - p) * viewportWidth : p * -viewportWidth;
      return [{ kind: 'ui-transition-image', assetId: model.assetId, destination: rect({ x: slide, y: 0, width: viewportWidth, height: viewportHeight }), opacity: 1, z }];
    }
    return [{ kind: 'ui-fade', destination: rect({ x: 0, y: 0, width: viewportWidth, height: viewportHeight }), opacity, z }];
  }

  composeScreen(model = {}, { timeMs = 0 } = {}) {
    const commands = [];
    const skin = model.skinAssetId || this.assets.resolve('ui/windowskin');
    const cursor = model.cursorAssetId || this.assets.resolve('ui/cursor');
    if (model.background?.kind === 'dimmer') commands.push({ kind: 'ui-dimmer', opacity: clamp(model.background.opacity, 0, 1), z: 0 });
    for (const layer of model.layers || []) {
      if (layer.kind === 'window') {
        commands.push(...this.windowCommands(layer.model, { skinAssetId: skin, z: Number(layer.z) || 100 }));
        for (const item of layer.model?.items || []) if (item.selected) commands.push(...this.selectionCommands({ itemRect: item.rect, cursorAssetId: cursor, timeMs, enabled: item.enabled !== false, z: (Number(layer.z) || 100) + 20 }));
      }
      if (layer.kind === 'party-status') {
        for (const card of layer.cards || []) commands.push(...this.portraitCommands({ assetId: card.portraitAssetId, x: card.rect.x + 8, y: card.rect.y + 8, width: 108, height: 108, z: Number(layer.z) || 200 }));
      }
      if (layer.kind === 'guardian-status' && layer.card) commands.push(...this.portraitCommands({ assetId: layer.card.portraitAssetId, x: layer.card.rect.x + 10, y: layer.card.rect.y + 10, width: 120, height: 120, z: Number(layer.z) || 220 }));
    }
    for (const row of model.rows || model.list || []) {
      if (row.iconAssetId) commands.push(this.iconCommand({ assetId: row.iconAssetId, x: row.rect.x + 8, y: row.rect.y + Math.max(0, (row.rect.height - 32) / 2), size: 32, opacity: row.enabled === false ? 0.45 : 1, z: 240 }));
      if (row.selected) commands.push(...this.selectionCommands({ itemRect: row.rect, cursorAssetId: cursor, timeMs, enabled: row.enabled !== false, z: 260 }));
    }
    if (model.help?.rect) commands.push(...this.windowCommands(model.help, { skinAssetId: skin, z: 100 }));
    if (model.goldWindow?.rect) commands.push(...this.windowCommands(model.goldWindow, { skinAssetId: skin, z: 110 }));
    if (model.detail?.rect) commands.push(...this.windowCommands(model.detail, { skinAssetId: skin, z: 120 }));
    return commands.sort((a, b) => (a.z ?? 0) - (b.z ?? 0));
  }
}
