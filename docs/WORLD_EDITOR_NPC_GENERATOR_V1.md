# World Editor NPC Generator v1

Status: integrated.

## Approved source pack

- File: `Plushbound_Character_Creator_Full_Outfits_Glasses_Only.zip`
- SHA-256: `01e89432b8681206422fba05be6fd9e302afe8e2ee27ee8a7c872c3ede875783`
- ZIP entries: 2072
- PNG generator assets: 2050
- Families: Face 525, TV 510, SV 374, TVD 322, Variation 318, plus gradients.png
- Body sets: Female, Male, Kid

The runtime refuses a ZIP whose SHA-256 does not match the approved pack. This prevents silent part drift and mismatched layering.

## Runtime behavior

`character_generator_pack_runtime.js` adds an `NPC Generator` control to the World Editor/runtime UI. On first use, select the approved ZIP. The runtime parses the ZIP in-browser, validates its fingerprint and PNG count, decompresses the PNGs, builds the selectable catalog from the RPG Maker-style names, and stores the assets persistently in IndexedDB.

The pack does not need to be baked into the APK. After one import on a device/browser profile, it remains locally available in IndexedDB.

## Deterministic selectors

Supported selectors are Clothing, FrontHair, RearHair, Face, Eyes, Eyebrows, Mouth, Nose, Ears, FacialMark, Glasses, and Beard where present for the selected body set.

Variation icons define valid selectable part IDs. No selectable Variation entry is dead in the approved pack: all current Female/Male/Kid choices resolve to at least one real generator family.

The runtime treats `*_c` TV/TVD/SV files as palette maps rather than drawable art and draws the corresponding base PNG. Face output composes its required `c`/`m` sublayers in deterministic order.

## Outputs

- TV overworld sprite sheet: 144x192
- Face portrait: 144x144
- TVD down/damaged sheet: 144x48
- SV side-view battler: 576x384

The generator supports manual selection, random NPC generation, PNG export, and deterministic recipe JSON export. Recipe manifests include the pack ID, approved source SHA-256, selected part IDs, ordered source layers, output family, and fail-closed flags.

## Validation performed on the approved pack

- Exact ZIP SHA-256 verified.
- All 2050 PNGs enumerated.
- Female, Male, and Kid catalogs enumerated.
- All Variation choices resolve to drawable source data: 0 dead choices.
- Representative Female/Male/Kid TV composites rendered successfully.
- Representative Face composite rendered successfully with clothing, hair, facial components, and glasses aligned.
- Runtime JavaScript passes `node --check`.
- Android build workflow now verifies both character-generator runtime scripts, script injection, install receipt, pack fingerprint, expected PNG count, and final APK packaging.

## Separation of responsibility

Asset production supplies modular generator source parts. The World Editor owns assembly, layer ordering, validation, persistence, randomization, deterministic recipes, and runtime export. Bespoke story characters, Guardians, bosses, and other custom characters can continue through the atlas/compiler pipeline instead of this modular generator.
