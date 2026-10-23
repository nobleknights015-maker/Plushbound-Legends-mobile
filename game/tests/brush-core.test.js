import test from 'node:test';
import assert from 'node:assert/strict';
import {brushCells,paintTileBrush,paintRegionBrush,paintBlockedBrush,observedTileIds} from '../../tools/editor/brush-core.js';

function map(){return {width:5,height:4,layers:[{id:'ground',data:Array(20).fill(0)}],regions:Array(20).fill(0),blocked:[]};}

test('brush cells center odd square brushes and crop safely at map edges',()=>{
  const m=map();
  assert.equal(brushCells(m,2,2,3).length,9);
  assert.deepEqual(brushCells(m,0,0,3).map(cell=>[cell.x,cell.y]),[[0,0],[1,0],[0,1],[1,1]]);
  assert.equal(brushCells(m,4,3,5).length,9);
});

test('tile brush paints one atomic cell set and reports only real changes',()=>{
  const m=map();
  const first=paintTileBrush(m,0,2,1,17,3);
  assert.equal(first.changed,9);
  assert.equal(m.layers[0].data.filter(value=>value===17).length,9);
  assert.equal(paintTileBrush(m,0,2,1,17,3).changed,0);
  assert.equal(paintTileBrush(m,0,2,1,0,3).changed,9);
});

test('region and blocked brushes use the same bounded footprint',()=>{
  const m=map();
  const regions=paintRegionBrush(m,0,0,7,3);
  assert.equal(regions.changed,4);
  assert.equal(m.regions.filter(value=>value===7).length,4);
  const blocked=paintBlockedBrush(m,2,2,true,3);
  assert.equal(blocked.changed,9);
  assert.equal(m.blocked.length,9);
  assert.equal(paintBlockedBrush(m,2,2,false,3).changed,9);
  assert.deepEqual(m.blocked,[]);
});

test('observed tile ids stay numeric, sorted and bounded for touch palettes',()=>{
  const m=map();m.layers[0].data.splice(0,6,8,2,8,17,3,2);
  assert.deepEqual(observedTileIds(m),[0,2,3,8,17]);
  assert.deepEqual(observedTileIds(m,{includeZero:false,limit:3}),[2,3,8]);
});
