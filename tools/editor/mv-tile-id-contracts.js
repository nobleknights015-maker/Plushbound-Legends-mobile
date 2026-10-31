// Independent RPG Maker MV tile-ID/autotile compatibility helpers.
// Encodes observable serialized tile-number contracts only; no RPG Maker rendering code.

export const MV_TILE_IDS=Object.freeze({B:0,C:256,D:512,E:768,A5:1536,A1:2048,A2:2816,A3:4352,A4:5888,MAX:8192});
export const MV_TILE_COUNTS=Object.freeze({B:256,C:256,D:256,E:256,A5:128,A1:768,A2:1536,A3:1536,A4:2304});
export const MV_AUTOTILE_SHAPES=48;

const SLOT_ORDER=['B','C','D','E','A5','A1','A2','A3','A4'];
const DIR_BITS=Object.freeze({2:0x01,4:0x02,6:0x04,8:0x08});

export function mvTileSlot(tileId){
  const id=Number(tileId);
  if(!Number.isInteger(id)||id<0||id>=MV_TILE_IDS.MAX)return null;
  for(const slot of SLOT_ORDER){const start=MV_TILE_IDS[slot],count=MV_TILE_COUNTS[slot];if(id>=start&&id<start+count)return slot;}
  return 'RESERVED';
}

export function mvTileLocalIndex(tileId){
  const slot=mvTileSlot(tileId);if(!slot||slot==='RESERVED')return null;return Number(tileId)-MV_TILE_IDS[slot];
}

export function mvIsAutotile(tileId){const slot=mvTileSlot(tileId);return slot==='A1'||slot==='A2'||slot==='A3'||slot==='A4';}

export function mvAutotileKind(tileId){
  if(!mvIsAutotile(tileId))return null;
  return Math.floor((Number(tileId)-MV_TILE_IDS.A1)/MV_AUTOTILE_SHAPES);
}
export function mvAutotileShape(tileId){
  if(!mvIsAutotile(tileId))return null;
  return (Number(tileId)-MV_TILE_IDS.A1)%MV_AUTOTILE_SHAPES;
}
export function mvAutotileId(kind,shape=0){
  const k=Math.floor(Number(kind)),s=Math.floor(Number(shape));
  if(!Number.isInteger(k)||k<0||k>=128)throw new RangeError(`MV autotile kind out of range: ${kind}`);
  if(!Number.isInteger(s)||s<0||s>=MV_AUTOTILE_SHAPES)throw new RangeError(`MV autotile shape out of range: ${shape}`);
  const id=MV_TILE_IDS.A1+k*MV_AUTOTILE_SHAPES+s;if(id>=MV_TILE_IDS.MAX)throw new RangeError(`MV autotile id out of range: ${id}`);return id;
}

export function mvAutotileSlotKind(tileId){
  const slot=mvTileSlot(tileId);if(!['A1','A2','A3','A4'].includes(slot))return null;
  return {slot,globalKind:mvAutotileKind(tileId),localKind:Math.floor((Number(tileId)-MV_TILE_IDS[slot])/MV_AUTOTILE_SHAPES),shape:mvAutotileShape(tileId)};
}

export function mvTileFlag(flags,tileId){
  if(!Array.isArray(flags)||flags.length!==8192)throw new Error('MV tileset flags must contain exactly 8192 entries');
  const id=Math.floor(Number(tileId));if(!Number.isInteger(id)||id<0||id>=flags.length)throw new RangeError(`MV tile id out of range: ${tileId}`);return Number(flags[id])||0;
}

export function mvTilePassage(flags,tileId,direction){
  const bit=DIR_BITS[Number(direction)];if(!bit)throw new RangeError(`MV direction must be 2, 4, 6, or 8: ${direction}`);
  const flag=mvTileFlag(flags,tileId);return {direction:Number(direction),bit,blocked:(flag&bit)!==0,star:(flag&0x10)!==0};
}

export function mvTileMetadata(flags,tileId){
  const flag=mvTileFlag(flags,tileId),slot=mvTileSlot(tileId);
  return {
    tileId:Number(tileId),slot,localIndex:mvTileLocalIndex(tileId),autotile:mvIsAutotile(tileId),autotileKind:mvAutotileKind(tileId),autotileShape:mvAutotileShape(tileId),
    flag,
    passage:{down:(flag&0x01)===0,left:(flag&0x02)===0,right:(flag&0x04)===0,up:(flag&0x08)===0},
    star:(flag&0x10)!==0,ladder:(flag&0x20)!==0,bush:(flag&0x40)!==0,counter:(flag&0x80)!==0,damageFloor:(flag&0x100)!==0,
    boatBlocked:(flag&0x200)!==0,shipBlocked:(flag&0x400)!==0,airshipBlocked:(flag&0x800)!==0,terrainTag:(flag>>12)&0x0f
  };
}
