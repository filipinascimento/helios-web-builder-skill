---
name: helios-web-builder-skill
description: Build standalone Helios web visualizations with Vite, helios-web, and helios-network. Use when Codex needs to create, adapt, debug, package, or verify a browser-based Helios visualization app for XNET, ZXNET, GT/Netzschleuder, graph networks, or embedding maps, including custom UI panels, density surfaces, filters, search, hover cards, legends, local data packaging, deployment, and reference-checking against the helios-web main repository.
---

# Helios Web Builder Skill

Use this skill to build a complete standalone Helios web visualization, not just a snippet. The expected output is a runnable app with a clear data path, Vite setup, Helios scene initialization, interaction controls, and verification steps.

## First Steps

1. Identify the data source and app type:
   - Static embedding or map with coordinates: read `references/data-loading.md` and `references/helios-api-recipes.md`.
   - General network layout: read `references/helios-api-recipes.md`.
   - Remote search/download app: read `references/remote-query-apps.md`.
   - Netzschleuder or `.gt.zst`: read `references/netzschleuder.md`.
   - Rich UI with panels, filters, hover cards, density, or search: read `references/interface-and-design.md`.
2. Choose the starter:
   - Use `assets/vite-standalone-template/` for a small static visualization or a smoke-test app.
   - Use `assets/analytics-interface-template/` when the app needs search, filters, multiple panels, quick controls, density toggles, or a richer analytical interface.
   - Copy selected helpers from `assets/interface-snippets/` when adapting an existing app.
3. Clone or update the current `helios-web` main branch into a scratch reference directory before overriding runtime defaults or recreating Helios behavior:

```bash
bash scripts/clone-helios-web-reference.sh /tmp/helios-web-reference
```

   This is required when touching layout, quick controls, camera mode, projection, renderer, panel behavior, filters, ranges, mappers, or persistence/session behavior unless the user explicitly says not to.
4. Build with the published packages by default. Use local links only when the user explicitly wants to test unpublished Helios changes.
5. Verify with at least `npm install` and `npm run build`. For UI work or remote-query apps, run the dev server and inspect the rendered page in a browser before the interface becomes complex.

## Project Shape

Prefer this Vite structure:

```text
my-viz/
├── index.html
├── package.json
├── vite.config.js
├── public/                 # static assets served at /
├── network/ or data/        # source data or generated payloads
├── scripts/                 # converters/preparation scripts when needed
└── src/
    ├── main.js
    └── styles.css
```

Use `scripts/create-standalone-viz.mjs` to create a minimal starter:

```bash
node scripts/create-standalone-viz.mjs /tmp/my-helios-viz --name my-helios-viz --title "My Helios Viz"
```

Then run:

```bash
cd /tmp/my-helios-viz
npm install
npm run build
npm run dev
```

For a richer app, copy the analytics template:

```bash
cp -R assets/analytics-interface-template /tmp/my-analytics-viz
cd /tmp/my-analytics-viz
npm install
npm run build
```

## Core Vite Setup

Use the source-entry alias for `helios-web` and exclude Helios packages from Vite dependency optimization. This mirrors the standalone visualization apps and avoids worker/WASM asset resolution issues from prebundling.

```js
import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';

const heliosWebSource = fileURLToPath(new URL('./node_modules/helios-web/src/index.js', import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      'helios-web': heliosWebSource,
    },
  },
  optimizeDeps: {
    exclude: ['helios-network', 'helios-web'],
  },
});
```

For Netzschleuder, add the proxy recipe in `references/netzschleuder.md`.

## Data Decisions

- Local `.xnet`: import as URL with `?url`, fetch it, and call `HeliosNetwork.fromXNet(response)`.
- Base64 `.zxnet.json`: fetch JSON, decode `data`, verify `byteLength`, then call `HeliosNetwork.fromZXNet(bytes)`.
- JSON wrapper with raw XNET text: parse JSON, verify `{ format: 'xnet', data: string }`, encode with `TextEncoder`, then call `HeliosNetwork.fromXNet(bytes)`.
- `.gt.zst`: fetch the response and call `HeliosNetwork.fromGT(response)`.
- Programmatic demo data: call `HeliosNetwork.create()`, `addNodes()`, `addEdges()`, and `nodeAttribute()`.

When using WASM-backed buffers, do allocation-prone work before taking views and read or write buffer views inside `network.withBufferAccess(...)`.

## Scene Decisions

- Preserve Helios defaults unless the user or data requires an override. Do not pin mode, projection, renderer, layout backend, or layout options just because the app is a graph.
- Embedding/map apps with trusted coordinates may set `mode: '2d'`, `projection: 'orthographic'`, and `layout: { type: 'static' }`; document that this is an intentional coordinate-preserving override.
- General graph apps should start from Helios defaults first. Add explicit layout/mode/projection only after checking the current `helios-web` source or when exposing user-selectable controls.
- Large remote networks: confirm before loading very large files, use modest node/edge opacity, disable expensive labels by default, and expose controls gradually.
- Rich analytic maps: use density surfaces, categorical legends, range controls, and search/filter panels. Keep the canvas full-screen and panels compact.
- Relationship-heavy or multiplex apps: use collapsed filter sections, edge relationship checklists, quick fit/pause/info controls, and separate "show/hide" from "emphasize" controls so users can inspect edge families without constantly rebuilding layout state.
- Query/demo apps should not show artificial intro graphs. Start empty, or use a clearly real default query when the user asks for one.

## UI Defaults

Standalone apps should feel like tools:

- Full-window canvas with `#viewer` absolutely filling the page.
- A small status line using `#viewer::before { content: attr(data-status); }`.
- Compact panels created through `HeliosUI`, usually docked top-right for view controls and top-left for dataset browsing.
- Search boxes, selects, range sliders, checklists, segmented controls, and hover cards as needed.
- Use built-in Helios controls and UI primitives before creating custom controls. Fit, pause/resume, zoom, standard layout controls, filters, two-handle ranges, mapper controls, and domain editors should come from `helios-web` when available.
- Avoid landing pages. The first screen should be the visualization.

See `references/interface-and-design.md` for reusable UI patterns and CSS notes from the existing standalone apps.

Copy `assets/interface-snippets/controls.js` and `assets/interface-snippets/standalone-ui.css` when the app needs the control patterns directly. The snippets are deliberately app-neutral but are based on the control surfaces in `funding_viz`, `luddy_viz`, and `multiplex_notable_viz`.

## Verification

Minimum:

```bash
npm install
npm run build
```

For apps with tests:

```bash
npm test
npm run build
```

For visual or interaction changes, also run:

```bash
npm run dev -- --host 127.0.0.1
```

Then inspect with a browser, confirm the canvas is nonblank, confirm the status reaches `Ready`, interact with hover/search/filter controls, and watch the console for thrown errors.

## Reference Files

- `references/project-setup.md`: installation, package metadata, Vite, scripts, deployment.
- `references/data-loading.md`: XNET, ZXNET JSON, raw XNET JSON, programmatic demo data, converters.
- `references/helios-api-recipes.md`: Helios initialization, mappers, positions, density, filters, replacement.
- `references/interface-and-design.md`: compact UI and CSS patterns from standalone apps.
- `references/remote-query-apps.md`: remote API probing, empty startup state, caps, progress, cancellation.
- `references/netzschleuder.md`: remote API, Vite proxy, `.gt.zst`, large-network guards.
- `references/case-notes.md`: discoveries from `standalone_visualizations_helios_web_0_10_6`.
- `references/verification.md`: build, browser checks, troubleshooting.
- `assets/interface-snippets/`: self-contained DOM/CSS helpers for rich standalone panels.
- `assets/scripts/`: small data conversion wrappers for XNET, ZXNET, and multiplex CSV payloads.
- `assets/analytics-interface-template/`: richer self-contained Vite starter with browser/filter/view panels.

## Completion Checklist

- App installs cleanly.
- App builds cleanly.
- The first rendered screen is the visualization.
- Data loading errors are surfaced in the page and console.
- Browser verification was done for UI or renderer changes.
- Remote APIs were probed live before tests locked down request parameters.
- Completion notes state whether Helios defaults were preserved or which runtime defaults were intentionally overridden.
- README explains install, dev, build, data source, and deployment.
- No parent-directory assumptions are required for the app to run.
