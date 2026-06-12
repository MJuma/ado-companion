// Test fixtures for the review components. Imported only by *.spec.tsx files;
// not referenced by any entrypoint, so it is tree-shaken out of the build.

import { CommentType, ThreadStatus } from '../../lib/ado/pr-types';
import type { Comment, CommentThread, IdentityRef } from '../../lib/ado/pr-types';

export function makeIdentity(overrides: Partial<IdentityRef> = {}): IdentityRef {
    return {
        id: 'user-1',
        displayName: 'Ada Lovelace',
        uniqueName: 'ada@example.com',
        imageUrl: '',
        ...overrides,
    };
}

export function makeComment(overrides: Partial<Comment> = {}): Comment {
    const stamp = '2024-01-01T00:00:00.000Z';
    return {
        id: 1,
        parentCommentId: 0,
        content: 'Hello **world**',
        author: makeIdentity(),
        publishedDate: stamp,
        lastUpdatedDate: stamp,
        commentType: CommentType.Text,
        isDeleted: false,
        ...overrides,
    };
}

export function makeThread(overrides: Partial<CommentThread> = {}): CommentThread {
    const stamp = '2024-01-01T00:00:00.000Z';
    return {
        id: 100,
        status: ThreadStatus.Active,
        threadContext: null,
        comments: [makeComment()],
        properties: null,
        isDeleted: false,
        lastUpdatedDate: stamp,
        publishedDate: stamp,
        ...overrides,
    };
}
