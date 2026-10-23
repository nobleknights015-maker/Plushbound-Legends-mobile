import test from 'node:test';
import assert from 'node:assert/strict';

import {visualFormSupported,valuesFromParameters,parametersFromValues} from '../../tools/editor/command-form-core.js';

test('visual command forms cover high-value authoring commands',()=>{
  for(const code of ['MESSAGE','WAIT','SWITCH','SELF_SWITCH','VARIABLE','VARIABLE_OP','CONDITIONAL','COMMON_EVENT','CHOICE','INPUT_NUMBER','TRANSFER','MOVE_ROUTE','RELOCATE_EVENT','SHOP','BATTLE','BGM','BGS','ME','SE','TRANSPARENCY','FADE_SCREEN','TINT_SCREEN','FLASH_SCREEN','SHAKE_SCREEN','SCRIPT_HOOK']) assert.equal(visualFormSupported(code),true,code);
  assert.equal(visualFormSupported('JUMP'),false);
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

test('conditional and choice forms preserve branching payloads',()=>{
  assert.deepEqual(parametersFromValues('CONDITIONAL',{kind:'switch',id:'quest:ready',operation:'===',value:'true',falseJump:'7'}),['switch','quest:ready','===',true,7]);
  assert.deepEqual(parametersFromValues('CHOICE',{choices:'Help\nLeave',options:'{"cancel":1}'}),[['Help','Leave'],{cancel:1}]);
  assert.deepEqual(parametersFromValues('INPUT_NUMBER',{variableId:'amount',options:'{"digits":2}'}),['amount',{digits:2}]);
});

test('movement and screen forms preserve runtime command shapes',()=>{
  assert.deepEqual(parametersFromValues('MOVE_ROUTE',{target:'player',wait:true,route:'[{"move":"left"}]'}),['player',{wait:true,route:[{move:'left'}]}]);
  assert.deepEqual(parametersFromValues('RELOCATE_EVENT',{eventId:'bram',x:'4',y:'6'}),['bram',4,6]);
  assert.deepEqual(parametersFromValues('FADE_SCREEN',{mode:'out',seconds:'0.4'}),['out',0.4]);
  assert.deepEqual(parametersFromValues('TINT_SCREEN',{payload:'{"tone":[-20,0,20,0]}'}),[{tone:[-20,0,20,0]}]);
});

test('audio, runtime common event and game hook forms preserve payloads',()=>{
  assert.deepEqual(parametersFromValues('SE',{assetId:'se/chest/open',options:'{"volume":80}'}),['se/chest/open',{volume:80}]);
  assert.deepEqual(parametersFromValues('COMMON_EVENT',{id:'heal-and-warp'}),['heal-and-warp']);
  assert.deepEqual(parametersFromValues('SCRIPT_HOOK',{name:'quest.start',payload:'{"questId":"a-thread-begins"}'}),['quest.start',{questId:'a-thread-begins'}]);
  assert.deepEqual(parametersFromValues('SHOP',{shopId:'menders-rest-provisions'}),['menders-rest-provisions']);
  assert.deepEqual(parametersFromValues('BATTLE',{encounterId:'frayed-scout'}),['frayed-scout']);
});
