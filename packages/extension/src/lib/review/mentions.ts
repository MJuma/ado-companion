// Pure helpers for @mention support in the comment composer.
//
// ADO stores a mention in comment content as `@<GUID>` (the identity's GUID).
// While composing we show a readable `@Display Name` instead, then swap each
// one to `@<GUID>` on submit. A small name cache lets us render `@<GUID>` tokens
// found in fetched comments back to readable names (for identities we've seen).

const MENTION_TOKEN = /@<([0-9A-Fa-f]{8}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{12})>/g;

export interface MentionQuery {
    /** The text typed after `@`, up to the caret. */
    query: string;
    /** Index of the triggering `@` in the value. */
    start: number;
}

/**
 * If the caret sits inside an active `@mention` token, return the query text and
 * the `@` index; otherwise null. The `@` must start the value or follow
 * whitespace or `(` so email addresses don't trigger it.
 */
export function findMentionQuery(value: string, caret: number): MentionQuery | null {
    const head = value.slice(0, Math.max(0, caret));
    const at = head.lastIndexOf('@');
    if (at < 0) {
        return null;
    }
    if (at > 0 && !/[\s(]/.test(head[at - 1] ?? '')) {
        return null;
    }
    const query = head.slice(at + 1);
    if (query.length > 50 || /[\n<>@]/.test(query)) {
        return null;
    }
    return { query, start: at };
}

export interface MentionSelection {
    value: string;
    cursor: number;
    token: string;
}

/**
 * Replace the `@query` region `[start, caret)` with `@displayName ` and return
 * the new value, caret position, and the inserted token (for later encoding).
 */
export function applyMentionSelection(
    value: string,
    start: number,
    caret: number,
    displayName: string,
): MentionSelection {
    const token = `@${displayName}`;
    const after = value.slice(Math.max(caret, start));
    const insertion = /^\s/.test(after) ? token : `${token} `;
    const next = `${value.slice(0, start)}${insertion}${after}`;
    return { value: next, cursor: start + insertion.length, token };
}

export interface PendingMention {
    /** The readable token inserted into the text, e.g. `@Jane Doe`. */
    token: string;
    guid: string;
}

/**
 * Swap each readable `@Display Name` token back to `@<GUID>` for submission.
 * Longer tokens are processed first so a shorter name that prefixes a longer one
 * doesn't match it by mistake; each pending entry consumes one occurrence.
 */
export function encodeMentions(content: string, pending: readonly PendingMention[]): string {
    const ordered = [...pending].sort((a, b) => b.token.length - a.token.length);
    let result = content;
    for (const mention of ordered) {
        const index = result.indexOf(mention.token);
        if (index >= 0) {
            result =
                result.slice(0, index) +
                `@<${mention.guid}>` +
                result.slice(index + mention.token.length);
        }
    }
    return result;
}

const nameCache = new Map<string, string>();

/** Remember a GUID→display-name mapping so fetched mentions can render as names. */
export function cacheMentionName(guid: string, displayName: string): void {
    nameCache.set(guid.toLowerCase(), displayName);
}

/** Look up a cached display name for a mention GUID. */
export function resolveMentionName(guid: string): string | undefined {
    return nameCache.get(guid.toLowerCase());
}

/** Clear the mention name cache (test helper). */
export function clearMentionNames(): void {
    nameCache.clear();
}

/**
 * Replace `@<GUID>` tokens in raw comment content with readable `@Name` text
 * (markdown-safe) before rendering, using the name cache when available.
 */
export function renderMentions(content: string): string {
    return content.replace(MENTION_TOKEN, (_match, guid: string) => {
        const name = resolveMentionName(guid);
        return name ? `@${name}` : '@mention';
    });
}
