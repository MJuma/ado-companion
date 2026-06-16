# Releasing

The extension is **not published to npm**. Releases ship as **GitHub Release artifacts** (Chrome zip + Mozilla-signed Firefox `.xpi`), and the landing page (`site/`, on GitHub Pages) links to the latest release.

## Versioning (changesets)

1. On your feature branch, after changing `packages/extension/`: `pnpm changeset` → select `ado-companion-extension`, pick bump type, write a summary.
2. `pnpm changeset:version` → bumps `packages/extension/package.json`, updates `packages/extension/CHANGELOG.md`, deletes the changeset file.
3. Commit source + version bump + CHANGELOG together. CI (`check-changeset.sh pr`) fails if `packages/extension/` changed without a consumed changeset.

> Manifest versions cannot carry semver pre-release tags (e.g. `1.2.0-beta.0`). Stick to plain `x.y.z`.

## Release flow (automated)

`.github/workflows/release.yml` runs on push to `master`:
1. Reads the extension version; if a tag `v<version>` already exists, it skips (idempotent).
2. Otherwise: `pnpm build` → `pnpm lint` → `pnpm test`.
3. `pnpm zip` + `pnpm zip:firefox`, then copies the versioned chrome zip to the **stable name** `ado-companion-chrome.zip`.
4. **Signs the Firefox build** (`pnpm sign:firefox` → `web-ext sign --channel unlisted`) into `ado-companion-firefox.xpi`, when the AMO secrets are present (else falls back to the unsigned `ado-companion-firefox.zip`). Also generates `updates.json` (the Firefox auto-update manifest) next to it.
5. Extracts the matching section from `packages/extension/CHANGELOG.md` as release notes (passed to `gh` via an **env var**, never inlined into the shell — notes contain backticks).
6. `gh release create v<version>` attaching the chrome zip + the Firefox `.xpi` + `updates.json` (or the zip fallback).

The stable asset names are what the landing page links to (`/releases/latest/download/ado-companion-chrome.zip`, `…-firefox.xpi`). If you rename assets, update `site/index.html`.

## Firefox signing (self-distribution)

Release Firefox only installs Mozilla-signed add-ons (an unsigned one errors with "appears to be corrupt"). So the release signs an **unlisted** (self-distribution) `.xpi` via `web-ext sign`:

- The Firefox manifest carries a stable add-on ID — `browser_specific_settings.gecko.id` = `ado-companion@mjuma.github.io` — emitted Firefox-only by the `manifest: ({ browser }) => …` function in `wxt.config.ts`.
- `packages/extension` has a `sign:firefox` script (`wxt build -b firefox && web-ext sign --source-dir .output/firefox-mv2 --channel unlisted --artifacts-dir .output`). `web-ext` reads `WEB_EXT_API_KEY` / `WEB_EXT_API_SECRET` from the env.
- The release job maps repo secrets **`AMO_JWT_ISSUER`** → `WEB_EXT_API_KEY` and **`AMO_JWT_SECRET`** → `WEB_EXT_API_SECRET`, and only signs when `AMO_JWT_ISSUER` is set.

Create the credentials at **addons.mozilla.org → Developer Hub → Manage API Keys**, then add them as repository secrets (`AMO_JWT_ISSUER`, `AMO_JWT_SECRET`). The first signed version registers the unlisted add-on on AMO under that ID.

## Firefox auto-update (self-distribution)

Installed `.xpi`s update themselves without re-downloading:

- The Firefox manifest has `browser_specific_settings.gecko.update_url` → `https://github.com/MJuma/ado-companion/releases/latest/download/updates.json`.
- The release job generates `updates.json` (add-on id → `{version, update_link to the release .xpi, update_hash sha256}`) and uploads it as a release asset. `latest/download/updates.json` always resolves to the newest release's copy, so Firefox sees the current version and installs the signed `.xpi`.
- **Bootstrapping:** auto-update only works from the first version that ships `update_url` (added in the manifest after v0.6.2). Earlier installs need one manual update; automatic thereafter.

> **Chrome/Edge can't auto-update off-store.** Chrome blocks installing self-hosted `.crx` files for normal users, and "Load unpacked" never auto-updates. The only path to Chrome/Edge auto-update is the Chrome Web Store / Edge Add-ons (the store handles updates).

## Landing page (site/)

A static `site/index.html` + `site/styles.css` (no build step) deployed to GitHub Pages by `.github/workflows/deploy-site.yml` (`upload-pages-artifact` → `deploy-pages`). Per-browser download buttons point at the stable release asset names (Firefox → the signed `.xpi`). Preview locally with `python3 -m http.server -d site`.

## Not yet wired (planned)

- **Store submission** (`wxt submit`) to Chrome Web Store, Edge Add-ons, Firefox AMO (listed) — needs store accounts + API secrets. This is also the only way to get **Chrome/Edge auto-update**.
