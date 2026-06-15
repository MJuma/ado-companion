// Pure assembly of the payload for a new comment thread created from a document
// selection, so the glue path (threadContext + highlight property) is testable.

import { ThreadStatus } from '../ado/pr-types';
import { buildLineThreadContext } from '../ado/threads';
import type { NewThreadInput } from '../ado/threads';
import { serializeHighlightProp } from '../markdown/highlight';

/** ADO thread property key holding our serialized text-highlight anchor. */
export const HIGHLIGHT_PROP = 'ADOCompanion.Highlight';

// ADO's web UI sets this on every thread it creates; without it (and with a
// real character range) native views render our threads collapsed/legacy.
const SUPPORTS_MARKDOWN_PROP = 'Microsoft.TeamFoundation.Discussion.SupportsMarkdown';

export interface NewThreadTarget {
    startLine: number;
    endLine: number;
    /** Source length of the end line, so the thread spans a real (non-empty) range. */
    endLineLength?: number;
    /** The selected rendered text to highlight (omitted for whole-line). */
    quote?: string;
    /** Character offset of the selection start within the block (disambiguation). */
    quoteOffset?: number;
}

/**
 * Build the `createThread` input for a selection: an Active thread anchored to
 * the selected source line range (spanning the whole end line so ADO's native
 * views anchor + expand it like their own comments), tagged as markdown, plus —
 * when a phrase was selected — our highlight property for re-highlighting.
 */
export function buildNewThreadInput(
    filePath: string,
    content: string,
    target: NewThreadTarget,
): NewThreadInput {
    const properties: Record<string, string | number> = { [SUPPORTS_MARKDOWN_PROP]: 1 };
    if (target.quote) {
        properties[HIGHLIGHT_PROP] = serializeHighlightProp(target.quote, target.quoteOffset ?? 0);
    }
    return {
        content,
        status: ThreadStatus.Active,
        threadContext: buildLineThreadContext(
            filePath,
            target.startLine,
            target.endLine,
            (target.endLineLength ?? 0) + 1,
        ),
        properties,
    };
}
