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
   - Netzschleuder or `.gt.zst`: read `references/netzschleuder.md`.
   - Rich UI with panels, filters, hover cards, density, or search: read `references/interface-and-design.md`.
2. Start from `assets/vite-standalone-template/` for a fresh app unless the user supplied an existing app.
3. If exact Helios behavior is unclear, clone the current `helios-web` main branch into a scratch reference directory:

```bash
bash scripts/clone-helios-web-reference.sh /tmp/helios-web-reference
```

4. Build with the published packages by default. Use local links only when the user explicitly wants to test unpublished Helios changes.
5. Verify with at least `npm install` and `npm run build`. For UI work, run the dev server and inspect the rendered page in a browser.

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

- Embedding/map apps: set `mode: '2d'`, `projection: 'orthographic'`, `layout: { type: 'static' }`, then copy the coordinate attribute into a 3-component float visual position attribute if needed.
- General graph apps: use `layout: { type: 'gpu-force', options: { mode: '2d' or '3d' } }`; avoid pinning renderer unless the task requires WebGPU-only behavior.
- Large remote networks: confirm before loading very large files, use modest node/edge opacity, disable expensive labels by default, and expose controls gradually.
- Rich analytic maps: use density surfaces, categorical legends, range controls, and search/filter panels. Keep the canvas full-screen and panels compact.

## UI Defaults

Standalone apps should feel like tools:

- Full-window canvas with `#viewer` absolutely filling the page.
- A small status line using `#viewer::before { content: attr(data-status); }`.
- Compact panels created through `HeliosUI`, usually docked top-right for view controls and top-left for dataset browsing.
- Search boxes, selects, range sliders, checklists, segmented controls, and hover cards as needed.
- Avoid landing pages. The first screen should be the visualization.

See `references/interface-and-design.md` for reusable UI patterns and CSS notes from the existing standalone apps.

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
- `references/netzschleuder.md`: remote API, Vite proxy, `.gt.zst`, large-network guards.
- `references/case-notes.md`: discoveries from `standalone_visualizations_helios_web_0_10_6`.
- `references/verification.md`: build, browser checks, troubleshooting.

## Completion Checklist

- App installs cleanly.
- App builds cleanly.
- The first rendered screen is the visualization.
- Data loading errors are surfaced in the page and console.
- Browser verification was done for UI or renderer changes.
- README explains install, dev, build, data source, and deployment.
- No parent-directory assumptions are required for the app to run.
