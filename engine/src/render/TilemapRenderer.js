export class Camera2D {
  constructor({ viewportWidth = 1604, viewportHeight = 720, worldWidth = 1604, worldHeight = 720, x = 0, y = 0, zoom = 1 } = {}) {
    this.viewportWidth = Math.max(1, Number(viewportWidth) || 1);
    this.viewportHeight = Math.max(1, Number(viewportHeight) || 1);
    this.worldWidth = Math.max(this.viewportWidth, Number(worldWidth) || this.viewportWidth);
    this.worldHeight = Math.max(this.viewportHeight, Number(worldHeight) || this.viewportHeight);
    this.zoom = Math.max(0.1, Number(zoom) || 1);
    this.x = 0;
    this.y = 0;
    this.setPosition(x, y);
  }

  setWorldSize(width, height) {
    this.worldWidth = Math.max(1, Number(width) || 1);
    this.worldHeight = Math.max(1, Number(height) || 1);
    return this.setPosition(this.x, this.y);
  }

  setViewport(width, height) {
    this.viewportWidth = Math.max(1, Number(width) || 1);
    this.viewportHeight = Math.max(1, Number(height) || 1);
    return this.setPosition(this.x, this.y);
  }

  setPosition(x, y) {
    const maxX = Math.max(0, this.worldWidth - this.visibleWidth());
    const maxY = Math.max(0, this.worldHeight - this.visibleHeight());
    this.x = clamp(Number(x) || 0, 0, maxX);
    this.y = clamp(Number(y) || 0, 0, maxY);
    return this;
  }

  centerOn(worldX, worldY) {
    return this.setPosition(
      Number(worldX) - this.visibleWidth() / 2,
      Number(worldY) - this.visibleHeight() / 2
    );
  }

  visibleWidth() { return this.viewportWidth / this.zoom; }
  visibleHeight() { return this.viewportHeight / this.zoom; }

  worldToScreen(worldX, worldY) {
    return { x: (Number(worldX) - this.x) * this.zoom, y: (Number(worldY) - this.y) * this.zoom };
  }

  screenToWorld(screenX, screenY) {
    return { x: Number(screenX) / this.zoom + this.x, y: Number(screenY) / this.zoom + this.y };
  }

  bounds(padding = 0) {
    const p = Math.max(0, Number(padding) || 0);
    return {
      left: this.x - p,
      top: this.y - p,
      right: this.x + this.visibleWidth() + p,
      bottom: this.y + this.visibleHeight() + p
    };
  }
}

export class TilemapRenderer {
  constructor({ tileWidth = 48, tileHeight = 48, overscanTiles = 1 } = {}) {
    this.tileWidth = Math.max(1, Number(tileWidth) || 48);
    this.tileHeight = Math.max(1, Number(tileHeight) || 48);
    this.overscanTiles = Math.max(0, Math.floor(Number(overscanTiles) || 0));
  }

  visibleTileBounds(camera, mapWidth, mapHeight) {
    const left = Math.floor(camera.x / this.tileWidth) - this.overscanTiles;
    const top = Math.floor(camera.y / this.tileHeight) - this.overscanTiles;
    const right = Math.ceil((camera.x + camera.visibleWidth()) / this.tileWidth) + this.overscanTiles;
    const bottom = Math.ceil((camera.y + camera.visibleHeight()) / this.tileHeight) + this.overscanTiles;
    return {
      minX: clamp(left, 0, Math.max(0, mapWidth - 1)),
      minY: clamp(top, 0, Math.max(0, mapHeight - 1)),
      maxX: clamp(right, 0, Math.max(0, mapWidth - 1)),
      maxY: clamp(bottom, 0, Math.max(0, mapHeight - 1))
    };
  }

  buildDrawList({ camera, map, sprites = [], overlays = [] } = {}) {
    if (!camera) throw new Error('camera is required');
    if (!map) throw new Error('map is required');
    const width = Math.max(0, Number(map.width) || 0);
    const height = Math.max(0, Number(map.height) || 0);
    const bounds = this.visibleTileBounds(camera, width, height);
    const commands = [];

    const layers = normalizeLayers(map.layers);
    for (let layerIndex = 0; layerIndex < layers.length; layerIndex++) {
      const layer = layers[layerIndex];
      if (layer.visible === false) continue;
      for (let y = bounds.minY; y <= bounds.maxY; y++) {
        for (let x = bounds.minX; x <= bounds.maxX; x++) {
          const tileId = tileAt(layer, x, y, width);
          if (tileId == null || tileId === 0) continue;
          const pos = camera.worldToScreen(x * this.tileWidth, y * this.tileHeight);
          commands.push({ kind: 'tile', layer: layerIndex, z: layer.z ?? layerIndex, tileId, x, y, screenX: pos.x, screenY: pos.y });
        }
      }
    }

    const cameraBounds = camera.bounds(Math.max(this.tileWidth, this.tileHeight));
    for (const sprite of sprites) {
      if (!sprite || sprite.visible === false) continue;
      const worldX = Number(sprite.x) || 0;
      const worldY = Number(sprite.y) || 0;
      const widthPx = Math.max(1, Number(sprite.width) || this.tileWidth);
      const heightPx = Math.max(1, Number(sprite.height) || this.tileHeight);
      if (!rectIntersects(cameraBounds, { left: worldX, top: worldY, right: worldX + widthPx, bottom: worldY + heightPx })) continue;
      const pos = camera.worldToScreen(worldX, worldY);
      commands.push({ kind: 'sprite', id: String(sprite.id ?? ''), z: Number(sprite.z ?? 1000 + worldY), screenX: pos.x, screenY: pos.y, frame: sprite.frame ?? 0 });
    }

    for (const overlay of overlays) {
      if (!overlay || overlay.visible === false) continue;
      commands.push({ kind: 'overlay', id: String(overlay.id ?? ''), z: Number(overlay.z ?? 100000), ...overlay });
    }

    commands.sort((a, b) => (a.z - b.z) || kindOrder(a.kind) - kindOrder(b.kind) || stableKey(a).localeCompare(stableKey(b)));
    return { bounds, commands };
  }
}

function normalizeLayers(layers) {
  if (!Array.isArray(layers)) return [];
  return layers.map(layer => Array.isArray(layer) ? { data: layer } : (layer || { data: [] }));
}

function tileAt(layer, x, y, mapWidth) {
  const data = layer?.data;
  if (Array.isArray(data?.[0])) return data[y]?.[x] ?? 0;
  if (Array.isArray(data)) return data[y * mapWidth + x] ?? 0;
  return 0;
}

function rectIntersects(a, b) {
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
}

function stableKey(command) {
  return `${command.kind}:${command.layer ?? ''}:${command.y ?? ''}:${command.x ?? ''}:${command.id ?? ''}`;
}

function kindOrder(kind) {
  if (kind === 'tile') return 0;
  if (kind === 'sprite') return 1;
  return 2;
}

function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
