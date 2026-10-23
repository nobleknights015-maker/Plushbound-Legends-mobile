import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => JSON.parse(readFileSync(new URL(`../${path}`, import.meta.url), 'utf8'));
const combat = read('content/verdancia-enemies.json');
const region = read('content/regions/verdancia.json');
const runtimeMaps = read('runtime/verdancia-region.maps.json');
const slots = read('content/verdancia-asset-slots.json');
const manifest = read('assets/asset-manifest.json');
const manifestIds = new Set(manifest.entries.map(entry => entry.id));
const enemies = new Map(combat.enemies.map(enemy => [enemy.id, enemy]));
const tables = new Map(combat.encounterTables.map(table => [table.id, table]));

test('every Verdancia runtime encounter table resolves to registered enemy content', () => {
  for (const map of runtimeMaps.maps) {
    if (!map.encounterTable) continue;
    const table = tables.get(map.encounterTable);
    assert.ok(table, `${map.id} references missing encounter table ${map.encounterTable}`);
    assert.ok(table.entries.length > 0, `${table.id} must contain encounter entries`);
    for (const entry of table.entries) {
      assert.ok(enemies.has(entry.enemyId), `${table.id} references missing enemy ${entry.enemyId}`);
      assert.ok(Number(entry.weight) > 0, `${table.id}/${entry.enemyId} must have a positive weight`);
    }
  }
});

test('descriptive Verdancia map data uses the same encounter ids as runtime maps', () => {
  const byId = new Map(runtimeMaps.maps.map(map => [map.id, map]));
  for (const map of region.maps) {
    const runtime = byId.get(map.id);
    assert.ok(runtime, `missing runtime map ${map.id}`);
    assert.equal(map.encounterTable ?? null, runtime.encounterTable ?? null, `${map.id} encounter table drifted`);
  }
});

test('Verdancia enemies have bounded rewards, battle tags and manifest-backed visual slots', () => {
  assert.equal(enemies.size, 6);
  for (const enemy of enemies.values()) {
    assert.ok(enemy.name);
    assert.ok(Number(enemy.level) > 0);
    assert.ok(Number(enemy.stats?.hp) > 0);
    assert.ok(Array.isArray(enemy.tags) && enemy.tags.includes('verdancia'));
    assert.ok(Number(enemy.rewards?.exp) >= 0);
    assert.ok(Number(enemy.rewards?.gold) >= 0);
    const slotIds = new Set(slots.enemies?.[enemy.id] || []);
    for (const assetId of Object.values(enemy.assets || {})) {
      assert.ok(slotIds.has(assetId), `${enemy.id} asset ${assetId} missing from Verdancia slots`);
      assert.ok(manifestIds.has(assetId), `${enemy.id} asset ${assetId} missing from physical asset manifest`);
    }
  }
});

test('the regional boss is excluded from random encounter tables', () => {
  const boss = enemies.get('unraveled-hart');
  assert.ok(boss?.tags.includes('regional-boss'));
  const randomIds = new Set(combat.encounterTables.flatMap(table => table.entries.map(entry => entry.enemyId)));
  assert.equal(randomIds.has('unraveled-hart'), false);
  assert.ok(combat.bossEncounters.some(encounter => encounter.enemyId === 'unraveled-hart' && encounter.mapId === 'verdancia-weavers-sanctum'));
});
