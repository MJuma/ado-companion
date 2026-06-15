// Bundles mermaid into a single self-contained ESM file served as a web-
// accessible resource, so the content script can lazy-load it on demand
// (only when a page actually has a mermaid diagram) instead of bloating the
// always-loaded content script. Idempotent: skips when already built for the
// installed mermaid version.

import { createRequire } from 'node:module';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const here = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(here, '../public/vendor');
const outFile = resolve(outDir, 'mermaid.mjs');
// Keep the build stamp out of the shipped output (public/vendor is copied as-is).
const cacheDir = resolve(here, '../node_modules/.cache');
const stampFile = resolve(cacheDir, 'mermaid.version');

const mermaidVersion = require('mermaid/package.json').version;

if (existsSync(outFile) && existsSync(stampFile) && readFileSync(stampFile, 'utf8') === mermaidVersion) {
    process.exit(0);
}

const { build } = require('esbuild');

mkdirSync(outDir, { recursive: true });
mkdirSync(cacheDir, { recursive: true });

await build({
    entryPoints: [require.resolve('mermaid')],
    bundle: true,
    format: 'esm',
    platform: 'browser',
    minify: true,
    legalComments: 'none',
    outfile: outFile,
    logLevel: 'warning',
});

writeFileSync(stampFile, mermaidVersion);
console.log(`[bundle-mermaid] built mermaid ${mermaidVersion} -> public/vendor/mermaid.mjs`);
