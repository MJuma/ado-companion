import { createEffect, createResource, createSignal, For, Show } from 'solid-js';

import { getFileContent } from '../../lib/ado/items';
import { getPrApiBaseUrl } from '../../lib/ado/pr';
import type { PrContext } from '../../lib/ado/pr';
import { ThreadStatus, isFileThread } from '../../lib/ado/pr-types';
import type { CommentThread } from '../../lib/ado/pr-types';
import { buildLineThreadContext, createThread, listThreads } from '../../lib/ado/threads';
import { anchorThreads } from '../../lib/markdown/anchor';
import { renderMarkdown } from '../../lib/markdown/render';

import { CommentCard } from './CommentCard';
import { CommentComposer } from './CommentComposer';

interface ReviewViewProps {
    context: PrContext;
}

function threadLine(thread: CommentThread): number {
    return thread.threadContext?.rightFileStart?.line ?? Number.MAX_SAFE_INTEGER;
}

function hasTextSelection(node: Node): boolean {
    const root = node.getRootNode() as unknown as { getSelection?: () => Selection | null };
    const selection = root.getSelection ? root.getSelection() : window.getSelection();
    return Boolean(selection && !selection.isCollapsed);
}

export function ReviewView(props: ReviewViewProps) {
    const [html] = createResource(
        () => props.context,
        async (context): Promise<string | null> => {
            const markdown = await getFileContent(context);
            return markdown === null ? null : renderMarkdown(markdown);
        },
    );

    const [threads, { refetch: refetchThreads }] = createResource(
        () => props.context,
        async (context): Promise<CommentThread[]> => {
            const all = await listThreads(getPrApiBaseUrl(context));
            return all
                .filter((thread) => isFileThread(thread, context.filePath))
                .filter((thread) => Boolean(thread.threadContext?.rightFileStart))
                .sort((a, b) => threadLine(a) - threadLine(b));
        },
    );

    const prBaseUrl = (): string => getPrApiBaseUrl(props.context);

    let docEl: HTMLDivElement | undefined;
    let railEl: HTMLDivElement | undefined;
    const [activeId, setActiveId] = createSignal<number | null>(null);
    const [newThread, setNewThread] = createSignal<{ startLine: number; endLine: number } | null>(
        null,
    );

    // Highlight rendered blocks that carry comments, once doc + threads are ready.
    createEffect(() => {
        const list = threads();
        const rendered = !html.loading && html();
        if (!docEl || !list || !rendered) {
            return;
        }
        requestAnimationFrame(() => {
            const root = docEl;
            if (!root) {
                return;
            }
            const blocks = Array.from(root.querySelectorAll<HTMLElement>('[data-source-line]'));
            const lineToEl = new Map<number, HTMLElement>();
            const blockLines: number[] = [];
            for (const block of blocks) {
                const line = Number(block.dataset['sourceLine']);
                if (Number.isNaN(line)) {
                    continue;
                }
                blockLines.push(line);
                if (!lineToEl.has(line)) {
                    lineToEl.set(line, block);
                }
            }
            const anchored = anchorThreads(
                list.map((thread) => ({
                    id: thread.id,
                    line: thread.threadContext?.rightFileStart?.line ?? null,
                })),
                blockLines,
            );
            for (const { id, anchorLine } of anchored) {
                if (anchorLine === null) {
                    continue;
                }
                const el = lineToEl.get(anchorLine);
                if (!el) {
                    continue;
                }
                el.classList.add('acr-anchored');
                if (!el.dataset['threadId']) {
                    el.dataset['threadId'] = String(id);
                }
            }
        });
    });

    // Reflect the active thread on its anchored block.
    createEffect(() => {
        const id = activeId();
        if (!docEl) {
            return;
        }
        for (const el of docEl.querySelectorAll('.acr-anchored--active')) {
            el.classList.remove('acr-anchored--active');
        }
        if (id === null) {
            return;
        }
        docEl.querySelector(`[data-thread-id="${id}"]`)?.classList.add('acr-anchored--active');
    });

    function focusThread(threadId: number, scrollTo: 'block' | 'card'): void {
        setActiveId(threadId);
        const selector = `[data-thread-id="${threadId}"]`;
        const target =
            scrollTo === 'block'
                ? docEl?.querySelector<HTMLElement>(selector)
                : railEl?.querySelector<HTMLElement>(selector);
        target?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    function startNewThread(block: HTMLElement): void {
        const startLine = Number(block.dataset['sourceLine']);
        if (Number.isNaN(startLine)) {
            return;
        }
        const endAttr = block.dataset['sourceEndLine'];
        const parsedEnd = endAttr ? Number(endAttr) : startLine;
        setActiveId(null);
        setNewThread({ startLine, endLine: Number.isNaN(parsedEnd) ? startLine : parsedEnd });
        requestAnimationFrame(() => {
            railEl?.querySelector('.acr-new')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        });
    }

    function onDocClick(event: MouseEvent): void {
        const block = (event.target as HTMLElement | null)?.closest<HTMLElement>(
            '[data-source-line]',
        );
        if (!block) {
            return;
        }
        const existing = block.dataset['threadId'];
        if (existing) {
            const id = Number(existing);
            if (!Number.isNaN(id)) {
                focusThread(id, 'card');
            }
            return;
        }
        if (hasTextSelection(block)) {
            return;
        }
        startNewThread(block);
    }

    async function submitNewThread(content: string): Promise<void> {
        const target = newThread();
        if (!target) {
            return;
        }
        await createThread(prBaseUrl(), {
            content,
            status: ThreadStatus.Active,
            threadContext: buildLineThreadContext(
                props.context.filePath,
                target.startLine,
                target.endLine,
            ),
        });
        setNewThread(null);
        void refetchThreads();
    }

    return (
        <div class="ado-companion-review">
            <Show when={html.loading}>
                <div class="ado-companion-review__status">Loading…</div>
            </Show>
            <Show when={html.error}>
                <div class="ado-companion-review__status">Failed to load file content.</div>
            </Show>
            <Show when={!html.loading && !html.error}>
                <Show
                    when={html()}
                    fallback={<div class="ado-companion-review__status">No content.</div>}
                >
                    {(docHtml) => (
                        <div class="acr-layout">
                            <div
                                class="acr-doc markdown-content"
                                ref={(el) => {
                                    docEl = el;
                                }}
                                innerHTML={docHtml()}
                                on:click={onDocClick}
                            />
                            <div
                                class="acr-rail"
                                ref={(el) => {
                                    railEl = el;
                                }}
                            >
                                <Show when={newThread()}>
                                    {(target) => (
                                        <div class="acr-card acr-new">
                                            <span class="acr-card__status">
                                                New comment · line {target().startLine}
                                            </span>
                                            <CommentComposer
                                                prBaseUrl={prBaseUrl()}
                                                placeholder="Comment on this section…"
                                                submitLabel="Comment"
                                                onSubmit={submitNewThread}
                                                onCancel={() => setNewThread(null)}
                                            />
                                        </div>
                                    )}
                                </Show>
                                <Show
                                    when={threads()}
                                    fallback={
                                        <div class="acr-rail__status">Loading comments…</div>
                                    }
                                >
                                    {(list) => (
                                        <Show
                                            when={list().length > 0}
                                            fallback={
                                                <Show when={!newThread()}>
                                                    <div class="acr-rail__status">
                                                        No comments yet. Click a paragraph to
                                                        comment.
                                                    </div>
                                                </Show>
                                            }
                                        >
                                            <For each={list()}>
                                                {(thread) => (
                                                    <CommentCard
                                                        thread={thread}
                                                        active={activeId() === thread.id}
                                                        prBaseUrl={prBaseUrl()}
                                                        onActivate={(id) => focusThread(id, 'block')}
                                                        onChanged={() => void refetchThreads()}
                                                    />
                                                )}
                                            </For>
                                        </Show>
                                    )}
                                </Show>
                            </div>
                        </div>
                    )}
                </Show>
            </Show>
        </div>
    );
}
