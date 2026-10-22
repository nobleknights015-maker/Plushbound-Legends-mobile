import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { GameState } from '../../engine/src/core/GameState.js';
import { MapRuntime } from '../../engine/src/maps/MapRuntime.js';
import { EventInterpreter, EventCommandRegistry, registerCoreEventCommands } from '../../engine/src/events/EventInterpreter.js';
import { GameContentRuntime } from '../runtime/GameContentRuntime.js';

const json = url => JSON.parse(readFileSync(url, 'utf8'));
const opening = json(new URL('../content/opening-elyndor.json', import.meta.url));
const route = json(new URL('../content/elyndor-route-one.json', import.meta.url));
const runtimeMaps = json(new URL('../runtime/elyndor-route-one.maps.json', import.meta.url));

function harness() {
  const state = new GameState();
  const game = new GameContentRuntime({ state, contentPackages: [opening, route] });
  const maps = new MapRuntime({ state });
  for (const map of runtimeMaps.maps) maps.register(map);
  maps.load('elyndor-sunny-plains', 12, 10, 2);
  const shops = [];
  const registry = registerCoreEventCommands(new EventCommandRegistry(), {
    ui: { message() {}, shop: id => { shops.push(id); return { id }; } },
    map: { transfer: (...args) => maps.transfer(...args) }
  });
  const interpreter = new EventInterpreter({ commands: registry, state, logger: { error() {} } });

  function run(event) {
    interpreter.start(event.commands || [], { mapId: maps.current.id, eventId: event.id, hooks: game.hooks });
    let safety = 40;
    while (interpreter.running && safety-- > 0) interpreter.update(0);
    assert.ok(safety > 0, `Event ${event.id} should settle`);
  }

  function eventAt(x, y) {
    const event = maps.eventsAt(x, y)[0];
    assert.ok(event, `Expected event at ${maps.current.id} ${x},${y}`);
    return event;
  }

  return { state, game, maps, shops, run, eventAt };
}

test('early Elyndor route is executable from Lio through the Menders Rest Waystitch', () => {
  const { state, game, maps, run, eventAt } = harness();

  // First meeting starts A Thread Begins and counts the giver conversation.
  run(eventAt(18, 9));
  assert.equal(game.questState('a-thread-begins').status, 'active');
  assert.equal(game.questState('a-thread-begins').objectives['speak-to-lio'], 1);

  // First Frayling victory makes the quest ready for Lio.
  game.recordBattle(['frayling', 'elyndor']);
  assert.equal(state.sw('quest:a-thread-begins:ready'), true);
  run(eventAt(18, 9));
  assert.equal(game.questState('a-thread-begins').status, 'complete');
  assert.equal(state.variable('gold'), 100);

  // Eastern exit now resolves its transfer page and reaches Sunthread Crossing.
  run(eventAt(31, 10));
  assert.equal(maps.current.id, 'elyndor-sunthread-crossing');

  // Travel through Crossing to Mender's Rest and accept Bram's problem.
  run(eventAt(35, 8));
  assert.equal(maps.current.id, 'elyndor-menders-rest');
  run(eventAt(18, 11));
  assert.equal(game.questState('threads-out-of-tune').status, 'active');

  // Return to the Crossing, repair both anchors, and defeat three crossing Fraylings.
  run(eventAt(0, 10));
  assert.equal(maps.current.id, 'elyndor-sunthread-crossing');
  run(eventAt(13, 14));
  run(eventAt(26, 6));
  game.recordBattle(['frayling', 'crossing-frayling']);
  game.recordBattle(['frayling', 'crossing-frayling']);
  game.recordBattle(['frayling', 'crossing-frayling']);
  assert.equal(game.questState('threads-out-of-tune').status, 'ready');

  // Return to Bram for rewards and unlock the settlement Waystitch.
  run(eventAt(35, 8));
  run(eventAt(18, 11));
  assert.equal(game.questState('threads-out-of-tune').status, 'complete');
  assert.equal(state.variable('gold'), 280);
  assert.equal(state.count('items', 'threadmend-tonic'), 3);
  assert.equal(state.count('items', 'woven-charm'), 1);
  assert.equal(state.sw('waystitch:menders-rest:unlocked'), true);

  run(eventAt(22, 5));
  assert.equal(state.sw('waystitch:menders-rest:active'), true);
});
