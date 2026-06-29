# Helios API Recipes

Use these recipes as starting points. Check the current `helios-web` source before overriding runtime defaults or recreating built-in behavior.

## Preserve Defaults First

For a normal graph app, start with the fewest options:

```js
const helios = new Helios(network, {
  container: viewer,
  storage: false,
  session: false,
  warnOnUnsavedChanges: false,
});
await helios.ready;
```

Only add `mode`, `projection`, `renderer`, `layout`, or layout options when:

- the data has trusted fixed coordinates,
- the user asked for a specific behavior,
- a control exposes the choice to the user, or
- the current `helios-web` source confirms the default is not appropriate.

Use built-in quick controls, panels, filters, ranges, mapper/domain controls, and layout controls before writing custom UI for the same behavior.

## Static 2D Embedding

```js
const helios = new Helios(network, {
  container: viewer,
  ui: false,
  quickControls: true,
  storage: false,
  session: false,
  warnOnUnsavedChanges: false,
  // These overrides are intentional only for trusted fixed coordinates.
  mode: '2d',
  projection: 'orthographic',
  layout: { type: 'static' },
});
await helios.ready;
helios.stopLayout?.('standalone-static');
helios.behavior?.layout?.applyPositionAttribute?.('_helios_visuals_position', { reason: 'initial-position' });
helios.requestFrameNetwork({ paddingPx: 180 });
```

Use this for UMAP/t-SNE/embedding maps and any XNET with fixed coordinates.

## GPU-Force Network

Prefer preserving Helios defaults first. Use this only when the user or current source inspection calls for explicit layout settings:

```js
const helios = new Helios(network, {
  container: viewer,
  quickControls: true,
  mode: '3d',
  projection: 'perspective',
  layout: {
    type: 'gpu-force',
    options: {
      mode: '3d',
      layoutScheduling: 'auto',
    },
  },
  storage: false,
  session: false,
  warnOnUnsavedChanges: false,
});
await helios.ready;
helios.startLayout?.();
helios.requestFrameNetwork({ animate: false, paddingPx: 132 });
```

Use this when no trusted coordinates exist.

## Common Appearance

```js
helios.nodeMapper.channel('size').constant(2.8).done();
helios.nodeMapper.channel('outline').constant(1).done();
helios.edgeMapper.channel('color').from('@node.color').nodeToEdge().done();
helios.edgeMapper.channel('width').constant(0.9).done();
helios.edgeMapper.channel('opacity').constant(0.16).done();

helios
  .nodeSizeScale(1.1)
  .nodeOpacityScale(0.85)
  .nodeOutlineWidthBase(0)
  .nodeOutlineWidthScale(0.9)
  .edgeOpacityBase(0)
  .edgeOpacityScale(0.16)
  .semanticZoomExponent(0.75)
  .clearColor('#07101c');
```

## Categorical Colors

```js
function ensureCategoricalAttribute(network, name) {
  const info = network.getNodeAttributeInfo?.(name);
  if (!info) return null;
  if (info.type === AttributeType.String) network.categorizeNodeAttribute(name, { sortOrder: 'frequency' });
  return network.getNodeAttributeInfo?.(name) ?? null;
}

function applyCategoryColors(helios, attributeName) {
  const info = ensureCategoricalAttribute(helios.network, attributeName);
  if (!info) return;
  const dictionary = helios.network.getNodeAttributeCategoryDictionary?.(attributeName, { sortById: true });
  const ids = Array.from(dictionary?.ids ?? []).slice(0, 18).map(Number);
  const palette = colormapToScheme('category18', Math.max(ids.length, 1));
  helios.nodeMapper.channel('color').from(attributeName).categorical(ids, palette).done();
  helios.edgeMapper.channel('color').from('@node.color').nodeToEdge().done();
  helios.requestRender();
}
```

For labeled legends with many categories, do not map unlimited categories into a fixed palette. Order by frequency, keep only the palette capacity, and collapse the rest into a neutral `Other` category or leave them with a neutral fallback. This avoids repeating category colors with misleading labels.

```js
function selectTopCategories(categoryStats, limit = 18) {
  const sorted = [...categoryStats].sort((a, b) => (b.count ?? 0) - (a.count ?? 0));
  return {
    kept: sorted.slice(0, limit),
    other: sorted.slice(limit),
  };
}
```

## Numeric Colors

```js
helios.nodeMapper
  .channel('color')
  .from('Year')
  .colormap('interpolateCividis', { domain: [1990, 2026], alpha: 1, clamp: true })
  .done();
```

## Density Surface

Single property:

```js
helios.density({
  enabled: true,
  property: 'isDisclosure',
  bandwidth: 10,
  epsilon: 1e-6,
  qualityScale: 0.1,
  scaleWithZoom: false,
});
```

Log-ratio against uniform:

```js
helios.density({
  enabled: true,
  property: 'hasP',
  compareProperty: 'Uniform',
  comparisonMode: 'logRatio',
  logRatioZScore: true,
  logRatioSupportCorrection: true,
  logRatioRange: 2.5,
  logRatioColormap: 'CET_D04-DarkInferno',
  bandwidth: 10,
  epsilon: 1e-6,
  scaleWithZoom: false,
});
```

Legends:

```js
helios.legends({
  enabled: true,
  showDensity: true,
  placements: { density: 'bottom-right' },
  titles: { density: 'Signal vs Uniform' },
});
```

## Filters

For current `helios-web`, use built-in filter behavior/panels before implementing app-local filtering. This matters for connected-component size, render-only versus render+layout scope, and layout reheating.

Either use `HeliosFilter` or behavior filter rules depending on the app complexity:

```js
const filter = new HeliosFilter({
  id: 'standalone-filter',
  name: 'Standalone Filter',
  scope: 'render',
});

filter.addRule({
  id: 'search',
  scope: 'node',
  type: 'string',
  attribute: 'Label',
  operator: 'contains',
  value: searchText,
});

filter.addRule({
  id: 'year',
  scope: 'node',
  type: 'numeric',
  attribute: 'Year',
  min: 2000,
  max: 2026,
});

helios.setGraphFilter?.(filter);
helios.requestRender();
```

For layout-affecting filters, use `scope: 'render+layout'` and reheat the layout if the app uses GPU-force.

Before composing native two-ended sliders, check whether `TwoHandleRange` or an exported Helios UI primitive already covers the range/domain interaction.

## Hover Cards and Labels

```js
helios
  .resetStateStyles()
  .nodeStateStyle('HIGHLIGHTED', {
    sizeMul: 1.4,
    opacityMul: 1,
    outlineMul: 1.9,
    colorAdd: [0.12, 0.12, 0.12, 0],
  });

helios.labels({
  enabled: false,
  maxVisible: 1,
  source: null,
  hoveredBoost: 100,
  maxChars: 72,
});

helios.enableNodePicking({ resolutionScale: 0.35, trackDepth: false, maxFps: 24 });
helios.on('node:hover', (event) => {
  const detail = event?.detail;
  if (!detail) return;
  if (detail.state === 'in' && detail.index >= 0) {
    helios.hoverNodeState(detail.index, 'HIGHLIGHTED');
    helios.labels({ enabled: true, maxVisible: 1, source: (id) => (id === detail.index ? `Node ${id}` : null) });
  } else {
    helios.hoverNodeState(null, 0);
    helios.labels({ enabled: false });
  }
});
```

## Replace Network In Place

Use this for dataset browsers:

```js
await helios.replaceNetwork(network, {
  keepCamera: false,
  keepMappers: false,
  frame: false,
  markNetworkDirty: false,
});
```

Then reapply scene mappers and call `frameNetwork`. Add an explicit replacement `layout` only when the new data requires a non-default layout and the current `helios-web` source confirms the option shape.
