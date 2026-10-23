# Plushbound Legends Branding Assets

## Official Android launcher icon

`plushbound-launcher-icon.webp` is the canonical game-layer source for the Plushbound Legends Android launcher icon.

The Android APK workflow runs `game/tools/apply-android-launcher-icon.py` after reconstructing the native Android project. The script generates density-specific launcher resources (mdpi through xxxhdpi), round-icon fallbacks, and Android 8+ adaptive-icon resources, then updates the reconstructed manifest to use those resources.

### Visual direction

- Subject: crimson/black Guardian wolf face
- Primary mark: glowing forehead sigil
- No small title text in the launcher icon
- Dark near-black background
- Safe inset protects the ears, eyes, and sigil from manufacturer-specific icon masks

### Provenance

- Source concept: user-provided Plushbound Legends wolf/key-art direction
- Launcher-icon artwork: AI-assisted image generation performed for this project in ChatGPT at the user's direction
- Selection/creative direction: project owner
- Project use: original Plushbound Legends branding asset
- Modification: resized/inset automatically for Android launcher densities and adaptive masks

This file is a build-time branding source rather than an in-game runtime asset. It is intentionally kept outside the frozen Engine v1 layer so the engine remains reusable and game-agnostic.
