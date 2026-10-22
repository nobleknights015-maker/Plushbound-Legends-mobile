import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { PlushboundGameSession } from '../runtime/PlushboundGameSession.js';

const json = url => JSON.parse(readFileSync(url, 'utf8'));
const opening = json(new URL('../content/opening-elyndor.json', import.meta.url));
const route = json(new URL('../content/elyndor-route-one.json', import.meta.url));
const mapPackage = json(new URL('../runtime/elyndor-route-one.maps.json', import.meta.url));

function session() {
  return new PlushboundGameSession({ mapPackage, contentPackages: [opening, route], logger: { error() {} } });
}

test('session exposes one gameplay surface for maps, interactions, battles and shops', () => {
  const game = session();
  game.enter('elyndor-sunny-plains', 12, 10, 2);
  game.interact('lio');
  assert.equal(game.snapshot().quests['a-thread-begins'].status, 'active');

  game.recordBattle(['frayling']);
  assert.equal(game.snapshot().quests['a-thread-begins'].status, 'ready');
  game.interact('lio');
  assert.equal(game.snapshot().gold, 100);

  const touched = game.triggerAt(31, 10, 'touch');
  assert.deepEqual(touched, ['sunny-plains-to-crossing']);
  assert.equal(game.snapshot().currentMap, 'elyndor-sunthread-crossing');
});

test('session pages interaction dialogue in event order', () => {
  const game = session();
  game.enter('elyndor-sunny-plains');
  game.interact('lio');
  let snapshot = game.snapshot();
  assert.equal(snapshot.dialogue.length, 2);
  assert.equal(snapshot.dialogue.remaining, 1);
  assert.equal(snapshot.dialogue.current.speaker, 'Lio');
  assert.match(snapshot.dialogue.current.text, /pull too/);

  const second = game.advanceDialogue();
  assert.match(second.text, /plains are usually gentle/);
  snapshot = game.snapshot();
  assert.equal(snapshot.dialogue.remaining, 0);

  assert.equal(game.advanceDialogue(), null);
  assert.equal(game.snapshot().dialogue.current, null);
});

test('session opens shops from resolved map events and keeps active shop state separate from history', () => {
  const game = session();
  game.enter('elyndor-menders-rest', 10, 7, 2);
  game.interact('nessa');
  let snapshot = game.snapshot();
  assert.deepEqual(snapshot.shopHistory, ['menders-rest-provisions']);
  assert.equal(snapshot.activeShop.id, 'menders-rest-provisions');
  assert.equal(snapshot.activeShop.inventory.length, 3);
  assert.ok(snapshot.messages.some(entry => entry.speaker === 'Nessa'));

  game.closeShop();
  snapshot = game.snapshot();
  assert.equal(snapshot.activeShop, null);
  assert.deepEqual(snapshot.shopHistory, ['menders-rest-provisions']);
});

test('session snapshot is serializable game state rather than engine-internal objects', () => {
  const game = session();
  game.enter('elyndor-sunny-plains', 12, 10, 2);
  game.interact('tutorial-chest');
  const snapshot = game.snapshot();
  assert.equal(snapshot.inventory.items['threadmend-tonic'], 1);
  assert.doesNotThrow(() => JSON.stringify(snapshot));
});

test('session snapshots expose resolved live actions and update with event-page state', () => {
  const game = session();
  game.enter('elyndor-sunny-plains', 12, 10, 2);
  const initial = game.snapshot();
  assert.equal(initial.mapName, 'Sunny Plains of Elyndor');
  assert.ok(initial.actions.some(action => action.eventId === 'lio' && action.label === 'Talk to Lio'));
  assert.ok(initial.actions.some(action => action.eventId === 'tutorial-chest' && action.kind === 'chest'));
  assert.ok(initial.actions.some(action => action.eventId === 'sunny-plains-to-crossing' && action.trigger === 'touch'));

  game.interact('tutorial-chest');
  const afterChest = game.snapshot();
  const chest = afterChest.actions.find(action => action.eventId === 'tutorial-chest');
  assert.equal(chest.kind, 'chest');
  assert.equal(chest.trigger, 'action');

  game.interact('lio');
  game.recordBattle(['frayling']);
  game.interact('lio');
  const unlocked = game.snapshot().actions.find(action => action.eventId === 'sunny-plains-to-crossing');
  assert.equal(unlocked.destinationMapId, 'elyndor-sunthread-crossing');
  assert.match(unlocked.label, /Sunthread Crossing/);
});
