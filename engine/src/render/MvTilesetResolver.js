// Independent MV-compatible tileset geometry resolver for Engine v1.
// Encodes observable tile-number/sheet/quarter geometry only. No reference pixels or runtime code are copied.

export const MV_TILE_IDS=Object.freeze({B:0,C:256,D:512,E:768,A5:1536,A1:2048,A2:2816,A3:4352,A4:5888,MAX:8192});
export const MV_TILE_COUNTS=Object.freeze({B:256,C:256,D:256,E:256,A5:128,A1:768,A2:1536,A3:1536,A4:2304});
const ORDER=Object.freeze(['B','C','D','E','A5','A1','A2','A3','A4']);
const PHASE=Object.freeze([0,1,2,1]);
const DEST=Object.freeze(['TL','TR','BL','BR']);
const freezeTable=rows=>Object.freeze(rows.map(row=>Object.freeze(row.map(pair=>Object.freeze([...pair])))));

export const FLOOR_TABLE=freezeTable([
[[2,4],[1,4],[2,3],[1,3]],[[2,0],[1,4],[2,3],[1,3]],[[2,4],[3,0],[2,3],[1,3]],[[2,0],[3,0],[2,3],[1,3]],
[[2,4],[1,4],[2,3],[3,1]],[[2,0],[1,4],[2,3],[3,1]],[[2,4],[3,0],[2,3],[3,1]],[[2,0],[3,0],[2,3],[3,1]],
[[2,4],[1,4],[2,1],[1,3]],[[2,0],[1,4],[2,1],[1,3]],[[2,4],[3,0],[2,1],[1,3]],[[2,0],[3,0],[2,1],[1,3]],
[[2,4],[1,4],[2,1],[3,1]],[[2,0],[1,4],[2,1],[3,1]],[[2,4],[3,0],[2,1],[3,1]],[[2,0],[3,0],[2,1],[3,1]],
[[0,4],[1,4],[0,3],[1,3]],[[0,4],[3,0],[0,3],[1,3]],[[0,4],[1,4],[0,3],[3,1]],[[0,4],[3,0],[0,3],[3,1]],
[[2,2],[1,2],[2,3],[1,3]],[[2,2],[1,2],[2,3],[3,1]],[[2,2],[1,2],[2,1],[1,3]],[[2,2],[1,2],[2,1],[3,1]],
[[2,4],[3,4],[2,3],[3,3]],[[2,4],[3,4],[2,1],[3,3]],[[2,0],[3,4],[2,3],[3,3]],[[2,0],[3,4],[2,1],[3,3]],
[[2,4],[1,4],[2,5],[1,5]],[[2,0],[1,4],[2,5],[1,5]],[[2,4],[3,0],[2,5],[1,5]],[[2,0],[3,0],[2,5],[1,5]],
[[0,4],[3,4],[0,3],[3,3]],[[2,2],[1,2],[2,5],[1,5]],[[0,2],[1,2],[0,3],[1,3]],[[0,2],[1,2],[0,3],[3,1]],
[[2,2],[3,2],[2,3],[3,3]],[[2,2],[3,2],[2,1],[3,3]],[[2,4],[3,4],[2,5],[3,5]],[[2,0],[3,4],[2,5],[3,5]],
[[0,4],[1,4],[0,5],[1,5]],[[0,4],[3,0],[0,5],[1,5]],[[0,2],[3,2],[0,3],[3,3]],[[0,2],[1,2],[0,5],[1,5]],
[[0,4],[3,4],[0,5],[3,5]],[[2,2],[3,2],[2,5],[3,5]],[[0,2],[3,2],[0,5],[3,5]],[[0,0],[1,0],[0,1],[1,1]]
]);
export const WALL_TABLE=freezeTable([
[[2,2],[1,2],[2,1],[1,1]],[[0,2],[1,2],[0,1],[1,1]],[[2,0],[1,0],[2,1],[1,1]],[[0,0],[1,0],[0,1],[1,1]],
[[2,2],[3,2],[2,1],[3,1]],[[0,2],[3,2],[0,1],[3,1]],[[2,0],[3,0],[2,1],[3,1]],[[0,0],[3,0],[0,1],[3,1]],
[[2,2],[1,2],[2,3],[1,3]],[[0,2],[1,2],[0,3],[1,3]],[[2,0],[1,0],[2,3],[1,3]],[[0,0],[1,0],[0,3],[1,3]],
[[2,2],[3,2],[2,3],[3,3]],[[0,2],[3,2],[0,3],[3,3]],[[2,0],[3,0],[2,3],[3,3]],[[0,0],[3,0],[0,3],[3,3]]
]);
export const WATERFALL_TABLE=freezeTable([
[[2,0],[1,0],[2,1],[1,1]],[[0,0],[1,0],[0,1],[1,1]],[[2,0],[3,0],[2,1],[3,1]],[[0,0],[3,0],[0,1],[3,1]]
]);
const TABLES=Object.freeze({floor:FLOOR_TABLE,wall:WALL_TABLE,waterfall:WATERFALL_TABLE});
function mod(v,b){return ((v%b)+b)%b;}

export function mvTileSlot(tileId){const id=Number(tileId);if(!Number.isInteger(id)||id<0||id>=8192)return null;for(const slot of ORDER){const start=MV_TILE_IDS[slot],count=MV_TILE_COUNTS[slot];if(id>=start&&id<start+count)return slot;}return 'RESERVED';}
export function mvTileLocalIndex(tileId){const slot=mvTileSlot(tileId);return !slot||slot==='RESERVED'?null:Number(tileId)-MV_TILE_IDS[slot];}
export function mvIsAutotile(tileId){return ['A1','A2','A3','A4'].includes(mvTileSlot(tileId));}
export function mvAutotileKind(tileId){return mvIsAutotile(tileId)?Math.floor((Number(tileId)-MV_TILE_IDS.A1)/48):null;}
export function mvAutotileShape(tileId){return mvIsAutotile(tileId)?(Number(tileId)-MV_TILE_IDS.A1)%48:null;}

export function mvDirectTileSource(tileId,{tileSize=48,images={}}={}){
  const slot=mvTileSlot(tileId);if(!['A5','B','C','D','E'].includes(slot))return null;
  const size=Math.max(1,Number(tileSize)||48),local=mvTileLocalIndex(tileId),columns=slot==='A5'?8:16;
  return {kind:'direct',tileId:Number(tileId),sheetId:slot,image:images[slot]??null,localIndex:local,sx:(local%columns)*size,sy:Math.floor(local/columns)*size,sw:size,sh:size};
}

export function mvAutotileSourcePlan(tileId,{animationFrame=0,tileSize=48,images={}}={}){
  const slot=mvTileSlot(tileId);if(!['A1','A2','A3','A4'].includes(slot))return null;
  const size=Number(tileSize);if(!Number.isInteger(size)||size<=0||size%2!==0)throw new RangeError(`MV tileSize must be positive/even: ${tileSize}`);
  const kind=mvAutotileKind(tileId),shape=mvAutotileShape(tileId),tx=kind%8,ty=Math.floor(kind/8),frame=Math.floor(Number(animationFrame)||0);
  let bx=0,by=0,family='floor',phase=0,animated=false;
  if(slot==='A1'){
    const p=PHASE[mod(frame,4)];
    if(kind===0){bx=p*2;by=0;phase=p;animated=true;}
    else if(kind===1){bx=p*2;by=3;phase=p;animated=true;}
    else if(kind===2){bx=6;by=0;}
    else if(kind===3){bx=6;by=3;}
    else{bx=Math.floor(tx/4)*8;by=ty*6+(Math.floor(tx/2)%2)*3;if(kind%2===0){bx+=p*2;phase=p;animated=true;}else{bx+=6;family='waterfall';phase=mod(frame,3);by+=phase;animated=true;}}
  }else if(slot==='A2'){bx=tx*2;by=(ty-2)*3;}
  else if(slot==='A3'){bx=tx*2;by=(ty-6)*2;family='wall';}
  else{bx=tx*2;by=Math.floor((ty-10)*2.5+(ty%2===1?0.5:0));if(ty%2===1)family='wall';}
  const table=TABLES[family],recipe=table[shape]||null,q=size/2;
  const base={kind:'autotile',tileId:Number(tileId),sheetId:slot,image:images[slot]??null,autotileKind:kind,shape,family,animationFrame:frame,animationPhase:phase,animated,supported:!!recipe,quarterSize:q,sourceBlock:{tileX:bx,tileY:by,quarterX:bx*2,quarterY:by*2},quadrants:[]};
  if(!recipe)return {...base,reason:`${family} shape ${shape} is outside supported table 0-${table.length-1}`};
  base.quadrants=recipe.map(([rx,ry],i)=>{const sxq=bx*2+rx,syq=by*2+ry,dx=(i%2)*q,dy=Math.floor(i/2)*q;return{name:DEST[i],sourceRelativeQuarter:{x:rx,y:ry},sourceQuarter:{x:sxq,y:syq},sourcePixel:{x:sxq*q,y:syq*q,width:q,height:q},destinationPixel:{x:dx,y:dy,width:q,height:q}};});
  return base;
}

export class MvTilesetResolver{
  constructor({tileSize=48,images={}}={}){this.tileSize=tileSize;this.images={...images};}
  setImage(slot,image){if(!ORDER.includes(String(slot)))throw new Error(`Unknown MV tileset slot: ${slot}`);this.images[String(slot)]=image;return this;}
  resolve(tileId,{clockMs=0,animationFrame=null}={}){
    const direct=mvDirectTileSource(tileId,{tileSize:this.tileSize,images:this.images});if(direct)return direct;
    if(!mvIsAutotile(tileId))return null;
    const frame=animationFrame==null?Math.floor(Math.max(0,Number(clockMs)||0)/400):Number(animationFrame);
    return mvAutotileSourcePlan(tileId,{animationFrame:frame,tileSize:this.tileSize,images:this.images});
  }
}
