# Plushbound Engine v1

Plushbound Engine v1 is an original Android-first JRPG runtime for Plushbound Legends. It is inspired by the workflow and feature breadth of classic event-driven JRPG engines, including RPG Maker MV, but copies no proprietary source code, assets, data formats, or editor UI.

## Goal
Replace the prototype's patch-based renderer with stable versioned interfaces so content work no longer depends on brittle function-name rewrites.

## Non-negotiable platform targets
- Android 15 friendly; minSdk 26.
- Landscape 1604x720 reference target; responsive down to smaller landscape devices.
- 4 GB physical RAM target; region-scoped loading.
- Offline-first. No INTERNET permission required.
- Deterministic fixed assets at runtime; no runtime image generation.

## Engine layers
1. Kernel: lifecycle, fixed timestep, scene stack, service registry, error boundary.
2. Renderer: tile layers, parallax, characters, pictures, weather, screen fades, camera, animation queue.
3. Input: touch, virtual controls, keyboard/gamepad-compatible action map, debouncing, modal focus.
4. Data: maps, tilesets, actors, classes, skills, items, weapons, armor, enemies, troops, states, animations, common events, system settings.
5. Event interpreter: event pages, conditions, triggers, movement routes, switches, variables, self switches, labels, branches, loops, waits, common events, transfers, dialogue, choices, shops, battles, audio, screen effects, pictures.
6. Map system: 4-dir movement, collision, regions, terrain tags, passability, events, followers, encounters, transfers, vehicles/late travel hooks, autorun/parallel events.
7. Battle: turn-based party battles, actions, targeting, formulas, elements, states, buffs/debuffs, rewards, escape, battle events, Guardian integration.
8. UI/scenes: title, load/save, menu, item, skill, equip, status, formation, options, shop, name entry, game over, battle, map, creator.
9. Audio: BGM/BGS/ME/SE buses, fades, resume positions, per-channel volume.
10. Persistence: multiple save slots, autosave, versioned migrations, atomic local save, checksum, settings save.
11. Plugin API: namespaced hooks, commands, scene registration, data extensions, renderer hooks, semantic version gate.
12. Diagnostics: boot self-test, runtime exception overlay in debug builds, structured logs, save validation, content schema checks.

## Stable public contracts
The game may call only documented engine APIs. Engine internals may change without requiring content rewrites.

### Scene
- enter(payload)
- exit()
- update(dt)
- render(renderer)
- handleAction(action, phase)

### Entity/Event
- id, mapId, x, y, direction, moveSpeed, through, priority
- update(dt)
- interact(context)
- serialize()/restore()

### Event Command
Each command is `{ code, indent, parameters }` and executes through a command registry. Unknown commands fail loudly in debug and safely abort the event in release.

### Save
Save files contain `engineVersion`, `gameVersion`, `timestamp`, `map`, `party`, `actors`, `switches`, `variables`, `selfSwitches`, `inventory`, `quests`, `guardian`, `system`.

## Feature parity target
The engine should support the practical gameplay features expected from an MV-style JRPG project: tiled maps, events, pages/conditions, common events, switches/variables/self-switches, movement routes, transfer player, dialogue/choices, pictures, screen effects, audio, encounters, turn battles, items/skills/equipment/states, shops, menus, save/load/options, followers, vehicles/travel hooks, battle events, animations, plugins, and content-driven databases.

## Deliberate differences
- Mobile-first touch behavior rather than desktop-first input.
- Region streaming instead of assuming every map/resource remains resident.
- JSON schemas owned by Plushbound rather than RPG Maker formats.
- Built-in regression tests for boot, menu navigation, map transfer, event execution, battle start/end, save round-trip and touch controls.
- Original rendering and assets only.

## Migration rule
Current prototype code is frozen except for critical bug fixes. New systems are built under `engine/` on `engine-v1-rebuild`. Plushbound Legends content migrates only after the engine passes the vertical-slice acceptance suite.

## Vertical-slice acceptance suite
A build is not considered Engine v1-ready until one APK can, without manual patches:
1. Boot to title and all menu buttons work.
2. Create a character with live preview.
3. Choose a Guardian with fixed sprite/silhouette.
4. Run an opening cutscene using event commands.
5. Enter an MV-inspired tiled map with collision and NPC events.
6. Talk to NPCs, make a choice, flip switches/variables and change event pages.
7. Transfer to a second map and back.
8. Open menu, inventory, status, equipment and options.
9. Enter and finish a battle, gain EXP/items and apply states.
10. Save, close, reload and restore exact state.
11. Handle Android touch input without duplicate taps or dead controls.
12. Survive the automated boot/runtime smoke tests with zero uncaught exceptions.
