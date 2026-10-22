import test from 'node:test';
import assert from 'node:assert/strict';
import { AssetManager, SpriteAnimation, DirectionalSprite } from '../src/assets/AssetManager.js';

test('AssetManager loads registered assets once and reuses in-flight requests', async () => {
  let calls = 0;
  const manager = new AssetManager({ loader: async descriptor => { calls += 1; return { path: descriptor.path, token: calls }; } });
  manager.register('hero', { path: 'characters/hero.png', type: 'image' });
  const [a, b] = await Promise.all([manager.load('hero'), manager.load('hero')]);
  assert.equal(calls, 1);
  assert.equal(a, b);
  assert.equal(manager.isLoaded('hero'), true);
});

test('AssetManager enforces LRU-style cache limit while keeping manifest stable', async () => {
  const manager = new AssetManager({ loader: async d => d.path, maxEntries: 2 });
  manager.registerMany([
    { id: 'a', path: 'a.png' },
    { id: 'b', path: 'b.png' },
    { id: 'c', path: 'c.png' }
  ]);
  await manager.load('a');
  await manager.load('b');
  await manager.load('a');
  await manager.load('c');
  assert.equal(manager.isLoaded('a'), true);
  assert.equal(manager.isLoaded('b'), false);
  assert.equal(manager.isLoaded('c'), true);
  assert.equal(manager.has('b'), true);
});

test('AssetManager fails cleanly on unknown or invalid assets', async () => {
  const manager = new AssetManager({ loader: async d => d.path });
  assert.throws(() => manager.register('bad', {}), /requires a path/);
  await assert.rejects(() => manager.load('missing'), /Unknown asset/);
});

test('SpriteAnimation advances deterministically and non-looping clips finish', () => {
  const anim = new SpriteAnimation({ frames: [0, 1, 2], frameMs: 100, loop: false });
  assert.equal(anim.current(), 0);
  assert.equal(anim.update(99), 0);
  assert.equal(anim.update(1), 1);
  assert.equal(anim.update(200), 2);
  assert.equal(anim.finished, true);
  assert.equal(anim.playing, false);
});

test('SpriteAnimation looping and restore preserve exact frame timing state', () => {
  const anim = new SpriteAnimation({ frames: ['a', 'b', 'c'], frameMs: 50, loop: true });
  anim.update(125);
  const snapshot = anim.snapshot();
  const restored = new SpriteAnimation({ frames: ['a', 'b', 'c'], frameMs: 50, loop: true });
  restored.restore(snapshot);
  assert.equal(restored.current(), anim.current());
  assert.deepEqual(restored.snapshot(), snapshot);
  assert.equal(restored.update(25), 'a');
});

test('DirectionalSprite switches direction without corrupting independent animation tracks', () => {
  const sprite = new DirectionalSprite({
    direction: 2,
    animations: {
      2: { frames: ['d0', 'd1', 'd2'], frameMs: 100 },
      4: { frames: ['l0', 'l1', 'l2'], frameMs: 100 }
    }
  });
  sprite.update(100);
  assert.equal(sprite.currentFrame(), 'd1');
  sprite.face(4);
  assert.equal(sprite.currentFrame(), 'l0');
  sprite.update(200);
  assert.equal(sprite.currentFrame(), 'l2');
  sprite.face(2);
  assert.equal(sprite.currentFrame(), 'd1');
});
