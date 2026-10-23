import test from 'node:test';
import assert from 'node:assert/strict';

import {visualFormSupported,valuesFromParameters,parametersFromValues} from '../../tools/editor/command-form-core.js';

test('visual command forms cover high-value authoring commands',()=>{
  for(const code of ['MESSAGE','WAIT','SWITCH','SELF_SWITCH','VARIABLE','VARIABLE_OP','TRANSFER','SHOP','BATTLE','BGM','BGS','ME','SE','TRANSPARENCY']) assert.equal(visualFormSupported(code),true,code);
  assert.equal(visualFormSupported('SCRIPT_HOOK'),false);
});

test('message visual form preserves speaker and portrait metadata',()=>{
  const values=valuesFromParameters('MESSAGE',['Hello',{speaker:'Lio',portrait:'npc/lio/portrait'}]);
  assert.deepEqual(values,{text:'Hello',speaker:'Lio',portrait:'npc/lio/portrait'});
  assert.deepEqual(parametersFromValues('MESSAGE',values),['Hello',{speaker:'Lio',portrait:'npc/lio/portrait'}]);
});

test('transfer visual form writes native map command tuple',()=>{
  const parameters=parametersFromValues('TRANSFER',{mapId:'elyndor-sunthread-crossing',x:'2',y:'12',direction:'6'});
  assert.deepEqual(parameters,['elyndor-sunthread-crossing',2,12,6]);
  assert.deepEqual(valuesFromParameters('TRANSFER',parameters),{mapId:'elyndor-sunthread-crossing',x:2,y:12,direction:'6'});
});

test('switch and variable forms preserve value types',()=>{
  assert.deepEqual(parametersFromValues('SWITCH',{id:'quest:ready',value:true}),['quest:ready',true]);
  assert.deepEqual(parametersFromValues('VARIABLE',{id:'gold-bonus',value:'{"amount":5}'}),['gold-bonus',{amount:5}]);
  assert.deepEqual(parametersFromValues('VARIABLE_OP',{id:'gold',operation:'+',value:'10'}),['gold','+',10]);
});

test('audio forms preserve options payloads and simple ids',()=>{
  assert.deepEqual(parametersFromValues('SE',{assetId:'se/chest/open',options:'{"volume":80}'}),['se/chest/open',{volume:80}]);
  assert.deepEqual(parametersFromValues('SHOP',{shopId:'menders-rest-provisions'}),['menders-rest-provisions']);
  assert.deepEqual(parametersFromValues('BATTLE',{encounterId:'frayed-scout'}),['frayed-scout']);
});
