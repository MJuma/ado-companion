import { parsePrRef } from '../../lib/ado/pr';
import type { MountResult, SurfaceEnhancer } from '../../lib/enhancers/types';
import { shouldHideTab } from '../../lib/pipelines/tab-filter';
import { loadSettings, watchSettings } from '../../lib/settings/settings';

const TABLIST_SELECTOR = '.bolt-tabbar-tabs';
const TAB_SELECTOR = 'a.bolt-tab';

/**
 * Hides pull request tabs whose label is in the user's `hiddenPrTabs` list
 * (part of the Pipelines feature). Re-applies as ADO re-renders the tab strip,
 * and reacts live to settings changes. Never hides "Overview" or our own
 * injected tabs (`shouldHideTab` + the data-attribute skip).
 */
export function createPrTabFilterEnhancer(): SurfaceEnhancer {
    return {
        id: 'pr-tab-filter',
        feature: 'pipelines',
        anchor: TABLIST_SELECTOR,
        matches(url: string): string | null {
            const ref = parsePrRef(url);
            return ref ? `${ref.organization}/${ref.pullRequestId}` : null;
        },
        mount(_key: string, anchor: HTMLElement): MountResult {
            let hidden: readonly string[] = [];

            const marker = document.createElement('span');
            marker.dataset['adoCompanion'] = 'pr-tab-filter';
            marker.style.display = 'none';
            anchor.appendChild(marker);

            const tabs = (): HTMLElement[] =>
                Array.from(anchor.querySelectorAll<HTMLElement>(TAB_SELECTOR)).filter(
                    (tab) => tab.dataset['adoCompanion'] === undefined,
                );

            function apply(): void {
                for (const tab of tabs()) {
                    const label = (tab.textContent ?? '').trim();
                    tab.style.display = shouldHideTab(label, hidden) ? 'none' : '';
                }
            }

            // ADO re-renders tabs on navigation; re-apply on child changes (our
            // own style writes don't trigger this — we only observe childList).
            const observer = new MutationObserver(() => apply());
            observer.observe(anchor, { childList: true, subtree: true });

            const unwatch = watchSettings((settings) => {
                hidden = settings.hiddenPrTabs;
                apply();
            });
            void loadSettings().then((settings) => {
                hidden = settings.hiddenPrTabs;
                apply();
            });

            return {
                marker,
                cleanup(): void {
                    observer.disconnect();
                    unwatch();
                    for (const tab of tabs()) {
                        tab.style.removeProperty('display');
                    }
                    marker.remove();
                },
            };
        },
    };
}
