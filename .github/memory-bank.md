# Memory Bank

A grep-searchable knowledge base of gotchas, decisions, issues, patterns, and data facts for ADO Companion, accumulated across sessions. Shared by all agents.

**Format:** one line per entry — `[tag] topic: description`. Use kebab-case topics. Be concise, specific, and factual. See `.github/skills/memory-bank/SKILL.md` for the full workflow.

**Tags:** `[gotcha]` (will bite you), `[decision]` (deliberate choice + rationale), `[issue]` (bug + fix), `[perf]` (perf insight), `[pattern]` (convention to follow), `[data]` (fact about deps/data).

Search examples:
```bash
grep '\[gotcha\]' .github/memory-bank.md
grep -i 'fluent' .github/memory-bank.md
grep -i 'wxt' .github/memory-bank.md
```

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
