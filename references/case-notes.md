# Case Notes from standalone_visualizations_helios_web_0_10_6

These notes summarize patterns observed in the existing standalone apps. They are included so this skill is self-contained; do not assume those source directories exist.

## Shared Setup

All apps are Vite ESM projects with:

- `index.html`
- `src/main.js`
- `src/styles.css`
- `package.json`
- `vite.config.js`

Most used:

- `helios-network` around `^0.10.2` to `^0.10.3`
- `helios-web` around `^0.10.6` to `^0.10.7`
- `vite` `^5.4.10`

Every Vite config aliased `helios-web` to `./node_modules/helios-web/src/index.js` and excluded `helios-network` plus `helios-web` from `optimizeDeps`.

## Disclosures App

Purpose: static 2D disclosure/science embedding.

Key patterns:

- Imports `.xnet` with `?url`, fetches it, and calls `HeliosNetwork.fromXNet(response)`.
- Requires a `Position` node attribute.
- Copies `Position` into `_helios_visuals_position` with 3 components.
- Uses `mode: '2d'`, `projection: 'orthographic'`, `layout: { type: 'static' }`.
- Stops layout after `helios.ready`.
- Uses `isDisclosure` vs `Uniform` density in `logRatio` mode with z-score and `CET_D04-DarkInferno`.
- Creates compact `HeliosUI` panels for view controls and category legend.
- Uses a hover card and `node:hover` events for metadata.

## Funding App

Purpose: static 2D funding-source embedding with richer filters and density comparisons.

Key patterns:

- Loads a base64 `.zxnet.json` payload from `/network/...zxnet.json`.
- Keeps a user-friendly overlay and compact control panels.
- Uses funding profile attributes such as philanthropic, government, corporate, and uniform baselines.
- Exposes density mode, numerator/denominator, z-score, bandwidth, epsilon, range, focus, node opacity, node size, semantic zoom, search, year, SDG, type, profile, and in-dimensions controls.
- Uses `scaleWithZoom: false` for density so density interpretation remains stable during camera movement.

Interface details:

- `index.html` stays minimal: `#app` contains a full-window `#viewer`.
- CSS uses a dark map-like background, restrained radial highlights, translucent panels, `backdrop-filter: blur(...)`, and IBM Plex/Avenir/Segoe style fonts.
- The welcome overlay is full-screen and dismissible. Persist dismissal in local storage only for app-specific onboarding, not for critical warnings.
- The hero/status shell is a compact top-left panel with stats chips and short app context.
- The control surface is composed from small DOM helpers: `createSliderField`, `createLogSliderField`, `createRangeField`, `createSelectField`, `createSegmentedField`, `createCheckboxField`, and `createChecklistField`.
- Density controls are grouped separately from view controls and filters. This keeps expensive analytic parameters away from ordinary opacity/color controls.
- Hover cards stay bottom-left and show one entity at a time with rows, not paragraphs.

## Luddy App

Purpose: static 2D author/publication embedding.

Key patterns:

- Has `npm run prepare:network`.
- Converts source XNET to base64 ZXNET JSON using `HeliosNetwork.fromXNet()` and `network.saveZXNet()`.
- Uses static `Position` coordinates.
- Adds faculty search, multi-faculty highlight, publication lists, year/type/paper/department filters, and selected-faculty density.

Interface details:

- The browser/search panel is the primary task surface. It prioritizes selecting faculty/entities over explaining the visualization.
- The app uses search plus checklist-style subsets instead of a long landing page or a static legend.
- Density has a "highlighted faculty" mode, which is a useful pattern for entity-centric embeddings: density should often summarize the selected subset, not the entire corpus.
- Shared input styling targets Helios classes such as `.helios-ui-input`, `.helios-ui-select`, and `.helios-ui-number`, so native controls remain consistent with HeliosUI panels.
- Help is a small popover anchored near the tool surface, not a modal that hides the graph.

## Philanthrophysics App

Purpose: publication network with 2D/3D switching and filters.

Key patterns:

- Loads a JSON wrapper containing raw XNET text.
- Supports `mode` URL param with default 3D.
- Uses `HeliosFilter` for search, year range, community, and journal filters.
- Exposes color, node size, edge opacity, and mode controls.
- Recolors node categories and propagates node color to edges.
- Uses 3D camera distance expansion after initial framing to avoid overly tight startup views.

## Multiplex Notable App

Purpose: larger graph with generated attributes, GPU-force layout, filters, density, relation controls, and search.

Key patterns:

- Converts CSVs into a ZXNET JSON payload and a separate metadata JSON file.
- Seeds positions deterministically to give GPU-force a stable start.
- Uses a tuned 2D GPU-force layout with explicit force parameters.
- Defines node/edge attributes for label, categories, birth/death, size, relationship type, direction, edge width, and opacity.
- Uses behavior-level filters with `scope: 'render+layout'`.
- Reheats layout after filter changes.
- Offers auto-fit and layout restart controls.

Interface details:

- Quick controls are a small vertical stack of square buttons near the canvas edge for help/info, fit, and layout pause/restart.
- Metadata lives in a compact info popover with counts and source details.
- Relationship rows show swatches, counts, a label, and an eye button. The eye toggles edge visibility; clicking the row can emphasize a relationship without removing it.
- Long category filters use collapsed sections with scrollable bodies. This prevents filter panels from consuming the whole viewport.
- There are separate panels for color, size, relationships, filters, density, and appearance. Do this only when the dataset genuinely has that much structure.
- Density controls include enable, bandwidth, log weight, and focus. Default density state should be conservative for large graphs.

Conversion details:

- The converter builds both network payload and metadata payloads, not just edges.
- It normalizes categories and relationship labels before writing attributes.
- It creates deterministic seeded initial positions so GPU-force layout starts consistently across reloads.
- It records relationship/category counts for immediate UI controls without scanning the whole network on every boot.

## Netzschleuder App

Purpose: live dataset browser for `networks.skewed.de`.

Key patterns:

- Uses a Vite proxy for `/netzschleuder`.
- Lazily hydrates dataset metadata with a small worker pool.
- Uses one keyboard-navigable combobox for dataset id/title/tag search.
- Handles datasets with multiple networks.
- Shows node/edge counts before opening.
- Confirms before loading networks over 1,000,000 nodes or 2,000,000 edges.
- Opens `.gt.zst` files through `HeliosNetwork.fromGT(response)`.
- Finds position attributes like `_pos`, `pos`, `Position`, `position`, `coords`, or `layout`.
- Uses `replaceNetwork()` when opening another network.

## Common Implementation Lessons

- Keep generated or converted network payloads in the app, not in parent directories.
- Surface load failures in both the console and the viewer.
- Use `window.helios` and `window.heliosNetwork` during development for console inspection.
- For WASM buffers, use `withBufferAccess()` and do not hold typed-array views across allocation-prone calls.
- Frame twice after startup for static embeddings to avoid timing-dependent first-frame bounds.
- Expose only controls that matter for the dataset. A small app does not need all standard Helios panels.
- Keep `#viewer` as the first screen. Do not create a marketing or explanatory landing page before the graph.
- Put reusable domain conversion work in `scripts/` and expose it from `package.json`; do not leave ad hoc notebook or parent-directory dependencies as part of the standalone app.
- Pair sliders with number inputs when exact values matter. Use log sliders for parameters such as bandwidth, epsilon, density range, and relationship weight.
- For large or multiplex graphs, prefer opacity/visibility attributes and renderer filters over deleting data from the network object.
