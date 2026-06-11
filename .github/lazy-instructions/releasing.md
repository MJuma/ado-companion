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
3. `pnpm zip` + `pnpm zip:firefox`, then copies the versioned zips to **stable names** `ado-companion-chrome.zip` / `ado-companion-firefox.zip`.
4. Extracts the matching section from `packages/extension/CHANGELOG.md` as release notes.
5. `gh release create v<version>` with both zips attached.

The stable asset names are what the docs install page links to (`/releases/latest/download/ado-companion-chrome.zip`, `…-firefox.zip`). If you rename assets, update `docs/guide/install.md`.

## Docs install page

The per-browser install steps live in `docs/guide/install.md`; its download buttons point at the stable asset names above.

## Not yet wired (planned)

- **Store submission** (`wxt submit`) to Chrome Web Store, Edge Add-ons, Firefox AMO — needs store accounts + API secrets.
- **Firefox AMO signing** for a permanent one-click `.xpi` install — needs AMO JWT issuer/secret. Until then Firefox uses the temporary-add-on flow.
