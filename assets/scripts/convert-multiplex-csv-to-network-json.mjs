#!/usr/bin/env node
import { dirname } from 'node:path';
import { mkdir, readFile, writeFile } from 'node:fs/promises';

function usage() {
  console.error('Usage: node convert-multiplex-csv-to-network-json.mjs <nodes.csv> <edges.csv> <output.network.json>');
  console.error('Required node columns: id,label,x,y');
  console.error('Required edge columns: source,target,relationship');
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];
    if (quoted) {
      if (char === '"' && next === '"') {
        cell += '"';
        i += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        cell += char;
      }
      continue;
    }
    if (char === '"') quoted = true;
    else if (char === ',') {
      row.push(cell);
      cell = '';
    } else if (char === '\n') {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else if (char !== '\r') {
      cell += char;
    }
  }
  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }
  const [headers, ...body] = rows.filter((entry) => entry.some((value) => value.trim() !== ''));
  if (!headers) return [];
  return body.map((entry) => Object.fromEntries(headers.map((header, index) => [header.trim(), entry[index]?.trim() ?? ''])));
}

const [, , nodesPath, edgesPath, outputPath] = process.argv;
if (!nodesPath || !edgesPath || !outputPath) {
  usage();
  process.exit(1);
}

const nodeRows = parseCsv(await readFile(nodesPath, 'utf8'));
const edgeRows = parseCsv(await readFile(edgesPath, 'utf8'));
const nodeIndex = new Map();
const categories = new Map();
const relationshipCounts = new Map();

const nodes = nodeRows.map((row, index) => {
  const id = row.id || row.label || String(index);
  nodeIndex.set(id, index);
  if (row.category) categories.set(row.category, (categories.get(row.category) ?? 0) + 1);
  return {
    id,
    label: row.label || id,
    x: Number(row.x) || 0,
    y: Number(row.y) || 0,
    category: row.category || 'Uncategorized',
    size: Number(row.size) || 1,
  };
});

const edges = [];
for (const row of edgeRows) {
  const source = nodeIndex.get(row.source);
  const target = nodeIndex.get(row.target);
  if (source == null || target == null) continue;
  const relationship = row.relationship || 'related';
  relationshipCounts.set(relationship, (relationshipCounts.get(relationship) ?? 0) + 1);
  edges.push({
    source,
    target,
    relationship,
    weight: Number(row.weight) || 1,
  });
}

const payload = {
  format: 'standalone-network-json',
  schemaVersion: 1,
  nodes,
  edges,
  metadata: {
    nodeCount: nodes.length,
    edgeCount: edges.length,
    categories: Object.fromEntries([...categories.entries()].sort((a, b) => a[0].localeCompare(b[0]))),
    relationships: Object.fromEntries([...relationshipCounts.entries()].sort((a, b) => a[0].localeCompare(b[0]))),
  },
};

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(payload)}\n`, 'utf8');
console.log(`Wrote ${nodes.length} nodes and ${edges.length} edges to ${outputPath}`);
