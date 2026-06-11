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

## Dependency Catalogs

Common dependency versions live in the `catalog:` section of `pnpm-workspace.yaml`. Projects reference them with `"catalog:"` (runtime) or `"catalog:development"` (dev) instead of hardcoding versions.

When adding a dependency:
1. Add the version to `catalog:` / `catalogs.development` in `pnpm-workspace.yaml`.
2. Add `"package-name": "catalog:"` to the package's `package.json`.
3. Run `pnpm install`.

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

## Commit Conventions

[Conventional Commits](https://www.conventionalcommits.org/):
```
<type>(<optional scope>): <description>
```
Valid types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`.

## Branch Naming

When creating a branch on this repo, use:
```
dev/<alias>/<feature-name>
```
- `<alias>` is the author's short alias (e.g. the user's domain alias, not their full name or email).
- `<feature-name>` is a short, kebab-case description (e.g. `add-dark-theme`, `fix-content-injection`).

**Agents must follow this convention for any branch they create.** Confirm the user's alias if it isn't known from prior context (e.g. `git config user.email`, existing branches) — do not invent one. The base branch is `master`.

## Worktrees for new work

**Always create a worktree for new work** rather than running `git checkout` in the main clone, so multiple agents (and humans) can work simultaneously without stomping on each other's `node_modules`, build output, dev server, or working tree.

```bash
git fetch --prune origin
git worktree add ./worktrees/<feature-name> -b dev/<alias>/<feature-name> origin/master
cd ./worktrees/<feature-name>
pnpm install
```

- The worktree lives in `worktrees/<feature-name>`.
- Each worktree has its own `node_modules` — `pnpm install` after creating it (this also runs `wxt prepare`).
- Clean up when merged: `git worktree remove ./worktrees/<feature-name>` then `git branch -d dev/<alias>/<feature-name>`.

Use `git worktree list` to see active worktrees.

## Changesets & Publishing

Versioning is managed with [@changesets/cli](https://github.com/changesets/changesets). The extension is **not published to npm** — tagged versions ship as **GitHub Release** artifacts (Chrome + Firefox zips), and the docs install page links to the latest release.

**When making changes to `packages/extension/`, on the feature branch before opening the PR:**

1. **Create the changeset** — `pnpm changeset`. Select `ado-companion-extension`, choose the bump type, write a summary.
2. **Consume it immediately** — `pnpm changeset:version`. Bumps `packages/extension/package.json`, appends to its `CHANGELOG.md`, and deletes the `.changeset/*.md` file. NOT optional: an unconsumed `.changeset/*.md` at PR time fails CI.
3. **Commit everything together** — source + version bump + CHANGELOG.

**When changes don't touch `packages/extension/`** (docs, CI, scripts), skip the changeset. CI (`packages/scripts/check-changeset.sh pr`) only requires one when `packages/extension/` is modified.

On push to `master`, `release.yml` detects the new version, builds, zips, and creates the GitHub Release automatically.

## Boy Scouts Rule

Always leave the code better than you found it. When working in a file and you notice a bug, a missing type annotation, a stale comment, an unused import, or any other small improvement, include the fix alongside your current changes as long as it doesn't cause an undue burden on the task. Similarly, when linting or building surfaces warnings unrelated to your task that can be reasonably fixed, address them.

**This rule takes precedence over any generic "don't fix pre-existing issues" guidance.** If you are already modifying a file and encounter fixable issues, fix them in the same change.

## Efficient Context Usage

When reading or inspecting files, prefer tools that extract only what you need over pulling entire files into context.

- Use `rg` (ripgrep) to search for patterns instead of reading whole files.
- Use `jq` to query fields from large JSON files.
- Use `sed`/`head`/`tail` to read specific line ranges.
- Avoid reading entire large files (lock files, generated `.wxt/` output, etc.).
- When you must read a file, prefer targeted view ranges.

## Additional Resources

When you encounter a `@lazy-instructions/...` reference, load it on a need-to-know basis. The prefix maps to `.github/lazy-instructions/`. Do NOT preemptively load everything — lazy-load based on actual need.

- WXT extension specifics (entrypoints, manifest, imports, MV2/MV3, prepare): @lazy-instructions/wxt.md
- App structure (directory layout, content-script injection, popup/background): @lazy-instructions/app-structure.md
- UI components (Fluent Web Components + Solid, theming, Shadow DOM): @lazy-instructions/ui-components.md
- Build system (WXT/Vite, TypeScript, oxlint, vitest, tsconfig composition): @lazy-instructions/build-system.md
- Testing (vitest, WxtVitest, fakeBrowser, coverage scope): @lazy-instructions/testing.md
- Releasing (changesets, GitHub Release artifacts, docs install page, store/AMO plans): @lazy-instructions/releasing.md

## Memory Bank

The file `.github/memory-bank.md` is a grep-searchable knowledge base of gotchas, decisions, issues, patterns, and data facts accumulated across sessions. Tags: `[gotcha]`, `[decision]`, `[issue]`, `[perf]`, `[pattern]`, `[data]`.

**Use it liberally:**
- **Before starting work**: search it for your topic (`grep -i 'fluent' .github/memory-bank.md`, `grep '\[gotcha\]' .github/memory-bank.md`).
- **During work**: when you discover a non-obvious fact or workaround, add it immediately.
- **After resolving an issue**: document what went wrong and how you fixed it as an `[issue]` entry.

See the `memory-bank` skill (`.github/skills/memory-bank/SKILL.md`) for the exact format. Keep entries factual, concise, and verifiable.
