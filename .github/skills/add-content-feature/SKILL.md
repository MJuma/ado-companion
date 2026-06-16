---
name: add-content-feature
description: Add a new enhancement that the content script injects into Azure DevOps pages
---

# Add a Content-Script Feature

ADO Companion injects native-looking UI into Azure DevOps via the **surface-enhancer
framework** — not one-off content-script hacks and not WXT's `createShadowRootUi`.
A feature is a `SurfaceEnhancer` registered with the content host, which runs a
debounced reconcile loop (MutationObserver-driven) to mount/unmount it and to
re-mount it when ADO's SPA wipes it out.

## Prerequisites

- Know which ADO page(s) the feature targets and a CSS **anchor** selector that
  exists on those pages.
- Read @lazy-instructions/app-structure.md (the framework) and
  @lazy-instructions/ui-components.md (Fluent + Solid in the shadow island).

## The `SurfaceEnhancer` contract

`src/lib/enhancers/types.ts`:

```ts
interface SurfaceEnhancer {
    id: string;                       // stable; at most one active mount per id
    anchor: string;                   // CSS selector that must exist before mounting
    matches(url: string): string | null; // a stable KEY when active for url, else null
    mount(key: string, anchor: HTMLElement): MountResult | Promise<MountResult>;
}
interface MountResult { cleanup: () => void; marker: Node; }
```

- `matches` returns a **key** (e.g. `${pullRequestId}:${filePath}`). When the key
  changes, the host unmounts then re-mounts — so encode in the key everything
  that should force a fresh mount (the review enhancer keys on PR id + file path).
- `mount` injects the UI and returns `cleanup` plus a `marker` node. The host
  watches the marker: if ADO's SPA removes it from the DOM, the enhancer is
  re-mounted on the next tick (`findStale`).

## Steps

### 1. Put pure logic in `src/lib/` (tested)

URL/DOM parsing and data shaping go in framework-free modules so coverage
(85/80/85/85, enforced on `src/lib`) covers them. Reuse `parsePrContext`
(`src/lib/ado/pr.ts`) for PR org/project/repo/PR-id/file, or `parseAdoContext`
(`src/lib/ado.ts`) for general ADO context. Add a co-located `*.spec.ts`.

### 2. Build the UI in `src/app/<feature>/`

Solid components (presentational, data via props). If the UI lives in a shadow
island, the enhancer creates it with `element.attachShadow({ mode: 'open' })`
and injects a CSS `<style>` string (style with ADO's CSS custom properties for
automatic light/dark — see `review-styles.ts`). For Fluent elements, see the
`add-fluent-component` skill. Use `on:click` (not `onClick`) inside the shadow.

### 3. Write the enhancer factory

In `src/app/<feature>/<feature>-enhancer.tsx`, export a `create<Feature>Enhancer():
SurfaceEnhancer`. Two shipped enhancers are reference implementations — mirror
whichever is closer to your feature:
- `src/app/review/review-enhancer.tsx` — full overlay island over a file pane,
  sticky "review mode", heavy DOM glue.
- `src/app/timeline/timeline-enhancer.tsx` — lighter: a shadow-island injected into
  a toolbar that toggles `display` on existing ADO rows; good minimal template.

```ts
export function createMyEnhancer(): SurfaceEnhancer {
    return {
        id: 'my-feature',
        anchor: '.some-ado-toolbar',
        matches(url) {
            const ctx = parseAdoContext(url);
            return ctx.isWanted ? ctx.key : null;
        },
        mount(key, anchor) {
            // inject light-DOM controls and/or a shadow island here…
            const marker = document.createElement('span');
            marker.dataset['adoCompanion'] = 'my-feature-marker';
            marker.style.display = 'none';
            anchor.appendChild(marker);
            // … render Solid UI …
            return { marker, cleanup: () => { /* dispose + remove injected nodes */ } };
        },
    };
}
```

### 4. Register it with the host

Add the factory to the `enhancers` array in `src/entrypoints/content.tsx`:

```ts
const enhancers: SurfaceEnhancer[] = [
    createReviewEnhancer(),
    createTimelineEnhancer(),
    createMyEnhancer(),
];
```

The host (already written) debounces a tick on every DOM mutation, drops stale
mounts, honors the settings enabled-toggle + host allowlist (`isUrlAllowed`), and
calls `planReconcile` to mount/unmount per the current URL. You do **not** touch
the tick loop. SPA navigation is handled for free — the MutationObserver +
marker re-mount cover client-side route changes (no `ctx.location` watcher needed).

> Only widen `matches` in `defineContentScript` / `host_permissions`
> (`wxt.config.ts`) if the feature targets a host the content script doesn't
> already run on. Keep `matches` broad enough that the script is present before a
> client-side navigation into the target page (the script injects on full load,
> not on SPA nav).

### 5. Verify

```bash
pnpm lint && pnpm test && pnpm build
```

Add + consume a changeset (the feature touches `packages/extension/`):

```bash
pnpm changeset && pnpm changeset:version
```

Then preview with `pnpm dev:extension` (HMR) and the `preview-in-devops` skill.

## Guidelines

- Maximize logic in `src/lib/` (tested); keep the enhancer + `src/app/` thin
  (heavy DOM/measurement glue is validated via build + live preview, not jsdom).
- The `marker` is load-bearing: it must stay inside something ADO removes on
  re-render so the host can detect the wipe and re-mount.
- Record page-specific quirks (DOM anchors, timing, SPA behavior) as
  `[gotcha]`/`[pattern]` entries in `.github/memory-bank.md`.
