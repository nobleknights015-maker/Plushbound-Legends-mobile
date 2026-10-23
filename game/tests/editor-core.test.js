import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import { normalizePackage, moveEvent, setBlocked, eventSummary, addEventPage, updatePageTrigger, updatePageConditions, replaceCommand, addCommand, addLayer, paintTile, tileAt, setLayerVisibility, setLayerZ, addEvent, removeEvent, setEventAsset, normalizeAssetManifest } from '../../tools/editor/editor-core.js';

const source = JSON.parse(readFileSync(new URL('../runtime/elyndor-route-one.maps.json', import.meta.url), 'utf8'));
const manifest = JSON.parse(readFileSync(new URL('../assets/asset-manifest.json', import.meta.url), 'utf8'));

test('editor accepts and clones the real Elyndor runtime package', () => {
  const pkg = normalizePackage(source);
  assert.equal(pkg.maps.length, 3);
  assert.notEqual(pkg, source);
  assert.equal(pkg.maps[0].id, 'elyndor-sunny-plains');
  assert.equal(pkg.maps[0].events.find(e => e.id === 'lio').x, 18);
  assert.deepEqual(pkg.maps[0].layers, []);
});

test('event movement clamps to map bounds without touching page commands', () => {
  const pkg = normalizePackage(source);
  const map = pkg.maps.find(m => m.id === 'elyndor-sunny-plains');
  const before = JSON.stringify(map.events.find(e => e.id === 'lio').pages);
  const moved = moveEvent(map, 'lio', 999, -4);
  assert.equal(moved.x, map.width - 1);
  assert.equal(moved.y, 0);
  assert.equal(JSON.stringify(moved.pages), before);
});

test('blocked-cell painter adds, deduplicates and erases cells', () => {
  const map = normalizePackage(source).maps[0];
  setBlocked(map, 5, 6, true); setBlocked(map, 5, 6, true);
  assert.equal(map.blocked.filter(v => v === '5,6').length, 1);
  setBlocked(map, 5, 6, false);
  assert.equal(map.blocked.includes('5,6'), false);
});

test('native engine map layers can be added, painted, erased and configured', () => {
  const map = normalizePackage(source).maps[0];
  const layer = addLayer(map, { id: 'ground', name: 'Ground', z: 0 });
  assert.equal(layer.data.length, map.width * map.height);
  assert.equal(tileAt(map, 0, 4, 5), 0);
  paintTile(map, 0, 4, 5, 17);
  assert.equal(tileAt(map, 0, 4, 5), 17);
  paintTile(map, 0, 4, 5, 0);
  assert.equal(tileAt(map, 0, 4, 5), 0);
  setLayerZ(map, 0, 12);
  setLayerVisibility(map, 0, false);
  assert.equal(map.layers[0].z, 12);
  assert.equal(map.layers[0].visible, false);
});

test('event placement and asset assignment preserve valid engine event shape', () => {
  const map = normalizePackage(source).maps[0];
  const event = addEvent(map, { id: 'editor-test-npc', x: 3, y: 4, assetId: 'npc/lio/sprite' });
  assert.equal(event.pages.length, 1);
  assert.equal(event.pages[0].trigger, 'action');
  setEventAsset(event, 'environment/chest/elyndor-small');
  assert.equal(event.assetId, 'environment/chest/elyndor-small');
  assert.equal(removeEvent(map, event.id).id, 'editor-test-npc');
  assert.equal(map.events.some(e => e.id === 'editor-test-npc'), false);
});

test('asset manifest exposes editor-safe logical assets', () => {
  const assets = normalizeAssetManifest(manifest);
  assert.ok(assets.some(a => a.id === 'npc/lio/sprite' && a.type === 'character-sprite'));
  assert.ok(assets.some(a => a.id === 'tileset/elyndor/sunny-plains' && a.type === 'tileset'));
  assert.equal(assets.some(a => a.type === 'bgm'), false);
});

test('event summaries expose trigger/condition structure without mutating it', () => {
  const lio = normalizePackage(source).maps[0].events.find(e => e.id === 'lio');
  const summary = eventSummary(lio);
  assert.equal(summary.length, 3);
  assert.equal(summary[0].trigger, 'action');
  assert.equal(summary[0].commandCount, 4);
  assert.equal(summary[2].conditions.switchId, 'quest:a-thread-begins:ready');
  summary[2].conditions.switchId = 'changed';
  assert.equal(lio.pages[2].conditions.switchId, 'quest:a-thread-begins:ready');
});

test('page authoring adds pages and safely changes trigger and conditions', () => {
  const lio = normalizePackage(source).maps[0].events.find(e => e.id === 'lio');
  const originalCount = lio.pages.length;
  addEventPage(lio);
  updatePageTrigger(lio, originalCount, 'touch');
  updatePageConditions(lio, originalCount, { switchId: 'editor:test', switchValue: true, ignored: '' });
  assert.equal(lio.pages[originalCount].trigger, 'touch');
  assert.deepEqual(lio.pages[originalCount].conditions, { switchId: 'editor:test', switchValue: true });
});

test('supported commands can be replaced or appended without rewriting neighbors', () => {
  const lio = normalizePackage(source).maps[0].events.find(e => e.id === 'lio');
  const untouched = JSON.stringify(lio.pages[0].commands[1]);
  replaceCommand(lio, 0, 0, { code: 'MESSAGE', parameters: ['Editor changed this line.', { speaker: 'Lio' }] });
  assert.equal(lio.pages[0].commands[0].parameters[0], 'Editor changed this line.');
  assert.equal(JSON.stringify(lio.pages[0].commands[1]), untouched);
  addCommand(lio, 0, { code: 'SE', parameters: ['se/editor/test'] });
  assert.equal(lio.pages[0].commands.at(-1).code, 'SE');
});

test('unsupported engine commands stay protected from replacement', () => {
  const fake = { id: 'advanced', pages: [{ trigger: 'action', commands: [{ code: 'MOVE_ROUTE', parameters: [{ route: [] }] }] }] };
  assert.throws(() => replaceCommand(fake, 0, 0, { code: 'MESSAGE', parameters: ['nope'] }), /read-only/);
});
