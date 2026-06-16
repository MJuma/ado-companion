import { existsSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig } from 'wxt';

// WXT's dev runner launches the browser via chrome-launcher, which only knows
// how to find Google Chrome and fails with "No Chrome installations found" on
// machines that only have Edge. Edge is Chromium-based and runs the chrome-mv3
// build fine, so resolve a Chromium binary to launch instead: an explicit
// `WXT_BROWSER_BINARY` override wins, otherwise fall back to the first Edge
// install found for the platform. Returns undefined when none is found, leaving
// WXT's default Chrome lookup in place for contributors who do have Chrome.
function resolveDevBrowserBinary(): string | undefined {
    const override = process.env['WXT_BROWSER_BINARY'];
    if (override) {
        return override;
    }
    const edgeByPlatform: Record<string, string[]> = {
        darwin: ['/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge'],
        win32: [
            'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
            'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
        ],
        linux: ['/opt/microsoft/msedge/microsoft-edge', '/usr/bin/microsoft-edge'],
    };
    return (edgeByPlatform[process.platform] ?? []).find((path) => existsSync(path));
}

const devBrowserBinary = resolveDevBrowserBinary();

// chrome-launcher writes chrome-out.log into the --user-data-dir but, unlike the
// temp-dir case, does NOT create that directory when one is passed explicitly —
// so the dev profile dir must already exist or the launch fails with ENOENT.
const devProfileDir = resolve('.dev-profile');
mkdirSync(devProfileDir, { recursive: true });

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
    //  - `binaries` launches Edge (Chromium) since this is an Edge-first repo
    //    and chrome-launcher can't find Chrome on an Edge-only machine
    //  - a persistent profile so the Azure DevOps sign-in persists between runs
    //  - a CDP port so playwright-cli can attach to this same browser
    //  - opens Azure DevOps on launch
    // See the `preview-in-devops` skill. `.dev-profile` is gitignored.
    webExt: {
        ...(devBrowserBinary
            ? { binaries: { chrome: devBrowserBinary, edge: devBrowserBinary } }
            : {}),
        chromiumProfile: devProfileDir,
        keepProfileChanges: true,
        chromiumArgs: ['--remote-debugging-port=9222'],
        startUrls: ['https://dev.azure.com'],
    },
    manifest: ({ browser }) => ({
        name: 'ADO Companion',
        description: 'Adds extra functionality to Azure DevOps.',
        permissions: ['storage'],
        host_permissions: [
            'https://dev.azure.com/*',
            'https://*.visualstudio.com/*',
        ],
        // The mermaid bundle (public/vendor/) is lazy-loaded by the content
        // script via runtime URL, so it must be web-accessible to ADO pages.
        web_accessible_resources: [
            {
                resources: ['vendor/*'],
                matches: ['https://dev.azure.com/*', 'https://*.visualstudio.com/*'],
            },
        ],
        // Firefox requires a stable add-on ID to sign + self-distribute (and for
        // updates to map to the same add-on). Chrome ignores this key, so only
        // emit it for the Firefox build to keep the Chrome manifest clean.
        // `update_url` powers self-distribution auto-update: Firefox polls this
        // JSON (attached to each GitHub Release; latest/download resolves to the
        // newest one) and installs newer signed .xpi builds automatically.
        ...(browser === 'firefox'
            ? {
                  browser_specific_settings: {
                      gecko: {
                          id: 'ado-companion@mjuma.github.io',
                          update_url:
                              'https://github.com/MJuma/ado-companion/releases/latest/download/updates.json',
                      },
                  },
              }
            : {}),
    }),
});
