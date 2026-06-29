#!/usr/bin/env node
import { basename, dirname } from 'node:path';
import { mkdir, readFile, writeFile } from 'node:fs/promises';

function usage() {
  console.error('Usage: node wrap-zxnet-file-as-json.mjs <input.zxnet> <output.network.json>');
}

const [, , inputPath, outputPath] = process.argv;
if (!inputPath || !outputPath) {
  usage();
  process.exit(1);
}

const bytes = await readFile(inputPath);
const payload = {
  format: 'zxnet',
  encoding: 'base64',
  source: basename(inputPath),
  byteLength: bytes.byteLength,
  data: bytes.toString('base64'),
};

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(payload)}\n`, 'utf8');
console.log(`Wrote ${outputPath}`);
