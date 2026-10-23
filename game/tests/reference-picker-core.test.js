import test from 'node:test';
import assert from 'node:assert/strict';
import {referenceKind,buildReferenceRegistry,referenceOptions} from '../../tools/editor/reference-picker-core.js';

test('reference picker maps only proven database fields and nested rows',()=>{
  assert.equal(referenceKind({fieldKey:'giver'}),'npcs');
  assert.equal(referenceKind({fieldKey:'mapId'}),'maps');
  assert.equal(referenceKind({nestedPath:'entries',nestedKey:'enemyId'}),'enemies');
  assert.equal(referenceKind({nestedPath:'inventory',nestedKey:'itemId'}),'items');
  assert.equal(referenceKind({nestedPath:'prerequisites',nestedKey:'questComplete'}),'quests');
  assert.equal(referenceKind({nestedPath:'rewards.items',nestedKey:'id'}),'items');
  assert.equal(referenceKind({fieldKey:'futureExtension'}),null);
});

test('reference registry accepts array and keyed content plus runtime maps',()=>{
  const registry=buildReferenceRegistry([{data:{items:{tonic:{id:'tonic'}},enemies:[{id:'fray'}],quests:[{id:'quest'}],npcs:[{id:'lio'}],namedCore:{bram:{id:'bram'}},shops:[{id:'shop'}],waystitches:[{id:'way'}]}}],[{data:{maps:[{id:'map-b'},{id:'map-a'}]}}]);
  assert.deepEqual(referenceOptions(registry,{nestedPath:'inventory',nestedKey:'itemId'}),['tonic']);
  assert.deepEqual(referenceOptions(registry,{fieldKey:'giver'}),['bram','lio']);
  assert.deepEqual(referenceOptions(registry,{fieldKey:'mapId'}),['map-a','map-b']);
});
