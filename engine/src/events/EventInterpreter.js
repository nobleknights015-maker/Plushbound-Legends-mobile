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
      if(this.index>=this.list.length){this.running=false;break;}
      const command=this.list[this.index++];
      const handler=this.commands.get(command.code);
      if(!handler){this.logger.error('Unknown event command',command);this.running=false;break;}
      const result=handler({interpreter:this,state:this.state,context:this.context,parameters:command.parameters||[],indent:command.indent||0});
      if(result?.waitSeconds)this.wait=Math.max(this.wait,result.waitSeconds);
      if(result?.jumpTo!=null)this.index=result.jumpTo;
      if(result?.stop)this.running=false;
      if(result?.yield)break;
    }
    if(safety<=0){this.logger.error('Event interpreter runaway detected');this.running=false;}
    return this.running;
  }
  jump(index){this.index=Math.max(0,Math.min(this.list.length,index|0));}
  stop(){this.running=false;}
}

export class EventCommandRegistry {
  constructor(){this.handlers=new Map();}
  register(code,handler){if(this.handlers.has(code))throw new Error(`Event command already registered: ${code}`);this.handlers.set(code,handler);return this;}
  get(code){return this.handlers.get(code);}
  has(code){return this.handlers.has(code);}
}

export function registerCoreEventCommands(registry,{ui,audio,map,battle}){
  registry
    .register('WAIT',({parameters})=>({waitSeconds:Number(parameters[0]||0)}))
    .register('SWITCH',({state,parameters})=>{state.setSw(parameters[0],parameters[1]);})
    .register('VARIABLE',({state,parameters})=>{state.setVariable(parameters[0],parameters[1]);})
    .register('SELF_SWITCH',({state,context,parameters})=>{state.setSelfSw(context.mapId,context.eventId,parameters[0],parameters[1]);})
    .register('MESSAGE',({parameters})=>{ui.message(parameters[0],parameters[1]||{});return{yield:true};})
    .register('CHOICE',({parameters})=>{ui.choice(parameters[0],parameters[1]||{});return{yield:true};})
    .register('TRANSFER',({parameters})=>{map.transfer(...parameters);return{yield:true};})
    .register('BGM',({parameters})=>audio.playBgm(...parameters))
    .register('BGS',({parameters})=>audio.playBgs(...parameters))
    .register('SE',({parameters})=>audio.playSe(...parameters))
    .register('BATTLE',({parameters})=>{battle.start(...parameters);return{yield:true};})
    .register('SCRIPT_HOOK',({context,parameters})=>{const [name,payload]=parameters;context.hooks?.emit?.(name,payload);});
  return registry;
}
