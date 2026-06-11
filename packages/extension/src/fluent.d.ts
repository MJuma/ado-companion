// Solid JSX typings for the Fluent Web Components we use.
// Fluent ships framework-agnostic custom elements, so Solid needs the tags
// declared in its JSX namespace. Add new elements here as they are adopted.
import 'solid-js';

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
