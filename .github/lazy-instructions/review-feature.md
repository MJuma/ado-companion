# Review Feature — PR Markdown Review

A native **"Review"** view for Azure DevOps PR `.md` files — rendered markdown
with a Word-style comment rail, synced to native ADO PR threads. **Shipped and
matured** (the extension's flagship feature; siblings are the PR Timeline Filter and
PR Pipelines Tab — see @lazy-instructions/timeline-feature.md and
@lazy-instructions/pipelines-feature.md). The phase list below is build history;
**Recent additions & fixes** captures what shipped most recently.

## Status

- ✅ **Phase 1** — `src/lib/ado/*`: ADO PR REST/data layer (pr context/URL parsing,
  http, threads, iterations, items, attachments, identities, pr-types). Unit-tested.
- ✅ **Phase 2** — `src/lib/markdown/*`: markdown-it render with `data-source-line`
  anchoring + DOMPurify sanitize + relative link/image resolution. Unit-tested.
- ✅ **Phase 3** — surface-enhancer framework (`src/lib/enhancers`) + content-script
  host (`src/entrypoints/content.tsx`) + native "Review" pivot in `.repos-compare-toolbar`
  + Shadow DOM island (`src/app/review/`) rendering the file Markdown read-only,
  themed via ADO CSS vars. **Verified live** on PR 980523.
- ✅ **Phase 4** — read comments: two-pane `ReviewView` (doc + Word-style rail).
  Fetches the file's threads (`listThreads` + `isFileThread`), renders `CommentCard`s
  (status, avatar, markdown bodies). `src/lib/markdown/anchor.ts` maps thread source
  line → rendered block for block highlight + bidirectional click-sync. **Verified
  live** on PR 980523 (31 threads → 26 anchored blocks; comment-body images render).
- ✅ **Phase 5** — write (5a/5b/5c all done + verified live on scratch PR 1002836):
  - **5a**: `CommentComposer` (textarea, Ctrl/Cmd+Enter, image paste/drop/picker →
    `uploadAttachment` → markdown at caret), reply + thread-status controls in
    `CommentCard`, click-a-paragraph-to-create-thread in `ReviewView` (anchored via
    `buildLineThreadContext`); the rail refetches after every mutation.
  - **5b**: `CommentItem` shows Edit (pre-filled composer → `updateComment`) +
    Delete (inline confirm → `deleteComment`) on your own comments; ReviewView
    resolves the current user (`fetchCurrentUser`, `.catch`-guarded) for ownership.
  - **5c**: @mention autocomplete — `searchIdentities` (same-origin IdentityPicker),
    `src/lib/review/mentions.ts` (caret query detect, readable `@Name` token,
    encode to `@<GUID>` on submit, GUID→name cache for rendering). `CommentItem`
    renders `@<GUID>` as `@Name` before markdown.
  - Created threads/replies/mentions are **native ADO comments** (interoperable).
- ✅ **Phase 6** — settings + allowlist: `src/lib/settings` (`ReviewSettings
  { enabled, allowlist }`, `isUrlAllowed`, WXT-storage load/save/watch); an
  **options page** (enable toggle + allowlist editor; registers `options_ui`) and
  a **popup** (status + quick toggle + Open settings). `content.tsx` gates every
  enhancer on settings — disabling or an allowlist miss unmounts the UI live;
  default (enabled, empty allowlist) runs everywhere. Logic unit-tested; the pages
  follow the repo's build + manual verification (playwright-cli can't open
  `chrome-extension://` pages).
- ✅ **UX refinements** (verified live on PR 1002836): "Review" is now an entry in
  ADO's **view-switcher dropdown** (not a separate button); the island **overlays
  the file-content pane** (`.vss-Splitter--pane-flexible`) so the file tree stays
  and it fills full width; selecting another view exits. Commenting is
  **selection-based**: select text → floating "+" → composer popover anchored to
  the selection's source line(s). The composer **autofocuses**, shows a **live
  preview**, and has **no image button** (paste/drop still auto-uploads). The
  island stops key events propagating so ADO's search can't hijack typing.

### Recent additions & fixes

- **Rich doc rendering**: **mermaid diagrams** (lazy-loaded vendored bundle,
  themed light/dark, sanitized SVG; gantt sized to full width) and **code syntax
  highlighting** — both in `src/app/review/mermaid.ts` + `syntax.ts`. Relative/LFS
  images and a **commented-text-span highlight** over the rendered doc.
- **Precise phrase highlight**: a single-line comment highlights just the selected
  phrase (not the whole row) in both Review and ADO's native views. Source columns
  are computed by locating the rendered quote in the source line
  (`phraseSourceRange`, `src/lib/markdown/highlight.ts`); the thread is written with
  true char offsets + `SupportsMarkdown` (`src/lib/review/new-thread.ts`).
- **Native-view collapse fix**: ADO renders externally-created (REST) threads
  collapsed until a fresh fetch. On leaving Review for a native view the enhancer
  **expands the just-created comment in place** — clicks the comment's own
  `.repos-editor-discussion-expand` toggle, matched by the comment snippet in its
  `aria-label` (`expandCreatedComments` in `review-enhancer.tsx`).
- **Comment rail UX**: resizable divider; sticky non-wrapping toolbar with status +
  by-person filters; likes; per-card collapse; prev/next comment navigation (wraps,
  respects filters). Flash-free updates via `createStore` + `reconcile` (see
  `[gotcha] resource-refetch-teardown` in the memory bank).

## Locked decisions

- **Surface**: native **"Review" entry in ADO's view dropdown** (Side-by-side /
  Inline / Raw content / Preview / Review), **PR-only**; in-page **Shadow DOM
  island overlaying the file-content pane** (tree + toolbar stay) + comment rail;
  built on a reusable **surface-enhancer framework**. Not an iframe (would feel
  bolted-on). File nav stays ADO's.
- **Render ourselves** with markdown-it (`data-source-line`) + DOMPurify, styled
  to match ADO's Preview. Exotic markdown (mermaid, work-item links, `[[_TOC_]]`) later.
- **Commenting is selection-based**: select text → floating button → composer
  popover; the thread is anchored to the selection's source **line range**
  (line/block is the interoperable contract with native ADO comments). Sub-line
  char offsets / phrase-highlight are later additive layers.
- **Scope**: any ADO PR `.md` on `dev.azure.com` + legacy `*.visualstudio.com`
  (cloud only); optional allowlist setting.
- Images incl. **Git LFS** in v1 (lightbox later); full thread-status controls
  (resolve/close/won't-fix/by-design/reactivate); clipboard/drag **image paste-upload**
  (no button); toolbar popup (settings → options page). PR-approval vote stays native.

Full rationale: session file `markdown-review-plan.md`.

## ADO DOM anchors (verified live; see memory bank for full selectors)

- `.repos-compare-toolbar` — per-file toolbar holding the Raw content/Preview
  `.bolt-split-button`. The **Review** entry is added to that split-button's
  **view menu** (portal `table#__bolt-changeViewerMode`) by cloning a `<tr>` row —
  not as a separate button. Scope view-switcher queries to this toolbar (a draft PR
  has other split-buttons, e.g. "Publish").
- `.repos-changes-explorer-splitter` → its `.vss-Splitter--pane-flexible` (file
  content) — mount the island as an **absolute overlay** here so the file tree
  (`.vss-Splitter--pane-fixed`) stays and the island fills the content width. Hide
  ADO's native content via a `visibility:hidden` class (not `display:none`).
- `.markdown-content` — ADO's rendered preview; match its styling for a native look.
- `.repos-pr-details-page` — PR page root.

## ADO REST integration

Implemented in `src/lib/ado/`. Base `…/_apis/git/repositories/{repo}/pullRequests/{id}`;
threads/comments/iterations/items/attachments + connectionData; cookie auth +
`X-TFS-FedAuthRedirect: Suppress`; line-based `threadContext` +
`pullRequestThreadContext.changeTrackingId`. See the memory bank for the full recipe.

## Previewing while developing

Use the **`preview-in-devops`** skill — drive the user's authed Edge via
playwright-cli to view/inspect ADO; `pnpm dev:extension` for hot-reload.
