# WXT Extension

Built with [WXT](https://wxt.dev) 0.20 (`packages/extension/wxt.config.ts`).

## Config

`packages/extension/wxt.config.ts`:
- `srcDir: 'src'` — all source lives under `src/`.
- `imports: false` — **auto-imports are disabled**. Import every API explicitly (consistent with `verbatimModuleSyntax`).
- `modules: ['@wxt-dev/module-solid']` — wires `vite-plugin-solid` into the build.
- `manifest` — name, description, `permissions: ['storage']`, and `host_permissions` for `https://dev.azure.com/*` and `https://*.visualstudio.com/*`.

## Import paths (WXT 0.20, auto-imports off)

Auto-imports are off, so import explicitly. The paths matter — `wxt/config` does NOT exist:

| API | Import from |
|-----|-------------|
| `defineConfig` (config file only) | `wxt` |
| `defineBackground` | `wxt/utils/define-background` |
| `defineContentScript` | `wxt/utils/define-content-script` |
| `createShadowRootUi` | `wxt/utils/content-script-ui/shadow-root` |
| `WxtVitest`, `fakeBrowser` (tests) | `wxt/testing` |

## Entrypoints

Under `src/entrypoints/`:
- `background.ts` — `defineBackground(() => { ... })`.
- `content.tsx` — `defineContentScript({ matches, cssInjectionMode: 'ui', main })`. JSX requires the `.tsx` extension.
- `popup/index.html` + `popup/main.tsx` — HTML entrypoint that mounts the Solid `Popup`.

## Generated types — `wxt prepare`

WXT generates `.wxt/` (tsconfig + ambient types) which `tsc` and oxlint depend on. It runs automatically via the extension's `postinstall` script, and again as the first step of `build`. If types look missing, run `pnpm --filter ado-companion-extension exec wxt prepare`. `.wxt/` and `.output/` are gitignored.

## Manifest version per browser

- **Chrome / Edge** → Manifest V3 (`.output/chrome-mv3/`). Edge consumes the Chrome build.
- **Firefox** → Manifest V2 by default (`.output/firefox-mv2/`). This is WXT's default and is fully functional. To target Firefox MV3, set `manifestVersion`/per-browser config in `wxt.config.ts`.

## Dev runner browser

`pnpm dev:extension` launches a browser via WXT's web-ext runner, which uses
chrome-launcher — that only finds Google Chrome and errors with "No Chrome
installations found" on Edge-only machines. `wxt.config.ts` therefore sets
`webExt.binaries` to an Edge binary (Edge runs the chrome-mv3 build). Override
the binary with the `WXT_BROWSER_BINARY` env var; if no Edge is found, WXT's
default Chrome lookup is left in place.

## Build & zip outputs

- `wxt build` → `.output/chrome-mv3/`; `wxt build -b firefox` → `.output/firefox-mv2/`.
- `wxt zip` / `wxt zip -b firefox` → `.output/ado-companion-extension-<version>-<browser>.zip` (Firefox also emits a `-sources.zip` for AMO review).
