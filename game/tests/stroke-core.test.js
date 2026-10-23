import test from 'node:test';
import assert from 'node:assert/strict';
import {createStrokeState,beginStroke,applyStrokePoint,applyStrokePath,endStroke,cancelStroke,gridStrokePoints,isContinuousPaintTool} from '../../tools/editor/stroke-core.js';
import {brushCells,paintTileBrush} from '../../tools/editor/brush-core.js';

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

test('multi-cell drag stroke preserves one pre-stroke snapshot across overlapping brush footprints',()=>{
  const map={width:8,height:5,layers:[{id:'ground',data:new Array(40).fill(0)}],blocked:[],regions:new Array(40).fill(0),events:[]};
  const initial=structuredClone(map),snapshots=[];
  const state=createStrokeState();beginStroke(state,{pointerId:11,tool:'tile',label:'Paint 3x3 tile stroke'});
  for(const [x,y] of [[2,2],[3,2],[4,2]]){
    applyStrokePoint(state,{
      x,y,
      willChange:()=>brushCells(map,x,y,3).some(cell=>map.layers[0].data[cell.y*map.width+cell.x]!==31),
      checkpoint:()=>snapshots.push(structuredClone(map)),
      apply:()=>paintTileBrush(map,0,x,y,31,3).changed
    });
  }
  const summary=endStroke(state);
  assert.equal(snapshots.length,1);
  assert.deepEqual(snapshots[0],initial);
  assert.equal(summary.checkpointed,true);
  assert.ok(summary.changed>9);
  assert.equal(map.layers[0].data.filter(value=>value===31).length,15);
});

test('cancelled or lost pointer finalizes the stroke and clears gesture state',()=>{
  const state=createStrokeState();let checkpoints=0;
  beginStroke(state,{pointerId:22,tool:'erase-region',label:'Erase region stroke'});
  applyStrokePoint(state,{x:2,y:3,checkpoint:()=>checkpoints++,apply:()=>4});
  const summary=cancelStroke(state);
  assert.deepEqual(summary,{changed:4,checkpointed:true,tool:'erase-region',label:'Erase region stroke'});
  assert.equal(checkpoints,1);
  assert.equal(state.active,false);
  assert.equal(state.pointerId,null);
  assert.equal(state.tool,null);
  assert.equal(state.changed,0);
  assert.equal(state.checkpointed,false);
  assert.equal(state.visited.size,0);
  assert.equal(state.lastX,null);
  assert.equal(state.lastY,null);
});

test('sparse pointer updates interpolate every grid cell with one checkpoint',()=>{
  assert.deepEqual(gridStrokePoints(1,2,5,2),[{x:1,y:2},{x:2,y:2},{x:3,y:2},{x:4,y:2},{x:5,y:2}]);
  const state=createStrokeState();let checkpoints=0;const painted=[];
  beginStroke(state,{pointerId:30,tool:'tile',label:'Fast paint stroke'});
  applyStrokePath(state,{x:1,y:2,checkpoint:()=>checkpoints++,apply:(x,y)=>{painted.push(`${x},${y}`);return 1;}});
  const leap=applyStrokePath(state,{x:5,y:2,checkpoint:()=>checkpoints++,apply:(x,y)=>{painted.push(`${x},${y}`);return 1;}});
  assert.equal(leap.points,4);
  assert.deepEqual(painted,['1,2','2,2','3,2','4,2','5,2']);
  assert.equal(checkpoints,1);
  assert.equal(endStroke(state).changed,5);
});

test('the editor-facing applyStrokePoint API interpolates a sparse live pointer jump',()=>{
  const state=createStrokeState();let checkpoints=0;const painted=[];
  beginStroke(state,{pointerId:31,tool:'tile',label:'Live fast stroke'});
  applyStrokePoint(state,{x:2,y:4,checkpoint:()=>checkpoints++,apply:(x,y)=>{painted.push(`${x},${y}`);return 1;}});
  const leap=applyStrokePoint(state,{x:7,y:4,checkpoint:()=>checkpoints++,apply:(x,y)=>{painted.push(`${x},${y}`);return 1;}});
  assert.equal(leap.points,5);
  assert.deepEqual(painted,['2,4','3,4','4,4','5,4','6,4','7,4']);
  assert.equal(checkpoints,1);
  assert.equal(endStroke(state).changed,6);
});
