# Timeline Feature — PR Overview Activity Filter

Filter tabs on the Azure DevOps **PR Overview** activity feed — **All / Actions /
Commits / Comments / System Messages** — injected beside ADO's "Show everything"
dropdown. Selecting a tab hides the timeline rows outside that category and the
tabs show per-category counts. **Shipped** (the second `SurfaceEnhancer`, after PR
Markdown Review). PR-only; matches any PR Overview URL.

## How it works

`createTimelineEnhancer()` (`src/app/timeline/timeline-enhancer.tsx`):

- **Anchor / key**: anchors on `.repos-activity-filter-dropdown`; `matches(url)`
  returns `${organization}/${pullRequestId}` (via `parsePrRef`) so it's active on
  any PR Overview and re-mounts per PR.
- **Island**: injects a Shadow-DOM island as the anchor's **first child** with
  `margin-right:auto`, so the tabs sit left and ADO's "Show everything" dropdown
  stays right. Renders `<TimelineFilterTabs>` (`TimelineFilterTabs.tsx`,
  `timeline-styles.ts` — ADO pivot-styled).
- **Filtering**: `refresh()` walks every `.activity-feed-list .bolt-timeline-row`,
  categorizes it, tallies counts, and toggles `row.style.display`. A debounced
  `MutationObserver` on the anchor's parent re-applies as ADO streams in / virtualizes
  rows. `cleanup()` clears all `display` overrides.

Pure, tested logic is in `src/lib/timeline/classify.ts` (the enhancer only does DOM
extraction): `categorizeRow`, `isVisibleUnder`, `buildBotByTimestamp`, `lookupBot`,
`isBotDescriptor`, `toEpochSeconds`, plus `TIMELINE_TABS` / `TimelineTab` /
`TimelineCategory`.

## Categorization (marker-based, robust across PR states)

Each row's kind comes from its **marker icon**, not text:

- `.activity-feed-timeline-icon.ms-Icon--Chat` → a discussion **comment**.
- `.activity-feed-timeline-icon.ms-Icon--CommentAdd` → the "add a comment"
  **composer** at the top of the feed — not an event; always kept visible.
- `.activity-feed-timeline-iteration` → pushed **commits**.
- anything else (votes, reviewer/policy/lifecycle changes, target-branch updates…)
  → an **action**.

**Comments split by author**: human → `comment`, bot/service → `system`. The split
is `categorizeRow`'s job given `isBot`.

## System Messages = bot/service-authored comments (resolved via API)

"System Messages" are comments by **non-human accounts** (Build Service, Azure
Pipelines Test Service, GitOps, MerlinBot…), identified by their ADO identity
**descriptor** prefix: `aad.`/`msa.` = human, `svc.`/`s2s.` = service/bot
(`isBotDescriptor`). Do **not** use `commentType` — bot comments can be
`commentType:'system'` *or* `'text'`.

> **[gotcha] the feed is VIRTUALIZED — don't read the author from the DOM.** A
> collapsed/off-screen comment row renders only the "Write a reply" box (the
> *current user's* avatar), not the comment author, so DOM author detection grabs
> the wrong identity (it flips real comments to the wrong bucket as you scroll).

Instead, authorship comes from the **threads API**:

1. `listThreads(getPrApiBaseUrl(ref))` fetches the PR's threads.
2. `buildBotByTimestamp(threads)` → `Map<epochSeconds, isBot>`, keyed by each
   comment's `publishedDate` + `lastUpdatedDate` (whole epoch seconds). A thread's
   **first** comment determines authorship for the whole thread.
3. Each timeline row carries its event timestamp as a **numeric child element id**
   (`/^\d{9,11}$/`, epoch seconds) — `rowTimestamp(row)` reads it; `lookupBot`
   matches it against the map with a ±2s skew tolerance.

Authorship resolves asynchronously: rows render immediately (comments default to
human) and re-tally once the API returns. If the fetch fails, comments stay human.

## ADO DOM anchors

- `.repos-activity-filter-dropdown` — the "Show everything" dropdown row; inject the
  tabs island here (first child).
- `.activity-feed-list` — the timeline container; rows are `.bolt-timeline-row`.
- A row's numeric child element `id` (epoch seconds) — the join key to API comment
  timestamps.

## Files

- `src/lib/timeline/classify.ts` (+ `.spec.ts`) — categorization + bot/human map.
- `src/app/timeline/timeline-enhancer.tsx` — the `SurfaceEnhancer` (DOM glue, API
  fetch, MutationObserver).
- `src/app/timeline/TimelineFilterTabs.tsx` — the Solid tab strip.
- `src/app/timeline/timeline-styles.ts` — Shadow-DOM CSS (ADO theme vars).
- Registered in `src/entrypoints/content.tsx` (`createTimelineEnhancer()`).

## Previewing while developing

Use the **`preview-in-devops`** skill — drive the user's authed Edge via
playwright-cli to view/inspect a PR Overview; `pnpm dev:extension` for hot-reload.
Bot-heavy PRs (every comment a service account) are the best stress test for the
System Messages split.
