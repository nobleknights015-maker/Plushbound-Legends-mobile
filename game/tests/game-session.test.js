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

test('session opens shops from resolved map events and records UI history', () => {
  const game = session();
  game.enter('elyndor-menders-rest', 10, 7, 2);
  game.interact('nessa');
  const snapshot = game.snapshot();
  assert.deepEqual(snapshot.shopHistory, ['menders-rest-provisions']);
  assert.ok(snapshot.messages.some(entry => entry.speaker === 'Nessa'));
});

test('session snapshot is serializable game state rather than engine-internal objects', () => {
  const game = session();
  game.enter('elyndor-sunny-plains', 12, 10, 2);
  game.interact('tutorial-chest');
  const snapshot = game.snapshot();
  assert.equal(snapshot.inventory.items['threadmend-tonic'], 1);
  assert.doesNotThrow(() => JSON.stringify(snapshot));
});
