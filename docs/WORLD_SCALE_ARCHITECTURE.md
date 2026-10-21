# Plushbound Legends — Large-World Architecture

## Goal
Build Plushtopia from the beginning as a large, old-school JRPG world that can expand into multiple continents, islands, optional regions, postgame areas, and alternate travel methods without redesigning the save format or mobile runtime later.

## World hierarchy
World Map → Continent → Region → Local Map / Settlement / Dungeon / Optional Area.

The world manifest reserves five major continent slots from the start. Names and lore remain intentionally unset until developed. Sunny Plains of Elyndor is the current playable region; Akatsukiyama is reserved as a planned region tied to established lore.

## Runtime rule
Only the active region's heavy art/audio/map resources should remain resident. Leaving a region releases its large textures, map payloads, portrait sets, and region music before the next region is loaded. This keeps world scale mostly a storage/content problem instead of a RAM problem.

## Region package
Every region can define:
- local maps
- settlements
- dungeons
- optional areas
- Waystitches
- encounter tables
- Guardian habitats
- regional NPC pools
- regional music/SFX
- story gates
- traversal abilities
- asset bundle identifier

## Travel progression
Waystitches are the primary discovered fast-travel network. Sea and air travel are supported as later story unlocks. Story events may temporarily disable travel.

## Exploration progression
Regions may contain areas gated by Guardian traversal abilities so older locations remain useful after gaining new partners or Bond abilities. The architecture supports hidden areas, rare Guardian habitats, optional bosses, superboss/postgame content, and backtracking rewards.

## Content philosophy
A large world should not mean huge empty maps. Scale comes from many distinct, content-dense regions with meaningful towns, dungeons, NPC changes, Guardian ecology, side stories, secrets, and optional destinations.

## Mobile baseline
Target: 2025 Moto G class device, 4 GB physical RAM. Avoid loading the world at once. Use region-scoped map data, compressed appropriately sized art, limited active animation sets, and explicit asset release on transitions.

## Save compatibility
Save data should store stable IDs rather than map object snapshots. Recommended keys include current continent ID, current region ID, local map ID, discovered Waystitches, discovered locations, story flags, traversal unlocks, NPC-state flags, Guardian discoveries, and optional-area completion flags.

## Canon safety
Reserved continent/region slots are architecture, not finalized lore. Do not assign canon names, cultures, factions, climates, or story roles until those are intentionally developed.
