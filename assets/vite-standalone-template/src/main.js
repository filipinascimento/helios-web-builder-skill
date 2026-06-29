import HeliosNetwork, { AttributeType } from 'helios-network';
import { Helios, HeliosUI, colormapToScheme } from 'helios-web';

import './styles.css';

const viewer = document.querySelector('#viewer');
const GROUP_ATTRIBUTE = 'Group';
const LABEL_ATTRIBUTE = 'Label';
const POSITION_ATTRIBUTE = '_helios_visuals_position';

function setStatus(message) {
  viewer.dataset.status = message ?? '';
}

async function createDemoNetwork() {
  const nodeCount = 36;
  const network = await HeliosNetwork.create({ directed: false, initialNodes: 0 });
  const nodes = network.addNodes(nodeCount);
  const edges = [];
  for (let index = 0; index < nodeCount; index += 1) {
    edges.push({ from: nodes[index], to: nodes[(index + 1) % nodeCount] });
    if (index % 3 === 0) edges.push({ from: nodes[index], to: nodes[(index + 9) % nodeCount] });
  }
  network.addEdges(edges);

  network.nodeAttribute(LABEL_ATTRIBUTE, (_value, id) => `Node ${id}`, { type: AttributeType.String });
  network.nodeAttribute(GROUP_ATTRIBUTE, (_value, id) => ['Alpha', 'Beta', 'Gamma'][id % 3], { type: AttributeType.String });
  network.nodeAttribute('Score', (_value, id) => 1 + (id % 9), { type: AttributeType.Float });
  network.defineNodeAttribute(POSITION_ATTRIBUTE, AttributeType.Float, 3);

  network.withBufferAccess(() => {
    const positions = network.getNodeAttributeBuffer(POSITION_ATTRIBUTE)?.view;
    for (let index = 0; index < nodeCount; index += 1) {
      const angle = (index / nodeCount) * Math.PI * 2;
      const radius = 110 + (index % 3) * 24;
      const offset = index * 3;
      positions[offset] = Math.cos(angle) * radius;
      positions[offset + 1] = Math.sin(angle) * radius;
      positions[offset + 2] = 0;
    }
  });
  network.bumpNodeAttributeVersion?.(POSITION_ATTRIBUTE);
  network.categorizeNodeAttribute(GROUP_ATTRIBUTE, { sortOrder: 'frequency' });
  return network;
}

function applyCategoryColors(helios) {
  const dictionary = helios.network.getNodeAttributeCategoryDictionary?.(GROUP_ATTRIBUTE, { sortById: true });
  const ids = Array.from(dictionary?.ids ?? []).map(Number);
  const palette = colormapToScheme('category18', Math.max(ids.length, 1));
  helios.nodeMapper.channel('color').from(GROUP_ATTRIBUTE).categorical(ids, palette).done();
  helios.edgeMapper.channel('color').from('@node.color').nodeToEdge().done();
}

function mountHoverCard(helios) {
  const card = document.createElement('div');
  card.className = 'hover-card is-empty';
  card.innerHTML = '<div class="hover-card__title"></div><div class="hover-card__meta"></div>';
  viewer.appendChild(card);
  const title = card.querySelector('.hover-card__title');
  const meta = card.querySelector('.hover-card__meta');

  helios
    .resetStateStyles()
    .nodeStateStyle('HIGHLIGHTED', {
      sizeMul: 1.35,
      opacityMul: 1,
      outlineMul: 1.8,
      colorAdd: [0.12, 0.12, 0.12, 0],
    });

  helios.enableNodePicking({ resolutionScale: 0.35, trackDepth: false, maxFps: 24 });
  helios.on('node:hover', (event) => {
    const detail = event?.detail;
    if (detail?.state === 'in' && detail.index >= 0) {
      const label = helios.network.getNodeStringAttribute?.(LABEL_ATTRIBUTE, detail.index) ?? `Node ${detail.index}`;
      const group = helios.network.getNodeStringAttribute?.(GROUP_ATTRIBUTE, detail.index) ?? '';
      helios.hoverNodeState(detail.index, 'HIGHLIGHTED');
      helios.labels({ enabled: true, maxVisible: 1, source: (id) => (id === detail.index ? label : null) });
      title.textContent = label;
      meta.textContent = group;
      card.classList.remove('is-empty');
      return;
    }
    helios.hoverNodeState(null, 0);
    helios.labels({ enabled: false });
    card.classList.add('is-empty');
  });
}

function mountPanel(helios) {
  const ui = new HeliosUI({
    helios,
    theme: 'dark',
    allowDrag: true,
    layerName: 'standalone-ui',
    persistenceIndicators: false,
  });

  const content = document.createElement('div');
  content.className = 'app-panel';
  content.innerHTML = `
    <p class="app-panel__intro">__APP_TITLE__ uses a small generated network. Replace <code>createDemoNetwork()</code> with a real data loader.</p>
    <div class="app-stats">
      <div class="app-stat"><span>Nodes</span><strong>${helios.network.nodeCount.toLocaleString()}</strong></div>
      <div class="app-stat"><span>Edges</span><strong>${helios.network.edgeCount.toLocaleString()}</strong></div>
    </div>
  `;

  ui.createPanel({
    id: 'app-overview',
    title: 'Overview',
    content,
    dock: 'top-right',
    position: { x: 16, y: 16 },
    width: 312,
    minWidth: 312,
  });
}

function frameInitialScene(helios) {
  helios.requestFrameNetwork({ paddingPx: 160 });
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      helios.requestFrameNetwork({ paddingPx: 160 });
      helios.requestRender();
    });
  });
}

async function bootstrap() {
  setStatus('Creating demo network');
  const network = await createDemoNetwork();
  setStatus('Starting Helios');
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
  helios.behavior?.layout?.applyPositionAttribute?.(POSITION_ATTRIBUTE, { reason: 'initial-position' });
  helios
    .nodeMapper.channel('size').from('Score').linear([1, 9], [1.6, 4.6]).done();
  helios.nodeMapper.channel('outline').constant(0.9).done();
  helios.edgeMapper.channel('width').constant(0.8).done();
  helios.edgeMapper.channel('opacity').constant(0.26).done();
  helios
    .nodeOpacityScale(0.92)
    .nodeOutlineWidthBase(0)
    .nodeOutlineWidthScale(0.8)
    .edgeOpacityBase(0)
    .edgeOpacityScale(0.26)
    .semanticZoomExponent(0.75)
    .clearColor('#07101c');
  helios.labels({ enabled: false, maxVisible: 1, source: LABEL_ATTRIBUTE, maxChars: 48 });
  applyCategoryColors(helios);
  mountPanel(helios);
  mountHoverCard(helios);
  frameInitialScene(helios);

  window.helios = helios;
  window.heliosNetwork = network;
  setStatus('Ready');
}

bootstrap().catch((error) => {
  console.error(error);
  setStatus('Failed to load');
  viewer.innerHTML = `
    <div style="padding: 1rem; color: white; font-family: sans-serif">
      <h1>Unable to start __APP_TITLE__</h1>
      <pre></pre>
    </div>
  `;
  viewer.querySelector('pre').textContent = String(error?.message ?? error);
});
