import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { GameState } from '../../engine/src/core/GameState.js';
import { GameContentRuntime } from '../runtime/GameContentRuntime.js';
import { PlushboundGameSession } from '../runtime/PlushboundGameSession.js';
import { GameShellBridge } from '../runtime/GameShellBridge.js';

const json = path => JSON.parse(readFileSync(new URL(`../${path}`, import.meta.url), 'utf8'));
const opening = json('content/opening-elyndor.json');
const route = json('content/elyndor-route-one.json');
const maps = json('runtime/elyndor-route-one.maps.json');

test('game runtime and shell bridge work when structuredClone is unavailable', () => {
  const originalClone = globalThis.structuredClone;
  const originalCustomEvent = globalThis.CustomEvent;
  globalThis.structuredClone = undefined;
  globalThis.CustomEvent = globalThis.CustomEvent || class CustomEvent {
    constructor(type, init = {}) { this.type = type; this.detail = init.detail; }
  };

  try {
    const state = new GameState();
    const game = new GameContentRuntime({ state, contentPackages: [opening, route] });
    assert.equal(game.questDefinition('a-thread-begins').name, 'A Thread Begins');

    const session = new PlushboundGameSession({ state, mapPackage: maps, contentPackages: [opening, route] });
    session.enter('elyndor-sunny-plains');
    session.interact('lio');
    assert.equal(session.snapshot().quests['a-thread-begins'].status, 'active');

    const events = [];
    const scope = {
      PlushboundGame: { session },
      addEventListener() {}, removeEventListener() {},
      dispatchEvent(event) { events.push(event); }
    };
    const bridge = new GameShellBridge({ scope }).attach();
    bridge.publish('compat-check');
    assert.ok(events.some(event => event.type === 'plushbound-shell-update'));
    assert.doesNotThrow(() => JSON.stringify(events.at(-1).detail.snapshot));
  } finally {
    globalThis.structuredClone = originalClone;
    globalThis.CustomEvent = originalCustomEvent;
  }
});
