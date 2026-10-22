import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyScreen, safeViewport, responsiveAnchor, normalizeSafeInsets } from '../src/platform/ScreenAdaptation.js';
import { LogicalViewport } from '../src/render/Canvas2DRenderBackend.js';

test('screen profiles classify phones tablets and portrait shapes deterministically', () => {
  assert.equal(classifyScreen({ width: 1280, height: 720 }).profile, 'phone-standard');
  assert.equal(classifyScreen({ width: 1604, height: 720 }).profile, 'phone-ultrawide');
  assert.equal(classifyScreen({ width: 2340, height: 1080 }).profile, 'tablet-large');
  assert.equal(classifyScreen({ width: 1920, height: 1200 }).profile, 'tablet-large');
  assert.equal(classifyScreen({ width: 720, height: 1604 }).orientation, 'portrait');
});

test('safe viewport excludes notches navigation bars and cutouts', () => {
  const safe = safeViewport({ width: 2400, height: 1080, insets: { left: 80, right: 36, top: 24, bottom: 18 } });
  assert.deepEqual(safe, {
    x: 80,
    y: 24,
    width: 2284,
    height: 1038,
    insets: { top: 24, right: 36, bottom: 18, left: 80 }
  });
  assert.deepEqual(normalizeSafeInsets({ left: -5, top: '12' }), { top: 12, right: 0, bottom: 0, left: 0 });
});

test('logical game space fits common phone and tablet viewports without distortion', () => {
  const sizes = [
    [1280, 720],
    [1604, 720],
    [1920, 1080],
    [2400, 1080],
    [2560, 1600],
    [1600, 2560]
  ];
  for (const [width, height] of sizes) {
    const viewport = new LogicalViewport();
    const fit = viewport.fit(width, height);
    assert.ok(fit.scale > 0);
    const center = viewport.logicalToScreen(802, 360);
    const roundTrip = viewport.screenToLogical(center.x, center.y);
    assert.ok(Math.abs(roundTrip.x - 802) < 0.001);
    assert.ok(Math.abs(roundTrip.y - 360) < 0.001);
    assert.ok(fit.offsetX >= 0);
    assert.ok(fit.offsetY >= 0);
  }
});

test('safe-area fitting preserves touch mapping inside asymmetric cutouts', () => {
  const viewport = new LogicalViewport();
  const fit = viewport.fit(2400, 1080, { left: 96, right: 24, top: 18, bottom: 12 });
  assert.equal(fit.safeArea.x, 96);
  assert.equal(fit.safeArea.width, 2280);
  const screen = viewport.logicalToScreen(0, 0);
  assert.ok(screen.x >= 96);
  assert.ok(screen.y >= 18);
  assert.deepEqual(viewport.screenToLogical(screen.x, screen.y), { x: 0, y: 0 });
});

test('responsive anchors stay inside the supplied safe area', () => {
  const safe = safeViewport({ width: 2400, height: 1080, insets: { left: 80, right: 40, top: 20, bottom: 20 } });
  const right = responsiveAnchor({ width: 360, height: 200, anchorX: 'right', anchorY: 'bottom', safeArea: safe, margin: 24 });
  assert.ok(right.x >= safe.x);
  assert.ok(right.y >= safe.y);
  assert.ok(right.x + right.width <= safe.x + safe.width);
  assert.ok(right.y + right.height <= safe.y + safe.height);
  const centered = responsiveAnchor({ width: 400, height: 200, anchorX: 'center', anchorY: 'center', safeArea: safe });
  assert.equal(centered.x, Math.round(safe.x + safe.width / 2 - 200));
  assert.equal(centered.y, Math.round(safe.y + safe.height / 2 - 100));
});
