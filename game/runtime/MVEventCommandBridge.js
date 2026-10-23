const IMPLEMENTED_CODES = Object.freeze([
  101, 102, 103, 105, 108, 111, 112, 113, 115, 117, 118, 119,
  121, 122, 123, 125, 126, 127, 128, 129, 201, 352, 355, 356,
  401, 402, 403, 404, 405, 408, 413, 655
]);

const DEFERRED_CODES = Object.freeze({
  104: 'Select Item needs the MV message/item-choice UI facade',
  124: 'Timer needs a persistent MV timer facade',
  132: 'Battle BGM belongs to the AudioManager/BattleManager tranche',
  133: 'Victory ME belongs to the AudioManager/BattleManager tranche',
  134: 'Save access settings belong to the system/config tranche',
  135: 'Menu access settings belong to the scene/config tranche',
  136: 'Encounter settings belong to the map/encounter facade tranche',
  137: 'Formation settings belong to the party/scene facade tranche',
  138: 'Window color belongs to the window/system facade tranche',
  139: 'Defeat ME belongs to the AudioManager/BattleManager tranche',
  140: 'Vehicle BGM belongs to the vehicle/audio tranche',
  202: 'Vehicle location needs a vehicle facade',
  203: 'Event relocation needs stable MV event IDs and character facades',
  204: 'Map scrolling needs the MV map-scroll facade',
  205: 'Move routes need Game_Character route semantics',
  206: 'Vehicle boarding needs a vehicle facade',
  211: 'Transparency needs the player sprite/character facade',
  212: 'Animation playback needs Sprite/ImageManager compatibility',
  213: 'Balloon icons need Sprite/ImageManager compatibility',
  214: 'Erase Event needs stable MV event IDs',
  216: 'Followers need the MV follower facade',
  217: 'Gather Followers needs the MV follower facade',
  221: 'Fadeout Screen needs the screen/render facade',
  222: 'Fadein Screen needs the screen/render facade',
  223: 'Tint Screen needs the screen/render facade',
  224: 'Flash Screen needs the screen/render facade',
  225: 'Shake Screen needs the screen/render facade',
  230: 'Wait needs frame-driven event execution instead of synchronous fast-settle execution',
  231: 'Show Picture needs Game_Screen/picture sprites',
  232: 'Move Picture needs Game_Screen/picture sprites',
  233: 'Rotate Picture needs Game_Screen/picture sprites',
  234: 'Tint Picture needs Game_Screen/picture sprites',
  235: 'Erase Picture needs Game_Screen/picture sprites',
  236: 'Weather needs the screen/render facade',
  241: 'Play BGM needs AudioManager compatibility',
  242: 'Fadeout BGM needs AudioManager compatibility',
  243: 'Save BGM needs AudioManager compatibility',
  244: 'Replay BGM needs AudioManager compatibility',
  245: 'Play BGS needs AudioManager compatibility',
  246: 'Fadeout BGS needs AudioManager compatibility',
  249: 'Play ME needs AudioManager compatibility',
  250: 'Play SE needs AudioManager compatibility',
  251: 'Stop SE needs AudioManager compatibility',
  261: 'Play Movie needs Graphics/video compatibility',
  281: 'Map name display needs the map/window facade',
  282: 'Tileset changes need MV tileset semantics',
  283: 'Battleback changes need battle rendering compatibility',
  284: 'Parallax changes need map rendering compatibility',
  285: 'Location Info needs full MV terrain/region/tile query semantics',
  301: 'Battle Processing needs BattleManager/troop compatibility',
  302: 'Shop Processing needs MV goods-list semantics',
  303: 'Name Input needs Scene_Name/window compatibility',
  311: 'Change HP needs Game_Battler compatibility',
  312: 'Change MP needs Game_Battler compatibility',
  313: 'Change State needs Game_Battler compatibility',
  314: 'Recover All needs Game_Battler compatibility',
  315: 'Change EXP needs Game_Actor compatibility',
  316: 'Change Level needs Game_Actor compatibility',
  317: 'Change Parameter needs Game_Actor compatibility',
  318: 'Change Skill needs Game_Actor compatibility',
  319: 'Change Equipment needs Game_Actor compatibility',
  320: 'Change Name needs full Game_Actor compatibility',
  321: 'Change Class needs Game_Actor compatibility',
  322: 'Change Actor Images needs actor/sprite compatibility',
  323: 'Change Vehicle Image needs vehicle/sprite compatibility',
  324: 'Change Nickname needs full Game_Actor compatibility',
  325: 'Change Profile needs full Game_Actor compatibility',
  331: 'Change Enemy HP needs Game_Enemy compatibility',
  332: 'Change Enemy MP needs Game_Enemy compatibility',
  333: 'Change Enemy State needs Game_Enemy compatibility',
  334: 'Enemy Recover All needs Game_Enemy compatibility',
  335: 'Enemy Appear needs troop/battle compatibility',
  336: 'Enemy Transform needs troop/battle compatibility',
  337: 'Show Battle Animation needs battle rendering compatibility',
  339: 'Force Action needs BattleManager/Game_Action compatibility',
  340: 'Abort Battle needs BattleManager compatibility',
  351: 'Open Menu needs Scene_Menu/window compatibility',
  353: 'Game Over needs Scene_Gameover compatibility',
  354: 'Return to Title needs Scene_Title compatibility'
});

function clone(value) {
  if (value == null) return value;
  if (typeof structuredClone === 'function') return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
}

function commandCode(command) { return Number(command?.code); }
function stringId(value) { return String(value ?? '').trim(); }
function integer(value, fallback = 0) { const n = Number(value); return Number.isFinite(n) ? Math.trunc(n) : fallback; }

export class MVEventCompatibilityError extends Error {
  constructor(code, message) {
    super(`MV event command ${code}: ${message}`);
    this.name = 'MVEventCompatibilityError';
    this.code = Number(code);
  }
}

export class MVEventCommandBridge {
  constructor({ scope = globalThis, runtime, mvPlugins = runtime?.mvPlugins, logger = console } = {}) {
    if (!runtime?.session?.registry) throw new Error('MVEventCommandBridge requires an initialized Plushbound runtime');
    this.scope = scope;
    this.runtime = runtime;
    this.session = runtime.session;
    this.state = runtime.state;
    this.mvPlugins = mvPlugins;
    this.logger = logger;
    this.installed = false;
  }

  install() {
    if (this.installed) return this;
    this.installed = true;
    for (const code of IMPLEMENTED_CODES) {
      if (!this.session.registry.has(code)) this.session.registry.register(code, frame => this.execute(code, frame));
    }
    this.installInterpreterMethods();
    return this;
  }

  installInterpreterMethods() {
    const Interpreter = this.mvPlugins?.Interpreter || this.scope.Game_Interpreter;
    if (!Interpreter?.prototype) return this;
    const bridge = this;
    for (const code of IMPLEMENTED_CODES) {
      const name = `command${code}`;
      if (typeof Interpreter.prototype[name] === 'function') continue;
      Object.defineProperty(Interpreter.prototype, name, {
        configurable: true,
        writable: true,
        value: function() {
          const result = bridge.execute(code, {
            interpreter: this._plushboundInterpreter || null,
            state: bridge.state,
            context: {
              mapId: bridge.mvPlugins?.plushboundMapId?.(this._mapId) || bridge.state.map.id,
              eventId: this._eventId || 0,
              commonEvents: bridge.session.commonEvents,
              hooks: bridge.session.game?.hooks
            },
            parameters: this._params || [],
            indent: this._indent || 0,
            command: { code, parameters: this._params || [], indent: this._indent || 0 },
            compatibilityInterpreter: this
          });
          this._plushboundLastCommandResult = result;
          return ![101, 102, 103, 105, 201].includes(code);
        }
      });
    }
    return this;
  }

  status(code) {
    const numeric = Number(code);
    if (IMPLEMENTED_CODES.includes(numeric)) return { code: numeric, status: 'implemented', reason: null };
    if (Object.prototype.hasOwnProperty.call(DEFERRED_CODES, numeric)) return { code: numeric, status: 'deferred', reason: DEFERRED_CODES[numeric] };
    return { code: numeric, status: 'unknown', reason: 'Command has not been classified in the MV parity table yet' };
  }

  execute(code, frame = {}) {
    const numeric = Number(code);
    if (!IMPLEMENTED_CODES.includes(numeric)) {
      const status = this.status(numeric);
      throw new MVEventCompatibilityError(numeric, status.reason || 'unsupported');
    }
    const params = Array.isArray(frame.parameters) ? frame.parameters : [];
    switch (numeric) {
      case 101: return this.showText(frame, params);
      case 102: return this.native('CHOICE', [clone(params[0] || []), { cancelType: params[1], defaultType: params[2] ?? 0, positionType: params[3] ?? 2, background: params[4] ?? 0 }], frame);
      case 103: return this.native('INPUT_NUMBER', [String(params[0] ?? ''), { maxDigits: Math.max(1, integer(params[1], 1)) }], frame);
      case 105: return this.showScrollingText(frame, params);
      case 108:
      case 401:
      case 405:
      case 408:
      case 655: return undefined;
      case 111: return this.conditionalBranch(frame, params);
      case 112:
      case 118:
      case 404: return undefined;
      case 113: return this.breakLoop(frame);
      case 115: return this.native('EXIT_EVENT', [], frame);
      case 117: return this.callCommonEvent(frame, params);
      case 119: return this.jumpToLabel(frame, params);
      case 121: return this.controlSwitches(params);
      case 122: return this.controlVariables(params, frame);
      case 123: return this.controlSelfSwitch(frame, params);
      case 125: return this.changeGold(params);
      case 126: return this.changeInventory('items', this.scope.$dataItems, params);
      case 127: return this.changeInventory('weapons', this.scope.$dataWeapons, params);
      case 128: return this.changeInventory('armor', this.scope.$dataArmors, params);
      case 129: return this.changePartyMember(params);
      case 201: return this.transferPlayer(params);
      case 352: return this.saveGame();
      case 355: return this.runScript(frame, params);
      case 356: return this.pluginCommand(frame, params);
      case 402: return this.choiceBranch(frame, params, false);
      case 403: return this.choiceBranch(frame, params, true);
      case 413: return this.repeatAbove(frame);
      default: throw new MVEventCompatibilityError(numeric, 'implemented table and executor are out of sync');
    }
  }

  native(code, parameters, frame = {}) {
    const handler = this.session.registry.get(code);
    if (!handler) throw new MVEventCompatibilityError(frame.command?.code || code, `native Plushbound command ${code} is unavailable`);
    return handler({
      interpreter: frame.interpreter,
      state: frame.state || this.state,
      context: frame.context || {},
      parameters,
      indent: frame.indent || 0,
      command: { ...(frame.command || {}), code, parameters }
    });
  }

  showText(frame, params) {
    const lines = [];
    const list = frame.interpreter?.list;
    if (Array.isArray(list)) {
      while (frame.interpreter.index < list.length && commandCode(list[frame.interpreter.index]) === 401) {
        lines.push(String(list[frame.interpreter.index].parameters?.[0] ?? ''));
        frame.interpreter.index++;
      }
    }
    if (!lines.length && params.length > 4) lines.push(String(params[4] ?? ''));
    const meta = { faceName: String(params[0] || ''), faceIndex: integer(params[1]), background: integer(params[2]), positionType: integer(params[3], 2), mvCommand: 101 };
    return this.native('MESSAGE', [lines.join('\n'), meta], frame);
  }

  showScrollingText(frame, params) {
    const lines = [];
    const list = frame.interpreter?.list;
    if (Array.isArray(list)) {
      while (frame.interpreter.index < list.length && commandCode(list[frame.interpreter.index]) === 405) {
        lines.push(String(list[frame.interpreter.index].parameters?.[0] ?? ''));
        frame.interpreter.index++;
      }
    }
    return this.native('MESSAGE', [lines.join('\n'), { scroll: true, speed: integer(params[0], 2), noFast: !!params[1], mvCommand: 105 }], frame);
  }

  skipBranch(frame) {
    const interpreter = frame.interpreter;
    if (!interpreter?.list) return undefined;
    let index = interpreter.index;
    const indent = Number(frame.indent || 0);
    while (index < interpreter.list.length && Number(interpreter.list[index]?.indent || 0) > indent) index++;
    return { jumpTo: index };
  }

  conditionalBranch(frame, params) {
    let result = false;
    const kind = integer(params[0], -1);
    if (kind === 0) result = this.scope.$gameSwitches?.value(params[1]) === (integer(params[2]) === 0);
    else if (kind === 1) {
      const left = this.scope.$gameVariables?.value(params[1]);
      const right = integer(params[2]) === 0 ? params[3] : this.scope.$gameVariables?.value(params[3]);
      const op = integer(params[4]);
      result = op === 0 ? left === right : op === 1 ? left >= right : op === 2 ? left <= right : op === 3 ? left > right : op === 4 ? left < right : left !== right;
    } else if (kind === 2) {
      const key = [frame.compatibilityInterpreter?._mapId || this.mvPlugins?.mvMapId?.(frame.context?.mapId) || 0, frame.context?.eventId || 0, params[1]];
      result = this.scope.$gameSelfSwitches?.value(key) === (integer(params[2]) === 0);
    } else if (kind === 7) {
      const gold = this.scope.$gameParty?.gold?.() || 0, compare = Number(params[1]) || 0, op = integer(params[2]);
      result = op === 0 ? gold >= compare : op === 1 ? gold <= compare : gold < compare;
    } else if ([8, 9, 10].includes(kind)) {
      const tables = { 8: this.scope.$dataItems, 9: this.scope.$dataWeapons, 10: this.scope.$dataArmors };
      result = !!this.scope.$gameParty?.hasItem?.(tables[kind]?.[params[1]], kind !== 8 ? !!params[2] : false);
    } else if (kind === 11) result = !!this.scope.Input?.isPressed?.(params[1]);
    else if (kind === 12) result = !!this.evaluateScript(String(params[1] || 'false'));
    else throw new MVEventCompatibilityError(111, `conditional type ${kind} requires a later actor/enemy/timer/character facade`);
    return result ? undefined : this.skipBranch(frame);
  }

  choiceBranch(frame, params, cancel) {
    const choice = Number(frame.context?.lastChoice);
    const matches = cancel ? !(choice >= 0) : choice === Number(params[0]);
    return matches ? undefined : this.skipBranch(frame);
  }

  breakLoop(frame) {
    const interpreter = frame.interpreter;
    if (!interpreter?.list) return undefined;
    const indent = Number(frame.indent || 0);
    for (let i = interpreter.index; i < interpreter.list.length; i++) {
      const command = interpreter.list[i];
      if (commandCode(command) === 413 && Number(command.indent || 0) === indent) return { jumpTo: i + 1 };
    }
    return undefined;
  }

  repeatAbove(frame) {
    const interpreter = frame.interpreter;
    if (!interpreter?.list) return undefined;
    const indent = Number(frame.indent || 0);
    for (let i = interpreter.index - 2; i >= 0; i--) {
      const command = interpreter.list[i];
      if (commandCode(command) === 112 && Number(command.indent || 0) === indent) return { jumpTo: i };
    }
    return undefined;
  }

  callCommonEvent(frame, params) {
    const mvId = integer(params[0]);
    const event = this.scope.$dataCommonEvents?.[mvId];
    if (event?.list && frame.interpreter?.call) {
      frame.interpreter.call(event.list, { ...(frame.context || {}), commonEventId: event._plushboundId || mvId });
      return undefined;
    }
    const sourceId = this.runtime.mvDatabase?.sourceId?.('commonEvents', mvId);
    if (sourceId) return this.native('COMMON_EVENT', [sourceId], frame);
    throw new MVEventCompatibilityError(117, `unknown common event ${mvId}`);
  }

  jumpToLabel(frame, params) {
    const interpreter = frame.interpreter;
    if (!interpreter?.list) return undefined;
    const label = String(params[0] ?? '');
    const index = interpreter.list.findIndex(command => commandCode(command) === 118 && String(command.parameters?.[0] ?? '') === label);
    return index >= 0 ? { jumpTo: index + 1 } : undefined;
  }

  controlSwitches(params) {
    const start = integer(params[0]), end = integer(params[1], start), value = integer(params[2]) === 0;
    for (let id = start; id <= end; id++) this.scope.$gameSwitches?.setValue(id, value);
    return undefined;
  }

  variableOperand(params, frame) {
    const operandType = integer(params[3]);
    if (operandType === 0) return params[4];
    if (operandType === 1) return this.scope.$gameVariables?.value(params[4]);
    if (operandType === 2) {
      const min = integer(params[4]), max = integer(params[5], min);
      return min + Math.randomInt(Math.max(0, max - min + 1));
    }
    if (operandType === 4) return this.evaluateScript(String(params[4] || '0'));
    throw new MVEventCompatibilityError(122, `operand type ${operandType} (Game Data) needs the corresponding actor/map/battle facade`);
  }

  controlVariables(params, frame) {
    const start = integer(params[0]), end = integer(params[1], start), operation = integer(params[2]), value = this.variableOperand(params, frame);
    for (let id = start; id <= end; id++) {
      const current = this.scope.$gameVariables?.value(id) ?? 0;
      let next = value;
      if (operation === 1) next = Number(current) + Number(value);
      else if (operation === 2) next = Number(current) - Number(value);
      else if (operation === 3) next = Number(current) * Number(value);
      else if (operation === 4) next = Number(value) === 0 ? current : Number(current) / Number(value);
      else if (operation === 5) next = Number(value) === 0 ? current : Number(current) % Number(value);
      this.scope.$gameVariables?.setValue(id, next);
    }
    return undefined;
  }

  controlSelfSwitch(frame, params) {
    const mapId = frame.compatibilityInterpreter?._mapId || this.mvPlugins?.mvMapId?.(frame.context?.mapId) || 0;
    const eventId = frame.context?.eventId || frame.compatibilityInterpreter?._eventId || 0;
    this.scope.$gameSelfSwitches?.setValue([mapId, eventId, params[0]], integer(params[1]) === 0);
    return undefined;
  }

  operateValue(operation, operandType, operand) {
    const raw = integer(operandType) === 0 ? Number(operand) || 0 : Number(this.scope.$gameVariables?.value(operand)) || 0;
    return integer(operation) === 0 ? raw : -raw;
  }

  changeGold(params) {
    this.scope.$gameParty?.gainGold?.(this.operateValue(params[0], params[1], params[2]));
    return undefined;
  }

  changeInventory(kind, table, params) {
    const item = table?.[integer(params[0])];
    if (!item) throw new MVEventCompatibilityError(kind === 'items' ? 126 : kind === 'weapons' ? 127 : 128, `unknown ${kind} id ${params[0]}`);
    const value = this.operateValue(params[1], params[2], params[3]);
    this.scope.$gameParty?.gainItem?.(item, value, !!params[4]);
    return undefined;
  }

  changePartyMember(params) {
    const actor = this.scope.$dataActors?.[integer(params[0])];
    if (!actor) throw new MVEventCompatibilityError(129, `unknown actor id ${params[0]}`);
    const sourceId = String(actor._plushboundId || actor.id);
    if (!Array.isArray(this.state.party)) this.state.party = [];
    if (integer(params[1]) === 0) {
      if (!this.state.party.map(String).includes(sourceId)) this.state.party.push(sourceId);
    } else this.state.party = this.state.party.filter(id => String(id) !== sourceId);
    this.mvPlugins?.changed?.('party', { actorId: actor.id, operation: integer(params[1]) === 0 ? 'add' : 'remove' });
    return undefined;
  }

  transferPlayer(params) {
    let mapId, x, y;
    if (integer(params[0]) === 0) {
      mapId = params[1]; x = params[2]; y = params[3];
    } else {
      mapId = this.scope.$gameVariables?.value(params[1]); x = this.scope.$gameVariables?.value(params[2]); y = this.scope.$gameVariables?.value(params[3]);
    }
    const sourceMapId = this.mvPlugins?.plushboundMapId?.(mapId) || String(mapId);
    const direction = integer(params[4]) || Number(this.state.map.direction) || 2;
    this.session.enter(sourceMapId, integer(x), integer(y), direction);
    this.mvPlugins?.changed?.('transfer', { mapId: sourceMapId, x: integer(x), y: integer(y), direction, fadeType: integer(params[5]) });
    return { yield: true };
  }

  saveGame() {
    this.scope.$gameSystem?.onBeforeSave?.();
    this.runtime.saveNow?.('mv-event-command-352');
    return { yield: true };
  }

  runScript(frame, params) {
    const lines = [String(params[0] ?? '')];
    const list = frame.interpreter?.list;
    if (Array.isArray(list)) {
      while (frame.interpreter.index < list.length && commandCode(list[frame.interpreter.index]) === 655) {
        lines.push(String(list[frame.interpreter.index].parameters?.[0] ?? ''));
        frame.interpreter.index++;
      }
    }
    this.evaluateScript(lines.join('\n'));
    return undefined;
  }

  pluginCommand(frame, params) {
    const line = String(params[0] ?? '');
    if (!line.trim()) return undefined;
    const handler = this.session.registry.get('PLUGIN_COMMAND');
    if (!handler) throw new MVEventCompatibilityError(356, 'Plugin Command bridge is unavailable');
    return handler({ ...frame, parameters: [line], command: { ...(frame.command || {}), code: 'PLUGIN_COMMAND', parameters: [line] } });
  }

  evaluateScript(script) {
    const fn = Function(String(script || ''));
    return fn.call(this.scope);
  }

  snapshot() {
    return {
      implemented: [...IMPLEMENTED_CODES],
      deferred: Object.entries(DEFERRED_CODES).map(([code, reason]) => ({ code: Number(code), reason })),
      implementedCount: IMPLEMENTED_CODES.length,
      deferredCount: Object.keys(DEFERRED_CODES).length
    };
  }
}

export function createMVEventCommandBridge(options = {}) { return new MVEventCommandBridge(options); }
export { IMPLEMENTED_CODES as MV_IMPLEMENTED_EVENT_COMMANDS, DEFERRED_CODES as MV_DEFERRED_EVENT_COMMANDS };
