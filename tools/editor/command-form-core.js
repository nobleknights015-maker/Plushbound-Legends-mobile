export const VISUAL_COMMAND_FORMS={
  MESSAGE:{label:'Message',fields:[['text','textarea','Text'],['speaker','text','Speaker'],['portrait','text','Portrait asset']]},
  WAIT:{label:'Wait',fields:[['seconds','number','Seconds']]},
  SWITCH:{label:'Switch',fields:[['id','text','Switch ID'],['value','boolean','Value']]},
  SELF_SWITCH:{label:'Self Switch',fields:[['id','select','Self switch',['A','B','C','D']],['value','boolean','Value']]},
  VARIABLE:{label:'Variable',fields:[['id','text','Variable ID'],['value','json','Value']]},
  VARIABLE_OP:{label:'Variable Operation',fields:[['id','text','Variable ID'],['operation','select','Operation',['=','+','-','*','/']],['value','number','Value']]},
  TRANSFER:{label:'Transfer',fields:[['mapId','text','Map ID'],['x','number','X'],['y','number','Y'],['direction','select','Facing',[['2','Down'],['4','Left'],['6','Right'],['8','Up']]]]},
  SHOP:{label:'Shop',fields:[['shopId','text','Shop ID']]},
  BATTLE:{label:'Battle',fields:[['encounterId','text','Encounter ID']]},
  BGM:{label:'Play BGM',fields:[['assetId','text','BGM ID'],['options','json','Options']]},
  BGS:{label:'Play BGS',fields:[['assetId','text','BGS ID'],['options','json','Options']]},
  ME:{label:'Play ME',fields:[['assetId','text','ME ID'],['options','json','Options']]},
  SE:{label:'Play SE',fields:[['assetId','text','SE ID'],['options','json','Options']]},
  BGM_FADE:{label:'Fade BGM',fields:[['seconds','number','Seconds']]},
  BGS_FADE:{label:'Fade BGS',fields:[['seconds','number','Seconds']]},
  TRANSPARENCY:{label:'Transparency',fields:[['enabled','boolean','Transparent']]}
};

function jsonValue(value,fallback=null){try{return JSON.parse(value);}catch{return fallback;}}
export function visualFormSupported(code){return !!VISUAL_COMMAND_FORMS[String(code||'')];}

export function valuesFromParameters(code,parameters=[]){
  const p=Array.isArray(parameters)?parameters:[];
  switch(code){
    case 'MESSAGE': return {text:String(p[0]??''),speaker:String(p[1]?.speaker??''),portrait:String(p[1]?.portrait??'')};
    case 'WAIT': return {seconds:Number(p[0]??0)};
    case 'SWITCH': return {id:String(p[0]??''),value:!!p[1]};
    case 'SELF_SWITCH': return {id:String(p[0]??'A'),value:!!p[1]};
    case 'VARIABLE': return {id:String(p[0]??''),value:JSON.stringify(p[1]??0)};
    case 'VARIABLE_OP': return {id:String(p[0]??''),operation:String(p[1]??'='),value:Number(p[2]??0)};
    case 'TRANSFER': return {mapId:String(p[0]??''),x:Number(p[1]??0),y:Number(p[2]??0),direction:String(p[3]??2)};
    case 'SHOP': return {shopId:String(p[0]??'')};
    case 'BATTLE': return {encounterId:String(p[0]??'')};
    case 'BGM': case 'BGS': case 'ME': case 'SE': return {assetId:String(p[0]??''),options:JSON.stringify(p[1]??{})};
    case 'BGM_FADE': case 'BGS_FADE': return {seconds:Number(p[0]??1)};
    case 'TRANSPARENCY': return {enabled:!!p[0]};
    default:return {};
  }
}

export function parametersFromValues(code,values={}){
  switch(code){
    case 'MESSAGE': {const meta={};if(values.speaker)meta.speaker=String(values.speaker);if(values.portrait)meta.portrait=String(values.portrait);return Object.keys(meta).length?[String(values.text??''),meta]:[String(values.text??'')];}
    case 'WAIT': return [Math.max(0,Number(values.seconds)||0)];
    case 'SWITCH': return [String(values.id??''),!!values.value];
    case 'SELF_SWITCH': return [String(values.id??'A'),!!values.value];
    case 'VARIABLE': return [String(values.id??''),jsonValue(String(values.value??'0'),values.value)];
    case 'VARIABLE_OP': return [String(values.id??''),String(values.operation??'='),Number(values.value)||0];
    case 'TRANSFER': return [String(values.mapId??''),Math.max(0,Number(values.x)||0),Math.max(0,Number(values.y)||0),Number(values.direction)||2];
    case 'SHOP': return [String(values.shopId??'')];
    case 'BATTLE': return [String(values.encounterId??'')];
    case 'BGM': case 'BGS': case 'ME': case 'SE': return [String(values.assetId??''),jsonValue(String(values.options??'{}'),{})];
    case 'BGM_FADE': case 'BGS_FADE': return [Math.max(0,Number(values.seconds)||0)];
    case 'TRANSPARENCY': return [!!values.enabled];
    default:return null;
  }
}
