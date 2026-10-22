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

  buildDrawList({ camera, map, sprites = [], overlays = [], tileset = null, clockMs = 0 } = {}) {
    if (!camera) throw new Error('camera is required');
    if (!map) throw new Error('map is required');
    const width = Math.max(0, Number(map.width) || 0);
    const height = Math.max(0, Number(map.height) || 0);
    const bounds = this.visibleTileBounds(camera, width, height);
    const commands = [];

    if (map.parallax) commands.push(buildParallaxCommand(map.parallax, camera));

    const layers = normalizeLayers(map.layers);
    for (let layerIndex = 0; layerIndex < layers.length; layerIndex++) {
      const layer = layers[layerIndex];
      if (layer.visible === false) continue;
      for (let y = bounds.minY; y <= bounds.maxY; y++) {
        for (let x = bounds.minX; x <= bounds.maxX; x++) {
          const tileId = tileAt(layer, x, y, width);
          if (tileId == null || tileId === 0) continue;
          const pos = camera.worldToScreen(x * this.tileWidth, y * this.tileHeight);
          const source = tileset?.resolve?.(tileId, { x, y, layer: layerIndex, clockMs }) ?? null;
          commands.push({ kind: 'tile', layer: layerIndex, z: layer.z ?? layerIndex, tileId, x, y, screenX: pos.x, screenY: pos.y, source });
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
      commands.push({ kind: 'sprite', id: String(sprite.id ?? ''), z: Number(sprite.z ?? 1000 + worldY), screenX: pos.x, screenY: pos.y, frame: sprite.frame ?? 0, source: sprite.source ?? null });
    }

    for (const overlay of overlays) {
      if (!overlay || overlay.visible === false) continue;
      commands.push({ kind: 'overlay', id: String(overlay.id ?? ''), z: Number(overlay.z ?? 100000), ...overlay });
    }

    commands.sort((a, b) => (a.z - b.z) || kindOrder(a.kind) - kindOrder(b.kind) || stableKey(a).localeCompare(stableKey(b)));
    return { bounds, commands };
  }
}

export class TilesetAtlas {
  constructor({ tileWidth = 48, tileHeight = 48, sheets = {}, animated = {} } = {}) {
    this.tileWidth = Math.max(1, Number(tileWidth) || 48);
    this.tileHeight = Math.max(1, Number(tileHeight) || 48);
    this.sheets = new Map();
    this.animated = new Map();
    for (const [id, sheet] of Object.entries(sheets || {})) this.registerSheet(id, sheet);
    for (const [tileId, animation] of Object.entries(animated || {})) this.registerAnimation(tileId, animation);
  }

  registerSheet(id, { firstId = 1, columns = 8, rows = 1, image = null, autotile = false, variants = 1 } = {}) {
    const sheet = {
      id: String(id), firstId: Number(firstId), columns: Math.max(1, Number(columns) || 1), rows: Math.max(1, Number(rows) || 1),
      image, autotile: !!autotile, variants: Math.max(1, Number(variants) || 1)
    };
    sheet.lastId = sheet.firstId + sheet.columns * sheet.rows * sheet.variants - 1;
    this.sheets.set(sheet.id, sheet);
    return sheet;
  }

  registerAnimation(tileId, { frames = [], frameMs = 400 } = {}) {
    this.animated.set(Number(tileId), { frames: frames.map(Number), frameMs: Math.max(1, Number(frameMs) || 400) });
  }

  resolve(tileId, { clockMs = 0, variant = 0 } = {}) {
    let id = Number(tileId);
    const animation = this.animated.get(id);
    if (animation?.frames.length) {
      const index = Math.floor(Math.max(0, Number(clockMs) || 0) / animation.frameMs) % animation.frames.length;
      id = animation.frames[index];
    }
    const sheet = [...this.sheets.values()].find(candidate => id >= candidate.firstId && id <= candidate.lastId);
    if (!sheet) return null;
    const local = id - sheet.firstId;
    const tileCountPerVariant = sheet.columns * sheet.rows;
    const resolvedVariant = sheet.autotile ? clamp(Math.floor(Number(variant) || 0), 0, sheet.variants - 1) : Math.floor(local / tileCountPerVariant);
    const tileIndex = sheet.autotile ? local % tileCountPerVariant : local % tileCountPerVariant;
    return {
      sheetId: sheet.id,
      image: sheet.image,
      sx: (tileIndex % sheet.columns) * this.tileWidth,
      sy: Math.floor(tileIndex / sheet.columns) * this.tileHeight,
      sw: this.tileWidth,
      sh: this.tileHeight,
      variant: resolvedVariant,
      animated: !!animation
    };
  }
}

export function autotileVariant({ north = false, east = false, south = false, west = false } = {}) {
  return (north ? 1 : 0) | (east ? 2 : 0) | (south ? 4 : 0) | (west ? 8 : 0);
}

function buildParallaxCommand(parallax, camera) {
  const factorX = Number(parallax.factorX ?? parallax.factor ?? 0.5);
  const factorY = Number(parallax.factorY ?? parallax.factor ?? 0.5);
  const speedX = Number(parallax.speedX || 0);
  const speedY = Number(parallax.speedY || 0);
  const time = Math.max(0, Number(parallax.clockMs || 0)) / 1000;
  return {
    kind: 'parallax', id: String(parallax.id ?? 'parallax'), z: Number(parallax.z ?? -1000), image: parallax.image ?? null,
    offsetX: camera.x * factorX + speedX * time,
    offsetY: camera.y * factorY + speedY * time,
    loopX: parallax.loopX !== false, loopY: parallax.loopY !== false
  };
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
  if (kind === 'parallax') return -1;
  if (kind === 'tile') return 0;
  if (kind === 'sprite') return 1;
  return 2;
}

function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
