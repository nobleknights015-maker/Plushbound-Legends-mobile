import test from 'node:test';
import assert from 'node:assert/strict';
import { AndroidHostBridge } from '../src/platform/AndroidHostBridge.js';
import { PerformanceBudget } from '../src/platform/PerformanceBudget.js';
import { AssetManager } from '../src/assets/AssetManager.js';

test('Android host bridge forwards lifecycle and renderer surface changes through one boundary', async () => {
  const calls = [];
  const lifecycle = {
    state: 'active',
    async onPause(state){ this.state='paused'; calls.push(['pause', state]); },
    onResume(){ this.state='active'; calls.push(['resume']); },
    async onStop(state){ this.state='stopped'; calls.push(['stop', state]); },
    onDestroy(){ this.state='destroyed'; calls.push(['destroy']); }
  };
  const renderer = { resize: (...args) => calls.push(['resize', ...args]) };
  const input = { clearAll: () => calls.push(['clearAll']) };
  const bridge = new AndroidHostBridge({
    lifecycle,
    performance: new PerformanceBudget(),
    renderer,
    input,
    stateProvider: () => ({ id: 'state' })
  });

  assert.deepEqual(bridge.onSurfaceChanged({ width: 1604, height: 720, density: 2 }), { width:1604, height:720, density:2 });
  await bridge.onPause();
  bridge.onResume();
  await bridge.onStop();
  bridge.onDestroy();

  assert.ok(calls.some(x => x[0] === 'resize' && x[1] === 1604 && x[2] === 720));
  assert.deepEqual(calls.find(x => x[0] === 'pause')[1], { id: 'state' });
  assert.equal(lifecycle.state, 'destroyed');
});

test('Android host bridge reports frame health and render pressure', () => {
  const assets = new AssetManager({ loader: async d => d.path, maxEntries: 200 });
  const lifecycle = { state:'active', onPause:async()=>{}, onResume(){}, onStop:async()=>{}, onDestroy(){} };
  const performance = new PerformanceBudget({ profile:'balanced', windowSize:10 });
  const bridge = new AndroidHostBridge({ lifecycle, performance, assets });
  const result = bridge.onFrame({ frameMs: 40, visibleSprites: 200, visibleTiles: 2000 });
  assert.equal(result.pressure.level, 'high');
  assert.deepEqual(result.pressure.reasons, ['sprite-count','tile-count']);
  assert.equal(result.health.sampleCount, 1);
});

test('Android host bridge trims oldest loaded assets under memory pressure', async () => {
  const assets = new AssetManager({ loader: async d => d.path, maxEntries: 200 });
  for (let i = 0; i < 80; i++) assets.register(`a${i}`, { path:`/a/${i}.png` });
  await assets.preload([...Array(80)].map((_,i)=>`a${i}`));
  const lifecycle = { state:'active', onPause:async()=>{}, onResume(){}, onStop:async()=>{}, onDestroy(){} };
  const bridge = new AndroidHostBridge({ lifecycle, performance:new PerformanceBudget(), assets, logger:{ info(){} } });
  const result = bridge.onTrimMemory('moderate');
  assert.equal(result.targetEntries, 64);
  assert.equal(result.remaining, 64);
  assert.equal(result.removed, 16);
});

test('critical memory pressure trims more aggressively and destroy clears cache', async () => {
  const assets = new AssetManager({ loader: async d => d.path, maxEntries: 200 });
  for (let i = 0; i < 80; i++) assets.register(`b${i}`, { path:`/b/${i}.png` });
  await assets.preload([...Array(80)].map((_,i)=>`b${i}`));
  const lifecycle = { state:'active', onPause:async()=>{}, onResume(){}, onStop:async()=>{}, onDestroy(){ this.state='destroyed'; } };
  const bridge = new AndroidHostBridge({ lifecycle, performance:new PerformanceBudget(), assets, logger:{ info(){} } });
  const result = bridge.onTrimMemory('critical');
  assert.equal(result.targetEntries, 32);
  assert.equal(result.remaining, 32);
  bridge.onDestroy();
  assert.equal(assets.snapshot().loaded.length, 0);
});
