import { describe, expect, it } from 'vitest';

import { ThreadStatus } from '../ado/pr-types';

import { buildNewThreadInput, HIGHLIGHT_PROP } from './new-thread';

const FILE = '/docs/spec.md';
const SUPPORTS_MARKDOWN_PROP = 'Microsoft.TeamFoundation.Discussion.SupportsMarkdown';

describe('buildNewThreadInput', () => {
    it('anchors an Active thread to the selected source line range', () => {
        const input = buildNewThreadInput(FILE, 'a note', {
            startLine: 12,
            endLine: 14,
            endLineLength: 42,
        });

        expect(input.content).toBe('a note');
        expect(input.status).toBe(ThreadStatus.Active);
        expect(input.threadContext?.filePath).toBe(FILE);
        expect(input.threadContext?.rightFileStart).toEqual({ line: 12, offset: 1 });
        expect(input.threadContext?.rightFileEnd?.line).toBe(14);
    });

    it('spans the whole end line so the range is not degenerate', () => {
        const input = buildNewThreadInput(FILE, 'note', {
            startLine: 5,
            endLine: 5,
            endLineLength: 30,
        });

        // A real (non-zero-length) range is required for ADO native views to
        // anchor + expand the thread like their own comments.
        expect(input.threadContext?.rightFileStart).toEqual({ line: 5, offset: 1 });
        expect(input.threadContext?.rightFileEnd).toEqual({ line: 5, offset: 31 });
    });

    it('always tags the thread as markdown-capable', () => {
        const input = buildNewThreadInput(FILE, 'note', { startLine: 5, endLine: 9 });
        expect(input.properties?.[SUPPORTS_MARKDOWN_PROP]).toBe(1);
    });

    it('attaches the highlight property when a phrase was selected', () => {
        const input = buildNewThreadInput(FILE, 'note', {
            startLine: 5,
            endLine: 5,
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
