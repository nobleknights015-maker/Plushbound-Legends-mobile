import test from 'node:test';
import assert from 'node:assert/strict';

import { installNativeRuntimeHardening } from '../src/runtime/NativeRuntimeHardening.js';

function eventTarget() {
  const listeners = new Map();
  return {
    addEventListener(type, fn) { if (!listeners.has(type)) listeners.set(type, new Set()); listeners.get(type).add(fn); },
    removeEventListener(type, fn) { listeners.get(type)?.delete(fn); },
    dispatch(type, event = {}) { for (const fn of listeners.get(type) || []) fn(event); },
    count(type) { return listeners.get(type)?.size || 0; }
  };
}

test('native hardening tracks visual viewport changes and refreshes safe geometry', async () => {
  const viewport = eventTarget();
  const scopeEvents = eventTarget();
  let resized = 0;
  let safeRefresh = 0;
  const scope = {
    visualViewport: viewport,
    __PLUSHBOUND_ENGINE_V1__: {
      booted: true,
      resize: () => { resized += 1; },
      refreshSafeAreaInsets: () => { safeRefresh += 1; },
      handleAction: async () => true
    },
    addEventListener: scopeEvents.addEventListener,
    removeEventListener: scopeEvents.removeEventListener
  };

  const controller = await installNativeRuntimeHardening(scope);
  assert.equal(resized, 1);
  assert.equal(safeRefresh, 1);
  viewport.dispatch('resize');
  viewport.dispatch('scroll');
  assert.equal(resized, 3);
  assert.equal(safeRefresh, 3);
  controller.destroy();
  assert.equal(viewport.count('resize'), 0);
  assert.equal(viewport.count('scroll'), 0);
});

test('native hardening exposes one Android back boundary into runtime interactions', async () => {
  const viewport = eventTarget();
  const scopeEvents = eventTarget();
  const actions = [];
  const scope = {
    visualViewport: viewport,
    __PLUSHBOUND_ENGINE_V1__: {
      booted: true,
      resize() {}, refreshSafeAreaInsets() {},
      handleAction: async action => { actions.push(action); return true; }
    },
    addEventListener: scopeEvents.addEventListener,
    removeEventListener: scopeEvents.removeEventListener
  };

  const controller = await installNativeRuntimeHardening(scope);
  assert.equal(await scope.plushboundEngineV1Back(), true);
  scopeEvents.dispatch('plushbound-android-back');
  await Promise.resolve();
  assert.equal(actions.length, 2);
  assert.deepEqual(actions[0], { type: 'back', source: 'android-host' });
  controller.destroy();
  assert.equal(scope.plushboundEngineV1Back, undefined);
});

test('Android back is consumed only when the game handles it and falls through at root', async () => {
  const viewport = eventTarget();
  const scopeEvents = eventTarget();
  let handled = true;
  const scope = {
    visualViewport: viewport,
    __PLUSHBOUND_ENGINE_V1__: {
      booted: true,
      resize() {}, refreshSafeAreaInsets() {},
      handleAction: async () => handled ? { handled: true } : { type: 'back', unhandled: true }
    },
    addEventListener: scopeEvents.addEventListener,
    removeEventListener: scopeEvents.removeEventListener
  };

  const controller = await installNativeRuntimeHardening(scope);
  let prevented = 0;
  assert.equal(await controller.back({ preventDefault: () => { prevented += 1; } }), true);
  assert.equal(prevented, 1);

  handled = false;
  assert.equal(await controller.back({ preventDefault: () => { prevented += 1; } }), false);
  assert.equal(prevented, 1);
  controller.destroy();
});
