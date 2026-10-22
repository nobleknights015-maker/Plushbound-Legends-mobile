import test from 'node:test';
import assert from 'node:assert/strict';

import { GameState } from '../src/core/GameState.js';
import { SaveManager, MemorySaveStorage } from '../src/saves/SaveManager.js';
import { FrontDoorFlow } from '../src/scenes/FrontDoorFlow.js';
import { ShopEngine } from '../src/shops/ShopEngine.js';
import { EncounterManager } from '../src/encounters/EncounterManager.js';
import { BattleEngine } from '../src/battle/BattleEngine.js';

test('acceptance chain: title to creator, Guardian, shop, encounter, battle, quest, save, reopen and Continue', async () => {
  const storage = new MemorySaveStorage();
  const state = new GameState();
  const saves = new SaveManager({ storage, gameState: state, clock: () => 1000 });
  const front = new FrontDoorFlow({ state, saves });

  const title = await front.titleState();
  assert.equal(title.canContinue, false);

  front.beginNewGame();
  front.setTraveler({
    name: 'Traveler',
    pronouns: 'they/them',
    appearance: { hair: 'brown', outfit: 'wayfarer-red' }
  });
  front.chooseGuardian('cinder');
  const opening = front.startOpening();

  assert.equal(opening.phase, 'field');
  assert.equal(state.actors.get('player').name, 'Traveler');
  assert.equal(state.guardian.id, 'cinder');
  assert.equal(state.guardian.bond.firstThread, true);
  assert.equal(state.map.id, 'elyndor-start');
  assert.equal(state.quests.get('a-thread-begins').stage, 0);

  state.system.gold = 100;
  const shop = new ShopEngine({ state });
  shop.open([
    { kind: 'items', id: 'threadmend-tonic', price: 25, stock: 5 },
    { kind: 'items', id: 'waybread', price: 10, stock: null }
  ]);
  assert.equal(shop.buy(0, 2), true);
  assert.equal(state.system.gold, 50);
  assert.equal(state.count('items', 'threadmend-tonic'), 2);
  shop.close();

  const encounters = new EncounterManager({
    state,
    rng: () => 0,
    tables: {
      elyndor: [
        { id: 'elyndor-frayling-1', troopId: 'frayling-scout', regions: [1], weight: 1 }
      ]
    }
  });
  encounters.resetThreshold(1, 0);
  const encounter = encounters.step({ regionId: 1, table: 'elyndor' });
  assert.equal(encounter.troopId, 'frayling-scout');

  const battle = new BattleEngine({ state, rng: () => 0.5 });
  battle.start({
    party: [
      { id: 'player', name: 'Traveler', hp: 40, maxHp: 40, atk: 12, def: 4, agi: 8 },
      { id: 'cinder', name: 'Cinder', hp: 34, maxHp: 34, atk: 10, def: 3, agi: 10 }
    ],
    enemies: [
      { id: 'frayling', name: 'Frayling', hp: 10, maxHp: 10, atk: 4, def: 0, agi: 3 }
    ],
    rewards: {
      gold: 15,
      exp: 20,
      items: [{ kind: 'items', id: 'frayed-thread', amount: 1 }]
    }
  });

  const result = battle.resolveTurn([
    { actorId: 'cinder', type: 'attack', targetId: 'frayling', variance: 0 },
    { actorId: 'player', type: 'guard' }
  ]);
  assert.equal(result.result, 'victory');
  assert.equal(state.system.gold, 65);
  assert.equal(state.system.exp, 20);
  assert.equal(state.count('items', 'frayed-thread'), 1);

  state.quests.set('a-thread-begins', {
    id: 'a-thread-begins',
    stage: 2,
    status: 'active',
    objective: 'Return to Lio after defeating the Frayling.'
  });
  state.setSw('first-frayling-defeated', true);
  state.setSelfSw('elyndor-start', 'starter-chest', 'A', true);
  Object.assign(state.map, { id: 'elyndor-start', x: 11, y: 7, direction: 4 });

  const exactBeforeSave = state.serialize();
  await saves.save(1, {
    label: 'Elyndor - A Thread Begins',
    extra: { chapter: 'opening', quest: 'a-thread-begins' }
  });

  const titleAfterSave = await front.titleState();
  assert.equal(titleAfterSave.canContinue, true);
  assert.equal(titleAfterSave.latest.slot, 1);

  const restartedState = new GameState();
  const restartedSaves = new SaveManager({ storage, gameState: restartedState, clock: () => 2000 });
  const restartedFront = new FrontDoorFlow({ state: restartedState, saves: restartedSaves });
  const restartedTitle = await restartedFront.titleState();
  assert.equal(restartedTitle.canContinue, true);

  const continued = await restartedFront.continueLatest();
  assert.equal(continued.phase, 'field');
  assert.equal(continued.slot, 1);

  const expectedAfterSave = structuredClone(exactBeforeSave);
  expectedAfterSave.system.saveCount += 1;
  assert.deepEqual(restartedState.serialize(), expectedAfterSave);
  assert.equal(restartedState.actors.get('player').appearance.outfit, 'wayfarer-red');
  assert.equal(restartedState.guardian.id, 'cinder');
  assert.equal(restartedState.quests.get('a-thread-begins').stage, 2);
  assert.equal(restartedState.sw('first-frayling-defeated'), true);
  assert.equal(restartedState.selfSw('elyndor-start', 'starter-chest', 'A'), true);
  assert.equal(restartedState.count('items', 'threadmend-tonic'), 2);
  assert.equal(restartedState.count('items', 'frayed-thread'), 1);
  assert.deepEqual(restartedState.map, { id: 'elyndor-start', x: 11, y: 7, direction: 4, vehicle: null });
});
