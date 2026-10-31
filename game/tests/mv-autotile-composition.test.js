import test from 'node:test';
import assert from 'node:assert/strict';
import {mvAutotileId} from '../../tools/editor/mv-tile-id-contracts.js';
import {MV_FLOOR_AUTOTILE_TABLE,MV_WALL_AUTOTILE_TABLE,MV_WATERFALL_AUTOTILE_TABLE,mvAutotileAnimationFrameCount,mvAutotileSourcePlan,mvAutotileCompositionSummary} from '../../tools/editor/mv-autotile-composition.js';

test('locks independent MV floor, wall and waterfall quarter recipe counts',()=>{
  assert.equal(MV_FLOOR_AUTOTILE_TABLE.length,48);
  assert.equal(MV_WALL_AUTOTILE_TABLE.length,16);
  assert.equal(MV_WATERFALL_AUTOTILE_TABLE.length,4);
  for(const table of [MV_FLOOR_AUTOTILE_TABLE,MV_WALL_AUTOTILE_TABLE,MV_WATERFALL_AUTOTILE_TABLE])for(const recipe of table){assert.equal(recipe.length,4);for(const pair of recipe){assert.equal(pair.length,2);assert.equal(Number.isInteger(pair[0]),true);assert.equal(Number.isInteger(pair[1]),true);}}
});

test('plans A1 water and waterfall animation phases without source pixels',()=>{
  const waterId=mvAutotileId(0,0);
  assert.equal(mvAutotileAnimationFrameCount(waterId),4);
  const water0=mvAutotileSourcePlan(waterId,{animationFrame:0});
  const water1=mvAutotileSourcePlan(waterId,{animationFrame:1});
  const water3=mvAutotileSourcePlan(waterId,{animationFrame:3});
  assert.deepEqual(water0.sourceBlock,{tileX:0,tileY:0,quarterX:0,quarterY:0});
  assert.deepEqual(water1.sourceBlock,{tileX:2,tileY:0,quarterX:4,quarterY:0});
  assert.deepEqual(water3.sourceBlock,water1.sourceBlock);
  assert.deepEqual(water0.quadrants[0].sourceQuarter,{x:2,y:4});

  const waterfallId=mvAutotileId(5,0);
  assert.equal(mvAutotileAnimationFrameCount(waterfallId),3);
  const fall2=mvAutotileSourcePlan(waterfallId,{animationFrame:2});
  assert.equal(fall2.family,'waterfall');assert.equal(fall2.animationPhase,2);
  assert.deepEqual(fall2.sourceBlock,{tileX:14,tileY:2,quarterX:28,quarterY:4});
  assert.deepEqual(fall2.quadrants[0].sourceRelativeQuarter,{x:2,y:0});
});

test('plans A2, A3 and mixed A4 families with exact source quarter geometry',()=>{
  const a2=mvAutotileSourcePlan(mvAutotileId(16,47));
  assert.equal(a2.slot,'A2');assert.equal(a2.family,'floor');assert.equal(a2.supported,true);
  assert.deepEqual(a2.sourceBlock,{tileX:0,tileY:0,quarterX:0,quarterY:0});
  assert.deepEqual(a2.quadrants.map(q=>q.sourceRelativeQuarter),[{x:0,y:0},{x:1,y:0},{x:0,y:1},{x:1,y:1}]);

  const a3=mvAutotileSourcePlan(mvAutotileId(48,15));
  assert.equal(a3.slot,'A3');assert.equal(a3.family,'wall');assert.equal(a3.supported,true);
  assert.deepEqual(a3.sourceBlock,{tileX:0,tileY:0,quarterX:0,quarterY:0});
  assert.equal(mvAutotileSourcePlan(mvAutotileId(48,16)).supported,false);

  const a4Top=mvAutotileSourcePlan(mvAutotileId(80,0));
  assert.equal(a4Top.slot,'A4');assert.equal(a4Top.family,'floor');assert.deepEqual(a4Top.sourceBlock,{tileX:0,tileY:0,quarterX:0,quarterY:0});
  const a4Side=mvAutotileSourcePlan(mvAutotileId(88,15));
  assert.equal(a4Side.family,'wall');assert.deepEqual(a4Side.sourceBlock,{tileX:0,tileY:3,quarterX:0,quarterY:6});
});

test('emits 24px source/destination rectangles for MV native 48px tiles',()=>{
  const plan=mvAutotileSourcePlan(mvAutotileId(16,0));
  assert.equal(plan.quarterSize,24);assert.equal(plan.quadrants.length,4);
  assert.deepEqual(plan.quadrants[0].sourcePixel,{x:48,y:96,width:24,height:24});
  assert.deepEqual(plan.quadrants[0].destinationPixel,{x:0,y:0,width:24,height:24});
  assert.deepEqual(plan.quadrants[3].destinationPixel,{x:24,y:24,width:24,height:24});
  assert.throws(()=>mvAutotileSourcePlan(mvAutotileId(16,0),{tileSize:47}),RangeError);
});

test('provides compact composition summaries and ignores non-autotiles',()=>{
  const summary=mvAutotileCompositionSummary(mvAutotileId(16,0));
  assert.equal(summary.family,'floor');assert.equal(summary.quarters.length,4);assert.match(summary.quarters[0],/^TL←Q/);
  assert.equal(mvAutotileSourcePlan(1536),null);assert.equal(mvAutotileCompositionSummary(1),null);
});
