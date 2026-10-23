import test from 'node:test';
import assert from 'node:assert/strict';

import {contentReferenceRegistry,commandReferences,auditContentReferences} from '../../tools/editor/reference-audit-core.js';

const contentPackages=[{
  quests:[{id:'quest-one'}],
  items:{potion:{id:'potion'}},
  shops:[{id:'menders-rest-provisions'}],
  waystitches:{north:{id:'waystitch-north'}}
}];

function mapPackage(commands){
  return {maps:[{id:'map-one',events:[{id:'event-one',pages:[{commands}]}]}]};
}

test('reference registry accepts array and keyed content collections',()=>{
  const registry=contentReferenceRegistry(contentPackages);
  assert.equal(registry.quests.has('quest-one'),true);
  assert.equal(registry.items.has('potion'),true);
  assert.equal(registry.shops.has('menders-rest-provisions'),true);
  assert.equal(registry.waystitches.has('waystitch-north'),true);
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

test('command reference scan ignores commands without explicit content registry contracts',()=>{
  const refs=commandReferences(mapPackage([
    {code:'BATTLE',parameters:['adapter-owned-encounter']},
    {code:'BGM',parameters:['audio/owned-by-adapter']},
    {code:'TRANSFER',parameters:['another-map',1,1,2]}
  ]));
  assert.deepEqual(refs,[]);
});
