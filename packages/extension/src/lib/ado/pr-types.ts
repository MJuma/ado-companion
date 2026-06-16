// Azure DevOps REST API types — Pull Request threads, comments, iterations,
// attachments (API v7.1). Mirrors the shapes returned by the ADO Git REST API.

export enum ThreadStatus {
    Unknown = 'unknown',
    Active = 'active',
    Fixed = 'fixed',
    WontFix = 'wontFix',
    Closed = 'closed',
    ByDesign = 'byDesign',
    Pending = 'pending',
}

export enum CommentType {
    Unknown = 0,
    Text = 1,
    CodeChange = 2,
    System = 3,
}

export interface ReferenceLinks {
    [key: string]: { href: string };
}

export interface IdentityRef {
    id: string;
    displayName: string;
    uniqueName: string;
    imageUrl: string;
    /** Identity descriptor; prefix encodes account type (aad./msa. user, svc./s2s. service). */
    descriptor?: string;
}

export interface FilePosition {
    line: number;
    offset: number;
}

export interface ThreadContext {
    filePath: string;
    rightFileStart: FilePosition | null;
    rightFileEnd: FilePosition | null;
    leftFileStart: FilePosition | null;
    leftFileEnd: FilePosition | null;
}

export interface Comment {
    id: number;
    parentCommentId: number;
    content: string;
    author: IdentityRef;
    publishedDate: string;
    lastUpdatedDate: string;
    commentType: CommentType;
    isDeleted: boolean;
    usersLiked?: IdentityRef[];
    _links?: ReferenceLinks;
}

export interface CommentThread {
    id: number;
    status: ThreadStatus;
    threadContext: ThreadContext | null;
    comments: Comment[];
    properties: Record<string, unknown> | null;
    isDeleted: boolean;
    lastUpdatedDate: string;
    publishedDate: string;
    _links?: ReferenceLinks;
}

export interface CommentMention {
    id: number;
    text: string;
    author: {
        displayName: string;
        id: string;
        uniqueName: string;
    };
}

export interface CreateCommentRequest {
    content: string;
    parentCommentId: number;
    commentType: CommentType;
    mentions?: CommentMention[];
}

export interface CreateThreadRequest {
    comments: CreateCommentRequest[];
    status: ThreadStatus;
    threadContext?: ThreadContext;
    pullRequestThreadContext?: PullRequestThreadContext;
    properties?: Record<string, { '$type': string; '$value': string | number }>;
}

export interface UpdateThreadRequest {
    status: ThreadStatus;
}

export interface UpdateCommentRequest {
    content: string;
}

export interface ListResponse<T> {
    count: number;
    value: T[];
}

// --- Iteration types (for native-compatible thread context) ---

export interface PrIteration {
    id: number;
    description: string;
    createdDate: string;
    updatedDate: string;
}

export interface IterationChange {
    changeId: number;
    changeTrackingId: number;
    item: { path: string };
}

export interface IterationChangesResponse {
    changeEntries: IterationChange[];
}

export interface IterationContext {
    firstComparingIteration: number;
    secondComparingIteration: number;
}

export interface PullRequestThreadContext {
    iterationContext: IterationContext;
    changeTrackingId: number;
}

// --- Attachments ---

export interface Attachment {
    id?: string;
    displayName?: string;
    url: string;
    _links?: ReferenceLinks;
}

// --- Misc ---

export interface CurrentUser {
    id: string;
    displayName: string;
    imageUrl?: string;
}

/** Statuses that mean "no longer needs attention". */
export function isResolvedStatus(status: ThreadStatus): boolean {
    return (
        status === ThreadStatus.Fixed ||
        status === ThreadStatus.WontFix ||
        status === ThreadStatus.Closed ||
        status === ThreadStatus.ByDesign
    );
}

/** True if a thread is anchored to the given file and not deleted. */
export function isFileThread(thread: CommentThread, filePath: string): boolean {
    return !thread.isDeleted && thread.threadContext?.filePath === filePath;
}
