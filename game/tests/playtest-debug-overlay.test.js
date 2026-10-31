import test from 'node:test';
import assert from 'node:assert/strict';
import {summarizePlaytestDebug} from '../../tools/editor/playtest-debug-overlay.js';

test('summarizes serialized playtest state without mutating gameplay',()=>{
  const snapshot={currentMap:'map-a',regionId:3,actions:[{},{}],dialogue:{length:1},encounterPreview:{tableId:'field'},debugState:{map:{id:'map-a',x:4,y:5},switches:{a:true,b:false},variables:{gold:20,v:7},selfSwitches:{'map-a:e:A':true},quests:{q1:{state:'active'}},inventory:{items:{potion:2},weapons:{},armor:{}},party:['hero'],guardian:null}};
  const s=summarizePlaytestDebug(snapshot);assert.equal(s.map,'map-a @ 4,5 • R3');assert.equal(s.switches,1);assert.equal(s.variables,2);assert.equal(s.selfSwitches,1);assert.equal(s.quests,1);assert.equal(s.items,2);assert.equal(s.actions,2);assert.equal(s.encounter,'field');
});
