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
| Event commands | Core numeric bridge implemented | 32 MV numeric codes are routed through real Plushbound services; missing subsystem families throw explicit compatibility errors rather than fake no-ops. See `MV_EVENT_COMMAND_PARITY.md`. |
| Common events | Strong native parity | Native runtime and editor surfaces exist; MV-shaped common-event database records can be authored separately. |
| Switches / variables / self switches | Native + MV facade | `$gameSwitches`, `$gameVariables`, `$gameSelfSwitches` are bridged. |
| Plugin Manager | Implemented foundation | Ordered enabled list, packaged paths, parameters, metadata parsing, manifest validation and editor UI. |
| Plugin parameters | Implemented | Strings exposed through `PluginManager.parameters(name)`. |
| MV Plugin Command / event 356 | Implemented | `Game_Interpreter.prototype.pluginCommand(command,args)` is aliasable by classic MV plugins. |
| Classic plugin load order | Implemented | Enabled packaged scripts load in manifest order. |
| MV JS helper extensions | Implemented | clamp/mod/padZero/format/contains/clone/equals/randomInt compatibility helpers. |
| Stable MV database IDs | Implemented foundation | `game/plugins/mv-database-ids.json` pins numeric IDs for exposed records; CI fails if current content introduces unregistered records. |
| `$dataItems`, `$dataEnemies`, `$dataMapInfos` | Bridged with stable IDs | Existing Plushbound records are exposed through explicit MV numeric IDs rather than load-order numbering. |
| `$dataActors`, `$dataClasses`, `$dataSkills`, `$dataWeapons`, `$dataArmors`, `$dataStates`, `$dataTroops`, `$dataAnimations`, `$dataTilesets`, `$dataCommonEvents` | Authorable / bridge-ready | `game/content/mv-database.json` provides real collections. Arrays populate when records are authored; Guardians are intentionally not misrepresented as Actors. |
| MV note metadata | Implemented foundation | `<Tag>` and `<Key: Value>` note metadata is exposed through `meta` and `DataManager.extractMetadata`. |
| `$gameParty` / `$gameActors` | Basic facade | Common inventory/gold/member/actor access exists; armor plural/singular translation is regression-tested; full battler/equipment/class semantics remain. |
| `$gamePlayer` / `$gameMap` | Basic facade | Position, transfer, direction, map/event access and refresh hooks exist. |
| `$gameSystem` | Basic facade | Save count/playtime basics exist. |
| DataManager | Expanded basic facade | Save/load, type checks, metadata extraction, database-loaded hooks and item-kind helpers exist; full MV file-loading lifecycle is intentionally replaced by packaged data. |
| Graphics | Basic facade | Logical 1604x720 Plushbound screen exposed; full MV Graphics renderer API remains. |
| Input / TouchInput | Basic facade | Common key/touch checks available; full frame semantics/remapping remain. |
| SceneManager | Logical lifecycle facade implemented | run/goto/push/pop/change/update/prepare/background stack behavior exists before plugin evaluation. |
| Scene_* / Window_* / Sprite_* classes | Foundation implemented | MV-style function constructors and prototype anchors now exist for the common scene/window/sprite families; logical Bitmap drawing is supported. Specialized semantics remain tied to later battle/image/menu tranches. |
| Bitmap | Logical/Canvas facade implemented | Uses Canvas when available and a recorded drawing surface otherwise. |
| PIXI namespace | Shallow compatibility only | Container/Sprite/Rectangle/Point/logical Graphics anchors exist; low-level PIXI/WebGL monkey-patching is not claimed compatible. |
| BattleManager / battler classes | Partial native, MV facade missing | Plushbound battles work natively; MV JavaScript battle extension points require adapters. |
| AudioManager | Native capability, MV facade missing | Plushbound audio exists; MV method/global compatibility remains. |
| ImageManager / CacheManager | Missing | Needed by visual/UI plugins that load MV-style image assets. |
| ConfigManager / StorageManager | Partial equivalent, MV facade missing | Autosave/storage exist natively. |
| NW.js-only plugins | Unsupported on Android | Desktop/NW.js filesystem/window/process assumptions cannot be made portable to the Android-first runtime. |

## Plugin compatibility tiers

### Tier A — strongest now
Plugins focused on plugin parameters, switches/variables/self-switches, Plugin Command, stable item/enemy/map IDs, note metadata, basic party/player/map state, JavaScript helpers, common window/scene prototype aliases, command windows and logical Bitmap/Sprite trees have the strongest unchanged compatibility surface today.

### Tier B — partial
Gameplay/UI plugins that rely on authored Actors/Classes/Skills/Equipment/States/Troops, specialized scene/window behavior, save hooks or ordinary SceneManager flow can often load and patch their extension points, but deeper game semantics are still being bridged.

### Tier C — not complete yet
Plugins that deeply extend `BattleManager`, battler/action classes, `AudioManager`, `ImageManager`, actual PIXI/WebGL renderer internals or advanced database/battle behavior still need additional compatibility shims.

### Tier D — platform-specific
Plugins that require NW.js/Node desktop APIs, arbitrary local filesystem access, native desktop windows, or hard-coded MV PIXI internals are not promised as drop-in Android plugins. Equivalent behavior should be ported through Plushbound-native modules where practical.

## Plugin project contract

- Plugin directory: `game/plugins/`
- Plugin manifest: `game/plugins/plugins.json`
- Stable database IDs: `game/plugins/mv-database-ids.json`
- MV compatibility database package: `game/content/mv-database.json`
- Runtime plugin bridge: `game/runtime/MVPluginRuntime.js`
- Runtime database bridge: `game/runtime/MVDatabaseBridge.js`
- Runtime numeric event bridge: `game/runtime/MVEventCommandBridge.js`
- Runtime UI/object bridge: `game/runtime/MVUiRuntime.js`
- Editor manager: `tools/editor/plugin-manager.html`
- MV plugin parameters remain strings.
- Manifest array order is plugin load order.
- Remote and parent-directory plugin paths are rejected; release APKs use packaged scripts.
- Plugin failures are surfaced instead of silently ignored.
- Frozen Engine v1 is not modified by this layer.

## Next parity priorities

1. **Battle API facade** — `BattleManager`, battlers, actions, units, party/troop compatibility surfaces.
2. **Audio/Image facade** — `AudioManager`, `ImageManager`, `CacheManager` on top of Plushbound's packaged assets/services.
3. **Config/storage facade** — bridge autosave/settings to MV `ConfigManager` and `StorageManager` expectations.
4. **Remaining event commands** — unlock deferred numeric command families as their real backing subsystems become available.
5. **Database semantics** — connect authored Actors/Classes/Skills/Equipment/States/Troops to native battle/equipment systems rather than exposing data only.
6. **Real plugin corpus testing** — maintain a legal representative MV plugin matrix and classify unchanged/adapter-needed/unsupported behavior.
7. **Editor database ergonomics** — richer forms/templates for MV-compatible database collections while preserving Plushbound-specific Guardian/lore systems.

## Reference behavior used for compatibility

The compatibility work uses publicly documented RPG Maker MV plugin behavior and public MV core-script interfaces as behavioral references: PluginManager ordering/parameters, `Game_Interpreter` commands, database globals/metadata, function-constructor/prototype extension patterns, scene/window lifecycle concepts and JavaScript helper extensions. Plushbound's implementation is independent and lives outside frozen Engine v1.
