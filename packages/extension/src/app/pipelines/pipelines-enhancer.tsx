import { createSignal } from 'solid-js';
import { render } from 'solid-js/web';

import { loadPrPipelines, pipelinesOverallStatus } from '../../lib/ado/pipelines';
import type { PrPipeline } from '../../lib/ado/pipelines';
import { parsePrRef } from '../../lib/ado/pr';
import type { MountResult, SurfaceEnhancer } from '../../lib/enhancers/types';
import type { PipelineStatus } from '../../lib/pipelines/timeline';

import { PipelinesView } from './PipelinesView';
import { pipelinesStyles } from './pipelines-styles';

const TABLIST_SELECTOR = '.bolt-tabbar-tabs';
const PAGE_ROOT_SELECTOR = '.repos-pr-details-page';
const PAGE_CONTENT_SELECTOR = '.page-content';
// ADO's own PR tab classes, so the injected tab matches the native ones.
const TAB_CLASS = 'bolt-tab focus-treatment flex-noshrink';
const REFRESH_INTERVAL_MS = 60_000;

// Badge colors per overall status (semantic, theme-independent).
const STATUS_COLOR: Record<PipelineStatus, string> = {
    succeeded: '#2da44e',
    failed: '#d1453b',
    running: '#0969da',
    warning: '#bf8700',
    skipped: '#6e7781',
    canceled: '#57606a',
    pending: '#8c8c8c',
};

function formatAgo(since: number): string {
    const seconds = Math.round((Date.now() - since) / 1000);
    if (seconds < 5) {
        return 'just now';
    }
    if (seconds < 60) {
        return `${seconds}s ago`;
    }
    return `${Math.round(seconds / 60)}m ago`;
}

/**
 * PR Pipelines tab: injects a native-looking "Pipelines" tab beside Overview and,
 * when selected, replaces the page content with the PR build's stages/jobs. The
 * tab is the mount marker — if ADO's SPA re-renders the tabbar, the host
 * re-mounts (resetting to the native view).
 */
export function createPipelinesEnhancer(): SurfaceEnhancer {
    return {
        id: 'pipelines-tab',
        feature: 'pipelines',
        anchor: TABLIST_SELECTOR,
        matches(url: string): string | null {
            const ref = parsePrRef(url);
            return ref ? `${ref.organization}/${ref.pullRequestId}` : null;
        },
        mount(_key: string, anchor: HTMLElement): MountResult {
            const ref = parsePrRef(window.location.href);

            const [loading, setLoading] = createSignal(true);
            const [error, setError] = createSignal(false);
            const [pipelines, setPipelines] = createSignal<PrPipeline[]>([]);
            const [refreshing, setRefreshing] = createSignal(false);
            const [updatedAgo, setUpdatedAgo] = createSignal<string | null>(null);
            let lastLoadedAt = 0;

            const tab = document.createElement('a');
            tab.className = TAB_CLASS;
            tab.setAttribute('role', 'tab');
            tab.tabIndex = 0;
            tab.dataset['adoCompanion'] = 'pipelines-tab';
            // Mirror ADO's tab structure so the label is vertically centered.
            const tabInner = document.createElement('span');
            tabInner.className = 'bolt-tab-inner-container';
            const tabText = document.createElement('span');
            tabText.className = 'bolt-tab-text';
            tabText.textContent = 'Pipelines';
            const tabBadge = document.createElement('span');
            tabBadge.dataset['adoCompanion'] = 'pipelines-badge';
            tabBadge.style.cssText =
                'display:none;width:8px;height:8px;border-radius:50%;margin-left:7px;vertical-align:middle;';
            tabInner.append(tabText, tabBadge);
            tab.appendChild(tabInner);

            const island = document.createElement('div');
            island.dataset['adoCompanion'] = 'pipelines-island';
            island.className = 'flex-column flex-grow';
            island.style.display = 'none';
            const shadow = island.attachShadow({ mode: 'open' });
            const style = document.createElement('style');
            style.textContent = pipelinesStyles;
            const mountPoint = document.createElement('div');
            shadow.append(style, mountPoint);

            const root =
                document.querySelector<HTMLElement>(PAGE_ROOT_SELECTOR) ??
                anchor.parentElement ??
                document.body;
            root.appendChild(island);
            anchor.appendChild(tab);

            const pageContent = (): HTMLElement | null =>
                root.querySelector<HTMLElement>(PAGE_CONTENT_SELECTOR);

            let active = false;
            let disabled = false;
            let prevSelected: Element | null = null;

            // Grey the tab out (no pipelines / load failed) and block activation.
            function setDisabled(value: boolean): void {
                disabled = value;
                tab.style.opacity = value ? '0.5' : '';
                tab.style.cursor = value ? 'default' : '';
                tab.setAttribute('aria-disabled', value ? 'true' : 'false');
                tab.title = value ? 'No pipeline runs for this pull request' : '';
            }

            function updateBadge(status: PipelineStatus | null): void {
                if (status) {
                    tabBadge.style.background = STATUS_COLOR[status];
                    tabBadge.style.display = 'inline-block';
                    tabBadge.title = `Pipelines: ${status}`;
                } else {
                    tabBadge.style.display = 'none';
                }
            }

            function activate(): void {
                if (active || disabled) {
                    return;
                }
                active = true;
                const content = pageContent();
                if (content) {
                    content.style.display = 'none';
                }
                island.style.display = 'block';
                prevSelected = anchor.querySelector('.bolt-tab.selected');
                prevSelected?.classList.remove('selected');
                tab.classList.add('selected');
                tab.setAttribute('aria-selected', 'true');
            }

            function deactivate(): void {
                if (!active) {
                    return;
                }
                active = false;
                const content = pageContent();
                if (content) {
                    content.style.display = '';
                }
                island.style.display = 'none';
                tab.classList.remove('selected');
                tab.setAttribute('aria-selected', 'false');
                if (
                    prevSelected?.isConnected &&
                    !anchor.querySelector('.bolt-tab.selected')
                ) {
                    prevSelected.classList.add('selected');
                }
            }

            const onTabbarClick = (event: Event): void => {
                const target = event.target as Element | null;
                if (!target) {
                    return;
                }
                if (tab.contains(target)) {
                    event.preventDefault();
                    activate();
                } else if (target.closest('.bolt-tab')) {
                    deactivate();
                }
            };
            anchor.addEventListener('click', onTabbarClick, true);

            const onTabKeydown = (event: KeyboardEvent): void => {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    activate();
                }
            };
            tab.addEventListener('keydown', onTabKeydown);

            // While active, keep the native content hidden + our island present
            // even if ADO re-renders the page content under us.
            const observer = new MutationObserver(() => {
                if (!active) {
                    return;
                }
                if (!island.isConnected) {
                    root.appendChild(island);
                }
                const content = pageContent();
                if (content && content.style.display !== 'none') {
                    content.style.display = 'none';
                }
                island.style.display = 'block';
            });
            observer.observe(root, { childList: true, subtree: true });

            const dispose = render(
                () => (
                    <PipelinesView
                        loading={loading()}
                        error={error()}
                        refreshing={refreshing()}
                        pipelines={pipelines()}
                        projectUrl={ref ? `${ref.organizationUrl}/${ref.project}` : ''}
                        updatedAgo={updatedAgo()}
                        onRefresh={() => refresh()}
                    />
                ),
                mountPoint,
            );

            function applyResult(result: PrPipeline[]): void {
                setPipelines(result);
                setError(false);
                setLoading(false);
                lastLoadedAt = Date.now();
                setUpdatedAgo(formatAgo(lastLoadedAt));
                if (result.length === 0) {
                    updateBadge(null);
                    setDisabled(true);
                    deactivate();
                } else {
                    updateBadge(pipelinesOverallStatus(result));
                    setDisabled(false);
                }
            }

            // Fetch on mount, on the 60s timer, and from the Refresh button.
            function refresh(): void {
                if (!ref || refreshing()) {
                    return;
                }
                setRefreshing(true);
                loadPrPipelines(ref)
                    .then(applyResult)
                    .catch(() => {
                        // Keep showing the last good data on a transient refresh
                        // failure; only surface an error if we have nothing yet.
                        if (pipelines().length === 0) {
                            setError(true);
                            setLoading(false);
                            setDisabled(true);
                        }
                    })
                    .finally(() => {
                        setRefreshing(false);
                    });
            }

            // Start greyed until the first load confirms there are pipelines.
            setDisabled(true);
            if (ref) {
                refresh();
            } else {
                setLoading(false);
            }

            const refreshTimer = setInterval(() => {
                if (!document.hidden) {
                    refresh();
                }
            }, REFRESH_INTERVAL_MS);
            const agoTimer = setInterval(() => {
                if (lastLoadedAt > 0) {
                    setUpdatedAgo(formatAgo(lastLoadedAt));
                }
            }, 5_000);

            return {
                marker: tab,
                cleanup(): void {
                    clearInterval(refreshTimer);
                    clearInterval(agoTimer);
                    observer.disconnect();
                    anchor.removeEventListener('click', onTabbarClick, true);
                    tab.removeEventListener('keydown', onTabKeydown);
                    if (active) {
                        const content = pageContent();
                        if (content) {
                            content.style.display = '';
                        }
                    }
                    dispose();
                    tab.remove();
                    island.remove();
                },
            };
        },
    };
}
