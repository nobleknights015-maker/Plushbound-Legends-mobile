import test from 'node:test';
import assert from 'node:assert/strict';
import {GameState} from '../../engine/src/core/GameState.js';
import {GameContentRuntime} from '../runtime/GameContentRuntime.js';

test('game runtime exposes boss encounter definitions without mutating source records',()=>{
  const source={bossEncounters:[{id:'hart',mapId:'sanctum',enemyId:'unraveled-hart',oneTime:true,completionSwitch:'hart:defeated'}],enemies:[{id:'unraveled-hart',name:'Hart'}]};
  const runtime=new GameContentRuntime({state:new GameState(),contentPackages:[source]});
  assert.deepEqual(runtime.bossEncounterIds(),['hart']);
  assert.deepEqual(runtime.bossEncounter('hart'),source.bossEncounters[0]);
  const copy=runtime.bossEncounter('hart');copy.enemyId='mutated';
  assert.equal(runtime.bossEncounter('hart').enemyId,'unraveled-hart');
  assert.equal(runtime.state.sw('hart:defeated'),false);
  assert.equal(runtime.bossEncounterAvailable('hart'),true);
});

test('boss encounter registry accepts keyed content registries',()=>{
  const runtime=new GameContentRuntime({state:new GameState(),contentPackages:[{bossEncounters:{hart:{id:'hart',mapId:'sanctum',enemyId:'boss'}}}]});
  assert.equal(runtime.bossEncounter('hart').mapId,'sanctum');
});

test('one-time boss victory sets its declared completion switch and disables replay',()=>{
  const state=new GameState();
  const runtime=new GameContentRuntime({state,contentPackages:[{bossEncounters:[{id:'hart',enemyId:'boss',oneTime:true,completionSwitch:'hart:defeated'}]}]});
  const result=runtime.resolveBossEncounter('hart','victory');
  assert.equal(result.result,'victory');
  assert.equal(result.wasAvailable,true);
  assert.equal(result.available,false);
  assert.equal(state.sw('hart:defeated'),true);
  assert.equal(runtime.bossEncounterAvailable('hart'),false);
});

test('escape and defeat do not complete a one-time boss encounter',()=>{
  for(const resultName of ['escape','defeat']){
    const state=new GameState();
    const runtime=new GameContentRuntime({state,contentPackages:[{bossEncounters:[{id:'hart',enemyId:'boss',oneTime:true,completionSwitch:'hart:defeated'}]}]});
    const result=runtime.resolveBossEncounter('hart',resultName);
    assert.equal(result.result,resultName);
    assert.equal(result.available,true);
    assert.equal(state.sw('hart:defeated'),false);
  }
});

test('repeatable bosses remain available after victory even when they report completion',()=>{
  const state=new GameState();
  const runtime=new GameContentRuntime({state,contentPackages:[{bossEncounters:[{id:'arena-boss',enemyId:'boss',oneTime:false,completionSwitch:'arena:cleared'}]}]});
  const result=runtime.resolveBossEncounter('arena-boss','victory');
  assert.equal(state.sw('arena:cleared'),true);
  assert.equal(result.available,true);
  assert.equal(runtime.bossEncounterAvailable('arena-boss'),true);
});
