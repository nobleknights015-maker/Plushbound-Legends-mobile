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
| Event commands | Partial | High-value commands exist; MV Plugin Command is first-class. Full MV event-command catalog remains to audit/bridge. |
| Common events | Strong native parity | Native runtime and editor surfaces exist; MV-shaped common-event database records can now be authored separately. |
| Switches / variables / self switches | Native + MV facade | `$gameSwitches`, `$gameVariables`, `$gameSelfSwitches` are bridged. |
| Plugin Manager | First-pass implemented | Ordered enabled list, packaged paths, parameters, metadata parsing, manifest validation and editor UI. |
| Plugin parameters | Implemented | Strings exposed through `PluginManager.parameters(name)`. |
| MV Plugin Command / event 356 | Implemented | `Game_Interpreter.prototype.pluginCommand(command,args)` is aliasable by classic MV plugins. |
| Classic plugin load order | Implemented | Enabled packaged scripts load in manifest order. |
| MV JS helper extensions | Implemented | clamp/mod/padZero/format/contains/clone/equals/randomInt compatibility helpers. |
| Stable MV database IDs | Implemented foundation | `game/plugins/mv-database-ids.json` pins numeric IDs for exposed records; CI fails if current content introduces unregistered records. |
| `$dataItems`, `$dataEnemies`, `$dataMapInfos` | Bridged with stable IDs | Existing Plushbound records are exposed through explicit MV numeric IDs rather than load-order numbering. |
| `$dataActors`, `$dataClasses`, `$dataSkills`, `$dataWeapons`, `$dataArmors`, `$dataStates`, `$dataTroops`, `$dataAnimations`, `$dataTilesets`, `$dataCommonEvents` | Authorable / bridge-ready | `game/content/mv-database.json` provides real editor-visible collections. Arrays populate when actual records are authored; Guardians are intentionally not misrepresented as Actors. |
| MV note metadata | Implemented foundation | `<Tag>` and `<Key: Value>` note metadata is exposed through `meta` and `DataManager.extractMetadata`. |
| `$gameParty` / `$gameActors` | Basic facade | Common inventory/gold/member/actor access exists; full battler/equipment/class semantics remain. |
| `$gamePlayer` / `$gameMap` | Basic facade | Position, transfer, direction, map/event access and refresh hooks exist. |
| `$gameSystem` | Basic facade | Save count/playtime basics exist. |
| DataManager | Expanded basic facade | Save/load, type checks, metadata extraction, database-loaded hooks and item-kind helpers exist; full MV file-loading lifecycle remains intentionally replaced by packaged data. |
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
- stable item/enemy/map database IDs
- note metadata
- basic party inventory/gold
- basic player/map state
- JavaScript helper extensions

These have the best chance of running unchanged once their `.js` file is packaged in `game/plugins` and enabled in `plugins.json`.

### Tier B — partial
Gameplay plugins that rely on authored Actors/Classes/Skills/Weapons/Armors/States/Troops, party/map/player state, save hooks or SceneManager can now see MV-shaped database records, but deeper gameplay semantics are still being bridged.

### Tier C — not complete yet
Plugins that deeply extend `Scene_*`, `Window_*`, `Sprite_*`, `BattleManager`, battler classes, `AudioManager`, `ImageManager`, or advanced database behavior need additional compatibility shims.

### Tier D — platform-specific
Plugins that require NW.js/Node desktop APIs, arbitrary local filesystem access, native desktop windows, or hard-coded MV PIXI internals are not promised as drop-in Android plugins. Equivalent behavior should be ported through Plushbound-native modules where practical.

## Plugin project contract

- Plugin directory: `game/plugins/`
- Plugin manifest: `game/plugins/plugins.json`
- Stable database IDs: `game/plugins/mv-database-ids.json`
- MV compatibility database package: `game/content/mv-database.json`
- Runtime plugin bridge: `game/runtime/MVPluginRuntime.js`
- Runtime database bridge: `game/runtime/MVDatabaseBridge.js`
- Editor manager: `tools/editor/plugin-manager.html`
- MV plugin parameters remain strings.
- Manifest array order is plugin load order.
- Remote and parent-directory plugin paths are rejected; release APKs use packaged scripts.
- Plugin failures are surfaced instead of silently ignored.
- Frozen Engine v1 is not modified by this layer.

## Next parity priorities

1. **Event command audit** — map the complete MV event-command catalog and add native equivalents/adapters where meaningful.
2. **Scene/window/sprite compatibility** — provide the common base classes and lifecycle hooks used by UI plugins.
3. **Battle API facade** — `BattleManager`, battlers, actions, units, party/troop compatibility surfaces.
4. **Audio/image/config/storage facades** — bridge existing Plushbound services to familiar MV globals.
5. **Database semantics** — connect authored Actors/Classes/Skills/Equipment/States/Troops to native battle/equipment systems rather than exposing data only.
6. **Real plugin corpus testing** — maintain a legal test matrix of representative public/owned MV plugins and classify unchanged/adapter-needed/unsupported behavior.
7. **Editor database ergonomics** — add richer forms/templates for the new MV-compatible database collections while preserving Plushbound-specific Guardian/lore systems.

## Reference behavior used for compatibility

The compatibility work is based on publicly documented RPG Maker MV plugin behavior and public MV core-script interfaces, including the MV Plugin Manager/plugin specification, classic script ordering, string parameters, `Game_Interpreter` plugin command behavior, database globals, metadata extraction conventions, and MV JavaScript helper extensions. The implementation in Plushbound is independent and lives outside frozen Engine v1.
