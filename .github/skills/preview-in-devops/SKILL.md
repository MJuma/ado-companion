---
name: preview-in-devops
description: Load Azure DevOps with the user's auth via playwright-cli, preview the live extension, and inspect ADO's DOM
---

# Preview the extension on Azure DevOps

Use this skill to see ADO Companion running on a real Azure DevOps PR with the
user's sign-in, to iterate on changes, and to inspect ADO's own DOM (e.g. to
find selectors for native injection points).

Driver: **`playwright-cli`** (the `@playwright/cli` binary) — **not** raw
Playwright. It's installed globally.

## View ADO with your auth (primary)

Your Edge is already signed into Azure DevOps, so drive **that** profile directly
— no separate sign-in. (Edge usually isn't running standalone, only Teams'
WebView2; if standalone Edge is open, close it first to avoid a profile lock.)

```bash
playwright-cli open --browser msedge --headed --persistent \
  --profile "$HOME/Library/Application Support/Microsoft Edge" "<PR .md URL>"
```

Then drive/inspect (subsequent commands attach to the same session):

```bash
playwright-cli goto "<url>"
playwright-cli eval "() => document.querySelector('.repos-compare-toolbar')?.outerHTML"
playwright-cli screenshot     # saved under .playwright-cli/ (gitignored) — open with the view tool
playwright-cli console
playwright-cli close-all       # when done
```

Notes:
- **Don't** rely on `--remote-debugging-port` for this profile — modern Edge
  blocks CDP-over-port on the default profile. The `--persistent --profile`
  launch uses Playwright's pipe CDP, which works.
- Validated: this loads authed PRs (e.g. PR 980523 in `powerbi-specs`).

## See the extension's own UI (with auth)

playwright-cli's browser doesn't auto-load our unpacked extension. To preview the
extension itself on top of your auth, build it, then load it via a **gitignored**
local config (Chrome needs absolute `--load-extension` paths):

```bash
pnpm build   # writes packages/extension/.output/chrome-mv3
```

`packages/extension/playwright-cli.local.json` (gitignored):
```json
{
  "browser": {
    "launchOptions": {
      "channel": "msedge",
      "args": [
        "--disable-extensions-except=<ABS>/packages/extension/.output/chrome-mv3",
        "--load-extension=<ABS>/packages/extension/.output/chrome-mv3"
      ]
    }
  }
}
```
```bash
playwright-cli --config packages/extension/playwright-cli.local.json open --headed --persistent \
  --profile "$HOME/Library/Application Support/Microsoft Edge" "<PR URL>"
```
After each rebuild: `playwright-cli reload`.

## Live coding loop (HMR)

For fast edit→see cycles while building UI, `pnpm dev:extension` launches Chrome
with hot reload, a persistent `packages/extension/.dev-profile`, and a debug port.
Sign into ADO once in that window (separate from your Edge profile); edits then
rebuild and reload automatically. Don't start/stop it for the user — ask if it
isn't up.

## Inspect ADO's DOM (native injection anchors)

Use `eval` to read live markup. Verified anchors for the Review feature:
- `.repos-compare-toolbar` — per-file toolbar; inject the **Review** control here,
  beside the Raw content/Preview `bolt-split-button`.
- `.repos-changes-explorer-splitter` — file content area; mount the island here.
- `.markdown-content` — ADO's rendered preview; match its styling for a native look.

```bash
playwright-cli eval "() => document.querySelector('.repos-compare-toolbar')?.outerHTML.slice(0,1500)"
```

## Safety

This drives a real browser signed in as the user.
- Only navigate Azure DevOps; do **not** approve/abandon PRs or post comments
  unless explicitly asked.
- Prefer `tab-new` over hijacking the user's active tab.
- Treat `.dev-profile`, `playwright-cli.local.json`, and any `*.auth.json` as
  secrets — never commit them (already gitignored).

## Cheat-sheet

| Need | Command |
|------|---------|
| List tabs | `playwright-cli tab-list` |
| New tab | `playwright-cli tab-new "<url>"` |
| Navigate | `playwright-cli goto "<url>"` |
| Reload after a build/HMR | `playwright-cli reload` |
| Screenshot | `playwright-cli screenshot` |
| Read DOM | `playwright-cli eval "() => …outerHTML"` |
| Element refs (click/fill) | `playwright-cli snapshot` |
| Console logs | `playwright-cli console` |
| Network | `playwright-cli network` |
