# Plushbound Editor MV-Parity Tracker

Target: mature RPG Maker MV-class authoring capability adapted to Plushbound Legends, existing runtime/content/assets contracts, and an Android-first workflow.

## Non-negotiable boundary

- Frozen Engine v1 is not modified for editor convenience.
- Editor changes operate on game/content, game/runtime authoring data, asset manifests, validation, preview, and build tooling.
- Engine changes require a demonstrated engine defect and dedicated regression proof.
- User-supplied RPG Maker MV reference projects are static format/behavior references only. Reference runtime code, plugins, artwork, audio, fonts, icons and other proprietary bytes are never copied into Plushbound production content.

## Status legend

- **Mature** — usable, regression-covered, and integrated with current contracts.
- **Functional** — core workflow exists; more MV-level polish/breadth remains.
- **Partial** — useful slice exists but major capability remains.
- **Missing** — not yet implemented as an authoring workflow.

## Authoring systems

| System | Status | Current coverage | Next maturity step |
| --- | --- | --- | --- |
| MV project interoperability | Mature | Independent MV project/data contracts; 816×624 shell contract; core database and six-layer map validation; A1–E/character/face sheet geometry; 8192 tileset flags; exact MV B–E/A5/A1–A4 tile ID ranges; autotile kind/shape math; System/MapInfo/database/event-page/movement-route/encounter schemas; lossless MV→editor→MV adaptation preserving IDs, unknown fields, four tile layers + shadow bits + regions; MV `data/` folder import; selective ZIP central-directory import reading only database/Map JSON; method-8 DEFLATE support; deterministic edited `data/*.json` ZIP export; no-op JSON-value round-trip proof; safe reversible event-command cards with unsupported commands preserved raw; live MV tile semantics inspector; exact independent A1–A4 quarter-composition planning for all 48 floor, 16 wall and 4 waterfall recipes including A1 animation phases | Extend reversible command mapping only where an exact editor/runtime representation is proven; retain raw preservation for branch-heavy or deferred MV commands |
| Map/world editor | Mature | Map switching, tile/layer painting, Z/visibility, regions, collision, 1×1/3×3/5×5 atomic brush stamps with edge cropping, continuous pointer/touch drag painting with one stroke history lifecycle, observed-tile quick picks, events, transfers, asset assignment, validation, project search, runtime playtest, same-map duplication and cross-map event copy/paste with undo/redo, exact map/event deep-link targets | Stronger navigation presets and additional context-sensitive inspector handoffs |
| Map management | Functional | Dedicated package-safe workspace for blank-map creation, deep-copy duplication, rename with inbound TRANSFER retargeting, guarded deletion, export, undo/redo, direct map deep links, and transactional resize/crop with explicit event/transfer clamp policies | Canvas handoff after create/duplicate/resize plus richer batch map operations |
| Runtime playtest | Mature | Real PlushboundGameSession path in-editor, movement/interact/encounter coverage, runtime Common Events, and read-only editor GameState diagnostics for switches, variables, self switches, quests, inventory, party/guardian, map, actions, dialogue and encounter context | Additional launch/debug presets where they improve authoring speed without changing runtime behavior |
| Event pages | Mature | Pages, triggers, conditions, summaries, safe preservation, undo/redo, duplicate/reorder/delete with last-page protection; imported MV pages preserve exact trigger identity including Player Touch/Event Touch distinctions | Rich visual condition builder and condition reference pickers |
| Event commands | Mature | Full Engine v1 registry exposed; rich visual forms; command copy/paste/duplicate/reorder/delete; unknown future commands preserved and protected from destructive deletion; imported MV commands expose only reversible mappings as normal cards while unsupported numeric commands remain lossless raw records with explicit MV code/parameter diagnostics | Branch/choice structure visualization and additional reversible MV mappings only when exact semantics are proven |
| Common events | Functional | Dedicated visual library, create/rename/delete, command editing/reorder, import/export, graph validation, authoring-time expansion and runtime COMMON_EVENT support | Project-integrated persistence/reference pickers and richer branch editing |
| Visual database | Functional | Project package discovery, collections, search, create/duplicate/delete, domain-aware forms, primitive lists, structured encounter/drop/quest rows, Advanced JSON, validation, export, undo/redo, cross-record datalist suggestions, exact package/collection/record deep links, direct source navigation from content diagnostics, plus independent MV database-record validation/preservation | More domain-specific panels while retaining freeform extensibility |
| Database safety | Mature | Array/keyed registries preserved, transactional replacement, duplicate-ID validation, rollback tests, package-wide export validation, live-project dependency audit, source-aware diagnostics, and MV null-at-index-zero/unknown-field preservation | Expand source-aware diagnostics to any future structured collections as their contracts are introduced |
| Guardians | Functional | Guardian identity/species/role/bond/assets forms and safe templates | Stats/skills/bond progression only when explicit runtime schemas exist |
| NPCs | Partial | Named NPC domain profiles and editable identity/world/story fields | Route/event linking and schedule editor |
| Enemies/bosses | Functional | Enemy level/stats/tags/skills/rewards/assets, structured drops/encounters, boss definitions registered by the game runtime, one-time availability and declared completion-switch behavior | AI/behavior authoring only when explicit runtime behavior contracts exist |
| Quests/events | Functional | Structured prerequisites, objectives, reward items, unlocks, stage/giver fields, project reference audits, runtime-owned quest hooks, reference suggestions, exact Search→Database deep links, direct audit→record navigation, and dependency/state-flow graph visualization with cycle detection | Batch navigation/repair helpers and richer domain-specific authoring only where runtime contracts exist |
| Items/equipment | Functional | Dedicated Items & Equipment workspace over the shared runtime items registry; consumable/accessory authoring, generic numeric accessory stats, icon IDs, source-package export, undo/redo, duplicate-safe IDs and inbound usage tracing | Item effects/equipment slots only when explicit runtime schemas exist |
| Skills/abilities | Missing | Enemy skill IDs and imported MV Skill records can be preserved/validated, but Plushbound has no standalone explicit authoring schema established | Add a visual Plushbound skill database only when a concrete game/runtime definition schema exists; do not invent gameplay semantics from the MV reference |
| Battle/encounter tooling | Functional | Runtime-backed Battle & Encounter Test, runtime-map switching, region-filtered candidates, weighted EncounterManager picks, explicit seeded deterministic RNG/reset controls, seed-aware diagnostics, enemy inspection, quest battle progress, boss loading, victory/escape/defeat handling, one-time boss completion and replay prevention | Deeper encounter/enemy links and richer battle-adapter/state previews where runtime state exists |
| Tileset/passability | Mature | Logical tileset IDs, manifest/runtime 48px tile contract, map layers, observed tile palette, numeric tile painting, 1×1/3×3/5×5 tile/region/collision brushes, regions, blocked-cell paint/erase, layer visibility/Z, validation/export, manifest-aware tileset sheet/status panel, MV A1–E geometry/8192 flag decoding, exact tile-ID/autotile contracts, live MV tile flag/passability/terrain inspector, and deterministic A1–A4 quarter-composition preview with animation phases | Per-tile artwork thumbnails only where explicit slice metadata and ready generated art exist; never crop/repack reference pixels |
| Project search | Mature | Manifest-driven search across all declared content/runtime packages and asset manifest, source filtering, prefiltered query links, and exact deep links into Database, Map Manager, Map Editor and Audio/asset targets; Android simulation covered | Search result grouping/history and additional workspace targets where contracts exist |
| Reference diagnostics | Mature | Map/asset/encounter/SHOP/runtime-hook references plus quest prerequisites/objectives/rewards, shop stock, enemy drops/tags, Waystitch dependencies and live-project cross-package audit; runtime issues link directly to exact map/event and source-aware content issues link directly to exact Database records, with Search fallback for legacy/source-less findings; deterministic dependency graph shows inbound/outbound edges, 1–2 hop neighborhoods, unresolved nodes and quest/Waystitch cycles | Batch navigation/repair workflow |
| Animation/effects tooling | Missing | Screen-effect commands, imported MV Animation records can be preserved/validated, and asset hooks exist, but Plushbound has no explicit animation authoring contract | Timeline/effect authoring only after a concrete Plushbound effect/animation asset contract is established |
| Audio tooling | Functional | BGM/BGS/ME/SE command forms plus manifest-driven Audio Browser, type/status filtering, exact command tuples, ready-only preview policy, asset deep-link selection, and MV audio-reference/bank validation contracts | Richer preview/assignment controls once ready audio assets exist |
| Plugin/extension management | Functional | Dedicated Plugin Manager workspace and core registry tooling, MV plugin descriptor/parameter validation, editor PLUGIN_COMMAND visual form, and runtime MV plugin-command bridge; imported reference plugin bytes are not executed merely to identify/import a project | Broader compatibility diagnostics/sandbox policy for user-supplied extensions while preserving explicit opt-in execution boundaries |
| Build/deployment UI | Functional | CI builds Android debug APK, verifies installability and frozen Engine v1 baseline, validates content, MV compatibility has its own frozen-engine CI gate, and the editor exposes local package/reference/dependency readiness separately from CI-enforced Engine/APK checks with direct Actions navigation | Optional richer CI-result ingestion only through an authenticated/source-backed status channel; never infer remote CI success locally |
| Mobile/Android ergonomics | Functional | Responsive map/database/common-event/search/passability/battle/item/audio/map-management workspaces, touch tools, selectable multi-cell brush sizes, continuous pointer/touch painting, deep links, MV import/export controls with hidden native file inputs behind touch-friendly labels, and dedicated 412×915 Chromium gates | Larger touch affordances, compact navigation and device workflow polish |

## MV interoperability contract

The user-supplied MV reference is treated as a static compatibility oracle, not production content. Current editor behavior is intentionally fail-closed:

- MV projects may be recognized at archive root or beneath one common prefix.
- Browser ZIP import reads the ZIP directory and only selected `data/*.json` records; it does not unpack or execute `js/`, images, audio, fonts, icons or plugins.
- MV maps preserve four tile planes, shadow bits, region IDs, events, encounters and unknown fields.
- Untouched imported data is required to round-trip without semantic normalization.
- Editable MV event-command mappings currently include single SWITCH, simple constant VARIABLE operations, SELF_SWITCH, WAIT, COMMON_EVENT, EXIT_EVENT, direct TRANSFER, INPUT_NUMBER and serialized PLUGIN_COMMAND lines.
- Range switches, nonconstant variable operands, branch-heavy command structures, scripts and unsupported/deferred numeric commands remain exact `MV_RAW` records rather than being guessed into Plushbound commands.
- MV tile IDs classify B/C/D/E/A5 and A1–A4 separately from reserved ranges; A1–A4 autotiles preserve global kind and 48-shape numbering; 8192-entry flags expose directional passage, star, ladder, bush, counter, damage floor, vehicle restrictions and terrain tags.
- MV A1–A4 composition is represented as deterministic quarter-tile geometry: all 48 floor, 16 wall and 4 waterfall recipes are covered, A1 water phase timing uses the observable 0→1→2→1 sequence, and waterfall sources expose three vertical animation phases. The editor preview uses geometry only; reference image pixels are never imported into production assets.
- Export always restores the MV command-list terminator and validates the resulting project data before emission.

## Automated gates

- Plushbound MV Compatibility CI: syntax-checks independent MV compatibility modules, validates project/database/shell/ZIP/editor-adapter/tile-ID/autotile-composition contracts, reversible event-command editing, no-op round trips, and frozen Engine v1 protection.
- Plushbound Visual Editor CI: real Chromium map authoring + runtime playtest simulation, including the actionable reference-audit/dependency panels and browser-loading regression coverage for editor integrations.
- Plushbound Brush CI: brush-core contracts plus Android 412×915 atomic multi-cell tile/region/collision stamps, continuous stroke history, undo behavior, observed-tile quick picks and manifest/MV-aware tileset preview policy.
- Plushbound Build Readiness CI: local package readiness model, source-aware reference/dependency blockers, and explicit separation from remote Engine/APK CI status.
- Plushbound Map Manager CI: map create/duplicate/rename/history, direct-map deep linking, transactional safe resize/crop and Android 412×915 workflow simulation.
- Plushbound Database CI: Android-class Chromium database authoring, rollback, structured row and Common Event coverage.
- Plushbound Command Forms CI: Android visual command serialization against runtime parameter tuples.
- Plushbound Event Copy UI CI: same-map/cross-map event copy-paste with deep-copy, clamping, selection and undo/redo history coverage at 412×915.
- Plushbound Event Page UI CI: page duplicate/reorder/delete, unknown-command preservation and undo selection continuity at 412×915.
- Plushbound Event Command UI CI: command copy/paste/duplicate/reorder/delete and history coverage at 412×915.
- Plushbound Battle Test CI: real runtime encounter selection, seeded deterministic encounter testing, Elyndor enemy resolution, battle-quest objective advancement and boss completion lifecycle at 412×915.
- Plushbound Quest Authoring CI: structured quest prerequisite/objective/reward/unlock editing against live project content at 412×915.
- Plushbound Items & Equipment CI: shared item-registry authoring, Woven Charm stat edit/undo, usage tracing and consumable filtering at 412×915.
- Plushbound Reference Picker CI: cross-record datalist suggestions for proven item/enemy/quest/NPC/map references at 412×915.
- Plushbound Audio Browser CI: manifest-driven BGM/BGS/ME/SE browsing, exact command tuples and planned-vs-ready preview policy at 412×915.
- Plushbound Project Search CI: manifest-driven project indexing/search plus Search→Database and Search→Map/Event deep-link navigation at 412×915.
- Plushbound Tile & Passability CI: tile, blocked-cell and region painting against runtime-native map contracts at 412×915.
- Game Content CI: JSON syntax, asset root, runtime/content/asset contract tests, including source-aware reference diagnostics against live Plushtopia content.
- Android game debug APK workflow: current application build compatibility, installability and frozen-engine baseline verification.

## Current priority order

1. Continue reversible MV event-command coverage only where exact Plushbound editor/runtime semantics exist; keep every other command lossless and protected rather than guessed.
2. Finish branch/choice visualization, reference pickers and navigation polish using the contracts already present.
3. Improve map-management handoffs, batch navigation/repair helpers and Android touch ergonomics without changing Engine v1.
4. Add richer encounter/enemy/debug navigation only where existing runtime state provides authoritative data.
5. Skills/status effects, item effects/equipment slots and animation authoring remain deliberately schema-gated until explicit Plushbound runtime contracts exist; imported MV records remain preservable/validatable in the meantime.
6. Continue extension compatibility diagnostics with explicit opt-in execution boundaries; never execute imported reference plugins merely for inspection.

## Current checkpoint

The completed MV/editor parity tranche now includes mature map/world foundations, continuous touch/drag painting with stroke-level history, lossless RPG Maker MV project-data interoperability, selective MV folder/ZIP import, deterministic edited data ZIP export, reversible imported-event command cards with fail-closed raw preservation and explicit raw diagnostics, exact MV tile-ID/autotile/flag semantics, live tile inspection, deterministic A1–A4 quarter-composition preview, atomic multi-cell tile/region/collision brushes, observed-tile quick picks, manifest-aware tileset status/sheet presentation, runtime playtest with read-only GameState diagnostics, seeded deterministic battle/encounter testing, transaction-safe event copy/paste, mature page and command structural editing, map-management with transactional safe resize/crop, manifest-driven project search with exact cross-workspace deep links, domain-aware database authoring, structured quests, item/accessory authoring, Common Events with runtime support and cycle validation, rich visual Engine v1 command forms, source-aware actionable cross-package diagnostics, a dependency/state-flow graph with unresolved-node and cycle visibility, runtime-backed Battle & Encounter Test, Audio Browser, Plugin Manager, and an editor-facing build-readiness panel that keeps local checks separate from CI-enforced Engine/APK verification. Remaining work is now primarily contract-backed polish plus schema-gated authoring surfaces; features without a concrete Plushbound runtime schema are intentionally not invented from the MV reference. Frozen Engine v1 remains unchanged.
