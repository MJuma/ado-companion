// Pure assembly of the payload for a new comment thread created from a document
// selection, so the glue path (threadContext + highlight property) is testable.

import { ThreadStatus } from '../ado/pr-types';
import { buildLineThreadContext } from '../ado/threads';
import type { NewThreadInput } from '../ado/threads';
import { phraseSourceRange, serializeHighlightProp } from '../markdown/highlight';

/** ADO thread property key holding our serialized text-highlight anchor. */
export const HIGHLIGHT_PROP = 'ADOCompanion.Highlight';

// ADO's web UI sets this on every thread it creates; mirror it so native views
// treat our threads as first-class markdown comments.
const SUPPORTS_MARKDOWN_PROP = 'Microsoft.TeamFoundation.Discussion.SupportsMarkdown';

export interface NewThreadTarget {
    startLine: number;
    endLine: number;
    /** Raw source text of the start line, to anchor a single-line phrase exactly. */
    sourceLine?: string;
    /** The selected rendered text to highlight (omitted for whole-line). */
    quote?: string;
    /** Character offset of the selection start within the block (disambiguation). */
    quoteOffset?: number;
}

/**
 * Build the `createThread` input for a selection. For a single-line selection we
 * anchor the thread to the exact source columns of the selected phrase so ADO's
 * native views highlight just that phrase (not the whole row); multi-line or
 * unlocatable selections fall back to a line-level anchor. Always tagged as
 * markdown, plus — when a phrase was selected — our highlight property for
 * re-highlighting the precise rendered span in the Review view.
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
    const range =
        target.startLine === target.endLine
            ? phraseSourceRange(target.sourceLine, target.quote, target.quoteOffset ?? 0)
            : null;
    const threadContext = range
        ? buildLineThreadContext(
              filePath,
              target.startLine,
              target.endLine,
              range.endOffset,
              range.startOffset,
          )
        : buildLineThreadContext(filePath, target.startLine, target.endLine);
    return {
        content,
        status: ThreadStatus.Active,
        threadContext,
        properties,
    };
}
