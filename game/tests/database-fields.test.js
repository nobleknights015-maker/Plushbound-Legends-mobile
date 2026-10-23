import test from 'node:test';
import assert from 'node:assert/strict';

import { scalarFieldDescriptors, applyScalarFields } from '../../tools/editor/database-core.js';

test('visual database fields expose top-level and one-level nested scalars without flattening arrays', () => {
  const record = { id:'cinder', name:'Cinder', level:7, active:true, notes:null, assetBindings:{sprite:'guardian/cinder/sprite',battle:'guardian/cinder/battle'}, skills:['spark'] };
  const fields = scalarFieldDescriptors(record);
  assert.deepEqual(fields.map(field=>field.key), ['id','name','level','active','notes','assetBindings.sprite','assetBindings.battle']);
  assert.equal(fields.find(field=>field.key==='level').type, 'number');
  assert.equal(fields.find(field=>field.key==='active').type, 'boolean');
  assert.equal(fields.find(field=>field.key==='assetBindings.sprite').depth, 1);
  assert.equal(fields.some(field=>field.key==='skills'), false);
});

test('visual database field application preserves arrays while editing native scalar types and nested bindings', () => {
  const record = { id:'cinder', name:'Cinder', level:7, active:true, assetBindings:{sprite:'guardian/cinder/sprite',battle:'guardian/cinder/battle'}, skills:['spark'] };
  const next = applyScalarFields(record,{name:'Cinder Prime',level:'9',active:false,'assetBindings.sprite':'guardian/cinder/sprite-v2'});
  assert.equal(next.name,'Cinder Prime');
  assert.equal(next.level,9);
  assert.equal(next.active,false);
  assert.equal(next.assetBindings.sprite,'guardian/cinder/sprite-v2');
  assert.equal(next.assetBindings.battle,'guardian/cinder/battle');
  assert.deepEqual(next.skills,record.skills);
  assert.equal(record.assetBindings.sprite,'guardian/cinder/sprite');
  assert.notEqual(next,record);
});

test('visual database fields reject invalid numbers without mutating the source', () => {
  const record = { id:'enemy', stats:{threat:3} };
  assert.throws(()=>applyScalarFields(record,{'stats.threat':'not-a-number'}),/must be a number/);
  assert.equal(record.stats.threat,3);
});
