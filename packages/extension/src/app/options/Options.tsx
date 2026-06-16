import { createSignal, For, onMount, Show } from 'solid-js';

import { DEFAULT_SETTINGS, FEATURES } from '../../lib/settings/model';
import type { CompanionSettings, FeatureId } from '../../lib/settings/model';
import { loadSettings, saveSettings } from '../../lib/settings/settings';

import './options.css';

export function Options() {
    const [settings, setSettings] = createSignal(DEFAULT_SETTINGS);
    const [allowDraft, setAllowDraft] = createSignal('');
    const [tabDraft, setTabDraft] = createSignal('');
    const [loaded, setLoaded] = createSignal(false);
    const [saved, setSaved] = createSignal(false);

    onMount(async () => {
        setSettings(await loadSettings());
        setLoaded(true);
    });

    const enabled = (): boolean => settings().enabled;
    const allowlist = (): string[] => settings().allowlist;
    const hiddenPrTabs = (): string[] => settings().hiddenPrTabs;
    const pipelinesOn = (): boolean => settings().features.pipelines;

    async function update(patch: Partial<CompanionSettings>): Promise<void> {
        const next: CompanionSettings = { ...settings(), ...patch };
        setSettings(next);
        await saveSettings(next);
        setSaved(true);
    }

    function setFeature(id: FeatureId, value: boolean): void {
        void update({ features: { ...settings().features, [id]: value } });
    }

    function addAllow(): void {
        const entry = allowDraft().trim();
        if (entry.length === 0 || allowlist().includes(entry)) {
            setAllowDraft('');
            return;
        }
        void update({ allowlist: [...allowlist(), entry] });
        setAllowDraft('');
    }

    function removeAllow(entry: string): void {
        void update({ allowlist: allowlist().filter((item) => item !== entry) });
    }

    function addTab(): void {
        const entry = tabDraft().trim();
        const exists = hiddenPrTabs().some((tab) => tab.toLowerCase() === entry.toLowerCase());
        if (entry.length === 0 || exists) {
            setTabDraft('');
            return;
        }
        void update({ hiddenPrTabs: [...hiddenPrTabs(), entry] });
        setTabDraft('');
    }

    function removeTab(entry: string): void {
        void update({ hiddenPrTabs: hiddenPrTabs().filter((item) => item !== entry) });
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
                                void update({
                                    enabled: (event.currentTarget as HTMLInputElement).checked,
                                });
                            }}
                        />
                        <span>
                            <strong>Enable ADO Companion</strong>
                            <span class="opt__muted">
                                Master switch for every enhancement below.
                            </span>
                        </span>
                    </label>
                </section>

                <section class="opt__section" classList={{ 'opt__section--disabled': !enabled() }}>
                    <h2 class="opt__h2">Features</h2>
                    <p class="opt__muted">Turn individual enhancements on or off.</p>
                    <div class="opt__features">
                        <For each={FEATURES}>
                            {(feature) => (
                                <label class="opt__toggle">
                                    <input
                                        type="checkbox"
                                        checked={settings().features[feature.id]}
                                        disabled={!enabled()}
                                        on:change={(event) => {
                                            setFeature(
                                                feature.id,
                                                (event.currentTarget as HTMLInputElement).checked,
                                            );
                                        }}
                                    />
                                    <span>
                                        <strong>{feature.label}</strong>
                                        <span class="opt__muted">{feature.description}</span>
                                    </span>
                                </label>
                            )}
                        </For>
                    </div>

                    <Show when={pipelinesOn()}>
                        <div class="opt__nested">
                            <h3 class="opt__h3">Hidden pull request tabs</h3>
                            <p class="opt__muted">
                                Hide tabs beside <code>Overview</code> on the PR page whose label
                                matches an entry below (case-insensitive). <code>Overview</code> is
                                never hidden.
                            </p>
                            <div class="opt__add">
                                <input
                                    class="opt__input"
                                    type="text"
                                    placeholder="tab label, e.g. Synapse diff"
                                    value={tabDraft()}
                                    disabled={!enabled()}
                                    on:input={(event) => {
                                        setTabDraft((event.currentTarget as HTMLInputElement).value);
                                    }}
                                    on:keydown={(event) => {
                                        if (event.key === 'Enter') {
                                            event.preventDefault();
                                            addTab();
                                        }
                                    }}
                                />
                                <button
                                    class="opt__btn"
                                    type="button"
                                    disabled={!enabled() || tabDraft().trim().length === 0}
                                    on:click={addTab}
                                >
                                    Add
                                </button>
                            </div>
                            <Show
                                when={hiddenPrTabs().length > 0}
                                fallback={
                                    <p class="opt__muted opt__empty">No tabs hidden.</p>
                                }
                            >
                                <ul class="opt__list">
                                    <For each={hiddenPrTabs()}>
                                        {(entry) => (
                                            <li class="opt__item">
                                                <span>{entry}</span>
                                                <button
                                                    class="opt__remove"
                                                    type="button"
                                                    disabled={!enabled()}
                                                    on:click={() => removeTab(entry)}
                                                >
                                                    Remove
                                                </button>
                                            </li>
                                        )}
                                    </For>
                                </ul>
                            </Show>
                        </div>
                    </Show>
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
                            value={allowDraft()}
                            disabled={!enabled()}
                            on:input={(event) => {
                                setAllowDraft((event.currentTarget as HTMLInputElement).value);
                            }}
                            on:keydown={(event) => {
                                if (event.key === 'Enter') {
                                    event.preventDefault();
                                    addAllow();
                                }
                            }}
                        />
                        <button
                            class="opt__btn"
                            type="button"
                            disabled={!enabled() || allowDraft().trim().length === 0}
                            on:click={addAllow}
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
                                            on:click={() => removeAllow(entry)}
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
