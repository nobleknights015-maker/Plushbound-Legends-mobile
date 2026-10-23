import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { PlushboundGameSession } from '../runtime/PlushboundGameSession.js';

const json = url => JSON.parse(readFileSync(url, 'utf8'));
const opening = json(new URL('../content/opening-elyndor.json', import.meta.url));
const route = json(new URL('../content/elyndor-route-one.json', import.meta.url));
const mapPackage = json(new URL('../runtime/elyndor-route-one.maps.json', import.meta.url));

function session(options = {}) {
  return new PlushboundGameSession({ mapPackage, contentPackages: [opening, route], logger: { error() {} }, ...options });
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

test('session opens shops from resolved events and performs guarded purchases', () => {
  const game = session();
  game.enter('elyndor-menders-rest', 10, 7, 2);
  game.interact('nessa');
  let snapshot = game.snapshot();
  assert.deepEqual(snapshot.shopHistory, ['menders-rest-provisions']);
  assert.equal(snapshot.activeShop.id, 'menders-rest-provisions');
  assert.equal(snapshot.activeShop.inventory.length, 3);
  assert.equal(snapshot.activeShop.inventory[1].item.name, 'Waybread');
  assert.throws(() => game.buyItem('waybread'), /Not enough gold/);

  game.state.setVariable('gold', 100);
  const purchase = game.buyItem('waybread', 2);
  assert.deepEqual(purchase, { itemId: 'waybread', count: 2, spent: 20, gold: 80 });
  snapshot = game.snapshot();
  assert.equal(snapshot.gold, 80);
  assert.equal(snapshot.inventory.items.waybread, 2);

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

test('encounter victory automatically advances battle objectives while escape does not', () => {
  const game = session();
  game.enter('elyndor-sunny-plains', 12, 10, 2);
  game.interact('lio');

  game.lastEncounter = { enemyId: 'frayling-tuft', enemy: game.game.enemyDefinition('frayling-tuft') };
  const escaped = game.resolveEncounter('escape');
  assert.equal(escaped.result, 'escape');
  assert.equal(game.snapshot().quests['a-thread-begins'].status, 'active');

  game.lastEncounter = { enemyId: 'frayling-tuft', enemy: game.game.enemyDefinition('frayling-tuft') };
  const won = game.resolveEncounter('victory');
  assert.equal(won.result, 'victory');
  assert.equal(won.encounter.enemy.name, 'Tuft Frayling');
  assert.equal(game.snapshot().lastEncounter, null);
  assert.equal(game.snapshot().quests['a-thread-begins'].status, 'ready');
  assert.throws(() => game.resolveEncounter('victory'), /No encounter is active/);
});

test('save restore preserves map quest inventory switches and self switches across session recreation', () => {
  const first = session();
  first.enter('elyndor-sunny-plains', 12, 10, 6);
  first.interact('tutorial-chest');
  first.interact('lio');
  first.recordBattle(['frayling']);
  first.interact('lio');
  first.triggerAt(31, 10, 'touch');
  assert.equal(first.snapshot().currentMap, 'elyndor-sunthread-crossing');

  const save = first.serializeSave();
  assert.equal(save.schemaVersion, 1);
  assert.doesNotThrow(() => JSON.stringify(save));

  const restored = session();
  const snapshot = restored.restoreSave(JSON.parse(JSON.stringify(save)));
  assert.equal(snapshot.currentMap, 'elyndor-sunthread-crossing');
  assert.equal(snapshot.map.x, 2);
  assert.equal(snapshot.map.y, 12);
  assert.equal(snapshot.map.direction, 6);
  assert.equal(snapshot.gold, 100);
  assert.equal(snapshot.inventory.items['threadmend-tonic'], 2);
  assert.equal(snapshot.quests['a-thread-begins'].status, 'complete');
  assert.equal(restored.state.selfSw('elyndor-sunny-plains', 'tutorial-chest', 'A'), true);

  restored.enter('elyndor-sunny-plains', 25, 13, 2);
  restored.interact('tutorial-chest');
  assert.equal(restored.snapshot().inventory.items['threadmend-tonic'], 2);
  assert.match(restored.snapshot().dialogue.current.text, /empty/);
});

test('save restore rejects unknown schema versions and unknown maps', () => {
  const game = session();
  game.enter('elyndor-sunny-plains');
  const save = game.serializeSave();
  assert.throws(() => game.restoreSave({ ...save, schemaVersion: 99 }), /Unsupported Plushbound save schema/);
  save.state.map.id = 'missing-map';
  assert.throws(() => game.restoreSave(save), /unknown map/i);
});
