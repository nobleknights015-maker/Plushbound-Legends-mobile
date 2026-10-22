export class EventInterpreter {
  constructor({ commands, state, logger = console }) {
    this.commands = commands;
    this.state = state;
    this.logger = logger;
    this.clear();
  }
  clear(){ this.list=[];this.index=0;this.stack=[];this.wait=0;this.running=false;this.context=null; }
  start(list,context={}){ this.clear();this.list=Array.isArray(list)?list:[];this.context=context;this.running=true; }
  update(dt){
    if(!this.running)return false;
    if(this.wait>0){this.wait=Math.max(0,this.wait-dt);return true;}
    let safety=100;
    while(this.running&&this.wait<=0&&safety-->0){
      if(this.index>=this.list.length){
        if(this.stack.length){
          const frame=this.stack.pop();
          this.list=frame.list;
          this.index=frame.index;
          this.context=frame.context;
          continue;
        }
        this.running=false;
        break;
      }
      const command=this.list[this.index++];
      const handler=this.commands.get(command.code);
      if(!handler){this.logger.error('Unknown event command',command);this.running=false;break;}
      const result=handler({interpreter:this,state:this.state,context:this.context,parameters:command.parameters||[],indent:command.indent||0,command});
      if(result?.waitSeconds)this.wait=Math.max(this.wait,result.waitSeconds);
      if(result?.jumpTo!=null)this.index=result.jumpTo;
      if(result?.stop)this.running=false;
      if(result?.yield)break;
    }
    if(safety<=0){this.logger.error('Event interpreter runaway detected');this.running=false;}
    return this.running;
  }
  jump(index){this.index=Math.max(0,Math.min(this.list.length,index|0));}
  call(list,context=this.context){
    this.stack.push({list:this.list,index:this.index,context:this.context});
    this.list=Array.isArray(list)?list:[];
    this.index=0;
    this.context=context;
  }
  stop(){this.running=false;}
}

export class EventCommandRegistry {
  constructor(){this.handlers=new Map();}
  register(code,handler){if(this.handlers.has(code))throw new Error(`Event command already registered: ${code}`);this.handlers.set(code,handler);return this;}
  get(code){return this.handlers.get(code);}
  has(code){return this.handlers.has(code);}
}

function compare(left,op,right){
  if(op==='===')return left===right;
  if(op==='!==')return left!==right;
  if(op==='>')return left>right;
  if(op==='>=')return left>=right;
  if(op==='<')return left<right;
  if(op==='<=')return left<=right;
  return left==right;
}

export function registerCoreEventCommands(registry,{ui={},audio={},map={},battle={},screen={},movement={},player={}}={}){
  registry
    .register('WAIT',({parameters})=>({waitSeconds:Number(parameters[0]||0)}))
    .register('SWITCH',({state,parameters})=>{state.setSw(parameters[0],parameters[1]);})
    .register('VARIABLE',({state,parameters})=>{state.setVariable(parameters[0],parameters[1]);})
    .register('VARIABLE_OP',({state,parameters})=>{
      const [id,op,value]=parameters; const current=Number(state.variable(id)); const n=Number(value);
      if(op==='+')state.setVariable(id,current+n); else if(op==='-')state.setVariable(id,current-n); else if(op==='*')state.setVariable(id,current*n); else if(op==='/')state.setVariable(id,n===0?current:current/n); else state.setVariable(id,value);
    })
    .register('SELF_SWITCH',({state,context,parameters})=>{state.setSelfSw(context.mapId,context.eventId,parameters[0],parameters[1]);})
    .register('CONDITIONAL',({state,parameters})=>{
      const [kind,id,op='===',value=true,falseJump=null]=parameters;
      let left;
      if(kind==='switch')left=state.sw(id);
      else if(kind==='variable')left=state.variable(id);
      else if(kind==='item')left=state.count('items',id);
      else left=false;
      if(!compare(left,op,value)&&falseJump!=null)return{jumpTo:Number(falseJump)};
    })
    .register('JUMP',({parameters})=>({jumpTo:Number(parameters[0]||0)}))
    .register('EXIT_EVENT',()=>({stop:true}))
    .register('COMMON_EVENT',({interpreter,context,parameters})=>{
      const id=String(parameters[0]); const list=context?.commonEvents?.[id]||context?.commonEvents?.get?.(id);
      if(!list)throw new Error(`Unknown common event ${id}`);
      interpreter.call(list,{...context,commonEventId:id});
    })
    .register('MESSAGE',({parameters})=>{ui.message?.(parameters[0],parameters[1]||{});return{yield:true};})
    .register('CHOICE',({context,parameters})=>{const result=ui.choice?.(parameters[0],parameters[1]||{});if(result!==undefined)context.lastChoice=result;return{yield:true};})
    .register('INPUT_NUMBER',({state,parameters})=>{const [variableId,options={}]=parameters;const value=ui.inputNumber?.(options);if(value!==undefined)state.setVariable(variableId,value);return{yield:true};})
    .register('TRANSFER',({parameters})=>{map.transfer?.(...parameters);return{yield:true};})
    .register('MOVE_ROUTE',({parameters})=>{movement.route?.(...parameters);return parameters[1]?.wait?{yield:true}:undefined;})
    .register('RELOCATE_EVENT',({parameters})=>map.relocateEvent?.(...parameters))
    .register('ERASE_EVENT',({context})=>map.eraseEvent?.(context.mapId,context.eventId))
    .register('TRANSPARENCY',({parameters})=>player.setTransparent?.(!!parameters[0]))
    .register('FADE_SCREEN',({parameters})=>{screen.fade?.(...parameters);return parameters[1]?{waitSeconds:Number(parameters[1])}:undefined;})
    .register('TINT_SCREEN',({parameters})=>screen.tint?.(...parameters))
    .register('FLASH_SCREEN',({parameters})=>screen.flash?.(...parameters))
    .register('SHAKE_SCREEN',({parameters})=>screen.shake?.(...parameters))
    .register('BGM',({parameters})=>audio.playBgm?.(...parameters))
    .register('BGM_STOP',({parameters})=>audio.stopBgm?.(...parameters))
    .register('BGM_FADE',({parameters})=>audio.fadeBgm?.(...parameters))
    .register('BGS',({parameters})=>audio.playBgs?.(...parameters))
    .register('BGS_STOP',({parameters})=>audio.stopBgs?.(...parameters))
    .register('BGS_FADE',({parameters})=>audio.fadeBgs?.(...parameters))
    .register('ME',({parameters})=>audio.playMe?.(...parameters))
    .register('SE',({parameters})=>audio.playSe?.(...parameters))
    .register('BATTLE',({context,parameters})=>{const result=battle.start?.(...parameters);if(result!==undefined)context.lastBattleResult=result;return{yield:true};})
    .register('SHOP',({context,parameters})=>{context.shopResult=ui.shop?.(...parameters);return{yield:true};})
    .register('SCRIPT_HOOK',({context,parameters})=>{const [name,payload]=parameters;context.hooks?.emit?.(name,payload);});
  return registry;
}
