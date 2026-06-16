import { defineContentScript } from 'wxt/utils/define-content-script';

import { createReviewEnhancer } from '../app/review/review-enhancer';
import { createTimelineEnhancer } from '../app/timeline/timeline-enhancer';
import { findStale, planReconcile } from '../lib/enhancers/reconcile';
import type { SurfaceEnhancer } from '../lib/enhancers/types';
import { DEFAULT_SETTINGS, isUrlAllowed } from '../lib/settings/allowlist';
import { loadSettings, watchSettings } from '../lib/settings/settings';

interface ActiveMount {
    key: string;
    cleanup: () => void;
    marker: Node;
}

export default defineContentScript({
    matches: ['https://dev.azure.com/*', 'https://*.visualstudio.com/*'],
    main() {
        const enhancers: SurfaceEnhancer[] = [createReviewEnhancer(), createTimelineEnhancer()];
        const active = new Map<string, ActiveMount>();
        let timer: ReturnType<typeof setTimeout> | undefined;
        let running = false;
        let settings = DEFAULT_SETTINGS;

        void loadSettings().then((loaded) => {
            settings = loaded;
            schedule();
        });
        watchSettings((updated) => {
            settings = updated;
            schedule();
        });

        function schedule(): void {
            if (timer !== undefined) {
                return;
            }
            timer = setTimeout(() => {
                timer = undefined;
                void tick();
            }, 150);
        }

        async function tick(): Promise<void> {
            if (running) {
                schedule();
                return;
            }
            running = true;
            try {
                // Re-mount anything ADO's SPA re-rendered out from under us.
                for (const id of findStale(active, (node) => document.contains(node))) {
                    active.get(id)?.cleanup();
                    active.delete(id);
                }

                // Honor the enabled toggle + optional host allowlist.
                if (!isUrlAllowed(window.location.href, settings)) {
                    for (const entry of active.values()) {
                        entry.cleanup();
                    }
                    active.clear();
                    return;
                }

                const activeKeys = new Map(
                    Array.from(active, ([id, entry]) => [id, entry.key] as const),
                );
                const plan = planReconcile(
                    enhancers,
                    activeKeys,
                    window.location.href,
                    (selector) => document.querySelector(selector) !== null,
                );

                for (const id of plan.unmount) {
                    active.get(id)?.cleanup();
                    active.delete(id);
                }
                for (const { id, key } of plan.mount) {
                    const enhancer = enhancers.find((candidate) => candidate.id === id);
                    const anchor = enhancer
                        ? document.querySelector<HTMLElement>(enhancer.anchor)
                        : null;
                    if (!enhancer || !anchor) {
                        continue;
                    }
                    const result = await enhancer.mount(key, anchor);
                    active.set(id, { key, cleanup: result.cleanup, marker: result.marker });
                }
            } finally {
                running = false;
            }
        }

        schedule();
        const observer = new MutationObserver(() => schedule());
        observer.observe(document.body, { childList: true, subtree: true });
    },
});
