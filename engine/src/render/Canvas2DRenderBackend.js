function clamp(value, min, max) { return Math.max(min, Math.min(max, Number(value) || 0)); }

export class LogicalViewport {
  constructor({ logicalWidth = 1604, logicalHeight = 720 } = {}) {
    this.logicalWidth = Math.max(1, Number(logicalWidth) || 1604);
    this.logicalHeight = Math.max(1, Number(logicalHeight) || 720);
    this.cssWidth = this.logicalWidth;
    this.cssHeight = this.logicalHeight;
    this.scale = 1;
    this.offsetX = 0;
    this.offsetY = 0;
  }

  fit(cssWidth, cssHeight) {
    this.cssWidth = Math.max(1, Number(cssWidth) || this.logicalWidth);
    this.cssHeight = Math.max(1, Number(cssHeight) || this.logicalHeight);
    this.scale = Math.min(this.cssWidth / this.logicalWidth, this.cssHeight / this.logicalHeight);
    const drawnWidth = this.logicalWidth * this.scale;
    const drawnHeight = this.logicalHeight * this.scale;
    this.offsetX = (this.cssWidth - drawnWidth) / 2;
    this.offsetY = (this.cssHeight - drawnHeight) / 2;
    return this.snapshot();
  }

  screenToLogical(x, y) {
    return {
      x: clamp((Number(x) - this.offsetX) / this.scale, 0, this.logicalWidth),
      y: clamp((Number(y) - this.offsetY) / this.scale, 0, this.logicalHeight)
    };
  }

  logicalToScreen(x, y) {
    return {
      x: this.offsetX + Number(x || 0) * this.scale,
      y: this.offsetY + Number(y || 0) * this.scale
    };
  }

  snapshot() {
    return {
      logicalWidth: this.logicalWidth,
      logicalHeight: this.logicalHeight,
      cssWidth: this.cssWidth,
      cssHeight: this.cssHeight,
      scale: this.scale,
      offsetX: this.offsetX,
      offsetY: this.offsetY
    };
  }
}

export class Canvas2DRenderBackend {
  constructor({ canvas, assetManager = null, scope = globalThis, logicalWidth = 1604, logicalHeight = 720, background = '#000000' } = {}) {
    if (!canvas?.getContext) throw new Error('Canvas2DRenderBackend requires a canvas');
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    if (!this.ctx) throw new Error('Canvas2DRenderBackend requires a 2D context');
    this.assetManager = assetManager;
    this.scope = scope;
    this.viewport = new LogicalViewport({ logicalWidth, logicalHeight });
    this.background = background;
    this.pending = new Set();
    this.resize();
  }

  resize(cssWidth = this.canvas.clientWidth || this.scope.innerWidth || this.viewport.logicalWidth,
         cssHeight = this.canvas.clientHeight || this.scope.innerHeight || this.viewport.logicalHeight,
         devicePixelRatio = this.scope.devicePixelRatio || 1) {
    const fit = this.viewport.fit(cssWidth, cssHeight);
    const dpr = clamp(devicePixelRatio, 1, 3);
    this.canvas.width = Math.max(1, Math.round(cssWidth * dpr));
    this.canvas.height = Math.max(1, Math.round(cssHeight * dpr));
    this.canvas.style && Object.assign(this.canvas.style, { width: `${cssWidth}px`, height: `${cssHeight}px`, touchAction: 'none' });
    this.ctx.setTransform(dpr * fit.scale, 0, 0, dpr * fit.scale, dpr * fit.offsetX, dpr * fit.offsetY);
    this.ctx.imageSmoothingEnabled = false;
    return fit;
  }

  pointFromClient(clientX, clientY) {
    const rect = this.canvas.getBoundingClientRect?.() || { left: 0, top: 0 };
    return this.viewport.screenToLogical(Number(clientX) - rect.left, Number(clientY) - rect.top);
  }

  beginFrame({ width = this.viewport.logicalWidth, height = this.viewport.logicalHeight } = {}) {
    this.ctx.save();
    this.ctx.fillStyle = this.background;
    this.ctx.fillRect(0, 0, width, height);
  }

  draw(command = {}) {
    if (command.kind === 'ui-dimmer' || command.kind === 'ui-fade' || command.kind === 'ui-selection-highlight') {
      const d = command.destination || { x: 0, y: 0, width: this.viewport.logicalWidth, height: this.viewport.logicalHeight };
      const previous = this.ctx.globalAlpha;
      this.ctx.globalAlpha = clamp(command.opacity ?? 1, 0, 1);
      this.ctx.fillStyle = command.kind === 'ui-selection-highlight' ? 'rgba(255,255,255,0.22)' : '#000000';
      this.ctx.fillRect(d.x || 0, d.y || 0, d.width || this.viewport.logicalWidth, d.height || this.viewport.logicalHeight);
      this.ctx.globalAlpha = previous;
      return;
    }

    if (command.kind === 'hud' || command.kind === 'battlefield') return;
    if (!command.assetId) return;

    const image = this.assetManager?.cache?.get?.(String(command.assetId));
    if (!image) {
      if (this.assetManager?.has?.(command.assetId) && !this.pending.has(command.assetId)) {
        this.pending.add(command.assetId);
        this.assetManager.load(command.assetId).finally(() => this.pending.delete(command.assetId));
      }
      return;
    }

    const previous = this.ctx.globalAlpha;
    this.ctx.globalAlpha = clamp(command.opacity ?? 1, 0, 1);
    const d = command.destination || {
      x: Number(command.x) || 0,
      y: Number(command.y) || 0,
      width: Number(image.width) || this.viewport.logicalWidth,
      height: Number(image.height) || this.viewport.logicalHeight
    };

    if (command.kind === 'ui-nine-slice' && command.source) {
      const s = command.source;
      this.ctx.drawImage(image, s.x, s.y, s.width, s.height, d.x, d.y, d.width, d.height);
    } else {
      this.ctx.drawImage(image, d.x, d.y, d.width, d.height);
    }
    this.ctx.globalAlpha = previous;
  }

  endFrame() { this.ctx.restore(); }
}
