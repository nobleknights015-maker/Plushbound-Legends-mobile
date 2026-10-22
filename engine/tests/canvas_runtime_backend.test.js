import test from 'node:test';
import assert from 'node:assert/strict';

import { LogicalViewport, Canvas2DRenderBackend } from '../src/render/Canvas2DRenderBackend.js';
import { bootPlushboundEngineV1 } from '../src/runtime/BrowserRuntimeEntry.js';

test('logical viewport letterboxes 1604x720 and round-trips touch coordinates', () => {
  const viewport = new LogicalViewport();
  const fit = viewport.fit(1604, 900);
  assert.equal(fit.scale, 1);
  assert.equal(fit.offsetX, 0);
  assert.equal(fit.offsetY, 90);
  assert.deepEqual(viewport.screenToLogical(802, 450), { x: 802, y: 360 });
  assert.deepEqual(viewport.logicalToScreen(802, 360), { x: 802, y: 450 });
});

test('canvas backend preserves pixel-art rendering and maps client touch to game coordinates', () => {
  const calls = [];
  const ctx = {
    globalAlpha: 1,
    imageSmoothingEnabled: true,
    save(){ calls.push(['save']); },
    restore(){ calls.push(['restore']); },
    setTransform(...args){ calls.push(['setTransform', ...args]); },
    fillRect(...args){ calls.push(['fillRect', ...args]); },
    drawImage(...args){ calls.push(['drawImage', ...args]); },
    fillStyle: '#000'
  };
  const canvas = {
    width: 0, height: 0, clientWidth: 802, clientHeight: 360, style: {},
    getContext: () => ctx,
    getBoundingClientRect: () => ({ left: 10, top: 20 })
  };
  const image = { width: 32, height: 32 };
  const assetManager = {
    cache: new Map([['icon/test', image]]),
    has: id => id === 'icon/test',
    load: async () => image
  };
  const backend = new Canvas2DRenderBackend({ canvas, assetManager, scope: { devicePixelRatio: 2, innerWidth: 802, innerHeight: 360 } });
  assert.equal(ctx.imageSmoothingEnabled, false);
  assert.deepEqual(backend.pointFromClient(411, 200), { x: 802, y: 360 });
  backend.beginFrame();
  backend.draw({ kind: 'ui-image', assetId: 'icon/test', destination: { x: 10, y: 12, width: 32, height: 32 }, opacity: 1 });
  backend.endFrame();
  assert.ok(calls.some(call => call[0] === 'drawImage'));
});

test('browser runtime creates a live canvas backend and exposes logical touch mapping', async () => {
  const ctx = {
    globalAlpha: 1,
    imageSmoothingEnabled: true,
    save(){}, restore(){}, setTransform(){}, fillRect(){}, drawImage(){}, fillStyle: '#000'
  };
  const created = [];
  const canvas = {
    width: 0, height: 0, clientWidth: 1604, clientHeight: 720, style: {}, dataset: {},
    getContext: () => ctx,
    getBoundingClientRect: () => ({ left: 0, top: 0 }),
    setAttribute(){}
  };
  const listeners = [];
  const scope = {
    innerWidth: 1604, innerHeight: 720, devicePixelRatio: 1,
    document: {
      querySelector: () => null,
      createElement: tag => { assert.equal(tag, 'canvas'); created.push(canvas); return canvas; },
      body: { appendChild(node){ assert.equal(node, canvas); } }
    },
    addEventListener(type){ listeners.push(type); },
    dispatchEvent(){},
    CustomEvent: class { constructor(type, init){ this.type = type; this.detail = init?.detail; } }
  };
  const runtime = await bootPlushboundEngineV1({ scope });
  assert.equal(runtime.booted, true);
  assert.equal(runtime.canvas, canvas);
  assert.ok(runtime.backend instanceof Canvas2DRenderBackend);
  assert.deepEqual(runtime.mapClientPoint(802, 360), { x: 802, y: 360 });
  assert.ok(listeners.includes('resize'));
  assert.ok(listeners.includes('orientationchange'));
  assert.equal(created.length, 1);
});
