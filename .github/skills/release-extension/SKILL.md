---
name: release-extension
description: Cut a new ADO Companion release (version bump -> GitHub Release artifacts)
---

# Release the Extension

ADO Companion ships as **GitHub Release** artifacts (Chrome + Firefox zips). Releases are created automatically on push to `master`. Read @lazy-instructions/releasing.md.

## Steps

### 1. Ensure a version bump exists

On the feature branch, if `packages/extension/` changed:

```bash
pnpm changeset            # select ado-companion-extension, pick bump type, write summary
pnpm changeset:version    # bumps package.json + CHANGELOG, deletes the changeset file
```

Commit the source change + version bump + CHANGELOG together. Use plain `x.y.z` (no pre-release tags — manifests reject them).

### 2. Verify locally

```bash
pnpm build && pnpm lint && pnpm test
pnpm zip && pnpm zip:firefox
ls packages/extension/.output/*.zip
```

### 3. Merge to master

Open a PR. CI runs build/lint/test and `check-changeset.sh pr` (which requires the consumed changeset). After merge, `release.yml` on `master`:
- skips if tag `v<version>` already exists;
- otherwise builds, zips, copies to stable names (`ado-companion-chrome.zip`, `ado-companion-firefox.zip`), extracts CHANGELOG notes, and runs `gh release create v<version>` with both zips.

### 4. Confirm

- Check the new GitHub Release has both stable-named zips attached.
- The docs install page links resolve (`/releases/latest/download/ado-companion-chrome.zip`, `…-firefox.zip`).

## Guidelines

- If you change asset names in `release.yml`, update `docs/guide/install.md` to match.
- Store submission (Chrome Web Store / Edge Add-ons / Firefox AMO) and Firefox AMO signing are not wired yet — see the "Not yet wired" section of @lazy-instructions/releasing.md.
- Record any release quirk as an `[issue]`/`[gotcha]` in the memory bank.
