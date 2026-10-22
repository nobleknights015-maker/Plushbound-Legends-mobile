import test from 'node:test';
import assert from 'node:assert/strict';
import { GameState } from '../src/core/GameState.js';
import { MemorySaveStorage, SaveManager } from '../src/saves/SaveManager.js';
import { FrontDoorFlow } from '../src/scenes/FrontDoorFlow.js';
import { OpeningFieldFlow } from '../src/scenes/OpeningFieldFlow.js';

test('creator and Guardian handoff reaches Elyndor and advances through real opening events', async () => {
  const state = new GameState();
  const saves = new SaveManager({ storage: new MemorySaveStorage(), gameState: state });
  const front = new FrontDoorFlow({ state, saves });

  front.beginNewGame();
  front.setTraveler({ name: 'Traveler', appearance: { hair: 'brown', outfit: 'wanderer' } });
  front.chooseGuardian('cinder');
  const handoff = front.startOpening();
  assert.equal(handoff.phase, 'field');
  assert.equal(state.map.id, 'elyndor-start');

  const field = new OpeningFieldFlow({ state });
  field.enter();

  assert.equal(field.interact('lio'), true);
  assert.equal(state.sw('elyndor-lio-met'), true);
  assert.equal(state.quests.get('a-thread-begins').stage, 1);
  assert.match(field.snapshot().messages.at(-1).text, /threads are restless/i);

  assert.equal(field.interact('lio'), true);
  assert.match(field.snapshot().messages.at(-1).text, /stitching stones east/i);

  assert.equal(state.count('items', 'threadmend-tonic'), 0);
  assert.equal(field.interact('starter-chest'), true);
  assert.equal(state.count('items', 'threadmend-tonic'), 1);
  assert.equal(state.selfSw('elyndor-start', 'starter-chest', 'A'), true);

  assert.equal(field.interact('starter-chest'), true);
  assert.equal(state.count('items', 'threadmend-tonic'), 1, 'self-switch chest reward must not duplicate');
  assert.match(field.snapshot().messages.at(-1).text, /chest is empty/i);
});

test('Elyndor opening state survives save and reload exactly', async () => {
  const storage = new MemorySaveStorage();
  const state = new GameState();
  const saves = new SaveManager({ storage, gameState: state, clock: () => 1000 });
  const front = new FrontDoorFlow({ state, saves });
  front.beginNewGame();
  front.setTraveler({ name: 'Mira', appearance: { hair: 'black' } });
  front.chooseGuardian('wisp');
  front.startOpening();

  const field = new OpeningFieldFlow({ state });
  field.enter();
  field.interact('lio');
  field.interact('starter-chest');
  const expected = state.serialize();
  await saves.save(1, { label: 'Elyndor Opening' });

  const restored = new GameState();
  const restoredSaves = new SaveManager({ storage, gameState: restored, clock: () => 2000 });
  await restoredSaves.load(1);
  assert.deepEqual(restored.serialize(), expected);

  const restoredField = new OpeningFieldFlow({ state: restored });
  restoredField.enter();
  restoredField.interact('starter-chest');
  assert.equal(restored.count('items', 'threadmend-tonic'), 1);
  assert.match(restoredField.snapshot().messages.at(-1).text, /chest is empty/i);
});
