import { createSignal, Show } from 'solid-js';

import type { Comment } from '../../lib/ado/pr-types';
import { deleteComment, updateComment } from '../../lib/ado/threads';
import { renderMarkdown } from '../../lib/markdown/render';
import { renderMentions } from '../../lib/review/mentions';

import { CommentComposer } from './CommentComposer';

interface CommentItemProps {
    comment: Comment;
    threadId: number;
    prBaseUrl: string;
    organizationUrl: string;
    canEdit: boolean;
    onChanged: () => void;
}

function stop(event: MouseEvent): void {
    event.stopPropagation();
}

export function CommentItem(props: CommentItemProps) {
    const [editing, setEditing] = createSignal(false);
    const [confirmingDelete, setConfirmingDelete] = createSignal(false);
    const [busy, setBusy] = createSignal(false);

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
        try {
            await deleteComment(props.prBaseUrl, props.threadId, props.comment.id);
            props.onChanged();
        } finally {
            setBusy(false);
            setConfirmingDelete(false);
        }
    }

    return (
        <div class="acr-comment">
            <div class="acr-comment__head">
                <Show when={props.comment.author.imageUrl}>
                    <img class="acr-comment__avatar" src={props.comment.author.imageUrl} alt="" />
                </Show>
                <span class="acr-comment__author">{props.comment.author.displayName}</span>
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
                <Show when={props.canEdit}>
                    <Show
                        when={!confirmingDelete()}
                        fallback={
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
                        }
                    >
                        <div class="acr-comment__actions" on:click={stop}>
                            <button
                                class="acr-linkbtn"
                                type="button"
                                on:click={() => setEditing(true)}
                            >
                                Edit
                            </button>
                            <button
                                class="acr-linkbtn"
                                type="button"
                                on:click={() => setConfirmingDelete(true)}
                            >
                                Delete
                            </button>
                        </div>
                    </Show>
                </Show>
            </Show>
        </div>
    );
}
