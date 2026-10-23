export function clone(value){return typeof structuredClone==='function'?structuredClone(value):JSON.parse(JSON.stringify(value));}

export const EDITABLE_COMMANDS=new Set(['MESSAGE','SWITCH','TRANSFER','SHOP','SE','SCRIPT_HOOK']);

export function validatePackage(pkg){
  if(!pkg||typeof pkg!=='object') throw new Error('Runtime package must be an object');
  if(!Array.isArray(pkg.maps)) throw new Error('Runtime package must contain maps[]');
  for(const map of pkg.maps){
    if(!map||typeof map!=='object'||!map.id) throw new Error('Every map must have an id');
    if(!Number.isInteger(map.width)||map.width<=0) throw new Error(`Invalid width for ${map.id}`);
    if(!Number.isInteger(map.height)||map.height<=0) throw new Error(`Invalid height for ${map.id}`);
    if(map.events!==undefined&&!Array.isArray(map.events)) throw new Error(`events must be an array for ${map.id}`);
    if(map.blocked!==undefined&&!Array.isArray(map.blocked)) throw new Error(`blocked must be an array for ${map.id}`);
    for(const event of map.events||[]){
      if(!event.id) throw new Error(`Event without id on ${map.id}`);
      if(!Number.isInteger(event.x)||!Number.isInteger(event.y)) throw new Error(`Event ${event.id} has invalid coordinates`);
      if(event.x<0||event.y<0||event.x>=map.width||event.y>=map.height) throw new Error(`Event ${event.id} is outside ${map.id}`);
      if(event.pages!==undefined&&!Array.isArray(event.pages)) throw new Error(`Event ${event.id} pages must be an array`);
    }
  }
  return pkg;
}

export function normalizePackage(pkg){
  const result=clone(validatePackage(pkg));
  for(const map of result.maps){
    if(!Array.isArray(map.events)) map.events=[];
    if(!Array.isArray(map.blocked)) map.blocked=[];
  }
  return result;
}

export function clamp(value,min,max){return Math.max(min,Math.min(max,Number(value)||0));}

export function moveEvent(map,eventId,x,y){
  const event=(map.events||[]).find(item=>item.id===eventId);
  if(!event) throw new Error(`Unknown event: ${eventId}`);
  event.x=clamp(x,0,map.width-1);
  event.y=clamp(y,0,map.height-1);
  return event;
}

export function setBlocked(map,x,y,blocked=true){
  const cx=clamp(x,0,map.width-1), cy=clamp(y,0,map.height-1);
  const key=`${cx},${cy}`;
  const cells=new Set(map.blocked||[]);
  blocked?cells.add(key):cells.delete(key);
  map.blocked=[...cells].sort((a,b)=>{
    const [ax,ay]=a.split(',').map(Number),[bx,by]=b.split(',').map(Number);
    return ay-by||ax-bx;
  });
  return map.blocked;
}

export function eventSummary(event){
  return (event.pages||[]).map((page,index)=>({
    page:index+1,
    trigger:page.trigger||'action',
    commandCount:(page.commands||[]).length,
    conditions:page.conditions?clone(page.conditions):null
  }));
}

export function getPage(event,pageIndex){
  if(!event||!Array.isArray(event.pages)) throw new Error('Event has no pages');
  const page=event.pages[pageIndex];
  if(!page) throw new Error(`Unknown page: ${pageIndex+1}`);
  if(!Array.isArray(page.commands)) page.commands=[];
  return page;
}

export function updatePageTrigger(event,pageIndex,trigger){
  const allowed=new Set(['action','touch','autorun','parallel']);
  if(!allowed.has(trigger)) throw new Error(`Unsupported trigger: ${trigger}`);
  const page=getPage(event,pageIndex);
  page.trigger=trigger;
  return page;
}

export function updatePageConditions(event,pageIndex,conditions){
  const page=getPage(event,pageIndex);
  const clean={};
  for(const [key,value] of Object.entries(conditions||{})){
    if(value===undefined||value===null||value==='') continue;
    clean[key]=value;
  }
  if(Object.keys(clean).length) page.conditions=clean;
  else delete page.conditions;
  return page;
}

export function addEventPage(event,{trigger='action',conditions}={}){
  if(!Array.isArray(event.pages)) event.pages=[];
  const page={trigger,commands:[]};
  if(conditions&&Object.keys(conditions).length) page.conditions=clone(conditions);
  event.pages.push(page);
  return page;
}

export function commandEditable(command){return !!command&&EDITABLE_COMMANDS.has(command.code);}

export function replaceCommand(event,pageIndex,commandIndex,nextCommand){
  const page=getPage(event,pageIndex);
  const current=page.commands[commandIndex];
  if(!current) throw new Error(`Unknown command: ${commandIndex+1}`);
  if(!commandEditable(current)) throw new Error(`Command ${current.code} is read-only in this editor version`);
  if(!nextCommand||!EDITABLE_COMMANDS.has(nextCommand.code)) throw new Error('Replacement command is not supported');
  page.commands[commandIndex]=clone(nextCommand);
  return page.commands[commandIndex];
}

export function addCommand(event,pageIndex,command){
  if(!command||!EDITABLE_COMMANDS.has(command.code)) throw new Error('Command type is not supported');
  const page=getPage(event,pageIndex);
  page.commands.push(clone(command));
  return page.commands.at(-1);
}
