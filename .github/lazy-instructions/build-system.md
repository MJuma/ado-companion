# Build System

## TypeScript

- Shared base config: `tsconfig.base.json` at the repo root (strict, ES2022, `bundler` resolution, `verbatimModuleSyntax`, `isolatedModules`, `noUnusedLocals/Parameters`, `noPropertyAccessFromIndexSignature`).
- The extension's `tsconfig.json` **composes three layers** via an `extends` array:
  ```jsonc
  { "extends": ["../../tsconfig.base.json", "./.wxt/tsconfig.json"], ... }
  ```
  Order matters: WXT's generated config is last so its module/jsx settings win. The file then sets `jsx: "preserve"` + `jsxImportSource: "solid-js"` directly (these always win over `extends`), and `include: ["src", ".wxt"]` so WXT's ambient types are picked up.
- TypeScript 6 — implicit `any` and many sharp edges are errors.
- Build pattern: `wxt prepare && tsc --noEmit && wxt build` (typecheck, then bundle).

## Vite

- Vite is managed by **WXT** — there is no standalone `vite.config.ts`. Configure the build through `wxt.config.ts`.
- SolidJS JSX is compiled by `vite-plugin-solid`, wired in via `@wxt-dev/module-solid`.
- WXT generates `.wxt/` types that `tsc`/oxlint need — see @lazy-instructions/wxt.md.

## Linting (oxlint)

- Config: `oxlintrc.json` (repo root). No React overlay — the UI is Solid.
- Lint script (per package): `oxlint -c ../../oxlintrc.json --tsconfig tsconfig.lint.json --type-aware src/`.
- Type-aware rules require `oxlint-tsgolint` (a dev dependency) and a valid `tsconfig.lint.json` — which in turn needs `.wxt/` generated (run `wxt prepare` first).

## Testing (vitest)

- vitest 4 with jsdom. See @lazy-instructions/testing.md for patterns.
- Coverage thresholds (85/80/85/85) are enforced and scoped to `src/lib`; `src/entrypoints/` and `src/app/` are excluded. Never lower the thresholds — write tests instead.

## CI ordering gotcha

Both `tsc` and type-aware oxlint depend on WXT's generated `.wxt/` types. `pnpm install` runs `wxt prepare` via `postinstall`, and `pnpm build` runs it again first — so in CI, install-then-build is sufficient. If you run `tsc`/`lint` in isolation on a fresh tree, run `wxt prepare` first.
