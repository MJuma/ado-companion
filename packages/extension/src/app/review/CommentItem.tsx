import { createSignal, Show } from 'solid-js';

import type { Comment } from '../../lib/ado/pr-types';
import { deleteComment, likeComment, unlikeComment, updateComment } from '../../lib/ado/threads';
import { renderMarkdown } from '../../lib/markdown/render';
import { renderMentions } from '../../lib/review/mentions';
import { absoluteTime, relativeTime } from '../../lib/review/time';

import { CommentComposer } from './CommentComposer';
import { DeleteIcon, EditIcon, LikeIcon, LinkIcon } from './Icons';

interface CommentItemProps {
    comment: Comment;
    threadId: number;
    prBaseUrl: string;
    organizationUrl: string;
    canEdit: boolean;
    currentUserId: string | null;
    now: number;
    onChanged: () => void;
}

function stop(event: MouseEvent): void {
    event.stopPropagation();
}

function commentLink(threadId: number): string {
    const url = new URL(window.location.href);
    url.searchParams.set('discussionId', String(threadId));
    return url.toString();
}

export function CommentItem(props: CommentItemProps) {
    const [editing, setEditing] = createSignal(false);
    const [confirmingDelete, setConfirmingDelete] = createSignal(false);
    const [busy, setBusy] = createSignal(false);
    const [copied, setCopied] = createSignal(false);
    const [error, setError] = createSignal<string | null>(null);

    const likes = () => props.comment.usersLiked ?? [];
    const likedByMe = () => likes().some((user) => user.id === props.currentUserId);

    async function saveEdit(content: string): Promise<void> {
        await updateComment(props.prBaseUrl, props.threadId, props.comment.id, content);
        setEditing(false);
        props.onChanged();
    }

    async function remove(): Promise<void> {
        if (busy()) {
            return;
        }
        setBusy(true);
        setError(null);
        try {
            await deleteComment(props.prBaseUrl, props.threadId, props.comment.id);
            props.onChanged();
        } catch {
            setError('Could not delete the comment.');
        } finally {
            setBusy(false);
            setConfirmingDelete(false);
        }
    }

    async function toggleLike(): Promise<void> {
        if (busy()) {
            return;
        }
        setBusy(true);
        setError(null);
        try {
            if (likedByMe()) {
                await unlikeComment(props.prBaseUrl, props.threadId, props.comment.id);
            } else {
                await likeComment(props.prBaseUrl, props.threadId, props.comment.id);
            }
            props.onChanged();
        } catch {
            setError('Could not update your reaction.');
        } finally {
            setBusy(false);
        }
    }

    async function copyLink(): Promise<void> {
        try {
            await navigator.clipboard.writeText(commentLink(props.threadId));
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1500);
        } catch {
            setCopied(false);
        }
    }

    return (
        <div class="acr-comment">
            <div class="acr-comment__head">
                <Show when={props.comment.author.imageUrl}>
                    <img class="acr-comment__avatar" src={props.comment.author.imageUrl} alt="" />
                </Show>
                <span class="acr-comment__author">{props.comment.author.displayName}</span>
                <Show when={relativeTime(props.comment.publishedDate, props.now)}>
                    {(rel) => (
                        <span
                            class="acr-comment__time"
                            title={absoluteTime(props.comment.publishedDate)}
                        >
                            {rel()}
                        </span>
                    )}
                </Show>
                <span class="acr-comment__tools" on:click={stop}>
                    <button
                        class="acr-iconbtn"
                        type="button"
                        title={copied() ? 'Link copied' : 'Copy link to comment'}
                        on:click={() => void copyLink()}
                    >
                        <LinkIcon />
                    </button>
                    <Show when={props.canEdit && !editing()}>
                        <button
                            class="acr-iconbtn"
                            type="button"
                            title="Edit"
                            on:click={() => setEditing(true)}
                        >
                            <EditIcon />
                        </button>
                        <button
                            class="acr-iconbtn acr-iconbtn--danger"
                            type="button"
                            title="Delete"
                            on:click={() => setConfirmingDelete(true)}
                        >
                            <DeleteIcon />
                        </button>
                    </Show>
                </span>
            </div>
            <Show
                when={!editing()}
                fallback={
                    <div class="acr-comment__edit" on:click={stop}>
                        <CommentComposer
                            prBaseUrl={props.prBaseUrl}
                            organizationUrl={props.organizationUrl}
                            initialValue={props.comment.content}
                            submitLabel="Save"
                            onSubmit={saveEdit}
                            onCancel={() => setEditing(false)}
                        />
                    </div>
                }
            >
                <div
                    class="acr-comment__body markdown-content"
                    innerHTML={renderMarkdown(renderMentions(props.comment.content))}
                />
                <div class="acr-comment__reactions" on:click={stop}>
                    <button
                        class="acr-like"
                        classList={{ 'acr-like--on': likedByMe() }}
                        type="button"
                        title={likedByMe() ? 'Unlike' : 'Like'}
                        aria-pressed={likedByMe()}
                        disabled={busy()}
                        on:click={() => void toggleLike()}
                    >
                        <LikeIcon size={14} />
                        <Show when={likes().length > 0}>
                            <span class="acr-like__count">{likes().length}</span>
                        </Show>
                    </button>
                </div>
                <Show when={confirmingDelete()}>
                    <div class="acr-comment__actions" on:click={stop}>
                        <span class="acr-comment__confirm">Delete this comment?</span>
                        <button
                            class="acr-linkbtn acr-linkbtn--danger"
                            type="button"
                            disabled={busy()}
                            on:click={() => void remove()}
                        >
                            Delete
                        </button>
                        <button
                            class="acr-linkbtn"
                            type="button"
                            on:click={() => setConfirmingDelete(false)}
                        >
                            Cancel
                        </button>
                    </div>
                </Show>
                <Show when={error()}>
                    <div class="acr-comment__error">{error()}</div>
                </Show>
            </Show>
        </div>
    );
}
