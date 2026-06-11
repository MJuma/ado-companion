import { For, Show } from 'solid-js';

import { isResolvedStatus } from '../../lib/ado/pr-types';
import type { CommentThread } from '../../lib/ado/pr-types';
import { renderMarkdown } from '../../lib/markdown/render';

const STATUS_LABELS: Record<string, string> = {
    active: 'Active',
    fixed: 'Resolved',
    wontFix: "Won't fix",
    closed: 'Closed',
    byDesign: 'By design',
    pending: 'Pending',
    unknown: '',
};

interface CommentCardProps {
    thread: CommentThread;
    active: boolean;
    onActivate: (threadId: number) => void;
}

export function CommentCard(props: CommentCardProps) {
    const comments = () => props.thread.comments.filter((comment) => !comment.isDeleted);
    const statusLabel = () => STATUS_LABELS[props.thread.status] ?? '';

    return (
        <div
            class="acr-card"
            classList={{
                'acr-card--active': props.active,
                'acr-card--resolved': isResolvedStatus(props.thread.status),
            }}
            data-thread-id={props.thread.id}
            on:click={() => props.onActivate(props.thread.id)}
        >
            <Show when={statusLabel()}>
                <span class="acr-card__status">{statusLabel()}</span>
            </Show>
            <For each={comments()}>
                {(comment) => (
                    <div class="acr-comment">
                        <div class="acr-comment__head">
                            <Show when={comment.author.imageUrl}>
                                <img class="acr-comment__avatar" src={comment.author.imageUrl} alt="" />
                            </Show>
                            <span class="acr-comment__author">{comment.author.displayName}</span>
                        </div>
                        <div
                            class="acr-comment__body markdown-content"
                            innerHTML={renderMarkdown(comment.content)}
                        />
                    </div>
                )}
            </For>
        </div>
    );
}
