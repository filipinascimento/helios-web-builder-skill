# Data Loading

Use this when deciding how data should enter a standalone app.

## Local XNET File

For an `.xnet` file bundled by Vite:

```js
import networkUrl from '../network/my-network.xnet?url';

async function loadNetwork() {
  const response = await fetch(networkUrl, { cache: 'no-store' });
  if (!response.ok) throw new Error(`Failed to fetch network: ${response.status}`);
  return HeliosNetwork.fromXNet(response);
}
```

Use this for small and medium files when direct bundling is acceptable.

## Base64 ZXNET JSON

For compressed payloads, use a JSON wrapper:

```json
{
  "format": "zxnet",
  "encoding": "base64",
  "byteLength": 12345,
  "nodeCount": 100,
  "edgeCount": 200,
  "data": "..."
}
```

Decode and validate:

```js
function base64ToBytes(base64, expectedByteLength = null) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  if (expectedByteLength != null && bytes.byteLength !== expectedByteLength) {
    throw new Error(`Decoded ${bytes.byteLength} bytes, expected ${expectedByteLength}`);
  }
  return bytes;
}

async function loadNetworkFromZxnetJson(url) {
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) throw new Error(`Failed to fetch network JSON: ${response.status}`);
  const payload = await response.json();
  if (payload?.format !== 'zxnet' || payload?.encoding !== 'base64' || typeof payload?.data !== 'string') {
    throw new Error('Network JSON payload must contain base64-encoded zxnet data');
  }
  return HeliosNetwork.fromZXNet(base64ToBytes(payload.data, payload.byteLength));
}
```

This pattern keeps binary data easy to deploy on static hosts and mirrors the Luddy, funding, and multiplex standalone apps.

## Raw XNET JSON Wrapper

For a raw XNET text wrapper:

```js
async function loadRawXnetJson(url) {
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) throw new Error(`Failed to fetch network JSON: ${response.status}`);
  const payload = await response.json();
  if (payload?.format !== 'xnet' || typeof payload?.data !== 'string') {
    throw new Error('Unsupported network payload');
  }
  return HeliosNetwork.fromXNet(new TextEncoder().encode(payload.data));
}
```

## Programmatic Demo Data

Use this for examples and tests without external data:

```js
const network = await HeliosNetwork.create({ directed: false, initialNodes: 0 });
const nodes = network.addNodes(12);
network.addEdges(nodes.map((node, index) => ({ from: node, to: nodes[(index + 1) % nodes.length] })));
network.nodeAttribute('Label', (_value, id) => `Node ${id}`, { type: AttributeType.String });
network.nodeAttribute('Group', (_value, id) => (id % 3 === 0 ? 'Alpha' : id % 3 === 1 ? 'Beta' : 'Gamma'), {
  type: AttributeType.String,
});
```

## Coordinate Attributes

For a static embedding, Helios expects a position attribute with 2 or 3 components. If the source is 2D, copy it into a 3-component float visual attribute:

```js
function copyPositionAttribute(network, sourceName, targetName = '_helios_visuals_position') {
  const sourceInfo = network.getNodeAttributeInfo?.(sourceName);
  if (!sourceInfo) throw new Error(`Missing position attribute ${sourceName}`);
  const sourceDimension = Number(sourceInfo.dimension ?? 0);
  if (sourceDimension !== 2 && sourceDimension !== 3) throw new Error(`${sourceName} must be 2D or 3D`);

  if (!network.getNodeAttributeInfo?.(targetName)) {
    network.defineNodeAttribute(targetName, AttributeType.Float, 3);
  }

  network.withBufferAccess(() => {
    const source = network.getNodeAttributeBuffer(sourceName)?.view;
    const target = network.getNodeAttributeBuffer(targetName)?.view;
    for (let index = 0; index < network.nodeCount; index += 1) {
      const s = index * sourceDimension;
      const t = index * 3;
      target[t] = Number(source[s] ?? 0);
      target[t + 1] = Number(source[s + 1] ?? 0);
      target[t + 2] = sourceDimension === 3 ? Number(source[s + 2] ?? 0) : 0;
    }
  });
  network.bumpNodeAttributeVersion?.(targetName);
  return targetName;
}
```

Allocate and define attributes before taking typed-array views. Keep reads and writes inside `withBufferAccess(...)`.

## Converter Pattern

For repeatable conversion, place scripts in `scripts/` and expose them from `package.json`, such as:

```json
{
  "scripts": {
    "prepare:network": "node scripts/convert-xnet-to-zxnet-json.mjs",
    "dev": "vite",
    "build": "vite build"
  }
}
```

The converter can load XNET with `HeliosNetwork.fromXNet()`, save with `network.saveZXNet({ compressionLevel: 6, format: 'uint8array' })`, and write the base64 JSON wrapper described above.
