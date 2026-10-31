import {auditContentReferences} from './reference-audit-core.js';
import {buildDependencyGraph,dependencyNeighborhood,dependencyCycles,dependencyNodeLinks} from './dependency-graph-core.js';
import {diagnosticDestination} from './editor-navigation-core.js';

async function loadJson(url){const response=await fetch(url);if(!response.ok)throw new Error(`${response.status} ${url}`);return response.json();}
async function loadContentPackages(){
  const index=await loadJson(new URL('../../game/content/content-index.json',location.href));
  const packages=[];
  for(const entry of index.packages||[]){
    try{packages.push({sourceId:String(entry.id),data:await loadJson(new URL(`../../game/content/${entry.path}`,location.href))});}catch{}
  }
  return packages;
}
function panel(){
  const right=document.querySelector('.sidebar.right');if(!right)return null;
  let section=document.getElementById('projectReferenceAudit');if(section)return section;
  section=document.createElement('section');section.id='projectReferenceAudit';
  section.innerHTML='<h2>Project References</h2><div id="projectReferenceSummary" class="meta">Loading content references…</div><button id="refreshProjectReferences" type="button">Refresh References</button><div id="projectReferenceIssues" class="page-summary"></div>';
  const validation=document.getElementById('validationSummary')?.closest('section');
  validation?.after(section)||right.append(section);return section;
}
function graphPanel(){
  const right=document.querySelector('.sidebar.right');if(!right)return null;
  let section=document.getElementById('projectDependencyGraph');if(section)return section;
  section=document.createElement('section');section.id='projectDependencyGraph';section.innerHTML='<h2>Dependency Graph</h2><div id="dependencyGraphSummary" class="meta">Run reference audit to build graph.</div><label>Focus node<select id="dependencyGraphFocus"></select></label><label>Depth<select id="dependencyGraphDepth"><option value="1">1 hop</option><option value="2">2 hops</option></select></label><div id="dependencyGraphCycles" class="meta"></div><div id="dependencyGraphView" class="page-summary"></div>';
  panel()?.after(section)||right.append(section);return section;
}
function nodeDestination(node){
  if(node.kind==='event'){const [mapId,eventId]=String(node.id).split('/');return diagnosticDestination({mapId,eventId});}
  if(node.kind==='map')return diagnosticDestination({mapId:node.id});
  if(node.sourceId&&node.collectionKey)return diagnosticDestination({packageId:node.sourceId,collectionKey:node.collectionKey,recordId:node.id});
  return null;
}
function nodeButton(node,onFocus){const b=document.createElement('button');b.type='button';b.className='diagnostic-link';b.textContent=`${node.kind}: ${node.label||node.id}${node.resolved?'':' ⚠ unresolved'}`;b.addEventListener('click',()=>onFocus(node.key));return b;}
function renderGraph(graph,focusKey){
  const section=graphPanel();if(!section)return;
  const summary=section.querySelector('#dependencyGraphSummary'),select=section.querySelector('#dependencyGraphFocus'),cyclesHost=section.querySelector('#dependencyGraphCycles'),view=section.querySelector('#dependencyGraphView'),depth=Math.max(1,Number(section.querySelector('#dependencyGraphDepth')?.value)||1);
  summary.textContent=`${graph.stats.nodes} node(s) • ${graph.stats.edges} edge(s) • ${graph.stats.unresolved} unresolved`;
  const previous=focusKey||select.value;select.innerHTML='';for(const n of graph.nodes){const o=document.createElement('option');o.value=n.key;o.textContent=`${n.kind} • ${n.label||n.id}${n.resolved?'':' • unresolved'}`;select.append(o);}if(previous&&graph.nodes.some(n=>n.key===previous))select.value=previous;
  const focused=graph.nodes.find(n=>n.key===select.value)||graph.nodes[0];if(!focused){view.textContent='No dependency nodes.';cyclesHost.textContent='';return;}
  select.value=focused.key;const setFocus=key=>{select.value=key;renderGraph(graph,key);};const links=dependencyNodeLinks(graph,focused.key),hood=dependencyNeighborhood(graph,focused.key,{depth}),cycles=dependencyCycles(graph);
  cyclesHost.textContent=cycles.length?`${cycles.length} quest/Waystitch dependency cycle(s) detected`:'No quest/Waystitch dependency cycles detected';view.innerHTML='';
  const focus=document.createElement('div');focus.className=`page-row ${focused.resolved?'':'error'}`;const strong=document.createElement('strong');strong.textContent=`Focus • ${focused.kind}: ${focused.label||focused.id}`;focus.append(strong);const href=nodeDestination(focused);if(href){const a=document.createElement('a');a.className='diagnostic-link';a.href=href;a.textContent='Open Source';focus.append(a);}view.append(focus);
  const addGroup=(title,edgeList,direction)=>{const heading=document.createElement('div');heading.className='meta';heading.textContent=`${title} (${edgeList.length})`;view.append(heading);for(const e of edgeList){const otherKey=direction==='in'?e.from:e.to,other=graph.nodes.find(n=>n.key===otherKey);const row=document.createElement('div');row.className=`page-row ${other?.resolved===false?'error':''}`;const rel=document.createElement('span');rel.textContent=direction==='in'?`${e.relation} → `:`— ${e.relation} → `;row.append(rel);if(other)row.append(nodeButton(other,setFocus));else{const missing=document.createElement('span');missing.textContent=otherKey;row.append(missing);}view.append(row);}};
  addGroup('Incoming',links.incoming,'in');addGroup('Outgoing',links.outgoing,'out');
  if(depth>1){const extra=hood.nodes.filter(n=>n.key!==focused.key&&!links.incoming.some(e=>e.from===n.key)&&!links.outgoing.some(e=>e.to===n.key));if(extra.length){const h=document.createElement('div');h.className='meta';h.textContent=`Within ${depth} hops (${extra.length} additional)`;view.append(h);for(const n of extra){const row=document.createElement('div');row.className=`page-row ${n.resolved?'':'error'}`;row.append(nodeButton(n,setFocus));view.append(row);}}}
  select.onchange=()=>renderGraph(graph,select.value);section.querySelector('#dependencyGraphDepth').onchange=()=>renderGraph(graph,select.value);
}
async function audit(){
  if(!window.PlushboundEditor)return [];
  const section=panel();if(!section)return [];
  const summary=section.querySelector('#projectReferenceSummary'),issuesHost=section.querySelector('#projectReferenceIssues');
  try{
    const [contentPackages,pkg]=await Promise.all([loadContentPackages(),Promise.resolve(window.PlushboundEditor.getPackage())]);
    if(!pkg){summary.textContent='Load a package to audit references.';issuesHost.innerHTML='';return [];}
    const issues=auditContentReferences(pkg,contentPackages);summary.textContent=`${issues.length} project reference issue(s)`;issuesHost.innerHTML='';
    for(const issue of issues.slice(0,100)){
      const row=document.createElement('div');row.className='page-row error';
      const text=document.createElement('span');text.textContent=`${issue.location||`${issue.mapId||'content'}/${issue.eventId||issue.owner||'reference'}`} • ${issue.message}`;row.append(text);
      const destination=diagnosticDestination(issue);if(destination){const link=document.createElement('a');link.className='diagnostic-link';link.href=destination;link.textContent=issue.mapId?'Open Issue':issue.packageId?'Open Source':'Find Source';row.append(link);}
      issuesHost.append(row);
    }
    const graph=buildDependencyGraph(pkg,contentPackages);renderGraph(graph,document.querySelector('#dependencyGraphFocus')?.value);window.PlushboundReferenceAudit.graph=graph;return issues;
  }catch(error){summary.textContent=`Reference audit unavailable: ${error.message}`;issuesHost.innerHTML='';const graphSummary=graphPanel()?.querySelector('#dependencyGraphSummary');if(graphSummary)graphSummary.textContent=`Dependency graph unavailable: ${error.message}`;return [];}
}

if(window.PlushboundEditor){const section=panel();graphPanel();section?.querySelector('#refreshProjectReferences')?.addEventListener('click',audit);document.getElementById('loadElyndor')?.addEventListener('click',()=>setTimeout(audit,0));document.getElementById('runValidation')?.addEventListener('click',audit);window.PlushboundReferenceAudit={audit,graph:null};audit();}
