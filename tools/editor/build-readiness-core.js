export function summarizeBuildReadiness({pkg=null,validation=[],linkIssues=[],referenceIssues=[],dependencyGraph=null,mvProject=false}={}){
  const errors=[...(validation||[]),...(linkIssues||[]),...(referenceIssues||[])].filter(issue=>issue?.severity==='error'||String(issue?.severity||'').toLowerCase()==='error');
  const warnings=[...(validation||[]),...(linkIssues||[]),...(referenceIssues||[])].filter(issue=>issue?.severity==='warning'||String(issue?.severity||'').toLowerCase()==='warning');
  const unresolved=Number(dependencyGraph?.stats?.unresolved)||0;
  const checks=[
    {id:'package',label:'Package loaded',status:pkg?'pass':'fail',detail:pkg?'Editor package is loaded.':'Load a project package before building.'},
    {id:'validation',label:'Package validation',status:errors.length?'fail':'pass',detail:errors.length?`${errors.length} blocking validation/reference error(s).`:'No blocking validation/reference errors.'},
    {id:'links',label:'Map/event links',status:(linkIssues||[]).some(x=>x?.severity==='error')?'fail':'pass',detail:`${(linkIssues||[]).length} link diagnostic(s).`},
    {id:'dependencies',label:'Dependency resolution',status:unresolved?'fail':'pass',detail:unresolved?`${unresolved} unresolved dependency node(s).`:'No unresolved dependency nodes in the current graph.'},
    {id:'mv',label:'MV interoperability',status:mvProject?'pass':'info',detail:mvProject?'Current package uses the lossless MV adapter and can export edited MV data.':'Current package is native Plushbound; MV export is not applicable.'},
    {id:'engine',label:'Frozen Engine v1',status:'ci',detail:'Protected by repository CI against changes under engine/.'},
    {id:'android',label:'Android APK',status:'ci',detail:'Build/install verification is performed by GitHub Actions, not inferred in-browser.'}
  ];
  const blocking=checks.filter(c=>c.status==='fail').length;
  return {ready:!!pkg&&blocking===0,blocking,warnings:warnings.length,errors:errors.length,unresolved,checks};
}

export function buildReadinessLabel(summary){if(!summary?.ready)return `NOT READY • ${summary?.blocking||0} blocking check(s)`;return summary.warnings?`READY WITH ${summary.warnings} WARNING(S)`:'LOCALLY READY';}
