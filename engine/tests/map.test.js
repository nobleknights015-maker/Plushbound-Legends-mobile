import test from 'node:test';
import assert from 'node:assert/strict';
import { GameState } from '../src/core/GameState.js';
import { MapRuntime } from '../src/maps/MapRuntime.js';

function makeMap() {
  return {
    id: 1,
    width: 4,
    height: 3,
    layers: { ground: [1,1,1,1, 1,2,2,1, 1,1,1,1] },
    regions: [0,0,0,0, 0,7,7,0, 0,0,0,0],
    blocked: ['2,0'],
    events: [
      {
        id: 3,
        x: 1,
        y: 1,
        pages: [
          { trigger: 'action', commands: [{ code: 'MESSAGE', parameters: ['closed'] }] },
          { conditions: { selfSwitch: 'A' }, trigger: 'action', through: true, commands: [{ code: 'MESSAGE', parameters: ['open'] }] }
        ]
      },
      {
        id: 4,
        x: 3,
        y: 2,
        pages: [
          { conditions: { switchId: 9 }, trigger: 'touch', commands: [{ code: 'TRANSFER', parameters: [2,0,0,2] }] }
        ]
      }
    ]
  };
}

test('map runtime loads map data, regions and tiles', () => {
  const state = new GameState();
  const maps = new Map([['1', makeMap()]]);
  const runtime = new MapRuntime({ state, maps });
  runtime.load(1, 0, 0, 2);
  assert.equal(state.map.id, 1);
  assert.equal(runtime.tileAt(1, 1), 2);
  assert.equal(runtime.regionAt(1, 1), 7);
  assert.equal(runtime.tileAt(99, 99), null);
});

test('movement obeys bounds, blocked tiles and solid events', () => {
  const state = new GameState();
  const runtime = new MapRuntime({ state, maps: new Map([['1', makeMap()]]) });
  runtime.load(1, 0, 0, 2);
  assert.equal(runtime.move(-1, 0), false);
  assert.equal(runtime.move(1, 0), true);
  assert.equal(state.system.steps, 1);
  assert.equal(runtime.move(1, 0), false);
  runtime.load(1, 1, 0, 2);
  assert.equal(runtime.move(0, 1), false);
});

test('event page priority follows switches and self switches', () => {
  const state = new GameState();
  const runtime = new MapRuntime({ state, maps: new Map([['1', makeMap()]]) });
  runtime.load(1, 0, 0, 2);
  let event = runtime.eventsAt(1, 1)[0];
  assert.equal(event.pageIndex, 0);
  assert.equal(event.commands[0].parameters[0], 'closed');
  state.setSelfSw(1, 3, 'A', true);
  event = runtime.eventsAt(1, 1)[0];
  assert.equal(event.pageIndex, 1);
  assert.equal(event.through, true);
  assert.equal(event.commands[0].parameters[0], 'open');
  assert.equal(runtime.move(1, 0), true);
  assert.equal(runtime.move(0, 1), true);
});

test('conditional touch events activate only when their page conditions match', () => {
  const state = new GameState();
  const runtime = new MapRuntime({ state, maps: new Map([['1', makeMap()]]) });
  runtime.load(1, 3, 2, 2);
  assert.equal(runtime.triggerEvents('touch').length, 0);
  state.setSw(9, true);
  const events = runtime.triggerEvents('touch');
  assert.equal(events.length, 1);
  assert.equal(events[0].id, 4);
});

test('transfer changes map and exact player position deterministically', () => {
  const state = new GameState();
  const second = { id: 2, width: 2, height: 2, layers: { ground: [1,1,1,1] }, events: [] };
  const runtime = new MapRuntime({ state, maps: new Map([['1', makeMap()], ['2', second]]) });
  runtime.load(1, 0, 0, 2);
  runtime.transfer(2, 1, 1, 8);
  assert.deepEqual(state.map, { id: 2, x: 1, y: 1, direction: 8, vehicle: null });
});
