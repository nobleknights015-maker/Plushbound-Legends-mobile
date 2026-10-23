import test from 'node:test';
import assert from 'node:assert/strict';

import {contentReferenceRegistry,commandReferences,auditContentPackageReferences,auditContentReferences} from '../../tools/editor/reference-audit-core.js';

const contentPackages=[{
  quests:[{id:'quest-zero',objectives:[]},{id:'quest-one',prerequisites:[{questComplete:'quest-zero'}],objectives:[{id:'meet',type:'talk',target:'npc-one',count:1},{id:'fight',type:'battle',targetTag:'beast',count:1}],rewards:{items:[{id:'potion',count:1}]},unlocks:['waystitch-north']}],
  items:{potion:{id:'potion'}},
  shops:[{id:'menders-rest-provisions',inventory:[{itemId:'potion',price:10}]}],
  waystitches:{north:{id:'waystitch-north',unlockCondition:{questComplete:'quest-one'}}},
  npcs:[{id:'npc-one'}],
  enemies:[{id:'beast-one',tags:['beast']}],
  encounterTables:[{id:'field',entries:[{enemyId:'beast-one',weight:1}]}]
}];

function mapPackage(commands){
  return {maps:[{id:'map-one',events:[{id:'event-one',pages:[{commands}]}]}]};
}

test('reference registry accepts array and keyed content collections plus objective/tag registries',()=>{
  const registry=contentReferenceRegistry(contentPackages);
  assert.equal(registry.quests.has('quest-one'),true);
  assert.equal(registry.questObjectives.get('quest-one').has('meet'),true);
  assert.equal(registry.items.has('potion'),true);
  assert.equal(registry.shops.has('menders-rest-provisions'),true);
  assert.equal(registry.waystitches.has('waystitch-north'),true);
  assert.equal(registry.npcs.has('npc-one'),true);
  assert.equal(registry.enemies.has('beast-one'),true);
  assert.equal(registry.enemyTags.has('beast'),true);
});

test('valid cross-package content dependencies produce no issues',()=>{
  assert.deepEqual(auditContentPackageReferences(contentPackages),[]);
});

test('reference audit accepts registered shop and Plushbound hook payloads',()=>{
  const pkg=mapPackage([
    {code:'SHOP',parameters:['menders-rest-provisions']},
    {code:'SCRIPT_HOOK',parameters:['quest.start',{questId:'quest-one'}]},
    {code:'SCRIPT_HOOK',parameters:['quest.objective',{questId:'quest-one',objectiveId:'meet'}]},
    {code:'SCRIPT_HOOK',parameters:['inventory.give',{itemId:'potion',count:1}]},
    {code:'SCRIPT_HOOK',parameters:['waystitch.activate',{waystitchId:'waystitch-north'}]}
  ]);
  assert.deepEqual(auditContentReferences(pkg,contentPackages),[]);
});

test('reference audit reports missing command targets with authoring location',()=>{
  const pkg=mapPackage([
    {code:'SHOP',parameters:['missing-shop']},
    {code:'SCRIPT_HOOK',parameters:['quest.start',{questId:'missing-quest'}]},
    {code:'SCRIPT_HOOK',parameters:['inventory.give',{itemId:'missing-item'}]},
    {code:'SCRIPT_HOOK',parameters:['waystitch.activate',{waystitchId:'missing-waystitch'}]},
    {code:'SCRIPT_HOOK',parameters:['future.unsupported',{}]}
  ]);
  const issues=auditContentReferences(pkg,contentPackages);
  assert.equal(issues.length,5);
  assert.deepEqual(issues.map(issue=>issue.code),[
    'missing-shop-reference','missing-quest-reference','missing-item-reference','missing-waystitch-reference','missing-hook-reference'
  ]);
  assert.ok(issues.every(issue=>issue.mapId==='map-one'&&issue.eventId==='event-one'&&issue.pageIndex===0));
});

test('quest objective hooks validate objective ids as well as quest ids',()=>{
  const issues=auditContentReferences(mapPackage([{code:'SCRIPT_HOOK',parameters:['quest.objective',{questId:'quest-one',objectiveId:'missing'}]}]),contentPackages);
  assert.equal(issues.length,1);
  assert.equal(issues[0].code,'missing-quest-objective-reference');
  assert.match(issues[0].message,/Unknown objective/);
});

test('cross-package audit reports broken quest, shop, encounter and waystitch references',()=>{
  const broken=[{
    quests:[{id:'broken',prerequisites:[{questComplete:'missing-q'}],objectives:[{id:'talk',type:'talk',target:'missing-npc'},{id:'fight',type:'battle',targetTag:'missing-tag'}],rewards:{items:[{id:'missing-item'}]},unlocks:['waystitch-missing']}],
    shops:[{id:'bad-shop',inventory:[{itemId:'missing-stock'}]}],
    waystitches:[{id:'bad-stitch',unlockCondition:{questComplete:'missing-q2'}}],
    encounterTables:[{id:'bad-table',entries:[{enemyId:'missing-enemy'}]}]
  }];
  const codes=auditContentPackageReferences(broken).map(issue=>issue.code);
  assert.ok(codes.includes('missing-quest-reference'));
  assert.ok(codes.includes('missing-item-reference'));
  assert.ok(codes.includes('missing-npc-reference'));
  assert.ok(codes.includes('missing-enemy-tag-reference'));
  assert.ok(codes.includes('missing-waystitch-reference'));
  assert.ok(codes.includes('missing-enemy-reference'));
});

test('command reference scan ignores commands without explicit content registry contracts',()=>{
  const refs=commandReferences(mapPackage([
    {code:'BATTLE',parameters:['adapter-owned-encounter']},
    {code:'BGM',parameters:['audio/owned-by-adapter']},
    {code:'TRANSFER',parameters:['another-map',1,1,2]}
  ]));
  assert.deepEqual(refs,[]);
});
