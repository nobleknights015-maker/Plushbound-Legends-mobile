function waitForRuntime(scope = globalThis) {
  if (scope.__PLUSHBOUND_ENGINE_V1__?.booted) return Promise.resolve(scope.__PLUSHBOUND_ENGINE_V1__);
  return new Promise(resolve => {
    const onReady = () => {
      scope.removeEventListener?.('plushbound-engine-v1-ready', onReady);
      resolve(scope.__PLUSHBOUND_ENGINE_V1__ || null);
    };
    scope.addEventListener?.('plushbound-engine-v1-ready', onReady, { once: true });
  });
}

function wasBackHandled(result) {
  if (result === false || result == null) return false;
  if (result === true) return true;
  if (typeof result === 'object' && (result.unhandled === true || result.handled === false)) return false;
  return true;
}

export async function installNativeRuntimeHardening(scope = globalThis) {
  if (scope.__PLUSHBOUND_NATIVE_HARDENING__?.installed) return scope.__PLUSHBOUND_NATIVE_HARDENING__;
  const runtime = await waitForRuntime(scope);
  if (!runtime) return null;

  const resize = () => {
    runtime.refreshSafeAreaInsets?.();
    runtime.resize?.();
  };
  const back = async event => {
    const result = await runtime.handleAction?.({ type: 'back', source: 'android-host' });
    const handled = wasBackHandled(result);
    if (handled) event?.preventDefault?.();
    return handled;
  };

  const visualViewport = scope.visualViewport || null;
  visualViewport?.addEventListener?.('resize', resize, { passive: true });
  visualViewport?.addEventListener?.('scroll', resize, { passive: true });
  scope.addEventListener?.('plushbound-android-back', back);

  const previousBack = scope.plushboundEngineV1Back;
  scope.plushboundEngineV1Back = back;

  const controller = {
    installed: true,
    resize,
    back,
    destroy() {
      visualViewport?.removeEventListener?.('resize', resize);
      visualViewport?.removeEventListener?.('scroll', resize);
      scope.removeEventListener?.('plushbound-android-back', back);
      if (scope.plushboundEngineV1Back === back) {
        if (previousBack === undefined) delete scope.plushboundEngineV1Back;
        else scope.plushboundEngineV1Back = previousBack;
      }
      controller.installed = false;
      if (scope.__PLUSHBOUND_NATIVE_HARDENING__ === controller) delete scope.__PLUSHBOUND_NATIVE_HARDENING__;
    }
  };

  scope.__PLUSHBOUND_NATIVE_HARDENING__ = controller;
  resize();
  return controller;
}

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  installNativeRuntimeHardening(window).catch(error => {
    window.__PLUSHBOUND_NATIVE_HARDENING_ERROR__ = String(error?.stack || error);
    console.error('[Plushbound Engine v1] native runtime hardening failed', error);
  });
}
