export function clone(value){return typeof structuredClone==='function'?structuredClone(value):JSON.parse(JSON.stringify(value));}

function isRecord(value){return !!value&&typeof value==='object'&&!Array.isArray(value);}
function isScalar(value){return value===null||['string','number','boolean'].includes(typeof value);}
function isPrimitiveList(value){return Array.isArray(value)&&value.every(isScalar);}
function isRecordList(value){return Array.isArray(value)&&value.every(isRecord);}
function recordId(record,fallback=''){return String(record?.id??fallback??'').trim();}

const COLLECTION_PROFILES={
  starters:{title:'Plush Guardians',description:'Guardian identity, bond role and presentation assets.',template:{id:'new-guardian',name:'New Guardian',species:'',role:'',bond:'',description:'',assetBindings:{sprite:'',portrait:'',silhouette:'',battle:''}}},
  enemies:{title:'Enemies',description:'Battle identity, level, stats, skills, rewards and assets.',template:{id:'new-enemy',name:'New Enemy',role:'',level:1,stats:{hp:1,mp:0,attack:1,defense:1,spirit:1,agility:1},tags:[],skills:[],rewards:{exp:0,gold:0,drops:[]},assets:{sprite:'',battle:'',portrait:''}}},
  encounterTables:{title:'Encounter Tables',description:'Weighted encounter groups referenced by map regions.',template:{id:'new-encounter-table',entries:[]}},
  bossEncounters:{title:'Boss Encounters',description:'One-time and story-gated regional boss encounters.',template:{id:'new-boss-encounter',mapId:'',enemyId:'',oneTime:true,completionSwitch:''}},
  namedCore:{title:'Named NPCs',description:'Persistent named NPC identity, home, occupation and quest role.',template:{id:'new-npc',name:'New NPC',ageBand:'adult',home:'',occupation:'',guardianFamily:'',questRole:''}},
  quests:{title:'Quests',description:'Quest stages, prerequisites, objectives, rewards and unlock flow.',template:{id:'new-quest',name:'New Quest',stage:1,giver:'',prerequisites:[],summary:'',objectives:[],rewards:{gold:0,items:[]},unlocks:[]}},
  shops:{title:'Shops',description:'Merchant inventories and economy-facing shop definitions.',template:{id:'new-shop',name:'New Shop',keeper:'',inventory:[]}},
  items:{title:'Items',description:'Consumables and inventory-facing item definitions.',template:{id:'new-item',name:'New Item'}},
  waystitches:{title:'Waystitches',description:'Travel and world-link definitions.',template:{id:'new-waystitch',name:'New Waystitch'}}
};

const NESTED_RECORD_TEMPLATES={
  entries:{enemyId:'',weight:1},
  inventory:{itemId:'',price:0},
  prerequisites:{questComplete:''},
  objectives:{id:'new-objective',type:'interact',target:'',count:1},
  'rewards.items':{id:'',count:1},
  'rewards.drops':{itemId:'',chance:0}
};

export function collectionProfile(key=''){
  const profile=COLLECTION_PROFILES[key];
  return profile?clone(profile):{title:labelFor(key),description:'Schema-preserving Plushbound content records.',template:{id:`new-${String(key).replace(/[^a-z0-9]+/gi,'-').toLowerCase()}`,name:'New Record'}};
}

export function newRecordTemplate(key,{suffix}={}){
  const record=clone(collectionProfile(key).template);
  const token=suffix||Date.now().toString(36);
  if(record.id) record.id=`${record.id}-${token}`;
  return record;
}

export function collectionDescriptors(pkg={}){
  const out=[];
  for(const [key,value] of Object.entries(pkg||{})){
    if(Array.isArray(value)&&value.every(item=>isRecord(item))){
      out.push({key,kind:'array',count:value.length,label:collectionProfile(key).title});
    }else if(isRecord(value)){
      const entries=Object.entries(value);
      if(entries.length&&entries.every(([,item])=>isRecord(item))){
        out.push({key,kind:'keyed',count:entries.length,label:collectionProfile(key).title});
      }
    }
  }
  return out;
}

export function collectionRecords(pkg,key){
  const value=pkg?.[key];
  if(Array.isArray(value)) return value.map((record,index)=>({record,locator:index,key:recordId(record,index),id:recordId(record,index)}));
  if(isRecord(value)) return Object.entries(value).filter(([,record])=>isRecord(record)).map(([registryKey,record])=>({record,locator:registryKey,key:registryKey,id:recordId(record,registryKey)}));
  return [];
}

export function validateCollection(pkg,key){
  const rows=collectionRecords(pkg,key);
  const ids=new Set();
  const issues=[];
  for(const row of rows){
    if(!row.id) issues.push({severity:'error',code:'missing-id',message:`${key} contains a record without an id`});
    else if(ids.has(row.id)) issues.push({severity:'error',code:'duplicate-id',id:row.id,message:`Duplicate ${key} id: ${row.id}`});
    else ids.add(row.id);
  }
  return issues;
}

export function validatePackageCollections(pkg={}){
  const issues=[];
  for(const descriptor of collectionDescriptors(pkg)) for(const issue of validateCollection(pkg,descriptor.key)) issues.push({...issue,collectionKey:descriptor.key,collectionLabel:descriptor.label});
  return issues;
}

function fieldGroup(path){
  const root=String(path).split('.')[0];
  if(root==='id'||root==='name'||root==='title'||root==='species'||root==='role'||root==='description'||root==='summary') return 'Identity';
  if(root==='stats'||root==='level'||root==='skills'||root==='tags'||root==='bond') return 'Gameplay';
  if(root==='rewards') return 'Rewards';
  if(root==='prerequisites'||root==='objectives'||root==='unlocks'||root==='stage'||root==='giver') return 'Quest Flow';
  if(root==='assets'||root==='assetBindings'||/asset|sprite|portrait|battle/i.test(root)) return 'Assets';
  if(['mapId','enemyId','oneTime','completionSwitch','home','occupation','guardianFamily','questRole','ageBand','keeper'].includes(root)) return 'World & Story';
  return 'Details';
}

function fieldDescriptor(path,value){
  const parts=path.split('.');
  return {key:path,label:parts.map(labelFor).join(' · '),type:isPrimitiveList(value)?'list':value===null?'string':typeof value,value:isPrimitiveList(value)?clone(value):(value??''),depth:parts.length-1,group:fieldGroup(path)};
}

export function recordFieldDescriptors(record={}){
  if(!isRecord(record)) return [];
  const fields=[];
  for(const [key,value] of Object.entries(record)){
    if(isScalar(value)||isPrimitiveList(value)){fields.push(fieldDescriptor(key,value));continue;}
    if(isRecord(value)) for(const [childKey,childValue] of Object.entries(value)) if(isScalar(childValue)||isPrimitiveList(childValue)) fields.push(fieldDescriptor(`${key}.${childKey}`,childValue));
  }
  return fields;
}

export function scalarFieldDescriptors(record={}){
  return recordFieldDescriptors(record).filter(field=>field.type!=='list');
}

function getPath(record,path){
  const parts=String(path).split('.');let current=record;
  for(const part of parts){if(!isRecord(current)||!Object.prototype.hasOwnProperty.call(current,part))return {exists:false};current=current[part];}
  return {exists:true,value:current,parts};
}

function setPath(record,path,value){
  const parts=String(path).split('.');let target=record;
  for(const part of parts.slice(0,-1)){if(!isRecord(target?.[part]))throw new Error(`Unknown nested path: ${path}`);target=target[part];}
  target[parts.at(-1)]=value;
}

export function nestedRecordListDescriptors(record={}){
  if(!isRecord(record)) return [];
  const out=[];
  const consider=(path,value)=>{
    if(!isRecordList(value))return;
    if(value.length||NESTED_RECORD_TEMPLATES[path])out.push({key:path,label:path.split('.').map(labelFor).join(' · '),group:fieldGroup(path),rows:clone(value),template:clone(NESTED_RECORD_TEMPLATES[path]||{})});
  };
  for(const [key,value] of Object.entries(record)){
    consider(key,value);
    if(isRecord(value))for(const [childKey,childValue] of Object.entries(value))consider(`${key}.${childKey}`,childValue);
  }
  return out;
}

export function nestedRecordTemplate(path=''){return clone(NESTED_RECORD_TEMPLATES[path]||{});}

export function replaceNestedRecord(record,path,index,nextRow){
  if(!isRecord(record)||!isRecord(nextRow))throw new Error('Nested row must be a JSON object');
  const next=clone(record);const found=getPath(next,path);
  if(!found.exists||!isRecordList(found.value))throw new Error(`Unknown nested record list: ${path}`);
  if(!Number.isInteger(index)||index<0||index>=found.value.length)throw new Error(`Unknown ${path} row`);
  found.value[index]=clone(nextRow);return next;
}

export function addNestedRecord(record,path,row){
  if(!isRecord(record))throw new Error('Record must be a JSON object');
  const next=clone(record);const found=getPath(next,path);
  if(!found.exists||!isRecordList(found.value))throw new Error(`Unknown nested record list: ${path}`);
  const value=row===undefined?nestedRecordTemplate(path):row;
  if(!isRecord(value))throw new Error('Nested row must be a JSON object');
  found.value.push(clone(value));return next;
}

export function removeNestedRecord(record,path,index){
  if(!isRecord(record))throw new Error('Record must be a JSON object');
  const next=clone(record);const found=getPath(next,path);
  if(!found.exists||!isRecordList(found.value))throw new Error(`Unknown nested record list: ${path}`);
  if(!Number.isInteger(index)||index<0||index>=found.value.length)throw new Error(`Unknown ${path} row`);
  found.value.splice(index,1);return next;
}

function parsePrimitiveList(input,current,pathLabel){
  if(Array.isArray(input)) return clone(input);
  const text=String(input??'').trim();
  if(!text) return [];
  let parsed;
  try{parsed=JSON.parse(text);}catch{parsed=text.split(/[\n,]/).map(value=>value.trim()).filter(Boolean);}
  if(!Array.isArray(parsed)||!parsed.every(isScalar)) throw new Error(`${pathLabel} must be a list of simple values`);
  const sample=current.find(value=>value!==null);
  if(typeof sample==='number') return parsed.map(value=>{const n=Number(value);if(!Number.isFinite(n))throw new Error(`${pathLabel} must contain numbers`);return n;});
  if(typeof sample==='boolean') return parsed.map(value=>value===true||value==='true'||value===1||value==='1');
  return parsed.map(value=>value===null?'':String(value));
}

export function applyRecordFields(record,fields={}){
  if(!isRecord(record)) throw new Error('Record must be a JSON object');
  const next=clone(record);
  for(const [path,input] of Object.entries(fields||{})){
    const found=getPath(next,path);if(!found.exists)continue;
    const current=found.value;const pathLabel=found.parts.map(labelFor).join(' · ');let value;
    if(isPrimitiveList(current)) value=parsePrimitiveList(input,current,pathLabel);
    else if(typeof current==='boolean') value=input===true||input==='true'||input===1||input==='1';
    else if(typeof current==='number'){
      value=Number(input);if(!Number.isFinite(value)) throw new Error(`${pathLabel} must be a number`);
    }else value=String(input??'');
    setPath(next,path,value);
  }
  return next;
}

export function applyScalarFields(record,fields={}){return applyRecordFields(record,fields);}

export function replaceRecord(pkg,key,locator,nextRecord){
  if(!isRecord(nextRecord)) throw new Error('Record must be a JSON object');
  const value=pkg?.[key];
  const candidate=clone(pkg);
  const candidateValue=candidate?.[key];
  if(Array.isArray(value)){
    if(!Number.isInteger(locator)||locator<0||locator>=value.length) throw new Error(`Unknown ${key} record`);
    candidateValue[locator]=clone(nextRecord);
  }else if(isRecord(value)){
    const registryKey=String(locator);
    if(!Object.prototype.hasOwnProperty.call(value,registryKey)) throw new Error(`Unknown ${key} record`);
    candidateValue[registryKey]=clone(nextRecord);
  }else throw new Error(`Unknown collection: ${key}`);
  const issues=validateCollection(candidate,key);
  if(issues.some(issue=>issue.severity==='error')) throw new Error(issues[0].message);
  if(Array.isArray(value)) value[locator]=clone(nextRecord);
  else value[String(locator)]=clone(nextRecord);
  return nextRecord;
}

export function addRecord(pkg,key,record,{registryKey}={}){
  if(!isRecord(record)) throw new Error('Record must be a JSON object');
  const value=pkg?.[key];
  const id=recordId(record,registryKey);
  if(!id) throw new Error('New database records require an id');
  if(collectionRecords(pkg,key).some(row=>row.id===id)) throw new Error(`Duplicate ${key} id: ${id}`);
  if(Array.isArray(value)) value.push(clone(record));
  else if(isRecord(value)){
    const targetKey=String(registryKey||id);
    if(Object.prototype.hasOwnProperty.call(value,targetKey)) throw new Error(`Duplicate ${key} key: ${targetKey}`);
    value[targetKey]=clone(record);
  }else throw new Error(`Unknown collection: ${key}`);
  return record;
}

export function removeRecord(pkg,key,locator){
  const value=pkg?.[key];
  if(Array.isArray(value)){
    if(!Number.isInteger(locator)||locator<0||locator>=value.length) throw new Error(`Unknown ${key} record`);
    return value.splice(locator,1)[0];
  }
  if(isRecord(value)){
    const registryKey=String(locator);
    if(!Object.prototype.hasOwnProperty.call(value,registryKey)) throw new Error(`Unknown ${key} record`);
    const removed=value[registryKey];delete value[registryKey];return removed;
  }
  throw new Error(`Unknown collection: ${key}`);
}

export function labelFor(key=''){
  return String(key).replace(/[-_]/g,' ').replace(/\b\w/g,c=>c.toUpperCase());
}

export function searchableRecordText(row){
  const record=row?.record||{};
  return `${row?.id||''} ${record.name||''} ${record.title||''} ${record.species||''} ${record.role||''} ${record.description||''} ${record.summary||''} ${(record.tags||[]).join?.(' ')||''} ${(record.skills||[]).join?.(' ')||''} ${(record.unlocks||[]).join?.(' ')||''}`.toLowerCase();
}
