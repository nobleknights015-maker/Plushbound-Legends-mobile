import { ClassicWindowSystem } from '../ui/ClassicWindowSystem.js';

function clone(value) { return value == null ? value : structuredClone(value); }

export class PresentationSceneModel {
  constructor({ viewportWidth = 1604, viewportHeight = 720, windows = null } = {}) {
    this.windows = windows || new ClassicWindowSystem({ viewportWidth, viewportHeight });
    this.viewportWidth = viewportWidth;
    this.viewportHeight = viewportHeight;
  }

  title({ canContinue = false, logoAssetId = 'ui/title-logo', backgroundAssetId = 'ui/title-background' } = {}) {
    const commands = [
      { id: 'new-game', text: 'New Game', enabled: true },
      { id: 'continue', text: 'Continue', enabled: !!canContinue },
      { id: 'options', text: 'Options', enabled: true }
    ];
    return {
      type: 'title',
      backgroundAssetId,
      logoAssetId,
      layers: [
        { kind: 'background', assetId: backgroundAssetId, fit: 'cover', z: 0 },
        { kind: 'logo', assetId: logoAssetId, x: this.viewportWidth / 2, y: 120, anchorX: 0.5, anchorY: 0.5, z: 10 },
        { kind: 'window', z: 20, model: this.windows.commandWindow({ id: 'title-command', commands, width: 380, x: this.viewportWidth / 2 - 190, y: this.viewportHeight - 260 }) }
      ]
    };
  }

  map({ mapDrawList = null, hud = null, dialogue = null, choices = null } = {}) {
    const layers = [{ kind: 'map', z: 0, drawList: clone(mapDrawList) }];
    if (hud) layers.push({ kind: 'hud', z: 50000, model: clone(hud) });
    if (dialogue) {
      const message = this.windows.messageWindow({ hasFace: !!dialogue.faceAssetId, name: dialogue.speaker || null });
      layers.push({ kind: 'window', z: 90000, model: { ...message, text: String(dialogue.text || ''), faceAssetId: dialogue.faceAssetId || null } });
      if (choices?.length) layers.push({ kind: 'window', z: 90010, model: this.windows.choiceWindow({ choices, messageRect: message.rect, index: dialogue.choiceIndex || 0 }) });
    }
    return { type: 'map', layers };
  }

  menu({ commands = [], party = [], selectedIndex = 0, help = '' } = {}) {
    const commandWindow = this.windows.commandWindow({ id: 'menu-command', commands, width: 360, x: 24, y: 108, index: selectedIndex });
    const helpWindow = this.windows.helpWindow({ text: help, heightLines: 2 });
    const statusWindow = this.windows.windowModel({
      id: 'party-status',
      rect: { x: 400, y: 108, width: this.viewportWidth - 424, height: this.viewportHeight - 132 },
      members: clone(party)
    });
    return {
      type: 'menu',
      layers: [
        { kind: 'dimmer', z: 0, opacity: 0.55 },
        { kind: 'window', z: 10, model: helpWindow },
        { kind: 'window', z: 20, model: commandWindow },
        { kind: 'window', z: 20, model: statusWindow }
      ]
    };
  }

  battle({ backgroundAssetId = null, battlers = [], commandGroups = [], log = [] } = {}) {
    const layers = [];
    if (backgroundAssetId) layers.push({ kind: 'background', assetId: backgroundAssetId, fit: 'cover', z: 0 });
    layers.push({ kind: 'battlefield', battlers: clone(battlers), z: 10 });
    layers.push({ kind: 'window', z: 100, model: this.windows.windowModel({ id: 'battle-log', rect: { x: 0, y: 0, width: this.viewportWidth, height: 120 }, lines: clone(log) }) });
    if (commandGroups.length) {
      layers.push({ kind: 'window', z: 110, model: this.windows.commandWindow({ id: 'battle-command', commands: commandGroups, width: 420, x: 20, y: this.viewportHeight - 240, maxRows: 5 }) });
    }
    return { type: 'battle', layers };
  }
}
