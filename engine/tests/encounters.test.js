import test from 'node:test';
import assert from 'node:assert/strict';
import { GameState } from '../src/core/GameState.js';
import { EncounterManager } from '../src/encounters/EncounterManager.js';

test('step-based encounters trigger deterministically and reset threshold', () => {
  const state = new GameState();
  const rng = () => 0;
  const encounters = new EncounterManager({ state, rng, tables: {
    default: [{ troopId: 1, weight: 1 }]
  }});
  encounters.resetThreshold(2, 0);
  assert.equal(encounters.step(), null);
  const result = encounters.step();
  assert.equal(result.troopId, 1);
  assert.equal(encounters.progress, 0);
});

test('region encounter tables filter candidates by region id', () => {
  const state = new GameState();
  const encounters = new EncounterManager({ state, rng: () => 0, tables: {
    field: [
      { troopId: 'plain', weight: 1, regions: [1] },
      { troopId: 'forest', weight: 1, regions: [2] }
    ]
  }});
  assert.equal(encounters.pick({ table: 'field', regionId: 1 }).troopId, 'plain');
  assert.equal(encounters.pick({ table: 'field', regionId: 2 }).troopId, 'forest');
  assert.equal(encounters.pick({ table: 'field', regionId: 9 }), null);
});

test('encounter disable switch prevents random encounters', () => {
  const state = new GameState();
  state.setSw(99, true);
  const encounters = new EncounterManager({ state, rng: () => 0, tables: {
    default: [{ troopId: 1, weight: 1 }]
  }});
  encounters.resetThreshold(1, 0);
  assert.equal(encounters.step({ disableSwitchId: 99 }), null);
  assert.equal(encounters.progress, 0);
});

test('event encounters bypass random-step progress cleanly', () => {
  const state = new GameState();
  const encounters = new EncounterManager({ state, rng: () => 0 });
  const eventBattle = encounters.eventEncounter({ troopId: 7, canEscape: false });
  assert.deepEqual(eventBattle, { troopId: 7, canEscape: false });
  eventBattle.troopId = 9;
  assert.equal(encounters.progress, 0);
});
