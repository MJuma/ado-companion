# ado-companion-extension

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
