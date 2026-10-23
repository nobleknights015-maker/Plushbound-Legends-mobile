import test from 'node:test';
import assert from 'node:assert/strict';

import { EDITABLE_COMMANDS } from '../../tools/editor/editor-core.js';
import { createCommonEventLibrary, addCommonEvent, updateCommonEvent, removeCommonEvent, appendCommonEventCommand, replaceCommonEventCommand, removeCommonEventCommand, moveCommonEventCommand, instantiateCommonEventCommands, insertCommonEvent, validateCommonEventLibrary } from '../../tools/editor/common-event-core.js';

test('common event library creates and validates reusable supported commands', () => {
  let library=createCommonEventLibrary();
  library=addCommonEvent(library,{id:'heal-and-warp',name:'Heal and Warp'});
  library=appendCommonEventCommand(library,'heal-and-warp',{code:'MESSAGE',parameters:['Restored.']});
  library=appendCommonEventCommand(library,'heal-and-warp',{code:'TRANSFER',parameters:['map-two',3,4,2]});
  assert.equal(validateCommonEventLibrary(library),library);
  assert.equal(library.commonEvents[0].commands.length,2);
});

test('editor exposes the full Engine v1 core command vocabulary', () => {
  for(const code of ['WAIT','VARIABLE','VARIABLE_OP','SELF_SWITCH','CONDITIONAL','JUMP','EXIT_EVENT','COMMON_EVENT','CHOICE','INPUT_NUMBER','MOVE_ROUTE','RELOCATE_EVENT','ERASE_EVENT','TRANSPARENCY','FADE_SCREEN','TINT_SCREEN','FLASH_SCREEN','SHAKE_SCREEN','BGM','BGM_STOP','BGM_FADE','BGS','BGS_STOP','BGS_FADE','ME','BATTLE']) assert.ok(EDITABLE_COMMANDS.has(code),code);
});

test('common event identity can be renamed without allowing duplicate ids', () => {
  let library=createCommonEventLibrary();
  library=addCommonEvent(library,{id:'first',name:'First'});
  library=addCommonEvent(library,{id:'second',name:'Second'});
  library=updateCommonEvent(library,'first',{id:'renamed',name:'Renamed Event'});
  assert.equal(library.commonEvents[0].id,'renamed');
  assert.equal(library.commonEvents[0].name,'Renamed Event');
  assert.throws(()=>updateCommonEvent(library,'renamed',{id:'second'}),/already exists/);
});

test('common event commands can be replaced, reordered and removed transactionally', () => {
  let library=addCommonEvent(createCommonEventLibrary(),{id:'sequence',commands:[{code:'MESSAGE',parameters:['A']},{code:'WAIT',parameters:[1]}]});
  library=replaceCommonEventCommand(library,'sequence',0,{code:'MESSAGE',parameters:['B']});
  library=moveCommonEventCommand(library,'sequence',1,-1);
  assert.equal(library.commonEvents[0].commands[0].code,'WAIT');
  assert.equal(library.commonEvents[0].commands[1].parameters[0],'B');
  library=removeCommonEventCommand(library,'sequence',0);
  assert.deepEqual(library.commonEvents[0].commands,[{code:'MESSAGE',parameters:['B']}]);
});

test('common event instantiation clones commands instead of aliasing library data', () => {
  let library=createCommonEventLibrary();
  library=addCommonEvent(library,{id:'hello',commands:[{code:'MESSAGE',parameters:['Hello']}]});
  const commands=instantiateCommonEventCommands(library,'hello');
  commands[0].parameters[0]='Changed';
  assert.equal(library.commonEvents[0].commands[0].parameters[0],'Hello');
});

test('common events expand into existing runtime-compatible event page commands', () => {
  let library=createCommonEventLibrary();
  library=addCommonEvent(library,{id:'door-sequence',commands:[
    {code:'SE',parameters:['door-open']},
    {code:'TRANSFER',parameters:['room-two',1,2,2]}
  ]});
  const event={id:'door',pages:[{trigger:'action',commands:[]}]};
  const count=insertCommonEvent(event,0,library,'door-sequence');
  assert.equal(count,2);
  assert.deepEqual(event.pages[0].commands,library.commonEvents[0].commands);
  assert.notEqual(event.pages[0].commands,library.commonEvents[0].commands);
});

test('common event removal returns a new valid library', () => {
  let library=addCommonEvent(createCommonEventLibrary(),{id:'temporary'});
  library=removeCommonEvent(library,'temporary');
  assert.equal(library.commonEvents.length,0);
  validateCommonEventLibrary(library);
});

test('common events reject unknown extension commands', () => {
  assert.throws(()=>addCommonEvent(createCommonEventLibrary(),{id:'bad',commands:[{code:'UNKNOWN',parameters:[]}]}),/unsupported command/i);
});

test('common event libraries reject missing runtime targets', () => {
  assert.throws(()=>validateCommonEventLibrary({schemaVersion:1,commonEvents:[
    {id:'caller',commands:[{code:'COMMON_EVENT',parameters:['missing']}]}
  ]}),/references unknown common event: missing/i);
});

test('common event libraries reject direct and indirect recursion', () => {
  assert.throws(()=>validateCommonEventLibrary({schemaVersion:1,commonEvents:[
    {id:'loop',commands:[{code:'COMMON_EVENT',parameters:['loop']}]}
  ]}),/recursive common event cycle: loop -> loop/i);
  assert.throws(()=>validateCommonEventLibrary({schemaVersion:1,commonEvents:[
    {id:'a',commands:[{code:'COMMON_EVENT',parameters:['b']}]},
    {id:'b',commands:[{code:'COMMON_EVENT',parameters:['a']}]}
  ]}),/recursive common event cycle: a -> b -> a/i);
});
