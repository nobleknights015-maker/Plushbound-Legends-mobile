import { normalizeSafeInsets, safeViewport, classifyScreen } from '../platform/ScreenAdaptation.js';

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
    this.safeInsets = normalizeSafeInsets();
    this.safeArea = safeViewport({ width: this.cssWidth, height: this.cssHeight });
    this.screen = classifyScreen({ width: this.cssWidth, height: this.cssHeight });
  }

  fit(cssWidth, cssHeight, safeInsets = {}) {
    this.cssWidth = Math.max(1, Number(cssWidth) || this.logicalWidth);
    this.cssHeight = Math.max(1, Number(cssHeight) || this.logicalHeight);
    this.safeInsets = normalizeSafeInsets(safeInsets);
    this.safeArea = safeViewport({ width: this.cssWidth, height: this.cssHeight, insets: this.safeInsets });
    this.screen = classifyScreen({ width: this.cssWidth, height: this.cssHeight });
    this.scale = Math.min(this.safeArea.width / this.logicalWidth, this.safeArea.height / this.logicalHeight);
    const drawnWidth = this.logicalWidth * this.scale, drawnHeight = this.logicalHeight * this.scale;
    this.offsetX = this.safeArea.x + (this.safeArea.width - drawnWidth) / 2;
    this.offsetY = this.safeArea.y + (this.safeArea.height - drawnHeight) / 2;
    return this.snapshot();
  }

  screenToLogical(x, y) {
    return {
      x: clamp((Number(x) - this.offsetX) / this.scale, 0, this.logicalWidth),
      y: clamp((Number(y) - this.offsetY) / this.scale, 0, this.logicalHeight)
    };
  }

  logicalToScreen(x, y) { return { x: this.offsetX + Number(x || 0) * this.scale, y: this.offsetY + Number(y || 0) * this.scale }; }
  snapshot() {
    return {
      logicalWidth: this.logicalWidth,
      logicalHeight: this.logicalHeight,
      cssWidth: this.cssWidth,
      cssHeight: this.cssHeight,
      scale: this.scale,
      offsetX: this.offsetX,
      offsetY: this.offsetY,
      safeInsets: { ...this.safeInsets },
      safeArea: { ...this.safeArea, insets: { ...this.safeArea.insets } },
      screen: { ...this.screen }
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
    this.safeInsets = normalizeSafeInsets();
    this.resize();
  }

  resize(cssWidth = this.canvas.clientWidth || this.scope.innerWidth || this.viewport.logicalWidth,
         cssHeight = this.canvas.clientHeight || this.scope.innerHeight || this.viewport.logicalHeight,
         devicePixelRatio = this.scope.devicePixelRatio || 1,
         safeInsets = this.safeInsets) {
    this.safeInsets = normalizeSafeInsets(safeInsets);
    const fit = this.viewport.fit(cssWidth, cssHeight, this.safeInsets), dpr = clamp(devicePixelRatio, 1, 3);
    this.canvas.width = Math.max(1, Math.round(cssWidth * dpr));
    this.canvas.height = Math.max(1, Math.round(cssHeight * dpr));
    this.canvas.style && Object.assign(this.canvas.style, { width: `${cssWidth}px`, height: `${cssHeight}px`, touchAction: 'none' });
    this.ctx.setTransform(dpr * fit.scale, 0, 0, dpr * fit.scale, dpr * fit.offsetX, dpr * fit.offsetY);
    this.ctx.imageSmoothingEnabled = false;
    return fit;
  }

  setSafeAreaInsets(insets = {}) {
    return this.resize(
      this.canvas.clientWidth || this.scope.innerWidth || this.viewport.logicalWidth,
      this.canvas.clientHeight || this.scope.innerHeight || this.viewport.logicalHeight,
      this.scope.devicePixelRatio || 1,
      insets
    );
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

  assetFor(command = {}) {
    const source = command.source || {};
    const id = command.assetId || source.assetId || source.image || command.image || null;
    if (!id) return null;
    const key = String(id);
    const image = this.assetManager?.cache?.get?.(key);
    if (!image && this.assetManager?.has?.(key) && !this.pending.has(key)) {
      this.pending.add(key);
      this.assetManager.load(key).finally(() => this.pending.delete(key));
    }
    return image || null;
  }

  drawText(command) {
    const ctx = this.ctx;
    const size = Math.max(8, Number(command.fontSize) || 24);
    const lineHeight = Math.max(size, Number(command.lineHeight) || Math.round(size * 1.25));
    const maxWidth = Math.max(1, Number(command.maxWidth) || this.viewport.logicalWidth);
    ctx.save();
    ctx.globalAlpha = clamp(command.opacity ?? 1, 0, 1);
    ctx.fillStyle = command.color || '#f4f1ea';
    ctx.font = `${command.bold ? '700 ' : ''}${size}px sans-serif`;
    ctx.textBaseline = 'top';
    const text = String(command.text ?? '');
    if (!command.wrap) ctx.fillText(text, Number(command.x) || 0, Number(command.y) || 0, maxWidth);
    else {
      const words = text.split(/\s+/), lines = [];
      let line = '';
      for (const word of words) {
        const trial = line ? `${line} ${word}` : word;
        if (line && ctx.measureText(trial).width > maxWidth) { lines.push(line); line = word; }
        else line = trial;
      }
      if (line) lines.push(line);
      lines.forEach((value, i) => ctx.fillText(value, Number(command.x) || 0, (Number(command.y) || 0) + i * lineHeight, maxWidth));
    }
    ctx.restore();
  }

  drawGauge(command) {
    const d = command.destination || { x: 0, y: 0, width: 1, height: 1 };
    const ratio = clamp((Number(command.value) || 0) / Math.max(1, Number(command.max) || 1), 0, 1);
    this.ctx.fillStyle = command.backColor || '#1e2430';
    this.ctx.fillRect(d.x, d.y, d.width, d.height);
    this.ctx.fillStyle = command.color || '#ffffff';
    this.ctx.fillRect(d.x, d.y, d.width * ratio, d.height);
    if (command.label) this.drawText({ kind: 'ui-text', text: command.label, x: d.x, y: d.y - 18, fontSize: 14, color: command.color || '#ffffff' });
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
    if (command.kind === 'ui-text') return this.drawText(command);
    if (command.kind === 'ui-gauge') return this.drawGauge(command);
    if (command.kind === 'hud' || command.kind === 'battlefield') return;

    const image = this.assetFor(command);
    if (!image) return;
    const previous = this.ctx.globalAlpha;
    this.ctx.globalAlpha = clamp(command.opacity ?? 1, 0, 1);

    if (command.kind === 'tile' && command.source) {
      const s = command.source;
      this.ctx.drawImage(image, s.sx ?? s.x ?? 0, s.sy ?? s.y ?? 0, s.sw ?? s.width ?? 48, s.sh ?? s.height ?? 48, Number(command.screenX) || 0, Number(command.screenY) || 0, s.dw ?? s.sw ?? 48, s.dh ?? s.sh ?? 48);
    } else if (command.kind === 'sprite' && command.source) {
      const s = command.source;
      const sw = s.sw ?? s.width ?? 48, sh = s.sh ?? s.height ?? 48;
      const dx = Number(command.screenX) || 0, dy = Number(command.screenY) || 0;
      this.ctx.drawImage(image, s.sx ?? s.x ?? 0, s.sy ?? s.y ?? 0, sw, sh, dx, dy, s.dw ?? sw, s.dh ?? sh);
    } else if (command.kind === 'parallax') {
      const w = Number(image.width) || this.viewport.logicalWidth, h = Number(image.height) || this.viewport.logicalHeight;
      let startX = -(Number(command.offsetX) || 0) % w, startY = -(Number(command.offsetY) || 0) % h;
      if (startX > 0) startX -= w;
      if (startY > 0) startY -= h;
      const endX = command.loopX === false ? startX + w : this.viewport.logicalWidth + w;
      const endY = command.loopY === false ? startY + h : this.viewport.logicalHeight + h;
      for (let y = startY; y < endY; y += h) for (let x = startX; x < endX; x += w) this.ctx.drawImage(image, x, y, w, h);
    } else {
      const d = command.destination || { x: Number(command.x) || 0, y: Number(command.y) || 0, width: Number(image.width) || this.viewport.logicalWidth, height: Number(image.height) || this.viewport.logicalHeight };
      if (command.kind === 'ui-nine-slice' && command.source) {
        const s = command.source;
        this.ctx.drawImage(image, s.x, s.y, s.width, s.height, d.x, d.y, d.width, d.height);
      } else this.ctx.drawImage(image, d.x, d.y, d.width, d.height);
    }
    this.ctx.globalAlpha = previous;
  }

  endFrame() { this.ctx.restore(); }
}
