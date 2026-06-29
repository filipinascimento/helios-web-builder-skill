# Interface and Design

Use this when building the app shell, panels, controls, hover cards, and CSS.

## Layout

The first screen should be the visualization:

```html
<div id="app">
  <div id="viewer" aria-label="Helios network viewer" data-status="Loading"></div>
</div>
<script type="module" src="/src/main.js"></script>
```

```css
* { box-sizing: border-box; }
html, body, #app, #viewer { width: 100%; height: 100%; margin: 0; }
body { overflow: hidden; }
#app { position: relative; min-width: 0; min-height: 0; }
#viewer { position: absolute; inset: 0; overflow: hidden; }
```

## Status Indicator

Use dataset status on the viewer:

```js
function setStatus(message) {
  viewer.dataset.status = message ?? '';
}
```

```css
#viewer::before {
  content: attr(data-status);
  position: absolute;
  left: 14px;
  bottom: 14px;
  z-index: 10;
  max-width: min(520px, calc(100vw - 2rem));
  padding: 0.46rem 0.62rem;
  border: 1px solid color-mix(in srgb, var(--helios-ui-border, #9ba3a0) 80%, transparent);
  border-radius: 6px;
  background: color-mix(in srgb, var(--helios-ui-bg, #ffffff) 88%, transparent);
  color: var(--helios-ui-fg, #26302d);
  font-size: 0.78rem;
  pointer-events: none;
}

#viewer[data-status="Ready"]::before,
#viewer[data-status=""]::before {
  opacity: 0;
}
```

## HeliosUI Panels

Create compact panels:

```js
const ui = new HeliosUI({
  helios,
  theme: 'dark',
  allowDrag: true,
  layerName: 'standalone-ui',
  persistenceIndicators: false,
});

ui.createPanel({
  id: 'view-controls',
  title: 'View',
  content: viewContent,
  dock: 'top-right',
  position: { x: 16, y: 16 },
  width: 318,
  minWidth: 318,
});
```

For dataset browsers, mount custom DOM content in a Helios panel and fix panel body height:

```js
const panel = helios.ui.createPanel({
  id: 'dataset-browser',
  title: 'Network Browser',
  content: panelShell,
  dock: 'top-left',
  position: { x: 16, y: 16 },
  width: 380,
  minWidth: 380,
  persistencePath: false,
});
panel.element.style.height = 'min(680px, calc(100vh - 32px))';
panel.body.style.flex = '1 1 auto';
panel.body.style.minHeight = '0';
panel.body.style.overflow = 'hidden';
```

## Controls

Use native controls styled with Helios UI classes:

- `helios-ui-button`
- `helios-ui-select`
- `helios-ui-slider`
- `helios-ui-number`
- `helios-ui-text`

For sliders, pair range and numeric input so exact values can be entered. Throttle high-frequency updates with `createFpsThrottle()`.

## Hover Card

Use a small absolute card for metadata:

```css
.hover-card {
  position: absolute;
  left: 18px;
  bottom: 18px;
  z-index: 8;
  width: min(420px, calc(100vw - 2rem));
  padding: 0.95rem 1rem;
  border: 1px solid rgba(121, 152, 190, 0.26);
  border-radius: 8px;
  background: rgba(7, 15, 27, 0.76);
  backdrop-filter: blur(16px);
}
.hover-card.is-empty { opacity: 0; pointer-events: none; }
```

Keep cards compact. Do not nest UI cards inside other cards.

## Dataset Combobox

For large catalogues, use a single keyboard-navigable combobox instead of separate search and select controls:

- Input has `role="combobox"`, `aria-autocomplete="list"`, `aria-controls`, and `aria-expanded`.
- Options live in a `ul[role=listbox]` with `li[role=option]`.
- `ArrowDown`, `ArrowUp`, `Enter`, and `Escape` update active and selected entries.
- Filter by id, title, and tags.

This pattern was used for the Netzschleuder app to keep dataset selection compact and keyboard-accessible.

## Visual Tone

Use quiet tool styling:

- Full-screen graph canvas.
- Panels with constrained widths.
- Dense but scannable controls.
- No marketing hero page.
- Use accent colors to encode data, not as decorative blobs.
- Avoid text overlap by constraining panel heights and using `min-width: 0`, `overflow: hidden`, and `text-overflow: ellipsis`.

Standalone examples used dark themes with restrained translucent panels. If the data needs inspection, avoid overly dark or low-contrast node/edge styling.
