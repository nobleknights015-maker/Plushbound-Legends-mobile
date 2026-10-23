import test from 'node:test';
import assert from 'node:assert/strict';
import {createStrokeState,beginStroke,applyStrokePoint,endStroke,isContinuousPaintTool} from '../../tools/editor/stroke-core.js';

test('continuous tools are limited to map paint and erase modes',()=>{
  for(const tool of ['tile','erase-tile','region','erase-region','blocked','erase-blocked'])assert.equal(isContinuousPaintTool(tool),true);
  for(const tool of ['select','new-event','new-transfer'])assert.equal(isContinuousPaintTool(tool),false);
});

test('one drag stroke checkpoints once while applying multiple distinct points',()=>{
  const state=createStrokeState();let checkpoints=0,mutations=0;
  assert.equal(beginStroke(state,{pointerId:7,tool:'tile',label:'Paint tile stroke'}),true);
  for(const [x,y] of [[1,1],[2,1],[3,1]]){
    const result=applyStrokePoint(state,{x,y,willChange:true,checkpoint:label=>{checkpoints++;assert.equal(label,'Paint tile stroke');},apply:()=>{mutations++;return 1;}});
    assert.equal(result.applied,true);
  }
  assert.equal(checkpoints,1);
  assert.equal(mutations,3);
  assert.deepEqual(endStroke(state),{changed:3,checkpointed:true,tool:'tile',label:'Paint tile stroke'});
});

test('revisiting a tile during the same stroke does not apply it twice',()=>{
  const state=createStrokeState();let checkpoints=0,mutations=0;
  beginStroke(state,{pointerId:1,tool:'region'});
  applyStrokePoint(state,{x:4,y:5,checkpoint:()=>checkpoints++,apply:()=>{mutations++;return 4;}});
  const repeated=applyStrokePoint(state,{x:4,y:5,checkpoint:()=>checkpoints++,apply:()=>{mutations++;return 4;}});
  assert.equal(repeated.applied,false);
  assert.equal(checkpoints,1);
  assert.equal(mutations,1);
  assert.equal(endStroke(state).changed,4);
});

test('no-op gestures create no history checkpoint',()=>{
  const state=createStrokeState();let checkpoints=0,mutations=0;
  beginStroke(state,{pointerId:3,tool:'blocked'});
  applyStrokePoint(state,{x:0,y:0,willChange:false,checkpoint:()=>checkpoints++,apply:()=>{mutations++;return 1;}});
  applyStrokePoint(state,{x:1,y:0,willChange:()=>false,checkpoint:()=>checkpoints++,apply:()=>{mutations++;return 1;}});
  assert.equal(checkpoints,0);
  assert.equal(mutations,0);
  assert.deepEqual(endStroke(state),{changed:0,checkpointed:false,tool:'blocked',label:'Brush stroke'});
});

test('non-paint tools refuse continuous strokes',()=>{
  const state=createStrokeState();
  assert.equal(beginStroke(state,{pointerId:9,tool:'select'}),false);
  assert.equal(applyStrokePoint(state,{x:1,y:1,checkpoint:()=>{throw new Error('unexpected checkpoint');},apply:()=>{throw new Error('unexpected apply');}}).applied,false);
});
