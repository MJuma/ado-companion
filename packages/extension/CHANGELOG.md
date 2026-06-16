# ado-companion-extension

## 0.6.0

### Minor Changes

- Add a PR Pipelines tab and per-feature settings toggles.

  A new native-styled **"Pipelines"** tab beside Overview on a pull request shows the PR build's stage and job status — each stage lists its jobs as colored status circles (succeeded, failed, running, pending, skipped, canceled, warning) — resolved from the PR's required Build policy and the build timeline, without leaving the PR. Selecting the tab swaps the page content in place; selecting any native tab restores it.

  Settings now have a master switch plus an individual enable/disable toggle for each feature — PR Markdown Review, PR Activity Filter, and the PR Pipelines tab. The Pipelines feature also adds a configurable list of pull request tab labels to hide from the tab strip (e.g. tabs you never use), so you can declutter the PR header. "Overview" is never hidden. Existing settings are preserved and every feature defaults to on.

## 0.5.0

### Minor Changes

- Add filter tabs to the PR Overview timeline. A native-styled tab strip — All, Actions, Commits, Comments, System Messages — is injected on the same row as ADO's "Show everything" dropdown and filters the activity feed in place. Comments are split by author: human comments under "Comments", and service/bot comments (build service, pipelines, GitOps, etc.) under "System Messages"; pushed commits under "Commits"; and votes, reviewers, policy and lifecycle events under "Actions". Each tab shows a live count.

## 0.4.3

### Patch Changes

- Expand comments created in the Review view in place when switching to a native ADO file view, instead of re-fetching the whole file. The extension now clicks ADO's own expand toggle for the comment as soon as it renders, which is much faster on large/comment-heavy PRs (where the previous re-fetch left the comment collapsed for a long time) and avoids re-rendering the file. The comment still appears in the file-tree comment list.

## 0.4.2

### Patch Changes

- Anchor single-line Review comments to the exact selected phrase so ADO's native file views highlight just that phrase instead of the whole row. The thread's character range is now computed from the phrase's position in the source line; multi-line or unlocatable selections fall back to a line-level anchor (no highlight) rather than spanning the whole line.

## 0.4.1

### Patch Changes

- Fix comments created in the Review view appearing collapsed and missing from the file tree in ADO's native file views. ADO renders externally-created threads collapsed until a fresh discussion fetch, so on leaving Review for a native view the extension now re-selects the open file to force that fetch — comments render expanded and show in the tree without a manual page refresh. New threads are also tagged as markdown-capable and anchored to a real character range to match ADO's own comments.

## 0.4.0

### Minor Changes

- Add syntax highlighting to code blocks in the PR Markdown Review view, themed to match Azure DevOps' light/dark theme. Highlighting uses highlight.js, which is lazy-loaded the first time a document shows a code block (so it doesn't add weight to other pages), and its output is sanitized.

## 0.3.2

### Patch Changes

- Make Mermaid gantt charts use the available width instead of collapsing to a tiny default size, so project timelines render at a readable scale.

## 0.3.1

### Patch Changes

- Fix Mermaid rendering: diagram text was missing (mermaid's HTML `foreignObject` labels were stripped by the SVG sanitizer — now uses SVG text labels), and diagrams written with Azure DevOps' `:::mermaid` directive (rather than a ```mermaid fence) are now rendered too.

## 0.3.0

### Minor Changes

- Render Mermaid diagrams in the PR Markdown Review view. Fenced `mermaid` code blocks are now drawn as diagrams (themed to match Azure DevOps' light/dark theme) instead of shown as raw code. Mermaid is lazy-loaded the first time a document actually contains a diagram, so it doesn't add weight to other pages, and its SVG output is sanitized.

## 0.2.0

### Minor Changes

- Add the **PR Markdown Review** experience — a native "Review" entry in Azure DevOps' file‑view dropdown (beside Raw content/Preview) that renders a pull request's Markdown files with a Word‑style comment rail synced to native ADO comment threads.

  Highlights:

  - Select text to comment, with the exact commented span highlighted in the document (in addition to a block marker); native comments are highlighted best‑effort too.
  - Full thread interaction: reply, resolve/change status, edit, delete (with confirmation), and likes.
  - @mentions with avatar autocomplete; relative timestamps that tick live.
  - Collapsible threads, filter by status and by person, and prev/next comment navigation (wraps).
  - A resizable comment pane, a sticky filter toolbar, and rendering of relative/LFS images in the document.

  All comments are real native ADO PR threads (REST API, cookie auth), so the experience is fully interoperable with Azure DevOps.

## 0.1.0

### Minor Changes

- Initial scaffold: cross-browser (Chrome, Edge, Firefox) extension built with WXT + SolidJS + Fluent UI Web Components. Injects UI into Azure DevOps (`dev.azure.com`, `*.visualstudio.com`) via Shadow DOM, with a popup and background entrypoints.
