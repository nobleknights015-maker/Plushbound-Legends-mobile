export function clone(value){return typeof structuredClone==='function'?structuredClone(value):JSON.parse(JSON.stringify(value));}

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
