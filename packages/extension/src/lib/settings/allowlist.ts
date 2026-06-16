import type { CompanionSettings } from './model';

/**
 * Whether the extension should activate on the given URL per the user's
 * settings. Disabled → never; empty allowlist → always; otherwise the URL's
 * host+path must contain one of the (trimmed, case-insensitive) entries.
 */
export function isUrlAllowed(
    rawUrl: string,
    settings: Pick<CompanionSettings, 'enabled' | 'allowlist'>,
): boolean {
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
