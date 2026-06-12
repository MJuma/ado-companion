import { createSignal, For, Show } from 'solid-js';

import { ThreadStatus, isResolvedStatus } from '../../lib/ado/pr-types';
import type { CommentThread } from '../../lib/ado/pr-types';
import { addReply, setThreadStatus } from '../../lib/ado/threads';

import { CommentComposer } from './CommentComposer';
import { CommentItem } from './CommentItem';
import { ChevronIcon } from './Icons';

const STATUS_LABELS: Record<string, string> = {
    active: 'Active',
    fixed: 'Resolved',
    wontFix: "Won't fix",
    closed: 'Closed',
    byDesign: 'By design',
    pending: 'Pending',
    unknown: '',
};

const STATUS_OPTIONS: { value: ThreadStatus; label: string }[] = [
    { value: ThreadStatus.Active, label: 'Active' },
    { value: ThreadStatus.Fixed, label: 'Resolved' },
    { value: ThreadStatus.WontFix, label: "Won't fix" },
    { value: ThreadStatus.Closed, label: 'Closed' },
    { value: ThreadStatus.ByDesign, label: 'By design' },
];

interface CommentCardProps {
    thread: CommentThread;
    active: boolean;
    prBaseUrl: string;
    organizationUrl: string;
    currentUserId: string | null;
    now: number;
    onActivate: (threadId: number) => void;
    onChanged: () => void;
}

export function CommentCard(props: CommentCardProps) {
    const comments = () => props.thread.comments.filter((comment) => !comment.isDeleted);
    const statusLabel = () => STATUS_LABELS[props.thread.status] ?? '';
    const rootCommentId = () => comments()[0]?.id ?? 1;

    const [replying, setReplying] = createSignal(false);
    const [busy, setBusy] = createSignal(false);
    const [error, setError] = createSignal<string | null>(null);
    const [collapsed, setCollapsed] = createSignal(isResolvedStatus(props.thread.status));

    async function reply(content: string): Promise<void> {
        await addReply(props.prBaseUrl, props.thread.id, content, rootCommentId());
        setReplying(false);
        props.onChanged();
    }

    async function changeStatus(status: ThreadStatus): Promise<void> {
        if (status === props.thread.status || busy()) {
            return;
        }
        setBusy(true);
        setError(null);
        try {
            await setThreadStatus(props.prBaseUrl, props.thread.id, status);
            props.onChanged();
        } catch {
            setError('Could not update the status.');
        } finally {
            setBusy(false);
        }
    }

    function onCardClick(): void {
        props.onActivate(props.thread.id);
        if (collapsed()) {
            setCollapsed(false);
        }
    }

    return (
        <div
            class="acr-card"
            classList={{
                'acr-card--active': props.active,
                'acr-card--resolved': isResolvedStatus(props.thread.status),
                'acr-card--collapsed': collapsed(),
            }}
            data-thread-id={props.thread.id}
            on:click={onCardClick}
        >
            <div class="acr-card__bar">
                <button
                    class="acr-collapse"
                    classList={{ 'acr-collapse--closed': collapsed() }}
                    type="button"
                    title={collapsed() ? 'Expand' : 'Collapse'}
                    aria-expanded={!collapsed()}
                    on:click={(event) => {
                        event.stopPropagation();
                        setCollapsed(!collapsed());
                    }}
                >
                    <ChevronIcon size={14} />
                </button>
                <Show when={statusLabel()}>
                    <span class="acr-card__status">{statusLabel()}</span>
                </Show>
                <Show when={collapsed()}>
                    <span class="acr-card__summary">
                        {comments()[0]?.author.displayName}
                        <Show when={comments().length > 1}>
                            {` · ${comments().length} comments`}
                        </Show>
                    </span>
                </Show>
            </div>
            <Show when={!collapsed()}>
                <For each={comments()}>
                    {(comment) => (
                        <CommentItem
                            comment={comment}
                            threadId={props.thread.id}
                            prBaseUrl={props.prBaseUrl}
                            organizationUrl={props.organizationUrl}
                            canEdit={comment.author.id === props.currentUserId}
                            currentUserId={props.currentUserId}
                            now={props.now}
                            onChanged={props.onChanged}
                        />
                    )}
                </For>
                <div
                    class="acr-card__footer"
                    on:click={(event) => {
                        event.stopPropagation();
                    }}
                >
                    <select
                        class="acr-select"
                        title="Thread status"
                        value={props.thread.status}
                        disabled={busy()}
                        on:change={(event) => {
                            void changeStatus(
                                (event.currentTarget as HTMLSelectElement).value as ThreadStatus,
                            );
                        }}
                    >
                        <For each={STATUS_OPTIONS}>
                            {(option) => <option value={option.value}>{option.label}</option>}
                        </For>
                    </select>
                    <Show when={!replying()}>
                        <button class="acr-btn" type="button" on:click={() => setReplying(true)}>
                            Reply
                        </button>
                    </Show>
                </div>
                <Show when={error()}>
                    <div class="acr-comment__error">{error()}</div>
                </Show>
                <Show when={replying()}>
                    <div
                        class="acr-card__reply"
                        on:click={(event) => {
                            event.stopPropagation();
                        }}
                    >
                        <CommentComposer
                            prBaseUrl={props.prBaseUrl}
                            organizationUrl={props.organizationUrl}
                            placeholder="Reply…"
                            submitLabel="Reply"
                            onSubmit={reply}
                            onCancel={() => setReplying(false)}
                        />
                    </div>
                </Show>
            </Show>
        </div>
    );
}
