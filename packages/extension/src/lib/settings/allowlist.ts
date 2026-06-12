export interface ReviewSettings {
    /** Master on/off switch for ADO Companion's page enhancements. */
    enabled: boolean;
    /**
     * Optional host/org allowlist. Empty (the default) means every matched
     * Azure DevOps host is allowed; otherwise the URL's `host` + path must
     * contain one of these entries (e.g. `dev.azure.com`, an org name, or
     * `myorg.visualstudio.com`).
     */
    allowlist: string[];
}

export const DEFAULT_SETTINGS: ReviewSettings = {
    enabled: true,
    allowlist: [],
};

/**
 * Whether the extension should activate on the given URL per the user's
 * settings. Disabled → never; empty allowlist → always; otherwise the URL's
 * host+path must contain one of the (trimmed, case-insensitive) entries.
 */
export function isUrlAllowed(rawUrl: string, settings: ReviewSettings): boolean {
    if (!settings.enabled) {
        return false;
    }
    const entries = settings.allowlist
        .map((entry) => entry.trim().toLowerCase())
        .filter((entry) => entry.length > 0);
    if (entries.length === 0) {
        return true;
    }
    let target: string;
    try {
        const url = new URL(rawUrl);
        target = `${url.hostname}${url.pathname}`.toLowerCase();
    } catch {
        return false;
    }
    return entries.some((entry) => target.includes(entry));
}
