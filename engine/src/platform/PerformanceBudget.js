export const ANDROID_PROFILES = Object.freeze({
  balanced: Object.freeze({ targetFps: 60, frameBudgetMs: 16.67, maxFrameMs: 33.34, maxLoadedAssets: 128, maxVisibleSprites: 96, maxVisibleTiles: 1400 }),
  conservative: Object.freeze({ targetFps: 30, frameBudgetMs: 33.34, maxFrameMs: 50, maxLoadedAssets: 96, maxVisibleSprites: 64, maxVisibleTiles: 1000 })
});

export class PerformanceBudget {
  constructor({ profile = 'balanced', windowSize = 120 } = {}) {
    this.profileName = ANDROID_PROFILES[profile] ? profile : 'balanced';
    this.profile = ANDROID_PROFILES[this.profileName];
    this.windowSize = Math.max(10, Number(windowSize) || 120);
    this.frames = [];
    this.longFrames = 0;
    this.memoryWarnings = 0;
    this.lastPressure = null;
  }

  recordFrame(ms) {
    const value = Math.max(0, Number(ms) || 0);
    this.frames.push(value);
    if (this.frames.length > this.windowSize) this.frames.shift();
    if (value > this.profile.maxFrameMs) this.longFrames += 1;
    return this.health();
  }

  assess({ loadedAssets = 0, visibleSprites = 0, visibleTiles = 0 } = {}) {
    const reasons = [];
    if (loadedAssets > this.profile.maxLoadedAssets) reasons.push('asset-cache');
    if (visibleSprites > this.profile.maxVisibleSprites) reasons.push('sprite-count');
    if (visibleTiles > this.profile.maxVisibleTiles) reasons.push('tile-count');
    this.lastPressure = reasons.length ? { level: reasons.length > 1 ? 'high' : 'moderate', reasons } : null;
    return this.lastPressure;
  }

  noteMemoryWarning() {
    this.memoryWarnings += 1;
    return { action: 'trim-assets', targetEntries: Math.max(24, Math.floor(this.profile.maxLoadedAssets * 0.5)) };
  }

  health() {
    if (!this.frames.length) return { sampleCount: 0, averageMs: 0, p95Ms: 0, fps: this.profile.targetFps, overBudgetRatio: 0, healthy: true };
    const sorted = [...this.frames].sort((a,b)=>a-b);
    const sum = this.frames.reduce((a,b)=>a+b,0);
    const averageMs = sum / this.frames.length;
    const p95Ms = sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95))];
    const overBudget = this.frames.filter(ms => ms > this.profile.frameBudgetMs).length;
    const overBudgetRatio = overBudget / this.frames.length;
    const fps = averageMs > 0 ? 1000 / averageMs : this.profile.targetFps;
    return { sampleCount: this.frames.length, averageMs, p95Ms, fps, overBudgetRatio, healthy: p95Ms <= this.profile.maxFrameMs && overBudgetRatio <= 0.2 };
  }

  snapshot() {
    return { profile: this.profileName, longFrames: this.longFrames, memoryWarnings: this.memoryWarnings, pressure: this.lastPressure, health: this.health() };
  }
}
