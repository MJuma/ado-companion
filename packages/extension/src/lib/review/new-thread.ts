// Pure assembly of the payload for a new comment thread created from a document
// selection, so the glue path (threadContext + highlight property) is testable.

import { ThreadStatus } from '../ado/pr-types';
import { buildLineThreadContext } from '../ado/threads';
import type { NewThreadInput } from '../ado/threads';
import { serializeHighlightProp } from '../markdown/highlight';

/** ADO thread property key holding our serialized text-highlight anchor. */
export const HIGHLIGHT_PROP = 'ADOCompanion.Highlight';

export interface NewThreadTarget {
    startLine: number;
    endLine: number;
    /** The selected rendered text to highlight (omitted for whole-line). */
    quote?: string;
    /** Character offset of the selection start within the block (disambiguation). */
    quoteOffset?: number;
}

/**
 * Build the `createThread` input for a selection: an Active thread anchored to
 * the selected source line range, plus — when a phrase was selected — our
 * highlight property so the exact span can be re-highlighted on render.
 */
export function buildNewThreadInput(
    filePath: string,
    content: string,
    target: NewThreadTarget,
): NewThreadInput {
    const input: NewThreadInput = {
        content,
        status: ThreadStatus.Active,
        threadContext: buildLineThreadContext(filePath, target.startLine, target.endLine),
    };
    if (target.quote) {
        input.properties = {
            [HIGHLIGHT_PROP]: serializeHighlightProp(target.quote, target.quoteOffset ?? 0),
        };
    }
    return input;
}
