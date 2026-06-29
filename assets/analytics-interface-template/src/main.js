import HeliosNetwork, { AttributeType } from 'helios-network';
import { Helios, HeliosUI, colormapToScheme } from 'helios-web';

import {
  createChecklist,
  createHoverCard,
  createSearch,
  createSegmented,
  createSlider,
  el,
} from './ui-controls.js';
import './styles.css';

const viewer = document.querySelector('#viewer');

const LABEL = 'Label';
const GROUP = 'Group';
const TYPE = 'Type';
const YEAR = 'Year';
const SCORE = 'Score';
const VISIBILITY = '_ui_visibility';
const POSITION = '_helios_visuals_position';

let nodeMeta = [];

const state = {
  search: '',
  selectedGroups: new Set(['Alpha', 'Beta', 'Gamma', 'Delta']),
  selectedTypes: new Set(['Paper', 'Person', 'Place']),
  colorMode: 'group',
  nodeOpacity: 0.92,
  edgeOpacity: 0.22,
};

function setStatus(message) {
  viewer.dataset.status = message ?? '';
}

async function createDemoNetwork() {
  const nodeCount = 96;
  const groups = ['Alpha', 'Beta', 'Gamma', 'Delta'];
  const types = ['Paper', 'Person', 'Place'];
  nodeMeta = [];
  const network = await HeliosNetwork.create({ directed: false, initialNodes: 0 });
  const nodes = network.addNodes(nodeCount);
  const edges = [];

  for (let index = 0; index < nodeCount; index += 1) {
    edges.push({ from: nodes[index], to: nodes[(index + 1) % nodeCount] });
    if (index % 2 === 0) edges.push({ from: nodes[index], to: nodes[(index + 13) % nodeCount] });
    if (index % 5 === 0) edges.push({ from: nodes[index], to: nodes[(index + 31) % nodeCount] });
  }
  network.addEdges(edges);

  for (let id = 0; id < nodeCount; id += 1) {
    nodeMeta[id] = {
      label: `${types[id % types.length]} ${id + 1}`,
      group: groups[id % groups.length],
      type: types[(id + Math.floor(id / 7)) % types.length],
      year: 2016 + (id % 9),
      score: 1 + ((id * 7) % 20),
    };
  }

  network.nodeAttribute(LABEL, (_value, id) => nodeMeta[id].label, { type: AttributeType.String });
  network.nodeAttribute(GROUP, (_value, id) => nodeMeta[id].group, { type: AttributeType.String });
  network.nodeAttribute(TYPE, (_value, id) => nodeMeta[id].type, { type: AttributeType.String });
  network.nodeAttribute(YEAR, (_value, id) => nodeMeta[id].year, { type: AttributeType.Int });
  network.nodeAttribute(SCORE, (_value, id) => nodeMeta[id].score, { type: AttributeType.Float });
  network.nodeAttribute(VISIBILITY, () => 1, { type: AttributeType.Float });
  network.defineNodeAttribute(POSITION, AttributeType.Float, 3);

  network.withBufferAccess(() => {
    const positions = network.getNodeAttributeBuffer(POSITION)?.view;
    for (let index = 0; index < nodeCount; index += 1) {
      const arm = index % groups.length;
      const angle = (index / nodeCount) * Math.PI * 2 + arm * 0.16;
      const radius = 95 + arm * 32 + ((index * 17) % 40);
      const offset = index * 3;
      positions[offset] = Math.cos(angle) * radius;
      positions[offset + 1] = Math.sin(angle) * radius;
      positions[offset + 2] = 0;
    }
  });
  network.bumpNodeAttributeVersion?.(POSITION);
  network.categorizeNodeAttribute(GROUP, { sortOrder: 'frequency' });
  network.categorizeNodeAttribute(TYPE, { sortOrder: 'frequency' });
  return network;
}

function getNodeValue(attribute, id) {
  const meta = nodeMeta[id];
  if (!meta) return '';
  if (attribute === LABEL) return meta.label;
  if (attribute === GROUP) return meta.group;
  if (attribute === TYPE) return meta.type;
  if (attribute === YEAR) return meta.year;
  if (attribute === SCORE) return meta.score;
  return '';
}

function applyColorMode(helios) {
  const attribute = state.colorMode === 'type' ? TYPE : GROUP;
  const dictionary = helios.network.getNodeAttributeCategoryDictionary?.(attribute, { sortById: true });
  const ids = Array.from(dictionary?.ids ?? []).map(Number);
  const scheme = colormapToScheme(state.colorMode === 'type' ? 'tableau10' : 'category18', Math.max(ids.length, 1));
  helios.nodeMapper.channel('color').from(attribute).categorical(ids, scheme).done();
  helios.edgeMapper.channel('color').from('@node.color').nodeToEdge().done();
  helios.requestRender();
}

function applyVisibility(helios) {
  const { network } = helios;
  network.nodeAttribute(VISIBILITY, (_value, id) => {
    const matchesGroup = state.selectedGroups.has(getNodeValue(GROUP, id));
    const matchesType = state.selectedTypes.has(getNodeValue(TYPE, id));
    const label = String(getNodeValue(LABEL, id)).toLowerCase();
    const matchesSearch = !state.search || label.includes(state.search.toLowerCase());
    return matchesGroup && matchesType && matchesSearch ? 1 : 0.08;
  }, { type: AttributeType.Float });
  network.bumpNodeAttributeVersion?.(VISIBILITY);
  helios.nodeMapper.channel('opacity').from(VISIBILITY).linear([0, 1], [0.08, state.nodeOpacity]).done();
  helios.edgeOpacityScale(state.edgeOpacity);
  helios.requestRender();
}

function mountPanels(helios) {
  const ui = new HeliosUI({
    helios,
    theme: 'dark',
    allowDrag: true,
    layerName: 'analytics-ui',
    persistenceIndicators: false,
  });

  const overview = el('div', { className: 'analytics-panel' });
  overview.append(el('div', {
    className: 'stats',
    children: [
      el('div', { className: 'stat', children: [el('span', { text: 'Nodes' }), el('strong', { text: helios.network.nodeCount.toLocaleString() })] }),
      el('div', { className: 'stat', children: [el('span', { text: 'Edges' }), el('strong', { text: helios.network.edgeCount.toLocaleString() })] }),
    ],
  }));
  overview.append(createSearch({
    placeholder: 'Search labels',
    onInput: (query) => {
      state.search = query.trim();
      applyVisibility(helios);
      setStatus(query ? `Filtering: ${query}` : 'Ready');
    },
  }).root);
  overview.append(createChecklist({
    label: 'Groups',
    options: ['Alpha', 'Beta', 'Gamma', 'Delta'].map((value) => ({ value, label: value })),
    selected: state.selectedGroups,
    onChange: (selected) => {
      state.selectedGroups = selected;
      applyVisibility(helios);
    },
  }).root);
  overview.append(createChecklist({
    label: 'Types',
    options: ['Paper', 'Person', 'Place'].map((value) => ({ value, label: value })),
    selected: state.selectedTypes,
    onChange: (selected) => {
      state.selectedTypes = selected;
      applyVisibility(helios);
    },
  }).root);

  ui.createPanel({
    id: 'analytics-browser',
    title: 'Browser',
    content: overview,
    dock: 'top-left',
    position: { x: 16, y: 16 },
    width: 330,
    minWidth: 330,
  });

  const view = el('div', { className: 'analytics-panel' });
  view.append(createSegmented({
    label: 'Color',
    value: state.colorMode,
    options: [
      { value: 'group', label: 'Group' },
      { value: 'type', label: 'Type' },
    ],
    onChange: (value) => {
      state.colorMode = value;
      applyColorMode(helios);
    },
  }).root);
  view.append(createSlider({
    label: 'Node opacity',
    value: state.nodeOpacity,
    min: 0.1,
    max: 1,
    step: 0.01,
    onInput: (value) => {
      state.nodeOpacity = value;
      applyVisibility(helios);
    },
  }).root);
  view.append(createSlider({
    label: 'Edge opacity',
    value: state.edgeOpacity,
    min: 0,
    max: 0.8,
    step: 0.01,
    onInput: (value) => {
      state.edgeOpacity = value;
      applyVisibility(helios);
    },
  }).root);

  ui.createPanel({
    id: 'analytics-view',
    title: 'View',
    content: view,
    dock: 'top-right',
    position: { x: 16, y: 16 },
    width: 300,
    minWidth: 300,
  });
}

function mountQuickControls(helios) {
  const controls = el('div', { className: 'quick-controls' });
  const density = el('button', { className: 'quick-button', text: 'Den', attrs: { type: 'button', title: 'Toggle density', 'aria-label': 'Toggle density' } });
  density.addEventListener('click', () => {
    const active = density.dataset.active !== 'true';
    density.dataset.active = String(active);
    helios.density?.({ enabled: active, bandwidth: 0.045, weight: SCORE });
    helios.requestRender();
  });
  controls.append(density);
  viewer.append(controls);
}

function mountHover(helios) {
  const hover = createHoverCard(viewer);
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
      const id = detail.index;
      const label = getNodeValue(LABEL, id);
      helios.hoverNodeState(id, 'HIGHLIGHTED');
      helios.labels({ enabled: true, maxVisible: 1, source: (nodeId) => (nodeId === id ? label : null) });
      hover.setNode(label, [
        ['Group', getNodeValue(GROUP, id)],
        ['Type', getNodeValue(TYPE, id)],
        ['Year', getNodeValue(YEAR, id)],
      ]);
      return;
    }
    helios.hoverNodeState(null, 0);
    helios.labels({ enabled: false });
    hover.setEmpty();
  });
}

function frame(helios) {
  helios.requestFrameNetwork({ paddingPx: 150 });
  requestAnimationFrame(() => requestAnimationFrame(() => {
    helios.requestFrameNetwork({ paddingPx: 150 });
    helios.requestRender();
  }));
}

async function bootstrap() {
  setStatus('Creating demo network');
  const network = await createDemoNetwork();
  setStatus('Starting Helios');
  const helios = new Helios(network, {
    container: viewer,
    ui: false,
    quickControls: true,
    storage: false,
    session: false,
    warnOnUnsavedChanges: false,
    // This template demonstrates a fixed embedding, so static 2D is intentional.
    // Remote-query and general graph-layout apps should preserve Helios defaults
    // unless the user requests a mode/projection/layout override.
    mode: '2d',
    projection: 'orthographic',
    layout: { type: 'static' },
  });
  await helios.ready;
  helios.stopLayout?.('analytics-static');
  helios.behavior?.layout?.applyPositionAttribute?.(POSITION, { reason: 'initial-position' });
  helios.nodeMapper.channel('size').from(SCORE).linear([1, 20], [1.6, 5.2]).done();
  helios.edgeMapper.channel('width').constant(0.75).done();
  helios.nodeOutlineWidthBase(0).nodeOutlineWidthScale(0.8).semanticZoomExponent(0.72).clearColor('#08101b');
  applyColorMode(helios);
  applyVisibility(helios);
  helios.labels({ enabled: false, source: LABEL, maxVisible: 1, maxChars: 52 });
  mountPanels(helios);
  mountQuickControls(helios);
  mountHover(helios);
  frame(helios);

  window.helios = helios;
  window.heliosNetwork = network;
  setStatus('Ready');
}

bootstrap().catch((error) => {
  console.error(error);
  setStatus('Failed to load');
  viewer.innerHTML = `
    <div style="padding: 1rem; color: white; font-family: sans-serif">
      <h1>Unable to start Helios Analytics Viz</h1>
      <pre></pre>
    </div>
  `;
  viewer.querySelector('pre').textContent = String(error?.message ?? error);
});
