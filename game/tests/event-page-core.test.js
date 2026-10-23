import test from 'node:test';
import assert from 'node:assert/strict';
import {duplicateEventPage,moveEventPage,moveEventPageBy,removeEventPage} from '../../tools/editor/event-page-core.js';

function sample(){return {id:'npc',pages:[
  {trigger:'action',conditions:{switchId:'a'},commands:[{code:'MESSAGE',parameters:['one']},{code:'ENGINE_PLUGIN_PRIVATE',parameters:[{nested:true}]}]},
  {trigger:'touch',commands:[{code:'WAIT',parameters:[12]}]},
  {trigger:'parallel',commands:[{code:'SWITCH',parameters:['flag',true]}]}
]};}

test('duplicate page deep copies all conditions and commands including unknown commands',()=>{
  const event=sample();
  const original=structuredClone(event.pages[0]);
  const result=duplicateEventPage(event,0);
  assert.equal(result.index,1);
  assert.deepEqual(event.pages[1],original);
  event.pages[1].conditions.switchId='changed';
  event.pages[1].commands[1].parameters[0].nested=false;
  assert.equal(event.pages[0].conditions.switchId,'a');
  assert.equal(event.pages[0].commands[1].parameters[0].nested,true);
});

test('page reordering preserves page objects and clamps targets',()=>{
  const event=sample();
  const first=event.pages[0];
  assert.equal(moveEventPage(event,0,99).index,2);
  assert.equal(event.pages[2],first);
  assert.equal(moveEventPageBy(event,2,-1).index,1);
  assert.equal(event.pages[1],first);
});

test('page removal keeps at least one page by default',()=>{
  const event=sample();
  const removed=removeEventPage(event,1);
  assert.equal(removed.page.trigger,'touch');
  assert.equal(event.pages.length,2);
  removeEventPage(event,0);
  assert.equal(event.pages.length,1);
  assert.throws(()=>removeEventPage(event,0),/keep at least one page/);
});

test('invalid page indexes fail without mutation',()=>{
  const event=sample(),before=JSON.stringify(event);
  assert.throws(()=>duplicateEventPage(event,9),/Unknown page/);
  assert.throws(()=>moveEventPage(event,-1,0),/Unknown page/);
  assert.throws(()=>removeEventPage(event,4),/Unknown page/);
  assert.equal(JSON.stringify(event),before);
});
