import test from 'node:test';
import assert from 'node:assert/strict';
import {MV_TILE_IDS,mvTileSlot,mvTileLocalIndex,mvIsAutotile,mvAutotileKind,mvAutotileShape,mvAutotileId,mvAutotileSlotKind,mvTilePassage,mvTileMetadata} from '../../tools/editor/mv-tile-id-contracts.js';

test('classifies observable MV B-E, A5 and autotile ID ranges without treating reserved IDs as sheets',()=>{
  assert.equal(mvTileSlot(0),'B');assert.equal(mvTileSlot(255),'B');
  assert.equal(mvTileSlot(256),'C');assert.equal(mvTileSlot(512),'D');assert.equal(mvTileSlot(768),'E');
  assert.equal(mvTileSlot(1024),'RESERVED');
  assert.equal(mvTileSlot(1536),'A5');assert.equal(mvTileSlot(1663),'A5');assert.equal(mvTileSlot(1664),'RESERVED');
  assert.equal(mvTileSlot(2048),'A1');assert.equal(mvTileSlot(2816),'A2');assert.equal(mvTileSlot(4352),'A3');assert.equal(mvTileSlot(5888),'A4');
  assert.equal(mvTileSlot(8191),'A4');assert.equal(mvTileSlot(8192),null);
  assert.equal(mvTileLocalIndex(1536),0);assert.equal(mvTileLocalIndex(1663),127);
});

test('round trips MV autotile global kind and shape math exactly',()=>{
  for(const [kind,shape] of [[0,0],[15,47],[16,0],[47,31],[48,17],[79,47],[80,0],[127,47]]){
    const id=mvAutotileId(kind,shape);assert.equal(mvIsAutotile(id),true);assert.equal(mvAutotileKind(id),kind);assert.equal(mvAutotileShape(id),shape);
  }
  assert.deepEqual(mvAutotileSlotKind(MV_TILE_IDS.A2+48*3+12),{slot:'A2',globalKind:19,localKind:3,shape:12});
  assert.throws(()=>mvAutotileId(128,0),RangeError);assert.throws(()=>mvAutotileId(0,48),RangeError);
});

test('decodes MV directional passage and metadata bits from the 8192 flag table',()=>{
  const flags=new Array(8192).fill(0);const id=MV_TILE_IDS.A5;flags[id]=0x01|0x10|0x20|0x80|0x100|(7<<12);
  assert.deepEqual(mvTilePassage(flags,id,2),{direction:2,bit:1,blocked:true,star:true});
  assert.deepEqual(mvTilePassage(flags,id,4),{direction:4,bit:2,blocked:false,star:true});
  const meta=mvTileMetadata(flags,id);assert.equal(meta.slot,'A5');assert.deepEqual(meta.passage,{down:false,left:true,right:true,up:true});assert.equal(meta.star,true);assert.equal(meta.ladder,true);assert.equal(meta.counter,true);assert.equal(meta.damageFloor,true);assert.equal(meta.terrainTag,7);
  assert.throws(()=>mvTilePassage(flags,id,5),RangeError);
  assert.throws(()=>mvTileMetadata([0],id),/8192/);
});
