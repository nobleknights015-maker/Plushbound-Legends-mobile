import test from 'node:test';
import assert from 'node:assert/strict';
import { GameState } from '../src/core/GameState.js';
import { MemorySaveStorage, SaveManager } from '../src/saves/SaveManager.js';
import { FrontDoorFlow } from '../src/scenes/FrontDoorFlow.js';

function makeFlow(seed = {}) {
  const state = new GameState();
  const storage = new MemorySaveStorage(seed);
  const saves = new SaveManager({ storage, gameState: state, clock: () => 1234 });
  return { state, storage, saves, flow: new FrontDoorFlow({ state, saves }) };
}

test('title disables Continue when no valid save exists', async () => {
  const { flow } = makeFlow();
  const title = await flow.titleState();
  assert.equal(title.canContinue, false);
  assert.equal(title.commands.find(x => x.id === 'continue').enabled, false);
});

test('new game resets state and drives creator through Guardian selection into Elyndor', () => {
  const { state, flow } = makeFlow();
  state.setSw(99, true);
  flow.beginNewGame();
  assert.equal(state.sw(99), false);
  assert.equal(flow.phase, 'creator');

  const traveler = flow.setTraveler({
    name: ' Rowan ',
    pronouns: 'they/them',
    appearance: { hair: 'brown', coat: 'navy' }
  });
  assert.equal(traveler.name, 'Rowan');
  assert.deepEqual(state.party, ['player']);
  assert.equal(flow.phase, 'guardian');
  assert.deepEqual(flow.availableGuardians().map(x => x.id), ['cinder', 'mallow', 'ripple', 'wisp']);

  const guardian = flow.chooseGuardian('cinder');
  assert.equal(guardian.name, 'Cinder');
  assert.equal(guardian.bond.firstThread, true);
  assert.equal(state.map.id, 'elyndor-start');
  assert.equal(state.quests.get('a-thread-begins').status, 'active');
  assert.equal(flow.phase, 'opening');

  const field = flow.startOpening();
  assert.equal(field.phase, 'field');
  assert.equal(field.player.name, 'Rowan');
  assert.equal(field.guardian.id, 'cinder');
});

test('creator validates player name and Guardian id', () => {
  const { flow } = makeFlow();
  flow.beginNewGame();
  assert.throws(() => flow.setTraveler({ name: '   ' }), /1-24/);
  flow.setTraveler({ name: 'Aster' });
  assert.throws(() => flow.chooseGuardian('missing'), /Unknown starter Guardian/);
});

test('Continue restores newest valid save exactly', async () => {
  const { state, saves, flow } = makeFlow();
  flow.beginNewGame();
  flow.setTraveler({ name: 'Aster', appearance: { hair: 'black' } });
  flow.chooseGuardian('wisp');
  flow.startOpening();
  state.setVariable(7, 42);
  await saves.save(1, { label: 'Elyndor' });

  state.setVariable(7, 999);
  const result = await flow.continueLatest();
  assert.equal(result.slot, 1);
  assert.equal(flow.phase, 'field');
  assert.equal(state.variable(7), 42);
  assert.equal(state.actors.get('player').name, 'Aster');
  assert.equal(state.guardian.id, 'wisp');
});

test('corrupt or incompatible saves never enable Continue', async () => {
  const bad = {
    'plushbound:v1:slot:1': '{not-json',
    'plushbound:v1:slot:2': JSON.stringify({ schemaVersion: 999, savedAt: 50, slot: 2, state: { party: [] } })
  };
  const { flow } = makeFlow(bad);
  const title = await flow.titleState();
  assert.equal(title.canContinue, false);
  assert.equal(title.latest, null);
});
