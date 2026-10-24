import {readEditorLink} from './editor-navigation-core.js';

const link=readEditorLink(location.search);
const hasTarget=Object.values(link).some(Boolean);

function delay(ms=20){return new Promise(resolve=>setTimeout(resolve,ms));}
async function waitFor(test,{attempts=150,delayMs=20}={}){for(let i=0;i<attempts;i++){const value=test();if(value)return value;await delay(delayMs);}return null;}

function installAtlasLink(){
  if(!document.getElementById('app')||document.getElementById('characterAtlasV1Link'))return;
  const actions=document.querySelector('.topbar .actions');if(!actions)return;
  const button=document.createElement('button');button.id='characterAtlasV1Link';button.type='button';button.textContent='Character Atlas v1';button.title='Import and deterministically slice a locked Character Atlas v1 PNG';button.addEventListener('click',()=>{location.href='./character-atlas-v1.html';});
  actions.insertBefore(button,actions.firstChild);
}
installAtlasLink();

async function applyDatabase(){
  if(!link.packageId&&!link.collectionKey&&!link.recordId)return false;
  const api=await waitFor(()=>window.PlushboundDatabase?.getState?.().packages?.length?window.PlushboundDatabase:null);if(!api)return false;
  const state=api.getState();let packageIndex=state.packageIndex;
  if(link.packageId){const found=state.packages.findIndex(entry=>String(entry.id)===link.packageId);if(found>=0)packageIndex=found;}
  if(packageIndex>=0)api.selectPackage(packageIndex);if(link.collectionKey)api.selectCollection(link.collectionKey);
  if(link.recordId){const row=api.getRows().find(candidate=>String(candidate.id)===link.recordId||String(candidate.locator)===link.recordId);if(row)api.selectRecord(row.locator);}
  document.querySelector('#recordEditor:not([hidden])')?.scrollIntoView({block:'start'});return true;
}
async function applyMapManager(){if(!link.mapId)return false;const button=await waitFor(()=>document.querySelector(`#mapList [data-map-id="${CSS.escape(link.mapId)}"]`));if(!button)return false;button.click();button.scrollIntoView({block:'center'});return true;}
async function applyMapEditor(){
  if(!link.mapId&&!link.eventId&&!link.assetId)return false;const load=document.getElementById('loadElyndor');if(load&&!document.querySelector('#mapSelect option'))load.click();
  if(link.mapId){const option=await waitFor(()=>[...document.querySelectorAll('#mapSelect option')].find(entry=>entry.value===link.mapId));if(option){const select=document.getElementById('mapSelect');select.value=link.mapId;select.dispatchEvent(new Event('change',{bubbles:true}));}}
  if(link.eventId){const api=await waitFor(()=>window.PlushboundEditor?.getPackage?.()?window.PlushboundEditor:null);if(api)api.selectEvent(link.eventId);}
  if(link.assetId){const search=await waitFor(()=>document.getElementById('assetSearch'));if(search){search.value=link.assetId;search.dispatchEvent(new Event('input',{bubbles:true}));const card=await waitFor(()=>document.querySelector(`#assetList [data-asset-id="${CSS.escape(link.assetId)}"]`));card?.scrollIntoView({block:'center'});}}
  return true;
}
async function applyAudio(){if(!link.assetId)return false;const button=await waitFor(()=>document.querySelector(`#audioList [data-audio-id="${CSS.escape(link.assetId)}"]`));if(!button)return false;button.click();button.scrollIntoView({block:'center'});return true;}
if(hasTarget){if(document.getElementById('databaseApp'))applyDatabase();else if(document.getElementById('mapManagerApp'))applyMapManager();else if(document.getElementById('audioList'))applyAudio();else if(document.getElementById('app'))applyMapEditor();}
