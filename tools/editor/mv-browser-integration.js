import {importMvFiles,exportMvFiles,isMvEditorProject} from './mv-file-import.js';
import {importMvProjectData} from './mv-editor-adapter.js';
import {readMvDataZip,createStoredZip} from './mv-zip.js';

function download(blob,name){const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),1500);}
function status(message){const el=document.getElementById('status');if(el)el.textContent=message;}
function explain(error){return error?.diagnostics?.errors?.[0]?.message||error?.diagnostics?.issues?.[0]?.message||error?.message||String(error);}
async function editorApi(){for(let i=0;i<100;i++){if(window.PlushboundEditor?.setPackage)return window.PlushboundEditor;await new Promise(r=>setTimeout(r,20));}throw new Error('Plushbound editor API did not initialize');}

async function openFolder(files){status('Reading MV data folder…');const project=await importMvFiles(files,{strictExtended:false});const api=await editorApi();api.setPackage(project);status(`MV data loaded • ${project.maps.length} map(s) • lossless adapter active`);return project;}
async function openZip(file){status('Reading MV ZIP directory…');const result=await readMvDataZip(file);if(result.errors.length){const error=new Error(`MV ZIP contains ${result.errors.length} unreadable or duplicate data entry(s)`);error.diagnostics=result;throw error;}const project=importMvProjectData(result.files,{strictExtended:false});project.mvImport={sourceZip:file.name||'project.zip',sourcePaths:result.sources,mapFiles:Object.keys(result.files).filter(x=>/^Map\d{3}\.json$/.test(x)).sort(),importedAt:new Date().toISOString()};const api=await editorApi();api.setPackage(project);status(`MV ZIP loaded • ${project.maps.length} map(s) • only data JSON was read`);return project;}
async function exportZip(){const api=await editorApi(),project=api.getPackage();if(!isMvEditorProject(project))throw new Error('Current editor package was not imported from MV data; use normal Export JSON instead');const entries=exportMvFiles(project),blob=createStoredZip(entries);download(blob,'mv-data.edited.zip');status(`Exported ${entries.length} MV data JSON file(s) as mv-data.edited.zip`);return entries.length;}

function fileLabel(text,id,{zip=false,directory=false}={}){const label=document.createElement('label');label.className='button file-button';label.textContent=text;const input=document.createElement('input');input.id=id;input.type='file';input.hidden=false;if(zip)input.accept='.zip,application/zip,application/x-zip-compressed';else input.accept='application/json,.json';if(directory){input.multiple=true;input.setAttribute('webkitdirectory','');input.setAttribute('directory','');}label.append(input);return {label,input};}

export function installMvBrowserIntegration(){
  if(!document.getElementById('app')||!document.getElementById('fileInput')||document.getElementById('mvDataFolderInput'))return false;
  const actions=document.querySelector('.topbar .actions');if(!actions)return false;
  const folder=fileLabel('Open MV Data Folder','mvDataFolderInput',{directory:true}),zip=fileLabel('Open MV ZIP','mvZipInput',{zip:true});const exportButton=document.createElement('button');exportButton.id='exportMvDataZip';exportButton.type='button';exportButton.textContent='Export MV Data ZIP';exportButton.title='Export the currently loaded MV-adapted project as data/*.json in a deterministic ZIP';
  const anchor=document.getElementById('loadElyndor');actions.insertBefore(folder.label,anchor);actions.insertBefore(zip.label,anchor);actions.insertBefore(exportButton,anchor);
  folder.input.addEventListener('change',async()=>{if(!folder.input.files?.length)return;try{await openFolder(folder.input.files);}catch(error){alert(`Could not open MV data folder: ${explain(error)}`);}finally{folder.input.value='';}});
  zip.input.addEventListener('change',async()=>{const file=zip.input.files?.[0];if(!file)return;try{await openZip(file);}catch(error){alert(`Could not open MV ZIP: ${explain(error)}`);}finally{zip.input.value='';}});
  exportButton.addEventListener('click',async()=>{try{await exportZip();}catch(error){alert(`Could not export MV data: ${explain(error)}`);}});
  return true;
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',installMvBrowserIntegration,{once:true});else installMvBrowserIntegration();

window.PlushboundMvInterop={install:installMvBrowserIntegration,openFolder,openZip,exportZip};
