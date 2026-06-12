import { createSignal, For, onMount, Show } from 'solid-js';

import { DEFAULT_SETTINGS } from '../../lib/settings/allowlist';
import { loadSettings, saveSettings } from '../../lib/settings/settings';

import './options.css';

export function Options() {
    const [enabled, setEnabled] = createSignal(DEFAULT_SETTINGS.enabled);
    const [allowlist, setAllowlist] = createSignal(DEFAULT_SETTINGS.allowlist);
    const [draft, setDraft] = createSignal('');
    const [loaded, setLoaded] = createSignal(false);
    const [saved, setSaved] = createSignal(false);

    onMount(async () => {
        const settings = await loadSettings();
        setEnabled(settings.enabled);
        setAllowlist(settings.allowlist);
        setLoaded(true);
    });

    async function commit(): Promise<void> {
        await saveSettings({ enabled: enabled(), allowlist: allowlist() });
        setSaved(true);
    }

    function toggleEnabled(value: boolean): void {
        setEnabled(value);
        void commit();
    }

    function addEntry(): void {
        const entry = draft().trim();
        if (entry.length === 0 || allowlist().includes(entry)) {
            setDraft('');
            return;
        }
        setAllowlist([...allowlist(), entry]);
        setDraft('');
        void commit();
    }

    function removeEntry(entry: string): void {
        setAllowlist(allowlist().filter((item) => item !== entry));
        void commit();
    }

    return (
        <main class="opt">
            <header class="opt__header">
                <h1 class="opt__title">ADO Companion</h1>
                <p class="opt__sub">Settings</p>
            </header>

            <Show when={loaded()} fallback={<p class="opt__muted">Loading…</p>}>
                <section class="opt__section">
                    <label class="opt__toggle">
                        <input
                            type="checkbox"
                            checked={enabled()}
                            on:change={(event) => {
                                toggleEnabled((event.currentTarget as HTMLInputElement).checked);
                            }}
                        />
                        <span>
                            <strong>Enable ADO Companion</strong>
                            <span class="opt__muted">
                                Adds the Review experience to Azure DevOps pull request Markdown
                                files.
                            </span>
                        </span>
                    </label>
                </section>

                <section class="opt__section" classList={{ 'opt__section--disabled': !enabled() }}>
                    <h2 class="opt__h2">Organization allowlist</h2>
                    <p class="opt__muted">
                        Leave empty to run on every Azure DevOps organization. Add a host or org
                        name (e.g. <code>dev.azure.com</code> or <code>powerbi</code>) to restrict
                        where the extension runs.
                    </p>
                    <div class="opt__add">
                        <input
                            class="opt__input"
                            type="text"
                            placeholder="org name or host…"
                            value={draft()}
                            disabled={!enabled()}
                            on:input={(event) => {
                                setDraft((event.currentTarget as HTMLInputElement).value);
                            }}
                            on:keydown={(event) => {
                                if (event.key === 'Enter') {
                                    event.preventDefault();
                                    addEntry();
                                }
                            }}
                        />
                        <button
                            class="opt__btn"
                            type="button"
                            disabled={!enabled() || draft().trim().length === 0}
                            on:click={addEntry}
                        >
                            Add
                        </button>
                    </div>
                    <Show
                        when={allowlist().length > 0}
                        fallback={
                            <p class="opt__muted opt__empty">
                                No restrictions — running on all organizations.
                            </p>
                        }
                    >
                        <ul class="opt__list">
                            <For each={allowlist()}>
                                {(entry) => (
                                    <li class="opt__item">
                                        <span>{entry}</span>
                                        <button
                                            class="opt__remove"
                                            type="button"
                                            disabled={!enabled()}
                                            on:click={() => removeEntry(entry)}
                                        >
                                            Remove
                                        </button>
                                    </li>
                                )}
                            </For>
                        </ul>
                    </Show>
                </section>

                <Show when={saved()}>
                    <p class="opt__saved">Saved automatically.</p>
                </Show>
            </Show>
        </main>
    );
}
