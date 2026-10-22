import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { GameState } from '../../engine/src/core/GameState.js';
import { PlushboundGameSession } from '../runtime/PlushboundGameSession.js';
import { GameShellBridge } from '../runtime/GameShellBridge.js';

const read = path => JSON.parse(readFileSync(new URL(`../${path}`, import.meta.url), 'utf8'));
const opening = read('content/opening-elyndor.json');
const route = read('content/elyndor-route-one.json');
const mapPackage = read('runtime/elyndor-route-one.maps.json');

function makeScope() {
  const listeners = new Map();
  const events = [];
  return {
    events,
    listeners,
    addEventListener(type, fn) { if (!listeners.has(type)) listeners.set(type, new Set()); listeners.get(type).add(fn); },
    removeEventListener(type, fn) { listeners.get(type)?.delete(fn); },
    dispatchEvent(event) { events.push(event); for (const fn of listeners.get(event.type) || []) fn(event); }
  };
}

function makeGame() {
  const state = new GameState();
  const session = new PlushboundGameSession({ state, mapPackage, contentPackages: [opening, route] });
  session.enter('elyndor-sunny-plains');
  return { state, session, engineBaseline: '160d9fd95bc0d3db39224f8bb4c5e1e3a1f54425' };
}

function withCustomEvent(run) {
  const original = globalThis.CustomEvent;
  globalThis.CustomEvent = globalThis.CustomEvent || class CustomEvent { constructor(type, init = {}) { this.type = type; this.detail = init.detail; } };
  try { return run(); } finally { globalThis.CustomEvent = original; }
}

test('shell bridge binds to live PlushboundGame and publishes snapshot updates', () => withCustomEvent(() => {
  const scope = makeScope();
  scope.PlushboundGame = makeGame();
  const bridge = new GameShellBridge({ scope }).attach();
  assert.equal(bridge.snapshot().currentMap, 'elyndor-sunny-plains');
  assert.equal(scope.events.at(-1).type, 'plushbound-shell-update');
  assert.equal(scope.events.at(-1).detail.reason, 'ready');
  assert.doesNotThrow(() => JSON.stringify(scope.events.at(-1).detail.snapshot));
}));

test('shell bridge exposes map, interaction, shop and quest-facing actions', () => withCustomEvent(() => {
  const scope = makeScope();
  scope.PlushboundGame = makeGame();
  const bridge = new GameShellBridge({ scope }).attach();
  bridge.interact('lio');
  assert.equal(bridge.quest('a-thread-begins')?.status, 'active');
  bridge.recordBattle(['frayling', 'elyndor']);
  bridge.interact('lio');
  bridge.triggerAt(31, 10, 'touch');
  assert.equal(bridge.snapshot().currentMap, 'elyndor-sunthread-crossing');
  bridge.enterMap('elyndor-menders-rest', 3, 10, 6);
  assert.equal(bridge.openShop('menders-rest-provisions').id, 'menders-rest-provisions');
  assert.equal(scope.events.some(event => event.detail?.reason === 'map'), true);
  assert.equal(scope.events.some(event => event.detail?.reason === 'shop'), true);
}));

test('shell bridge attach is idempotent and detach removes runtime listeners', () => withCustomEvent(() => {
  const scope = makeScope();
  const bridge = new GameShellBridge({ scope });
  bridge.attach();
  bridge.attach();
  assert.equal(scope.listeners.get('plushbound-game-ready')?.size, 1);

  scope.PlushboundGame = makeGame();
  scope.dispatchEvent(new CustomEvent('plushbound-game-ready'));
  const readyUpdates = scope.events.filter(event => event.type === 'plushbound-shell-update' && event.detail?.reason === 'ready');
  assert.equal(readyUpdates.length, 1);

  bridge.detach();
  assert.equal(scope.listeners.get('plushbound-game-ready')?.size, 0);
  scope.dispatchEvent(new CustomEvent('plushbound-game-ready'));
  const afterDetach = scope.events.filter(event => event.type === 'plushbound-shell-update' && event.detail?.reason === 'ready');
  assert.equal(afterDetach.length, 1);
}));
