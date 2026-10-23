import test from 'node:test';
import assert from 'node:assert/strict';

import { PlushboundGameSession } from '../runtime/PlushboundGameSession.js';
import { EditorPlaytest } from '../../tools/editor/playtest.js';

function content(){
  return {
    encounterTables:[{id:'test-field',entries:[{enemyId:'slime',weight:1,regions:[7]}]}],
    enemies:[{id:'slime',name:'Thread Slime',tags:['test']}]
  };
}

function packageWithoutTransfer(){
  return {maps:[{id:'field',name:'Field',width:3,height:1,encounterTable:'test-field',regions:[0,7,0],blocked:[],layers:[],events:[]}]};
}

function packageWithTransfer(){
  return {maps:[
    {id:'field',name:'Field',width:3,height:1,encounterTable:'test-field',regions:[0,7,0],blocked:[],layers:[],events:[{id:'to-next',x:1,y:0,through:true,pages:[{trigger:'touch',commands:[{code:'TRANSFER',parameters:['next',0,0,6]}]}]}]},
    {id:'next',name:'Next',width:2,height:1,regions:[0,0],blocked:[],layers:[],events:[]}
  ]};
}

test('game session registers encounter tables and resolves region-filtered encounters on movement', () => {
  const game = new PlushboundGameSession({mapPackage:packageWithoutTransfer(),contentPackages:[content()],encounter:{rng:()=>0,base:1,variance:0,rate:1},logger:{error(){}}});
  game.enter('field',0,0,6);
  const result = game.move(1,0);
  assert.equal(result.moved,true);
  assert.equal(result.transferred,false);
  assert.equal(result.encounter.enemyId,'slime');
  assert.equal(result.encounter.enemy.name,'Thread Slime');
  assert.equal(result.snapshot.regionId,7);
  assert.equal(result.snapshot.encounterTable,'test-field');
});

test('touch transfer wins over random encounter on the transfer step', () => {
  const game = new PlushboundGameSession({mapPackage:packageWithTransfer(),contentPackages:[content()],encounter:{rng:()=>0,base:1,variance:0,rate:1},logger:{error(){}}});
  game.enter('field',0,0,6);
  const result = game.move(1,0);
  assert.equal(result.moved,true);
  assert.equal(result.transferred,true);
  assert.deepEqual(result.touchEvents,['to-next']);
  assert.equal(result.encounter,null);
  assert.equal(result.snapshot.currentMap,'next');
  assert.equal(result.snapshot.map.x,0);
  assert.equal(result.snapshot.map.y,0);
});

test('editor playtest uses the real game session movement path', () => {
  const playtest = new EditorPlaytest({mapPackage:packageWithoutTransfer(),contentPackages:[content()],mapId:'field',x:0,y:0,direction:6,encounter:{rng:()=>0,base:1,variance:0,rate:1}});
  const result = playtest.move(1,0);
  const snapshot = playtest.snapshot();
  assert.equal(result.encounter.enemyId,'slime');
  assert.equal(snapshot.currentMap,'field');
  assert.equal(snapshot.map.x,1);
  assert.equal(snapshot.regionId,7);
  assert.deepEqual(snapshot.encounterPreview.entries.map(entry=>entry.enemyId),['slime']);
});
