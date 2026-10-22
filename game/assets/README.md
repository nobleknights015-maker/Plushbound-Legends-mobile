# Plushbound Legends Asset Library

This directory is the canonical physical asset library for the game layer. Engine v1 remains frozen and reusable; game-specific art, animation, audio, fonts, UI and map resources live here.

## Rules

- Game data references assets by logical ID, never by hard-coded engine paths.
- `asset-manifest.json` maps each logical ID to a physical file under `game/assets/`.
- Entries may be `planned`, `placeholder`, `ready`, or `retired`.
- `ready` entries must point to a real file and are packaged into Android builds.
- Keep source/master working files outside runtime paths when they are not needed in the APK.
- Runtime images should use web-friendly formats supported by Android WebView (PNG/WebP); audio should use OGG where practical.
- 48 px is the canonical world tile unit for current Elyndor maps.

## Library layout

- `characters/` player and NPC sprites/portraits
- `guardians/` Plush Guardian sprites, portraits, silhouettes and battle art
- `enemies/` regular enemies and bosses
- `tilesets/` map tilesets
- `environment/` parallaxes, weather, landmarks, props and overlays
- `ui/` windows, icons, menus and battle UI
- `items/` item/equipment icons and related imagery
- `animations/` battle/map VFX and animation sheets
- `audio/` BGM, BGS/ambience, ME and SE
- `fonts/` packaged game fonts if required

The manifest is authoritative for runtime IDs. Folder layout is for maintainability and may grow without changing content IDs.