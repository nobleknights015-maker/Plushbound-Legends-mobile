# Plushbound Engine v1 — Freeze Readiness

Status: **Freeze-ready foundation with physical gameplay/native-feel validation completed; latest native Back/visual-viewport hardening requires only a targeted device spot-check before final Engine v1 freeze.**

## Frozen contract candidates

The following engine contracts are automated and should be treated as stable after the final targeted device spot-check:

- GameState serialization/restoration and save migrations
- title / New Game / Continue / return-to-title flow
- scene stack root replacement and Android Back routing
- Android lifecycle autosave, pause/resume, input clearing and shutdown
- map loading, collision, regions, events, transfers and encounter routing
- EventInterpreter flow, common events, waits, dialogue hooks, shop and battle handoff
- deterministic battle model, rewards, skills, items, states and escape
- menu / party / equipment / shop / quest service contracts
- Canvas2D rendering primitives and scene render execution
- 1604×720 logical coordinate space with safe-area-aware multi-screen fitting
- touch coordinate round-tripping and one-swipe/one-navigation behavior
- responsive UI anchoring and screen profile helpers
- fixed native-feel viewport policy: normal gameplay does not rely on browser/page scrolling
- visualViewport safe-area refresh and cleanup
- Android Back consumption only when the game handles Back; unhandled root Back falls through to the host
- asset manifest / binding validation and strict production asset mode
- module bootstrap inside Android WebView without document.currentScript dependency
- interaction failure containment and runtime diagnostics
- offline Android APK packaging and embedded release-gate metadata

## Automated freeze evidence

Android packaging must pass all of the following before an APK artifact is uploaded:

1. Full Engine v1 test suite (`npm test`)
2. `engine/tests/final_acceptance_gate.test.js`
3. `engine/tests/freeze_readiness_gate.test.js`
4. Engine source syntax validation inside the packaged payload
5. Asset-manifest JSON validation
6. Release-gate commit verification inside the APK
7. Runtime/manifest injection verification in the WebView HTML
8. Native-feel fixed-viewport shell application
9. APK integrity, signing and zip-alignment checks
10. Android package name and target SDK checks
11. Verification that the APK does not request `android.permission.INTERNET`

The packaged `engine-v1/release-gate.json` records the exact commit and both acceptance gates that passed for that APK.

## Physical-device evidence completed

The reference Moto G has already physically validated the main gameplay chain on freeze-gated builds:

- cold boot/title flow
- New Game → creator → Guardian selection → opening → field
- touch-driven UI/gameplay
- map movement and interaction
- menu, quest, shop and battle flows
- manual save
- close/reopen → Continue restoration
- return-to-title followed by Continue restoration
- pause/resume behavior
- native-feel viewport pass eliminating browser-style panel/page scrolling across the tested Guardian picker/map/menu flow

The user explicitly does not require rotation behavior as a release blocker. Landscape/multi-screen adaptation remains covered by automated safe-area, aspect-ratio and coordinate-mapping tests.

## Final targeted physical spot-check before freeze

Use the latest freeze-gated APK and verify only the native hardening added after the broader physical pass:

- Android Back closes a handled overlay/scene first
- Android Back at an unhandled root scene is not swallowed and can fall through to host/app behavior
- visual viewport / safe-area changes do not shift touch targets away from visible controls
- no new runtime boot, asset, or interaction diagnostic appears
- no crash or severe slowdown during the short spot-check

## Freeze rule after the targeted spot-check

After that targeted physical spot-check succeeds, treat Engine v1 as frozen for Plushbound Legends development:

- game content should use public engine/data/module contracts rather than modify core internals
- engine changes require a demonstrated bug, performance problem, compatibility problem, or genuinely missing capability
- every core change must keep the acceptance and freeze gates green
- save/schema changes require migration coverage
- new content should prefer data, modules, manifests and assets over engine-core edits
- native-feel viewport behavior is part of the frozen UX contract: game screens fit the viewport and oversized content uses game-native pagination/compaction rather than browser scrolling

At that point the project shifts from **building the engine** to **building Plushbound Legends on the engine**.
