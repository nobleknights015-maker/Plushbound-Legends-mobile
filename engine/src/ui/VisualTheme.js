export const PLUSHBOUND_VISUAL_THEME = Object.freeze({
  id: 'plushbound-classic',
  windowSkinAssetId: 'ui/windowskin-plushbound',
  cursorAssetId: 'ui/cursor-thread',
  iconAtlasAssetId: 'ui/icon-atlas',
  faceFrameAssetId: 'ui/face-frame',
  transitionAssetId: 'ui/transition-threadwipe',
  colors: Object.freeze({
    text: '#f7f0df',
    muted: '#a9adb5',
    accent: '#ffd37a',
    hp: '#79c96b',
    hpCrisis: '#e76d6d',
    mp: '#6da9e7',
    tp: '#e2b35f',
    gaugeBack: '#1b2028',
    damage: '#ffffff',
    critical: '#ffd36c',
    heal: '#8ff0a4'
  }),
  gauges: Object.freeze({ height: 12, radius: 6, labelWidth: 34 }),
  portraits: Object.freeze({ width: 144, height: 144, framePadding: 6 }),
  transitions: Object.freeze({ fadeMs: 240, battleInMs: 360, battleOutMs: 300 })
});

function clamp(value, min, max) { return Math.max(min, Math.min(max, Number(value) || 0)); }

export function gaugeModel({ kind = 'hp', current = 0, max = 1, width = 180, x = 0, y = 0, theme = PLUSHBOUND_VISUAL_THEME } = {}) {
  const safeMax = Math.max(1, Number(max) || 1);
  const safeCurrent = clamp(current, 0, safeMax);
  const ratio = safeCurrent / safeMax;
  const crisis = kind === 'hp' && ratio <= 0.25;
  return {
    kind,
    x: Math.round(x),
    y: Math.round(y),
    width: Math.max(24, Math.round(width)),
    height: theme.gauges.height,
    ratio,
    current: safeCurrent,
    max: safeMax,
    backColor: theme.colors.gaugeBack,
    fillColor: crisis ? theme.colors.hpCrisis : (theme.colors[kind] || theme.colors.accent),
    crisis
  };
}

export function portraitModel({ assetId = null, x = 0, y = 0, width, height, theme = PLUSHBOUND_VISUAL_THEME } = {}) {
  return {
    kind: 'portrait',
    assetId,
    x: Math.round(x),
    y: Math.round(y),
    width: Math.max(1, Math.round(width || theme.portraits.width)),
    height: Math.max(1, Math.round(height || theme.portraits.height)),
    frameAssetId: theme.faceFrameAssetId,
    framePadding: theme.portraits.framePadding
  };
}

export function transitionModel(type = 'fade', { direction = 'in', durationMs = null, theme = PLUSHBOUND_VISUAL_THEME } = {}) {
  const duration = durationMs ?? (type === 'battle' ? (direction === 'in' ? theme.transitions.battleInMs : theme.transitions.battleOutMs) : theme.transitions.fadeMs);
  return {
    kind: 'transition',
    type,
    direction,
    durationMs: Math.max(0, Number(duration) || 0),
    assetId: type === 'battle' ? theme.transitionAssetId : null
  };
}
