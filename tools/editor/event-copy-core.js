export function clone(value){return typeof structuredClone==='function'?structuredClone(value):JSON.parse(JSON.stringify(value));}

export function nextEventId(map,sourceId='event'){
  const ids=new Set((map?.events||[]).map(event=>String(event.id)));
  const base=`${String(sourceId||'event').trim()||'event'}-copy`;
  if(!ids.has(base))return base;
  let index=2;while(ids.has(`${base}-${index}`))index++;
  return `${base}-${index}`;
}

function clampCoordinate(value,max){return Math.max(0,Math.min(Math.max(0,max-1),Math.floor(Number(value)||0)));}

export function eventClipboardPayload(event){
  if(!event||typeof event!=='object'||!String(event.id||'').trim())throw new Error('A valid event is required');
  return {kind:'plushbound-map-event',schemaVersion:1,event:clone(event)};
}

export function pasteEventPayload(map,payload,{id,x,y,offsetX=1,offsetY=1}={}){
  if(!map||!Array.isArray(map.events)||!Number.isInteger(map.width)||!Number.isInteger(map.height))throw new Error('A valid target map is required');
  if(!payload||payload.kind!=='plushbound-map-event'||payload.schemaVersion!==1||!payload.event)throw new Error('Unsupported event clipboard payload');
  const source=payload.event;
  const targetId=String(id||nextEventId(map,source.id)).trim();
  if(!targetId)throw new Error('Event ID is required');
  if(map.events.some(event=>String(event.id)===targetId))throw new Error(`Event already exists: ${targetId}`);
  const copy=clone(source);
  copy.id=targetId;
  copy.x=clampCoordinate(x??(Number(source.x)||0)+Number(offsetX||0),map.width);
  copy.y=clampCoordinate(y??(Number(source.y)||0)+Number(offsetY||0),map.height);
  if(!Array.isArray(copy.pages))copy.pages=[];
  map.events.push(copy);
  return copy;
}

export function duplicateEvent(map,eventId,options={}){
  const source=(map?.events||[]).find(event=>String(event.id)===String(eventId));
  if(!source)throw new Error(`Unknown event: ${eventId}`);
  return pasteEventPayload(map,eventClipboardPayload(source),options);
}
