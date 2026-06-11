import { resolve } from 'node:path';
import { defineConfig } from 'wxt';

// WXT configuration.
//
// - `srcDir: 'src'` keeps all source under src/ (matches the traverse layout).
// - `imports: false` disables WXT's auto-imports so every API is imported
//   explicitly (consistent with verbatimModuleSyntax). WXT APIs are imported
//   from the generated `#imports` module.
// - `@wxt-dev/module-solid` wires up vite-plugin-solid for the build.
export default defineConfig({
    srcDir: 'src',
    imports: false,
    modules: ['@wxt-dev/module-solid'],
    // Dev-only browser launch (web-ext), used by `pnpm dev:extension`:
    //  - a persistent profile so the Azure DevOps sign-in persists between runs
    //  - a CDP port so playwright-cli can attach to this same browser
    //  - opens Azure DevOps on launch
    // See the `preview-in-devops` skill. `.dev-profile` is gitignored.
    webExt: {
        chromiumProfile: resolve('.dev-profile'),
        keepProfileChanges: true,
        chromiumArgs: ['--remote-debugging-port=9222'],
        startUrls: ['https://dev.azure.com'],
    },
    manifest: {
        name: 'ADO Companion',
        description: 'Adds extra functionality to Azure DevOps.',
        permissions: ['storage'],
        host_permissions: [
            'https://dev.azure.com/*',
            'https://*.visualstudio.com/*',
        ],
    },
});
