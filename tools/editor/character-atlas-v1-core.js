export const CHARACTER_ATLAS_V1 = Object.freeze({
  id: 'plushbound-character-atlas-v1', version: '1.0', width: 2048, height: 1536, format: 'image/png'
});

const R=(id,role,x,y,width,height,required=false,group='misc')=>Object.freeze({id,role,x,y,width,height,required,group});
const sx=n=>Math.round(n*4/3), sy=n=>Math.round(n*3/2);
const rect=(id,role,x,y,w,h,required=false,group='misc')=>R(id,role,sx(x),sy(y),sx(w),sy(h),required,group);

const slots=[];
const portraits=['neutral','happy','angry','surprised','hurt','serious','smile','concerned'];
portraits.forEach((name,i)=>slots.push(rect(`portrait.${name}`,`portrait:${name}`,340+i*113,133,111,147,true,'portraits')));
const dirs=['down','left','right','up'];
for(let row=0;row<4;row++) for(let frame=0;frame<3;frame++) slots.push(rect(`field.${dirs[row]}.${frame+1}`,`field:${dirs[row]}:${frame+1}`,390+frame*73,353+row*66,72,66,true,'field'));
['front','side','back','talk','exclaim','think'].forEach((name,i)=>slots.push(rect(`idle.${name}`,`idle:${name}`,640+(i%3)*87,352+Math.floor(i/3)*152,85,151,false,'idle')));
['idle','attack','skill-cast','guard','hurt','ko'].forEach((name,i)=>slots.push(rect(`battle.${name}`,`battle:${name}`,907+(i%3)*111,354+Math.floor(i/3)*151,109,147,true,'battle')));
[128,281,417].forEach((y,i)=>slots.push(rect(`cutscene.${i+1}`,`cutscene:${i+1}`,1254,y,266,i===1?133:151,false,'cutscene')));
['base','weapon-right','weapon-left','shield','cape-cloak','accessory-1','accessory-2','outfit-variant','base-alt'].forEach((name,i)=>slots.push(rect(`equipment.${name}`,`equipment:${name}`,9+i*89,692,88,151,false,'equipment')));
['victory','cast-alt','run-dynamic','jump'].forEach((name,i)=>slots.push(rect(`extra.${name}`,`extra:${name}`,824+i*104,692,102,151,false,'extra')));
['slash','hit','magic','footsteps','sparkles','dash','other'].forEach((name,i)=>slots.push(rect(`effect.${name}`,`effect:${name}`,9+i*108,887,106,121,false,'effects')));
slots.push(rect('palette.reference','palette:reference',781,887,229,121,false,'palette'));
slots.push(rect('palette.alt','palette:alt',1011,887,229,121,false,'palette'));

export const CHARACTER_ATLAS_V1_SLOTS=Object.freeze(slots);

export function atlasV1Slot(id){return CHARACTER_ATLAS_V1_SLOTS.find(slot=>slot.id===id)||null;}
export function atlasV1Groups(){return [...new Set(CHARACTER_ATLAS_V1_SLOTS.map(slot=>slot.group))];}

export function validateCharacterAtlasV1Descriptor(input={}){
  const issues=[];
  const width=Number(input.width),height=Number(input.height),type=String(input.type||input.mimeType||'').toLowerCase();
  if(width!==CHARACTER_ATLAS_V1.width||height!==CHARACTER_ATLAS_V1.height) issues.push({severity:'error',code:'ATLAS_DIMENSIONS_MISMATCH',message:`Character Atlas v1 must be ${CHARACTER_ATLAS_V1.width}×${CHARACTER_ATLAS_V1.height}; received ${width||'?'}×${height||'?'}`,expected:[CHARACTER_ATLAS_V1.width,CHARACTER_ATLAS_V1.height],actual:[width,height]});
  if(type&&type!=='image/png') issues.push({severity:'error',code:'ATLAS_FORMAT_MISMATCH',message:`Character Atlas v1 must be PNG; received ${type}`,expected:'image/png',actual:type});
  for(const slot of CHARACTER_ATLAS_V1_SLOTS){if(slot.x<0||slot.y<0||slot.width<=0||slot.height<=0||slot.x+slot.width>CHARACTER_ATLAS_V1.width||slot.y+slot.height>CHARACTER_ATLAS_V1.height) issues.push({severity:'error',code:'ATLAS_SLOT_OUT_OF_BOUNDS',slotId:slot.id,message:`Locked slot ${slot.id} is outside the v1 canvas`});}
  return {ok:!issues.some(issue=>issue.severity==='error'),template:CHARACTER_ATLAS_V1,issues};
}

export function compileCharacterAtlasV1Manifest({characterId,name='',sourceName='',width,height,type='image/png'}={}){
  const id=String(characterId||'').trim(); if(!id) throw new Error('Character Atlas v1 requires characterId');
  const validation=validateCharacterAtlasV1Descriptor({width,height,type});
  if(!validation.ok){const error=new Error(validation.issues.map(issue=>issue.message).join('; '));error.code='CHARACTER_ATLAS_V1_INVALID';error.validation=validation;throw error;}
  return {schemaVersion:1,kind:'plushbound-character-atlas',templateId:CHARACTER_ATLAS_V1.id,templateVersion:CHARACTER_ATLAS_V1.version,character:{id,name:String(name||id)},source:{name:String(sourceName||''),width:Number(width),height:Number(height),type:'image/png'},slots:CHARACTER_ATLAS_V1_SLOTS.map(slot=>({...slot,assetId:`character/${id}/${slot.id.replaceAll('.','/')}`}))};
}

export function atlasV1CropPlan(manifest){
  if(manifest?.templateId!==CHARACTER_ATLAS_V1.id||manifest?.templateVersion!==CHARACTER_ATLAS_V1.version) throw new Error('Unsupported Character Atlas manifest');
  return manifest.slots.map(slot=>({assetId:slot.assetId,slotId:slot.id,role:slot.role,group:slot.group,required:slot.required,source:{x:slot.x,y:slot.y,width:slot.width,height:slot.height}}));
}

export function atlasV1AssetEntries(manifest,{status='generated'}={}){
  return atlasV1CropPlan(manifest).map(item=>({id:item.assetId,type:item.group==='field'?'character-sprite':item.group==='battle'?'character-battle-sprite':item.group==='portraits'||item.group==='cutscene'?'character-portrait':'character-atlas-slice',status,atlas:{templateId:manifest.templateId,templateVersion:manifest.templateVersion,characterId:manifest.character.id,slotId:item.slotId,source:item.source}}));
}
