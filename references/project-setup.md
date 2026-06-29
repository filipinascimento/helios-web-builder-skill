# Project Setup

Use this when creating or modernizing a standalone Helios app.

## Package Metadata

Use ESM and keep the app private unless the user asks to publish it:

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
    "helios-web": "^0.10.7"
  },
  "devDependencies": {
    "vite": "^5.4.10"
  }
}
```

Use newer compatible package versions if the user wants latest packages, but check the registry first. Do not hard-code sibling checkout paths into package metadata for a standalone deliverable.

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

## Reference Clone

When behavior needs confirmation from current `helios-web`, clone main into a scratch directory:

```bash
bash scripts/clone-helios-web-reference.sh /tmp/helios-web-reference
```

Search there for runtime APIs, demos, CSS variables, and panel behavior. Keep generated apps self-contained; do not depend on that clone at runtime.

## README Content

Every app README should include:

- What data it loads.
- `npm install`, `npm run dev`, `npm run build`.
- Conversion/preparation commands, if any.
- Whether it uses a static embedding, GPU-force layout, density, filters, or remote API proxy.
- Any browser restrictions, such as CORS proxy requirements or WebGPU expectations.

## Deployment

Run `npm run build` and deploy the generated `dist/`. If serving under a subpath, set Vite `base` accordingly. Avoid runtime parent-directory assumptions. Prefer bundled/local data for reproducible apps; use remote fetches only when the app is explicitly a live browser for a remote catalogue.
