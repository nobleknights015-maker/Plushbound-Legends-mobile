import test from 'node:test';
import assert from 'node:assert/strict';
import { CHARACTER_ATLAS_V1_SLOTS } from '../../tools/editor/character-atlas-v1-core.js';
import { createCharacterAtlasV1Build, assignCharacterAtlasV1Slot, clearCharacterAtlasV1Slot, validateCharacterAtlasV1Build, characterAtlasV1PlacementPlan, characterAtlasV1BuildSummary } from '../../tools/editor/character-atlas-v1-builder-core.js';

test('sheet builder always targets the locked Character Atlas v1 canvas',()=>{
  const build=createCharacterAtlasV1Build({characterId:'Chris Bourn',name:'Chris Bourn'});
  assert.equal(build.character.id,'chris-bourn');
  assert.deepEqual(build.canvas,{width:2048,height:1536,type:'image/png'});
  assert.equal(Object.keys(build.slots).length,57);
  assert.equal(validateCharacterAtlasV1Build(build).ok,true);
});

test('sheet builder reports required production slots instead of guessing',()=>{
  const build=createCharacterAtlasV1Build({characterId:'penney-nguyen'});
  const before=characterAtlasV1BuildSummary(build);
  assert.equal(before.required,26);assert.equal(before.missingRequired.length,26);assert.equal(before.ready,false);
  for(const slot of CHARACTER_ATLAS_V1_SLOTS.filter(slot=>slot.required)) assignCharacterAtlasV1Slot(build,slot.id,{name:`${slot.id}.png`,type:'image/png',width:512,height:512});
  const after=characterAtlasV1BuildSummary(build);
  assert.equal(after.assigned,26);assert.equal(after.missingRequired.length,0);assert.equal(after.ready,true);
});

test('sheet builder emits deterministic contain placement coordinates',()=>{
  const build=createCharacterAtlasV1Build({characterId:'test'});
  assignCharacterAtlasV1Slot(build,'portrait.neutral',{name:'neutral.png',width:512,height:512,type:'image/png'});
  const [placement]=characterAtlasV1PlacementPlan(build);
  assert.equal(placement.slotId,'portrait.neutral');
  assert.deepEqual(placement.destination,{x:453,y:200,width:148,height:148});
  assert.deepEqual(placement.source,{name:'neutral.png',type:'image/png',width:512,height:512,x:0,y:0});
  clearCharacterAtlasV1Slot(build,'portrait.neutral');
  assert.equal(characterAtlasV1PlacementPlan(build).length,0);
});

test('sheet builder rejects unknown slots and malformed canvas contracts',()=>{
  const build=createCharacterAtlasV1Build({characterId:'test'});
  assert.throws(()=>assignCharacterAtlasV1Slot(build,'made.up.slot',{width:10,height:10}),/Unknown/);
  build.canvas.width=1536;
  const validation=validateCharacterAtlasV1Build(build);
  assert.equal(validation.ok,false);
  assert.ok(validation.issues.some(issue=>issue.code==='BUILD_CANVAS_MISMATCH'));
});
