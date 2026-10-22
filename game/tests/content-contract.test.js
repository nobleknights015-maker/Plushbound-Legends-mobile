import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = name => JSON.parse(readFileSync(new URL(`../content/${name}`, import.meta.url), 'utf8'));
const world = read('world.json');
const guardians = read('guardians.json');
const opening = read('opening-elyndor.json');
const index = read('content-index.json');

function uniqueIds(items, label) {
  const ids = items.map(item => item.id);
  assert.equal(new Set(ids).size, ids.length, `${label} IDs must be unique`);
  return new Set(ids);
}

test('game content targets the frozen Engine v1 baseline', () => {
  assert.equal(index.engineBaseline, '160d9fd95bc0d3db39224f8bb4c5e1e3a1f54425');
  assert.equal(index.start.worldId, world.world.id);
});

test('starter Guardian roster is complete and uniquely addressable', () => {
  assert.equal(guardians.starters.length, 4);
  const ids = uniqueIds(guardians.starters, 'Guardian');
  for (const expected of ['cinder', 'mallow', 'ripple', 'wisp']) assert.ok(ids.has(expected));
  for (const guardian of guardians.starters) {
    assert.ok(guardian.assetBindings?.sprite);
    assert.ok(guardian.assetBindings?.portrait);
    assert.ok(guardian.assetBindings?.silhouette);
    assert.ok(guardian.assetBindings?.battle);
  }
});

test('Elyndor start map, Lio, first quest and encounter references resolve', () => {
  const regionIds = uniqueIds(world.regions, 'Region');
  const mapIds = uniqueIds(world.maps, 'Map');
  const npcIds = uniqueIds(opening.npcs, 'NPC');
  const questIds = uniqueIds(opening.quests, 'Quest');
  const encounterIds = uniqueIds(opening.encounterTables, 'Encounter table');
  const enemyIds = uniqueIds(opening.enemies, 'Enemy');
  const itemIds = uniqueIds(opening.items, 'Item');

  assert.ok(regionIds.has(index.start.regionId));
  assert.ok(mapIds.has(index.start.mapId));
  assert.ok(npcIds.has('lio'));
  assert.ok(questIds.has(index.start.firstQuestId));

  const startMap = world.maps.find(map => map.id === index.start.mapId);
  assert.ok(encounterIds.has(startMap.encounterTable));
  for (const entry of opening.encounterTables.find(table => table.id === startMap.encounterTable).entries) {
    assert.ok(enemyIds.has(entry.enemyId), `Missing encounter enemy ${entry.enemyId}`);
  }

  const quest = opening.quests.find(entry => entry.id === index.start.firstQuestId);
  assert.equal(quest.giver, 'lio');
  for (const reward of quest.rewards.items || []) assert.ok(itemIds.has(reward.id), `Missing quest reward ${reward.id}`);
});

test('opening sequence keeps the established first-game flow', () => {
  assert.deepEqual(opening.opening.sequence, [
    'traveler-create',
    'guardian-select',
    'first-bond',
    'elyndor-arrival',
    'lio-introduction',
    'frayling-encounter',
    'quest-a-thread-begins'
  ]);
});
