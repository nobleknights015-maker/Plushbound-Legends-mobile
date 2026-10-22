import { ClassicWindowSystem } from './ClassicWindowSystem.js';
import { AssetBindingRegistry } from './AssetBindingRegistry.js';

function clone(value) { return value == null ? value : structuredClone(value); }
function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }

export class ClassicScreenPresentation {
  constructor({ viewportWidth = 1604, viewportHeight = 720, windows = null, assets = null } = {}) {
    this.viewportWidth = viewportWidth;
    this.viewportHeight = viewportHeight;
    this.windows = windows || new ClassicWindowSystem({ viewportWidth, viewportHeight });
    this.assets = assets || new AssetBindingRegistry();
  }

  mainMenu({ commands = [], party = [], guardian = null, gold = 0, playtime = '', location = '', selectedIndex = 0 } = {}) {
    const commandWindow = this.windows.commandWindow({ id: 'menu-command', commands, width: 340, x: 24, y: 96, index: selectedIndex, maxRows: 10 });
    const status = party.map((member, index) => this.#partyCard(member, index));
    const guardianCard = guardian ? {
      kind: 'guardian-card',
      id: String(guardian.id || 'guardian'),
      name: String(guardian.name || guardian.id || 'Guardian'),
      portraitAssetId: this.assets.portrait(guardian, 'guardian'),
      bond: clone(guardian.bond || {}),
      rect: { x: this.viewportWidth - 360, y: 112, width: 320, height: 170 }
    } : null;
    return {
      type: 'menu',
      background: { kind: 'dimmer', opacity: 0.58 },
      skinAssetId: this.assets.resolve('ui/windowskin'),
      cursorAssetId: this.assets.resolve('ui/cursor'),
      layers: [
        { kind: 'window', z: 10, model: commandWindow },
        { kind: 'party-status', z: 20, cards: status },
        guardianCard ? { kind: 'guardian-status', z: 25, card: guardianCard } : null,
        { kind: 'window', z: 30, model: this.windows.windowModel({ id: 'menu-info', rect: { x: 24, y: this.viewportHeight - 122, width: 520, height: 98 }, gold: Number(gold) || 0, playtime: String(playtime || ''), location: String(location || '') }) }
      ].filter(Boolean)
    };
  }

  saveScreen({ slots = [], selectedIndex = 0, mode = 'save' } = {}) {
    const rows = slots.map((slot, index) => ({
      id: String(slot.slot ?? index + 1),
      selected: index === selectedIndex,
      valid: slot.valid !== false,
      empty: !slot.exists,
      iconAssetId: this.assets.resolve(slot.exists ? 'ui/save-filled' : 'ui/save-empty'),
      title: slot.exists ? String(slot.label || `File ${slot.slot ?? index + 1}`) : `File ${slot.slot ?? index + 1}`,
      savedAt: slot.savedAt ?? null,
      location: slot.location || slot.extra?.location || '',
      playtime: slot.playtime || slot.extra?.playtime || '',
      partyPreview: clone(slot.partyPreview || slot.extra?.partyPreview || []),
      rect: { x: 80, y: 112 + index * 102, width: this.viewportWidth - 160, height: 88 }
    }));
    return {
      type: mode === 'load' ? 'load' : 'save',
      title: mode === 'load' ? 'Load Game' : 'Save Game',
      skinAssetId: this.assets.resolve('ui/windowskin'),
      cursorAssetId: this.assets.resolve('ui/cursor'),
      rows
    };
  }

  shopScreen({ goods = [], selectedIndex = 0, gold = 0, mode = 'buy', help = '' } = {}) {
    const rows = goods.map((good, index) => ({
      id: String(good.id ?? index),
      selected: index === selectedIndex,
      enabled: good.enabled !== false && (mode !== 'buy' || (Number(gold) || 0) >= (Number(good.price) || 0)),
      name: String(good.name || good.id || ''),
      price: Math.max(0, Number(good.price) || 0),
      stock: good.stock == null ? null : Math.max(0, Number(good.stock) || 0),
      owned: Math.max(0, Number(good.owned) || 0),
      iconAssetId: this.assets.itemIcon(good),
      rect: { x: 32, y: 160 + index * 52, width: 900, height: 48 }
    }));
    return {
      type: 'shop',
      mode: mode === 'sell' ? 'sell' : 'buy',
      tabAssetId: this.assets.resolve(mode === 'sell' ? 'ui/shop-sell' : 'ui/shop-buy'),
      skinAssetId: this.assets.resolve('ui/windowskin'),
      help: this.windows.helpWindow({ text: help || (mode === 'sell' ? 'Choose an item to sell.' : 'Choose an item to buy.'), heightLines: 2 }),
      list: rows,
      goldWindow: this.windows.windowModel({ id: 'shop-gold', rect: { x: this.viewportWidth - 330, y: 104, width: 298, height: 96 }, gold: Number(gold) || 0 })
    };
  }

  questScreen({ quests = [], selectedIndex = 0, filter = 'active' } = {}) {
    const filtered = quests.filter(quest => filter === 'all' || String(quest.status || 'active') === filter);
    const list = filtered.map((quest, index) => ({
      id: String(quest.id ?? index),
      selected: index === selectedIndex,
      title: String(quest.title || quest.name || quest.id || 'Quest'),
      status: String(quest.status || 'active'),
      stage: Number(quest.stage) || 0,
      objective: String(quest.objective || ''),
      iconAssetId: this.assets.resolve(String(quest.status) === 'complete' ? 'ui/quest-complete' : 'ui/quest-active'),
      rect: { x: 24, y: 118 + index * 58, width: 510, height: 52 }
    }));
    const selected = list[clamp(selectedIndex, 0, Math.max(0, list.length - 1))] || null;
    return {
      type: 'quests',
      filter,
      skinAssetId: this.assets.resolve('ui/windowskin'),
      list,
      detail: this.windows.windowModel({
        id: 'quest-detail',
        rect: { x: 558, y: 118, width: this.viewportWidth - 582, height: this.viewportHeight - 150 },
        quest: selected ? clone(filtered.find(q => String(q.id) === selected.id) || null) : null
      })
    };
  }

  #partyCard(member, index) {
    return {
      kind: 'party-card',
      id: String(member.id ?? index),
      name: String(member.name || member.id || 'Traveler'),
      level: Number(member.level) || 1,
      portraitAssetId: this.assets.portrait(member, 'player'),
      states: clone(member.states || []),
      hp: { value: Number(member.hp) || 0, max: Math.max(1, Number(member.maxHp) || 1) },
      mp: { value: Number(member.mp) || 0, max: Math.max(1, Number(member.maxMp) || 1) },
      tp: { value: Number(member.tp) || 0, max: Math.max(1, Number(member.maxTp) || 100) },
      rect: { x: 392, y: 100 + index * 138, width: 770, height: 126 }
    };
  }
}
