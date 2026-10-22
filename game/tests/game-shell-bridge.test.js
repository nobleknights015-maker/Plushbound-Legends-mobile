import test from 'node:test';
import assert from 'node:assert/strict';

import { GameState } from '../../engine/src/core/GameState.js';
import { GameContentRuntime } from '../runtime/GameContentRuntime.js';
import { PlushboundGameSession } from '../runtime/PlushboundGameSession.js';
import { GameShellBridge } from '../runtime/GameShellBridge.js';
import { readFileSync } from 'node:fs';

const read = path => JSON.parse(readFileSync(new URL(`../${path}`, import.meta.url), 'utf8'));
const opening = read('content/opening-elyndor.json');
const route = read('content/elyndor-route-one.json');
const mapPackage = read('runtime/elyndor-route-one.maps.json');

function makeScope() {
  const listeners = new Map();
  const events = [];
  return {
    events,
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

test('shell bridge binds to live PlushboundGame and publishes snapshot updates', () => {
  const original = globalThis.CustomEvent;
  globalThis.CustomEvent = globalThis.CustomEvent || class CustomEvent { constructor(type, init = {}) { this.type = type; this.detail = init.detail; } };
  try {
    const scope = makeScope();
    scope.PlushboundGame = makeGame();
    const bridge = new GameShellBridge({ scope }).attach();
    assert.equal(bridge.snapshot().currentMap, 'elyndor-sunny-plains');
    assert.equal(scope.events.at(-1).type, 'plushbound-shell-update');
    assert.equal(scope.events.at(-1).detail.reason, 'ready');
  } finally {
    globalThis.CustomEvent = original;
  }
});

test('shell bridge exposes map, interaction, shop and quest-facing actions', () => {
  const original = globalThis.CustomEvent;
  globalThis.CustomEvent = globalThis.CustomEvent || class CustomEvent { constructor(type, init = {}) { this.type = type; this.detail = init.detail; } };
  try {
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
  } finally {
    globalThis.CustomEvent = original;
  }
});
