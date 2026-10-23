import test from 'node:test';
import assert from 'node:assert/strict';
import {commandClipboardPayload,pasteCommandPayload,duplicateEventCommand,moveEventCommandBy,removeEventCommand} from '../../tools/editor/event-command-core.js';

function sample(){return {id:'npc',pages:[{trigger:'action',commands:[
  {code:'MESSAGE',parameters:['one',{speaker:'Lio'}]},
  {code:'ENGINE_PLUGIN_PRIVATE',parameters:[{nested:{value:7}}]},
  {code:'WAIT',parameters:[10]}
]}]};}

test('command clipboard deep copies unknown and known payloads',()=>{
  const event=sample();
  const payload=commandClipboardPayload(event.pages[0].commands[1]);
  payload.command.parameters[0].nested.value=99;
  assert.equal(event.pages[0].commands[1].parameters[0].nested.value,7);
});

test('duplicate command preserves exact structure and inserts beside source',()=>{
  const event=sample(),before=structuredClone(event.pages[0].commands[1]);
  const result=duplicateEventCommand(event,0,1);
  assert.equal(result.index,2);
  assert.deepEqual(event.pages[0].commands[2],before);
  event.pages[0].commands[2].parameters[0].nested.value=3;
  assert.equal(event.pages[0].commands[1].parameters[0].nested.value,7);
});

test('paste appends by default and can target an explicit index',()=>{
  const event=sample(),payload=commandClipboardPayload({code:'SE',parameters:['se/test']});
  assert.equal(pasteCommandPayload(event,0,payload).index,3);
  assert.equal(event.pages[0].commands[3].code,'SE');
  assert.equal(pasteCommandPayload(event,0,payload,{insertIndex:1}).index,1);
  assert.equal(event.pages[0].commands[1].code,'SE');
});

test('move and remove preserve neighboring command objects',()=>{
  const event=sample(),privateCommand=event.pages[0].commands[1];
  assert.equal(moveEventCommandBy(event,0,1,1).index,2);
  assert.equal(event.pages[0].commands[2],privateCommand);
  const removed=removeEventCommand(event,0,2);
  assert.equal(removed.command,privateCommand);
  assert.deepEqual(event.pages[0].commands.map(c=>c.code),['MESSAGE','WAIT']);
});

test('invalid command locations fail without mutation',()=>{
  const event=sample(),before=JSON.stringify(event);
  assert.throws(()=>duplicateEventCommand(event,0,9),/Unknown command/);
  assert.throws(()=>moveEventCommandBy(event,3,0,1),/Unknown page/);
  assert.throws(()=>removeEventCommand(event,0,-1),/Unknown command/);
  assert.equal(JSON.stringify(event),before);
});
