import {normalizePackage,validatePackage,createHistory,checkpointHistory,undoHistory,redoHistory} from './editor-core.js';
import {createBlankMap,duplicateMap,renameMap,resizeMap,inboundTransfers,removeMap,mapManagementSummary} from './map-management-core.js';

const $=id=>document.getElementById(id);
const els=Object.fromEntries(['undoMaps','redoMaps','reloadMaps','exportMaps','mapCount','mapList','emptyMap','mapForm','mapId','mapName','mapWidth','mapHeight','mapLinks','applyMap','resizeMap','clampResizeEvents','clampResizeTransfers','duplicateMap','deleteMap','newMapId','newMapName','newMapWidth','newMapHeight','createMap','mapStatus','mapDiagnostics'].map(id=>[id,$(id)]));
const state={pkg:null,selectedId:null,history:createHistory(80)};

async function loadJson(url){const response=await fetch(url);if(!response.ok)throw new Error(`Could not load ${url} (${response.status})`);return response.json();}
function selectedMap(){return state.pkg?.maps?.find(map=>String(map.id)===String(state.selectedId))||null;}
function selectedIndex(){return Math.max(0,state.pkg?.maps?.findIndex(map=>String(map.id)===String(state.selectedId))??0);}
function remember(label){checkpointHistory(state.history,state.pkg,label);renderHistory();}
function discardLast(label){if(state.history.undo.at(-1)?.label===label)state.history.undo.pop();renderHistory();}
function renderHistory(){els.undoMaps.disabled=!state.history.undo.length;els.redoMaps.disabled=!state.history.redo.length;els.undoMaps.title=state.history.undo.at(-1)?.label||'Nothing to undo';els.redoMaps.title=state.history.redo.at(-1)?.label||'Nothing to redo';}
function install(pkg,{resetHistory=false,preserveId=null,preserveIndex=null}={}){state.pkg=normalizePackage(pkg);if(resetHistory)state.history=createHistory(80);const byId=state.pkg.maps.find(map=>map.id===preserveId);const byIndex=preserveIndex==null?null:state.pkg.maps[Math.min(Math.max(0,Number(preserveIndex)||0),Math.max(0,state.pkg.maps.length-1))];state.selectedId=(byId||byIndex||state.pkg.maps[0])?.id||null;renderAll();}

function renderList(){
  els.mapList.innerHTML='';const summary=mapManagementSummary(state.pkg);els.mapCount.textContent=`${summary.length} map(s)`;
  for(const row of summary){const button=document.createElement('button');button.type='button';button.dataset.mapId=row.id;button.className=row.id===state.selectedId?'selected':'';button.innerHTML=`<strong>${row.name}</strong><small>${row.id} • ${row.width}×${row.height} • ${row.events} event(s) • ${row.inbound} in / ${row.outbound} out</small>`;els.mapList.append(button);}
}
function renderForm(){
  const map=selectedMap();els.emptyMap.hidden=!!map;els.mapForm.hidden=!map;if(!map)return;
  els.mapId.value=map.id;els.mapName.value=map.name||map.id;els.mapWidth.value=map.width;els.mapHeight.value=map.height;
  const inbound=inboundTransfers(state.pkg,map.id);els.mapLinks.textContent=`${inbound.length} inbound transfer(s) • ${(mapManagementSummary(state.pkg).find(row=>row.id===map.id)?.outbound)||0} outbound transfer(s)`;els.deleteMap.disabled=state.pkg.maps.length<=1||inbound.length>0;els.deleteMap.title=state.pkg.maps.length<=1?'The final map cannot be deleted':inbound.length?'Remove or retarget inbound transfers before deleting':'Delete map';
}
function renderDiagnostics(message='Ready'){
  const selected=selectedMap();els.mapStatus.textContent=message;els.mapDiagnostics.textContent=JSON.stringify({selected:selected?.id||null,maps:mapManagementSummary(state.pkg)},null,2);els.exportMaps.disabled=!state.pkg;
}
function renderAll(message='Ready'){renderList();renderForm();renderDiagnostics(message);renderHistory();}

async function loadProject(){const pkg=await loadJson(new URL('../../game/runtime/elyndor-route-one.maps.json',location.href));install(pkg,{resetHistory:true});}
function applyMap(){const map=selectedMap();if(!map)return;const oldId=map.id,label=`Rename map ${oldId}`;try{remember(label);const result=renameMap(state.pkg,oldId,els.mapId.value,{name:els.mapName.value,updateTransfers:true});state.selectedId=result.map.id;renderAll(`Renamed ${oldId} → ${result.map.id}; updated ${result.updatedTransfers} inbound transfer(s)`);}catch(error){const undo=undoHistory(state.history,state.pkg);if(undo)state.pkg=undo.pkg;renderAll(`Map not changed: ${error.message}`);}}
function resizeSelected(){const map=selectedMap();if(!map)return;const label=`Resize map ${map.id}`;try{remember(label);const result=resizeMap(state.pkg,map.id,{width:els.mapWidth.value,height:els.mapHeight.value,eventPolicy:els.clampResizeEvents.checked?'clamp':'block',transferPolicy:els.clampResizeTransfers.checked?'clamp':'block'});state.selectedId=result.map.id;renderAll(`Resized ${map.id}: ${result.oldWidth}×${result.oldHeight} → ${result.newWidth}×${result.newHeight}; clamped ${result.clampedEvents} event(s), ${result.clampedTransfers} transfer(s); removed ${result.droppedBlocked} out-of-bounds blocked cell(s)`);}catch(error){discardLast(label);renderAll(`Resize blocked safely: ${error.message}`);}}
function duplicateSelected(){const map=selectedMap();if(!map)return;try{remember(`Duplicate map ${map.id}`);const copy=duplicateMap(state.pkg,map.id);state.selectedId=copy.id;renderAll(`Duplicated ${map.id} → ${copy.id}`);}catch(error){renderAll(`Map not duplicated: ${error.message}`);}}
function createMap(){try{remember('Create blank map');const map=createBlankMap(state.pkg,{id:els.newMapId.value,name:els.newMapName.value,width:els.newMapWidth.value,height:els.newMapHeight.value});state.selectedId=map.id;renderAll(`Created ${map.id}`);}catch(error){renderAll(`Map not created: ${error.message}`);}}
function deleteSelected(){const map=selectedMap();if(!map)return;try{remember(`Delete map ${map.id}`);removeMap(state.pkg,map.id);state.selectedId=state.pkg.maps[0]?.id||null;renderAll(`Deleted ${map.id}`);}catch(error){renderAll(`Map not deleted: ${error.message}`);}}
function undo(){const index=selectedIndex();const entry=undoHistory(state.history,state.pkg);if(!entry)return;install(entry.pkg,{preserveIndex:index});renderDiagnostics(`Restored: ${entry.label}`);}
function redo(){const index=selectedIndex();const entry=redoHistory(state.history,state.pkg);if(!entry)return;install(entry.pkg,{preserveIndex:index});renderDiagnostics(`Restored: ${entry.label}`);}
function exportMaps(){try{validatePackage(state.pkg);const blob=new Blob([`${JSON.stringify(state.pkg,null,2)}\n`],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='elyndor-route-one.maps.json';a.click();URL.revokeObjectURL(url);renderDiagnostics('Exported validated runtime map package');}catch(error){renderDiagnostics(`Export blocked: ${error.message}`);}}

els.mapList.addEventListener('click',event=>{const button=event.target.closest('[data-map-id]');if(button){state.selectedId=button.dataset.mapId;renderAll(`Selected ${state.selectedId}`);}});
els.applyMap.addEventListener('click',applyMap);els.resizeMap.addEventListener('click',resizeSelected);els.duplicateMap.addEventListener('click',duplicateSelected);els.createMap.addEventListener('click',createMap);els.deleteMap.addEventListener('click',deleteSelected);els.undoMaps.addEventListener('click',undo);els.redoMaps.addEventListener('click',redo);els.exportMaps.addEventListener('click',exportMaps);els.reloadMaps.addEventListener('click',()=>loadProject().catch(error=>renderDiagnostics(`Load failed: ${error.message}`)));

loadProject().catch(error=>renderDiagnostics(`Load failed: ${error.message}`));