import { describe, expect, it } from 'vitest';

import { ThreadStatus, isFileThread, isResolvedStatus } from './pr-types';
import type { CommentThread } from './pr-types';

function thread(overrides: Partial<CommentThread> = {}): CommentThread {
    return {
        id: 1,
        status: ThreadStatus.Active,
        threadContext: {
            filePath: '/a.md',
            rightFileStart: null,
            rightFileEnd: null,
            leftFileStart: null,
            leftFileEnd: null,
        },
        comments: [],
        properties: null,
        isDeleted: false,
        lastUpdatedDate: '',
        publishedDate: '',
        ...overrides,
    };
}

describe('isResolvedStatus', () => {
    it('treats Fixed/WontFix/Closed/ByDesign as resolved', () => {
        expect(isResolvedStatus(ThreadStatus.Fixed)).toBe(true);
        expect(isResolvedStatus(ThreadStatus.WontFix)).toBe(true);
        expect(isResolvedStatus(ThreadStatus.Closed)).toBe(true);
        expect(isResolvedStatus(ThreadStatus.ByDesign)).toBe(true);
    });

    it('treats Active/Pending/Unknown as unresolved', () => {
        expect(isResolvedStatus(ThreadStatus.Active)).toBe(false);
        expect(isResolvedStatus(ThreadStatus.Pending)).toBe(false);
        expect(isResolvedStatus(ThreadStatus.Unknown)).toBe(false);
    });
});

describe('isFileThread', () => {
    it('matches a non-deleted thread on the same file', () => {
        expect(isFileThread(thread(), '/a.md')).toBe(true);
    });

    it('rejects a thread on a different file', () => {
        expect(isFileThread(thread(), '/b.md')).toBe(false);
    });

    it('rejects a deleted thread', () => {
        expect(isFileThread(thread({ isDeleted: true }), '/a.md')).toBe(false);
    });

    it('rejects a thread with no file context', () => {
        expect(isFileThread(thread({ threadContext: null }), '/a.md')).toBe(false);
    });
});
