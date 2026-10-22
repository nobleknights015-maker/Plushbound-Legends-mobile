# Plushbound Engine v1 — Freeze Readiness

Status: **CI freeze-ready; physical-device regression still required before declaring production-ready for Plushbound Legends.**

## Frozen contract candidates

The following engine contracts are now covered by automated tests and should be treated as stable once the final device pass succeeds:

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
8. APK integrity, signing and zip-alignment checks
9. Android package name and target SDK checks
10. Verification that the APK does not request `android.permission.INTERNET`

The packaged `engine-v1/release-gate.json` records the exact commit and both acceptance gates that passed for that APK.

## Final physical-device regression before freeze

Run the freeze-gated APK on the reference Moto G and verify:

- cold boot reaches the title screen without a runtime boot error
- New Game → creator → Guardian selection → opening → field works
- touch taps line up with visible UI controls
- one swipe moves one selection only
- Android Back closes overlays before leaving the root scene/app
- menu opens/closes correctly
- map movement, collision, NPC/event interaction and transfer work
- battle starts, accepts commands, resolves and returns to field
- shop and quest UI/actions work
- manual save works
- close/reopen → Continue restores the same state
- return to title clears live scene state while preserving Continue
- pause/resume does not leave stuck input or broken audio state
- orientation/surface resize does not distort gameplay or break touch mapping
- no content/asset diagnostic errors appear for required packaged assets
- no crash or severe slowdown during the complete reference flow

## Freeze rule after the device pass

After the physical regression succeeds, treat Engine v1 as frozen for Plushbound Legends development:

- game content should use public engine/data/module contracts rather than modify core internals
- engine changes require a demonstrated bug, performance problem, compatibility problem, or genuinely missing capability
- every core change must keep the acceptance and freeze gates green
- save/schema changes require migration coverage
- new content should prefer data, modules, manifests and assets over engine-core edits

At that point the project should shift from **building the engine** to **building Plushbound Legends on the engine**.
