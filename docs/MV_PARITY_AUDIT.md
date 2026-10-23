# RPG Maker MV parity audit

## Target

Plushbound Legends targets functional/editor/runtime compatibility with **RPG Maker MV 1.6.x** while remaining an independently implemented engine and editor. No RPG Maker proprietary editor code or stock assets are required by this compatibility layer.

Three labels are used here:

- **Native parity**: Plushbound provides the same practical capability through its own architecture.
- **MV API compatibility**: the MV-style JavaScript/global contract used by plugins is exposed by a Plushbound adapter.
- **Drop-in compatibility**: an MV plugin can be packaged and enabled without source changes.

Drop-in compatibility is not yet universal. The compatibility layer is deliberately built above frozen Engine v1 so parity work does not destabilize the core runtime.

## Current parity matrix

| Surface | Status | Notes |
| --- | --- | --- |
| 48x48 map/tile contract | Strong native parity | Existing Plushbound asset/map contracts already target MV-style dimensions. |
| Maps, layers, regions, passability, transfers | Strong native parity | Runtime + editor + validation + playtest exist. |
| Event pages, conditions, triggers | Strong native parity | Action/touch/autorun/parallel and page conditions are supported. |
| Event commands | Partial | High-value commands exist; MV Plugin Command is now first-class. Full MV event-command catalog remains to audit/bridge. |
| Common events | Strong native parity | Runtime and editor surfaces exist. |
| Switches / variables / self switches | Native + MV facade | `$gameSwitches`, `$gameVariables`, `$gameSelfSwitches` are bridged. |
| Plugin Manager | First-pass implemented | Ordered enabled list, packaged paths, parameters, metadata parsing, manifest validation and editor UI. |
| Plugin parameters | Implemented | Strings exposed through `PluginManager.parameters(name)`. |
| MV Plugin Command / event 356 | Implemented | `Game_Interpreter.prototype.pluginCommand(command,args)` is aliasable by classic MV plugins. |
| Classic plugin load order | Implemented | Enabled packaged scripts load in manifest order. |
| MV JS helper extensions | Implemented | clamp/mod/padZero/format/contains/clone/equals/randomInt compatibility helpers. |
| `$gameParty` / `$gameActors` | Basic facade | Common inventory/gold/member/actor access exists; full battler/equipment/class semantics remain. |
| `$gamePlayer` / `$gameMap` | Basic facade | Position, transfer, direction, map/event access and refresh hooks exist. |
| `$gameSystem` | Basic facade | Save count/playtime basics exist. |
| DataManager | Basic facade | Save/load bridge and item-kind helpers exist; MV database loading APIs remain partial. |
| `$dataItems`, `$dataEnemies` | Bridged | Existing Plushbound records are exposed through generated MV-style numeric IDs. |
| `$dataActors`, `$dataClasses`, `$dataSkills`, `$dataWeapons`, `$dataArmors`, `$dataStates`, `$dataAnimations`, `$dataTilesets`, `$dataCommonEvents` | Placeholder / incomplete | These require the next database-parity tranche and stable numeric IDs. |
| Graphics | Basic facade | Logical 1604x720 Plushbound screen exposed; full MV Graphics API remains. |
| Input / TouchInput | Basic facade | Common key/touch checks available; full frame semantics/remapping remain. |
| SceneManager | Basic facade | Basic goto/push/pop surface exists; full MV scene lifecycle is not yet emulated. |
| Scene_* / Window_* / Sprite_* classes | Missing | High priority for UI-heavy plugin compatibility. |
| BattleManager / battler classes | Partial native, MV facade missing | Plushbound battles work natively; MV JavaScript battle extension points require adapters. |
| AudioManager | Native capability, MV facade missing | Plushbound audio exists; MV method/global compatibility remains. |
| ImageManager / CacheManager | Missing | Needed by visual/UI plugins. |
| ConfigManager / StorageManager | Partial equivalent, MV facade missing | Autosave/storage exist natively. |
| PIXI internals / renderer monkey-patching | Not compatible yet | Deep renderer plugins need explicit compatibility work. |
| NW.js-only plugins | Unsupported on Android | Desktop/NW.js filesystem/window/process assumptions cannot be made portable to the Android-first runtime. |

## Plugin compatibility tiers

### Tier A — strongest now
Plugins focused on:
- plugin parameters
- switches and variables
- self switches
- Plugin Command / `Game_Interpreter.prototype.pluginCommand`
- basic party inventory/gold
- basic player/map state
- JavaScript helper extensions

These have the best chance of running unchanged once their `.js` file is packaged in `game/plugins` and enabled in `plugins.json`.

### Tier B — partial
Gameplay plugins that rely on actors, party, map/player state, basic data globals, save hooks or SceneManager may work partially. Missing methods are expected to be discovered through compatibility tests and added to the game-layer facade.

### Tier C — not complete yet
Plugins that deeply extend `Scene_*`, `Window_*`, `Sprite_*`, `BattleManager`, battler classes, `AudioManager`, `ImageManager`, or full database records need additional compatibility shims.

### Tier D — platform-specific
Plugins that require NW.js/Node desktop APIs, arbitrary local filesystem access, native desktop windows, or hard-coded MV PIXI internals are not promised as drop-in Android plugins. Equivalent behavior should be ported through Plushbound-native modules where practical.

## Plugin project contract

- Plugin directory: `game/plugins/`
- Manifest: `game/plugins/plugins.json`
- Runtime bridge: `game/runtime/MVPluginRuntime.js`
- Editor manager: `tools/editor/plugin-manager.html`
- MV plugin parameters remain strings.
- Manifest array order is plugin load order.
- Remote and parent-directory plugin paths are rejected; release APKs use packaged scripts.
- Plugin failures are surfaced instead of silently ignored.
- Frozen Engine v1 is not modified by this layer.

## Next parity priorities

1. **Database parity** — add stable MV numeric IDs and editor/runtime records for Actors, Classes, Skills, Weapons, Armors, States, Animations, Tilesets, System, Types and Terms.
2. **Event command audit** — map the complete MV event-command catalog and add native equivalents/adapters where meaningful.
3. **Scene/window/sprite compatibility** — provide the common base classes and lifecycle hooks used by UI plugins.
4. **Battle API facade** — `BattleManager`, battlers, actions, units, party/troop compatibility surfaces.
5. **Audio/image/config/storage facades** — bridge existing Plushbound services to familiar MV globals.
6. **Real plugin corpus testing** — maintain a legal test matrix of representative public/owned MV plugins and classify unchanged/adapter-needed/unsupported behavior.
7. **Editor database expansion** — expose the remaining MV-style database categories without sacrificing Plushbound-specific Guardian/lore systems.

## Reference behavior used for compatibility

The compatibility work is based on publicly documented RPG Maker MV plugin behavior and public MV core-script interfaces, including the MV Plugin Manager/plugin specification, classic script ordering, string parameters, `Game_Interpreter` plugin command behavior, and MV JavaScript helper extensions. The implementation in Plushbound is independent and lives outside frozen Engine v1.
