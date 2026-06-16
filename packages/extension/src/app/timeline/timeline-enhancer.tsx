import { createSignal } from 'solid-js';
import { render } from 'solid-js/web';

import { getPrApiBaseUrl, parsePrRef } from '../../lib/ado/pr';
import { listThreads } from '../../lib/ado/threads';
import type { MountResult, SurfaceEnhancer } from '../../lib/enhancers/types';
import {
    buildBotByTimestamp,
    categorizeRow,
    isVisibleUnder,
    lookupBot,
} from '../../lib/timeline/classify';
import type { TimelineRowFeatures, TimelineTab } from '../../lib/timeline/classify';

import { TimelineFilterTabs } from './TimelineFilterTabs';
import { timelineStyles } from './timeline-styles';

const ANCHOR_SELECTOR = '.repos-activity-filter-dropdown';
const FEED_SELECTOR = '.activity-feed-list';
const ROW_SELECTOR = `${FEED_SELECTOR} .bolt-timeline-row`;
// A timeline row's marker identifies its kind: the Chat icon = a comment thread,
// CommentAdd = the "add a comment" composer, an iteration badge = pushed commits.
// Everything else (votes, reviewers, policy, lifecycle dots…) is an action.
const COMMENT_ICON_SELECTOR = '.activity-feed-timeline-icon.ms-Icon--Chat';
const COMPOSER_ICON_SELECTOR = '.activity-feed-timeline-icon.ms-Icon--CommentAdd';
const COMMIT_MARKER_SELECTOR = '.activity-feed-timeline-iteration';
const REAPPLY_DEBOUNCE_MS = 100;

type Counts = Record<TimelineTab, number>;

const ZERO_COUNTS: Counts = { all: 0, actions: 0, commits: 0, comments: 0, system: 0 };

// A timeline row carries its event timestamp (epoch seconds) as a numeric
// element id; we match it against the API's comment timestamps to resolve
// authorship even for collapsed/virtualized rows (whose author ADO hasn't
// rendered).
function rowTimestamp(row: HTMLElement): number | null {
    const el = Array.from(row.querySelectorAll<HTMLElement>('[id]')).find((e) =>
        /^\d{9,11}$/.test(e.id),
    );
    return el ? Number(el.id) : null;
}

// The "add a comment" box at the top of the feed isn't a timeline event and
// must stay visible under every filter.
function isComposerRow(row: HTMLElement): boolean {
    return row.querySelector(COMPOSER_ICON_SELECTOR) !== null;
}

/**
 * PR Overview timeline filter: injects "All / Actions / Commits / Comments /
 * System Messages" tabs beside ADO's "Show everything" dropdown, and shows/hides
 * `.bolt-timeline-row` events by category. Comments split by author — bot/service
 * comments are System Messages, human comments are Comments — resolved from the
 * PR threads API (the feed is virtualized, so the author isn't reliably in the
 * DOM), keyed by each row's event timestamp.
 */
export function createTimelineEnhancer(): SurfaceEnhancer {
    return {
        id: 'timeline-filter',
        feature: 'timeline',
        anchor: ANCHOR_SELECTOR,
        matches(url: string): string | null {
            const ref = parsePrRef(url);
            return ref ? `${ref.organization}/${ref.pullRequestId}` : null;
        },
        mount(_key: string, anchor: HTMLElement): MountResult {
            const [activeTab, setActiveTab] = createSignal<TimelineTab>('all');
            const [counts, setCounts] = createSignal(ZERO_COUNTS);
            let botByTimestamp: ReadonlyMap<number, boolean> = new Map();

            function rowFeatures(row: HTMLElement): TimelineRowFeatures {
                return {
                    isComment: row.querySelector(COMMENT_ICON_SELECTOR) !== null,
                    isCommit: row.querySelector(COMMIT_MARKER_SELECTOR) !== null,
                    isBot: lookupBot(botByTimestamp, rowTimestamp(row)),
                };
            }

            // Recompute each row's category, hide rows outside the active tab,
            // and tally per-category counts for the tab badges.
            function refresh(): void {
                const tab = activeTab();
                const tally: Counts = { all: 0, actions: 0, commits: 0, comments: 0, system: 0 };
                for (const row of document.querySelectorAll<HTMLElement>(ROW_SELECTOR)) {
                    if (isComposerRow(row)) {
                        row.style.removeProperty('display');
                        continue;
                    }
                    const category = categorizeRow(rowFeatures(row));
                    tally.all += 1;
                    if (category === 'action') {
                        tally.actions += 1;
                    } else if (category === 'commit') {
                        tally.commits += 1;
                    } else if (category === 'comment') {
                        tally.comments += 1;
                    } else {
                        tally.system += 1;
                    }
                    row.style.display = isVisibleUnder(tab, category) ? '' : 'none';
                }
                setCounts(tally);
            }

            const island = document.createElement('div');
            island.dataset['adoCompanion'] = 'timeline-filter';
            island.style.marginRight = 'auto';
            island.style.display = 'flex';
            island.style.alignItems = 'center';
            const shadow = island.attachShadow({ mode: 'open' });
            const style = document.createElement('style');
            style.textContent = timelineStyles;
            const mountPoint = document.createElement('div');
            shadow.append(style, mountPoint);
            anchor.insertBefore(island, anchor.firstChild);

            const dispose = render(
                () => (
                    <TimelineFilterTabs
                        active={activeTab()}
                        counts={counts()}
                        onSelect={(tab) => {
                            setActiveTab(tab);
                            refresh();
                        }}
                    />
                ),
                mountPoint,
            );

            // Re-apply as ADO streams in / re-renders timeline rows. Observe a
            // stable ancestor so a replaced feed element is still covered.
            let pending: ReturnType<typeof setTimeout> | undefined;
            const observer = new MutationObserver(() => {
                if (pending !== undefined) {
                    return;
                }
                pending = setTimeout(() => {
                    pending = undefined;
                    refresh();
                }, REAPPLY_DEBOUNCE_MS);
            });
            observer.observe(anchor.parentElement ?? document.body, {
                childList: true,
                subtree: true,
            });

            // Resolve comment authorship from the API, then re-tally/filter.
            const ref = parsePrRef(window.location.href);
            if (ref) {
                void listThreads(getPrApiBaseUrl(ref))
                    .then((threads) => {
                        botByTimestamp = buildBotByTimestamp(threads);
                        refresh();
                    })
                    .catch(() => {
                        /* leave authorship unresolved (comments default to human) */
                    });
            }

            refresh();

            return {
                marker: island,
                cleanup(): void {
                    observer.disconnect();
                    if (pending !== undefined) {
                        clearTimeout(pending);
                    }
                    dispose();
                    island.remove();
                    for (const row of document.querySelectorAll<HTMLElement>(ROW_SELECTOR)) {
                        row.style.removeProperty('display');
                    }
                },
            };
        },
    };
}
