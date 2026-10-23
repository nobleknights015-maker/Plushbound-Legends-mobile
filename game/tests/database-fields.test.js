import test from 'node:test';
import assert from 'node:assert/strict';

import { scalarFieldDescriptors, recordFieldDescriptors, applyScalarFields, applyRecordFields, collectionProfile, newRecordTemplate, nestedRecordListDescriptors, addNestedRecord, replaceNestedRecord, removeNestedRecord } from '../../tools/editor/database-core.js';

test('visual database fields expose top-level and one-level nested scalars', () => {
  const record = { id:'cinder', name:'Cinder', level:7, active:true, notes:null, assetBindings:{sprite:'guardian/cinder/sprite',battle:'guardian/cinder/battle'}, skills:['spark'] };
  const fields = scalarFieldDescriptors(record);
  assert.deepEqual(fields.map(field=>field.key), ['id','name','level','active','notes','assetBindings.sprite','assetBindings.battle']);
  assert.equal(fields.find(field=>field.key==='level').type, 'number');
  assert.equal(fields.find(field=>field.key==='active').type, 'boolean');
  assert.equal(fields.find(field=>field.key==='assetBindings.sprite').depth, 1);
});

test('domain field descriptors expose primitive lists and useful groups without flattening complex arrays', () => {
  const record = { id:'frayling', level:6, stats:{hp:82,attack:18}, tags:['frayling','verdancia'], skills:['scratch'], rewards:{exp:22,drops:[{itemId:'tonic',chance:.1}]}, assets:{battle:'enemy/frayling/battle'} };
  const fields = recordFieldDescriptors(record);
  assert.equal(fields.find(field=>field.key==='tags').type,'list');
  assert.equal(fields.find(field=>field.key==='skills').group,'Gameplay');
  assert.equal(fields.find(field=>field.key==='stats.hp').group,'Gameplay');
  assert.equal(fields.find(field=>field.key==='rewards.exp').group,'Rewards');
  assert.equal(fields.find(field=>field.key==='assets.battle').group,'Assets');
  assert.equal(fields.some(field=>field.key==='rewards.drops'),false);
});

test('structured nested rows expose encounter entries and drops with safe templates', () => {
  const encounter={id:'forest',entries:[{enemyId:'sprout',weight:70}]};
  const encounterLists=nestedRecordListDescriptors(encounter);
  assert.equal(encounterLists[0].key,'entries');
  assert.deepEqual(encounterLists[0].template,{enemyId:'',weight:1});
  const enemy={id:'sprout',rewards:{exp:10,drops:[]}};
  const dropLists=nestedRecordListDescriptors(enemy);
  assert.equal(dropLists[0].key,'rewards.drops');
  assert.deepEqual(dropLists[0].template,{itemId:'',chance:0});
});

test('quest flow exposes prerequisites objectives rewards and unlocks without JSON-only editing',()=>{
  const quest={id:'threads-out-of-tune',name:'Threads Out of Tune',stage:2,giver:'bram',summary:'Repair the anchors.',prerequisites:[{questComplete:'a-thread-begins'}],objectives:[{id:'inspect-west-anchor',type:'interact',target:'anchor-west',count:1}],rewards:{gold:180,items:[{id:'threadmend-tonic',count:2}]},unlocks:['waystitch-menders-rest']};
  assert.equal(collectionProfile('quests').title,'Quests');
  const fields=recordFieldDescriptors(quest);
  assert.equal(fields.find(field=>field.key==='stage').group,'Quest Flow');
  assert.equal(fields.find(field=>field.key==='giver').group,'Quest Flow');
  assert.equal(fields.find(field=>field.key==='unlocks').group,'Quest Flow');
  const lists=nestedRecordListDescriptors(quest);
  assert.deepEqual(lists.map(list=>list.key),['prerequisites','objectives','rewards.items']);
  assert.deepEqual(lists.find(list=>list.key==='prerequisites').template,{questComplete:''});
  assert.deepEqual(lists.find(list=>list.key==='objectives').template,{id:'new-objective',type:'interact',target:'',count:1});
  assert.deepEqual(lists.find(list=>list.key==='rewards.items').template,{id:'',count:1});
  const seeded=newRecordTemplate('quests',{suffix:'test'});
  assert.equal(seeded.id,'new-quest-test');
  assert.equal(seeded.stage,1);
  assert.deepEqual(seeded.objectives,[]);
  assert.deepEqual(seeded.rewards,{gold:0,items:[]});
});

test('shop inventory rows have an authoring template for empty new shops',()=>{
  const shop=newRecordTemplate('shops',{suffix:'test'});
  assert.equal(shop.id,'new-shop-test');
  assert.deepEqual(shop.inventory,[]);
  const lists=nestedRecordListDescriptors(shop);
  assert.equal(lists[0].key,'inventory');
  assert.deepEqual(lists[0].template,{itemId:'',price:0});
});

test('structured nested rows add, edit and remove transactionally', () => {
  const record={id:'forest',entries:[{enemyId:'sprout',weight:70}]};
  const added=addNestedRecord(record,'entries');
  assert.equal(record.entries.length,1);
  assert.equal(added.entries.length,2);
  const edited=replaceNestedRecord(added,'entries',1,{enemyId:'mossling',weight:30});
  assert.deepEqual(edited.entries[1],{enemyId:'mossling',weight:30});
  assert.deepEqual(added.entries[1],{enemyId:'',weight:1});
  const removed=removeNestedRecord(edited,'entries',0);
  assert.deepEqual(removed.entries,[{enemyId:'mossling',weight:30}]);
  assert.equal(edited.entries.length,2);
});

test('visual database field application preserves complex arrays while editing native scalar, nested and primitive-list values', () => {
  const record = { id:'enemy', name:'Enemy', level:7, active:true, tags:['old'], stats:{hp:10}, rewards:{drops:[{itemId:'tonic',chance:.1}]} };
  const next = applyRecordFields(record,{name:'Enemy Prime',level:'9',active:false,tags:'["frayling","elite"]','stats.hp':'25'});
  assert.equal(next.name,'Enemy Prime');
  assert.equal(next.level,9);
  assert.equal(next.active,false);
  assert.deepEqual(next.tags,['frayling','elite']);
  assert.equal(next.stats.hp,25);
  assert.deepEqual(next.rewards.drops,record.rewards.drops);
  assert.deepEqual(record.tags,['old']);
});

test('primitive list editor accepts comma-separated shorthand', () => {
  const record={id:'enemy',skills:['scratch']};
  const next=applyRecordFields(record,{skills:'scratch, moss-dart, guard'});
  assert.deepEqual(next.skills,['scratch','moss-dart','guard']);
});

test('visual database fields reject invalid numbers without mutating the source', () => {
  const record = { id:'enemy', stats:{threat:3} };
  assert.throws(()=>applyScalarFields(record,{'stats.threat':'not-a-number'}),/must be a number/);
  assert.equal(record.stats.threat,3);
});

test('collection profiles provide Plushbound-native labels and structurally useful new-record templates', () => {
  assert.equal(collectionProfile('starters').title,'Plush Guardians');
  assert.equal(collectionProfile('namedCore').title,'Named NPCs');
  const enemy=newRecordTemplate('enemies',{suffix:'test'});
  assert.equal(enemy.id,'new-enemy-test');
  assert.equal(enemy.level,1);
  assert.deepEqual(Object.keys(enemy.stats),['hp','mp','attack','defense','spirit','agility']);
  assert.deepEqual(enemy.tags,[]);
  const guardian=newRecordTemplate('starters',{suffix:'test'});
  assert.equal(guardian.id,'new-guardian-test');
  assert.ok(Object.hasOwn(guardian.assetBindings,'battle'));
});
