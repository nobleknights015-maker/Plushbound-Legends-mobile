import {clone,normalizeLayer,transferLinks,validatePackage} from './editor-core.js';

function cleanId(value){return String(value??'').trim();}
function uniqueId(pkg,base='new-map'){
  const used=new Set((pkg.maps||[]).map(map=>String(map.id)));
  const root=cleanId(base)||'new-map';
  if(!used.has(root))return root;
  let n=2;while(used.has(`${root}-${n}`))n++;return `${root}-${n}`;
}
function mapIndex(pkg,mapId){return (pkg.maps||[]).findIndex(map=>String(map.id)===String(mapId));}
function dimension(value,label){const n=Math.floor(Number(value));if(!Number.isFinite(n)||n<1)throw new Error(`${label} must be at least 1`);return n;}
function remapGrid(data,oldWidth,oldHeight,newWidth,newHeight,fill=0){
  const out=new Array(newWidth*newHeight).fill(fill);
  const copyWidth=Math.min(oldWidth,newWidth),copyHeight=Math.min(oldHeight,newHeight);
  for(let y=0;y<copyHeight;y++)for(let x=0;x<copyWidth;x++)out[y*newWidth+x]=data?.[y*oldWidth+x]??fill;
  return out;
}

export function createBlankMap(pkg,{id='new-map',name='New Map',width=20,height=15}={}){
  if(!pkg||!Array.isArray(pkg.maps))throw new Error('Runtime package must contain maps[]');
  const w=Math.max(1,Math.floor(Number(width)||20)),h=Math.max(1,Math.floor(Number(height)||15));
  const finalId=uniqueId(pkg,id);
  const map={id:finalId,name:String(name||finalId),width:w,height:h,layers:[normalizeLayer({id:'ground',name:'Ground',z:0,visible:true,data:[]},w,h,0)],blocked:[],regions:new Array(w*h).fill(0),events:[]};
  pkg.maps.push(map);validatePackage(pkg);return map;
}

export function duplicateMap(pkg,mapId,{id,name}={}){
  if(!pkg||!Array.isArray(pkg.maps))throw new Error('Runtime package must contain maps[]');
  const index=mapIndex(pkg,mapId);if(index<0)throw new Error(`Unknown map: ${mapId}`);
  const source=pkg.maps[index],copy=clone(source);copy.id=uniqueId(pkg,id||`${source.id}-copy`);copy.name=String(name||`${source.name||source.id} Copy`);pkg.maps.splice(index+1,0,copy);validatePackage(pkg);return copy;
}

export function renameMap(pkg,mapId,nextId,{name,updateTransfers=true}={}){
  if(!pkg||!Array.isArray(pkg.maps))throw new Error('Runtime package must contain maps[]');
  const index=mapIndex(pkg,mapId);if(index<0)throw new Error(`Unknown map: ${mapId}`);
  const clean=cleanId(nextId);if(!clean)throw new Error('Map ID is required');
  if(pkg.maps.some((map,i)=>i!==index&&String(map.id)===clean))throw new Error(`Map already exists: ${clean}`);
  const previous=String(pkg.maps[index].id);pkg.maps[index].id=clean;if(name!==undefined)pkg.maps[index].name=String(name||clean);
  let updatedTransfers=0;
  if(updateTransfers&&previous!==clean){
    for(const map of pkg.maps)for(const event of map.events||[])for(const page of event.pages||[])for(const command of page.commands||[]){
      if(command.code==='TRANSFER'&&String(command.parameters?.[0])===previous){command.parameters[0]=clean;updatedTransfers++;}
    }
  }
  validatePackage(pkg);return {map:pkg.maps[index],previousId:previous,updatedTransfers};
}

export function inboundTransfers(pkg,mapId){return transferLinks(pkg).filter(link=>String(link.targetMapId)===String(mapId));}

export function resizeMap(pkg,mapId,{width,height,eventPolicy='block',transferPolicy='block'}={}){
  if(!pkg||!Array.isArray(pkg.maps))throw new Error('Runtime package must contain maps[]');
  const sourceIndex=mapIndex(pkg,mapId);if(sourceIndex<0)throw new Error(`Unknown map: ${mapId}`);
  const next=clone(pkg),map=next.maps[sourceIndex],oldWidth=Number(map.width),oldHeight=Number(map.height),newWidth=dimension(width,'Width'),newHeight=dimension(height,'Height');
  if(!['block','clamp'].includes(eventPolicy))throw new Error(`Unsupported event resize policy: ${eventPolicy}`);
  if(!['block','clamp'].includes(transferPolicy))throw new Error(`Unsupported transfer resize policy: ${transferPolicy}`);

  const clippedEvents=(map.events||[]).filter(event=>Number(event.x)>=newWidth||Number(event.y)>=newHeight);
  if(clippedEvents.length&&eventPolicy==='block')throw new Error(`Resize would place ${clippedEvents.length} event(s) outside the map`);
  const clippedTransfers=inboundTransfers(next,map.id).filter(link=>link.x>=newWidth||link.y>=newHeight);
  if(clippedTransfers.length&&transferPolicy==='block')throw new Error(`Resize would invalidate ${clippedTransfers.length} inbound transfer destination(s)`);

  let clampedEvents=0,clampedTransfers=0;
  if(eventPolicy==='clamp')for(const event of clippedEvents){event.x=Math.min(Math.max(0,Number(event.x)||0),newWidth-1);event.y=Math.min(Math.max(0,Number(event.y)||0),newHeight-1);clampedEvents++;}
  if(transferPolicy==='clamp')for(const link of clippedTransfers){const owner=next.maps.find(candidate=>String(candidate.id)===String(link.fromMapId));const command=owner?.events?.find(event=>String(event.id)===String(link.eventId))?.pages?.[link.pageIndex]?.commands?.[link.commandIndex];if(command?.code==='TRANSFER'){command.parameters[1]=Math.min(Math.max(0,Number(command.parameters[1])||0),newWidth-1);command.parameters[2]=Math.min(Math.max(0,Number(command.parameters[2])||0),newHeight-1);clampedTransfers++;}}

  map.layers=(map.layers||[]).map((layer,index)=>({...layer,data:remapGrid(layer.data||[],oldWidth,oldHeight,newWidth,newHeight,0),id:layer.id||`layer-${index+1}`}));
  map.regions=remapGrid(map.regions||[],oldWidth,oldHeight,newWidth,newHeight,0).map(value=>Math.max(0,Math.floor(Number(value)||0)));
  const blocked=[];let droppedBlocked=0;
  for(const cell of map.blocked||[]){const match=/^(\d+),(\d+)$/.exec(String(cell));if(!match){droppedBlocked++;continue;}const x=Number(match[1]),y=Number(match[2]);if(x<newWidth&&y<newHeight)blocked.push(`${x},${y}`);else droppedBlocked++;}
  map.blocked=blocked;map.width=newWidth;map.height=newHeight;
  validatePackage(next);
  pkg.maps=next.maps;
  return {map:pkg.maps[sourceIndex],oldWidth,oldHeight,newWidth,newHeight,clampedEvents,clampedTransfers,droppedBlocked};
}

export function removeMap(pkg,mapId,{allowInbound=false}={}){
  if(!pkg||!Array.isArray(pkg.maps))throw new Error('Runtime package must contain maps[]');
  if(pkg.maps.length<=1)throw new Error('Cannot delete the last map in a runtime package');
  const index=mapIndex(pkg,mapId);if(index<0)throw new Error(`Unknown map: ${mapId}`);
  const inbound=inboundTransfers(pkg,mapId);if(inbound.length&&!allowInbound)throw new Error(`Map ${mapId} has ${inbound.length} inbound transfer link(s)`);
  const [removed]=pkg.maps.splice(index,1);return {removed,inbound};
}

export function mapManagementSummary(pkg){
  return (pkg?.maps||[]).map(map=>({id:String(map.id),name:map.name||String(map.id),width:Number(map.width)||0,height:Number(map.height)||0,events:(map.events||[]).length,inbound:inboundTransfers(pkg,map.id).length,outbound:transferLinks({maps:[map]}).length}));
}