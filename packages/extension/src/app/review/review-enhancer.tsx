import { render } from 'solid-js/web';

import { parsePrContext } from '../../lib/ado/pr';
import type { MountResult, SurfaceEnhancer } from '../../lib/enhancers/types';

import { ReviewView } from './ReviewView';
import { reviewStyles } from './review-styles';

const TOOLBAR_SELECTOR = '.repos-compare-toolbar';
const FLEX_PANE_SELECTOR =
    '.repos-changes-explorer-splitter .vss-Splitter--pane-flexible';
const VIEW_MENU_ID = '__bolt-changeViewerMode';
const VIEW_CHEVRON_SELECTOR = '.repos-compare-toolbar .bolt-split-button-option';
const VIEW_MAIN_SELECTOR = '.repos-compare-toolbar .bolt-split-button-main';
const REVIEW_ITEM_ID = 'ado-companion-review-item';
const HOST_CLASS = 'ado-companion-review-host';
const HOST_STYLE_ID = 'ado-companion-host-style';
const SELECTED_FILE_ROW_SELECTOR = '.bolt-tree-row.selected';
// Native inline/diff discussion widgets — counting these lets us wait until the
// editor has finished rendering ALL threads (count stops changing) before the
// re-fetch, so a comment-heavy file doesn't trip an early re-select.
const NATIVE_DISCUSSION_SELECTOR = '.repos-discussion-thread, .repos-editor-discussion-expand';

// Poll for the native editor to finish rendering its discussions before forcing
// the re-fetch, instead of guessing a fixed delay (slower/bigger PRs mount
// later, comment-heavy files render in waves).
const NATIVE_REFRESH_POLL_MS = 150;
const NATIVE_REFRESH_MAX_POLLS = 80;
// Consider the editor "settled" once the discussion count holds steady this many
// consecutive polls.
const NATIVE_REFRESH_STABLE_TICKS = 4;

// Hide ADO's native file content while Review overlays it, using visibility
// (NOT display) so ADO keeps laying it out — display:none broke ADO's rendering
// and left blank panes. Toggled via a class so there's no per-element tracking
// to get out of sync; removing the class instantly restores everything.
function ensureHostStyle(): void {
    if (document.getElementById(HOST_STYLE_ID)) {
        return;
    }
    const style = document.createElement('style');
    style.id = HOST_STYLE_ID;
    style.textContent = `.${HOST_CLASS} > :not([data-ado-companion="review-island"]) { visibility: hidden !important; }`;
    document.head.appendChild(style);
}

// Keystrokes typed in the island must not reach ADO's document-level keyboard
// handlers (which otherwise steal focus to the global search box).
const KEY_EVENTS = ['keydown', 'keyup', 'keypress', 'input', 'paste'] as const;

// Review-mode intent, kept across the per-file remounts the reconcile loop does
// when ADO navigates to another file in the tree — so Review stays "on" while
// you browse files. Cleared only when the user picks another view.
let stickyPrId: number | null = null;

// Set when the user creates a thread inside Review. ADO's native file views
// render externally-created threads collapsed (and omit them from the file
// tree) until a fresh discussion fetch — re-selecting the open file forces that
// fetch. We defer it until the user leaves Review for a native view so Review
// itself isn't torn down mid-session.
let pendingNativeRefresh = false;

function isElement(node: EventTarget): node is HTMLElement {
    return node instanceof HTMLElement;
}

/**
 * Force ADO to re-fetch the open file's discussions so threads created in
 * Review render expanded (and appear in the file tree) in the native view the
 * user just switched to. Re-selecting the already-open file in ADO's tree is
 * what triggers a fresh fetch — but it must happen AFTER the native editor has
 * mounted and rendered its (collapsed) discussion widgets, otherwise the
 * re-fetch only updates the file tree and the editor still shows collapsed. So
 * poll for the native discussion widgets (capped) before re-selecting.
 */
function refreshNativeDiscussions(): void {
    let attempts = 0;
    let lastCount = -1;
    let stableTicks = 0;
    const tryRefresh = (): void => {
        attempts += 1;
        const row = document.querySelector<HTMLElement>(SELECTED_FILE_ROW_SELECTOR);
        const count = document.querySelectorAll(NATIVE_DISCUSSION_SELECTOR).length;
        if (count > 0 && count === lastCount) {
            stableTicks += 1;
        } else {
            stableTicks = 0;
        }
        lastCount = count;
        const settled = count > 0 && stableTicks >= NATIVE_REFRESH_STABLE_TICKS;
        if (row && (settled || attempts >= NATIVE_REFRESH_MAX_POLLS)) {
            row.click();
            return;
        }
        if (attempts < NATIVE_REFRESH_MAX_POLLS) {
            window.setTimeout(tryRefresh, NATIVE_REFRESH_POLL_MS);
        }
    };
    window.setTimeout(tryRefresh, NATIVE_REFRESH_POLL_MS);
}

/** Close ADO's open view menu the way it expects (Escape on the menu). */
function closeViewMenu(): void {
    const menu = document.getElementById(VIEW_MENU_ID);
    menu?.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }),
    );
}

/**
 * Adds a native "Review" entry to ADO's view-switcher dropdown (beside
 * Side-by-side / Inline / Raw content / Preview). Choosing it overlays our
 * rendered-Markdown review island on the file-content pane (leaving the file
 * tree and toolbar intact); choosing any other view exits Review.
 */
export function createReviewEnhancer(): SurfaceEnhancer {
    return {
        id: 'review',
        anchor: TOOLBAR_SELECTOR,
        matches(url: string): string | null {
            const context = parsePrContext(url);
            return context ? `${context.pullRequestId}:${context.filePath}` : null;
        },
        mount(_key: string, toolbar: HTMLElement): MountResult {
            const context = parsePrContext(window.location.href);

            // Hidden sentinel in the toolbar: our marker for the reconcile loop.
            const marker = document.createElement('span');
            marker.dataset['adoCompanion'] = 'review-marker';
            marker.style.display = 'none';
            toolbar.appendChild(marker);

            let island: HTMLElement | null = null;
            let dispose: (() => void) | null = null;
            let hostPane: HTMLElement | null = null;
            let savedMainLabel: string | null = null;
            let savedMainIcon: string | null = null;

            function isActive(): boolean {
                return island !== null;
            }

            // Reflect "Review" on the split button's main label + icon while active.
            function setMainButton(toReview: boolean): void {
                const label = document.querySelector<HTMLElement>(
                    `${VIEW_MAIN_SELECTOR} .bolt-button-text`,
                );
                const icon = document.querySelector<HTMLElement>(
                    `${VIEW_MAIN_SELECTOR} .fabric-icon`,
                );
                if (toReview) {
                    if (label && savedMainLabel === null) {
                        savedMainLabel = label.textContent;
                        label.textContent = 'Review';
                    }
                    if (icon && savedMainIcon === null) {
                        savedMainIcon = icon.className;
                        icon.className = icon.className.replace(/ms-Icon--\S+/, 'ms-Icon--Comment');
                    }
                } else {
                    if (label && savedMainLabel !== null) {
                        label.textContent = savedMainLabel;
                    }
                    if (icon && savedMainIcon !== null) {
                        icon.className = savedMainIcon;
                    }
                    savedMainLabel = null;
                    savedMainIcon = null;
                }
            }

            function markMenuItemSelected(): void {
                document
                    .getElementById(REVIEW_ITEM_ID)
                    ?.setAttribute('aria-checked', isActive() ? 'true' : 'false');
            }

            function deactivate(clearIntent: boolean): void {
                if (clearIntent) {
                    stickyPrId = null;
                }
                if (!isActive()) {
                    return;
                }
                dispose?.();
                dispose = null;
                island?.remove();
                island = null;
                hostPane?.classList.remove(HOST_CLASS);
                hostPane = null;
                setMainButton(false);
                markMenuItemSelected();
            }

            function activate(): void {
                if (isActive() || !context) {
                    return;
                }
                const pane = document.querySelector<HTMLElement>(FLEX_PANE_SELECTOR);
                if (!pane) {
                    return;
                }
                stickyPrId = context.pullRequestId;

                // Cover ADO's native content with an opaque overlay and hide that
                // content (visibility, via a class) so ADO's inline comment threads
                // don't bleed through — without breaking ADO's layout.
                ensureHostStyle();
                hostPane = pane;
                pane.classList.add(HOST_CLASS);
                island = document.createElement('div');
                island.dataset['adoCompanion'] = 'review-island';
                island.dataset['file'] = context.filePath;
                island.style.position = 'absolute';
                island.style.inset = '0';
                island.style.zIndex = '4';
                island.style.background = 'var(--background-color, #ffffff)';
                for (const type of KEY_EVENTS) {
                    island.addEventListener(type, (event) => event.stopPropagation());
                }

                const shadow = island.attachShadow({ mode: 'open' });
                const style = document.createElement('style');
                style.textContent = reviewStyles;
                const mountPoint = document.createElement('div');
                mountPoint.style.height = '100%';
                shadow.append(style, mountPoint);
                pane.appendChild(island);

                dispose = render(
                    () => (
                        <ReviewView
                            context={context}
                            onThreadCreated={() => {
                                pendingNativeRefresh = true;
                            }}
                        />
                    ),
                    mountPoint,
                );
                setMainButton(true);
                markMenuItemSelected();
            }

            function injectReviewMenuItem(): void {
                const menu = document.getElementById(VIEW_MENU_ID);
                if (!menu || document.getElementById(REVIEW_ITEM_ID)) {
                    markMenuItemSelected();
                    return;
                }
                const tbody = menu.querySelector('tbody');
                const template = menu.querySelector<HTMLElement>('tr.bolt-menuitem-row');
                if (!tbody || !template) {
                    return;
                }
                const row = template.cloneNode(true) as HTMLElement;
                row.id = REVIEW_ITEM_ID;
                row.classList.remove('focused', 'selected');
                row.setAttribute('aria-checked', isActive() ? 'true' : 'false');
                const icon = row.querySelector<HTMLElement>('.fabric-icon');
                if (icon) {
                    icon.className = icon.className.replace(/ms-Icon--\S+/, 'ms-Icon--Comment');
                }
                const text = row.querySelector<HTMLElement>('.bolt-menuitem-cell-text');
                if (text) {
                    text.textContent = 'Review';
                }
                row.addEventListener('click', (event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    closeViewMenu();
                    activate();
                });
                tbody.appendChild(row);
            }

            // The menu renders in a portal a frame or two after the chevron click.
            function onChevronClick(event: Event): void {
                const target = event.target;
                if (!(target instanceof HTMLElement) || !target.closest(VIEW_CHEVRON_SELECTOR)) {
                    return;
                }
                let attempts = 0;
                const tryInject = (): void => {
                    attempts += 1;
                    if (document.getElementById(VIEW_MENU_ID)) {
                        injectReviewMenuItem();
                        return;
                    }
                    if (attempts < 12) {
                        requestAnimationFrame(tryInject);
                    }
                };
                requestAnimationFrame(tryInject);
            }

            // Selecting any native view (menu item or the main button) exits Review.
            function onExitClick(event: Event): void {
                if (!isActive()) {
                    return;
                }
                const path = event.composedPath();
                if (path.some((node) => isElement(node) && node.id === REVIEW_ITEM_ID)) {
                    return;
                }
                const inNativeMenuItem =
                    path.some((node) => isElement(node) && node.id === VIEW_MENU_ID) &&
                    path.some(
                        (node) => isElement(node) && node.classList.contains('bolt-menuitem-row'),
                    );
                const inMainButton = path.some(
                    (node) => isElement(node) && node.classList.contains('bolt-split-button-main'),
                );
                if (inNativeMenuItem || inMainButton) {
                    deactivate(true);
                    if (pendingNativeRefresh) {
                        pendingNativeRefresh = false;
                        refreshNativeDiscussions();
                    }
                }
            }

            document.addEventListener('click', onChevronClick, true);
            document.addEventListener('click', onExitClick, true);

            // Stay in Review across file navigation: if the user was in Review,
            // re-enter it for the newly-loaded file once its pane is present.
            if (context && stickyPrId === context.pullRequestId) {
                let attempts = 0;
                const tryActivate = (): void => {
                    if (isActive()) {
                        return;
                    }
                    if (document.querySelector(FLEX_PANE_SELECTOR)) {
                        activate();
                        return;
                    }
                    attempts += 1;
                    if (attempts < 40) {
                        requestAnimationFrame(tryActivate);
                    }
                };
                requestAnimationFrame(tryActivate);
            }

            return {
                marker,
                cleanup(): void {
                    document.removeEventListener('click', onChevronClick, true);
                    document.removeEventListener('click', onExitClick, true);
                    deactivate(false);
                    document.getElementById(REVIEW_ITEM_ID)?.remove();
                    marker.remove();
                },
            };
        },
    };
}
