# Review Feature — PR Markdown Review

The first feature: a native **"Review"** view for Azure DevOps PR `.md` files —
rendered markdown with a Word-style comment rail, synced to native ADO PR threads.

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

## Locked decisions

- **Surface**: native "Review" pivot beside Raw content/Preview, **PR-only**;
  in-page **Shadow DOM island** + Word-style comment rail; built on a reusable
  **surface-enhancer framework** (a registry for future ADO page enhancements).
  Not an iframe/overlay (would feel bolted-on). File nav stays ADO's.
- **Render ourselves** with markdown-it (`data-source-line`) + DOMPurify, styled
  to match ADO's Preview. Exotic markdown (mermaid, work-item links, `[[_TOC_]]`) later.
- **Anchoring**: line/block for everyone — interoperable with native comments
  (line-based `threadContext` is the universal contract). Phrase-highlight (thread
  `properties`) and true character offsets are later, additive, degrade-gracefully layers.
- **Scope**: any ADO PR `.md` on `dev.azure.com` + legacy `*.visualstudio.com`
  (cloud only); optional allowlist setting.
- Images incl. **Git LFS** in v1 (lightbox later); full thread-status controls
  (resolve/close/won't-fix/by-design/reactivate); clipboard/drag **image paste-upload**;
  toolbar popup (settings → options page). PR-approval vote stays native in DevOps.

Full rationale: session file `markdown-review-plan.md`.

## ADO DOM anchors (verified live on PR 980523, powerbi-specs)

- `.repos-compare-toolbar` — per-file toolbar; inject the **Review** control here,
  beside the Raw content/Preview `bolt-split-button` (its main button's `aria-label`
  toggles "Raw content"↔"Preview").
- `.repos-changes-explorer-splitter` — file content area; mount the island here.
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
