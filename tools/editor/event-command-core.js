export function clone(value){return typeof structuredClone==='function'?structuredClone(value):JSON.parse(JSON.stringify(value));}

function commandsOf(event,pageIndex){
  if(!event||!Array.isArray(event.pages))throw new Error('A valid event with pages is required');
  const index=Number(pageIndex),page=event.pages[index];
  if(!Number.isInteger(index)||index<0||!page)throw new Error(`Unknown page: ${Number(pageIndex)+1}`);
  if(!Array.isArray(page.commands))page.commands=[];
  return page.commands;
}

function commandAt(event,pageIndex,commandIndex){
  const commands=commandsOf(event,pageIndex),index=Number(commandIndex);
  if(!Number.isInteger(index)||index<0||index>=commands.length)throw new Error(`Unknown command: ${Number(commandIndex)+1}`);
  return {commands,index,command:commands[index]};
}

export function commandClipboardPayload(command){
  if(!command||typeof command!=='object'||!String(command.code||'').trim())throw new Error('A valid command is required');
  return {kind:'plushbound-event-command',schemaVersion:1,command:clone(command)};
}

export function pasteCommandPayload(event,pageIndex,payload,{insertIndex}={}){
  const commands=commandsOf(event,pageIndex);
  if(!payload||payload.kind!=='plushbound-event-command'||payload.schemaVersion!==1||!payload.command)throw new Error('Unsupported command clipboard payload');
  const target=insertIndex===undefined?commands.length:Math.max(0,Math.min(commands.length,Math.floor(Number(insertIndex)||0)));
  const copy=clone(payload.command);
  commands.splice(target,0,copy);
  return {command:copy,index:target};
}

export function duplicateEventCommand(event,pageIndex,commandIndex,{insertIndex}={}){
  const {index,command}=commandAt(event,pageIndex,commandIndex);
  return pasteCommandPayload(event,pageIndex,commandClipboardPayload(command),{insertIndex:insertIndex===undefined?index+1:insertIndex});
}

export function moveEventCommand(event,pageIndex,commandIndex,targetIndex){
  const {commands,index,command}=commandAt(event,pageIndex,commandIndex);
  const target=Math.max(0,Math.min(commands.length-1,Math.floor(Number(targetIndex)||0)));
  if(target===index)return {command,index};
  commands.splice(index,1);commands.splice(target,0,command);
  return {command,index:target};
}

export function moveEventCommandBy(event,pageIndex,commandIndex,delta){return moveEventCommand(event,pageIndex,commandIndex,Number(commandIndex)+Number(delta||0));}

export function removeEventCommand(event,pageIndex,commandIndex){
  const {commands,index}=commandAt(event,pageIndex,commandIndex);
  return {command:commands.splice(index,1)[0],index};
}
