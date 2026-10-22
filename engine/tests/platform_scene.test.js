import test from 'node:test';
import assert from 'node:assert/strict';
import { AndroidLifecycle } from '../src/platform/AndroidLifecycle.js';
import { SceneFlow } from '../src/scenes/SceneFlow.js';

test('Android lifecycle autosaves and suspends safely on pause/stop', async () => {
  const calls = [];
  const saves = { autosave: async (...x) => calls.push(['autosave', ...x]) };
  const audio = { suspend: () => calls.push(['suspend']), resume: () => calls.push(['resume']), stopAll: () => calls.push(['stopAll']) };
  const input = { clearAll: () => calls.push(['clearAll']) };
  const lifecycle = new AndroidLifecycle({ saves, audio, input, clock: () => 1234 });
  const state = { id: 'game-state' };
  await lifecycle.onPause(state);
  assert.equal(lifecycle.state, 'paused');
  assert.equal(lifecycle.lastBackgroundAt, 1234);
  assert.deepEqual(calls[0], ['clearAll']);
  assert.deepEqual(calls[1], ['suspend']);
  assert.equal(calls[2][0], 'autosave');
  assert.equal(calls[2][1].reason, 'android-pause');
  lifecycle.onResume();
  assert.equal(lifecycle.state, 'active');
  await lifecycle.onStop(state);
  assert.equal(lifecycle.state, 'stopped');
  assert.equal(calls.at(-1)[1].reason, 'android-stop');
  lifecycle.onDestroy();
  assert.equal(lifecycle.state, 'destroyed');
  assert.deepEqual(calls.at(-1), ['stopAll']);
});

test('SceneFlow delegates menu, battle and transfer transitions cleanly', async () => {
  const calls = [];
  const kernel = {
    replaceScene: async (...x) => calls.push(['replace', ...x]),
    pushScene: async (...x) => calls.push(['push', ...x]),
    popScene: async () => calls.push(['pop'])
  };
  const flow = new SceneFlow(kernel);
  const title = { name: 'title' };
  const menu = { name: 'menu' };
  const battle = { name: 'battle' };
  const map = { name: 'map' };
  await flow.title(title, { cold: true });
  await flow.openMenu(menu);
  await flow.closeMenu();
  await flow.enterBattle(battle, { troopId: 3 });
  await flow.leaveBattle();
  await flow.transfer(map, { mapId: 9 });
  assert.deepEqual(calls.map(x => x[0]), ['replace','push','pop','push','pop','replace']);
});
