import { webLightTheme } from '@fluentui/tokens';
import { setTheme } from '@fluentui/web-components';
import '@fluentui/web-components/button/define.js';
import { createSignal, onMount } from 'solid-js';
import { browser } from 'wxt/browser';

import { loadSettings, saveSettings } from '../lib/settings/settings';

import './popup.css';

setTheme(webLightTheme);

export function Popup() {
    const [enabled, setEnabled] = createSignal(true);
    const [allowlistCount, setAllowlistCount] = createSignal(0);

    onMount(async () => {
        const settings = await loadSettings();
        setEnabled(settings.enabled);
        setAllowlistCount(settings.allowlist.length);
    });

    async function toggle(value: boolean): Promise<void> {
        setEnabled(value);
        const settings = await loadSettings();
        await saveSettings({ ...settings, enabled: value });
    }

    function openOptions(): void {
        void browser.runtime.openOptionsPage();
    }

    return (
        <main class="popup">
            <h1 class="popup__title">ADO Companion</h1>
            <p class="popup__sub">Extra functionality for Azure DevOps.</p>
            <label class="popup__row">
                <input
                    type="checkbox"
                    checked={enabled()}
                    on:change={(event) => {
                        void toggle((event.currentTarget as HTMLInputElement).checked);
                    }}
                />
                <span>{enabled() ? 'Enabled' : 'Disabled'}</span>
            </label>
            <p class="popup__muted">
                {allowlistCount() === 0
                    ? 'Running on all organizations.'
                    : `Restricted to ${allowlistCount()} organization(s).`}
            </p>
            <fluent-button appearance="primary" on:click={openOptions}>
                Open settings
            </fluent-button>
        </main>
    );
}
