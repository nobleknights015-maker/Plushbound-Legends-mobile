import test from 'node:test';
import assert from 'node:assert/strict';
import { ANDROID_PROFILES, PerformanceBudget } from '../src/platform/PerformanceBudget.js';

test('balanced Android profile tracks healthy 60fps-ish frame pacing', () => {
  const budget = new PerformanceBudget({ profile: 'balanced', windowSize: 20 });
  for (let i = 0; i < 20; i++) budget.recordFrame(16);
  const health = budget.health();
  assert.equal(health.healthy, true);
  assert.equal(health.sampleCount, 20);
  assert.ok(health.fps > 60);
  assert.equal(health.overBudgetRatio, 0);
});

test('sustained slow frames mark runtime unhealthy', () => {
  const budget = new PerformanceBudget({ profile: 'balanced', windowSize: 20 });
  for (let i = 0; i < 20; i++) budget.recordFrame(i < 5 ? 16 : 40);
  const health = budget.health();
  assert.equal(health.healthy, false);
  assert.ok(health.p95Ms >= 40);
  assert.ok(health.overBudgetRatio > 0.2);
  assert.ok(budget.longFrames >= 15);
});

test('render pressure reports asset, sprite, and tile overload independently', () => {
  const budget = new PerformanceBudget({ profile: 'balanced' });
  assert.equal(budget.assess({ loadedAssets: 20, visibleSprites: 20, visibleTiles: 600 }), null);
  const pressure = budget.assess({
    loadedAssets: ANDROID_PROFILES.balanced.maxLoadedAssets + 1,
    visibleSprites: ANDROID_PROFILES.balanced.maxVisibleSprites + 1,
    visibleTiles: ANDROID_PROFILES.balanced.maxVisibleTiles + 1
  });
  assert.equal(pressure.level, 'high');
  assert.deepEqual(pressure.reasons, ['asset-cache', 'sprite-count', 'tile-count']);
});

test('memory warning recommends an aggressive but bounded cache trim', () => {
  const budget = new PerformanceBudget({ profile: 'balanced' });
  const response = budget.noteMemoryWarning();
  assert.equal(response.action, 'trim-assets');
  assert.equal(response.targetEntries, 64);
  assert.equal(budget.snapshot().memoryWarnings, 1);
});

test('unknown performance profile safely falls back to balanced', () => {
  const budget = new PerformanceBudget({ profile: 'does-not-exist' });
  assert.equal(budget.profileName, 'balanced');
});
