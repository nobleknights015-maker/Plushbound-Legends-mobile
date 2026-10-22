import test from 'node:test';
import assert from 'node:assert/strict';
import { GameState } from '../src/core/GameState.js';
import { EventInterpreter, EventCommandRegistry, registerCoreEventCommands } from '../src/events/EventInterpreter.js';

function build() {
  const calls=[];
  const ui={
    message:(...x)=>calls.push(['message',...x]),
    choice:()=>1,
    inputNumber:()=>7,
    shop:(...x)=>{calls.push(['shop',...x]);return 'bought';}
  };
  const audio={playBgm:(...x)=>calls.push(['bgm',...x]),fadeBgm:(...x)=>calls.push(['bgmFade',...x]),playMe:(...x)=>calls.push(['me',...x])};
  const map={transfer:(...x)=>calls.push(['transfer',...x]),relocateEvent:(...x)=>calls.push(['relocate',...x]),eraseEvent:(...x)=>calls.push(['erase',...x])};
  const screen={fade:(...x)=>calls.push(['fade',...x]),tint:(...x)=>calls.push(['tint',...x]),flash:(...x)=>calls.push(['flash',...x]),shake:(...x)=>calls.push(['shake',...x])};
  const movement={route:(...x)=>calls.push(['route',...x])};
  const player={setTransparent:(...x)=>calls.push(['transparent',...x])};
  const battle={start:()=> 'victory'};
  const registry=registerCoreEventCommands(new EventCommandRegistry(),{ui,audio,map,battle,screen,movement,player});
  const state=new GameState();
  const interpreter=new EventInterpreter({commands:registry,state,logger:{error(...x){throw new Error(x.join(' '));}}});
  return {state,interpreter,calls};
}

test('conditional branching, variable ops and input commands work deterministically',()=>{
  const {state,interpreter}=build();
  interpreter.start([
    {code:'VARIABLE',parameters:[1,5]},
    {code:'VARIABLE_OP',parameters:[1,'+',3]},
    {code:'CONDITIONAL',parameters:['variable',1,'>=',8,5]},
    {code:'SWITCH',parameters:['branch',true]},
    {code:'JUMP',parameters:[6]},
    {code:'SWITCH',parameters:['branch',false]},
    {code:'INPUT_NUMBER',parameters:[2,{min:0,max:9}]}
  ],{});
  interpreter.update(0);
  assert.equal(state.variable(1),8);
  assert.equal(state.sw('branch'),true);
  assert.equal(state.variable(2),7);
});

test('common events return to their caller and preserve event context',()=>{
  const {state,interpreter}=build();
  const context={mapId:3,eventId:9,commonEvents:{heal:[{code:'VARIABLE_OP',parameters:[4,'+',2]}]}};
  interpreter.start([
    {code:'VARIABLE',parameters:[4,1]},
    {code:'COMMON_EVENT',parameters:['heal']},
    {code:'SELF_SWITCH',parameters:['A',true]}
  ],context);
  interpreter.update(0);
  assert.equal(state.variable(4),3);
  assert.equal(state.selfSw(3,9,'A'),true);
});

test('cutscene commands dispatch movement, screen, audio and player control effects',()=>{
  const {interpreter,calls}=build();
  const context={mapId:1,eventId:2};
  interpreter.start([
    {code:'TRANSPARENCY',parameters:[true]},
    {code:'MOVE_ROUTE',parameters:['player',{commands:['left','up']}]},
    {code:'FADE_SCREEN',parameters:['out',0]},
    {code:'TINT_SCREEN',parameters:[[0,0,0,128],1]},
    {code:'FLASH_SCREEN',parameters:[[255,255,255,160],0.2]},
    {code:'SHAKE_SCREEN',parameters:[4,6,0.5]},
    {code:'BGM',parameters:['theme']},
    {code:'BGM_FADE',parameters:[1]},
    {code:'ME',parameters:['fanfare']},
    {code:'RELOCATE_EVENT',parameters:[2,4,5]},
    {code:'ERASE_EVENT'}
  ],context);
  interpreter.update(0);
  assert.deepEqual(calls,[
    ['transparent',true],
    ['route','player',{commands:['left','up']}],
    ['fade','out',0],
    ['tint',[0,0,0,128],1],
    ['flash',[255,255,255,160],0.2],
    ['shake',4,6,0.5],
    ['bgm','theme'],
    ['bgmFade',1],
    ['me','fanfare'],
    ['relocate',2,4,5],
    ['erase',1,2]
  ]);
});

test('choice, battle and shop results remain available to event context',()=>{
  const {interpreter}=build();
  const context={};
  interpreter.start([
    {code:'CHOICE',parameters:[['Yes','No']]},
    {code:'BATTLE',parameters:[{}]},
    {code:'SHOP',parameters:[[{id:'potion'}]]}
  ],context);
  interpreter.update(0);
  interpreter.update(0);
  interpreter.update(0);
  interpreter.update(0);
  assert.equal(context.lastChoice,1);
  assert.equal(context.lastBattleResult,'victory');
  assert.equal(context.shopResult,'bought');
});
