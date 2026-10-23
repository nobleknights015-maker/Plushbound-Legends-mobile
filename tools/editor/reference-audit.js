import {auditContentReferences} from './reference-audit-core.js';

async function loadJson(url){const response=await fetch(url);if(!response.ok)throw new Error(`${response.status} ${url}`);return response.json();}
async function loadContentPackages(){
  const index=await loadJson(new URL('../../game/content/content-index.json',location.href));
  const packages=[];
  for(const entry of index.packages||[]){
    try{packages.push(await loadJson(new URL(`../../game/content/${entry.path}`,location.href)));}catch{}
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
async function audit(){
  if(!window.PlushboundEditor)return [];
  const section=panel();if(!section)return [];
  const summary=section.querySelector('#projectReferenceSummary'),issuesHost=section.querySelector('#projectReferenceIssues');
  try{
    const [contentPackages,pkg]=await Promise.all([loadContentPackages(),Promise.resolve(window.PlushboundEditor.getPackage())]);
    if(!pkg){summary.textContent='Load a package to audit references.';issuesHost.innerHTML='';return [];}
    const issues=auditContentReferences(pkg,contentPackages);summary.textContent=`${issues.length} command reference issue(s)`;issuesHost.innerHTML='';
    for(const issue of issues.slice(0,80)){const row=document.createElement('div');row.className='page-row error';row.textContent=`${issue.mapId}/${issue.eventId} • ${issue.message}`;issuesHost.append(row);}return issues;
  }catch(error){summary.textContent=`Reference audit unavailable: ${error.message}`;issuesHost.innerHTML='';return [];}
}

if(window.PlushboundEditor){const section=panel();section?.querySelector('#refreshProjectReferences')?.addEventListener('click',audit);document.getElementById('loadElyndor')?.addEventListener('click',()=>setTimeout(audit,0));document.getElementById('runValidation')?.addEventListener('click',audit);audit();window.PlushboundReferenceAudit={audit};}
