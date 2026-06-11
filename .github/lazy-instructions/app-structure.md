# App Structure

The extension lives in `packages/extension/`. Source is under `src/` (`srcDir: 'src'`).

## Directory Layout

```
packages/extension/
├── wxt.config.ts              # WXT config (manifest, srcDir, modules, imports:false)
├── vitest.config.ts           # vitest (jsdom, v8, thresholds, WxtVitest)
├── tsconfig.json              # extends base + .wxt + Solid JSX
├── tsconfig.lint.json         # type-aware lint target
├── tsconfig.spec.json         # spec typecheck
└── src/
    ├── entrypoints/
    │   ├── background.ts       # background service worker
    │   ├── content.tsx         # content script: injects UI into ADO via Shadow DOM
    │   └── popup/
    │       ├── index.html      # popup HTML entry
    │       └── main.tsx        # mounts <Popup>
    ├── app/                    # Solid UI components (DOM glue — excluded from coverage)
    │   ├── Popup.tsx
    │   └── InjectedWidget.tsx
    ├── lib/                    # pure, framework-free logic (tested; coverage enforced)
    │   ├── ado.ts              # parseAdoContext(url) -> { isAzureDevOps, organization, project }
    │   └── ado.spec.ts
    ├── fluent.d.ts             # Solid JSX typings for Fluent custom elements
    └── test-setup.ts           # suppresses console, resets fakeBrowser
```

## Content-script injection pattern

`src/entrypoints/content.tsx`:
1. `parseAdoContext(window.location.href)` to read org/project; bail early if not an ADO page.
2. `createShadowRootUi(ctx, { name, position, anchor, onMount, onRemove })` to create an isolated Shadow DOM container (`cssInjectionMode: 'ui'` injects the content CSS into the shadow root).
3. In `onMount(container)`: apply the Fluent theme to the container (`setTheme(theme, container)`), then `render(() => <Component />, container)` (Solid). Return the dispose function.
4. `ui.mount()`.

Keep injection logic thin; put parsing/decision logic in `src/lib/` so it can be unit-tested.

## Adding a new ADO enhancement

- New page logic (parsing, matching, data shaping) → `src/lib/` with a co-located `.spec.ts`.
- New injected UI → a Solid component in `src/app/`, mounted from `content.tsx`.
- New surface (e.g. an options page) → a new entrypoint under `src/entrypoints/`.

See @lazy-instructions/ui-components.md for the Fluent + Solid UI details.
