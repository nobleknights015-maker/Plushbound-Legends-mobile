import {contentReferenceRegistry,commandReferences} from './reference-audit-core.js';

function records(value){if(Array.isArray(value))return value;if(value&&typeof value==='object')return Object.values(value);return [];}
function packages(entries=[]){return (entries||[]).map((entry,index)=>entry&&typeof entry==='object'&&entry.data&&typeof entry.data==='object'?{sourceId:String(entry.sourceId||entry.id||`package-${index+1}`),data:entry.data}:{sourceId:String(entry?.__sourceId||`package-${index+1}`),data:entry||{}});}
function key(kind,id){return `${kind}:${String(id??'')}`;}
function node(kind,id,extra={}){return {key:key(kind,id),kind,id:String(id??''),label:String(extra.label??id??''),sourceId:extra.sourceId??null,collectionKey:extra.collectionKey??null,resolved:extra.resolved!==false};}
function edge(from,to,relation,extra={}){return {id:`${from}->${relation}->${to}${extra.qualifier?`#${extra.qualifier}`:''}`,from,to,relation,qualifier:extra.qualifier??null,source:extra.source??null};}

export function buildDependencyGraph(pkg={},contentPackages=[]){
  const registry=contentReferenceRegistry(contentPackages),nodes=new Map(),edges=[];
  const addNode=n=>{const existing=nodes.get(n.key);if(!existing||(!existing.resolved&&n.resolved))nodes.set(n.key,{...existing,...n});return nodes.get(n.key);};
  const addEdge=e=>{if(!edges.some(x=>x.id===e.id))edges.push(e);};
  const ensure=(kind,id,resolved=true,extra={})=>addNode(node(kind,id,{...extra,resolved}));

  for(const entry of packages(contentPackages)){
    const sourceId=entry.sourceId,data=entry.data;
    const addCollection=(collection,kind)=>{for(const record of records(data[collection]))if(record?.id!=null)ensure(kind,record.id,true,{label:record.name||record.title||record.id,sourceId,collectionKey:collection});};
    addCollection('quests','quest');addCollection('items','item');addCollection('shops','shop');addCollection('waystitches','waystitch');addCollection('enemies','enemy');addCollection('encounterTables','encounter');addCollection('npcs','npc');addCollection('namedCore','npc');
    for(const enemy of records(data.enemies))for(const tag of enemy?.tags||[])ensure('enemy-tag',tag,true,{label:tag,sourceId,collectionKey:'enemies'});
    for(const quest of records(data.quests)){
      if(quest?.id==null)continue;const from=key('quest',quest.id);ensure('quest',quest.id,true,{label:quest.name||quest.title||quest.id,sourceId,collectionKey:'quests'});
      for(const prerequisite of quest.prerequisites||[])if(prerequisite?.questComplete){const id=String(prerequisite.questComplete);ensure('quest',id,registry.quests.has(id));addEdge(edge(from,key('quest',id),'requires',{source:`quest:${quest.id}`}));}
      for(const reward of quest.rewards?.items||[])if(reward?.id){const id=String(reward.id);ensure('item',id,registry.items.has(id));addEdge(edge(from,key('item',id),'rewards',{source:`quest:${quest.id}`}));}
      for(const unlock of quest.unlocks||[])if(String(unlock).startsWith('waystitch-')){const id=String(unlock);ensure('waystitch',id,registry.waystitches.has(id));addEdge(edge(from,key('waystitch',id),'unlocks',{source:`quest:${quest.id}`}));}
      for(const objective of quest.objectives||[]){
        if(objective?.type==='talk'&&objective.target){const id=String(objective.target);ensure('npc',id,registry.npcs.has(id));addEdge(edge(from,key('npc',id),'talk-objective',{qualifier:String(objective.id||''),source:`quest:${quest.id}`}));}
        if(objective?.type==='battle'&&objective.targetTag){const id=String(objective.targetTag);ensure('enemy-tag',id,registry.enemyTags.has(id));addEdge(edge(from,key('enemy-tag',id),'battle-objective',{qualifier:String(objective.id||''),source:`quest:${quest.id}`}));}
      }
    }
    for(const shop of records(data.shops))if(shop?.id!=null){const from=key('shop',shop.id);for(const stock of shop.inventory||[])if(stock?.itemId){const id=String(stock.itemId);ensure('item',id,registry.items.has(id));addEdge(edge(from,key('item',id),'stocks',{source:`shop:${shop.id}`}));}}
    for(const table of records(data.encounterTables))if(table?.id!=null){const from=key('encounter',table.id);for(const row of table.entries||[])if(row?.enemyId){const id=String(row.enemyId);ensure('enemy',id,registry.enemies.has(id));addEdge(edge(from,key('enemy',id),'contains',{source:`encounter:${table.id}`}));}}
    for(const waystitch of records(data.waystitches))if(waystitch?.id!=null){const required=waystitch.unlockCondition?.questComplete;if(required){const id=String(required);ensure('quest',id,registry.quests.has(id));addEdge(edge(key('waystitch',waystitch.id),key('quest',id),'requires',{source:`waystitch:${waystitch.id}`}));}}
  }

  for(const map of pkg.maps||[]){
    const mapKey=key('map',map.id);ensure('map',map.id,true,{label:map.name||map.id});
    for(const event of map.events||[]){const eventId=`${map.id}/${event.id}`,eventKey=key('event',eventId);ensure('event',eventId,true,{label:event.name||event.id});addEdge(edge(mapKey,eventKey,'contains'));
    }
  }
  for(const ref of commandReferences(pkg)){
    const eventKey=key('event',`${ref.mapId}/${ref.eventId}`);ensure('event',`${ref.mapId}/${ref.eventId}`,true,{label:ref.eventId});let targetKind=ref.kind,targetId=ref.id,resolved=true;
    if(ref.kind==='quest-objective'){targetKind='quest';targetId=ref.id;resolved=registry.quests.has(ref.id)&&registry.questObjectives.get(ref.id)?.has(ref.objectiveId);}
    else if(ref.kind==='quest')resolved=registry.quests.has(ref.id);else if(ref.kind==='item')resolved=registry.items.has(ref.id);else if(ref.kind==='shop')resolved=registry.shops.has(ref.id);else if(ref.kind==='waystitch')resolved=registry.waystitches.has(ref.id);else if(ref.kind==='hook'){targetKind='hook';resolved=['quest.start','quest.objective','quest.complete','inventory.give','waystitch.activate'].includes(ref.id);}
    ensure(targetKind,targetId,resolved);addEdge(edge(eventKey,key(targetKind,targetId),ref.hook||ref.kind,{qualifier:ref.objectiveId||`${ref.pageIndex}:${ref.commandIndex}`,source:`${ref.mapId}/${ref.eventId}`}));
  }

  const nodeList=[...nodes.values()].sort((a,b)=>a.kind.localeCompare(b.kind)||a.id.localeCompare(b.id));
  const edgeList=edges.sort((a,b)=>a.from.localeCompare(b.from)||a.relation.localeCompare(b.relation)||a.to.localeCompare(b.to));
  return {nodes:nodeList,edges:edgeList,stats:{nodes:nodeList.length,edges:edgeList.length,unresolved:nodeList.filter(n=>!n.resolved).length}};
}

export function dependencyNeighborhood(graph,nodeKey,{depth=1}={}){
  const wanted=new Set([String(nodeKey)]),frontier=[String(nodeKey)];
  for(let d=0;d<Math.max(0,Number(depth)||0);d++){const next=[];for(const current of frontier)for(const e of graph.edges||[])if(e.from===current||e.to===current){const other=e.from===current?e.to:e.from;if(!wanted.has(other)){wanted.add(other);next.push(other);}}frontier.splice(0,frontier.length,...next);}
  return {nodes:(graph.nodes||[]).filter(n=>wanted.has(n.key)),edges:(graph.edges||[]).filter(e=>wanted.has(e.from)&&wanted.has(e.to))};
}

export function dependencyCycles(graph,{kinds=['quest','waystitch']}={}){
  const allowed=new Set(kinds),nodes=new Map((graph.nodes||[]).filter(n=>allowed.has(n.kind)).map(n=>[n.key,n])),adj=new Map([...nodes.keys()].map(k=>[k,[]]));
  for(const e of graph.edges||[])if(nodes.has(e.from)&&nodes.has(e.to))adj.get(e.from).push(e.to);
  const visiting=new Set(),visited=new Set(),stack=[],cycles=[];
  function walk(k){if(visiting.has(k)){const i=stack.indexOf(k);const cycle=[...stack.slice(i),k];const sig=cycle.join('>');if(!cycles.some(c=>c.join('>')===sig))cycles.push(cycle);return;}if(visited.has(k))return;visiting.add(k);stack.push(k);for(const n of adj.get(k)||[])walk(n);stack.pop();visiting.delete(k);visited.add(k);}
  for(const k of nodes.keys())walk(k);return cycles;
}

export function dependencyNodeLinks(graph,nodeKey){const incoming=[],outgoing=[];for(const e of graph.edges||[]){if(e.from===nodeKey)outgoing.push(e);if(e.to===nodeKey)incoming.push(e);}return {incoming,outgoing};}
