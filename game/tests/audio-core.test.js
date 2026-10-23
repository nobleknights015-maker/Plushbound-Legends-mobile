import test from 'node:test';
import assert from 'node:assert/strict';
import {audioEntries,audioPlayable,audioCommand,filterAudio} from '../../tools/editor/audio-core.js';

const manifest={entries:[
  {id:'bgm/elyndor/plains',type:'bgm',path:'audio/bgm/plains.ogg',status:'planned'},
  {id:'bgs/elyndor/wind',type:'bgs',path:'audio/bgs/wind.ogg',status:'ready'},
  {id:'se/chest/open',type:'se',path:'audio/se/chest.ogg',status:'ready'},
  {id:'npc/lio/sprite',type:'character-sprite',path:'characters/lio.png',status:'ready'}
]};

test('audio browser exposes only runtime audio asset types',()=>{
  assert.deepEqual(audioEntries(manifest).map(entry=>entry.type),['bgm','bgs','se']);
});

test('planned audio is not presented as playable while ready audio is',()=>{
  const entries=audioEntries(manifest);
  assert.equal(audioPlayable(entries[0]),false);
  assert.equal(audioPlayable(entries[1]),true);
});

test('audio command helper mirrors existing Engine v1 parameter tuples',()=>{
  const entry=audioEntries(manifest)[2];
  assert.deepEqual(audioCommand(entry),{code:'SE',parameters:['se/chest/open',{}]});
});

test('audio filtering supports query type and status together',()=>{
  const entries=audioEntries(manifest);
  assert.deepEqual(filterAudio(entries,{query:'elyndor',type:'bgs',status:'ready'}).map(entry=>entry.id),['bgs/elyndor/wind']);
});
