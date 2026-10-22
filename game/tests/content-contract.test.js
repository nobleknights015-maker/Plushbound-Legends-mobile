import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = name => JSON.parse(readFileSync(new URL(`../content/${name}`, import.meta.url), 'utf8'));
const world = read('world.json');
const guardians = read('guardians.json');
const opening = read('opening-elyndor.json');
const route = read('elyndor-route-one.json');
const index = read('content-index.json');

function uniqueIds(items, label) {
  const ids = items.map(item => item.id);
  assert.equal(new Set(ids).size, ids.length, `${label} IDs must be unique`);
  return new Set(ids);
}

function allItems() {
  return [...opening.items, ...route.items];
}

function allEnemies() {
  return [...opening.enemies, ...route.enemies];
}

test('game content targets the frozen Engine v1 baseline', () => {
  assert.equal(index.engineBaseline, '160d9fd95bc0d3db39224f8bb4c5e1e3a1f54425');
  assert.equal(index.start.worldId, world.world.id);
  assert.ok(index.packages.some(pkg => pkg.id === 'elyndor-route-one' && pkg.required));
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
  const enemyIds = uniqueIds(allEnemies(), 'Enemy');
  const itemIds = uniqueIds(allItems(), 'Item');

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

test('Elyndor route one forms a connected playable early-game path', () => {
  const mapIds = uniqueIds(world.maps, 'Map');
  const transferIds = uniqueIds(route.transfers, 'Transfer');
  assert.ok(transferIds.size >= 4);
  assert.deepEqual(route.route.maps, [
    'elyndor-sunny-plains',
    'elyndor-sunthread-crossing',
    'elyndor-menders-rest'
  ]);
  for (const mapId of route.route.maps) assert.ok(mapIds.has(mapId), `Missing route map ${mapId}`);
  for (const transfer of route.transfers) {
    assert.ok(mapIds.has(transfer.from.mapId), `Missing transfer origin ${transfer.from.mapId}`);
    assert.ok(mapIds.has(transfer.to.mapId), `Missing transfer destination ${transfer.to.mapId}`);
  }
  assert.equal(index.earlyGame.routeId, route.route.id);
  assert.equal(index.earlyGame.settlementMapId, 'elyndor-menders-rest');
});

test('route quests, NPCs, shop inventory, encounters and Waystitch references resolve', () => {
  const mapIds = new Set(world.maps.map(map => map.id));
  const npcIds = uniqueIds([...opening.npcs, ...route.npcs], 'NPC');
  const questIds = uniqueIds([...opening.quests, ...route.quests], 'Quest');
  const itemIds = uniqueIds(allItems(), 'Item');
  const enemyIds = uniqueIds(allEnemies(), 'Enemy');
  const shopIds = uniqueIds(route.shops, 'Shop');
  const waystitchIds = uniqueIds(route.waystitches, 'Waystitch');
  const eventIds = uniqueIds(route.events, 'Event');

  for (const npc of route.npcs) {
    assert.ok(mapIds.has(npc.mapId), `Missing NPC map ${npc.mapId}`);
    if (npc.shopId) assert.ok(shopIds.has(npc.shopId), `Missing NPC shop ${npc.shopId}`);
  }

  const secondQuest = route.quests.find(quest => quest.id === index.earlyGame.secondQuestId);
  assert.ok(secondQuest);
  assert.ok(npcIds.has(secondQuest.giver));
  for (const prerequisite of secondQuest.prerequisites || []) {
    if (prerequisite.questComplete) assert.ok(questIds.has(prerequisite.questComplete), `Missing quest prerequisite ${prerequisite.questComplete}`);
  }
  for (const objective of secondQuest.objectives) {
    if (objective.type === 'interact') assert.ok(eventIds.has(objective.target), `Missing objective event ${objective.target}`);
    if (objective.type === 'talk') assert.ok(npcIds.has(objective.target), `Missing objective NPC ${objective.target}`);
  }
  for (const reward of secondQuest.rewards.items || []) assert.ok(itemIds.has(reward.id), `Missing route reward ${reward.id}`);
  for (const unlock of secondQuest.unlocks || []) assert.ok(waystitchIds.has(unlock), `Missing quest unlock ${unlock}`);

  const shop = route.shops.find(entry => entry.id === index.earlyGame.firstShopId);
  assert.ok(shop);
  assert.ok(npcIds.has(shop.keeper));
  for (const stock of shop.inventory) assert.ok(itemIds.has(stock.itemId), `Missing shop item ${stock.itemId}`);

  for (const table of route.encounterTables) {
    for (const entry of table.entries) assert.ok(enemyIds.has(entry.enemyId), `Missing route enemy ${entry.enemyId}`);
  }
});

test('world maps define stable MV-inspired tile dimensions and asset bindings', () => {
  for (const map of world.maps) {
    assert.equal(map.tileSize, 48);
    assert.ok(map.dimensions?.width > 0);
    assert.ok(map.dimensions?.height > 0);
    assert.ok(map.assetBindings?.tileset);
    assert.ok(map.assetBindings?.parallax);
    assert.ok(map.music);
    assert.ok(map.ambience);
  }
});
