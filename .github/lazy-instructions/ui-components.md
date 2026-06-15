# UI Components (SolidJS + Fluent Web Components)

The UI is **SolidJS** rendering **Fluent UI Web Components** (`@fluentui/web-components`, framework-agnostic custom elements).

> Versions are pre-release and pinned in the catalog: `@fluentui/web-components` `3.0.0-rc.24`, `@fluentui/tokens` `1.0.0-alpha.23`. Bump deliberately.

## Registering a component

Fluent v3 registers each element via a side-effect import of its `define.js`:

```ts
import '@fluentui/web-components/button/define.js'; // registers <fluent-button>
```

Then use the tag in Solid JSX: `<fluent-button appearance="primary">…</fluent-button>`.

## Solid JSX typings

Solid does not know Fluent's custom-element tags, so declare each one in `src/fluent.d.ts`:

```ts
declare module 'solid-js' {
    namespace JSX {
        interface IntrinsicElements {
            'fluent-button': HTMLAttributes<HTMLElement> & {
                appearance?: 'primary' | 'outline' | 'subtle' | 'transparent';
                disabled?: boolean;
            };
        }
    }
}
```

Add a new entry here whenever you adopt a new Fluent element.

## Events — use `on:click`, not `onClick`

Solid's `onClick` is **delegated** at the document root and does NOT catch events inside a Shadow DOM (events are retargeted). Our injected UI lives in a shadow root, so use Solid's direct listener form:

```tsx
<fluent-button on:click={() => doThing()}>…</fluent-button>
```

## Theming

Themes come from `@fluentui/tokens` (`webLightTheme`, `webDarkTheme`) and are applied with `setTheme` from `@fluentui/web-components`:

```ts
import { setTheme } from '@fluentui/web-components';
import { webLightTheme } from '@fluentui/tokens';

setTheme(webLightTheme);              // applies tokens to document (popup)
setTheme(webLightTheme, container);   // applies tokens to a Shadow DOM container (content script)
```

`setTheme(theme, node?)` sets CSS custom-property tokens on the node; Fluent elements read them via the cascade. For content scripts, always pass the shadow container.

**Dark mode:** the in-page **review island** already inherits ADO's theme automatically (it styles itself with ADO's CSS custom properties, which cross the shadow boundary), so it follows light/dark with no extra work. The remaining **TODO** is the **popup/options** Fluent surfaces: detect ADO's theme / `prefers-color-scheme` and pass `webDarkTheme` accordingly.

## Isolation

Fluent web components each render in their own internal Shadow DOM, so their styles never leak into or out of ADO. Our wrapper UI is itself mounted in a shadow root the enhancer creates with `element.attachShadow({ mode: 'open' })`; inject the island's CSS as a `<style>` string into that shadow root (see `review-styles.ts` → `review-enhancer.tsx`). ADO's theme CSS custom properties still pierce the boundary, so style with those vars for automatic light/dark.
