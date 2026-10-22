# Plushbound Legends — Legal & Credits Policy

This policy governs how project ownership, contributor credit, third-party material, and production asset provenance are tracked during development.

## 1. Original Project Material

Original Plushbound Legends material should be treated as proprietary unless a specific file, agreement, or license states otherwise. This includes original code, systems, characters, names, fictional locations, lore, dialogue, artwork, audio, UI, maps, documentation, and other project-specific material.

Do not assume that possession of a file proves ownership. For externally supplied work, retain the written permission, assignment, work-for-hire agreement, commission terms, or license that establishes the project's right to use and distribute it.

## 2. Third-Party Material

Before a third-party asset, library, font, sound, music track, code component, texture, template, or other work can be considered release-ready, its legal basis for use must be recorded.

At minimum record:

- creator / copyright holder
- source
- license or written permission
- attribution requirements
- whether modifications were made
- whether commercial distribution is allowed
- whether redistribution of the original file is allowed
- any copyleft/share-alike/source-disclosure obligations
- any platform/store restrictions

Required notices belong in `THIRD_PARTY_NOTICES.md` and, where useful, alongside the relevant asset provenance entry.

## 3. Asset Provenance

Every production asset that reaches `placeholder` or `ready` status should have provenance metadata. Original internal assets should still record who or what produced them and who approved them for integration.

Recommended provenance fields:

- logical asset ID
- physical path
- production status
- creator / contributor
- source type: original, commissioned, licensed-third-party, public-domain, AI-assisted, AI-generated, or derived
- source reference / URL where applicable
- license / permission basis
- attribution text if required
- modification notes
- generation/tool notes where applicable
- human approver
- approval date

## 4. AI-Assisted and AI-Generated Material

AI-assisted tools may be used during development, subject to the applicable tool terms and project policy.

For production assets, record enough information to establish provenance and later review the asset if necessary. At minimum record the tool/service name, whether the result was generated or merely edited/assisted, the human contributor responsible for selection/integration, and any relevant source/reference inputs that may affect rights or clearance.

Do not describe AI output as having a conventional human copyright author unless that characterization has been legally confirmed for the applicable jurisdiction and workflow. The project should instead track the human creative contribution, editing, selection, arrangement, and integration actually performed.

## 5. Credits

Credits should reflect meaningful contribution. Contributors should normally be credited in the discipline where they performed the work.

A person who performed substantial engineering, art, writing, design, audio, testing, production, or similar work should not be moved into “Special Thanks” merely for convenience.

Use a contributor's requested professional name when known. Do not publish private personal information.

Credit does not itself determine copyright ownership, employment status, compensation, or license rights. Those are separate legal questions and should be documented separately.

## 6. Trademarks and Fan/Reference Material

Do not include third-party logos, trademarks, character designs, game assets, music, dialogue, screenshots, or other recognizable protected material in the shipped game unless the project has an appropriate legal basis to do so.

Internal reference material used for inspiration should not automatically become a production asset.

Plushbound Legends may be described as “inspired by” broad genres or presentation conventions where appropriate, but release materials should avoid suggesting endorsement by or affiliation with unrelated publishers, studios, franchises, or tool vendors.

## 7. Release Gate

Before a production asset or third-party component is marked `ready`, confirm:

1. The source is known.
2. The project has a documented right to use it.
3. Commercial use is permitted if the game will be sold or monetized.
4. Redistribution in the game/APK is permitted.
5. Required attribution and license notices are recorded.
6. Required source disclosure or license-copy obligations are understood.
7. The asset does not knowingly contain copied protected material outside the granted rights.
8. The human contributor/approver is recorded.

An asset that fails this check should remain `planned` or `placeholder` and should not ship in a public release.

## 8. Distribution Package

Public builds should include or provide access to, as applicable:

- project copyright / proprietary notice
- credits
- third-party license notices
- open-source license texts required by distributed dependencies
- privacy policy if the shipped game collects or transmits personal data
- terms/EULA if the distribution model calls for one

The current Android design is offline and does not request INTERNET permission, but privacy obligations must be revisited if analytics, accounts, cloud saves, advertising, telemetry, crash reporting, payments, or other networked features are later added.

## 9. Legal Review

This policy is an internal development-control document, not legal advice. Before commercial publication, obtain qualified legal review for final ownership, trademarks, commissioned work, contributor agreements, third-party licenses, privacy obligations, store terms, and any material whose rights are uncertain.
