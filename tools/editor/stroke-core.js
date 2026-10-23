const CONTINUOUS_TOOLS=new Set(['tile','erase-tile','region','erase-region','blocked','erase-blocked']);

export function isContinuousPaintTool(tool){return CONTINUOUS_TOOLS.has(String(tool||''));}

export function createStrokeState(){
  return {active:false,pointerId:null,tool:null,label:'Brush stroke',checkpointed:false,changed:0,visited:new Set()};
}

export function beginStroke(state,{pointerId=null,tool,label='Brush stroke'}={}){
  if(!state)throw new Error('Stroke state is required');
  state.active=isContinuousPaintTool(tool);
  state.pointerId=pointerId;
  state.tool=state.active?String(tool):null;
  state.label=String(label||'Brush stroke');
  state.checkpointed=false;
  state.changed=0;
  state.visited.clear();
  return state.active;
}

export function applyStrokePoint(state,{x,y,willChange=true,checkpoint,apply}={}){
  if(!state?.active)return {applied:false,changed:0,checkpointed:!!state?.checkpointed};
  const px=Number(x),py=Number(y);
  if(!Number.isFinite(px)||!Number.isFinite(py))return {applied:false,changed:0,checkpointed:state.checkpointed};
  const key=`${Math.floor(px)},${Math.floor(py)}`;
  if(state.visited.has(key))return {applied:false,changed:0,checkpointed:state.checkpointed};
  state.visited.add(key);
  const needed=typeof willChange==='function'?!!willChange():!!willChange;
  if(!needed)return {applied:false,changed:0,checkpointed:state.checkpointed};
  if(!state.checkpointed){
    if(typeof checkpoint!=='function')throw new Error('First stroke mutation requires a checkpoint callback');
    checkpoint(state.label);
    state.checkpointed=true;
  }
  if(typeof apply!=='function')throw new Error('Stroke mutation requires an apply callback');
  const changed=Math.max(0,Number(apply())||0);
  state.changed+=changed;
  return {applied:true,changed,checkpointed:true};
}

export function endStroke(state){
  if(!state)return {changed:0,checkpointed:false};
  const result={changed:state.changed,checkpointed:state.checkpointed,tool:state.tool,label:state.label};
  state.active=false;state.pointerId=null;state.tool=null;state.checkpointed=false;state.changed=0;state.visited.clear();
  return result;
}

export function cancelStroke(state){return endStroke(state);}
