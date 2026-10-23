export function clone(value){return typeof structuredClone==='function'?structuredClone(value):JSON.parse(JSON.stringify(value));}

function isRecord(value){return !!value&&typeof value==='object'&&!Array.isArray(value);}
function recordId(record,fallback=''){return String(record?.id??fallback??'').trim();}

export function collectionDescriptors(pkg={}){
  const out=[];
  for(const [key,value] of Object.entries(pkg||{})){
    if(Array.isArray(value)&&value.every(item=>isRecord(item))){
      out.push({key,kind:'array',count:value.length,label:labelFor(key)});
    }else if(isRecord(value)){
      const entries=Object.entries(value);
      if(entries.length&&entries.every(([,item])=>isRecord(item))){
        out.push({key,kind:'keyed',count:entries.length,label:labelFor(key)});
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
  return `${row?.id||''} ${record.name||''} ${record.title||''} ${record.species||''} ${record.role||''} ${record.description||''}`.toLowerCase();
}
