import { describe, expect, it } from 'vitest';

import { ThreadStatus } from '../ado/pr-types';

import { buildNewThreadInput, HIGHLIGHT_PROP } from './new-thread';

const FILE = '/docs/spec.md';
const SUPPORTS_MARKDOWN_PROP = 'Microsoft.TeamFoundation.Discussion.SupportsMarkdown';

describe('buildNewThreadInput', () => {
    it('anchors a single-line phrase to its exact source columns', () => {
        const input = buildNewThreadInput(FILE, 'a note', {
            startLine: 12,
            endLine: 12,
            sourceLine: 'the quick brown fox jumps',
            quote: 'brown fox',
            quoteOffset: 10,
        });

        expect(input.content).toBe('a note');
        expect(input.status).toBe(ThreadStatus.Active);
        expect(input.threadContext?.filePath).toBe(FILE);
        // 'brown fox' starts at index 10 (1-based column 11) and is 9 chars long.
        expect(input.threadContext?.rightFileStart).toEqual({ line: 12, offset: 11 });
        expect(input.threadContext?.rightFileEnd).toEqual({ line: 12, offset: 20 });
    });

    it('falls back to a line-level anchor when the phrase is not in the source line', () => {
        const input = buildNewThreadInput(FILE, 'note', {
            startLine: 5,
            endLine: 5,
            sourceLine: 'plain text without the phrase',
            quote: 'rendered **bold** that differs',
            quoteOffset: 0,
        });

        // Unlocatable phrase → degenerate line anchor, not a whole-row highlight.
        expect(input.threadContext?.rightFileStart).toEqual({ line: 5, offset: 1 });
        expect(input.threadContext?.rightFileEnd).toEqual({ line: 5, offset: 1 });
    });

    it('anchors a multi-line selection across the line range without a column span', () => {
        const input = buildNewThreadInput(FILE, 'note', {
            startLine: 45,
            endLine: 47,
            sourceLine: 'first line of the selection',
            quote: 'first line of the selection and more',
        });

        expect(input.threadContext?.rightFileStart).toEqual({ line: 45, offset: 1 });
        expect(input.threadContext?.rightFileEnd).toEqual({ line: 47, offset: 1 });
    });

    it('always tags the thread as markdown-capable', () => {
        const input = buildNewThreadInput(FILE, 'note', { startLine: 5, endLine: 9 });
        expect(input.properties?.[SUPPORTS_MARKDOWN_PROP]).toBe(1);
    });

    it('attaches the highlight property when a phrase was selected', () => {
        const input = buildNewThreadInput(FILE, 'note', {
            startLine: 5,
            endLine: 5,
            sourceLine: 'here is some phrase to find',
            quote: 'some phrase',
            quoteOffset: 7,
        });

        expect(input.properties?.[HIGHLIGHT_PROP]).toBe(
            JSON.stringify({ q: 'some phrase', o: 7 }),
        );
    });

    it('defaults the highlight offset to 0', () => {
        const input = buildNewThreadInput(FILE, 'note', {
            startLine: 5,
            endLine: 5,
            quote: 'x',
        });

        expect(input.properties?.[HIGHLIGHT_PROP]).toBe(JSON.stringify({ q: 'x', o: 0 }));
    });

    it('omits the highlight property for a whole-line selection (no quote)', () => {
        const input = buildNewThreadInput(FILE, 'note', { startLine: 5, endLine: 9 });
        expect(input.properties?.[HIGHLIGHT_PROP]).toBeUndefined();
    });
});
