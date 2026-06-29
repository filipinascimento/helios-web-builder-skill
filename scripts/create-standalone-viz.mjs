#!/usr/bin/env node
import { cp, mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const skillDir = resolve(scriptDir, '..');
const templateDir = resolve(skillDir, 'assets/vite-standalone-template');

function usage() {
  console.error('Usage: node scripts/create-standalone-viz.mjs <output-dir> [--name package-name] [--title "App Title"]');
}

function parseArgs(argv) {
  const args = [...argv];
  const outDir = args.shift();
  const options = {
    outDir,
    name: null,
    title: null,
  };
  while (args.length) {
    const flag = args.shift();
    const value = args.shift();
    if (!value) throw new Error(`Missing value for ${flag}`);
    if (flag === '--name') options.name = value;
    else if (flag === '--title') options.title = value;
    else throw new Error(`Unknown option ${flag}`);
  }
  if (!options.outDir) throw new Error('Missing output directory');
  return options;
}

function toPackageName(value) {
  return String(value || 'helios-standalone-viz')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'helios-standalone-viz';
}

async function exists(path) {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

async function replaceTokens(file, tokens) {
  let text = await readFile(file, 'utf8');
  for (const [token, value] of Object.entries(tokens)) {
    text = text.split(token).join(value);
  }
  await writeFile(file, text, 'utf8');
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const outDir = resolve(options.outDir);
  if (await exists(outDir)) {
    throw new Error(`Output directory already exists: ${outDir}`);
  }

  const packageName = toPackageName(options.name || outDir.split(/[\\/]/).filter(Boolean).at(-1));
  const title = options.title || packageName
    .split(/[-_]+/g)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

  await mkdir(dirname(outDir), { recursive: true });
  await cp(templateDir, outDir, { recursive: true });

  const tokens = {
    '__APP_NAME__': packageName,
    '__APP_TITLE__': title,
  };
  await Promise.all([
    replaceTokens(resolve(outDir, 'package.json'), tokens),
    replaceTokens(resolve(outDir, 'index.html'), tokens),
    replaceTokens(resolve(outDir, 'src/main.js'), tokens),
    replaceTokens(resolve(outDir, 'README.md'), tokens),
  ]);

  console.log(`Created ${outDir}`);
  console.log('Next: npm install && npm run build && npm run dev');
}

main().catch((error) => {
  usage();
  console.error(error?.message ?? error);
  process.exitCode = 1;
});
