import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  buildMVDatabaseTables, collectMVDatabaseRecords, extractMVMetadata,
  normalizeMVDatabaseIdRegistry, validateMVDatabaseIdRegistry, MVDatabaseBridge
} from '../runtime/MVDatabaseBridge.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const gameRoot = path.resolve(here, '..');
const contentRoot = path.join(gameRoot, 'content');
const pluginRoot = path.join(gameRoot, 'plugins');
const readJson = filename => JSON.parse(fs.readFileSync(filename, 'utf8'));

function repositoryPackages() {
  const index = readJson(path.join(contentRoot, 'content-index.json'));
  const contentPackages = index.packages.filter(entry => entry.required !== false).map(entry => readJson(path.resolve(contentRoot, entry.path)));
  const maps = index.runtimePackages.filter(entry => entry.required !== false).flatMap(entry => readJson(path.resolve(contentRoot, entry.path)).maps || []);
  return { index, contentPackages, maps };
}

test('current Plushbound content has complete stable MV ids for every exposed record', () => {
  const { contentPackages, maps } = repositoryPackages();
  const registry = readJson(path.join(pluginRoot, 'mv-database-ids.json'));
  const result = buildMVDatabaseTables({ contentPackages, maps, idRegistry: registry });
  assert.deepEqual(result.missing, []);
  assert.equal(result.tables.items.table[1]._plushboundId, 'threadmend-tonic');
  assert.equal(result.tables.items.table[4]._plushboundId, 'woven-charm');
  assert.equal(result.tables.enemies.table[9]._plushboundId, 'unraveled-hart');
  assert.equal(result.mappings.maps.numericById.get('verdancia-weavers-sanctum'), 9);
});

test('future MV database categories are collected without conflating Guardians with actors', () => {
  const records = collectMVDatabaseRecords([
    { starters: [{ id: 'guardian-a', name: 'Guardian A' }], actors: [{ id: 'actor-a', name: 'Actor A' }], skills: [{ id: 'skill-a', name: 'Skill A' }] }
  ]);
  assert.equal(records.actors.length, 1);
  assert.equal(records.actors[0].id, 'actor-a');
  assert.equal(records.skills.length, 1);
  assert.equal(records.actors.some(record => record.id === 'guardian-a'), false);
});

test('registry validation rejects duplicate numeric ids and fallback allocation is explicit', () => {
  const issues = validateMVDatabaseIdRegistry({ ids: { items: { a: 1, b: 1 } } });
  assert.ok(issues.some(issue => issue.code === 'duplicate-numeric-id'));
  const result = buildMVDatabaseTables({ contentPackages: [{ items: [{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }] }], idRegistry: { ids: { items: { a: 7 } } } });
  assert.equal(result.mappings.items.numericById.get('a'), 7);
  assert.equal(result.mappings.items.numericById.get('b'), 8);
  assert.deepEqual(result.missing, [{ category: 'items', id: 'b', assigned: 8 }]);
});

test('MV note metadata and database globals match plugin expectations', () => {
  assert.deepEqual(extractMVMetadata('<Boss>\n<Element: ember>'), { Boss: true, Element: 'ember' });
  const maps = new Map([['map-a', { id: 'map-a', name: 'Map A' }]]);
  const runtime = { contentPackages: [{ items: [{ id: 'item-a', name: 'Item A', note: '<Rare>' }] }], session: { maps: { maps, current: maps.get('map-a') } }, mvPlugins: null };
  const scope = { DataManager: {} };
  const bridge = new MVDatabaseBridge({ scope, runtime, idRegistry: normalizeMVDatabaseIdRegistry({ ids: { maps: { 'map-a': 3 }, items: { 'item-a': 2 } } }) }).install();
  assert.equal(scope.$dataItems[2].id, 2);
  assert.equal(scope.$dataItems[2]._plushboundId, 'item-a');
  assert.equal(scope.$dataItems[2].meta.Rare, true);
  assert.equal(scope.$dataMapInfos[3].name, 'Map A');
  assert.equal(scope.DataManager.isItem(scope.$dataItems[2]), true);
  assert.equal(bridge.numericId('items', 'item-a'), 2);
  assert.equal(bridge.sourceId('maps', 3), 'map-a');
});
