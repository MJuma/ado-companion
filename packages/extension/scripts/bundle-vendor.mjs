// Bundles heavy, optional libraries into single self-contained ESM files served
// as web-accessible resources, so the content script can lazy-load them on
// demand (only when actually needed) instead of bloating the always-loaded
// content script. Idempotent: each target is rebuilt only when its installed
// version changes.

import { createRequire } from 'node:module';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const here = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(here, '../public/vendor');
const cacheDir = resolve(here, '../node_modules/.cache');
const stampFile = resolve(cacheDir, 'vendor-versions.json');

// entry: the module to bundle; out: file under public/vendor; pkg: version source.
const targets = [
    { entry: 'mermaid', out: 'mermaid.mjs', pkg: 'mermaid/package.json' },
    { entry: 'highlight.js/lib/common', out: 'highlight.mjs', pkg: 'highlight.js/package.json' },
];

const stamp = existsSync(stampFile) ? JSON.parse(readFileSync(stampFile, 'utf8')) : {};
const next = {};
const toBuild = [];
for (const target of targets) {
    const version = require(target.pkg).version;
    next[target.out] = version;
    if (!existsSync(resolve(outDir, target.out)) || stamp[target.out] !== version) {
        toBuild.push(target);
    }
}

if (toBuild.length === 0) {
    process.exit(0);
}

const { build } = require('esbuild');
mkdirSync(outDir, { recursive: true });
mkdirSync(cacheDir, { recursive: true });

for (const target of toBuild) {
    await build({
        entryPoints: [require.resolve(target.entry)],
        bundle: true,
        format: 'esm',
        platform: 'browser',
        minify: true,
        legalComments: 'none',
        outfile: resolve(outDir, target.out),
        logLevel: 'warning',
    });
    console.log(`[bundle-vendor] built ${target.entry} -> public/vendor/${target.out}`);
}

writeFileSync(stampFile, JSON.stringify(next));
