# Netzschleuder and Remote GT Networks

Use this for apps that browse `https://networks.skewed.de` or other `.gt.zst` sources.

## Vite Proxy

Netzschleuder does not send development-friendly CORS headers. Add a Vite proxy:

```js
const netzschleuderProxy = {
  target: 'https://networks.skewed.de',
  changeOrigin: true,
  secure: true,
  rewrite: (path) => path.replace(/^\/netzschleuder/, ''),
};

export default defineConfig({
  resolve: { alias: { 'helios-web': heliosWebSource } },
  optimizeDeps: { exclude: ['helios-network', 'helios-web'] },
  server: { proxy: { '/netzschleuder': netzschleuderProxy } },
  preview: { proxy: { '/netzschleuder': netzschleuderProxy } },
});
```

Use `/netzschleuder/api/nets`, `/netzschleuder/api/net/:dataset`, and `/netzschleuder/net/:dataset/files/:network.gt.zst` in app code.

## Metadata Normalization

Normalize analysis records into a stable shape:

```js
function normalizeNetworkEntry(id, analysis = {}) {
  return {
    id: String(id),
    label: String(id),
    nodes: Number(analysis.num_vertices) || 0,
    edges: Number(analysis.num_edges) || 0,
    directed: analysis.is_directed === true,
    bipartite: analysis.is_bipartite === true,
    averageDegree: Number.isFinite(Number(analysis.average_degree)) ? Number(analysis.average_degree) : null,
    vertexProperties: Array.isArray(analysis.vertex_properties) ? analysis.vertex_properties : [],
    edgeProperties: Array.isArray(analysis.edge_properties) ? analysis.edge_properties : [],
  };
}
```

Some datasets have one analysis object; others have an object keyed by network id. Sort multiple entries by size and id.

## Large-Network Guard

Use thresholds before loading:

```js
const LARGE_NODE_THRESHOLD = 1_000_000;
const LARGE_EDGE_THRESHOLD = 2_000_000;

function isLargeNetwork(network) {
  return Number(network?.nodes ?? 0) > LARGE_NODE_THRESHOLD
    || Number(network?.edges ?? 0) > LARGE_EDGE_THRESHOLD;
}
```

Ask for confirmation before opening a very large network. Show node and edge counts before the user clicks open.

## Loading GT

```js
const response = await fetch(downloadPath);
if (!response.ok) throw new Error(`Unable to fetch ${networkId}.gt.zst: ${response.status}`);
const network = await HeliosNetwork.fromGT(response);
```

Then choose a position attribute if one exists:

```js
const POSITION_CANDIDATES = Object.freeze(['_pos', 'pos', 'Position', 'position', 'coords', 'layout']);

function choosePositionAttribute(network) {
  for (const name of POSITION_CANDIDATES) {
    const info = network.getNodeAttributeInfo?.(name);
    const dimension = Number(info?.dimension ?? 0);
    if (info && info.complex !== true && (dimension === 2 || dimension === 3)) return name;
  }
  return null;
}
```

Preserve this source in a `_netzschleuder_original_position` 3D float attribute before applying layouts.

## Scene Setup

For unknown remote graphs:

- Use 3D GPU-force by default.
- Enable quick controls.
- Disable labels initially.
- Use lower opacity for very large edge sets.
- Mount the dataset browser panel top-left and standard mapper/filter/layout/legend panels top-right.
- Use `replaceNetwork()` to avoid tearing down the full UI when a user opens another network.
