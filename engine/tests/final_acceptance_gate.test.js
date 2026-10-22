import test from 'node:test';
import assert from 'node:assert/strict';

import { GameState } from '../src/core/GameState.js';
import { MemorySaveStorage, SaveManager } from '../src/saves/SaveManager.js';
import { FrontDoorFlow } from '../src/scenes/FrontDoorFlow.js';
import { CutsceneController } from '../src/scenes/CutsceneController.js';
import { OpeningFieldFlow } from '../src/scenes/OpeningFieldFlow.js';
import { ShopEngine } from '../src/shops/ShopEngine.js';
import { EncounterManager } from '../src/encounters/EncounterManager.js';
import { BattleEngine } from '../src/battle/BattleEngine.js';

test('final release chain runs continuously from title through Continue and return-to-title', async () => {
  const storage = new MemorySaveStorage();
  const state = new GameState();
  const saves = new SaveManager({ storage, gameState: state, clock: () => 1000 });
  const front = new FrontDoorFlow({ state, saves });

  const firstTitle = await front.titleState();
  assert.equal(firstTitle.phase, 'title');
  assert.equal(firstTitle.canContinue, false);

  front.beginNewGame();
  front.setTraveler({
    name: 'Traveler',
    pronouns: 'they/them',
    appearance: { hair: 'brown', outfit: 'wayfarer-red' }
  });
  front.chooseGuardian('cinder');

  const locks = [];
  const choreography = [];
  const cutscene = new CutsceneController({ input: { setLocked: value => locks.push(value) } });
  cutscene.start([
    { run: () => choreography.push('fade-in'), waitMs: 200 },
    { run: () => choreography.push('first-bond'), waitMs: 200 },
    { run: () => choreography.push('elyndor-reveal') }
  ], {
    skippable: true,
    context: { onComplete: () => choreography.push('complete') }
  });
  cutscene.update(200);
  cutscene.update(200);
  assert.deepEqual(choreography, ['fade-in', 'first-bond', 'elyndor-reveal', 'complete']);
  assert.deepEqual(locks, [true, false]);

  const opening = front.startOpening();
  assert.equal(opening.phase, 'field');
  assert.equal(state.map.id, 'elyndor-start');
  assert.equal(state.guardian.id, 'cinder');
  assert.equal(state.guardian.bond.firstThread, true);

  const field = new OpeningFieldFlow({ state });
  field.enter();
  assert.equal(field.interact('lio'), true);
  assert.equal(state.sw('elyndor-lio-met'), true);
  assert.equal(state.quests.get('a-thread-begins').stage, 1);

  assert.equal(field.interact('starter-chest'), true);
  assert.equal(state.selfSw('elyndor-start', 'starter-chest', 'A'), true);
  assert.equal(state.count('items', 'threadmend-tonic'), 1);
  assert.equal(field.interact('starter-chest'), true);
  assert.equal(state.count('items', 'threadmend-tonic'), 1);

  state.system.gold = 100;
  const shop = new ShopEngine({ state });
  shop.open([{ kind: 'items', id: 'waybread', price: 10, stock: 3 }]);
  assert.equal(shop.buy(0, 1), true);
  shop.close();
  assert.equal(state.system.gold, 90);
  assert.equal(state.count('items', 'waybread'), 1);

  const encounters = new EncounterManager({
    state,
    rng: () => 0,
    tables: { elyndor: [{ id: 'frayling-1', troopId: 'frayling-scout', regions: [1], weight: 1 }] }
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
    enemies: [{ id: 'frayling', name: 'Frayling', hp: 10, maxHp: 10, atk: 4, def: 0, agi: 3 }],
    rewards: { gold: 15, exp: 20, items: [{ kind: 'items', id: 'frayed-thread', amount: 1 }] }
  });
  const battleResult = battle.resolveTurn([
    { actorId: 'cinder', type: 'attack', targetId: 'frayling', variance: 0 },
    { actorId: 'player', type: 'guard' }
  ]);
  assert.equal(battleResult.result, 'victory');
  assert.equal(state.system.gold, 105);
  assert.equal(state.system.exp, 20);
  assert.equal(state.count('items', 'frayed-thread'), 1);

  state.setSw('first-frayling-defeated', true);
  state.quests.set('a-thread-begins', {
    id: 'a-thread-begins',
    stage: 2,
    status: 'active',
    objective: 'Return to Lio after defeating the Frayling.'
  });
  Object.assign(state.map, { id: 'elyndor-start', x: 11, y: 7, direction: 4 });

  await saves.save(1, { label: 'Release Gate', extra: { quest: 'a-thread-begins', chapter: 'opening' } });
  const savedState = state.serialize();

  const restartedState = new GameState();
  const restartedSaves = new SaveManager({ storage, gameState: restartedState, clock: () => 2000 });
  const restartedFront = new FrontDoorFlow({ state: restartedState, saves: restartedSaves });
  const restartedTitle = await restartedFront.titleState();
  assert.equal(restartedTitle.canContinue, true);

  const continued = await restartedFront.continueLatest();
  assert.equal(continued.phase, 'field');
  assert.deepEqual(restartedState.serialize(), savedState);
  assert.equal(restartedState.quests.get('a-thread-begins').stage, 2);
  assert.equal(restartedState.sw('first-frayling-defeated'), true);
  assert.equal(restartedState.selfSw('elyndor-start', 'starter-chest', 'A'), true);

  const titleReturn = restartedFront.returnToTitle();
  assert.equal(titleReturn.phase, 'title');
  assert.equal(restartedState.party.length, 0);
  assert.equal(restartedState.guardian, null);

  const titleAfterReturn = await restartedFront.titleState();
  assert.equal(titleAfterReturn.canContinue, true);
  await restartedFront.continueLatest();
  assert.deepEqual(restartedState.serialize(), savedState);
});
