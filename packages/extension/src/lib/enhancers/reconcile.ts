import type { SurfaceEnhancer } from './types';

export interface ReconcilePlan {
    /** Enhancer ids whose current mount should be torn down. */
    unmount: string[];
    /** Enhancers to mount, with the key they matched. */
    mount: Array<{ id: string; key: string }>;
}

/**
 * Decide which enhancers to mount/unmount for the current URL, given the
 * currently-active keys and whether each anchor is present. Pure — the host
 * executes the plan (running cleanups / awaiting mounts).
 */
export function planReconcile(
    enhancers: readonly SurfaceEnhancer[],
    activeKeys: ReadonlyMap<string, string>,
    url: string,
    hasAnchor: (selector: string) => boolean,
): ReconcilePlan {
    const plan: ReconcilePlan = { unmount: [], mount: [] };

    for (const enhancer of enhancers) {
        const key = enhancer.matches(url);
        const activeKey = activeKeys.get(enhancer.id) ?? null;

        if (key === null) {
            if (activeKey !== null) {
                plan.unmount.push(enhancer.id);
            }
            continue;
        }

        if (activeKey === key) {
            continue;
        }

        // Newly active, or the key changed (e.g. switched to another file).
        if (activeKey !== null) {
            plan.unmount.push(enhancer.id);
        }
        if (hasAnchor(enhancer.anchor)) {
            plan.mount.push({ id: enhancer.id, key });
        }
    }

    return plan;
}

/**
 * Active mounts whose marker node is no longer in the document (ADO re-rendered
 * and wiped our injection) — the host should clean these up so they re-mount.
 */
export function findStale(
    active: ReadonlyMap<string, { marker: Node }>,
    isPresent: (node: Node) => boolean,
): string[] {
    const stale: string[] = [];
    for (const [id, entry] of active) {
        if (!isPresent(entry.marker)) {
            stale.push(id);
        }
    }
    return stale;
}
