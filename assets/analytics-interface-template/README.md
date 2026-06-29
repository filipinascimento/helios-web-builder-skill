# Analytics Interface Template

This is a richer standalone starter for Helios apps that need the interface shape used by the funding, Luddy, and multiplex examples: full-screen canvas, compact panels, search, filters, sliders, quick controls, and a hover card.

Use it when the visualization is an analytic explorer rather than a minimal demo.

```bash
cp -R assets/analytics-interface-template /tmp/my-analytics-viz
cd /tmp/my-analytics-viz
npm install
npm run dev
```

Then replace `createDemoNetwork()` in `src/main.js` with the app's loader or converter output.

This template uses intentionally fixed generated coordinates to demonstrate the interface. For remote-query tools, remove the synthetic starter graph and show an empty ready/search state. For standard graph layouts, preserve Helios defaults unless the user or data requires a mode/projection/layout override.
