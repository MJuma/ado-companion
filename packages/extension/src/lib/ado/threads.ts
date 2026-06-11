import { adoGetJson, adoSendJson, adoSendVoid } from './http';
import { CommentType, ThreadStatus } from './pr-types';
import type {
    Comment,
    CommentMention,
    CommentThread,
    CreateCommentRequest,
    CreateThreadRequest,
    ListResponse,
    PullRequestThreadContext,
    ThreadContext,
} from './pr-types';

const API = 'api-version=7.1';

export interface NewThreadInput {
    content: string;
    threadContext?: ThreadContext;
    status?: ThreadStatus;
    mentions?: CommentMention[];
    pullRequestThreadContext?: PullRequestThreadContext;
    properties?: Record<string, { type: string; value: string }>;
}

export async function listThreads(prBaseUrl: string): Promise<CommentThread[]> {
    const response = await adoGetJson<ListResponse<CommentThread>>(
        `${prBaseUrl}/threads?${API}`,
    );
    return response.value;
}

export async function createThread(
    prBaseUrl: string,
    input: NewThreadInput,
): Promise<CommentThread> {
    const comment: CreateCommentRequest = {
        content: input.content,
        commentType: CommentType.Text,
        parentCommentId: 0,
    };
    if (input.mentions && input.mentions.length > 0) {
        comment.mentions = input.mentions;
    }

    const body: CreateThreadRequest = {
        comments: [comment],
        status: input.status ?? ThreadStatus.Active,
    };
    if (input.threadContext) {
        body.threadContext = input.threadContext;
    }
    if (input.pullRequestThreadContext) {
        body.pullRequestThreadContext = input.pullRequestThreadContext;
    }
    if (input.properties) {
        body.properties = input.properties;
    }

    return adoSendJson<CommentThread>('POST', `${prBaseUrl}/threads?${API}`, body);
}

export async function addReply(
    prBaseUrl: string,
    threadId: number,
    content: string,
    parentCommentId = 1,
    mentions?: CommentMention[],
): Promise<Comment> {
    const body: CreateCommentRequest = {
        content,
        commentType: CommentType.Text,
        parentCommentId,
    };
    if (mentions && mentions.length > 0) {
        body.mentions = mentions;
    }
    return adoSendJson<Comment>('POST', `${prBaseUrl}/threads/${threadId}/comments?${API}`, body);
}

export async function updateComment(
    prBaseUrl: string,
    threadId: number,
    commentId: number,
    content: string,
): Promise<Comment> {
    return adoSendJson<Comment>(
        'PATCH',
        `${prBaseUrl}/threads/${threadId}/comments/${commentId}?${API}`,
        { content },
    );
}

export async function setThreadStatus(
    prBaseUrl: string,
    threadId: number,
    status: ThreadStatus,
): Promise<CommentThread> {
    return adoSendJson<CommentThread>('PATCH', `${prBaseUrl}/threads/${threadId}?${API}`, {
        status,
    });
}

export async function deleteComment(
    prBaseUrl: string,
    threadId: number,
    commentId: number,
): Promise<void> {
    return adoSendVoid(
        'DELETE',
        `${prBaseUrl}/threads/${threadId}/comments/${commentId}?${API}`,
    );
}
