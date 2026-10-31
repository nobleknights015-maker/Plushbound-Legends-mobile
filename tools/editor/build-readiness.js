import {summarizeBuildReadiness,buildReadinessLabel} from './build-readiness-core.js';

function panel(){
  const right=document.querySelector('.sidebar.right');if(!right)return null;
  let section=document.getElementById('buildReadinessPanel');if(section)return section;
  section=document.createElement('section');section.id='buildReadinessPanel';section.innerHTML='<h2>Build Readiness</h2><div id="buildReadinessSummary" class="meta">Run readiness checks.</div><button id="refreshBuildReadiness" type="button">Refresh Readiness</button><a id="openBuildActions" class="diagnostic-link" target="_blank" rel="noopener noreferrer" href="https://github.com/nobleknights015-maker/Plushbound-Legends-mobile/actions?query=branch%3Aplushbound-game-development">Open GitHub Actions</a><div id="buildReadinessChecks" class="page-summary"></div>';
  const graph=document.getElementById('projectDependencyGraph');graph?.after(section)||right.append(section);return section;
}
function icon(status){return status==='pass'?'✓':status==='fail'?'✕':status==='ci'?'CI':'•';}
async function refresh(){
  const section=panel();if(!section||!window.PlushboundEditor)return null;const summaryEl=section.querySelector('#buildReadinessSummary'),host=section.querySelector('#buildReadinessChecks');summaryEl.textContent='Checking local project readiness…';
  try{
    const pkg=window.PlushboundEditor.getPackage();
    const validation=window.PlushboundEditor.validate?.()||[];
    const linkIssues=window.PlushboundEditor.validateLinks?.()||[];
    if(window.PlushboundReferenceAudit?.audit)await window.PlushboundReferenceAudit.audit();
    const referenceIssues=window.PlushboundReferenceAudit?.issues||[];
    const dependencyGraph=window.PlushboundReferenceAudit?.graph||null;
    const mvProject=pkg?.format==='plushbound-world-editor-mv-adapter';
    const summary=summarizeBuildReadiness({pkg,validation,linkIssues,referenceIssues,dependencyGraph,mvProject});summaryEl.textContent=buildReadinessLabel(summary);host.innerHTML='';
    for(const check of summary.checks){const row=document.createElement('div');row.className=`page-row ${check.status==='fail'?'error':''}`;const strong=document.createElement('strong');strong.textContent=`${icon(check.status)} ${check.label}`;const detail=document.createElement('span');detail.textContent=check.detail;row.append(strong,detail);host.append(row);}
    window.PlushboundBuildReadiness.last=summary;return summary;
  }catch(error){summaryEl.textContent=`Readiness check unavailable: ${error.message}`;host.innerHTML='';return null;}
}
export function installBuildReadiness(){const section=panel();if(!section)return false;section.querySelector('#refreshBuildReadiness')?.addEventListener('click',refresh);document.getElementById('loadElyndor')?.addEventListener('click',()=>setTimeout(refresh,0));document.getElementById('runValidation')?.addEventListener('click',()=>setTimeout(refresh,0));setTimeout(refresh,0);return true;}

if(typeof document!=='undefined'){if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',installBuildReadiness,{once:true});else installBuildReadiness();}
window.PlushboundBuildReadiness={refresh,last:null};
