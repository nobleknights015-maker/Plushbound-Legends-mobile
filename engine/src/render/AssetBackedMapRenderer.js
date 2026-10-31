import { Camera2D, TilemapRenderer } from './TilemapRenderer.js';
import { MvTilesetResolver } from './MvTilesetResolver.js';
import { ASSET_COMPATIBILITY_V1_TILESET_SLOTS, mvTilesetSetSheetAssetId } from '../assets/AssetCompatibilityV1.js';

function stableTilesetId(map={},override=null){
  const raw=override??map.tileset??map.tilesetSet??map.tilesetAssetId??null;
  const id=typeof raw==='string'?raw.trim():'';
  if(!id)throw new Error('Map rendering requires a stable string tileset parent asset ID');
  return id.replace(/^\/+|\/+$/g,'');
}

export function createAssetBackedMvTilesetResolver(parentId,{tileSize=48,catalog=null,strict=true}={}){
  const id=stableTilesetId({},parentId);
  const images=Object.fromEntries(ASSET_COMPATIBILITY_V1_TILESET_SLOTS.map(slot=>[slot,mvTilesetSetSheetAssetId(id,slot)]));
  if(strict&&catalog){
    const missing=Object.values(images).filter(assetId=>!catalog.has(assetId));
    if(missing.length)throw new Error(`Tileset set ${id} is missing derived sheet descriptors: ${missing.join(', ')}`);
  }
  return new MvTilesetResolver({tileSize,images});
}

export function createMapCamera(map={}, {viewportWidth=816,viewportHeight=624,tileSize=48,x=0,y=0,zoom=1}={}){
  const width=Math.max(1,Number(map.width)||1),height=Math.max(1,Number(map.height)||1),size=Math.max(1,Number(tileSize)||48);
  return new Camera2D({viewportWidth,viewportHeight,worldWidth:width*size,worldHeight:height*size,x,y,zoom});
}

export class AssetBackedMapRenderer{
  constructor({catalog=null,tileSize=48,viewportWidth=816,viewportHeight=624,strict=true}={}){
    this.catalog=catalog;this.tileSize=Math.max(1,Number(tileSize)||48);this.viewportWidth=Math.max(1,Number(viewportWidth)||816);this.viewportHeight=Math.max(1,Number(viewportHeight)||624);this.strict=strict!==false;this.tilemap=new TilemapRenderer({tileWidth:this.tileSize,tileHeight:this.tileSize});
  }
  resolverFor(map,{tilesetId=null}={}){return createAssetBackedMvTilesetResolver(stableTilesetId(map,tilesetId),{tileSize:this.tileSize,catalog:this.catalog,strict:this.strict});}
  cameraFor(map,options={}){return createMapCamera(map,{viewportWidth:this.viewportWidth,viewportHeight:this.viewportHeight,tileSize:this.tileSize,...options});}
  buildDrawList({map,camera=null,tilesetId=null,sprites=[],overlays=[],clockMs=0}={}){
    if(!map)throw new Error('AssetBackedMapRenderer requires map');
    const resolvedCamera=camera||this.cameraFor(map),tileset=this.resolverFor(map,{tilesetId});
    return this.tilemap.buildDrawList({camera:resolvedCamera,map,sprites,overlays,tileset,clockMs});
  }
  render({backend,map,camera=null,tilesetId=null,sprites=[],overlays=[],clockMs=0,clear=true}={}){
    if(!backend?.draw)throw new Error('AssetBackedMapRenderer requires render backend');
    const drawList=this.buildDrawList({map,camera,tilesetId,sprites,overlays,clockMs});
    if(clear)backend.beginFrame?.({width:this.viewportWidth,height:this.viewportHeight});
    for(const command of drawList.commands)backend.draw(command);
    if(clear)backend.endFrame?.();
    return drawList;
  }
}
