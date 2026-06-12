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

// Keystrokes typed in the island must not reach ADO's document-level keyboard
// handlers (which otherwise steal focus to the global search box).
const KEY_EVENTS = ['keydown', 'keyup', 'keypress', 'input', 'paste'] as const;

function isElement(node: EventTarget): node is HTMLElement {
    return node instanceof HTMLElement;
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
            let hiddenSiblings: HTMLElement[] = [];
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

            function deactivate(): void {
                if (!isActive()) {
                    return;
                }
                dispose?.();
                dispose = null;
                island?.remove();
                island = null;
                for (const el of hiddenSiblings) {
                    el.style.removeProperty('display');
                }
                hiddenSiblings = [];
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

                // The overlay covers the native content; also hide it so it can't
                // catch scroll/focus underneath.
                hiddenSiblings = Array.from(pane.children).filter(
                    (child): child is HTMLElement => child instanceof HTMLElement,
                );
                for (const el of hiddenSiblings) {
                    el.style.display = 'none';
                }

                island = document.createElement('div');
                island.dataset['adoCompanion'] = 'review-island';
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

                dispose = render(() => <ReviewView context={context} />, mountPoint);
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
                    deactivate();
                }
            }

            document.addEventListener('click', onChevronClick, true);
            document.addEventListener('click', onExitClick, true);

            return {
                marker,
                cleanup(): void {
                    document.removeEventListener('click', onChevronClick, true);
                    document.removeEventListener('click', onExitClick, true);
                    deactivate();
                    document.getElementById(REVIEW_ITEM_ID)?.remove();
                    marker.remove();
                },
            };
        },
    };
}
