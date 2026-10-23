# RPG Maker MV UI/plugin object compatibility

Plushbound now exposes an independent, logical-first compatibility surface for the MV object families most commonly patched by UI plugins. It is installed **before enabled MV plugin scripts are evaluated**, so classic prototype-alias patterns can see the constructors at load time.

## Implemented foundation

Global constructors/services include:

- `Point`, `Rectangle`, `Bitmap`, `Sprite`
- `Window`, `WindowLayer`
- `Window_Base`, `Window_Selectable`, `Window_Command`, `Window_HorzCommand`, `Window_Help`
- logical list/status/command subclasses used as common extension anchors
- `Scene_Base`, `Scene_MenuBase`, `Scene_Map`, `Scene_Battle`, `Scene_Menu`
- item/skill/equip/status/options/file/save/load/title/gameover scene anchors
- expanded `SceneManager` with run/goto/push/pop/change/update/prepare/snapshot/stack behavior
- a small `PIXI` compatibility namespace for `Container`, `Sprite`, `Rectangle`, `Point` and logical `Graphics`
- `TextManager.currencyUnit`

The base objects use MV-style function constructors and prototypes rather than JavaScript `class` syntax. This is deliberate: many MV plugins alias a method with code such as `var alias = Window_Base.prototype.drawText; Window_Base.prototype.drawText = function(...) { ... alias.call(this, ...); }`.

## Rendering contract

This layer is **not a claim that Plushbound now embeds RPG Maker MV's exact PIXI renderer**. `Bitmap` uses an HTML Canvas when one is available and a logical recorded-command surface when it is not. Sprite/window trees are renderer-neutral compatibility objects. This is enough for many plugins that manipulate object state, windows, command lists, scene stacks or draw through the ordinary Bitmap/Window APIs.

Plugins that patch low-level PIXI WebGL internals, assume a specific MV PIXI version, modify shader/render-texture internals, or directly replace the MV renderer remain outside drop-in compatibility until those behaviors are deliberately bridged.

## Current limitations

- `ImageManager` / `CacheManager` asset loading is a later compatibility tranche.
- Specialized windows/scenes exist mainly as extension anchors; their complete MV game semantics depend on the corresponding database/battle/menu systems.
- `Scene_Battle` does not imply `BattleManager` compatibility yet.
- picture/screen/weather commands still need the screen/sprite rendering service.
- deep PIXI renderer monkey-patches remain unsupported rather than silently emulated.

All of this code is in the game compatibility layer; frozen Engine v1 remains unchanged.
