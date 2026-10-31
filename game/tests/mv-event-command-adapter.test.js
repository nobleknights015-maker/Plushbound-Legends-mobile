import test from 'node:test';
import assert from 'node:assert/strict';
import {decodeMvEventList,encodeMvEventCommands,mvCommandEditable} from '../../tools/editor/mv-event-command-adapter.js';

const end={code:0,indent:0,parameters:[]};

test('decodes proven reversible MV commands into normal editor command cards',()=>{
  const list=[
    {code:121,indent:0,parameters:[4,4,0]},
    {code:122,indent:0,parameters:[2,2,1,0,5]},
    {code:123,indent:0,parameters:['B',1]},
    {code:230,indent:0,parameters:[90]},
    {code:117,indent:0,parameters:[3]},
    {code:115,indent:0,parameters:[]},
    {code:201,indent:0,parameters:[0,7,8,9,6,1]},
    {code:103,indent:0,parameters:[5,4]},
    {code:356,indent:0,parameters:['Example one']},
    {code:655,indent:0,parameters:['two']},
    end
  ];
  const commands=decodeMvEventList(list);
  assert.deepEqual(commands.map(x=>x.code),['SWITCH','VARIABLE_OP','SELF_SWITCH','WAIT','COMMON_EVENT','EXIT_EVENT','TRANSFER','INPUT_NUMBER','PLUGIN_COMMAND']);
  assert.deepEqual(commands[0].parameters,['4',true]);
  assert.deepEqual(commands[1].parameters,['2','+',5]);
  assert.deepEqual(commands[2].parameters,['B',false]);
  assert.deepEqual(commands[3].parameters,[1.5]);
  assert.deepEqual(commands[6].parameters,['7',8,9,6]);
  assert.deepEqual(commands[8].parameters,['Example one\ntwo']);
  assert.equal(commands.every(mvCommandEditable),true);
});

test('untouched reversible and unsupported commands round trip exactly',()=>{
  const original=[
    {code:121,indent:1,parameters:[4,4,0]},
    {code:111,indent:0,parameters:[0,1,0]},
    {code:355,indent:2,parameters:['console.log("preserve")']},
    {code:201,indent:1,parameters:[0,7,8,9,6,1]},
    end
  ];
  const commands=decodeMvEventList(original);
  assert.equal(commands[1].code,'MV_RAW');
  assert.equal(commands[2].code,'MV_RAW');
  assert.equal(mvCommandEditable(commands[1]),false);
  assert.deepEqual(encodeMvEventCommands(commands),original);
});

test('editing safe cards re-encodes numeric MV commands and preserves metadata such as transfer fade',()=>{
  const original=[
    {code:121,indent:2,parameters:[4,4,0]},
    {code:201,indent:1,parameters:[0,7,8,9,6,1]},
    {code:230,indent:0,parameters:[60]},
    end
  ];
  const commands=decodeMvEventList(original);
  commands[0].parameters=['4',false];
  commands[1].parameters=['10',2,3,8];
  commands[2].parameters=[2.25];
  assert.deepEqual(encodeMvEventCommands(commands),[
    {code:121,indent:2,parameters:[4,4,1]},
    {code:201,indent:1,parameters:[0,10,2,3,8,1]},
    {code:230,indent:0,parameters:[135]},
    end
  ]);
});

test('range switches and nonconstant variables stay raw instead of being guessed',()=>{
  const commands=decodeMvEventList([
    {code:121,indent:0,parameters:[1,5,0]},
    {code:122,indent:0,parameters:[1,1,0,1,2]},
    end
  ]);
  assert.deepEqual(commands.map(x=>x.code),['MV_RAW','MV_RAW']);
  assert.deepEqual(encodeMvEventCommands(commands),[
    {code:121,indent:0,parameters:[1,5,0]},
    {code:122,indent:0,parameters:[1,1,0,1,2]},
    end
  ]);
});
