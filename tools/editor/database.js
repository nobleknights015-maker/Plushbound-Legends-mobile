import {clone,collectionDescriptors,collectionRecords,validateCollection,replaceRecord,addRecord,removeRecord,labelFor,searchableRecordText,scalarFieldDescriptors,applyScalarFields} from './database-core.js';

const state={index:null,packages:[],packageIndex:-1,collectionKey:null,selectedLocator:null,history:{undo:[],redo:[],limit:80}};
const $=id=>document.getElementById(id);
const els=Object.fromEntries(['loadDatabase','exportPackage','undoDatabase','redoDatabase','packageSearch','packageList','packageMeta','collectionList','recordSearch','recordList','newRecord','duplicateRecord','deleteRecord','recordEmpty','recordEditor','recordIdentity','fieldEditor','applyFields','recordJson','applyRecord','validationSummary','validationIssues'].map(id=>[id,$(id)]));

async function loadJson(url){const response=await fetch(url);if(!response.ok)throw new Error(`Could not load ${url} (${response.status})`);return response.json();}
function activePackage(){return state.packages[state.packageIndex]||null;}
function activeRows(){const entry=activePackage();return entry&&state.collectionKey?collectionRecords(entry.data,state.collectionKey):[];}
function selectedRow(){return activeRows().find(row=>String(row.locator)===String(state.selectedLocator))||null;}
function snapshot(label){const entry=activePackage();if(!entry?.data)return;state.history.undo.push({label,data:clone(entry.data),packageIndex:state.packageIndex,collectionKey:state.collectionKey,selectedLocator:state.selectedLocator});if(state.history.undo.length>state.history.limit)state.history.undo.splice(0,state.history.undo.length-state.history.limit);state.history.redo=[];updateHistoryButtons();}
function historyEntry(label){const entry=activePackage();return entry?.data?{label,data:clone(entry.data),packageIndex:state.packageIndex,collectionKey:state.collectionKey,selectedLocator:state.selectedLocator}:null;}
function restoreHistory(entry){if(!entry)return false;state.packageIndex=entry.packageIndex;const active=activePackage();if(!active)return false;active.data=clone(entry.data);state.collectionKey=entry.collectionKey;state.selectedLocator=entry.selectedLocator;renderAll();return true;}
function undo(){if(!state.history.undo.length)return false;const current=historyEntry(state.history.undo.at(-1).label);const previous=state.history.undo.pop();if(current)state.history.redo.push(current);const ok=restoreHistory(previous);updateHistoryButtons();return ok;}
function redo(){if(!state.history.redo.length)return false;const next=state.history.redo.pop();const current=historyEntry(next.label);if(current)state.history.undo.push(current);const ok=restoreHistory(next);updateHistoryButtons();return ok;}
function updateHistoryButtons(){els.undoDatabase.disabled=!state.history.undo.length;els.redoDatabase.disabled=!state.history.redo.length;els.undoDatabase.title=state.history.undo.at(-1)?.label||'Nothing to undo';els.redoDatabase.title=state.history.redo.at(-1)?.label||'Nothing to redo';}

async function loadProject(){
  const index=await loadJson(new URL('../../game/content/content-index.json',location.href));
  const packages=[];
  for(const descriptor of index.packages||[]){
    const url=new URL(`../../game/content/${descriptor.path}`,location.href);
    try{packages.push({...descriptor,data:await loadJson(url),loadError:null});}
    catch(error){packages.push({...descriptor,data:null,loadError:error.message});}
  }
  state.index=index;state.packages=packages;state.packageIndex=packages.findIndex(entry=>entry.data);state.collectionKey=null;state.selectedLocator=null;state.history={undo:[],redo:[],limit:80};renderAll();updateHistoryButtons();
}

function renderAll(){renderPackages();renderCollections();renderRecords();renderInspector();renderValidation();}
function renderPackages(){
  els.packageList.innerHTML='';const q=els.packageSearch.value.trim().toLowerCase();
  state.packages.forEach((entry,index)=>{if(q&&!`${entry.id} ${entry.path}`.toLowerCase().includes(q))return;const b=document.createElement('button');b.dataset.packageIndex=index;b.className=index===state.packageIndex?'selected':'';b.innerHTML=`<strong>${entry.id}</strong><small>${entry.loadError?'Load error':entry.path}</small>`;els.packageList.append(b);});
}
function renderCollections(){
  els.collectionList.innerHTML='';const entry=activePackage();if(!entry||!entry.data){els.packageMeta.textContent=entry?.loadError||'Load the project database.';return;}
  const descriptors=collectionDescriptors(entry.data);els.packageMeta.textContent=`${entry.id} • schema ${entry.data.schemaVersion??'?'} • ${descriptors.length} editable collection(s)`;
  if(!descriptors.some(d=>d.key===state.collectionKey))state.collectionKey=descriptors[0]?.key||null;
  for(const d of descriptors){const b=document.createElement('button');b.dataset.collectionKey=d.key;b.className=d.key===state.collectionKey?'selected':'';b.innerHTML=`<strong>${d.label}</strong><small>${d.count} record(s) • ${d.kind}</small>`;els.collectionList.append(b);}
}
function renderRecords(){
  els.recordList.innerHTML='';const q=els.recordSearch.value.trim().toLowerCase();const rows=activeRows().filter(row=>!q||searchableRecordText(row).includes(q));
  for(const row of rows){const b=document.createElement('button');b.dataset.locator=String(row.locator);b.className=`record-card${String(row.locator)===String(state.selectedLocator)?' selected':''}`;b.innerHTML=`<strong>${row.record.name||row.record.title||row.id||'(unnamed)'}</strong><small>${row.id}${row.record.role?` • ${row.record.role}`:''}${row.record.species?` • ${row.record.species}`:''}</small>`;els.recordList.append(b);}
  const hasCollection=!!state.collectionKey;els.newRecord.disabled=!hasCollection;const hasSelection=!!selectedRow();els.duplicateRecord.disabled=!hasSelection;els.deleteRecord.disabled=!hasSelection;els.exportPackage.disabled=!activePackage()?.data;
}
function renderInspector(){
  const row=selectedRow();els.recordEmpty.hidden=!!row;els.recordEditor.hidden=!row;els.fieldEditor.innerHTML='';if(!row)return;els.recordIdentity.textContent=`${labelFor(state.collectionKey)} • ${row.id}`;els.recordJson.value=JSON.stringify(row.record,null,2);
  for(const field of scalarFieldDescriptors(row.record)){
    const label=document.createElement('label');label.dataset.fieldKey=field.key;const title=document.createElement('span');title.textContent=field.label;label.append(title);
    let input;
    if(field.type==='boolean'){label.classList.add('check-field');input=document.createElement('input');input.type='checkbox';input.checked=!!field.value;label.prepend(input);}
    else if(field.type==='number'){input=document.createElement('input');input.type='number';input.value=String(field.value);label.append(input);}
    else if(String(field.value).length>80||/description|summary|text|notes?/i.test(field.key)){label.classList.add('wide');input=document.createElement('textarea');input.value=String(field.value);label.append(input);}
    else{input=document.createElement('input');input.type='text';input.value=String(field.value);label.append(input);}
    input.dataset.fieldInput=field.key;
  }
}
function renderValidation(){
  els.validationIssues.innerHTML='';if(!activePackage()?.data||!state.collectionKey){els.validationSummary.textContent='No collection selected.';return;}
  const issues=validateCollection(activePackage().data,state.collectionKey);els.validationSummary.textContent=issues.length?`${issues.length} issue(s)`:'No ID/registry errors';for(const issue of issues){const row=document.createElement('div');row.className=`page-row ${issue.severity}`;row.textContent=issue.message;els.validationIssues.append(row);}
}
function selectPackage(index){state.packageIndex=Number(index);state.collectionKey=null;state.selectedLocator=null;renderAll();}
function selectCollection(key){state.collectionKey=key;state.selectedLocator=null;renderAll();}
function selectRecord(locator){state.selectedLocator=locator;renderRecords();renderInspector();renderValidation();}
function applyFields(){
  const entry=activePackage(),row=selectedRow();if(!entry||!row)return;
  try{
    const fields={};for(const input of els.fieldEditor.querySelectorAll('[data-field-input]'))fields[input.dataset.fieldInput]=input.type==='checkbox'?input.checked:input.value;
    const next=applyScalarFields(row.record,fields);snapshot(`Edit ${row.id} fields`);replaceRecord(entry.data,state.collectionKey,row.locator,next);renderAll();selectRecord(row.locator);
  }catch(error){alert(`Fields not changed: ${error.message}`);}
}
function applyRecord(){
  const entry=activePackage(),row=selectedRow();if(!entry||!row)return;
  try{const next=JSON.parse(els.recordJson.value);snapshot(`Edit ${row.id} JSON`);replaceRecord(entry.data,state.collectionKey,row.locator,next);renderAll();selectRecord(row.locator);}
  catch(error){if(state.history.undo.at(-1)?.label===`Edit ${row.id} JSON`)state.history.undo.pop();updateHistoryButtons();alert(`Record not changed: ${error.message}`);}
}
function newRecord(){
  const entry=activePackage();if(!entry||!state.collectionKey)return;const seed={id:`new-${state.collectionKey.replace(/[^a-z0-9]+/gi,'-').toLowerCase()}-${Date.now().toString(36)}`,name:'New Record'};
  try{snapshot(`Create ${seed.id}`);addRecord(entry.data,state.collectionKey,seed);const row=collectionRecords(entry.data,state.collectionKey).at(-1);state.selectedLocator=row.locator;renderAll();}
  catch(error){alert(`Record not added: ${error.message}`);}
}
function duplicateRecord(){
  const entry=activePackage(),row=selectedRow();if(!entry||!row)return;const copy=clone(row.record);copy.id=`${row.id}-copy`;if(copy.name)copy.name=`${copy.name} Copy`;
  try{snapshot(`Duplicate ${row.id}`);addRecord(entry.data,state.collectionKey,copy);const next=collectionRecords(entry.data,state.collectionKey).find(candidate=>candidate.id===copy.id);state.selectedLocator=next?.locator??null;renderAll();}
  catch(error){alert(`Record not duplicated: ${error.message}`);}
}
function deleteRecord(){
  const entry=activePackage(),row=selectedRow();if(!entry||!row)return;if(!confirm(`Delete ${row.id}?`))return;
  try{snapshot(`Delete ${row.id}`);removeRecord(entry.data,state.collectionKey,row.locator);state.selectedLocator=null;renderAll();}
  catch(error){alert(`Record not deleted: ${error.message}`);}
}
function exportPackage(){
  const entry=activePackage();if(!entry?.data)return;const issues=state.collectionKey?validateCollection(entry.data,state.collectionKey):[];if(issues.some(issue=>issue.severity==='error')){alert('Fix database validation errors before export.');return;}const blob=new Blob([`${JSON.stringify(entry.data,null,2)}\n`],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=entry.path.split('/').at(-1)||`${entry.id}.json`;a.click();URL.revokeObjectURL(url);
}

els.loadDatabase.addEventListener('click',()=>loadProject().catch(error=>alert(`Database load failed: ${error.message}`)));
els.packageSearch.addEventListener('input',renderPackages);els.recordSearch.addEventListener('input',renderRecords);
els.packageList.addEventListener('click',event=>{const b=event.target.closest('[data-package-index]');if(b)selectPackage(b.dataset.packageIndex);});
els.collectionList.addEventListener('click',event=>{const b=event.target.closest('[data-collection-key]');if(b)selectCollection(b.dataset.collectionKey);});
els.recordList.addEventListener('click',event=>{const b=event.target.closest('[data-locator]');if(b)selectRecord(b.dataset.locator);});
els.applyFields.addEventListener('click',applyFields);els.applyRecord.addEventListener('click',applyRecord);els.newRecord.addEventListener('click',newRecord);els.duplicateRecord.addEventListener('click',duplicateRecord);els.deleteRecord.addEventListener('click',deleteRecord);els.exportPackage.addEventListener('click',exportPackage);els.undoDatabase.addEventListener('click',undo);els.redoDatabase.addEventListener('click',redo);

document.addEventListener('keydown',event=>{if(!(event.ctrlKey||event.metaKey))return;if(event.key.toLowerCase()==='z'){event.preventDefault();event.shiftKey?redo():undo();}else if(event.key.toLowerCase()==='y'){event.preventDefault();redo();}});

window.PlushboundDatabase={loadProject,getState:()=>state,getActivePackage:activePackage,getRows:activeRows,selectPackage,selectCollection,selectRecord,applyRecord,applyFields,undo,redo};
loadProject().catch(error=>{els.packageMeta.textContent=`Database load failed: ${error.message}`;});
