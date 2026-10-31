import test from 'node:test';
import assert from 'node:assert/strict';
import {summarizeBuildReadiness,buildReadinessLabel} from '../../tools/editor/build-readiness-core.js';

test('marks a loaded clean package locally ready while leaving CI-only checks explicit',()=>{
  const summary=summarizeBuildReadiness({pkg:{maps:[]},validation:[],linkIssues:[],referenceIssues:[],dependencyGraph:{stats:{unresolved:0}},mvProject:false});
  assert.equal(summary.ready,true);assert.equal(summary.blocking,0);assert.equal(summary.checks.find(x=>x.id==='engine').status,'ci');assert.equal(summary.checks.find(x=>x.id==='android').status,'ci');assert.equal(buildReadinessLabel(summary),'LOCALLY READY');
});

test('fails closed on validation errors and unresolved dependency nodes',()=>{
  const summary=summarizeBuildReadiness({pkg:{},validation:[{severity:'error',message:'bad'}],dependencyGraph:{stats:{unresolved:2}}});
  assert.equal(summary.ready,false);assert.equal(summary.errors,1);assert.equal(summary.unresolved,2);assert.equal(summary.blocking,2);assert.match(buildReadinessLabel(summary),/NOT READY/);
});

test('reports warnings without pretending they are build failures',()=>{
  const summary=summarizeBuildReadiness({pkg:{},validation:[{severity:'warning'}],dependencyGraph:{stats:{unresolved:0}}});
  assert.equal(summary.ready,true);assert.equal(summary.warnings,1);assert.equal(buildReadinessLabel(summary),'READY WITH 1 WARNING(S)');
});
