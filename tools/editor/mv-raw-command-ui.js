export function mvRawCommandSummary(parameters){
  const outer=Array.isArray(parameters)?parameters:[];
  const group=Array.isArray(outer[0])?outer[0]:outer;
  const commands=group.filter(command=>command&&Number.isInteger(command.code));
  if(!commands.length)return 'Raw MV command data is preserved read-only because no reversible editor mapping is available.';
  const codes=commands.map(command=>command.code).join(' + ');
  const indents=[...new Set(commands.map(command=>Number(command.indent)||0))].join(', ');
  return `MV code ${codes} • indent ${indents} • preserved read-only because no proven reversible Plushbound mapping is available.`;
}

function enhance(root=document){
  for(const card of root.querySelectorAll?.('.command-card')||[]){
    if(card.dataset.mvRawExplained==='1')continue;
    const head=card.querySelector('.command-head');if(!head?.textContent?.includes('MV_RAW'))continue;
    card.dataset.mvRawExplained='1';const textarea=card.querySelector('textarea');let parameters=[];try{parameters=JSON.parse(textarea?.value||'[]');}catch{}
    const note=document.createElement('div');note.className='meta mv-raw-command-note';note.style.marginTop='.4rem';note.textContent=mvRawCommandSummary(parameters);card.append(note);
  }
}

export function installMvRawCommandUi(){
  if(typeof document==='undefined'||!document.body)return false;enhance();
  const observer=new MutationObserver(mutations=>{for(const mutation of mutations)for(const node of mutation.addedNodes)if(node.nodeType===1)enhance(node.matches?.('.command-card')?node.parentElement||document:node);});observer.observe(document.body,{childList:true,subtree:true});return true;
}

if(typeof document!=='undefined'){if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',installMvRawCommandUi,{once:true});else installMvRawCommandUi();}
