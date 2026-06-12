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
    │   ├── content.tsx         # content host: runs surface enhancers, gated by settings
    │   ├── popup/              # toolbar popup (index.html + main.tsx → mounts <Popup>)
    │   └── options/            # options_ui page (index.html + main.tsx → mounts <Options>)
    ├── app/                    # Solid UI (DOM glue — excluded from coverage; build + manual verified)
    │   ├── Popup.tsx, popup.css
    │   ├── options/            # Options.tsx + options.css
    │   └── review/             # Review feature UI:
    │       ├── review-enhancer.tsx   # SurfaceEnhancer: injects "Review" pivot + mounts island
    │       ├── ReviewView.tsx        # two-pane rendered doc + comment rail
    │       ├── CommentCard/CommentItem/CommentComposer.tsx
    │       └── review-styles.ts      # Shadow-DOM CSS (uses ADO theme vars)
    ├── lib/                    # pure, framework-free logic (tested; coverage enforced)
    │   ├── ado/                # ADO PR REST + data layer (pr, http, threads, iterations,
    │   │                        #   items, attachments, identities, pr-types)
    │   ├── markdown/           # markdown-it source-line render + DOMPurify + links + anchoring
    │   ├── enhancers/          # surface-enhancer framework (reconcile, types)
    │   ├── review/             # composer editor helpers + @mention logic
    │   └── settings/           # ReviewSettings + isUrlAllowed (allowlist) + storage load/save/watch
    ├── fluent.d.ts             # Solid JSX typings for Fluent custom elements
    ├── css.d.ts                # ambient declaration for side-effect CSS imports
    └── test-setup.ts           # suppresses console, resets fakeBrowser
```

## Content-script injection (surface-enhancer framework)

`src/entrypoints/content.tsx` is a generic **host**, not feature-specific:

1. Holds a list of `SurfaceEnhancer`s (currently `createReviewEnhancer()`).
2. Loads `ReviewSettings` and `watch`es for changes; a debounced `MutationObserver`
   on `<body>` drives a reconcile `tick()` (ADO is an SPA that re-renders constantly).
3. Each tick: drop enhancers whose mount node ADO removed (`findStale`); if the URL
   isn't allowed (`isUrlAllowed` — disabled or an allowlist miss) unmount everything
   and stop; otherwise `planReconcile` decides what to mount/unmount for the URL.
4. To mount, the host finds the enhancer's `anchor` element and calls
   `mount(key, anchor)`, which returns `{ marker, cleanup }`.

A `SurfaceEnhancer` (`src/lib/enhancers/types.ts`) declares `id`, `anchor` (CSS
selector), `matches(url)`, `key(url)` (re-mount when it changes), and `mount()`.
The Review enhancer injects the "Review" pivot into `.repos-compare-toolbar` and
mounts a Shadow-DOM island rendering `<ReviewView>` (apply the Fluent theme to the
container, then `render(() => <Component />, container)`).

Keep host/injection glue thin; put matching/data/anchoring logic in `src/lib/` so it is unit-tested.

## Adding a new ADO enhancement

- Logic (URL matching, data shaping, anchoring) → `src/lib/` with a co-located `.spec.ts`.
- A new `SurfaceEnhancer` (factory in `src/app/<feature>/`) registered in `content.tsx`.
- Injected UI → Solid components in `src/app/<feature>/`, mounted by the enhancer.
- New full-page surface (e.g. the options page) → a new entrypoint under `src/entrypoints/`.

See the `add-content-feature` skill and @lazy-instructions/ui-components.md.
