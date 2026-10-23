import test from 'node:test';
import assert from 'node:assert/strict';

import { createCommonEventLibrary, addCommonEvent, appendCommonEventCommand, instantiateCommonEventCommands, insertCommonEvent, validateCommonEventLibrary } from '../../tools/editor/common-event-core.js';

test('common event library creates and validates reusable supported commands', () => {
  let library=createCommonEventLibrary();
  library=addCommonEvent(library,{id:'heal-and-warp',name:'Heal and Warp'});
  library=appendCommonEventCommand(library,'heal-and-warp',{code:'MESSAGE',parameters:['Restored.']});
  library=appendCommonEventCommand(library,'heal-and-warp',{code:'TRANSFER',parameters:['map-two',3,4,2]});
  assert.equal(validateCommonEventLibrary(library),library);
  assert.equal(library.commonEvents[0].commands.length,2);
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

test('common events reject commands the current runtime editor cannot safely author', () => {
  assert.throws(()=>addCommonEvent(createCommonEventLibrary(),{id:'bad',commands:[{code:'UNKNOWN',parameters:[]}]}),/unsupported command/i);
});
