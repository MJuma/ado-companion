# ADO Companion

A cross-browser extension (Chrome, Edge, Firefox) that adds extra functionality to **Azure DevOps** (`dev.azure.com` and legacy `*.visualstudio.com`). It runs as a content script that injects UI into ADO pages, plus a popup and background service worker.

Built with **WXT** (Manifest V3 tooling), **SolidJS**, and **Fluent UI Web Components**. Uses **pnpm workspaces** with **pnpm 10**.

## Repository Structure

| Path | Package | Purpose |
|------|---------|---------|
| `packages/extension` | `ado-companion-extension` | The WXT extension — entrypoints (content/popup/background), Solid UI, pure logic |
| `packages/scripts` | — | Repo automation (`check-changeset.sh`) |
| `docs/` | — | VitePress documentation + install site |

Dependency versions are centralized in the `catalog:` / `catalog:development` sections of `pnpm-workspace.yaml`.

## Commands

```bash
# Develop
pnpm dev:extension            # WXT dev (Chrome) with HMR
pnpm dev:firefox              # WXT dev (Firefox)

# Verify
pnpm build                    # Build all (extension: wxt prepare && tsc --noEmit && wxt build)
pnpm lint                     # oxlint (type-aware) all packages
pnpm test                     # vitest all packages

# Package (release artifacts)
pnpm zip                      # Chrome/Edge zip  -> packages/extension/.output/
pnpm zip:firefox              # Firefox zip      -> packages/extension/.output/

# Docs
pnpm docs:dev                 # Preview the docs/install site

# Versioning & changelog
pnpm changeset                # Create a changeset for your PR
pnpm changeset:version        # Bump version + regenerate CHANGELOG (run before merging)
```

Do NOT use `npm install` or `npx` directly. Use `pnpm install` and `pnpm run <script>` (or the root shortcuts above).

The WXT dev server (`pnpm dev:extension`) is managed by the user. If you need it started or restarted, ask the user — do not start or stop it yourself. **Trust the build, not the dev server:** run `pnpm build` (which runs `tsc --noEmit`) to verify correctness.

## Adding a dependency

1. Add the version to `catalog:` / `catalogs.development` in `pnpm-workspace.yaml`.
2. Add `"package-name": "catalog:"` to the package's `package.json`.
3. `pnpm install`.

## Linting and Formatting

This repo uses **oxlint** (not ESLint/Prettier). Config is at the repo root:
- `oxlintrc.json` — base rules for all projects (type-aware via `--type-aware`).

There is no React overlay — the UI is **SolidJS**, and oxlint has no Solid plugin. Rely on the base rules plus strict TypeScript.

## Code Style

- **4-space indentation** everywhere (enforced by `.editorconfig`).
- **Always use curly braces** for if/else/for/while — no single-line conditionals.
- Imports ordered: (1) external → (2) relative — separated by a blank line.
- Test files: `.spec.ts` / `.spec.tsx`, co-located with source. Mocks: `*.mock.ts`.
- **Pure logic in `*.logic.ts` / `src/lib/` files** for independent testability — keep DOM/extension glue thin.
- Sub-components: extract identifiable sub-components to sibling files in the same directory.
- `verbatimModuleSyntax` is on — use `import type` for type-only imports.

## Testing & Coverage Thresholds

Vitest with jsdom and v8 coverage. Thresholds in `packages/extension/vitest.config.ts`:

| Metric | Threshold |
|--------|-----------|
| Statements | 85% |
| Branches | 80% |
| Functions | 85% |
| Lines | 85% |

**These thresholds are sacred — never lower them.** Coverage is scoped to pure logic; `src/entrypoints/` and `src/app/` (DOM/browser glue) are excluded. Put testable logic in `src/lib/` and test it.

Key patterns:
- The `WxtVitest` plugin (`wxt/testing`) wires WXT config into tests; `fakeBrowser` (also `wxt/testing`) mocks the extension APIs and is reset in `src/test-setup.ts`.
- `console.error`/`console.warn` are suppressed per-test in `test-setup.ts`; keep test runs free of stderr noise.
- Keep `import` statements above any `vi.mock()` calls.

## Git workflow

- Base branch: `master`.
- Branch names: `dev/<alias>/<feature-name>` (kebab-case). Confirm the user's alias from context (`git config user.email`, existing branches) — don't invent one.
- Do new work in a worktree so parallel agents don't collide:
  ```bash
  git worktree add ./worktrees/<feature-name> -b dev/<alias>/<feature-name> origin/master
  cd ./worktrees/<feature-name> && pnpm install   # pnpm install runs wxt prepare
  ```
- Commit messages follow Conventional Commits (match the existing `git log`).

## Changesets & Publishing

Versioning is managed with [@changesets/cli](https://github.com/changesets/changesets). The extension is **not published to npm** — tagged versions ship as **GitHub Release** artifacts (Chrome + Firefox zips), and the docs install page links to the latest release.

**When making changes to `packages/extension/`, on the feature branch before opening the PR:**

1. **Create the changeset** — `pnpm changeset`. Select `ado-companion-extension`, choose the bump type, write a summary.
2. **Consume it immediately** — `pnpm changeset:version`. Bumps `packages/extension/package.json`, appends to its `CHANGELOG.md`, and deletes the `.changeset/*.md` file. NOT optional: an unconsumed `.changeset/*.md` at PR time fails CI.
3. **Commit everything together** — source + version bump + CHANGELOG.

**When changes don't touch `packages/extension/`** (docs, CI, scripts), skip the changeset. CI (`packages/scripts/check-changeset.sh pr`) only requires one when `packages/extension/` is modified.

On push to `master`, `release.yml` detects the new version, builds, zips, and creates the GitHub Release automatically.

## Lazy-loaded docs

Load `@lazy-instructions/<file>` (→ `.github/lazy-instructions/`) only when relevant to the task:

- `@lazy-instructions/review-feature.md` — **current feature**: PR Markdown Review (status, decisions, ADO DOM anchors)
- `@lazy-instructions/wxt.md` — WXT config, import paths, MV2/MV3, `wxt prepare`, build/zip outputs
- `@lazy-instructions/app-structure.md` — directory layout, content-script injection, where to add things
- `@lazy-instructions/ui-components.md` — Fluent Web Components + Solid, JSX typings, `on:click`, theming
- `@lazy-instructions/build-system.md` — tsconfig composition, oxlint command, CI ordering
- `@lazy-instructions/testing.md` — vitest + WxtVitest + fakeBrowser, coverage scope
- `@lazy-instructions/releasing.md` — changeset flow, release.yml, install-page assets

## Skills & previewing

Custom skills in `.github/skills/`: `memory-bank`, `add-fluent-component`,
`add-content-feature`, `release-extension`, and **`preview-in-devops`** — drive the
user's already-authenticated **Edge** profile via `playwright-cli` to view and
inspect Azure DevOps (the user prefers reusing their Edge auth). For live edits,
`pnpm dev:extension` gives hot reload.

## Memory Bank

Before starting, grep `.github/memory-bank.md` for repo-specific facts (tags: `[gotcha]` `[decision]` `[issue]` `[perf]` `[pattern]` `[data]`). Add to it when you discover a non-obvious fact. Format: see the `memory-bank` skill.
