import test from 'node:test';
import assert from 'node:assert/strict';

import { LogicalViewport } from '../../engine/src/render/Canvas2DRenderBackend.js';

const PHONE_MATRIX = [
  { name:'small-16x9', width:320, height:568, insets:{ top:20, bottom:16 } },
  { name:'compact-360x640', width:360, height:640, insets:{ top:24, bottom:20 } },
  { name:'tall-360x800', width:360, height:800, insets:{ top:28, bottom:24 } },
  { name:'legacy-375x667', width:375, height:667, insets:{ top:20, bottom:16 } },
  { name:'modern-390x844', width:390, height:844, insets:{ top:47, bottom:34 } },
  { name:'modern-393x873', width:393, height:873, insets:{ top:32, bottom:24 } },
  { name:'moto-class-412x915', width:412, height:915, insets:{ top:28, bottom:24 } },
  { name:'large-430x932', width:430, height:932, insets:{ top:48, bottom:34 } },
  { name:'wide-short-480x800', width:480, height:800, insets:{ top:24, bottom:20 } },
  { name:'small-landscape', width:568, height:320, insets:{ left:24, right:16, bottom:12 } },
  { name:'compact-landscape', width:640, height:360, insets:{ left:26, right:20, bottom:12 } },
  { name:'tall-phone-landscape', width:800, height:360, insets:{ left:30, right:24, bottom:12 } },
  { name:'modern-landscape', width:844, height:390, insets:{ left:44, right:28, bottom:14 } },
  { name:'moto-landscape', width:915, height:412, insets:{ left:32, right:24, bottom:14 } },
  { name:'large-landscape', width:932, height:430, insets:{ left:48, right:34, bottom:14 } },
  { name:'ultrawide-landscape', width:960, height:360, insets:{ left:48, right:32, bottom:12 } }
];

function approx(actual, expected, epsilon = 1e-6) {
  assert.ok(Math.abs(actual - expected) <= epsilon, `${actual} should be approximately ${expected}`);
}

for (const device of PHONE_MATRIX) {
  test(`logical game frame stays completely inside safe screen: ${device.name}`, () => {
    const viewport = new LogicalViewport({ logicalWidth:1604, logicalHeight:720 });
    const fit = viewport.fit(device.width, device.height, device.insets);
    const drawnWidth = fit.logicalWidth * fit.scale;
    const drawnHeight = fit.logicalHeight * fit.scale;
    const safeRight = fit.safeArea.x + fit.safeArea.width;
    const safeBottom = fit.safeArea.y + fit.safeArea.height;

    assert.ok(Number.isFinite(fit.scale) && fit.scale > 0);
    assert.ok(fit.offsetX >= fit.safeArea.x - 1e-6);
    assert.ok(fit.offsetY >= fit.safeArea.y - 1e-6);
    assert.ok(fit.offsetX + drawnWidth <= safeRight + 1e-6);
    assert.ok(fit.offsetY + drawnHeight <= safeBottom + 1e-6);

    const topLeft = viewport.logicalToScreen(0, 0);
    const bottomRight = viewport.logicalToScreen(1604, 720);
    assert.ok(topLeft.x >= fit.safeArea.x - 1e-6);
    assert.ok(topLeft.y >= fit.safeArea.y - 1e-6);
    assert.ok(bottomRight.x <= safeRight + 1e-6);
    assert.ok(bottomRight.y <= safeBottom + 1e-6);

    const centerLogical = viewport.screenToLogical(...Object.values(viewport.logicalToScreen(802, 360)));
    approx(centerLogical.x, 802);
    approx(centerLogical.y, 360);
  });
}

test('extreme but valid safe-area insets still contain the complete logical frame', () => {
  const viewport = new LogicalViewport({ logicalWidth:1604, logicalHeight:720 });
  const fit = viewport.fit(320, 568, { top:72, right:24, bottom:64, left:24 });
  const drawnWidth = fit.logicalWidth * fit.scale;
  const drawnHeight = fit.logicalHeight * fit.scale;
  assert.ok(fit.scale > 0);
  assert.ok(fit.offsetX >= fit.safeArea.x);
  assert.ok(fit.offsetY >= fit.safeArea.y);
  assert.ok(fit.offsetX + drawnWidth <= fit.safeArea.x + fit.safeArea.width + 1e-6);
  assert.ok(fit.offsetY + drawnHeight <= fit.safeArea.y + fit.safeArea.height + 1e-6);
});
