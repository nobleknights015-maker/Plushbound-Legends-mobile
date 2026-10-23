import test from 'node:test';
import assert from 'node:assert/strict';
import { attachPhoneViewportGuard, refreshPhoneViewport } from '../runtime/PhoneViewportGuard.js';

function makeScope() {
  const listeners=new Map();
  const viewportListeners=new Map();
  const calls=[];
  const scope={
    __PLUSHBOUND_ENGINE_V1__:{ refreshSafeAreaInsets(){ calls.push('refresh'); return { ok:true }; } },
    addEventListener(type,fn){ if(!listeners.has(type)) listeners.set(type,new Set()); listeners.get(type).add(fn); },
    removeEventListener(type,fn){ listeners.get(type)?.delete(fn); },
    dispatch(type){ for(const fn of listeners.get(type)||[]) fn({type}); },
    visualViewport:{
      addEventListener(type,fn){ if(!viewportListeners.has(type)) viewportListeners.set(type,new Set()); viewportListeners.get(type).add(fn); },
      removeEventListener(type,fn){ viewportListeners.get(type)?.delete(fn); },
      dispatch(type){ for(const fn of viewportListeners.get(type)||[]) fn({type}); }
    }
  };
  return {scope,calls,listeners,viewportListeners};
}

test('phone viewport guard refreshes engine safe area on resize, rotation and visual viewport changes', () => {
  const {scope,calls,listeners,viewportListeners}=makeScope();
  const guard=attachPhoneViewportGuard(scope);
  assert.equal(calls.length,1);
  scope.dispatch('resize');
  scope.dispatch('orientationchange');
  scope.dispatch('plushbound-engine-v1-ready');
  scope.visualViewport.dispatch('resize');
  scope.visualViewport.dispatch('scroll');
  assert.equal(calls.length,6);
  guard.destroy();
  scope.dispatch('resize');
  scope.visualViewport.dispatch('resize');
  assert.equal(calls.length,6);
  assert.equal(listeners.get('resize')?.size,0);
  assert.equal(viewportListeners.get('resize')?.size,0);
});

test('phone viewport refresh falls back to engine resize when safe-area API is unavailable', () => {
  let resized=0;
  const scope={ __PLUSHBOUND_ENGINE_V1__:{ resize(){ resized+=1; return 'resized'; } } };
  assert.equal(refreshPhoneViewport(scope),'resized');
  assert.equal(resized,1);
});
