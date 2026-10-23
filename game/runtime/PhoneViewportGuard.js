function engineRuntime(scope) { return scope?.__PLUSHBOUND_ENGINE_V1__ || null; }

export function refreshPhoneViewport(scope = globalThis) {
  const engine = engineRuntime(scope);
  if (!engine) return null;
  if (typeof engine.refreshSafeAreaInsets === 'function') return engine.refreshSafeAreaInsets();
  if (typeof engine.resize === 'function') return engine.resize();
  return null;
}

export function attachPhoneViewportGuard(scope = globalThis) {
  let attached = true;
  const viewport = scope.visualViewport || null;
  const refresh = () => refreshPhoneViewport(scope);
  const passive = { passive:true };

  scope.addEventListener?.('resize', refresh, passive);
  scope.addEventListener?.('orientationchange', refresh, passive);
  scope.addEventListener?.('plushbound-engine-v1-ready', refresh);
  viewport?.addEventListener?.('resize', refresh, passive);
  viewport?.addEventListener?.('scroll', refresh, passive);
  refresh();

  return {
    refresh,
    destroy() {
      if (!attached) return;
      attached = false;
      scope.removeEventListener?.('resize', refresh);
      scope.removeEventListener?.('orientationchange', refresh);
      scope.removeEventListener?.('plushbound-engine-v1-ready', refresh);
      viewport?.removeEventListener?.('resize', refresh);
      viewport?.removeEventListener?.('scroll', refresh);
    }
  };
}
