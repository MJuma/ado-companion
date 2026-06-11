# ADO Companion

A cross-browser extension (Chrome, Edge, Firefox) that adds extra functionality to [Azure DevOps](https://dev.azure.com).

Built with [WXT](https://wxt.dev) (Manifest V3) + [SolidJS](https://solidjs.com) + [Fluent UI Web Components](https://github.com/microsoft/fluentui/tree/master/packages/web-components).

## Repository structure

| Directory | Package | Description |
|-----------|---------|-------------|
| `packages/extension/` | `ado-companion-extension` | The WXT browser extension (content scripts, popup, options) |
| `packages/scripts/` | — | Repo automation scripts |
| `docs/` | — | VitePress documentation & install site |

## Commands (pnpm, not npm)

```bash
pnpm dev:extension       # Run the extension in dev mode (Chrome)
pnpm dev:firefox         # Run the extension in dev mode (Firefox)
pnpm build               # Build all
pnpm lint                # Lint all
pnpm test                # Test all
pnpm zip                 # Package the extension (Chrome/Edge) -> .output/
pnpm zip:firefox         # Package the extension (Firefox)     -> .output/
pnpm docs:dev            # Preview docs site

# Versioning & changelog
pnpm changeset           # Create a changeset for your PR
pnpm changeset:version   # Bump version + regenerate CHANGELOG
```

## Browser support

- **Chrome / Edge** — same Chromium build (`pnpm zip`).
- **Firefox** — separate MV3 build (`pnpm zip:firefox`).

## Dependency management

All versions are centralized in `pnpm-workspace.yaml`:
- `catalog:` — runtime dependencies
- `catalog:development` — dev dependencies

Add dependencies: `pnpm add <pkg> --filter ado-companion-extension`

## Releases

Tagged releases publish per-browser zips as **GitHub Release** artifacts. The docs site links to the latest release with install instructions. Store auto-submission (Chrome Web Store / Edge Add-ons / Firefox AMO) is planned for later.
