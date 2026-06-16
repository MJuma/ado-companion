// Pure logic for the PR Overview timeline filter: categorize a timeline event
// and decide its visibility under a selected tab. DOM extraction lives in the
// enhancer (src/app/timeline); this module only works on extracted features and
// API data so it stays framework-free and testable.
//
// Comment authorship can't be read reliably from the DOM — ADO virtualizes the
// activity feed, so a collapsed/off-screen comment row renders only the "Write a
// reply" box (the current user's avatar), not the author's. Instead we fetch the
// PR threads via the API and build a timestamp→isBot map; each timeline row
// carries the event's epoch-second timestamp as an element id we look up.

/** The bucket a timeline event falls into. */
export type TimelineCategory = 'comment' | 'commit' | 'action' | 'system';

/** A selectable filter tab. */
export type TimelineTab = 'all' | 'actions' | 'commits' | 'comments' | 'system';

export interface TimelineTabDef {
    id: TimelineTab;
    label: string;
}

/** Tabs in display order, shown beside ADO's "Show everything" dropdown. */
export const TIMELINE_TABS: readonly TimelineTabDef[] = [
    { id: 'all', label: 'All' },
    { id: 'actions', label: 'Actions' },
    { id: 'commits', label: 'Commits' },
    { id: 'comments', label: 'Comments' },
    { id: 'system', label: 'System Messages' },
];

/**
 * Whether an identity descriptor belongs to a service/bot account. ADO prefixes
 * descriptors by type: `aad.`/`msa.` are real users; `svc.` (service) and
 * `s2s.` (service-to-service) are automated accounts (build service, pipelines,
 * GitOps, bots…). Unknown/missing prefixes are treated as human.
 */
export function isBotDescriptor(descriptor: string | null | undefined): boolean {
    return descriptor !== null && descriptor !== undefined && /^(svc|s2s)\./i.test(descriptor);
}

/** Convert an ISO date string to whole epoch seconds, or null if unparseable. */
export function toEpochSeconds(date: string | null | undefined): number | null {
    if (!date) {
        return null;
    }
    const ms = new Date(date).getTime();
    return Number.isNaN(ms) ? null : Math.floor(ms / 1000);
}

// Minimal shape of a PR thread needed to classify comment authorship (a subset
// of `CommentThread`, so the API result can be passed directly).
interface AuthoredComment {
    author?: { descriptor?: string };
    publishedDate?: string;
    lastUpdatedDate?: string;
}
interface AuthoredThread {
    comments: readonly AuthoredComment[];
}

/**
 * Map every comment timestamp (epoch seconds) of every thread to whether that
 * thread's author is a bot. Timeline rows key on a comment's timestamp, so this
 * lets us classify a row by its `id` regardless of whether ADO has rendered the
 * author. A thread's first comment determines authorship for the whole thread.
 */
export function buildBotByTimestamp(threads: readonly AuthoredThread[]): Map<number, boolean> {
    const map = new Map<number, boolean>();
    for (const thread of threads) {
        const first = thread.comments[0];
        if (!first) {
            continue;
        }
        const bot = isBotDescriptor(first.author?.descriptor);
        for (const comment of thread.comments) {
            const published = toEpochSeconds(comment.publishedDate);
            if (published !== null) {
                map.set(published, bot);
            }
            const updated = toEpochSeconds(comment.lastUpdatedDate);
            if (updated !== null && !map.has(updated)) {
                map.set(updated, bot);
            }
        }
    }
    return map;
}

/**
 * Look up whether the thread at `timestamp` is bot-authored, tolerating a small
 * skew between the DOM row id and the API timestamp. Defaults to human.
 */
export function lookupBot(map: ReadonlyMap<number, boolean>, timestamp: number | null): boolean {
    if (timestamp === null) {
        return false;
    }
    for (let delta = -2; delta <= 2; delta += 1) {
        const hit = map.get(timestamp + delta);
        if (hit !== undefined) {
            return hit;
        }
    }
    return false;
}

export interface TimelineRowFeatures {
    /** The row is a discussion comment thread (Chat marker). */
    isComment: boolean;
    /** The row is a pushed-commits iteration. */
    isCommit: boolean;
    /** Whether a comment row's thread author is a service/bot account. */
    isBot: boolean;
}

/**
 * Categorize a timeline row. Comments split by author: bot/service comments are
 * "system messages", human comments are "comments". Pushed-commit iterations are
 * "commits"; everything else (votes, reviewer/policy/lifecycle changes, target-
 * branch updates…) is an "action".
 */
export function categorizeRow(features: TimelineRowFeatures): TimelineCategory {
    if (features.isComment) {
        return features.isBot ? 'system' : 'comment';
    }
    if (features.isCommit) {
        return 'commit';
    }
    return 'action';
}

/** Whether a row of `category` is shown when `tab` is the active filter. */
export function isVisibleUnder(tab: TimelineTab, category: TimelineCategory): boolean {
    switch (tab) {
        case 'all':
            return true;
        case 'actions':
            return category === 'action';
        case 'commits':
            return category === 'commit';
        case 'comments':
            return category === 'comment';
        case 'system':
            return category === 'system';
    }
}
