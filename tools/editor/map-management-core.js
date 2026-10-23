import {clone,normalizeLayer,transferLinks,validatePackage} from './editor-core.js';

function cleanId(value){return String(value??'').trim();}
function uniqueId(pkg,base='new-map'){
  const used=new Set((pkg.maps||[]).map(map=>String(map.id)));
  const root=cleanId(base)||'new-map';
  if(!used.has(root))return root;
  let n=2;while(used.has(`${root}-${n}`))n++;return `${root}-${n}`;
}
function mapIndex(pkg,mapId){return (pkg.maps||[]).findIndex(map=>String(map.id)===String(mapId));}

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
