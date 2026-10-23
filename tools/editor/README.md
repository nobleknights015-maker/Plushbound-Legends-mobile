# Plushbound Visual Editor

Browser-based development tool for building Plushbound Legends world content without modifying the frozen Engine v1 runtime.

## First usable slice

The editor currently supports:

- opening any runtime map package matching `game/runtime/*.maps.json`
- loading the canonical Elyndor route package when served from the repository root
- switching between maps
- visual tile-grid rendering using each map's real width/height
- visual blocked-cell rendering
- painting and erasing blocked cells
- visual event markers at real map coordinates
- event selection from the map or event list
- moving selected events by tapping/clicking a destination tile
- numeric event X/Y editing with map-bound clamping
- inspection of event IDs, asset IDs, page triggers, conditions and command counts
- JSON export of the edited package
- touch-friendly controls and scrollable map workspace

The first slice intentionally preserves all event-page commands and conditions rather than exposing unsafe free-form mutation of them. Page/condition/command editing will be added as its own tested layer.

## Safety boundary

The editor is a development tool only. It reads and writes game-layer data. It must not change the frozen Engine v1 core simply to support editor convenience.

The canonical engine baseline remains:

`160d9fd95bc0d3db39224f8bb4c5e1e3a1f54425`

## Running

Serve the repository root with any static HTTP server and open `tools/editor/index.html`. The `Load Elyndor` button then loads `game/runtime/elyndor-route-one.maps.json` directly.

You can also open `index.html` and use **Open JSON** to load a local runtime package manually.

## Editor roadmap

Next layers are event-page editing, command builders, asset browsing, map layer/tile painting, regions/encounter zones, transfer linking, live validation, and preview integration with the game session runtime.
