# ado-companion-extension

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
