import { describe, expect, it } from 'vitest';

import { anchorThreads, resolveAnchorLine } from './anchor';

describe('resolveAnchorLine', () => {
    it('returns an exact block match', () => {
        expect(resolveAnchorLine(5, [1, 5, 9])).toBe(5);
    });

    it('returns the closest preceding block when no exact match', () => {
        expect(resolveAnchorLine(7, [1, 5, 9])).toBe(5);
    });

    it('returns the first block when the line precedes all blocks', () => {
        expect(resolveAnchorLine(0, [3, 8])).toBe(3);
    });

    it('handles unsorted block lines', () => {
        expect(resolveAnchorLine(7, [9, 1, 5])).toBe(5);
    });

    it('returns null when there are no blocks', () => {
        expect(resolveAnchorLine(5, [])).toBeNull();
    });
});

describe('anchorThreads', () => {
    it('anchors each thread to a block line', () => {
        const result = anchorThreads(
            [
                { id: 1, line: 5 },
                { id: 2, line: 7 },
            ],
            [1, 5, 9],
        );

        expect(result).toEqual([
            { id: 1, anchorLine: 5 },
            { id: 2, anchorLine: 5 },
        ]);
    });

    it('passes through a null line as a null anchor', () => {
        expect(anchorThreads([{ id: 3, line: null }], [1, 5])).toEqual([
            { id: 3, anchorLine: null },
        ]);
    });
});
