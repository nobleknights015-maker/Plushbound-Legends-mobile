import { ClassicUiRenderer } from './ClassicUiRenderer.js';

function clone(value) { return value == null ? value : structuredClone(value); }
function z(value, fallback = 0) { return Number.isFinite(Number(value)) ? Number(value) : fallback; }

export class SceneRenderExecutor {
  constructor({ uiRenderer = null, backend = null, viewportWidth = 1604, viewportHeight = 720 } = {}) {
    this.uiRenderer = uiRenderer || new ClassicUiRenderer();
    this.backend = backend;
    this.viewportWidth = viewportWidth;
    this.viewportHeight = viewportHeight;
    this.lastFrame = [];
  }

  compose(scene = {}, { timeMs = 0, transition = null, transitionProgress = 0 } = {}) {
    const commands = [];
    for (const layer of scene.layers || []) {
      const baseZ = z(layer.z, 0);
      if (layer.kind === 'background' || layer.kind === 'logo') {
        commands.push({ kind: 'image', role: layer.kind, assetId: layer.assetId, fit: layer.fit || null, x: layer.x, y: layer.y, anchorX: layer.anchorX, anchorY: layer.anchorY, z: baseZ });
      } else if (layer.kind === 'map') {
        for (const command of layer.drawList || []) commands.push({ ...clone(command), z: z(command.z, baseZ) });
      } else if (layer.kind === 'battlefield') {
        commands.push({ kind: 'battlefield', battlers: clone(layer.battlers || []), z: baseZ });
      } else if (layer.kind === 'window') {
        commands.push(...this.uiRenderer.windowCommands(layer.model, { z: baseZ }));
        for (const item of layer.model?.items || []) {
          if (item.selected) commands.push(...this.uiRenderer.selectionCommands({ itemRect: item.rect, timeMs, enabled: item.enabled !== false, z: baseZ + 20 }));
        }
      } else if (layer.kind === 'hud' || layer.kind === 'dimmer') {
        commands.push({ kind: layer.kind === 'dimmer' ? 'ui-dimmer' : 'hud', model: clone(layer.model || layer), opacity: layer.opacity, z: baseZ });
      }
    }

    // Screen models such as menu/save/shop/quests may not expose layers in the same form.
    if (!scene.layers || ['menu', 'save', 'load', 'shop', 'quests'].includes(scene.type)) {
      commands.push(...this.uiRenderer.composeScreen(scene, { timeMs }));
    }

    if (transition) {
      commands.push(...this.uiRenderer.transitionCommands(transition, {
        progress: transitionProgress,
        viewportWidth: this.viewportWidth,
        viewportHeight: this.viewportHeight
      }));
    }

    return commands.sort((a, b) => z(a.z) - z(b.z));
  }

  execute(scene = {}, options = {}) {
    const frame = this.compose(scene, options);
    this.lastFrame = clone(frame);
    if (!this.backend) return frame;
    this.backend.beginFrame?.({ width: this.viewportWidth, height: this.viewportHeight });
    for (const command of frame) this.backend.draw?.(clone(command));
    this.backend.endFrame?.();
    return frame;
  }

  snapshot() {
    return { viewportWidth: this.viewportWidth, viewportHeight: this.viewportHeight, lastFrame: clone(this.lastFrame) };
  }
}

export class RecordingRenderBackend {
  constructor() { this.frames = []; this.current = null; }
  beginFrame(meta = {}) { this.current = { meta: clone(meta), commands: [] }; }
  draw(command) { if (!this.current) this.beginFrame(); this.current.commands.push(clone(command)); }
  endFrame() { if (this.current) this.frames.push(this.current); this.current = null; }
  latest() { return clone(this.frames.at(-1) || null); }
  clear() { this.frames = []; this.current = null; }
}
