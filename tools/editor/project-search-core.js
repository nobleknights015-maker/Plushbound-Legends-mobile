function clone(value){return typeof structuredClone==='function'?structuredClone(value):JSON.parse(JSON.stringify(value));}

function labelFor(value,path){
  if(value&&typeof value==='object') return String(value.name||value.title||value.id||value.code||path.at(-1)||'record');
  return String(path.at(-1)||'value');
}

function compactText(value){
  if(value===null||value===undefined) return '';
  if(typeof value==='string'||typeof value==='number'||typeof value==='boolean') return String(value);
  try{return JSON.stringify(value);}catch{return '';}
}

function nextContext(sourceType,path,value,parent={}){
  const context={...parent};
  const parentKey=path.at(-2), id=value&&typeof value==='object'?value.id:null;
  if(sourceType==='runtime'){
    if(parentKey==='maps'&&id)context.mapId=String(id);
    if(parentKey==='events'&&id)context.eventId=String(id);
  }else if(sourceType==='content'){
    if(path.length>=2&&/^\d+$/.test(String(path[1]))&&id){context.collectionKey=String(path[0]);context.recordId=String(id);}
  }else if(sourceType==='assets'){
    if(parentKey==='entries'&&id){context.assetId=String(id);if(value.type)context.assetType=String(value.type);}
  }
  return context;
}

export function indexSource({sourceType,sourceId,data}){
  const out=[];
  const walk=(value,path=[],parentContext={})=>{
    if(Array.isArray(value)){value.forEach((entry,index)=>walk(entry,[...path,index],parentContext));return;}
    if(value&&typeof value==='object'){
      const context=nextContext(sourceType,path,value,parentContext);
      const interesting=path.length===0||'id'in value||'name'in value||'title'in value||'code'in value;
      if(interesting){
        out.push({sourceType:String(sourceType),sourceId:String(sourceId),path:path.map(String),label:labelFor(value,path),text:compactText(value),value:clone(value),context:clone(context)});
      }
      for(const [key,entry] of Object.entries(value)) if(entry&&typeof entry==='object') walk(entry,[...path,key],context);
    }
  };
  walk(data,[]);
  return out;
}

export function buildProjectIndex({contentPackages=[],runtimePackages=[],assetManifest=null}={}){
  const out=[];
  for(const entry of contentPackages) out.push(...indexSource({sourceType:'content',sourceId:entry.id,data:entry.data}));
  for(const entry of runtimePackages) out.push(...indexSource({sourceType:'runtime',sourceId:entry.id,data:entry.data}));
  if(assetManifest) out.push(...indexSource({sourceType:'assets',sourceId:'asset-manifest',data:assetManifest}));
  return out;
}

export function searchProject(index,query,{sourceType=''}={}){
  const terms=String(query||'').trim().toLowerCase().split(/\s+/).filter(Boolean);
  return (index||[]).filter(record=>{
    if(sourceType&&record.sourceType!==sourceType) return false;
    if(!terms.length) return true;
    const haystack=`${record.sourceType} ${record.sourceId} ${record.path.join(' ')} ${record.label} ${record.text}`.toLowerCase();
    return terms.every(term=>haystack.includes(term));
  });
}
