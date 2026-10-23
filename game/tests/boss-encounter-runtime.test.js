import test from 'node:test';
import assert from 'node:assert/strict';
import {GameState} from '../../engine/src/core/GameState.js';
import {GameContentRuntime} from '../runtime/GameContentRuntime.js';

test('game runtime exposes boss encounter definitions without inventing resolution semantics',()=>{
  const source={bossEncounters:[{id:'hart',mapId:'sanctum',enemyId:'unraveled-hart',oneTime:true,completionSwitch:'hart:defeated'}],enemies:[{id:'unraveled-hart',name:'Hart'}]};
  const runtime=new GameContentRuntime({state:new GameState(),contentPackages:[source]});
  assert.deepEqual(runtime.bossEncounterIds(),['hart']);
  assert.deepEqual(runtime.bossEncounter('hart'),source.bossEncounters[0]);
  const copy=runtime.bossEncounter('hart');copy.enemyId='mutated';
  assert.equal(runtime.bossEncounter('hart').enemyId,'unraveled-hart');
  assert.equal(runtime.state.sw('hart:defeated'),false);
});

test('boss encounter registry accepts keyed content registries',()=>{
  const runtime=new GameContentRuntime({state:new GameState(),contentPackages:[{bossEncounters:{hart:{id:'hart',mapId:'sanctum',enemyId:'boss'}}}]});
  assert.equal(runtime.bossEncounter('hart').mapId,'sanctum');
});
