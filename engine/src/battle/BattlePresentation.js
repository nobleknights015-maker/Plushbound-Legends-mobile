import { gaugeModel, portraitModel, transitionModel, PLUSHBOUND_VISUAL_THEME } from '../ui/VisualTheme.js';

function clone(value) { return value == null ? value : structuredClone(value); }
function clamp(value, min, max) { return Math.max(min, Math.min(max, Number(value) || 0)); }

export class BattlePresentation {
  constructor({ viewportWidth = 1604, viewportHeight = 720, theme = PLUSHBOUND_VISUAL_THEME } = {}) {
    this.viewportWidth = Math.max(320, Number(viewportWidth) || 1604);
    this.viewportHeight = Math.max(240, Number(viewportHeight) || 720);
    this.theme = theme;
    this.popups = [];
  }

  actorStatus(actor, index = 0, count = 1) {
    const panelWidth = Math.floor(this.viewportWidth / Math.max(1, Math.min(4, count)));
    const x = index * panelWidth;
    const y = this.viewportHeight - 146;
    const portrait = portraitModel({ assetId: actor.faceAssetId || actor.portraitAssetId || null, x: x + 12, y: y + 8, width: 88, height: 88, theme: this.theme });
    return {
      id: String(actor.id ?? index),
      rect: { x, y, width: panelWidth, height: 146 },
      name: String(actor.name || actor.id || ''),
      portrait,
      gauges: [
        gaugeModel({ kind: 'hp', current: actor.hp, max: actor.maxHp ?? actor.mhp ?? actor.hp ?? 1, width: panelWidth - 124, x: x + 112, y: y + 34, theme: this.theme }),
        gaugeModel({ kind: 'mp', current: actor.mp ?? 0, max: actor.maxMp ?? actor.mmp ?? 1, width: panelWidth - 124, x: x + 112, y: y + 62, theme: this.theme }),
        gaugeModel({ kind: 'tp', current: actor.tp ?? 0, max: actor.maxTp ?? 100, width: panelWidth - 124, x: x + 112, y: y + 90, theme: this.theme })
      ],
      states: clone(actor.states || []),
      active: actor.active !== false
    };
  }

  hud({ party = [], commands = [], selectedCommand = 0, log = [], backgroundAssetId = null } = {}) {
    const actors = party.slice(0, 4).map((actor, i) => this.actorStatus(actor, i, party.length));
    return {
      type: 'battle-hud',
      backgroundAssetId,
      actors,
      commandWindow: {
        id: 'battle-command',
        x: 18,
        y: this.viewportHeight - 360,
        width: 360,
        rowHeight: 42,
        selectedIndex: clamp(selectedCommand, 0, Math.max(0, commands.length - 1)),
        commands: commands.map((command, i) => ({
          id: String(command.id ?? i),
          text: String(command.text ?? command.label ?? command.id ?? ''),
          iconId: command.iconId ?? null,
          enabled: command.enabled !== false
        })),
        skinAssetId: this.theme.windowSkinAssetId,
        cursorAssetId: this.theme.cursorAssetId
      },
      log: clone(log).slice(-4),
      iconAtlasAssetId: this.theme.iconAtlasAssetId,
      popups: clone(this.popups),
      transitionIn: transitionModel('battle', { direction: 'in', theme: this.theme }),
      transitionOut: transitionModel('battle', { direction: 'out', theme: this.theme })
    };
  }

  addPopup({ targetId = null, value = 0, type = 'damage', critical = false, x = 0, y = 0, durationMs = 900 } = {}) {
    const numeric = Math.abs(Math.round(Number(value) || 0));
    const color = critical ? this.theme.colors.critical : type === 'heal' ? this.theme.colors.heal : this.theme.colors.damage;
    const popup = {
      id: `${String(targetId ?? 'target')}:${this.popups.length}`,
      targetId,
      text: type === 'heal' ? `+${numeric}` : String(numeric),
      type,
      critical: !!critical,
      color,
      x: Math.round(x),
      y: Math.round(y),
      risePx: 44,
      durationMs: Math.max(100, Number(durationMs) || 900)
    };
    this.popups.push(popup);
    return clone(popup);
  }

  clearPopups() {
    this.popups.length = 0;
  }

  victory({ gold = 0, exp = 0, items = [], title = 'Victory!' } = {}) {
    return {
      type: 'victory-panel',
      title,
      skinAssetId: this.theme.windowSkinAssetId,
      rewards: {
        gold: Math.max(0, Number(gold) || 0),
        exp: Math.max(0, Number(exp) || 0),
        items: clone(items)
      },
      transition: transitionModel('fade', { direction: 'in', durationMs: 180, theme: this.theme })
    };
  }
}
