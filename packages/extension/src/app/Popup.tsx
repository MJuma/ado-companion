import { webLightTheme } from '@fluentui/tokens';
import { setTheme } from '@fluentui/web-components';
import '@fluentui/web-components/button/define.js';
import { createSignal } from 'solid-js';

setTheme(webLightTheme);

export function Popup() {
    const [count, setCount] = createSignal(0);

    return (
        <main>
            <h1>ADO Companion</h1>
            <p>Extra functionality for Azure DevOps.</p>
            <fluent-button
                appearance="primary"
                on:click={() => setCount(count() + 1)}
            >
                Clicked {count()} times
            </fluent-button>
        </main>
    );
}
