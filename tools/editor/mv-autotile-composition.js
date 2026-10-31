// Independent RPG Maker MV autotile composition planner.
// Encodes observable quarter-tile geometry only. It does not copy or execute MV runtime code.

import {mvAutotileKind,mvAutotileShape,mvIsAutotile,mvTileSlot} from './mv-tile-id-contracts.js';

const freezeTable=rows=>Object.freeze(rows.map(row=>Object.freeze(row.map(pair=>Object.freeze([...pair])))));

export const MV_FLOOR_AUTOTILE_TABLE=freezeTable([
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

export const MV_WALL_AUTOTILE_TABLE=freezeTable([
  [[2,2],[1,2],[2,1],[1,1]],[[0,2],[1,2],[0,1],[1,1]],[[2,0],[1,0],[2,1],[1,1]],[[0,0],[1,0],[0,1],[1,1]],
  [[2,2],[3,2],[2,1],[3,1]],[[0,2],[3,2],[0,1],[3,1]],[[2,0],[3,0],[2,1],[3,1]],[[0,0],[3,0],[0,1],[3,1]],
  [[2,2],[1,2],[2,3],[1,3]],[[0,2],[1,2],[0,3],[1,3]],[[2,0],[1,0],[2,3],[1,3]],[[0,0],[1,0],[0,3],[1,3]],
  [[2,2],[3,2],[2,3],[3,3]],[[0,2],[3,2],[0,3],[3,3]],[[2,0],[3,0],[2,3],[3,3]],[[0,0],[3,0],[0,3],[3,3]]
]);

export const MV_WATERFALL_AUTOTILE_TABLE=freezeTable([
  [[2,0],[1,0],[2,1],[1,1]],[[0,0],[1,0],[0,1],[1,1]],[[2,0],[3,0],[2,1],[3,1]],[[0,0],[3,0],[0,1],[3,1]]
]);

const TABLES=Object.freeze({floor:MV_FLOOR_AUTOTILE_TABLE,wall:MV_WALL_AUTOTILE_TABLE,waterfall:MV_WATERFALL_AUTOTILE_TABLE});
const WATER_PHASE=Object.freeze([0,1,2,1]);
const DEST_NAMES=Object.freeze(['TL','TR','BL','BR']);

function mod(value,base){return ((value%base)+base)%base;}
function assertTileSize(tileSize){const size=Number(tileSize);if(!Number.isFinite(size)||size<=0||!Number.isInteger(size)||size%2!==0)throw new RangeError(`MV autotile tileSize must be a positive even integer: ${tileSize}`);return size;}

export function mvAutotileAnimationFrameCount(tileId){
  if(mvTileSlot(tileId)!=='A1')return mvIsAutotile(tileId)?1:0;
  const kind=mvAutotileKind(tileId);if(kind===2||kind===3)return 1;return kind>=4&&kind%2===1?3:4;
}

export function mvAutotileSourcePlan(tileId,{animationFrame=0,tileSize=48}={}){
  const size=assertTileSize(tileSize),slot=mvTileSlot(tileId);
  if(!['A1','A2','A3','A4'].includes(slot))return null;
  const kind=mvAutotileKind(tileId),shape=mvAutotileShape(tileId),tx=kind%8,ty=Math.floor(kind/8),frame=Math.floor(Number(animationFrame)||0);
  let bx=0,by=0,family='floor',animated=false,phase=0;
  if(slot==='A1'){
    const waterPhase=WATER_PHASE[mod(frame,4)];
    if(kind===0){bx=waterPhase*2;by=0;animated=true;phase=waterPhase;}
    else if(kind===1){bx=waterPhase*2;by=3;animated=true;phase=waterPhase;}
    else if(kind===2){bx=6;by=0;}
    else if(kind===3){bx=6;by=3;}
    else{
      bx=Math.floor(tx/4)*8;
      by=ty*6+(Math.floor(tx/2)%2)*3;
      if(kind%2===0){bx+=waterPhase*2;animated=true;phase=waterPhase;}
      else{bx+=6;family='waterfall';phase=mod(frame,3);by+=phase;animated=true;}
    }
  }else if(slot==='A2'){
    bx=tx*2;by=(ty-2)*3;
  }else if(slot==='A3'){
    bx=tx*2;by=(ty-6)*2;family='wall';
  }else{
    bx=tx*2;by=Math.floor((ty-10)*2.5+(ty%2===1?0.5:0));if(ty%2===1)family='wall';
  }
  const table=TABLES[family],recipe=table[shape]||null,quarterSize=size/2;
  const result={tileId:Number(tileId),slot,kind,shape,family,animationFrame:frame,animationPhase:phase,animated,frameCount:mvAutotileAnimationFrameCount(tileId),tileSize:size,quarterSize,sourceBlock:{tileX:bx,tileY:by,quarterX:bx*2,quarterY:by*2},supported:!!recipe,quadrants:[]};
  if(!recipe){result.reason=`MV ${family} autotiles support shape indices 0-${table.length-1}; received ${shape}`;return result;}
  result.quadrants=recipe.map(([qx,qy],index)=>{
    const sourceQuarterX=bx*2+qx,sourceQuarterY=by*2+qy,destQuarterX=index%2,destQuarterY=Math.floor(index/2);
    return {name:DEST_NAMES[index],sourceRelativeQuarter:{x:qx,y:qy},sourceQuarter:{x:sourceQuarterX,y:sourceQuarterY},sourcePixel:{x:sourceQuarterX*quarterSize,y:sourceQuarterY*quarterSize,width:quarterSize,height:quarterSize},destinationPixel:{x:destQuarterX*quarterSize,y:destQuarterY*quarterSize,width:quarterSize,height:quarterSize}};
  });
  return result;
}

export function mvAutotileCompositionSummary(tileId,options){
  const plan=mvAutotileSourcePlan(tileId,options);if(!plan)return null;
  return {tileId:plan.tileId,slot:plan.slot,kind:plan.kind,shape:plan.shape,family:plan.family,supported:plan.supported,animated:plan.animated,animationFrame:plan.animationFrame,animationPhase:plan.animationPhase,frameCount:plan.frameCount,quarters:plan.quadrants.map(q=>`${q.name}←Q${q.sourceQuarter.x},${q.sourceQuarter.y}`),reason:plan.reason||null};
}
