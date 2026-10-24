import test from 'node:test';
import assert from 'node:assert/strict';
import { CHARACTER_ATLAS_V1, CHARACTER_ATLAS_V1_SLOTS, atlasV1Slot, validateCharacterAtlasV1Descriptor, compileCharacterAtlasV1Manifest, atlasV1CropPlan, atlasV1AssetEntries, hasPngSignature } from '../../tools/editor/character-atlas-v1-core.js';

test('Character Atlas v1 locks the native production canvas and deterministic slots',()=>{
  assert.deepEqual([CHARACTER_ATLAS_V1.width,CHARACTER_ATLAS_V1.height],[1536,1024]);
  assert.equal(CHARACTER_ATLAS_V1.version,'1.0');
  assert.equal(CHARACTER_ATLAS_V1.layout,'native-1536x1024');
  assert.equal(CHARACTER_ATLAS_V1_SLOTS.length,56);
  assert.equal(CHARACTER_ATLAS_V1_SLOTS.filter(slot=>slot.required).length,26);
  assert.ok(atlasV1Slot('portrait.neutral'));
  assert.ok(atlasV1Slot('field.down.1'));
  assert.ok(atlasV1Slot('battle.attack'));
  assert.ok(CHARACTER_ATLAS_V1_SLOTS.every(slot=>slot.x>=0&&slot.y>=0&&slot.x+slot.width<=1536&&slot.y+slot.height<=1024));
});

test('Character Atlas v1 accepts native sheet and rejects legacy dimensions or wrong MIME',()=>{
  assert.equal(validateCharacterAtlasV1Descriptor({width:1536,height:1024,type:'image/png'}).ok,true);
  const legacy=validateCharacterAtlasV1Descriptor({width:2048,height:1536,type:'image/png'});
  assert.equal(legacy.ok,false);
  assert.ok(legacy.issues.some(issue=>issue.code==='ATLAS_DIMENSIONS_MISMATCH'));
  const jpeg=validateCharacterAtlasV1Descriptor({width:1536,height:1024,type:'image/jpeg'});
  assert.equal(jpeg.ok,false);
  assert.ok(jpeg.issues.some(issue=>issue.code==='ATLAS_FORMAT_MISMATCH'));
  const unknown=validateCharacterAtlasV1Descriptor({width:1536,height:1024,type:''});
  assert.equal(unknown.ok,false);
});

test('Character Atlas v1 verifies PNG bytes instead of trusting filename or MIME alone',()=>{
  const png=new Uint8Array([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a,0,0]);
  const jpeg=new Uint8Array([0xff,0xd8,0xff,0xe0,0,0,0,0,0,0]);
  assert.equal(hasPngSignature(png),true);
  assert.equal(hasPngSignature(jpeg),false);
  const disguised=validateCharacterAtlasV1Descriptor({width:1536,height:1024,type:'image/png',signatureValid:false});
  assert.equal(disguised.ok,false);
  assert.ok(disguised.issues.some(issue=>issue.code==='ATLAS_PNG_SIGNATURE_MISMATCH'));
  assert.throws(()=>compileCharacterAtlasV1Manifest({characterId:'fake',width:1536,height:1024,type:'image/png',signatureValid:false}),/not PNG data/);
});

test('Character Atlas v1 compiler emits stable native asset IDs and crop coordinates',()=>{
  const manifest=compileCharacterAtlasV1Manifest({characterId:'chris-bourn',name:'Chris Bourn',sourceName:'chris.png',width:1536,height:1024,type:'image/png'});
  assert.equal(manifest.templateId,'plushbound-character-atlas-v1');
  assert.equal(manifest.layout,'native-1536x1024');
  assert.equal(manifest.slots.length,56);
  const first=atlasV1CropPlan(manifest)[0];
  assert.equal(first.assetId,'character/chris-bourn/portrait/neutral');
  assert.deepEqual(first.source,{x:363,y:151,width:91,height:123});
  const assets=atlasV1AssetEntries(manifest);
  assert.equal(assets.length,56);
  assert.equal(assets.find(asset=>asset.id==='character/chris-bourn/field/down/1').type,'character-sprite');
  assert.equal(assets.find(asset=>asset.id==='character/chris-bourn/battle/attack').type,'character-battle-sprite');
});

test('Character Atlas v1 compile is deterministic',()=>{
  const input={characterId:'npc-test',width:1536,height:1024,type:'image/png'};
  assert.deepEqual(compileCharacterAtlasV1Manifest(input),compileCharacterAtlasV1Manifest(input));
});