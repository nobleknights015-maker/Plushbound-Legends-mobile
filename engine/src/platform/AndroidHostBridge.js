export class AndroidHostBridge {
  constructor({ lifecycle, performance, assets, renderer, input, backHandler = null, stateProvider = () => null, logger = console } = {}) {
    if (!lifecycle) throw new Error('AndroidHostBridge requires lifecycle');
    if (!performance) throw new Error('AndroidHostBridge requires performance budget');
    this.lifecycle = lifecycle;
    this.performance = performance;
    this.assets = assets;
    this.renderer = renderer;
    this.input = input;
    this.backHandler = typeof backHandler === 'function' ? backHandler : null;
    this.stateProvider = stateProvider;
    this.logger = logger;
    this.viewport = { width: 0, height: 0, density: 1 };
  }

  async onPause() {
    this.input?.clearAll?.();
    await this.lifecycle.onPause(this.stateProvider());
    return this.snapshot();
  }

  onResume() {
    this.lifecycle.onResume();
    this.input?.clearAll?.();
    return this.snapshot();
  }

  async onStop() {
    this.input?.clearAll?.();
    await this.lifecycle.onStop(this.stateProvider());
    return this.snapshot();
  }

  onDestroy() {
    this.input?.clearAll?.();
    this.lifecycle.onDestroy();
    this.assets?.clear?.();
    return this.snapshot();
  }

  async onBackPressed() {
    this.input?.clearAll?.();
    if (!this.backHandler) return false;
    return (await this.backHandler()) !== false;
  }

  onSurfaceChanged({ width = 0, height = 0, density = 1 } = {}) {
    this.viewport = {
      width: Math.max(1, Math.floor(Number(width) || 1)),
      height: Math.max(1, Math.floor(Number(height) || 1)),
      density: Math.max(0.1, Number(density) || 1)
    };
    this.renderer?.resize?.(this.viewport.width, this.viewport.height, this.viewport.density);
    return { ...this.viewport };
  }

  onFrame({ frameMs = 0, visibleSprites = 0, visibleTiles = 0 } = {}) {
    const health = this.performance.recordFrame(frameMs);
    const loadedAssets = this.assets?.snapshot?.().loaded?.length ?? 0;
    const pressure = this.performance.assess({ loadedAssets, visibleSprites, visibleTiles });
    return { health, pressure };
  }

  onTrimMemory(level = 'moderate') {
    const recommendation = this.performance.noteMemoryWarning();
    const loaded = this.assets?.snapshot?.().loaded ?? [];
    const target = level === 'critical' ? Math.max(12, Math.floor(recommendation.targetEntries * 0.5)) : recommendation.targetEntries;
    const removeCount = Math.max(0, loaded.length - target);
    for (const id of loaded.slice(0, removeCount)) this.assets?.release?.(id);
    const remaining = this.assets?.snapshot?.().loaded?.length ?? 0;
    this.logger?.info?.('Android memory trim', { level, before: loaded.length, remaining, target });
    return { level, targetEntries: target, removed: loaded.length - remaining, remaining };
  }

  snapshot() {
    return {
      lifecycle: this.lifecycle.state,
      viewport: { ...this.viewport },
      performance: this.performance.snapshot?.() ?? null,
      assets: this.assets?.snapshot?.() ?? null
    };
  }
}
