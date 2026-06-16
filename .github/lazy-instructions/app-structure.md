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
    │   ├── review/             # PR Markdown Review feature UI:
    │   │   ├── review-enhancer.tsx   # SurfaceEnhancer: injects "Review" pivot + mounts island
    │   │   ├── ReviewView.tsx        # two-pane rendered doc + comment rail
    │   │   ├── CommentCard/CommentItem/CommentComposer.tsx, Icons.tsx, status.ts
    │   │   ├── mermaid.ts, syntax.ts # lazy-loaded vendored mermaid + highlighter (themed, sanitized)
    │   │   └── review-styles.ts      # Shadow-DOM CSS (uses ADO theme vars)
    │   ├── timeline/           # PR Timeline Filter feature UI:
    │   │   ├── timeline-enhancer.tsx # SurfaceEnhancer: injects filter tabs on the Overview feed
    │   │   ├── TimelineFilterTabs.tsx# Solid tab strip (All/Actions/Commits/Comments/System)
    │   │   └── timeline-styles.ts    # Shadow-DOM CSS (ADO pivot-style tabs)
    │   └── pipelines/          # PR Pipelines Tab feature UI:
    │       ├── pipelines-enhancer.tsx    # SurfaceEnhancer: injects "Pipelines" tab + content swap
    │       ├── pr-tab-filter-enhancer.tsx# SurfaceEnhancer: hides PR tabs by label (hiddenPrTabs)
    │       ├── PipelinesView.tsx, StatusDot.tsx
    │       └── pipelines-styles.ts       # Shadow-DOM CSS (stage/job status circles)
    ├── lib/                    # pure, framework-free logic (tested; coverage enforced)
    │   ├── ado/                # ADO PR REST + data layer (pr, http, threads, iterations,
    │   │                        #   items, attachments, identities, pr-types, pipelines)
    │   ├── markdown/           # markdown-it source-line render + DOMPurify + links + images +
    │   │                        #   anchoring + highlight (phrase→source range) + directives
    │   ├── enhancers/          # surface-enhancer framework (reconcile, types)
    │   ├── review/             # composer editor helpers + @mention logic + theme + time
    │   ├── timeline/           # classify.ts: row categorization + bot/human-by-timestamp map
    │   ├── pipelines/          # timeline.ts (stage/job parser) + tab-filter.ts (hide matcher)
    │   └── settings/           # CompanionSettings model + featureEnabled + isUrlAllowed + storage
    ├── fluent.d.ts             # Solid JSX typings for Fluent custom elements
    ├── css.d.ts                # ambient declaration for side-effect CSS imports
    └── test-setup.ts           # suppresses console, resets fakeBrowser
```

## Content-script injection (surface-enhancer framework)

`src/entrypoints/content.tsx` is a generic **host**, not feature-specific:

1. Holds a list of `SurfaceEnhancer`s (`createReviewEnhancer()`,
   `createTimelineEnhancer()`, `createPipelinesEnhancer()`,
   `createPrTabFilterEnhancer()`).
2. Loads `CompanionSettings` and `watch`es for changes; a debounced `MutationObserver`
   on `<body>` drives a reconcile `tick()` (ADO is an SPA that re-renders constantly).
3. Each tick: drop enhancers whose mount node ADO removed (`findStale`); if the URL
   isn't allowed (`isUrlAllowed` — disabled or an allowlist miss) unmount everything
   and stop; otherwise `planReconcile` decides what to mount/unmount for the URL,
   gated per enhancer by `featureEnabled(settings, enhancer.feature)`.
4. To mount, the host finds the enhancer's `anchor` element and calls
   `mount(key, anchor)`, which returns `{ marker, cleanup }`.

A `SurfaceEnhancer` (`src/lib/enhancers/types.ts`) declares `id`, `feature` (the
settings toggle that gates it), `anchor` (CSS selector), `matches(url)` — which
returns a stable **key** when the enhancer should be active (else `null`; a changed
key forces unmount + re-mount) — and `mount(key, anchor)` returning
`{ marker, cleanup }`. The Review enhancer injects the "Review" pivot into ADO's
view-switcher and mounts a Shadow-DOM island rendering `<ReviewView>`; the Timeline
enhancer injects tabs at `.repos-activity-filter-dropdown` and hides feed rows by
category; the Pipelines enhancer injects a "Pipelines" tab into `.bolt-tabbar-tabs`
and swaps `.page-content`. Apply the Fluent theme to the island container, then
`render(() => <Component />, container)`.

Keep host/injection glue thin; put matching/data/anchoring logic in `src/lib/` so it is unit-tested.

## Adding a new ADO enhancement

- Logic (URL matching, data shaping, anchoring) → `src/lib/` with a co-located `.spec.ts`.
- A new `SurfaceEnhancer` (factory in `src/app/<feature>/`) registered in `content.tsx`.
- Injected UI → Solid components in `src/app/<feature>/`, mounted by the enhancer.
- New full-page surface (e.g. the options page) → a new entrypoint under `src/entrypoints/`.

See the `add-content-feature` skill and @lazy-instructions/ui-components.md.
