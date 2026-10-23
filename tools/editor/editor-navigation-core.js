function enc(value){return encodeURIComponent(String(value??''));}
function isIndex(value){return /^\d+$/.test(String(value??''));}

export function editorDestination(record={}){
  const sourceType=String(record.sourceType||'');
  const sourceId=String(record.sourceId||'');
  const path=(record.path||[]).map(String);
  const context=record.context||{};
  const value=record.value||{};

  if(sourceType==='runtime'){
    const mapId=String(context.mapId||((path.at(-2)==='maps'&&value?.id)?value.id:'')||'');
    const eventId=String(context.eventId||((path.at(-2)==='events'&&value?.id)?value.id:'')||'');
    if(mapId&&eventId)return `./index.html?map=${enc(mapId)}&event=${enc(eventId)}`;
    if(mapId)return `./map-manager.html?map=${enc(mapId)}`;
  }

  if(sourceType==='content'){
    const collection=String(context.collectionKey||((path.length>=2&&isIndex(path[1]))?path[0]:'')||'');
    const recordId=String(context.recordId||value?.id||'');
    if(sourceId&&collection&&recordId)return `./database.html?package=${enc(sourceId)}&collection=${enc(collection)}&record=${enc(recordId)}`;
  }

  if(sourceType==='assets'){
    const assetId=String(context.assetId||value?.id||'');
    const assetType=String(value?.type||context.assetType||'').toLowerCase();
    if(assetId&&['bgm','bgs','me','se'].includes(assetType))return `./audio.html?asset=${enc(assetId)}`;
    if(assetId)return `./index.html?asset=${enc(assetId)}`;
  }

  return null;
}

export function readEditorLink(search=''){
  const params=new URLSearchParams(String(search||'').replace(/^\?/,''));
  return {
    packageId:params.get('package')||'',collectionKey:params.get('collection')||'',recordId:params.get('record')||'',
    mapId:params.get('map')||'',eventId:params.get('event')||'',assetId:params.get('asset')||''
  };
}
