const CONTINUOUS_TOOLS=new Set(['tile','erase-tile','region','erase-region','blocked','erase-blocked']);

export function isContinuousPaintTool(tool){return CONTINUOUS_TOOLS.has(String(tool||''));}

export function createStrokeState(){
  return {active:false,pointerId:null,tool:null,label:'Brush stroke',checkpointed:false,changed:0,visited:new Set(),lastX:null,lastY:null};
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
  state.lastX=null;state.lastY=null;
  return state.active;
}

export function gridStrokePoints(x0,y0,x1,y1){
  let ax=Math.floor(Number(x0)),ay=Math.floor(Number(y0)),bx=Math.floor(Number(x1)),by=Math.floor(Number(y1));
  if(![ax,ay,bx,by].every(Number.isFinite))return [];
  const points=[],dx=Math.abs(bx-ax),sx=ax<bx?1:-1,dy=-Math.abs(by-ay),sy=ay<by?1:-1;
  let err=dx+dy;
  while(true){
    points.push({x:ax,y:ay});
    if(ax===bx&&ay===by)break;
    const e2=2*err;
    if(e2>=dy){err+=dy;ax+=sx;}
    if(e2<=dx){err+=dx;ay+=sy;}
  }
  return points;
}

export function applyStrokePoint(state,{x,y,willChange=true,checkpoint,apply}={}){
  if(!state?.active)return {applied:false,changed:0,checkpointed:!!state?.checkpointed};
  const px=Math.floor(Number(x)),py=Math.floor(Number(y));
  if(!Number.isFinite(px)||!Number.isFinite(py))return {applied:false,changed:0,checkpointed:state.checkpointed};
  state.lastX=px;state.lastY=py;
  const key=`${px},${py}`;
  if(state.visited.has(key))return {applied:false,changed:0,checkpointed:state.checkpointed};
  state.visited.add(key);
  const needed=typeof willChange==='function'?!!willChange(px,py):!!willChange;
  if(!needed)return {applied:false,changed:0,checkpointed:state.checkpointed};
  if(!state.checkpointed){
    if(typeof checkpoint!=='function')throw new Error('First stroke mutation requires a checkpoint callback');
    checkpoint(state.label);
    state.checkpointed=true;
  }
  if(typeof apply!=='function')throw new Error('Stroke mutation requires an apply callback');
  const changed=Math.max(0,Number(apply(px,py))||0);
  state.changed+=changed;
  return {applied:true,changed,checkpointed:true};
}

export function applyStrokePath(state,{x,y,willChange=true,checkpoint,apply}={}){
  if(!state?.active)return {applied:false,changed:0,checkpointed:!!state?.checkpointed,points:0};
  const tx=Math.floor(Number(x)),ty=Math.floor(Number(y));
  if(!Number.isFinite(tx)||!Number.isFinite(ty))return {applied:false,changed:0,checkpointed:state.checkpointed,points:0};
  const hadAnchor=Number.isFinite(state.lastX)&&Number.isFinite(state.lastY);
  const points=hadAnchor?gridStrokePoints(state.lastX,state.lastY,tx,ty).slice(1):[{x:tx,y:ty}];
  let applied=false,changed=0;
  for(const point of points){
    const result=applyStrokePoint(state,{x:point.x,y:point.y,willChange,checkpoint,apply});
    applied=applied||result.applied;changed+=result.changed;
  }
  return {applied,changed,checkpointed:state.checkpointed,points:points.length};
}

export function endStroke(state){
  if(!state)return {changed:0,checkpointed:false};
  const result={changed:state.changed,checkpointed:state.checkpointed,tool:state.tool,label:state.label};
  state.active=false;state.pointerId=null;state.tool=null;state.checkpointed=false;state.changed=0;state.visited.clear();state.lastX=null;state.lastY=null;
  return result;
}

export function cancelStroke(state){return endStroke(state);}
