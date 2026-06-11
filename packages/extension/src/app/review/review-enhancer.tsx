import { render } from 'solid-js/web';

import { parsePrContext } from '../../lib/ado/pr';
import type { MountResult, SurfaceEnhancer } from '../../lib/enhancers/types';

import { ReviewView } from './ReviewView';
import { reviewStyles } from './review-styles';

const TOOLBAR_SELECTOR = '.repos-compare-toolbar';
const CONTENT_SELECTOR = '.repos-changes-explorer-splitter';

/**
 * Adds a native "Review" toggle to the PR file toolbar (beside Raw content /
 * Preview). When active, it hides ADO's file content and mounts our rendered
 * Markdown island (Shadow DOM) in its place.
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

            const button = document.createElement('button');
            button.type = 'button';
            button.dataset['adoCompanion'] = 'review-toggle';
            button.className = 'bolt-button enabled bolt-focus-treatment';
            button.style.marginLeft = '8px';
            button.textContent = 'Review';
            button.setAttribute('aria-pressed', 'false');

            let island: HTMLElement | null = null;
            let dispose: (() => void) | null = null;
            let hidden: HTMLElement[] = [];

            function deactivate(): void {
                dispose?.();
                dispose = null;
                island?.remove();
                island = null;
                for (const el of hidden) {
                    el.style.removeProperty('display');
                }
                hidden = [];
                button.setAttribute('aria-pressed', 'false');
            }

            function activate(): void {
                const content = document.querySelector<HTMLElement>(CONTENT_SELECTOR);
                if (!content || !context) {
                    return;
                }

                hidden = Array.from(content.children).filter(
                    (child): child is HTMLElement => child instanceof HTMLElement,
                );
                for (const el of hidden) {
                    el.style.display = 'none';
                }

                island = document.createElement('div');
                island.dataset['adoCompanion'] = 'review-island';
                island.style.height = '100%';
                const shadow = island.attachShadow({ mode: 'open' });
                const style = document.createElement('style');
                style.textContent = reviewStyles;
                const mountPoint = document.createElement('div');
                mountPoint.style.height = '100%';
                shadow.append(style, mountPoint);
                content.appendChild(island);

                dispose = render(() => <ReviewView context={context} />, mountPoint);
                button.setAttribute('aria-pressed', 'true');
            }

            button.addEventListener('click', () => {
                if (island) {
                    deactivate();
                } else {
                    activate();
                }
            });

            toolbar.appendChild(button);

            return {
                marker: button,
                cleanup(): void {
                    deactivate();
                    button.remove();
                },
            };
        },
    };
}
