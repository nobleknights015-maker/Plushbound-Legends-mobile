function n(value) { return Math.max(0, Number(value) || 0); }

export function normalizeSafeInsets(insets = {}) {
  return {
    top: n(insets.top),
    right: n(insets.right),
    bottom: n(insets.bottom),
    left: n(insets.left)
  };
}

export function classifyScreen({ width = 1604, height = 720 } = {}) {
  const w = Math.max(1, Number(width) || 1);
  const h = Math.max(1, Number(height) || 1);
  const long = Math.max(w, h);
  const short = Math.min(w, h);
  const aspect = long / short;
  let profile = 'phone-standard';
  if (short >= 900) profile = 'tablet-large';
  else if (short >= 600) profile = 'tablet';
  else if (aspect >= 2.15) profile = 'phone-ultrawide';
  else if (aspect >= 1.85) profile = 'phone-wide';
  else if (aspect < 1.55) profile = 'compact';
  return { profile, aspect, width: w, height: h, orientation: w >= h ? 'landscape' : 'portrait' };
}

export function safeViewport({ width = 1604, height = 720, insets = {} } = {}) {
  const safe = normalizeSafeInsets(insets);
  const w = Math.max(1, Number(width) || 1);
  const h = Math.max(1, Number(height) || 1);
  return {
    x: safe.left,
    y: safe.top,
    width: Math.max(1, w - safe.left - safe.right),
    height: Math.max(1, h - safe.top - safe.bottom),
    insets: safe
  };
}

export function responsiveAnchor({
  x = 0,
  y = 0,
  width = 0,
  height = 0,
  anchorX = 'left',
  anchorY = 'top',
  safeArea = { x: 0, y: 0, width: 1604, height: 720 },
  margin = 0
} = {}) {
  const m = n(margin);
  let ax = safeArea.x + Number(x || 0);
  let ay = safeArea.y + Number(y || 0);
  if (anchorX === 'center') ax = safeArea.x + safeArea.width / 2 - Number(width || 0) / 2 + Number(x || 0);
  else if (anchorX === 'right') ax = safeArea.x + safeArea.width - Number(width || 0) - m - Number(x || 0);
  else ax += m;
  if (anchorY === 'center') ay = safeArea.y + safeArea.height / 2 - Number(height || 0) / 2 + Number(y || 0);
  else if (anchorY === 'bottom') ay = safeArea.y + safeArea.height - Number(height || 0) - m - Number(y || 0);
  else ay += m;
  return { x: Math.round(ax), y: Math.round(ay), width: Number(width || 0), height: Number(height || 0) };
}

export function readCssSafeArea(scope = globalThis) {
  const document = scope.document;
  if (!document?.createElement || typeof scope.getComputedStyle !== 'function') return normalizeSafeInsets();
  const probe = document.createElement('div');
  if (!probe?.style) return normalizeSafeInsets();
  Object.assign(probe.style, {
    position: 'fixed',
    visibility: 'hidden',
    pointerEvents: 'none',
    paddingTop: 'env(safe-area-inset-top, 0px)',
    paddingRight: 'env(safe-area-inset-right, 0px)',
    paddingBottom: 'env(safe-area-inset-bottom, 0px)',
    paddingLeft: 'env(safe-area-inset-left, 0px)'
  });
  document.body?.appendChild?.(probe);
  const style = scope.getComputedStyle(probe);
  const result = normalizeSafeInsets({
    top: parseFloat(style?.paddingTop) || 0,
    right: parseFloat(style?.paddingRight) || 0,
    bottom: parseFloat(style?.paddingBottom) || 0,
    left: parseFloat(style?.paddingLeft) || 0
  });
  probe.remove?.();
  return result;
}
