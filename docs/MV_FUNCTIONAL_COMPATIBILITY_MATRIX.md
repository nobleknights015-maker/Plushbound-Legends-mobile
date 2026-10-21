# Plushbound Engine v1 — MV Functional Compatibility Matrix

Purpose: verify that Plushbound Engine v1 reproduces the practical player-facing and content-authoring behaviors expected from an RPG Maker MV-style JRPG workflow, without copying proprietary code, assets, editor UI, or undocumented internals.

## Release rule
Engine v1 is not eligible to replace the prototype until every P0/P1 item below passes automated tests and the vertical-slice device test. P2 items may ship after v1 only if explicitly deferred.

Statuses: NOT BUILT / PARTIAL / PASS / FAIL / DEFERRED

## P0 — Core runtime
- Boot to title screen
- New Game
- Continue/load
- Options/menu open-close
- Scene transitions without stale input
- Android touch input + back handling
- Pause/resume lifecycle
- Crash-safe autosave boundaries
- Save schema versioning + migration

## P0 — Maps and movement
- Tilemap rendering with layered tiles
- Passability and collision
- Directional passability
- Player 4-direction movement
- Touch destination movement
- Event collision / through mode
- Transfer Player between maps
- Spawn coordinates + facing
- Camera follow and map bounds
- Region IDs / terrain tags equivalent hooks
- Parallax/background layer support
- Map-local audio/background ambience

## P0 — Events
- Event pages with ordered conditions
- Switch conditions
- Variable conditions
- Self-switch conditions
- Item/party/state condition hooks
- Action Button trigger
- Player Touch trigger
- Event Touch trigger
- Autorun
- Parallel process
- Priority: below/same/above player
- Event erase for current map session
- Page refresh after state change
- Move Route
- Wait for movement completion
- Event transfer/relocation

## P0 — Event command interpreter
- Show Text
- Show Choices
- Input Number / text-entry equivalent where needed
- Control Switches
- Control Variables
- Control Self Switch
- Conditional Branch
- Loop / Break Loop
- Exit Event Processing
- Common Event call
- Wait
- Fade screen
- Screen tint / flash / shake equivalents
- Transfer Player
- Set Movement Route
- Change transparency
- Change party/player parameters
- Play/stop/fade BGM
- Play/stop/fade BGS
- Play ME / SE
- Start Battle
- Shop Processing
- Name/input hooks for custom creator flows
- Script/plugin-command style extension hook with sandboxed engine API

## P0 — Dialogue and cutscenes
- Dialogue box with speaker name
- Portrait/face support
- Multi-page text
- Choice branching
- Input lock while event is blocking
- Skippable cutscene flag
- Camera/event choreography
- Waits synchronized to movement/audio
- Autorun completion without soft-lock
- Resume player control reliably

## P0 — Save/load
- Manual save slots
- Autosave slot
- Continue screen metadata
- Exact map + position restore
- Switch/variable/self-switch restore
- Inventory/equipment restore
- Party/Guardian restore
- Active quest/story state restore
- Event-page state consistency after load
- Corrupt/incompatible save handling

## P0 — Battle baseline
- Enter battle from event and encounter
- Actor/party initialization
- Enemy troop initialization
- Turn order
- Basic attack
- Skills with MP/TP-equivalent resource hooks
- Items
- Guard
- Target selection
- Damage/healing
- States/buffs/debuffs
- Victory/defeat/escape
- Rewards: EXP/currency/items
- Battle result returns cleanly to map
- Event branch on win/escape/lose

## P1 — Database-style systems
- Actors / classes or role equivalents
- Skills
- Items
- Weapons / armor
- Enemies
- Troops
- States
- Animations/effects hooks
- Common Events
- System terms/settings
- Data-driven IDs stable across saves

## P1 — Menus
- Main menu
- Items
- Skills
- Equipment
- Status
- Formation/party hooks
- Save
- Options
- Quest/Guardian extensions
- Menu disable/enable by event state

## P1 — Shops and economy
- Buy/sell
- Price overrides
- Currency display
- Inventory limits/hooks
- Central-bank/world-economy systems can extend base shop API

## P1 — Encounters
- Random/region encounter tables
- Step-based encounter checks
- Encounter disable switch
- Preemptive/surprise hooks if desired
- Event encounters

## P1 — Audio
- BGM persistence across scenes
- BGS ambience
- ME interruption/resume behavior
- SE playback
- Volume categories
- Fade behavior
- Android lifecycle pause/resume safety

## P1 — Visual presentation
- MV-inspired tile scale/readability
- Animated character sprites
- Direction + walk frames
- Follower sprites
- Guardian follower sprites
- Weather overlay
- Screen effects
- Pictures/overlays
- Battle backgrounds
- Animation hooks

## P1 — Extension architecture
- Stable public engine API
- Plugin/module registration
- Event command registration
- Data schema registration
- Save-data namespacing
- No monkey-patching of reconstructed source
- Version compatibility declaration
- Failure isolation: bad optional plugin cannot prevent title boot

## P1 — Mobile-specific requirements
- 1604x720 landscape safe layout
- Touch controls >= practical tap target
- No keyboard focus collapse in text fields
- No double-firing touch + click
- Android 15 lifecycle
- Offline operation
- Memory-safe regional map loading
- Graceful low-memory recovery where feasible
- No INTERNET permission by default

## P2 — Nice-to-have / later parity
- Vehicles (boat/ship/airship equivalents)
- Advanced pathfinding
- Animated tiles beyond baseline
- Advanced battle formations
- Battle log customization
- Picture-button interactions
- Developer console/test-play overlays
- Map/event debugger
- Content hot-reload for desktop tooling

## Automated pre-check strategy
1. Static schema validation for every map/event/database file.
2. Unit tests for GameState, interpreter, switches/variables/self-switches, movement, collision, save serialization, battle formulas.
3. Deterministic integration maps that exercise each trigger and command.
4. Golden-state tests: run scripted inputs and compare resulting GameState/event state.
5. Runtime smoke boot: title -> new game -> map -> event -> battle -> save -> quit -> continue -> restored map.
6. Android WebView/device integration checks for touch, lifecycle, text input, fullscreen, and storage.
7. Moto G physical-device vertical slice remains final acceptance for hardware-specific behavior.

## Vertical-slice acceptance scene
A single test project must prove all critical systems together:
- Title -> New Game
- Character creation with live preview
- Guardian selection
- Opening cutscene
- Transfer to a second map
- NPC action event
- Conditional dialogue using switch/variable
- Chest using self-switch
- Shop
- Random or event battle
- Victory reward
- Quest state update
- Manual save
- App close/reopen
- Continue restores exact state
- Return to title

## Compatibility interpretation
"1-for-1" means functional equivalence for supported MV-style workflows and player-visible behavior. It does not mean copying RPG Maker MV source code, licensed RTP assets, editor UI, proprietary file formats byte-for-byte, or undocumented quirks. Where Plushbound has custom systems (Guardians, character creator, mobile controls), those are first-class extensions built on the same stable runtime model.
