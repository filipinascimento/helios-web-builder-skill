#!/usr/bin/env node
import { basename, dirname } from 'node:path';
import { mkdir, readFile, writeFile } from 'node:fs/promises';

function usage() {
  console.error('Usage: node convert-xnet-to-json.mjs <input.xnet> <output.network.json>');
}

const [, , inputPath, outputPath] = process.argv;
if (!inputPath || !outputPath) {
  usage();
  process.exit(1);
}

const source = await readFile(inputPath, 'utf8');
const payload = {
  format: 'xnet',
  source: basename(inputPath),
  data: source,
};

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(payload)}\n`, 'utf8');
console.log(`Wrote ${outputPath}`);
