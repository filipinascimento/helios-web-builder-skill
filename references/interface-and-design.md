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

## Built-In First

Before creating custom controls, inspect the current `helios-web` source clone for existing controls and panels:

```bash
bash scripts/clone-helios-web-reference.sh /tmp/helios-web-reference
rg -n "TwoHandleRange|Filter|Mapper|Domain|Quick|Panel|Range" /tmp/helios-web-reference/src
```

Use built-in controls for standard behaviors when available:

- fit, zoom, pause/resume, and layout actions
- render-only versus render+layout filters
- two-handle numeric ranges and domain editors
- mapper controls, color/domain controls, and standard Helios panels

Custom DOM controls are appropriate for domain-specific search, remote download caps, cancellation, relationship-specific visibility, custom hover metadata, and specialized density comparisons that the built-ins do not expose.

## Controls

Use native controls styled with Helios UI classes:

- `helios-ui-button`
- `helios-ui-select`
- `helios-ui-slider`
- `helios-ui-number`
- `helios-ui-text`

For sliders, pair range and numeric input so exact values can be entered. Throttle high-frequency updates with `createFpsThrottle()`.

The skill includes copy-ready helpers in `assets/interface-snippets/controls.js` and `assets/interface-snippets/standalone-ui.css`. Use those helpers when built-in Helios UI primitives do not cover the interaction:

- `createSliderField()` and `createLogSliderField()` for density bandwidth, opacity, edge width, and z-score/log-ratio scales.
- `createRangeField()` for year or numeric filters.
- `createSelectField()` and `createSegmentedField()` for color mode, density mode, and projection/layout choices.
- `createChecklistField()` and `createCollapsedSection()` for category filters with many values.
- `createRelationshipChecklist()` for multiplex edge families where "visible" and "emphasized" are separate actions.
- `createSearchField()` for label/faculty/paper/dataset search.
- `createHoverCard()`, `createQuickControls()`, and `createInfoPanel()` for canvas-adjacent interaction.

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

## Reference App Patterns

These patterns came from the existing standalone apps and should be reused when they fit the data.

### Funding-Style Density Explorer

Use this for analytic embeddings where the main product is a density surface, log odds surface, numerator/denominator comparison, or z-score field.

- First screen: full-canvas view with a compact top-left explanation/welcome shell and a top-right control cluster.
- Controls: segmented density/log-odds mode; select fields for numerator and denominator; log sliders for bandwidth, epsilon, and display range; checkboxes for z-score or signed transforms.
- Filters: year range, categorical checklists, search attribute select, and free-text search.
- Hover: bottom-left card with the selected entity and compact metadata rows.
- Good default: keep density disabled or conservative until the scene is ready; expose the expensive controls only after load.

Implementation notes:

```js
const surfaceMode = createSegmentedField({
  label: 'Surface',
  value: 'density',
  options: [
    { value: 'density', label: 'Density' },
    { value: 'logOdds', label: 'Log odds' },
  ],
  onChange: (mode) => applyDensityMode(mode),
});

const bandwidth = createLogSliderField({
  label: 'Bandwidth',
  value: 0.045,
  min: 0.004,
  max: 0.24,
  onInput: (value) => helios.density?.({ enabled: true, bandwidth: value }),
});
```

### Luddy-Style Author or Entity Explorer

Use this for embedding maps centered around people, papers, institutions, or other entities where search and highlighted subsets matter.

- Browser panel: search input plus checklist or multi-select for target entities.
- Filter panel: text search, year range, type select, and department/category checklist.
- View panel: color mode, density mode, node size, node opacity, label zoom, and semantic zoom.
- Behavior: search should highlight or increase opacity for matching entities instead of navigating away from the canvas.
- Good default: density can represent the selected/highlighted subset rather than the whole graph.

### Multiplex Relationship Browser

Use this for multigraphs, knowledge graphs, or schema-rich networks with many edge types and long categorical filters.

- Quick controls: small square buttons near the canvas edge for help/info, fit, pause/resume layout, and density toggles.
- Relationship checklist: show counts, swatches, "All"/"None", a separate eye button for edge visibility, and row click for emphasis.
- Filters: use collapsed sections for long category lists so the panel remains usable on laptop screens.
- Metadata: small info popover with node/edge counts, source, layout, and current filters.
- Good default: hide or fade low-priority edge families instead of removing them from the network object.

Implementation notes:

```js
const relationshipControl = createRelationshipChecklist({
  relationships: relationshipStats.map((item) => ({
    value: item.id,
    label: item.label,
    count: item.edgeCount,
    color: item.color,
  })),
  visible: new Set(relationshipStats.map((item) => item.id)),
  onVisibleChange: (visible) => updateEdgeVisibility(visible),
  onEmphasisChange: (emphasized) => updateRelationshipFocus(emphasized),
});
```

## Visual Tone

Use quiet tool styling:

- Full-screen graph canvas.
- Panels with constrained widths.
- Dense but scannable controls.
- No marketing hero page.
- Use accent colors to encode data, not as decorative blobs.
- Avoid text overlap by constraining panel heights and using `min-width: 0`, `overflow: hidden`, and `text-overflow: ellipsis`.

Standalone examples used dark themes with restrained translucent panels. If the data needs inspection, avoid overly dark or low-contrast node/edge styling.

## Responsive Constraints

The reference apps work well because panels have fixed, modest widths and scroll internally:

```js
const panel = ui.createPanel({
  id: 'filters',
  title: 'Filters',
  content,
  dock: 'top-right',
  position: { x: 16, y: 16 },
  width: 320,
  minWidth: 320,
});
panel.element.style.maxHeight = 'min(720px, calc(100vh - 32px))';
panel.body.style.minHeight = '0';
panel.body.style.overflow = 'auto';
```

Avoid free-growing sidebars. A standalone app is usually opened on unknown laptop, projector, and browser sizes, so controls must stay within the viewport without covering the whole canvas.
