import {clone,normalizePackage,validatePackage,createHistory,checkpointHistory,undoHistory,redoHistory} from './editor-core.js';
import {createBlankMap,duplicateMap,renameMap,inboundTransfers,removeMap,mapManagementSummary} from './map-management-core.js';

const $=id=>document.getElementById(id);
const els=Object.fromEntries(['undoMaps','redoMaps','reloadMaps','exportMaps','mapCount','mapList','emptyMap','mapForm','mapId','mapName','mapWidth','mapHeight','mapLinks','applyMap','duplicateMap','deleteMap','newMapId','newMapName','newMapWidth','newMapHeight','createMap','mapStatus','mapDiagnostics'].map(id=>[id,$(id)]));
const state={pkg:null,selectedId:null,history:createHistory(80)};

async function loadJson(url){const response=await fetch(url);if(!response.ok)throw new Error(`Could not load ${url} (${response.status})`);return response.json();}
function selectedMap(){return state.pkg?.maps?.find(map=>String(map.id)===String(state.selectedId))||null;}
function remember(label){checkpointHistory(state.history,state.pkg,label);renderHistory();}
function renderHistory(){els.undoMaps.disabled=!state.history.undo.length;els.redoMaps.disabled=!state.history.redo.length;els.undoMaps.title=state.history.undo.at(-1)?.label||'Nothing to undo';els.redoMaps.title=state.history.redo.at(-1)?.label||'Nothing to redo';}
function install(pkg,{resetHistory=false,preserveId=null}={}){state.pkg=normalizePackage(pkg);if(resetHistory)state.history=createHistory(80);state.selectedId=state.pkg.maps.some(map=>map.id===preserveId)?preserveId:(state.pkg.maps[0]?.id||null);renderAll();}

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
function applyMap(){const map=selectedMap();if(!map)return;const oldId=map.id;try{remember(`Rename map ${oldId}`);const result=renameMap(state.pkg,oldId,els.mapId.value,{name:els.mapName.value,updateTransfers:true});state.selectedId=result.map.id;renderAll(`Renamed ${oldId} → ${result.map.id}; updated ${result.updatedTransfers} inbound transfer(s)`);}catch(error){const undo=undoHistory(state.history,state.pkg);if(undo)state.pkg=undo.pkg;renderAll(`Map not changed: ${error.message}`);}}
function duplicateSelected(){const map=selectedMap();if(!map)return;try{remember(`Duplicate map ${map.id}`);const copy=duplicateMap(state.pkg,map.id);state.selectedId=copy.id;renderAll(`Duplicated ${map.id} → ${copy.id}`);}catch(error){renderAll(`Map not duplicated: ${error.message}`);}}
function createMap(){try{remember('Create blank map');const map=createBlankMap(state.pkg,{id:els.newMapId.value,name:els.newMapName.value,width:els.newMapWidth.value,height:els.newMapHeight.value});state.selectedId=map.id;renderAll(`Created ${map.id}`);}catch(error){renderAll(`Map not created: ${error.message}`);}}
function deleteSelected(){const map=selectedMap();if(!map)return;try{remember(`Delete map ${map.id}`);removeMap(state.pkg,map.id);state.selectedId=state.pkg.maps[0]?.id||null;renderAll(`Deleted ${map.id}`);}catch(error){renderAll(`Map not deleted: ${error.message}`);}}
function undo(){const entry=undoHistory(state.history,state.pkg);if(!entry)return;const preserve=state.selectedId;install(entry.pkg,{preserveId:preserve});renderDiagnostics(`Restored: ${entry.label}`);}
function redo(){const entry=redoHistory(state.history,state.pkg);if(!entry)return;const preserve=state.selectedId;install(entry.pkg,{preserveId:preserve});renderDiagnostics(`Restored: ${entry.label}`);}
function exportMaps(){try{validatePackage(state.pkg);const blob=new Blob([`${JSON.stringify(state.pkg,null,2)}\n`],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='elyndor-route-one.maps.json';a.click();URL.revokeObjectURL(url);renderDiagnostics('Exported validated runtime map package');}catch(error){renderDiagnostics(`Export blocked: ${error.message}`);}}

els.mapList.addEventListener('click',event=>{const button=event.target.closest('[data-map-id]');if(button){state.selectedId=button.dataset.mapId;renderAll(`Selected ${state.selectedId}`);}});
els.applyMap.addEventListener('click',applyMap);els.duplicateMap.addEventListener('click',duplicateSelected);els.createMap.addEventListener('click',createMap);els.deleteMap.addEventListener('click',deleteSelected);els.undoMaps.addEventListener('click',undo);els.redoMaps.addEventListener('click',redo);els.exportMaps.addEventListener('click',exportMaps);els.reloadMaps.addEventListener('click',()=>loadProject().catch(error=>renderDiagnostics(`Load failed: ${error.message}`)));

loadProject().catch(error=>renderDiagnostics(`Load failed: ${error.message}`));
