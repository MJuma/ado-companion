# Testing

Vitest 4 with the jsdom environment and v8 coverage. Config: `packages/extension/vitest.config.ts`.

## Setup

- The `WxtVitest` plugin (`wxt/testing`) applies the WXT Vite config (modules, aliases) to tests.
- `vite-plugin-solid` is added to `vitest.config.ts` (with `resolve.conditions: ['development', 'browser']`) so `.spec.tsx` files compile Solid JSX. Without it, JSX in specs fails to transform.
- `fakeBrowser` (`wxt/testing`) provides an in-memory mock of the `browser`/`chrome` extension APIs. It is reset before every test in `src/test-setup.ts`.
- `src/test-setup.ts` also suppresses `console.error`/`console.warn` per test — keep test runs free of stderr.
- `globals: false` — import `describe`/`it`/`expect`/`vi` from `vitest` explicitly. Keep `import` statements above any `vi.mock()` calls.

## What to test

- **Pure logic in `src/lib/`** — this is where coverage is enforced (85/80/85/85). Example: `parseAdoContext` in `ado.ts` is fully unit-tested via `ado.spec.ts`.
- Keep decision/parsing logic out of entrypoints and components so it stays testable.

## Solid component tests (`src/app/`)

`src/app/` is **excluded from coverage**, so component tests are additive (they don't move the thresholds) — but they are worth writing for interaction logic. Use `@solidjs/testing-library`:

- `render(() => <Component … />)`, then assert via `screen.getBy*`/`container.querySelector` and drive with `fireEvent`/`waitFor`.
- Call `cleanup()` in an explicit `afterEach` (no global auto-cleanup because `globals: false`).
- **oxlint `unbound-method`**: do NOT destructure query helpers (`const { getByText } = render(…)`) or reference mocked module members in `expect()` (`expect(threads.foo)`). Instead use `screen.getByText(…)` and import the mocked functions by name (`import { foo } from '…'; expect(foo)…`).
- Mock REST modules (`../../lib/ado/threads`, `attachments`, `identities`) with `vi.mock`; let pure libs (markdown render, mentions, time, editor) run for real.
- Shared fixtures live in `src/app/review/fixtures.ts` (test-only; tree-shaken from the build).
- Examples: `CommentItem.spec.tsx`, `CommentCard.spec.tsx`, `CommentComposer.spec.tsx`.

## What is NOT unit-tested

- `src/entrypoints/` is excluded from coverage and not unit-tested — it is Shadow DOM mounting / Fluent custom-element glue that doesn't run meaningfully in jsdom. Validate via `pnpm build` and manual testing (`pnpm dev:extension`).
- `ReviewView.tsx` and `review-enhancer.tsx` (heavy DOM measurement, ResizeObserver, ADO DOM injection) are validated via build + live preview, not jsdom.
- Do not import Fluent component `define.js` modules into specs — custom-element registration is unnecessary for logic tests.

## Running

```bash
pnpm test                                   # all packages
pnpm --filter ado-companion-extension test  # extension only
```

If you add a new module under `src/lib/`, add a co-located `.spec.ts` and ensure coverage stays at/above thresholds.
