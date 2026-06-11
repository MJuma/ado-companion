---
name: add-fluent-component
description: Adopt a new Fluent UI Web Component in the ADO Companion extension
---

# Add a Fluent Web Component

Use this skill to start using a new Fluent element (e.g. `<fluent-text-input>`, `<fluent-menu>`, `<fluent-dialog>`) in the Solid UI.

## Prerequisites

- Know which Fluent element you need. Browse available components under `node_modules/@fluentui/web-components/dist/esm/` (each has a `<name>/define.js`).
- Read @lazy-instructions/ui-components.md.

## Steps

### 1. Register the element

Add a side-effect import where the component is used (or in the entry that mounts it):

```ts
import '@fluentui/web-components/text-input/define.js'; // registers <fluent-text-input>
```

### 2. Add the Solid JSX typing

Solid doesn't know the custom tag — declare it in `src/fluent.d.ts`:

```ts
declare module 'solid-js' {
    namespace JSX {
        interface IntrinsicElements {
            'fluent-text-input': HTMLAttributes<HTMLElement> & {
                value?: string;
                placeholder?: string;
                disabled?: boolean;
            };
        }
    }
}
```

Add only the attributes/properties you use. Prefer the element's documented attributes.

### 3. Use it in a Solid component

```tsx
<fluent-text-input
    placeholder="Search"
    on:input={(e) => setQuery((e.target as HTMLInputElement).value)}
/>
```

**Use `on:<event>` (direct listener), not `onEvent`** — delegated handlers don't work inside the Shadow DOM. See the `solid-shadow-events` gotcha in the memory bank.

### 4. Theming

The component inherits theme tokens from the nearest `setTheme` target. The popup and injected container already call `setTheme(...)`; new elements under them are themed automatically. If you mount a brand-new root, call `setTheme(theme, container)` on it.

### 5. Verify

```bash
pnpm --filter ado-companion-extension exec tsc --noEmit
pnpm lint
pnpm build
```

Then load it via `pnpm dev:extension` (ask the user to start/restart the dev server) to confirm it renders and is themed correctly.

## Guidelines

- Keep the typing in `fluent.d.ts` minimal and accurate — don't copy the whole element API.
- If the component needs interaction logic, put the pure parts in `src/lib/` (with a spec) and keep the JSX thin.
- Record any non-obvious element quirk as a `[gotcha]` in the memory bank.
