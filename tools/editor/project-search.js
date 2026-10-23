import {buildProjectIndex,searchProject} from './project-search-core.js';
import {editorDestination,readSearchLink} from './editor-navigation-core.js';

const query=document.getElementById('projectQuery');
const type=document.getElementById('projectType');
const status=document.getElementById('projectStatus');
const results=document.getElementById('projectResults');
let index=[];

async function loadJson(url){const response=await fetch(url);if(!response.ok)throw new Error(`${url} (${response.status})`);return response.json();}
function preview(value){let text='';try{text=JSON.stringify(value,null,2);}catch{text=String(value??'');}return text.length>700?`${text.slice(0,700)}…`:text;}
function render(){
  const matches=searchProject(index,query.value,{sourceType:type.value}).slice(0,250);
  status.textContent=`${matches.length}${matches.length===250?'+' : ''} result(s) • ${index.length} indexed records`;
  results.innerHTML='';
  for(const record of matches){
    const card=document.createElement('article');card.className='result';
    const head=document.createElement('div');head.className='result-head';
    const title=document.createElement('strong');title.textContent=record.label;
    const badge=document.createElement('span');badge.className='badge';badge.textContent=record.sourceType;
    const source=document.createElement('span');source.className='badge';source.textContent=record.sourceId;
    head.append(title,badge,source);card.append(head);
    const path=document.createElement('div');path.className='path';path.textContent=record.path.length?record.path.join('.'):'(root)';card.append(path);
    const body=document.createElement('div');body.className='preview';body.textContent=preview(record.value);card.append(body);
    const destination=editorDestination(record);
    if(destination){const open=document.createElement('a');open.className='result-open';open.href=destination;open.textContent='Open in Editor';open.dataset.destination=destination;card.append(open);}
    results.append(card);
  }
}

async function loadProject(){
  const initial=readSearchLink(location.search);query.value=initial.query;if(initial.sourceType)type.value=initial.sourceType;
  const indexUrl=new URL('../../game/content/content-index.json',location.href);
  const manifest=await loadJson(indexUrl);
  const base=new URL('./',indexUrl);
  const contentPackages=await Promise.all((manifest.packages||[]).map(async entry=>({id:entry.id,data:await loadJson(new URL(entry.path,base))})));
  const runtimePackages=await Promise.all((manifest.runtimePackages||[]).map(async entry=>({id:entry.id,data:await loadJson(new URL(entry.path,base))})));
  let assetManifest=null;
  if(manifest.assetLibraries?.[0]?.manifest)assetManifest=await loadJson(new URL(manifest.assetLibraries[0].manifest,base));
  index=buildProjectIndex({contentPackages,runtimePackages,assetManifest});
  render();
}

query.addEventListener('input',render);type.addEventListener('change',render);
loadProject().catch(error=>{status.textContent=`Project index failed: ${error.message}`;});
window.PlushboundProjectSearch={getIndex:()=>index.slice(),search:(value,options)=>searchProject(index,value,options),destination:editorDestination};
