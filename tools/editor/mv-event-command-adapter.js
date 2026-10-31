// Reversible adapter between selected RPG Maker MV event commands and Plushbound editor commands.
// Only mappings that can be edited without guessing are exposed as normal editor cards.

function clone(v){return typeof structuredClone==='function'?structuredClone(v):JSON.parse(JSON.stringify(v));}
const OPS=Object.freeze(['=','+','-','*','/']);

function same(a,b){return JSON.stringify(a)===JSON.stringify(b);}
function terminate(list){const out=list.filter((command,index)=>!(command?.code===0&&index===list.length-1));while(out.at(-1)?.code===0)out.pop();out.push({code:0,indent:0,parameters:[]});return out;}
function mapped(code,parameters,original){const command={code,parameters:clone(parameters),mv:{original:clone(original)}};command.mv.baseline={code,parameters:clone(parameters)};return command;}
function raw(original){return {code:'MV_RAW',parameters:[clone(original)],mv:{raw:true,original:clone(original)}};}

export function mvCommandGroupAt(list,index){
  const command=list[index];
  if(!command||command.code===0)return {commands:command?[command]:[],next:index+1};
  // Plugin command continuation lines belong to code 356 only when represented as 356+continuations.
  if(command.code===356){const commands=[command];let i=index+1;while(list[i]?.code===655){commands.push(list[i]);i++;}return {commands,next:i};}
  return {commands:[command],next:index+1};
}

export function decodeMvCommandGroup(group){
  const original=clone(group);const command=group[0]||{};const p=command.parameters||[];
  switch(command.code){
    case 103: if(Number.isInteger(p[0])&&Number.isInteger(p[1])) return mapped('INPUT_NUMBER',[String(p[0]),{digits:p[1]}],original);
      break;
    case 115: return mapped('EXIT_EVENT',[],original);
    case 117: if(Number.isInteger(p[0])) return mapped('COMMON_EVENT',[String(p[0])],original);
      break;
    case 121: if(Number.isInteger(p[0])&&p[0]===p[1]&&(p[2]===0||p[2]===1)) return mapped('SWITCH',[String(p[0]),p[2]===0],original);
      break;
    case 122: if(Number.isInteger(p[0])&&p[0]===p[1]&&Number.isInteger(p[2])&&p[2]>=0&&p[2]<OPS.length&&p[3]===0&&Number.isFinite(p[4])) return mapped('VARIABLE_OP',[String(p[0]),OPS[p[2]],Number(p[4])],original);
      break;
    case 123: if(['A','B','C','D'].includes(String(p[0]))&&(p[1]===0||p[1]===1)) return mapped('SELF_SWITCH',[String(p[0]),p[1]===0],original);
      break;
    case 201: if(p[0]===0&&Number.isInteger(p[1])&&Number.isInteger(p[2])&&Number.isInteger(p[3])) return mapped('TRANSFER',[String(p[1]),p[2],p[3],Number(p[4])||2],original);
      break;
    case 230: if(Number.isFinite(p[0])) return mapped('WAIT',[Math.max(0,Number(p[0]))/60],original);
      break;
    case 356: {
      const line=group.map(c=>String(c.parameters?.[0]??'')).join('\n');
      return mapped('PLUGIN_COMMAND',[line],original);
    }
  }
  return raw(original);
}

export function decodeMvEventList(list=[]){
  const out=[];for(let i=0;i<list.length;){if(list[i]?.code===0)break;const group=mvCommandGroupAt(list,i);out.push(decodeMvCommandGroup(group.commands));i=group.next;}return out;
}

function unchanged(command){return !!command?.mv?.baseline&&same({code:command.code,parameters:command.parameters},command.mv.baseline);}
function originalOrNull(command){return unchanged(command)&&Array.isArray(command.mv?.original)?clone(command.mv.original):null;}
function indentOf(command){return Number.isInteger(command?.mv?.original?.[0]?.indent)?command.mv.original[0].indent:0;}

export function encodeEditorCommand(command){
  if(command?.code==='MV_RAW') return clone(command.mv?.original||command.parameters?.[0]||[]);
  const exact=originalOrNull(command);if(exact)return exact;
  const p=command?.parameters||[],indent=indentOf(command),original=command?.mv?.original?.[0];
  switch(command?.code){
    case 'INPUT_NUMBER': {const options=p[1]||{};return [{code:103,indent,parameters:[Math.max(0,Number(p[0])||0),Math.max(1,Math.floor(Number(options.digits)||1))]}];}
    case 'EXIT_EVENT': return [{code:115,indent,parameters:[]}];
    case 'COMMON_EVENT': return [{code:117,indent,parameters:[Math.max(0,Number(p[0])||0)]}];
    case 'SWITCH': {const id=Math.max(0,Number(p[0])||0);return [{code:121,indent,parameters:[id,id,p[1]?0:1]}];}
    case 'VARIABLE_OP': {const id=Math.max(0,Number(p[0])||0),op=OPS.indexOf(String(p[1]));if(op<0)throw new Error(`MV variable operation is not reversible: ${p[1]}`);return [{code:122,indent,parameters:[id,id,op,0,Number(p[2])||0]}];}
    case 'SELF_SWITCH': return [{code:123,indent,parameters:[String(p[0]||'A'),p[1]?0:1]}];
    case 'TRANSFER': {const fade=Array.isArray(original?.parameters)?original.parameters[5]:0;return [{code:201,indent,parameters:[0,Math.max(0,Number(p[0])||0),Math.max(0,Number(p[1])||0),Math.max(0,Number(p[2])||0),Number(p[3])||2,Number(fade)||0]}];}
    case 'WAIT': return [{code:230,indent,parameters:[Math.max(0,Math.round((Number(p[0])||0)*60))]}];
    case 'PLUGIN_COMMAND': {const lines=String(p[0]??'').split(/\r?\n/);return lines.map((line,index)=>({code:index===0?356:655,indent,parameters:[line]}));}
    default: throw new Error(`Editor command ${command?.code||'<missing>'} cannot be exported to MV without guessing`);
  }
}

export function encodeMvEventCommands(commands=[]){
  const out=[];for(const command of commands)out.push(...encodeEditorCommand(command));return terminate(out);
}

export function mvCommandEditable(command){return command?.code!=='MV_RAW';}
