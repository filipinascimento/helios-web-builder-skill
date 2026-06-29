# Verification and Troubleshooting

Use this before delivering a standalone Helios app.

## Build Checks

Run:

```bash
npm install
npm run build
```

If the app has tests:

```bash
npm test
npm run build
```

If the app has a converter:

```bash
npm run prepare:network
npm run build
```

## Browser Checks

Run:

```bash
npm run dev -- --host 127.0.0.1
```

Open the local URL and verify:

- The canvas is nonblank.
- Status reaches `Ready`.
- Console has no uncaught exceptions.
- The camera can pan/zoom or rotate.
- Hover card or labels work if implemented.
- Search/filter controls visibly affect the scene.
- Density and legend controls update if implemented.
- The app still works after a reload.

## Common Failures

### Vite cannot resolve Helios worker or package assets

Use the source-entry alias:

```js
const heliosWebSource = fileURLToPath(new URL('./node_modules/helios-web/src/index.js', import.meta.url));
resolve: { alias: { 'helios-web': heliosWebSource } }
optimizeDeps: { exclude: ['helios-network', 'helios-web'] }
```

### Blank canvas but no load error

Check:

- `await helios.ready` was awaited.
- `container` points to a visible element with nonzero size.
- `html`, `body`, `#app`, and `#viewer` have `height: 100%`.
- The graph has nodes.
- For static layout, position attribute was applied and `requestFrameNetwork()` was called.
- Node opacity/size are not zero.

### Static embedding appears wrong

Check:

- The coordinate attribute exists.
- Attribute dimension is 2 or 3.
- Values were copied into a 3D float visual attribute.
- Typed-array writes happened inside `withBufferAccess()`.
- Layout is `static`, not GPU-force.

### Netzschleuder fetch fails

Use Vite dev/preview proxy and fetch `/netzschleuder/...`, not the remote domain directly. Static deployments need their own backend/proxy or a remote server with CORS enabled.

### Large graph freezes the browser

Add a size confirmation, reduce opacity, disable hover labels by default, reduce density quality, and avoid generating JS-side copies of large buffers.

### Panels overlap or text clips

Constrain widths, set `min-width: 0`, use fixed panel heights for browsers/lists, apply `overflow: hidden`, and use `text-overflow: ellipsis` for labels.
