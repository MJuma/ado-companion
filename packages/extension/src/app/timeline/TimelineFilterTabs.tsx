import { For } from 'solid-js';

import { TIMELINE_TABS } from '../../lib/timeline/classify';
import type { TimelineTab } from '../../lib/timeline/classify';

interface TimelineFilterTabsProps {
    /** Currently selected tab. */
    active: TimelineTab;
    /** Count of items per tab id (for the inline count badge). */
    counts: Record<TimelineTab, number>;
    onSelect: (tab: TimelineTab) => void;
}

/** The filter tab strip injected beside ADO's "Show everything" dropdown. */
export function TimelineFilterTabs(props: TimelineFilterTabsProps) {
    return (
        <div class="act-tabs" role="tablist" aria-label="Filter timeline">
            <For each={TIMELINE_TABS}>
                {(tab) => (
                    <button
                        type="button"
                        role="tab"
                        class="act-tab"
                        classList={{ 'act-tab--active': props.active === tab.id }}
                        aria-selected={props.active === tab.id}
                        on:click={() => props.onSelect(tab.id)}
                    >
                        {tab.label}
                        <span class="act-tab__count">{props.counts[tab.id]}</span>
                    </button>
                )}
            </For>
        </div>
    );
}
