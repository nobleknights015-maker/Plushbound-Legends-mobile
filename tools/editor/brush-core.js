function positiveInt(value,fallback=1){const n=Math.floor(Number(value));return Number.isFinite(n)&&n>0?n:fallback;}

export function normalizeBrushSize(value){const n=positiveInt(value,1);return n>=5?5:n>=3?3:1;}

export function brushCells(map,x,y,size=1){
  if(!map||!Number.isInteger(map.width)||!Number.isInteger(map.height)||map.width<=0||map.height<=0)throw new Error('Valid map dimensions are required');
  const cx=Math.floor(Number(x)||0),cy=Math.floor(Number(y)||0),brush=normalizeBrushSize(size),radius=Math.floor(brush/2),cells=[];
  for(let yy=cy-radius;yy<=cy+radius;yy++)for(let xx=cx-radius;xx<=cx+radius;xx++)if(xx>=0&&yy>=0&&xx<map.width&&yy<map.height)cells.push({x:xx,y:yy,index:yy*map.width+xx});
  return cells;
}

export function paintTileBrush(map,layerIndex,x,y,tileId,size=1){
  const layer=map?.layers?.[Number(layerIndex)||0];if(!layer||!Array.isArray(layer.data))throw new Error(`Unknown layer ${layerIndex}`);
  const value=Math.max(0,Math.floor(Number(tileId)||0)),cells=brushCells(map,x,y,size);let changed=0;
  for(const cell of cells)if(Number(layer.data[cell.index])!==value){layer.data[cell.index]=value;changed++;}
  return {value,cells,changed};
}

export function paintRegionBrush(map,x,y,regionId,size=1){
  if(!Array.isArray(map?.regions))throw new Error('Map regions are unavailable');
  const value=Math.max(0,Math.floor(Number(regionId)||0)),cells=brushCells(map,x,y,size);let changed=0;
  for(const cell of cells)if(Number(map.regions[cell.index]||0)!==value){map.regions[cell.index]=value;changed++;}
  return {value,cells,changed};
}

export function paintBlockedBrush(map,x,y,blocked=true,size=1){
  const cells=brushCells(map,x,y,size),values=new Set((map.blocked||[]).map(String));let changed=0;
  for(const cell of cells){const key=`${cell.x},${cell.y}`,before=values.has(key);if(before===!!blocked)continue;blocked?values.add(key):values.delete(key);changed++;}
  map.blocked=[...values].sort((a,b)=>{const [ax,ay]=a.split(',').map(Number),[bx,by]=b.split(',').map(Number);return ay-by||ax-bx;});
  return {blocked:!!blocked,cells,changed};
}

export function observedTileIds(map,{includeZero=true,limit=48}={}){
  const ids=new Set(includeZero?[0]:[]);
  for(const layer of map?.layers||[])for(const value of layer?.data||[])ids.add(Math.max(0,Math.floor(Number(value)||0)));
  return [...ids].sort((a,b)=>a-b).slice(0,Math.max(1,positiveInt(limit,48)));
}
