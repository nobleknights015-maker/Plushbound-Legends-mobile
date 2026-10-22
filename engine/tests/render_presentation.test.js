import test from 'node:test';
import assert from 'node:assert/strict';
import { Camera2D, TilemapRenderer, TilesetAtlas, autotileVariant } from '../src/render/TilemapRenderer.js';
import { ScreenEffects } from '../src/render/ScreenEffects.js';

test('tileset atlas resolves tiles and animation frames deterministically', () => {
  const atlas = new TilesetAtlas({
    sheets: { ground: { firstId: 1, columns: 4, rows: 2, image: 'elyndor-ground.png' } },
    animated: { 2: { frames: [2, 3, 4], frameMs: 100 } }
  });
  assert.deepEqual(atlas.resolve(1), {
    sheetId: 'ground', image: 'elyndor-ground.png', sx: 0, sy: 0, sw: 48, sh: 48, variant: 0, animated: false
  });
  assert.equal(atlas.resolve(2, { clockMs: 0 }).sx, 48);
  assert.equal(atlas.resolve(2, { clockMs: 100 }).sx, 96);
  assert.equal(atlas.resolve(2, { clockMs: 200 }).sx, 144);
  assert.equal(atlas.resolve(2, { clockMs: 300 }).sx, 48);
});

test('autotile connectivity encodes cardinal neighbors into stable variants', () => {
  assert.equal(autotileVariant({}), 0);
  assert.equal(autotileVariant({ north: true, south: true }), 5);
  assert.equal(autotileVariant({ north: true, east: true, south: true, west: true }), 15);
});

test('tilemap renderer emits parallax then mapped tile sources', () => {
  const camera = new Camera2D({ viewportWidth: 96, viewportHeight: 96, worldWidth: 192, worldHeight: 192 });
  camera.setPosition(48, 48);
  const atlas = new TilesetAtlas({ sheets: { field: { firstId: 1, columns: 2, rows: 2, image: 'field.png' } } });
  const renderer = new TilemapRenderer({ overscanTiles: 0 });
  const result = renderer.buildDrawList({
    camera,
    tileset: atlas,
    map: {
      width: 4,
      height: 4,
      parallax: { id: 'clouds', image: 'clouds.png', factor: 0.5 },
      layers: [{ data: Array(16).fill(1) }]
    }
  });
  assert.equal(result.commands[0].kind, 'parallax');
  assert.equal(result.commands[0].offsetX, 24);
  const tile = result.commands.find(command => command.kind === 'tile');
  assert.equal(tile.source.image, 'field.png');
  assert.equal(tile.source.sw, 48);
});

test('screen effects tween tone and fade and settle cleanly', () => {
  const effects = new ScreenEffects();
  effects.setTone({ r: -40, g: -20, b: 10, gray: 80 }, 1000);
  effects.fadeTo(1, 1000);
  effects.update(500);
  assert.equal(effects.snapshot().fade, 0.5);
  assert.equal(effects.snapshot().tone.r, -20);
  effects.update(500);
  assert.equal(effects.snapshot().fade, 1);
  assert.deepEqual(effects.snapshot().tone, { r: -40, g: -20, b: 10, gray: 80 });
});

test('weather and flash compose into deterministic visual commands', () => {
  const effects = new ScreenEffects();
  effects.setWeather('rain', 2, 7);
  effects.flashColor({ r: 255, g: 200, b: 150 }, 0.8, 200);
  const commands = effects.compose({ viewportWidth: 320, viewportHeight: 180, clockMs: 1000 });
  const weather = commands.find(command => command.kind === 'weather');
  const flash = commands.find(command => command.kind === 'flash');
  assert.equal(weather.type, 'rain');
  assert.equal(weather.particles.length, 24);
  assert.equal(flash.opacity, 0.8);
  effects.update(200);
  assert.equal(effects.snapshot().flashing, false);
});

test('screen shake decays and releases automatically', () => {
  const effects = new ScreenEffects();
  effects.startShake({ power: 10, speed: 5, durationMs: 100 });
  assert.equal(effects.snapshot().shaking, true);
  effects.update(100);
  assert.equal(effects.snapshot().shaking, false);
  assert.deepEqual(effects.compose(), []);
});
