import { clone, EDITABLE_COMMANDS, addCommand } from './editor-core.js';

function cleanId(value){return String(value??'').trim();}
function findEvent(target,id){const event=target.commonEvents.find(item=>item.id===cleanId(id));if(!event)throw new Error(`Unknown common event: ${id}`);return event;}

export function validateCommonEventLibrary(library={}){
  if(!library||typeof library!=='object')throw new Error('Common event library must be an object');
  if(!Array.isArray(library.commonEvents))throw new Error('Common event library must contain commonEvents[]');
  const ids=new Set();
  for(const event of library.commonEvents){
    if(!event||typeof event!=='object')throw new Error('Common event must be an object');
    const id=cleanId(event.id);if(!id)throw new Error('Common event id is required');
    if(ids.has(id))throw new Error(`Duplicate common event id: ${id}`);ids.add(id);
    if(!Array.isArray(event.commands))throw new Error(`Common event ${id} must contain commands[]`);
    for(const command of event.commands){if(!command||!EDITABLE_COMMANDS.has(command.code))throw new Error(`Common event ${id} contains unsupported command: ${command?.code||'(missing)'}`);}
  }
  return library;
}

export function createCommonEventLibrary(){return {schemaVersion:1,commonEvents:[]};}

export function normalizeCommonEventLibrary(library={}){
  const next=clone(library);if(!Array.isArray(next.commonEvents))next.commonEvents=[];if(!next.schemaVersion)next.schemaVersion=1;return validateCommonEventLibrary(next);
}

export function addCommonEvent(library,{id,name='',commands=[]}={}){
  const target=normalizeCommonEventLibrary(library);const clean=cleanId(id);if(!clean)throw new Error('Common event id is required');
  if(target.commonEvents.some(event=>event.id===clean))throw new Error(`Common event already exists: ${clean}`);
  const event={id:clean,name:String(name||clean),commands:clone(commands)};validateCommonEventLibrary({schemaVersion:1,commonEvents:[event]});target.commonEvents.push(event);return target;
}

export function updateCommonEvent(library,id,{id:nextId,name}={}){
  const target=normalizeCommonEventLibrary(library);const event=findEvent(target,id);const clean=cleanId(nextId??event.id);if(!clean)throw new Error('Common event id is required');
  if(clean!==event.id&&target.commonEvents.some(item=>item.id===clean))throw new Error(`Common event already exists: ${clean}`);
  event.id=clean;if(name!==undefined)event.name=String(name||clean);validateCommonEventLibrary(target);return target;
}

export function removeCommonEvent(library,id){
  const target=normalizeCommonEventLibrary(library);const index=target.commonEvents.findIndex(event=>event.id===cleanId(id));if(index<0)throw new Error(`Unknown common event: ${id}`);target.commonEvents.splice(index,1);return target;
}

export function appendCommonEventCommand(library,id,command){
  if(!command||!EDITABLE_COMMANDS.has(command.code))throw new Error('Command type is not supported');
  const target=normalizeCommonEventLibrary(library);findEvent(target,id).commands.push(clone(command));return target;
}

export function replaceCommonEventCommand(library,id,index,command){
  if(!command||!EDITABLE_COMMANDS.has(command.code))throw new Error('Command type is not supported');
  const target=normalizeCommonEventLibrary(library);const event=findEvent(target,id);const position=Number(index);if(!Number.isInteger(position)||position<0||position>=event.commands.length)throw new Error(`Unknown command: ${index}`);event.commands[position]=clone(command);return target;
}

export function removeCommonEventCommand(library,id,index){
  const target=normalizeCommonEventLibrary(library);const event=findEvent(target,id);const position=Number(index);if(!Number.isInteger(position)||position<0||position>=event.commands.length)throw new Error(`Unknown command: ${index}`);event.commands.splice(position,1);return target;
}

export function moveCommonEventCommand(library,id,index,direction){
  const target=normalizeCommonEventLibrary(library);const event=findEvent(target,id);const from=Number(index),to=from+Number(direction);if(!Number.isInteger(from)||from<0||from>=event.commands.length)throw new Error(`Unknown command: ${index}`);if(to<0||to>=event.commands.length)return target;[event.commands[from],event.commands[to]]=[event.commands[to],event.commands[from]];return target;
}

export function instantiateCommonEventCommands(library,id){
  const target=normalizeCommonEventLibrary(library);return clone(findEvent(target,id).commands);
}

export function insertCommonEvent(event,pageIndex,library,id){
  const commands=instantiateCommonEventCommands(library,id);for(const command of commands)addCommand(event,pageIndex,command);return commands.length;
}
