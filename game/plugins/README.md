# Plushbound MV-compatible plugins

This directory is the packaged plugin surface for the Plushbound Legends RPG Maker MV compatibility layer.

- Put classic RPG Maker MV-style JavaScript plugins in this directory.
- Configure load order, enabled state, description and parameters in `plugins.json` or through the editor Plugin Manager.
- Parameters are exposed as strings through `PluginManager.parameters(name)`, matching MV behavior.
- Plugins load in manifest order as classic scripts.
- Plugin Command event code 356 is bridged through `Game_Interpreter.prototype.pluginCommand`.
- Remote URLs and parent-directory paths are rejected; Android builds load packaged project plugins only.

Compatibility is tiered. Plugins that use parameters, switches, variables, self switches, plugin commands and basic party/player/map APIs have the strongest compatibility today. Plugins that deeply replace MV scenes, windows, sprites, PIXI internals or NW.js-only APIs remain part of the parity roadmap documented in `docs/MV_PARITY_AUDIT.md`.
