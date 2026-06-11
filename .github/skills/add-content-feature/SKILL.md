---
name: add-content-feature
description: Add a new enhancement that the content script injects into Azure DevOps pages
---

# Add a Content-Script Feature

Use this skill to add functionality that ADO Companion injects into Azure DevOps pages.

## Prerequisites

- Know which ADO page(s) the feature targets and how to detect them.
- Read @lazy-instructions/app-structure.md and @lazy-instructions/ui-components.md.

## Steps

### 1. Put the logic in `src/lib/` (testable)

Detection, parsing, and data shaping go in a framework-free module so coverage can enforce them:

```ts
// src/lib/<feature>.ts
export function shouldShowOnPage(url: string): boolean { /* ... */ }
```

Add a co-located `src/lib/<feature>.spec.ts`. Reuse `parseAdoContext` from `src/lib/ado.ts` for org/project context.

### 2. Build the UI in `src/app/`

Create a Solid component in `src/app/` using Fluent elements (see the `add-fluent-component` skill). Keep it presentational; take data via props.

### 3. Mount it from the content script

In `src/entrypoints/content.tsx`, decide placement and mount inside the Shadow DOM container:

```tsx
const context = parseAdoContext(window.location.href);
if (!context.isAzureDevOps || !shouldShowOnPage(window.location.href)) {
    return;
}
// inside createShadowRootUi onMount(container):
setTheme(webLightTheme, container);
return render(() => <MyFeature context={context} />, container);
```

- Adjust `anchor`/`position` in `createShadowRootUi` to control where the UI attaches.
- If the feature needs a different match set, update `matches` in `defineContentScript` and the `host_permissions` in `wxt.config.ts`.

### 4. Handle SPA navigation if needed

Azure DevOps is a SPA — the content script's `main` runs once per full load. If your feature must react to in-app route changes, use the WXT content-script context (`ctx`) location-watch utilities rather than assuming a fresh load.

### 5. Verify

```bash
pnpm lint && pnpm test && pnpm build
```

Add a changeset (the feature touches `packages/extension/`):

```bash
pnpm changeset && pnpm changeset:version
```

Then load via `pnpm dev:extension` and confirm on a real ADO page.

## Guidelines

- Maximize logic in `src/lib/` (tested); keep `content.tsx` and `src/app/` thin.
- Don't fight ADO's styles — the Shadow DOM + Fluent's own encapsulation keep you isolated.
- Record page-specific quirks (DOM anchors, timing) as `[gotcha]`/`[pattern]` memory-bank entries.
