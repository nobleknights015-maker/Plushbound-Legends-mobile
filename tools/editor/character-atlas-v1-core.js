export const CHARACTER_ATLAS_V1 = Object.freeze({
  id: 'plushbound-character-atlas-v1', version: '1.0', width: 1536, height: 1024, format: 'image/png', layout: 'native-1536x1024'
});

const R=(id,role,x,y,width,height,required=false,group='misc')=>Object.freeze({id,role,x,y,width,height,required,group});
const slots=[];

// Native 1536×1024 Character Atlas v1 layout. Coordinates are owned by this
// contract and deliberately do not depend on artwork detection or scaling.
const portraits=['neutral','happy','angry','surprised','hurt','serious','smile','concerned'];
portraits.forEach((name,i)=>slots.push(R(`portrait.${name}`,`portrait:${name}`,363+(i%4)*94,151+Math.floor(i/4)*133,91,123,true,'portraits')));
const dirs=['down','left','right','up'];
for(let row=0;row<4;row++) for(let frame=0;frame<3;frame++) slots.push(R(`field.${dirs[row]}.${frame+1}`,`field:${dirs[row]}:${frame+1}`,811+frame*80,151+row*68,75,64,true,'field'));
['front','side','back','talk','exclaim','think'].forEach((name,i)=>slots.push(R(`idle.${name}`,`idle:${name}`,1073+(i%3)*82,151+Math.floor(i/3)*134,78,124,false,'idle')));
['idle','attack','skill-cast','guard','hurt','ko'].forEach((name,i)=>slots.push(R(`battle.${name}`,`battle:${name}`,363+(i%3)*94,474+Math.floor(i/3)*112,91,84,true,'battle')));
[659,755,851].forEach((x,i)=>slots.push(R(`cutscene.${i+1}`,`cutscene:${i+1}`,x,474,91,197,false,'cutscene')));
['base','weapon-right','weapon-left','shield','cape-cloak','accessory-1','accessory-2','outfit-variant'].forEach((name,i)=>slots.push(R(`equipment.${name}`,`equipment:${name}`,1004+(i%4)*81,474+Math.floor(i/4)*112,77,84,false,'equipment')));
['victory','cast-alt','run-dynamic','jump'].forEach((name,i)=>slots.push(R(`extra.${name}`,`extra:${name}`,16+i*112,744,104,91,false,'extra')));
['slash','hit','magic','footsteps','sparkles','dash','other'].forEach((name,i)=>slots.push(R(`effect.${name}`,`effect:${name}`,498+i*104,744,99,91,false,'effects')));
slots.push(R('palette.reference','palette:reference',20,884,310,116,false,'palette'));
slots.push(R('palette.alt','palette:alt',346,884,321,116,false,'palette'));

export const CHARACTER_ATLAS_V1_SLOTS=Object.freeze(slots);
export function atlasV1Slot(id){return CHARACTER_ATLAS_V1_SLOTS.find(slot=>slot.id===id)||null;}
export function atlasV1Groups(){return [...new Set(CHARACTER_ATLAS_V1_SLOTS.map(slot=>slot.group))];}

export function validateCharacterAtlasV1Descriptor(input={}){
  const issues=[];
  const width=Number(input.width),height=Number(input.height),type=String(input.type||input.mimeType||'').toLowerCase();
  if(width!==CHARACTER_ATLAS_V1.width||height!==CHARACTER_ATLAS_V1.height) issues.push({severity:'error',code:'ATLAS_DIMENSIONS_MISMATCH',message:`Character Atlas v1 must be ${CHARACTER_ATLAS_V1.width}×${CHARACTER_ATLAS_V1.height}; received ${width||'?'}×${height||'?'}`,expected:[CHARACTER_ATLAS_V1.width,CHARACTER_ATLAS_V1.height],actual:[width,height]});
  if(type!=='image/png') issues.push({severity:'error',code:'ATLAS_FORMAT_MISMATCH',message:`Character Atlas v1 must be a true PNG; received ${type||'unknown format'}`,expected:'image/png',actual:type||''});
  for(const slot of CHARACTER_ATLAS_V1_SLOTS){if(slot.x<0||slot.y<0||slot.width<=0||slot.height<=0||slot.x+slot.width>CHARACTER_ATLAS_V1.width||slot.y+slot.height>CHARACTER_ATLAS_V1.height) issues.push({severity:'error',code:'ATLAS_SLOT_OUT_OF_BOUNDS',slotId:slot.id,message:`Locked slot ${slot.id} is outside the v1 canvas`});}
  return {ok:!issues.some(issue=>issue.severity==='error'),template:CHARACTER_ATLAS_V1,issues};
}

export function compileCharacterAtlasV1Manifest({characterId,name='',sourceName='',width,height,type=''}={}){
  const id=String(characterId||'').trim(); if(!id) throw new Error('Character Atlas v1 requires characterId');
  const validation=validateCharacterAtlasV1Descriptor({width,height,type});
  if(!validation.ok){const error=new Error(validation.issues.map(issue=>issue.message).join('; '));error.code='CHARACTER_ATLAS_V1_INVALID';error.validation=validation;throw error;}
  return {schemaVersion:1,kind:'plushbound-character-atlas',templateId:CHARACTER_ATLAS_V1.id,templateVersion:CHARACTER_ATLAS_V1.version,layout:CHARACTER_ATLAS_V1.layout,character:{id,name:String(name||id)},source:{name:String(sourceName||''),width:Number(width),height:Number(height),type:'image/png'},slots:CHARACTER_ATLAS_V1_SLOTS.map(slot=>({...slot,assetId:`character/${id}/${slot.id.replaceAll('.','/')}`}))};
}

export function atlasV1CropPlan(manifest){
  if(manifest?.templateId!==CHARACTER_ATLAS_V1.id||manifest?.templateVersion!==CHARACTER_ATLAS_V1.version) throw new Error('Unsupported Character Atlas manifest');
  if(manifest?.source?.width!==CHARACTER_ATLAS_V1.width||manifest?.source?.height!==CHARACTER_ATLAS_V1.height||manifest?.source?.type!=='image/png') throw new Error('Character Atlas manifest source does not match locked v1 canvas');
  return manifest.slots.map(slot=>({assetId:slot.assetId,slotId:slot.id,role:slot.role,group:slot.group,required:slot.required,source:{x:slot.x,y:slot.y,width:slot.width,height:slot.height}}));
}

export function atlasV1AssetEntries(manifest,{status='generated'}={}){
  return atlasV1CropPlan(manifest).map(item=>({id:item.assetId,type:item.group==='field'?'character-sprite':item.group==='battle'?'character-battle-sprite':item.group==='portraits'||item.group==='cutscene'?'character-portrait':'character-atlas-slice',status,atlas:{templateId:manifest.templateId,templateVersion:manifest.templateVersion,characterId:manifest.character.id,slotId:item.slotId,source:item.source}}));
}