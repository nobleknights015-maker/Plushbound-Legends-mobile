export function clone(value){return typeof structuredClone==='function'?structuredClone(value):JSON.parse(JSON.stringify(value));}

export const EDITABLE_COMMANDS=new Set(['MESSAGE','SWITCH','TRANSFER','SHOP','SE','SCRIPT_HOOK']);
export const EDITOR_ASSET_TYPES=new Set(['character-sprite','guardian-sprite','map-object','map-overlay','tileset','parallax']);
export const DIRECTIONS=new Set([2,4,6,8]);

export function validatePackage(pkg){
  if(!pkg||typeof pkg!=='object') throw new Error('Runtime package must be an object');
  if(!Array.isArray(pkg.maps)) throw new Error('Runtime package must contain maps[]');
  const ids=new Set();
  for(const map of pkg.maps){
    if(!map||typeof map!=='object'||!map.id) throw new Error('Every map must have an id');
    if(ids.has(map.id)) throw new Error(`Duplicate map id: ${map.id}`); ids.add(map.id);
    if(!Number.isInteger(map.width)||map.width<=0) throw new Error(`Invalid width for ${map.id}`);
    if(!Number.isInteger(map.height)||map.height<=0) throw new Error(`Invalid height for ${map.id}`);
    if(map.events!==undefined&&!Array.isArray(map.events)) throw new Error(`events must be an array for ${map.id}`);
    if(map.blocked!==undefined&&!Array.isArray(map.blocked)) throw new Error(`blocked must be an array for ${map.id}`);
    if(map.layers!==undefined&&!Array.isArray(map.layers)) throw new Error(`layers must be an array for ${map.id}`);
    if(map.regions!==undefined&&!Array.isArray(map.regions)) throw new Error(`regions must be an array for ${map.id}`);
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
    if(!Array.isArray(map.layers)) map.layers=[];
    map.layers=map.layers.map((layer,index)=>normalizeLayer(layer,map.width,map.height,index));
    map.regions=padLayer((map.regions||[]).map(v=>Math.max(0,Math.floor(Number(v)||0))),map.width*map.height);
  }
  return result;
}

export function normalizeLayer(layer,width,height,index=0){
  const cellCount=width*height;
  if(Array.isArray(layer)){
    const data=flattenLayerData(layer,width,height);
    return {id:`layer-${index+1}`,name:`Layer ${index+1}`,z:index,visible:true,data:padLayer(data,cellCount)};
  }
  const source=layer&&typeof layer==='object'?clone(layer):{};
  const data=flattenLayerData(source.data||[],width,height);
  return {...source,id:source.id||`layer-${index+1}`,name:source.name||`Layer ${index+1}`,z:Number.isFinite(Number(source.z))?Number(source.z):index,visible:source.visible!==false,data:padLayer(data,cellCount)};
}

function flattenLayerData(data,width,height){
  if(Array.isArray(data?.[0])){
    const out=[];
    for(let y=0;y<height;y++)for(let x=0;x<width;x++)out.push(Number(data[y]?.[x])||0);
    return out;
  }
  return Array.isArray(data)?data.map(v=>Number(v)||0):[];
}
function padLayer(data,count){const out=data.slice(0,count);while(out.length<count)out.push(0);return out;}

export function clamp(value,min,max){return Math.max(min,Math.min(max,Number(value)||0));}
export function cellIndex(map,x,y){return clamp(y,0,map.height-1)*map.width+clamp(x,0,map.width-1);}

export function moveEvent(map,eventId,x,y){
  const event=(map.events||[]).find(item=>item.id===eventId);
  if(!event) throw new Error(`Unknown event: ${eventId}`);
  event.x=clamp(x,0,map.width-1);
  event.y=clamp(y,0,map.height-1);
  return event;
}

export function addEvent(map,{id,x=0,y=0,assetId='',trigger='action'}={}){
  if(!map||!Array.isArray(map.events)) throw new Error('Map events are not available');
  const cleanId=String(id||'').trim();
  if(!cleanId) throw new Error('Event ID is required');
  if(map.events.some(event=>event.id===cleanId)) throw new Error(`Event already exists: ${cleanId}`);
  const event={id:cleanId,x:clamp(x,0,map.width-1),y:clamp(y,0,map.height-1),pages:[{trigger,commands:[]}]};
  if(assetId) event.assetId=String(assetId);
  map.events.push(event);
  return event;
}

export function removeEvent(map,eventId){
  const index=(map.events||[]).findIndex(event=>event.id===eventId);
  if(index<0) throw new Error(`Unknown event: ${eventId}`);
  return map.events.splice(index,1)[0];
}

export function setEventAsset(event,assetId){
  const value=String(assetId||'').trim();
  if(value) event.assetId=value;
  else delete event.assetId;
  return event;
}

export function setBlocked(map,x,y,blocked=true){
  const cx=clamp(x,0,map.width-1), cy=clamp(y,0,map.height-1);
  const key=`${cx},${cy}`;
  const cells=new Set(map.blocked||[]);
  blocked?cells.add(key):cells.delete(key);
  map.blocked=[...cells].sort((a,b)=>{const [ax,ay]=a.split(',').map(Number),[bx,by]=b.split(',').map(Number);return ay-by||ax-bx;});
  return map.blocked;
}

export function regionAt(map,x,y){return Number((map.regions||[])[cellIndex(map,x,y)]||0);}
export function setRegion(map,x,y,regionId){
  if(!Array.isArray(map.regions)) map.regions=padLayer([],map.width*map.height);
  const id=Math.max(0,Math.floor(Number(regionId)||0));
  map.regions[cellIndex(map,x,y)]=id;
  return id;
}

export function addLayer(map,{id,name,z,visible=true}={}){
  if(!Array.isArray(map.layers)) map.layers=[];
  const index=map.layers.length;
  const layer=normalizeLayer({id:id||`layer-${index+1}`,name:name||`Layer ${index+1}`,z:z??index,visible,data:[]},map.width,map.height,index);
  if(map.layers.some(existing=>existing.id===layer.id)) throw new Error(`Layer already exists: ${layer.id}`);
  map.layers.push(layer);
  return layer;
}
export function getLayer(map,layerIndex){if(!Array.isArray(map.layers)) map.layers=[];const layer=map.layers[layerIndex];if(!layer) throw new Error(`Unknown layer: ${layerIndex+1}`);return layer;}
export function setLayerVisibility(map,layerIndex,visible){const layer=getLayer(map,layerIndex);layer.visible=!!visible;return layer;}
export function setLayerZ(map,layerIndex,z){const layer=getLayer(map,layerIndex);layer.z=Number(z)||0;return layer;}
export function tileAt(map,layerIndex,x,y){const layer=getLayer(map,layerIndex);return Number(layer.data[cellIndex(map,x,y)])||0;}
export function paintTile(map,layerIndex,x,y,tileId){const layer=getLayer(map,layerIndex);const id=Math.max(0,Math.floor(Number(tileId)||0));layer.data[cellIndex(map,x,y)]=id;return id;}

export function eventSummary(event){return (event.pages||[]).map((page,index)=>({page:index+1,trigger:page.trigger||'action',commandCount:(page.commands||[]).length,conditions:page.conditions?clone(page.conditions):null}));}
export function getPage(event,pageIndex){if(!event||!Array.isArray(event.pages)) throw new Error('Event has no pages');const page=event.pages[pageIndex];if(!page) throw new Error(`Unknown page: ${pageIndex+1}`);if(!Array.isArray(page.commands)) page.commands=[];return page;}
export function updatePageTrigger(event,pageIndex,trigger){const allowed=new Set(['action','touch','autorun','parallel']);if(!allowed.has(trigger)) throw new Error(`Unsupported trigger: ${trigger}`);const page=getPage(event,pageIndex);page.trigger=trigger;return page;}
export function updatePageConditions(event,pageIndex,conditions){const page=getPage(event,pageIndex);const clean={};for(const [key,value] of Object.entries(conditions||{})){if(value===undefined||value===null||value==='') continue;clean[key]=value;}if(Object.keys(clean).length) page.conditions=clean;else delete page.conditions;return page;}
export function addEventPage(event,{trigger='action',conditions}={}){if(!Array.isArray(event.pages)) event.pages=[];const page={trigger,commands:[]};if(conditions&&Object.keys(conditions).length) page.conditions=clone(conditions);event.pages.push(page);return page;}
export function commandEditable(command){return !!command&&EDITABLE_COMMANDS.has(command.code);}
export function replaceCommand(event,pageIndex,commandIndex,nextCommand){const page=getPage(event,pageIndex);const current=page.commands[commandIndex];if(!current) throw new Error(`Unknown command: ${commandIndex+1}`);if(!commandEditable(current)) throw new Error(`Command ${current.code} is read-only in this editor version`);if(!nextCommand||!EDITABLE_COMMANDS.has(nextCommand.code)) throw new Error('Replacement command is not supported');page.commands[commandIndex]=clone(nextCommand);return page.commands[commandIndex];}
export function addCommand(event,pageIndex,command){if(!command||!EDITABLE_COMMANDS.has(command.code)) throw new Error('Command type is not supported');const page=getPage(event,pageIndex);page.commands.push(clone(command));return page.commands.at(-1);}

export function addTransferEvent(map,{id,x,y,targetMapId,targetX,targetY,direction=2,through=true}={}){
  if(!targetMapId) throw new Error('Target map is required');
  const dir=Number(direction); if(!DIRECTIONS.has(dir)) throw new Error(`Invalid direction: ${direction}`);
  const event=addEvent(map,{id,x,y,trigger:'touch'});
  event.through=through!==false;
  event.pages[0].commands.push({code:'TRANSFER',parameters:[String(targetMapId),Math.max(0,Math.floor(Number(targetX)||0)),Math.max(0,Math.floor(Number(targetY)||0)),dir]});
  return event;
}

export function transferLinks(pkg){
  const links=[];
  for(const map of pkg.maps||[]) for(const event of map.events||[]) for(let p=0;p<(event.pages||[]).length;p++) for(let c=0;c<(event.pages[p].commands||[]).length;c++){
    const command=event.pages[p].commands[c];
    if(command.code!=='TRANSFER') continue;
    const [targetMapId,x,y,direction=2]=command.parameters||[];
    links.push({fromMapId:map.id,eventId:event.id,pageIndex:p,commandIndex:c,targetMapId:String(targetMapId||''),x:Number(x)||0,y:Number(y)||0,direction:Number(direction)||2});
  }
  return links;
}

export function validateTransferLinks(pkg){
  const maps=new Map((pkg.maps||[]).map(map=>[map.id,map]));
  const issues=[];
  for(const link of transferLinks(pkg)){
    const target=maps.get(link.targetMapId);
    if(!target){issues.push({...link,reason:'missing-map'});continue;}
    if(link.x<0||link.y<0||link.x>=target.width||link.y>=target.height) issues.push({...link,reason:'out-of-bounds'});
    if(!DIRECTIONS.has(link.direction)) issues.push({...link,reason:'invalid-direction'});
  }
  return issues;
}

export function normalizeAssetManifest(manifest){if(!manifest||!Array.isArray(manifest.entries)) throw new Error('Asset manifest must contain entries[]');return clone(manifest.entries).filter(entry=>entry&&entry.id&&EDITOR_ASSET_TYPES.has(entry.type));}
