// Relative + absolute timestamp formatting for comments, matching the style ADO
// uses ("Just now", "3m ago", …) with a full date for the hover tooltip.

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/**
 * A short relative time like "Just now", "5m ago", "3h ago", "2d ago", falling
 * back to a localized date for anything older than a week. Future or unparseable
 * dates render as "Just now".
 */
export function relativeTime(iso: string, now: number): string {
    const then = Date.parse(iso);
    if (Number.isNaN(then)) {
        return '';
    }
    const diff = now - then;
    if (diff < MINUTE) {
        return 'Just now';
    }
    if (diff < HOUR) {
        return `${Math.floor(diff / MINUTE)}m ago`;
    }
    if (diff < DAY) {
        return `${Math.floor(diff / HOUR)}h ago`;
    }
    if (diff < 7 * DAY) {
        return `${Math.floor(diff / DAY)}d ago`;
    }
    return new Date(then).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    });
}

/** A full, localized date-time string for the tooltip, or '' if unparseable. */
export function absoluteTime(iso: string): string {
    const then = Date.parse(iso);
    if (Number.isNaN(then)) {
        return '';
    }
    return new Date(then).toLocaleString();
}
