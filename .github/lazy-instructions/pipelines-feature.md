# Pipelines Feature — PR Pipelines Tab + tab hiding

A native **"Pipelines"** tab beside Overview on a PR page that shows the PR build's
**stages → jobs** status (the screenshot the user wants: green/blue/grey status
circles), plus a setting to **hide PR tabs** you don't care about. **Shipped** (the
third + fourth `SurfaceEnhancer`s). Gated by the `pipelines` feature toggle.

## Two enhancers, one feature

Both are registered in `content.tsx` and gated by `features.pipelines`:

- **`createPipelinesEnhancer()`** (`src/app/pipelines/pipelines-enhancer.tsx`) — adds
  the Pipelines tab + stage/job view.
- **`createPrTabFilterEnhancer()`** (`src/app/pipelines/pr-tab-filter-enhancer.tsx`) —
  hides PR tabs whose label is in `hiddenPrTabs`.

(The tab-hiding rides the Pipelines toggle per the user's request — split it into its
own `FeatureId` if that changes.)

## Data path (PR → build stages/jobs)

Pure parser in `src/lib/pipelines/timeline.ts`; fetch/orchestration in
`src/lib/ado/pipelines.ts` (`loadPrPipelines(ref)`):

1. **PR → pipelines**: `GET {orgUrl}/{project}/_apis/build/builds?branchName=refs/pull/{prId}/merge&queryOrder=queueTimeDescending&$top=100&api-version=7.1` → all builds on the PR merge ref; dedupe by `definition.id` (newest first) = **every pipeline associated with the PR**, each with its `definition.name`.
2. **build → timeline**: `GET {orgUrl}/{project}/_apis/build/builds/{buildId}/timeline?api-version=7.1` → `records` typed **Stage / Phase / Job / Task**, each with `state` (pending | inProgress | completed) + `result` (succeeded | failed | skipped | canceled | abandoned | succeededWithIssues).

`parseTimeline(records)` groups jobs under stages by climbing `parentId`
(Job → Phase → Stage); stage-less classic builds (only Phase/Job) collect under a
synthetic **"Build"** stage rolled up from its jobs. `recordStatus(state, result)`
normalizes to `succeeded | failed | running | pending | skipped | canceled | warning`
(drives the status circle color/glyph in `StatusDot.tsx` + `pipelines-styles.ts`).

> The PR "Build" branch-policy evaluation (`…/policy/evaluations?artifactId=vstfs:///CodeReview/CodeReviewId/{projGuid}/{prId}`) also carries `context.buildId`, but builds-by-merge-ref is simpler, names the pipelines, and catches **all** of them (not just required Build policies). All calls are same-origin + cookie-auth via `adoGetJson`. Verified live on PR 969472.

## Tab injection + content swap

ADO doesn't know about our tab, so we manage the content swap ourselves (see
`[pattern] pr-tab-content-swap` in the memory bank):

- **Anchor**: the tablist `.bolt-tabbar-tabs` (inside `.repos-pr-details-page-tabbar`);
  native tabs are `a.bolt-tab` (textContent = label, `selected` class = active).
- Inject an `a.bolt-tab` **"Pipelines"** — **mirror ADO's tab DOM**
  (`<a class=bolt-tab><span class=bolt-tab-inner-container><span class=bolt-tab-text>`)
  so the label is vertically centered (a bare text node sits at the top). The tab IS
  the mount **marker** → the host re-mounts if ADO's SPA wipes the tabbar. A shadow
  island is appended to `.repos-pr-details-page`.
- **Eager fetch + auto-refresh**: `loadPrPipelines` runs on mount and every **60s**
  (skipped when `document.hidden`), plus a manual **Refresh** button. A transient
  refresh failure keeps the last good data. The tab starts **greyed/disabled** and
  **enables** once a load confirms pipelines exist (no active→grey flash); if there
  are none (or load fails first time) it stays greyed.
- **Tab status badge**: a small colored dot in the tab shows the overall status
  (`pipelinesOverallStatus`, worst-wins), so you can see state without opening the
  tab; updated on each load/refresh.
- **Deep links + tooltips**: each stage/job status circle is a link into the build
  results (`StatusDot` `href`): job → `…/_build/results?buildId={id}&view=logs&j={recordId}`,
  stage → `&view=results`. The job/stage name is the circle's `title` tooltip.
- **Activate** (our tab clicked): hide `.page-content` (the per-tab content sibling),
  show the island, move `selected` from the previous native tab to ours.
- A **capture** click listener on the tablist **deactivates** on any native-tab click
  (restore `.page-content` + previous selection; ADO then navigates).
- A `MutationObserver` keeps `.page-content` hidden + the island present while active.
- **Not sticky**: navigating away re-mounts → resets to the native view (unlike the
  Review feature, which persists "review mode").

## Tab hiding

`shouldHideTab(label, hidden)` (`src/lib/pipelines/tab-filter.ts`, tested) —
case-insensitive, trimmed; **never hides "Overview"** or our own injected tabs
(`data-ado-companion` skip). The enhancer reads `hiddenPrTabs` from settings
(`loadSettings` + `watchSettings` for live updates) and re-applies via a
`MutationObserver` on the tablist (it only observes `childList`, so its own
`style.display` writes don't loop).

## Settings (per-feature toggles)

This feature drove the move to per-feature settings (`CompanionSettings` in
`src/lib/settings/model.ts`): `{ enabled (master), allowlist, features:{review,
timeline,pipelines}, hiddenPrTabs }`. `featureEnabled(settings, id)` gates each
enhancer in the host; the options page (`src/app/options/Options.tsx`) renders the
master toggle, a toggle per `FEATURES` entry, the hidden-tabs editor (under
Pipelines), and the allowlist. Storage migration `migrateToV2` upgrades old
`{ enabled, allowlist }` installs (all features default on).

## Files

- `src/lib/pipelines/timeline.ts` (+spec) — stage/job parser + status normalization.
- `src/lib/pipelines/tab-filter.ts` (+spec) — `shouldHideTab` matcher.
- `src/lib/ado/pipelines.ts` (+spec) — fetchers + `loadPrPipelines`.
- `src/app/pipelines/` — `pipelines-enhancer.tsx`, `pr-tab-filter-enhancer.tsx`,
  `PipelinesView.tsx`, `StatusDot.tsx`, `pipelines-styles.ts`.

## Previewing

Use the **`preview-in-devops`** skill. A PR with a required Build policy (e.g. 969472)
is needed to see real stages. Content-script changes need an **extension reload**
(not just a page reload) — see `[gotcha] extension-reload`.
