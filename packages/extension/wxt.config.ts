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
