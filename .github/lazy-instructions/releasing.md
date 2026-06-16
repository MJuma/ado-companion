# Releasing

The extension is **not published to npm**. Releases ship as **GitHub Release artifacts** (per-browser zips), and the docs install page links to the latest release.

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
4. **Signs the Firefox build** (`pnpm sign:firefox` → `web-ext sign --channel unlisted`) into `ado-companion-firefox.xpi`, when the AMO secrets are present (else falls back to the unsigned `ado-companion-firefox.zip`).
5. Extracts the matching section from `packages/extension/CHANGELOG.md` as release notes.
6. `gh release create v<version>` attaching the chrome zip + the Firefox `.xpi` (or zip fallback).

The stable asset names are what the docs install page links to (`/releases/latest/download/ado-companion-chrome.zip`, `…-firefox.xpi`). If you rename assets, update `docs/guide/install.md`.

## Firefox signing (self-distribution)

Release Firefox only installs Mozilla-signed add-ons (an unsigned one errors with "appears to be corrupt"). So the release signs an **unlisted** (self-distribution) `.xpi` via `web-ext sign`:

- The Firefox manifest carries a stable add-on ID — `browser_specific_settings.gecko.id` = `ado-companion@mjuma.github.io` — emitted Firefox-only by the `manifest: ({ browser }) => …` function in `wxt.config.ts`.
- `packages/extension` has a `sign:firefox` script (`wxt build -b firefox && web-ext sign --source-dir .output/firefox-mv2 --channel unlisted --artifacts-dir .output`). `web-ext` reads `WEB_EXT_API_KEY` / `WEB_EXT_API_SECRET` from the env.
- The release job maps repo secrets **`AMO_JWT_ISSUER`** → `WEB_EXT_API_KEY` and **`AMO_JWT_SECRET`** → `WEB_EXT_API_SECRET`, and only signs when `AMO_JWT_ISSUER` is set.

Create the credentials at **addons.mozilla.org → Developer Hub → Manage API Keys**, then add them as repository secrets (`AMO_JWT_ISSUER`, `AMO_JWT_SECRET`). The first signed version registers the unlisted add-on on AMO under that ID.

## Docs install page

The per-browser install steps live in `docs/guide/install.md`; its download buttons point at the stable asset names above (Firefox links to the signed `.xpi`).

## Not yet wired (planned)

- **Store submission** (`wxt submit`) to Chrome Web Store, Edge Add-ons, Firefox AMO (listed) — needs store accounts + API secrets.
- **Firefox auto-update** (`gecko.update_url` + a hosted `updates.json`) so installed `.xpi`s update themselves — currently users re-download the latest `.xpi`.
