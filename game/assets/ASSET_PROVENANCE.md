# Plushbound Legends — Asset Provenance

Every production asset should have enough recorded provenance to answer three questions:

1. Where did this asset come from?
2. What gives the project the right to use and redistribute it?
3. Who approved it for integration?

The machine-readable registry is `game/assets/provenance-registry.json`.

## Status Rules

- `planned` — no production file is expected yet.
- `placeholder` — a temporary runtime asset exists and may ship only in development/test builds unless separately cleared.
- `ready` — approved for intended production distribution and all required rights/credits metadata is present.
- `retired` — retained for project history but should not be used by current production content.

## Source Types

Use one of the following source classifications:

- `original-human`
- `commissioned`
- `licensed-third-party`
- `public-domain`
- `ai-assisted`
- `ai-generated`
- `derived-cleared`
- `internal-placeholder`

## Minimum Record for Placeholder Assets

Record:

- logical asset ID
- physical path
- status
- source type
- contributor/creator or internal placeholder designation
- intended use

## Minimum Record for Ready Assets

Record:

- logical asset ID
- physical path
- status = `ready`
- creator / contributor
- source type
- source reference or URL where applicable
- license / permission basis
- whether commercial use is permitted
- whether redistribution in the game/APK is permitted
- attribution text if required
- modification notes
- AI/tool details where applicable
- human approver
- approval date

## AI Records

For AI-assisted/generated production work, record the tool/service, the nature of the assistance, the human contributor who selected/edited/integrated the result, and any reference/source material relevant to clearance. Do not store private account credentials, private prompts containing personal information, or confidential third-party material in the public-facing provenance record.

## Third-Party Licenses

If an asset requires attribution or license text, also add the required notice to the project-level `THIRD_PARTY_NOTICES.md`.

## Release Rule

An asset should not move to `ready` merely because it looks finished. `ready` means both production-ready and rights-cleared for the intended build.
