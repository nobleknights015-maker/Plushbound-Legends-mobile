export function clone(value){return typeof structuredClone==='function'?structuredClone(value):JSON.parse(JSON.stringify(value));}

export function ensureAuthoringMap(map){
  if(!map||typeof map!=='object') throw new Error('Map is required');
  if(!Number.isInteger(map.width)||map.width<=0||!Number.isInteger(map.height)||map.height<=0) throw new Error('Map dimensions are invalid');
  if(!Array.isArray(map.layers)) map.layers=[];
  if(!Array.isArray(map.blocked)) map.blocked=[];
  if(!Array.isArray(map.regions)) map.regions=[];
  const cells=map.width*map.height;
  if(!map.layers.length) map.layers.push({id:'layer-1',name:'Layer 1',z:0,visible:true,data:Array(cells).fill(0)});
  map.layers=map.layers.map((layer,index)=>{
    const source=Array.isArray(layer)?{data:layer}:clone(layer||{});
    const data=Array.isArray(source.data)?source.data.flat().slice(0,cells).map(value=>Math.max(0,Math.floor(Number(value)||0))):[];
    while(data.length<cells)data.push(0);
    return {...source,id:source.id||`layer-${index+1}`,name:source.name||`Layer ${index+1}`,z:Number.isFinite(Number(source.z))?Number(source.z):index,visible:source.visible!==false,data};
  });
  const regions=map.regions.slice(0,cells).map(value=>Math.max(0,Math.floor(Number(value)||0)));
  while(regions.length<cells)regions.push(0);
  map.regions=regions;
  map.blocked=[...new Set(map.blocked.map(String))];
  return map;
}

export function cellIndex(map,x,y){
  const cx=Math.max(0,Math.min(map.width-1,Math.floor(Number(x)||0)));
  const cy=Math.max(0,Math.min(map.height-1,Math.floor(Number(y)||0)));
  return cy*map.width+cx;
}

export function observedTileIds(map,{includeZero=true}={}){
  const ids=new Set(includeZero?[0]:[]);
  for(const layer of map?.layers||[]) for(const value of layer?.data||[]) ids.add(Math.max(0,Math.floor(Number(value)||0)));
  return [...ids].sort((a,b)=>a-b);
}

export function tileAt(map,layerIndex,x,y){
  const layer=map.layers?.[Number(layerIndex)||0];
  if(!layer) throw new Error(`Unknown layer ${layerIndex}`);
  return Math.max(0,Math.floor(Number(layer.data[cellIndex(map,x,y)])||0));
}

export function paintTile(map,layerIndex,x,y,tileId){
  const layer=map.layers?.[Number(layerIndex)||0];
  if(!layer) throw new Error(`Unknown layer ${layerIndex}`);
  const value=Math.max(0,Math.floor(Number(tileId)||0));
  layer.data[cellIndex(map,x,y)]=value;
  return value;
}

export function regionAt(map,x,y){return Math.max(0,Math.floor(Number(map.regions?.[cellIndex(map,x,y)])||0));}
export function paintRegion(map,x,y,regionId){const value=Math.max(0,Math.floor(Number(regionId)||0));map.regions[cellIndex(map,x,y)]=value;return value;}

export function isBlocked(map,x,y){return new Set(map.blocked||[]).has(`${Math.floor(Number(x)||0)},${Math.floor(Number(y)||0)}`);}
export function paintBlocked(map,x,y,blocked=true){
  const cx=Math.max(0,Math.min(map.width-1,Math.floor(Number(x)||0))),cy=Math.max(0,Math.min(map.height-1,Math.floor(Number(y)||0)));
  const key=`${cx},${cy}`,values=new Set(map.blocked||[]);
  blocked?values.add(key):values.delete(key);
  map.blocked=[...values].sort((a,b)=>{const [ax,ay]=a.split(',').map(Number),[bx,by]=b.split(',').map(Number);return ay-by||ax-bx;});
  return blocked;
}

export function validatePassabilityMap(map){
  const issues=[];
  if(!map||typeof map!=='object') return [{severity:'error',code:'map-invalid',message:'Map is missing'}];
  const cells=Number(map.width)*Number(map.height);
  for(const [index,layer] of (map.layers||[]).entries()) if(!Array.isArray(layer?.data)||layer.data.length!==cells) issues.push({severity:'error',code:'layer-size',layerIndex:index,message:`Layer ${layer?.id||index+1} must contain ${cells} cells`});
  if(!Array.isArray(map.regions)||map.regions.length!==cells) issues.push({severity:'error',code:'region-size',message:`Region grid must contain ${cells} cells`});
  for(const cell of map.blocked||[]){
    const match=/^(\d+),(\d+)$/.exec(String(cell));
    if(!match){issues.push({severity:'error',code:'blocked-format',message:`Invalid blocked cell ${cell}`});continue;}
    const x=Number(match[1]),y=Number(match[2]);
    if(x>=map.width||y>=map.height)issues.push({severity:'error',code:'blocked-bounds',message:`Blocked cell ${cell} is outside map`});
  }
  return issues;
}

export function tilesetUsage(pkg){
  const usage=new Map();
  for(const map of pkg?.maps||[]){const id=String(map.tileset||'').trim();if(!id)continue;if(!usage.has(id))usage.set(id,[]);usage.get(id).push(String(map.id));}
  return [...usage].map(([tilesetId,mapIds])=>({tilesetId,mapIds})).sort((a,b)=>a.tilesetId.localeCompare(b.tilesetId));
}
