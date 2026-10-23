import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {clone,nextEventId,eventClipboardPayload,pasteEventPayload,duplicateEvent} from '../../tools/editor/event-copy-core.js';

const source=JSON.parse(readFileSync(new URL('../runtime/elyndor-route-one.maps.json',import.meta.url),'utf8'));

test('duplicate event generates collision-free ids and clamps placement',()=>{
  const map=clone(source.maps[0]);
  const first=duplicateEvent(map,'lio');
  assert.equal(first.id,'lio-copy');
  const second=duplicateEvent(map,'lio',{x:999,y:-4});
  assert.equal(second.id,'lio-copy-2');
  assert.equal(second.x,map.width-1);
  assert.equal(second.y,0);
});

test('duplicate event deep-copies pages, conditions, commands and assets',()=>{
  const map=clone(source.maps[0]);
  const original=map.events.find(event=>event.id==='lio');
  const copy=duplicateEvent(map,'lio');
  assert.equal(copy.assetId,original.assetId);
  assert.deepEqual(copy.pages,original.pages);
  copy.pages[0].commands[0].parameters[0]='Changed copy only';
  assert.notEqual(copy.pages[0].commands[0].parameters[0],original.pages[0].commands[0].parameters[0]);
});

test('clipboard preserves unknown future commands byte-for-structure',()=>{
  const map={id:'test',width:4,height:4,events:[{id:'advanced',x:1,y:1,pages:[{trigger:'action',commands:[{code:'ENGINE_PLUGIN_PRIVATE',parameters:[{nested:['keep',1,true]}]}]}]}]};
  const payload=eventClipboardPayload(map.events[0]);
  const pasted=pasteEventPayload(map,payload);
  assert.deepEqual(pasted.pages[0].commands[0],{code:'ENGINE_PLUGIN_PRIVATE',parameters:[{nested:['keep',1,true]}]});
});

test('clipboard can paste across maps with a new target id and coordinates',()=>{
  const from=clone(source.maps[0]),to=clone(source.maps[1]);
  const payload=eventClipboardPayload(from.events.find(event=>event.id==='lio'));
  const pasted=pasteEventPayload(to,payload,{id:'guest-lio',x:2,y:3,offsetX:0,offsetY:0});
  assert.equal(pasted.id,'guest-lio');
  assert.equal(pasted.x,2);
  assert.equal(pasted.y,3);
  assert.deepEqual(pasted.pages,from.events.find(event=>event.id==='lio').pages);
});

test('invalid clipboard payloads and duplicate explicit ids are rejected without mutation',()=>{
  const map=clone(source.maps[0]),before=JSON.stringify(map.events);
  assert.throws(()=>pasteEventPayload(map,{kind:'other',schemaVersion:1,event:{}}),/Unsupported/);
  assert.equal(JSON.stringify(map.events),before);
  const payload=eventClipboardPayload(map.events[0]);
  assert.throws(()=>pasteEventPayload(map,payload,{id:map.events[1].id}),/already exists/);
  assert.equal(JSON.stringify(map.events),before);
});

test('next event id skips existing copy suffixes deterministically',()=>{
  const map={events:[{id:'npc'},{id:'npc-copy'},{id:'npc-copy-2'}]};
  assert.equal(nextEventId(map,'npc'),'npc-copy-3');
});
