import test from 'node:test';
import assert from 'node:assert/strict';
import { Camera2D, TilemapRenderer } from '../src/render/TilemapRenderer.js';

test('camera clamps to world bounds and round-trips coordinates', () => {
  const camera = new Camera2D({ viewportWidth: 1604, viewportHeight: 720, worldWidth: 4000, worldHeight: 2200 });
  camera.centerOn(3900, 2100);
  assert.equal(camera.x, 2396);
  assert.equal(camera.y, 1480);
  const screen = camera.worldToScreen(2500, 1600);
  const world = camera.screenToWorld(screen.x, screen.y);
  assert.deepEqual(world, { x: 2500, y: 1600 });
});

test('tilemap renderer culls tiles outside the viewport', () => {
  const camera = new Camera2D({ viewportWidth: 96, viewportHeight: 96, worldWidth: 480, worldHeight: 480 });
  const renderer = new TilemapRenderer({ tileWidth: 48, tileHeight: 48, overscanTiles: 0 });
  const data = Array.from({ length: 100 }, (_, i) => i + 1);
  const result = renderer.buildDrawList({ camera, map: { width: 10, height: 10, layers: [{ data }] } });
  assert.equal(result.bounds.minX, 0);
  assert.equal(result.bounds.minY, 0);
  assert.ok(result.commands.length < 100);
  assert.ok(result.commands.every(c => c.kind === 'tile'));
});

test('sprite culling excludes distant sprites and preserves nearby frames', () => {
  const camera = new Camera2D({ viewportWidth: 160, viewportHeight: 120, worldWidth: 1000, worldHeight: 1000 });
  const renderer = new TilemapRenderer({ tileWidth: 40, tileHeight: 40 });
  const result = renderer.buildDrawList({
    camera,
    map: { width: 25, height: 25, layers: [] },
    sprites: [
      { id: 'near', x: 50, y: 50, width: 40, height: 40, frame: 2 },
      { id: 'far', x: 900, y: 900, width: 40, height: 40, frame: 1 }
    ]
  });
  const sprites = result.commands.filter(c => c.kind === 'sprite');
  assert.deepEqual(sprites.map(x => x.id), ['near']);
  assert.equal(sprites[0].frame, 2);
});

test('draw list ordering is deterministic across tiles, sprites and overlays', () => {
  const camera = new Camera2D({ viewportWidth: 96, viewportHeight: 96, worldWidth: 192, worldHeight: 192 });
  const renderer = new TilemapRenderer({ tileWidth: 48, tileHeight: 48, overscanTiles: 0 });
  const result = renderer.buildDrawList({
    camera,
    map: {
      width: 4,
      height: 4,
      layers: [
        { z: 0, data: [1,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0] },
        { z: 10, data: [2,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0] }
      ]
    },
    sprites: [{ id: 'hero', x: 0, y: 0, z: 5 }],
    overlays: [{ id: 'fade', z: 99999 }]
  });
  assert.deepEqual(result.commands.map(c => `${c.kind}:${c.z}`), ['tile:0', 'sprite:5', 'tile:10', 'overlay:99999']);
});

test('camera zoom changes visible world area without changing viewport pixels', () => {
  const camera = new Camera2D({ viewportWidth: 200, viewportHeight: 100, worldWidth: 1000, worldHeight: 1000, zoom: 2 });
  assert.equal(camera.visibleWidth(), 100);
  assert.equal(camera.visibleHeight(), 50);
  camera.centerOn(500, 500);
  assert.deepEqual(camera.worldToScreen(500, 500), { x: 100, y: 50 });
});
