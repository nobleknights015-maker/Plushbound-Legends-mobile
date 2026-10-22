export class GameState {
  constructor() { this.reset(); }
  reset() {
    this.switches = new Map();
    this.variables = new Map();
    this.selfSwitches = new Map();
    this.party = [];
    this.actors = new Map();
    this.inventory = { items: new Map(), weapons: new Map(), armor: new Map() };
    this.quests = new Map();
    this.map = { id: null, x: 0, y: 0, direction: 2, vehicle: null };
    this.guardian = null;
    this.system = { playtimeMs: 0, saveCount: 0, steps: 0 };
  }
  sw(id) { return !!this.switches.get(String(id)); }
  setSw(id, value) { this.switches.set(String(id), !!value); }
  variable(id) { return this.variables.get(String(id)) ?? 0; }
  setVariable(id, value) { this.variables.set(String(id), value); }
  selfKey(mapId,eventId,key){ return `${mapId}:${eventId}:${key}`; }
  selfSw(mapId,eventId,key){ return !!this.selfSwitches.get(this.selfKey(mapId,eventId,key)); }
  setSelfSw(mapId,eventId,key,value){ this.selfSwitches.set(this.selfKey(mapId,eventId,key),!!value); }
  gain(kind,id,amount=1){ const bag=this.inventory[kind]; if(!bag) throw new Error(`Unknown inventory kind ${kind}`); const k=String(id); const next=Math.max(0,(bag.get(k)||0)+amount); if(next) bag.set(k,next); else bag.delete(k); return next; }
  count(kind,id){ const bag=this.inventory[kind]; if(!bag) throw new Error(`Unknown inventory kind ${kind}`); return Number(bag.get(String(id)) || 0); }
  serialize(){ return {switches:Object.fromEntries(this.switches),variables:Object.fromEntries(this.variables),selfSwitches:Object.fromEntries(this.selfSwitches),party:this.party,actors:Object.fromEntries(this.actors),inventory:{items:Object.fromEntries(this.inventory.items),weapons:Object.fromEntries(this.inventory.weapons),armor:Object.fromEntries(this.inventory.armor)},quests:Object.fromEntries(this.quests),map:this.map,guardian:this.guardian,system:this.system}; }
  restore(raw={}){ this.reset(); for(const [k,v] of Object.entries(raw.switches||{}))this.switches.set(k,!!v); for(const [k,v] of Object.entries(raw.variables||{}))this.variables.set(k,v); for(const [k,v] of Object.entries(raw.selfSwitches||{}))this.selfSwitches.set(k,!!v); this.party=[...(raw.party||[])]; for(const [k,v] of Object.entries(raw.actors||{}))this.actors.set(k,v); for(const type of ['items','weapons','armor'])for(const [k,v] of Object.entries(raw.inventory?.[type]||{}))this.inventory[type].set(k,v); for(const [k,v] of Object.entries(raw.quests||{}))this.quests.set(k,v); Object.assign(this.map,raw.map||{}); this.guardian=raw.guardian??null; Object.assign(this.system,raw.system||{}); }
}
