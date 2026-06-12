import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';

import { fakeResponse, fetchInit, fetchJsonBody, fetchUrl, stubFetch } from './fetch.mock';
import { ThreadStatus } from './pr-types';
import type { ThreadContext } from './pr-types';
import {
    addReply,
    buildLineThreadContext,
    createThread,
    deleteComment,
    likeComment,
    listThreads,
    setThreadStatus,
    unlikeComment,
    updateComment,
} from './threads';

const PR = 'https://dev.azure.com/o/p/_apis/git/repositories/r/pullRequests/42';

interface ParsedComment {
    content: string;
    commentType: number;
    parentCommentId: number;
    mentions?: unknown[];
}
interface ParsedThreadBody {
    comments: ParsedComment[];
    status: string;
    threadContext?: unknown;
    pullRequestThreadContext?: unknown;
}

let fetchMock: Mock;

beforeEach(() => {
    fetchMock = stubFetch();
});

afterEach(() => {
    vi.unstubAllGlobals();
});

describe('listThreads', () => {
    it('GETs /threads and returns the value array', async () => {
        fetchMock.mockResolvedValue(fakeResponse({ jsonValue: { count: 1, value: [{ id: 7 }] } }));

        const threads = await listThreads(PR);

        expect(threads).toEqual([{ id: 7 }]);
        expect(fetchUrl(fetchMock)).toBe(`${PR}/threads?api-version=7.1`);
        expect(fetchInit(fetchMock).method).toBe('GET');
    });
});

describe('createThread', () => {
    const threadContext: ThreadContext = {
        filePath: '/a.md',
        rightFileStart: { line: 3, offset: 1 },
        rightFileEnd: { line: 3, offset: 1 },
        leftFileStart: null,
        leftFileEnd: null,
    };

    it('POSTs a text comment with anchor + iteration context', async () => {
        fetchMock.mockResolvedValue(fakeResponse({ jsonValue: { id: 100 } }));
        const pullRequestThreadContext = {
            iterationContext: { firstComparingIteration: 2, secondComparingIteration: 2 },
            changeTrackingId: 5,
        };

        const thread = await createThread(PR, {
            content: 'hello',
            threadContext,
            pullRequestThreadContext,
        });

        expect(thread).toEqual({ id: 100 });
        expect(fetchUrl(fetchMock)).toBe(`${PR}/threads?api-version=7.1`);
        expect(fetchInit(fetchMock).method).toBe('POST');

        const body = fetchJsonBody(fetchMock) as ParsedThreadBody;
        expect(body.comments[0]).toMatchObject({
            content: 'hello',
            commentType: 1,
            parentCommentId: 0,
        });
        expect(body.status).toBe('active');
        expect(body.threadContext).toEqual(threadContext);
        expect(body.pullRequestThreadContext).toEqual(pullRequestThreadContext);
    });

    it('includes mentions on the comment when provided', async () => {
        fetchMock.mockResolvedValue(fakeResponse({ jsonValue: { id: 1 } }));

        await createThread(PR, {
            content: 'hi @x',
            mentions: [{ id: 0, text: '@x', author: { displayName: 'X', id: 'x', uniqueName: 'x' } }],
        });

        const body = fetchJsonBody(fetchMock) as ParsedThreadBody;
        expect(body.comments[0].mentions).toHaveLength(1);
    });
});

describe('addReply', () => {
    it('POSTs a reply with parentCommentId defaulting to 1', async () => {
        fetchMock.mockResolvedValue(fakeResponse({ jsonValue: { id: 2 } }));

        await addReply(PR, 100, 'reply');

        expect(fetchUrl(fetchMock)).toBe(`${PR}/threads/100/comments?api-version=7.1`);
        expect(fetchJsonBody(fetchMock)).toMatchObject({
            content: 'reply',
            commentType: 1,
            parentCommentId: 1,
        });
    });
});

describe('updateComment', () => {
    it('PATCHes the comment content', async () => {
        fetchMock.mockResolvedValue(fakeResponse({ jsonValue: { id: 2 } }));

        await updateComment(PR, 100, 2, 'edited');

        expect(fetchUrl(fetchMock)).toBe(`${PR}/threads/100/comments/2?api-version=7.1`);
        expect(fetchInit(fetchMock).method).toBe('PATCH');
        expect(fetchJsonBody(fetchMock)).toEqual({ content: 'edited' });
    });
});

describe('setThreadStatus', () => {
    it('PATCHes the thread status', async () => {
        fetchMock.mockResolvedValue(fakeResponse({ jsonValue: { id: 100 } }));

        await setThreadStatus(PR, 100, ThreadStatus.Fixed);

        expect(fetchUrl(fetchMock)).toBe(`${PR}/threads/100?api-version=7.1`);
        expect(fetchJsonBody(fetchMock)).toEqual({ status: 'fixed' });
    });
});

describe('deleteComment', () => {
    it('DELETEs the comment', async () => {
        fetchMock.mockResolvedValue(fakeResponse());

        await deleteComment(PR, 100, 2);

        expect(fetchInit(fetchMock).method).toBe('DELETE');
        expect(fetchUrl(fetchMock)).toBe(`${PR}/threads/100/comments/2?api-version=7.1`);
    });
});

describe('createThread options', () => {
    it('passes through an explicit status and custom properties', async () => {
        fetchMock.mockResolvedValue(fakeResponse({ jsonValue: { id: 5 } }));

        await createThread(PR, {
            content: 'note',
            status: ThreadStatus.Closed,
            properties: { adoCompanionAnchor: { type: 'System.String', value: 'phrase' } },
        });

        const body = fetchJsonBody(fetchMock) as ParsedThreadBody & {
            properties?: Record<string, unknown>;
        };
        expect(body.status).toBe('closed');
        expect(body.properties).toEqual({
            adoCompanionAnchor: { type: 'System.String', value: 'phrase' },
        });
    });
});

describe('addReply with mentions', () => {
    it('includes mentions when provided', async () => {
        fetchMock.mockResolvedValue(fakeResponse({ jsonValue: { id: 9 } }));

        await addReply(PR, 100, 'cc @x', 1, [
            { id: 0, text: '@x', author: { displayName: 'X', id: 'x', uniqueName: 'x' } },
        ]);

        const body = fetchJsonBody(fetchMock) as { mentions?: unknown[] };
        expect(body.mentions).toHaveLength(1);
    });
});

describe('buildLineThreadContext', () => {
    it('anchors a single line on the right side and leaves the left side null', () => {
        const ctx = buildLineThreadContext('/docs/spec.md', 12, 12, 40);
        expect(ctx).toEqual({
            filePath: '/docs/spec.md',
            rightFileStart: { line: 12, offset: 1 },
            rightFileEnd: { line: 12, offset: 40 },
            leftFileStart: null,
            leftFileEnd: null,
        });
    });

    it('spans a block from start to end line', () => {
        const ctx = buildLineThreadContext('/a.md', 5, 8);
        expect(ctx.rightFileStart).toEqual({ line: 5, offset: 1 });
        expect(ctx.rightFileEnd).toEqual({ line: 8, offset: 1 });
    });

    it('never emits an end offset below 1', () => {
        const ctx = buildLineThreadContext('/a.md', 3, 3, 0);
        expect(ctx.rightFileEnd?.offset).toBe(1);
    });
});

describe('likeComment / unlikeComment', () => {
    it('POSTs to the comment likes endpoint', async () => {
        fetchMock.mockResolvedValue(fakeResponse({ jsonValue: {} }));
        await likeComment(PR, 10, 2);
        expect(fetchInit(fetchMock).method).toBe('POST');
        expect(fetchUrl(fetchMock)).toBe(`${PR}/threads/10/comments/2/likes?api-version=7.1`);
    });

    it('DELETEs the comment likes endpoint to unlike', async () => {
        fetchMock.mockResolvedValue(fakeResponse({ jsonValue: {} }));
        await unlikeComment(PR, 10, 2);
        expect(fetchInit(fetchMock).method).toBe('DELETE');
        expect(fetchUrl(fetchMock)).toBe(`${PR}/threads/10/comments/2/likes?api-version=7.1`);
    });
});
