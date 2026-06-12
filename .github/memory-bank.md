# Memory Bank

A grep-searchable knowledge base of gotchas, decisions, issues, patterns, and data facts for ADO Companion, accumulated across sessions. Shared by all agents.

**Format:** one line per entry — `[tag] topic: description`. Use kebab-case topics. Be concise, specific, and factual. See `.github/skills/memory-bank/SKILL.md` for the full workflow.

**Tags:** `[gotcha]` (will bite you), `[decision]` (deliberate choice + rationale), `[issue]` (bug + fix), `[perf]` (perf insight), `[pattern]` (convention to follow), `[data]` (fact about deps/data).

# ── Build & Tooling ──

[decision] stack: UI is SolidJS + Fluent Web Components on WXT — azure-devops-ui is React-16-only and Fluent React v9 is heavier; Solid pairs cleanly with framework-agnostic web components.
[pattern] tsconfig-compose: extension tsconfig uses extends array ["../../tsconfig.base.json", "./.wxt/tsconfig.json"] (WXT last so its module/jsx win) + direct jsx:preserve/jsxImportSource:solid-js + include ["src",".wxt"].
[gotcha] wxt-prepare-types: tsc and type-aware oxlint need WXT's generated .wxt types — run `wxt prepare` first (postinstall and build's first step handle it).
[decision] imports-off: WXT auto-imports are disabled (imports:false) so all APIs are imported explicitly, consistent with verbatimModuleSyntax.

# ── WXT ──

[gotcha] wxt-import-paths: WXT 0.20 — defineConfig from 'wxt' (NOT 'wxt/config'); defineBackground from 'wxt/utils/define-background'; defineContentScript from 'wxt/utils/define-content-script'; createShadowRootUi from 'wxt/utils/content-script-ui/shadow-root'.
[gotcha] firefox-mv2-default: WXT builds Firefox as MV2 by default (.output/firefox-mv2); Chrome/Edge are MV3. Set manifestVersion config to target Firefox MV3.
[data] host-perms: content script + host_permissions target https://dev.azure.com/* and https://*.visualstudio.com/*.

# ── UI (Solid + Fluent) ──

[gotcha] solid-shadow-events: use on:click (not onClick) for Fluent web components — Solid delegates onClick at the document root and misses Shadow DOM (events are retargeted).
[pattern] fluent-register: register a Fluent element via side-effect import '@fluentui/web-components/<name>/define.js', then add a Solid JSX typing for the tag in src/fluent.d.ts.
[pattern] shadow-theme: in content scripts apply the Fluent theme to the shadow container — setTheme(webLightTheme, container) — not just to document.
[data] fluent-versions: @fluentui/web-components pinned 3.0.0-rc.24 (RC), @fluentui/tokens 1.0.0-alpha.23 (alpha) — pre-GA; bump deliberately.

# ── Testing ──

[decision] coverage-scope: coverage thresholds (85/80/85/85) are enforced on src/lib; src/entrypoints and src/app are excluded as DOM/extension glue.
[pattern] test-browser: tests use WxtVitest + fakeBrowser from 'wxt/testing'; fakeBrowser.reset() runs in src/test-setup.ts; console.error/warn are suppressed there.

# ── Releasing ──

[pattern] release-stable-names: release.yml copies the versioned zips to stable names ado-companion-chrome.zip / ado-companion-firefox.zip so the docs /releases/latest/download links stay valid.
[gotcha] manifest-version-semver: manifest versions cannot carry semver pre-release tags (e.g. 1.2.0-beta.0) — use plain x.y.z.

# ── Review feature (PR Markdown review) ──

[decision] surface: native "Review" pivot beside Raw content/Preview on a PR .md view; in-page Shadow DOM island + Word-style comment rail; reusable surface-enhancer framework; PR-only. See @lazy-instructions/review-feature.md.
[decision] anchoring: line/block anchoring for everyone (interoperable with native ADO comments — line-based threadContext is the universal contract); phrase-highlight via thread properties + true char offsets are later additive layers.
[data] ado-pr-dom: Raw/Preview is a bolt-split-button in `.repos-compare-toolbar`; file content sibling `.repos-changes-explorer-splitter`; ADO rendered preview `.markdown-content`; PR page root `.repos-pr-details-page`. (Verified on PR 980523.)
[pattern] feature-progress: Review feature MVP COMPLETE — Phases 1–6 built, tested, verified. Read + write PR comments (create/reply/edit/delete/status, image paste, @mentions) as native ADO threads; settings + host allowlist gate the content host. Future work: lazy-load heavy deps, floating card alignment, more ADO surfaces.
[data] settings: ReviewSettings { enabled, allowlist } in src/lib/settings; isUrlAllowed gates the content host (empty allowlist = run on all matched ADO hosts; else URL host+path must contain an entry). Persisted via WXT storage.defineItem('local:reviewSettings'). The `options` entrypoint registers options_ui; the popup calls browser.runtime.openOptionsPage().
[gotcha] playwright-extension-pages: playwright-cli only navigates http/https/about/data — it CANNOT open chrome-extension:// or edge:// pages and can't click the toolbar action, so popup/options pages can't be auto-driven (verify via build + manual, or pnpm dev:extension). Edge's default profile also allows only one instance — the user's own Edge holding it blocks a persistent-profile launch ("Opening in existing browser session").
[data] native-threads: threads created via createThread with a line-based threadContext are real native ADO PR comments — verified live (resolving one through our UI flipped ADO's own "All comments resolved"). Our write path is interoperable, not a parallel store.
[gotcha] connectiondata-preview: the org `_apis/connectionData` endpoint rejects `api-version=7.1` with HTTP 400 ("must supply -preview flag") — use `7.1-preview`. fetchCurrentUser uses it; guard the currentUser resource with .catch so a failure can't blank the Review render.
[gotcha] mentions-encoding: ADO comment mentions are stored in content as `@<GUID>` (uppercase identity GUID = author.id format). markdown-it/DOMPurify will mangle the `<…>`, so pre-process `@<GUID>`→text before renderMarkdown. The IdentityPicker search (`{org}/_apis/IdentityPicker/Identities`, POST) is same-origin and works; resolving a GUID→name via vssps `_apis/identities` is CORS-blocked from the content script.
[gotcha] extension-reload: a page reload does NOT pick up a rebuilt extension — the browser keeps the version loaded at launch. Relaunch the browser (or reload the extension) after `wxt build` to test changes via playwright-cli.
[pattern] solid-textarea-write: to set a Solid-controlled textarea/select value from outside (tests/automation), assign `.value` then dispatch a bubbling `input`/`change` event so the `on:input`/`on:change` signal updates.
[gotcha] items-raw-text: the ADO items API (file content, `includeContent=true`) returns RAW TEXT, not JSON — read it with `adoGetText`, not `adoGetJson` (items.ts).
[gotcha] theme-vars-pierce-shadow: ADO theme CSS custom properties pierce the Shadow DOM boundary — style the island with `--text-primary-color`, `--background-color`, `--palette-neutral-N` (as "R, G, B" triplets, e.g. `rgba(var(--palette-neutral-8), .5)`), `--communication-foreground`, with literal fallbacks, for native light/dark theming.
[pattern] anchor-line-to-block: markdown-it block tokens carry `.map` → emitted as `data-source-line`/`data-source-end-line` (1-based); `src/lib/markdown/anchor.ts` maps a thread's `threadContext.rightFileStart.line` to the exact or closest-preceding rendered block.

# ── Dev loop / preview ──

[pattern] preview-auth: drive the user's authed Edge via `playwright-cli open --browser msedge --persistent --profile "$HOME/Library/Application Support/Microsoft Edge" <url>`. See the preview-in-devops skill.
[gotcha] edge-cdp-port: --remote-debugging-port is blocked on Edge's default profile; use Playwright's persistent-profile launch (pipe CDP) instead.
[pattern] hmr-loop: `pnpm dev:extension` (WXT) gives hot-reload in a separate `.dev-profile` (sign into ADO once there). Auth there is separate from the user's main Edge profile.
[gotcha] playwright-load-extension: to load the built extension into the user's authed Edge, use a gitignored `playwright-cli.local.json` (browser.launchOptions.channel=msedge + args `--load-extension`/`--disable-extensions-except` with ABSOLUTE paths to `.output/chrome-mv3`) AND pass `--persistent --profile` flags — config `userDataDir` alone yields `<in-memory>`/no auth.
[gotcha] playwright-main-world: playwright-cli `eval`/console only sees the page's main world, not the content-script isolated world — to debug the content script, surface state/errors into the DOM (e.g. read the island's `shadowRoot`).
