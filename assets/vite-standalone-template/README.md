# __APP_TITLE__

Standalone Vite viewer using `helios-web` and `helios-network`.

## Development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

The starter creates a small in-browser demo network with intentionally fixed 2D coordinates. Replace `createDemoNetwork()` in `src/main.js` with a loader for your `.xnet`, `.zxnet.json`, `.gt.zst`, or generated data.

For graph-layout apps, preserve Helios defaults unless you intentionally need a static embedding, custom mode, projection, renderer, or layout backend. For remote-query apps, remove the generated demo network and start from an empty search state or a real default query.
