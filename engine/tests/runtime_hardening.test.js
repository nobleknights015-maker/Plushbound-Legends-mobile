import test from 'node:test';
import assert from 'node:assert/strict';
import { EngineKernel } from '../src/core/EngineKernel.js';
import { AndroidLifecycle } from '../src/platform/AndroidLifecycle.js';
import { AndroidHostBridge } from '../src/platform/AndroidHostBridge.js';
import { PerformanceBudget } from '../src/platform/PerformanceBudget.js';

function kernelHarness() {
  const calls = [];
  const input = {
    context: 'default',
    setContext(value) { this.context = value; calls.push(['context', value]); },
    clearAll() { calls.push(['clearAll']); }
  };
  const kernel = new EngineKernel({ renderer: {}, input, data: {}, saves: {}, audio: {}, logger: { error() {} } });
  return { kernel, input, calls };
}

function scene(id, { handleBack = null } = {}) {
  return {
    id,
    inputContext: id,
    enter() {},
    exit() {},
    pause() {},
    resume() {},
    ...(handleBack ? { handleBack } : {})
  };
}

test('replaceRootScene clears nested scenes before installing the new root', async () => {
  const { kernel, input, calls } = kernelHarness();
  const exited = [];
  const field = { ...scene('field'), exit(){ exited.push('field'); } };
  const menu = { ...scene('menu'), exit(){ exited.push('menu'); } };
  const battle = { ...scene('battle'), exit(){ exited.push('battle'); } };
  const title = scene('title');

  await kernel.pushScene(field);
  await kernel.pushScene(menu);
  await kernel.pushScene(battle);
  await kernel.replaceRootScene(title);

  assert.deepEqual(exited, ['battle', 'menu', 'field']);
  assert.equal(kernel.sceneStack.length, 1);
  assert.equal(kernel.scene, title);
  assert.equal(input.context, 'title');
  assert.ok(calls.some(call => call[0] === 'clearAll'));
});

test('handleBack lets current scene consume back before popping overlays', async () => {
  const { kernel } = kernelHarness();
  let consumed = 0;
  await kernel.pushScene(scene('field'));
  await kernel.pushScene(scene('menu', { handleBack: () => { consumed += 1; return true; } }));

  assert.equal(await kernel.handleBack(), true);
  assert.equal(consumed, 1);
  assert.equal(kernel.scene.id, 'menu');

  kernel.scene.handleBack = () => false;
  assert.equal(await kernel.handleBack(), true);
  assert.equal(kernel.scene.id, 'field');
  assert.equal(await kernel.handleBack(), false);
});

test('Android lifecycle clears real input API and preserves autosave reason metadata', async () => {
  const events = [];
  const lifecycle = new AndroidLifecycle({
    saves: { autosave: async meta => events.push(['autosave', meta]) },
    audio: { suspend: () => events.push(['suspend']), resume: () => events.push(['resume']), stopAll: () => events.push(['stopAll']) },
    input: { clearAll: () => events.push(['clearAll']) },
    clock: () => 1234
  });

  await lifecycle.onPause({ any: 'state' });
  lifecycle.onResume();
  await lifecycle.onStop({ any: 'state' });
  lifecycle.onDestroy();

  assert.deepEqual(events.filter(event => event[0] === 'autosave'), [
    ['autosave', { reason: 'android-pause' }],
    ['autosave', { reason: 'android-stop' }]
  ]);
  assert.equal(events.filter(event => event[0] === 'clearAll').length, 4);
  assert.equal(lifecycle.state, 'destroyed');
  assert.equal(lifecycle.lastBackgroundAt, 1234);
});

test('Android host back clears stale input and delegates to engine navigation', async () => {
  const calls = [];
  const bridge = new AndroidHostBridge({
    lifecycle: { state: 'active', onPause: async()=>{}, onResume(){}, onStop:async()=>{}, onDestroy(){} },
    performance: new PerformanceBudget(),
    input: { clearAll: () => calls.push('clear') },
    backHandler: async () => { calls.push('back'); return true; }
  });

  assert.equal(await bridge.onBackPressed(), true);
  assert.deepEqual(calls, ['clear', 'back']);

  const noHandler = new AndroidHostBridge({
    lifecycle: { state: 'active', onPause: async()=>{}, onResume(){}, onStop:async()=>{}, onDestroy(){} },
    performance: new PerformanceBudget()
  });
  assert.equal(await noHandler.onBackPressed(), false);
});
