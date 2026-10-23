import test from 'node:test';
import assert from 'node:assert/strict';

import { scalarFieldDescriptors, applyScalarFields } from '../../tools/editor/database-core.js';

test('visual database fields expose scalars without flattening nested data', () => {
  const record = { id:'cinder', name:'Cinder', level:7, active:true, notes:null, assetBindings:{sprite:'guardian/cinder/sprite'}, skills:['spark'] };
  const fields = scalarFieldDescriptors(record);
  assert.deepEqual(fields.map(field=>field.key), ['id','name','level','active','notes']);
  assert.equal(fields.find(field=>field.key==='level').type, 'number');
  assert.equal(fields.find(field=>field.key==='active').type, 'boolean');
});

test('visual database field application preserves nested records and native scalar types', () => {
  const record = { id:'cinder', name:'Cinder', level:7, active:true, assetBindings:{sprite:'guardian/cinder/sprite'}, skills:['spark'] };
  const next = applyScalarFields(record,{name:'Cinder Prime',level:'9',active:false});
  assert.equal(next.name,'Cinder Prime');
  assert.equal(next.level,9);
  assert.equal(next.active,false);
  assert.deepEqual(next.assetBindings,record.assetBindings);
  assert.deepEqual(next.skills,record.skills);
  assert.notEqual(next,record);
});

test('visual database fields reject invalid numbers without mutating the source', () => {
  const record = { id:'enemy', threat:3 };
  assert.throws(()=>applyScalarFields(record,{threat:'not-a-number'}),/must be a number/);
  assert.equal(record.threat,3);
});
