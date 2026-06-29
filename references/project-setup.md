# Project Setup

Use this when creating or modernizing a standalone Helios app.

## Package Metadata

Use ESM and keep the app private unless the user asks to publish it. Check current registry versions before finalizing new scaffolds:

```bash
npm view helios-web version
npm view helios-network version
npm view vite version
npm view vite engines --json
```

As of the last skill update, current published versions were `helios-web@0.10.9`, `helios-network@0.10.3`, and `vite@8.1.0`. Vite 8 requires Node `^20.19.0 || >=22.12.0`; if the target environment must support Node 18, use a compatible Vite line instead.

```json
{
  "name": "my-helios-viz",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "helios-network": "^0.10.3",
    "helios-web": "^0.10.9"
  },
  "devDependencies": {
    "vite": "^8.1.0"
  }
}
```

Do not hard-code sibling checkout paths into package metadata for a standalone deliverable. Use local links only for a deliberate unpublished-Helios test.

## Vite Config

Alias `helios-web` to its package source entry and exclude Helios packages from dependency prebundling:

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

This pattern came from the standalone apps and avoids common bundler problems with workers and WASM-adjacent assets.

## File Organization

Use:

```text
index.html
package.json
vite.config.js
src/main.js
src/styles.css
public/
network/
scripts/
README.md
```

Put Vite-served public assets in `public/` when they should be available from `/...`. Put source or generated network payloads in `network/` or `public/network/` based on whether the app imports them through Vite (`../network/file.json?url`) or fetches them as public URLs (`/network/file.json`).

## Starting From a Template

Use the minimal template for a small static visualization:

```bash
node scripts/create-standalone-viz.mjs /tmp/my-helios-viz --name my-helios-viz --title "My Helios Viz"
cd /tmp/my-helios-viz
npm install
npm run build
```

Use the analytics template when the app needs the richer standalone interface found in the reference visualizations:

```bash
cp -R assets/analytics-interface-template /tmp/my-analytics-viz
cd /tmp/my-analytics-viz
npm install
npm run build
```

The analytics template is self-contained. It has its own `src/ui-controls.js`, generated demo network, search panel, filter panel, view panel, density quick toggle, and hover card. It is not the right starting point for remote-query tools unless you remove the synthetic generated graph and start from an empty search state.

## Reference Clone

When behavior needs confirmation from current `helios-web`, clone main into a scratch directory:

```bash
bash scripts/clone-helios-web-reference.sh /tmp/helios-web-reference
```

Search there for runtime APIs, demos, CSS variables, and panel behavior. Keep generated apps self-contained; do not depend on that clone at runtime.

Do this before overriding or recreating:

- layout, layout backend, layout options, or layout scheduling
- camera mode, projection, zoom/distance bounds, fit behavior, or renderer choice
- quick controls, pause/resume, zoom, fit, and standard camera actions
- filters, range controls, mappers, domains, panels, and persistence/session behavior

## README Content

Every app README should include:

- What data it loads.
- `npm install`, `npm run dev`, `npm run build`.
- Conversion/preparation commands, if any.
- Whether it uses a static embedding, GPU-force layout, density, filters, or remote API proxy.
- Whether Helios defaults are preserved or which mode/projection/layout/storage defaults are intentionally overridden.
- Download caps, progress, and cancellation behavior for remote-query apps.
- Any browser restrictions, such as CORS proxy requirements or WebGPU expectations.

## Deployment

Run `npm run build` and deploy the generated `dist/`. If serving under a subpath, set Vite `base` accordingly. Avoid runtime parent-directory assumptions. Prefer bundled/local data for reproducible apps; use remote fetches only when the app is explicitly a live browser for a remote catalogue.
