// A small registry for "surface enhancers" — units that inject native-looking UI
// into specific Azure DevOps pages. Built to grow: future ADO page enhancements
// register here rather than as one-off content-script hacks.

/**
 * The primary injected node, used to detect when ADO's SPA re-renders and wipes
 * our injection (so the host can re-mount).
 */
export interface MountResult {
    cleanup: () => void;
    marker: Node;
}

export interface SurfaceEnhancer {
    /** Stable id; at most one active mount per id. */
    id: string;
    /** CSS selector for the injection anchor; must exist before mounting. */
    anchor: string;
    /** Return a stable key when this enhancer should be active for `url`, else null. */
    matches(url: string): string | null;
    /** Inject into the page. Called when the key changes and the anchor is present. */
    mount(key: string, anchor: HTMLElement): MountResult | Promise<MountResult>;
}
