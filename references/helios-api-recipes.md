# Helios API Recipes

Use these recipes as starting points. Check the current `helios-web` source if a method signature appears to have changed.

## Static 2D Embedding

```js
const helios = new Helios(network, {
  container: viewer,
  ui: false,
  quickControls: false,
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

```js
const helios = new Helios(network, {
  container: viewer,
  ui: false,
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

For current `helios-web`, either use `HeliosFilter` or behavior filter rules depending on the app complexity.

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
  layout: {
    type: 'gpu-force',
    options: { mode: '3d', layoutScheduling: 'auto' },
  },
  frame: false,
  markNetworkDirty: false,
});
```

Then reapply scene mappers and call `frameNetwork`.
