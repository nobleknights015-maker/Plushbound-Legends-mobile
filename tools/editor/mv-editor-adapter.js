import {createMvCompatibilityPackage,validateMvDatabase} from './mv-project-core.js';
import {validateMvExtendedDatabase} from './mv-database-contracts.js';
import {decodeMvEventList,encodeMvEventCommands} from './mv-event-command-adapter.js';

function clone(v){return typeof structuredClone==='function'?structuredClone(v):JSON.parse(JSON.stringify(v));}
const TRIGGER_TO_EDITOR=Object.freeze({0:'action',1:'touch',2:'touch',3:'autorun',4:'parallel'});
const TRIGGER_TO_MV=Object.freeze({action:0,touch:1,autorun:3,parallel:4});
const PRIORITY_TO_EDITOR=Object.freeze({0:'below',1:'same',2:'above'});

function mapFileName(id){return `Map${String(id).padStart(3,'0')}.json`;}
function splitMvLayers(map){
  const count=map.width*map.height;
  const layers=[];
  for(let z=0;z<4;z++) layers.push({id:`mv-layer-${z}`,name:`MV Layer ${z+1}`,z,visible:true,data:map.data.slice(z*count,(z+1)*count)});
  return {layers,shadowBits:map.data.slice(4*count,5*count),regions:map.data.slice(5*count,6*count)};
}
function joinMvLayers(editorMap,sourceMap){
  const width=editorMap.width,height=editorMap.height,count=width*height;
  const out=new Array(count*6).fill(0);
  for(let z=0;z<4;z++){
    const data=editorMap.layers?.[z]?.data||[];
    for(let i=0;i<count;i++)out[z*count+i]=Number(data[i])||0;
  }
  const shadows=Array.isArray(editorMap.mvShadowBits)?editorMap.mvShadowBits:[];
  const sourceSameSize=sourceMap?.width===width&&sourceMap?.height===height;
  const sourceShadow=sourceSameSize&&Array.isArray(sourceMap?.data)?sourceMap.data.slice(4*count,5*count):[];
  for(let i=0;i<count;i++) out[4*count+i]=Number(shadows[i]??sourceShadow[i])||0;
  for(let i=0;i<count;i++) out[5*count+i]=Math.max(0,Math.floor(Number(editorMap.regions?.[i])||0));
  return out;
}
function mvPageToEditor(page){
  return {
    trigger:TRIGGER_TO_EDITOR[page.trigger]||'action',
    priority:PRIORITY_TO_EDITOR[page.priorityType]||'same',
    conditions:clone(page.conditions||{}),
    commands:decodeMvEventList(page.list||[]),
    mvTrigger:page.trigger,
    mv:clone(page)
  };
}
function mvEventToEditor(event){
  return {
    id:String(event.id),name:event.name||`EV${event.id}`,x:event.x,y:event.y,
    pages:(event.pages||[]).map(mvPageToEditor),
    mv:clone(event)
  };
}
function editorEventToMv(event,sourceEvent){
  const out=clone(sourceEvent||event.mv||{});
  out.id=Number(event.id)||Number(out.id)||0;out.name=event.name??out.name??'';out.x=event.x;out.y=event.y;
  if(Array.isArray(event.pages)) out.pages=event.pages.map((page,index)=>{
    const base=clone(page.mv||out.pages?.[index]||{});
    const originalTrigger=Number.isInteger(page.mvTrigger)?page.mvTrigger:base.trigger;
    if(TRIGGER_TO_EDITOR[originalTrigger]===page.trigger) base.trigger=originalTrigger;
    else if(page.trigger in TRIGGER_TO_MV) base.trigger=TRIGGER_TO_MV[page.trigger];
    if(page.conditions) base.conditions=clone(page.conditions);
    if(Array.isArray(page.commands)) base.list=encodeMvEventCommands(page.commands);
    return base;
  });
  return out;
}

export function importMvProjectData(files,{strictExtended=true}={}){
  const core=validateMvDatabase(files);
  if(!core.ok){const e=new Error(`MV project data failed core validation: ${core.issues[0]?.message||'unknown error'}`);e.code='MV_IMPORT_CORE_INVALID';e.diagnostics=core;throw e;}
  const extended=validateMvExtendedDatabase(files);
  if(strictExtended&&!extended.ok){const e=new Error(`MV project data failed extended validation: ${extended.issues[0]?.message||'unknown error'}`);e.code='MV_IMPORT_EXTENDED_INVALID';e.diagnostics=extended;throw e;}
  const compat=createMvCompatibilityPackage(files);
  const maps=core.detection.maps.map(filename=>{
    const id=Number(filename.match(/Map(\d{3})\.json/)[1]);const map=files[filename];const split=splitMvLayers(map);
    return {
      id:String(id),mvMapId:id,mvFileName:filename,name:map.displayName||`Map ${id}`,
      width:map.width,height:map.height,tilesetId:map.tilesetId,
      layers:split.layers,regions:split.regions,mvShadowBits:split.shadowBits,
      events:(map.events||[]).slice(1).filter(Boolean).map(mvEventToEditor),
      encounterList:clone(map.encounterList||[]),
      mv:clone(map)
    };
  });
  const commonEvents=(compat.database.CommonEvents||[]).slice(1).filter(Boolean).map(record=>({
    id:String(record.id),name:record.name||`Common Event ${record.id}`,
    trigger:record.trigger,switchId:record.switchId,
    commands:decodeMvEventList(record.list||[]),mv:clone(record)
  }));
  return {
    format:'plushbound-world-editor-mv-adapter',adapterVersion:1,
    sourceFormat:compat.format,
    start:{mapId:String(compat.start.mapId),x:compat.start.x,y:compat.start.y,direction:2},
    maps,commonEvents,
    mvDatabase:clone(compat.database),
    mvSourceFiles:clone(files),
    mvDiagnostics:{core:clone(core.issues),extended:clone(extended.issues)}
  };
}

export function exportMvProjectData(project){
  if(!project||project.format!=='plushbound-world-editor-mv-adapter') throw new Error('Not an MV-adapted Plushbound editor project');
  const files=clone(project.mvSourceFiles||{});
  for(const editorMap of project.maps||[]){
    const mapId=Number(editorMap.mvMapId??editorMap.id);if(!Number.isInteger(mapId)||mapId<=0) throw new Error(`Invalid MV map id: ${editorMap.id}`);
    const filename=editorMap.mvFileName||mapFileName(mapId);const source=files[filename]||editorMap.mv||{};const out=clone(source);
    out.width=editorMap.width;out.height=editorMap.height;out.tilesetId=Number(editorMap.tilesetId??out.tilesetId)||0;
    out.data=joinMvLayers(editorMap,source);
    const sourceEvents=Array.isArray(source.events)?source.events:[];out.events=[null];
    for(const event of editorMap.events||[]){const numeric=Number(event.id);if(!Number.isInteger(numeric)||numeric<=0) throw new Error(`MV event id must remain a positive integer: ${event.id}`);out.events[numeric]=editorEventToMv(event,sourceEvents[numeric]);}
    for(let i=1;i<out.events.length;i++) if(out.events[i]===undefined) out.events[i]=null;
    if(Array.isArray(editorMap.encounterList))out.encounterList=clone(editorMap.encounterList);
    files[filename]=out;
  }
  if(files['System.json']&&project.start){files['System.json'].startMapId=Number(project.start.mapId)||0;files['System.json'].startX=Math.max(0,Math.floor(Number(project.start.x)||0));files['System.json'].startY=Math.max(0,Math.floor(Number(project.start.y)||0));}
  const validation=validateMvDatabase(files);if(!validation.ok){const e=new Error(`Exported MV project data failed validation: ${validation.issues[0]?.message||'unknown error'}`);e.code='MV_EXPORT_INVALID';e.diagnostics=validation;throw e;}
  return files;
}

export function mvEditorTileAt(project,mapId,x,y,z){
  const map=(project.maps||[]).find(m=>String(m.id)===String(mapId));if(!map)throw new Error(`Unknown map: ${mapId}`);
  if(!Number.isInteger(x)||!Number.isInteger(y)||x<0||y<0||x>=map.width||y>=map.height)throw new RangeError('MV map coordinate out of range');
  if(!Number.isInteger(z)||z<0||z>5)throw new RangeError('MV z coordinate out of range');
  const i=y*map.width+x;
  if(z<4)return map.layers[z].data[i];
  if(z===4)return map.mvShadowBits[i];
  return map.regions[i];
}

export function verifyMvRoundTrip(files){
  const project=importMvProjectData(files,{strictExtended:false});const exported=exportMvProjectData(project);const issues=[];
  for(const filename of validateMvDatabase(files).detection.maps){const a=files[filename],b=exported[filename];if(JSON.stringify(a)!==JSON.stringify(b))issues.push({file:filename,code:'MV_ROUNDTRIP_MAP_MISMATCH'});}
  for(const name of ['System.json','Actors.json','Classes.json','Skills.json','Items.json','Weapons.json','Armors.json','Enemies.json','Troops.json','States.json','Animations.json','CommonEvents.json','Tilesets.json','MapInfos.json']) if(name in files&&JSON.stringify(files[name])!==JSON.stringify(exported[name]))issues.push({file:name,code:'MV_ROUNDTRIP_DATABASE_MISMATCH'});
  return {ok:issues.length===0,issues};
}
