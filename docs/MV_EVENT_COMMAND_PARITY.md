# RPG Maker MV event-command parity

This document records the numeric `Game_Interpreter` command compatibility surface implemented above frozen Plushbound Engine v1.

## Implemented numeric command codes

The game-layer `MVEventCommandBridge` currently registers these MV command codes directly in the Plushbound event registry:

`101, 102, 103, 105, 108, 111, 112, 113, 115, 117, 118, 119, 121, 122, 123, 125, 126, 127, 128, 129, 201, 352, 355, 356, 401, 402, 403, 404, 405, 408, 413, 655`

These cover:
- Show Text plus text continuations
- Show Choices / branch markers through the existing choice service
- Input Number
- Scrolling Text
- Comments
- common switch/variable/self-switch conditional branches
- loops, break loop and exit event processing
- Common Event calls when an MV-compatible common-event record or mapped native common event exists
- labels and Jump to Label
- Control Switches
- Control Variables for constant, variable, random and Script operands; MV Game Data operands remain deferred until the corresponding actor/map/battle facade exists
- Control Self Switch
- Change Gold
- Change Items / Weapons / Armors
- Change Party Member for authored MV Actor records
- Transfer Player using stable MV map IDs
- Save Processing through Plushbound autosave persistence
- Script plus continuation lines
- Plugin Command

The bridge also installs matching `Game_Interpreter.prototype.command###` methods so classic plugins that alias an implemented command method see the familiar extension point.

## Deliberately deferred command families

Deferred commands are classified in `MVEventCommandBridge.js` and throw an explicit compatibility error instead of silently acting as a no-op. Major groups are:

- timer and Select Item UI
- vehicles and followers
- event relocation until stable event IDs are available
- character move-route semantics
- player/character sprite transparency, animations and balloon icons
- fades, tint, flash, shake, pictures and weather until the screen/render facade exists
- BGM/BGS/ME/SE until `AudioManager` is bridged
- map-name, tileset, battleback and parallax changes
- battle processing and actor/enemy combat mutations until `BattleManager`, battlers and actions are bridged
- Menu / Game Over / Title scene commands until the Scene/Window compatibility layer exists
- frame-based Wait until event execution has a frame-driven runner rather than the current synchronous settle loop

## Compatibility rule

A numeric code is only labeled implemented when the adapter can route its meaningful state or UI effect through an existing Plushbound service. Commands awaiting a missing MV subsystem stay deferred. This prevents imported MV event lists from appearing to work while silently dropping behavior.

The reference behavior is the public RPG Maker MV `Game_Interpreter` interface. The Plushbound implementation is independent and does not modify frozen Engine v1.
