import {MV_DATABASE_FILES,MV_MAP_FILE} from './mv-project-core.js';
import {importMvProjectData,exportMvProjectData} from './mv-editor-adapter.js';

function pathOf(file){return String(file?.webkitRelativePath||file?.relativePath||file?.name||'').replace(/\\/g,'/').replace(/^\.\//,'').replace(/^\//,'');}
function basename(path){const p=String(path||'').replace(/\\/g,'/');return p.slice(p.lastIndexOf('/')+1);}

export const MV_REQUIRED_DATA_FILES=Object.freeze([...MV_DATABASE_FILES]);

export async function collectMvJsonFiles(inputFiles){
  const files=Array.from(inputFiles||[]);const result={};const sources={};const errors=[];
  for(const file of files){
    const path=pathOf(file);const name=basename(path);
    if(!name.toLowerCase().endsWith('.json')) continue;
    if(!(MV_REQUIRED_DATA_FILES.includes(name)||MV_MAP_FILE.test(name))) continue;
    if(name in result){errors.push({code:'MV_IMPORT_DUPLICATE_FILE',file:name,paths:[sources[name],path]});continue;}
    try{result[name]=JSON.parse(await file.text());sources[name]=path;}catch(error){errors.push({code:'MV_IMPORT_JSON_PARSE',file:name,path,message:error.message});}
  }
  const missing=MV_REQUIRED_DATA_FILES.filter(name=>!(name in result));
  const maps=Object.keys(result).filter(name=>MV_MAP_FILE.test(name)).sort();
  if(maps.length===0) errors.push({code:'MV_IMPORT_MAP_MISSING',message:'No Map###.json file was selected'});
  for(const name of missing) errors.push({code:'MV_IMPORT_DATABASE_MISSING',file:name});
  return {ok:errors.length===0,files:result,sources,missing,maps,errors};
}

export async function importMvFiles(inputFiles,{strictExtended=false}={}){
  const collected=await collectMvJsonFiles(inputFiles);
  if(!collected.ok){const error=new Error(`MV data selection is incomplete or invalid (${collected.errors.length} issue(s))`);error.code='MV_FILE_IMPORT_INVALID';error.diagnostics=collected;throw error;}
  const project=importMvProjectData(collected.files,{strictExtended});
  project.mvImport={sourcePaths:collected.sources,mapFiles:collected.maps,importedAt:new Date().toISOString()};
  return project;
}

export function exportMvFiles(project){
  const files=exportMvProjectData(project);return Object.entries(files).filter(([name])=>MV_REQUIRED_DATA_FILES.includes(name)||MV_MAP_FILE.test(name)).sort(([a],[b])=>a.localeCompare(b)).map(([name,data])=>({name,data,text:JSON.stringify(data)}));
}

export function isMvEditorProject(project){return project?.format==='plushbound-world-editor-mv-adapter'&&project?.adapterVersion===1;}
