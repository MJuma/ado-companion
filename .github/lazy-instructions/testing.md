# Testing

Vitest 4 with the jsdom environment and v8 coverage. Config: `packages/extension/vitest.config.ts`.

## Setup

- The `WxtVitest` plugin (`wxt/testing`) applies the WXT Vite config (modules, aliases) to tests.
- `fakeBrowser` (`wxt/testing`) provides an in-memory mock of the `browser`/`chrome` extension APIs. It is reset before every test in `src/test-setup.ts`.
- `src/test-setup.ts` also suppresses `console.error`/`console.warn` per test — keep test runs free of stderr.
- `globals: false` — import `describe`/`it`/`expect`/`vi` from `vitest` explicitly. Keep `import` statements above any `vi.mock()` calls.

## What to test

- **Pure logic in `src/lib/`** — this is where coverage is enforced (85/80/85/85). Example: `parseAdoContext` in `ado.ts` is fully unit-tested via `ado.spec.ts`.
- Keep decision/parsing logic out of entrypoints and components so it stays testable.

## What is NOT unit-tested

- `src/entrypoints/` and `src/app/` are excluded from coverage. They are DOM/extension glue (Shadow DOM mounting, Fluent custom elements) that don't run meaningfully in jsdom. Validate these via `pnpm build` and manual testing (`pnpm dev:extension`).
- Do not import Fluent component `define.js` modules into specs — custom-element registration is unnecessary for logic tests.

## Running

```bash
pnpm test                                   # all packages
pnpm --filter ado-companion-extension test  # extension only
```

If you add a new module under `src/lib/`, add a co-located `.spec.ts` and ensure coverage stays at/above thresholds.
