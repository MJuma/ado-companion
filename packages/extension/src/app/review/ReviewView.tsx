import { createEffect, createResource, createSignal, For, onCleanup, Show } from 'solid-js';

import { fetchCurrentUser } from '../../lib/ado/identities';
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
import { CommentIcon } from './Icons';

interface ReviewViewProps {
    context: PrContext;
}

interface SelectionAnchor {
    startLine: number;
    endLine: number;
    top: number;
    left: number;
}

function threadLine(thread: CommentThread): number {
    return thread.threadContext?.rightFileStart?.line ?? Number.MAX_SAFE_INTEGER;
}

function shadowSelection(node: Node): Selection | null {
    const root = node.getRootNode() as unknown as { getSelection?: () => Selection | null };
    return root.getSelection ? root.getSelection() : window.getSelection();
}

function closestSourceBlock(node: Node | null): HTMLElement | null {
    const el = node instanceof HTMLElement ? node : (node?.parentElement ?? null);
    return el ? el.closest<HTMLElement>('[data-source-line]') : null;
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

    const [currentUser] = createResource(
        () => props.context,
        (context) => fetchCurrentUser(context.organizationUrl).catch(() => null),
    );

    let docEl: HTMLDivElement | undefined;
    let railEl: HTMLDivElement | undefined;
    const slotEls = new Map<number, HTMLElement>();
    const [activeId, setActiveId] = createSignal<number | null>(null);
    const [selAnchor, setSelAnchor] = createSignal<SelectionAnchor | null>(null);
    const [composer, setComposer] = createSignal<SelectionAnchor | null>(null);
    const [cardTops, setCardTops] = createSignal<Record<number, number>>({});
    const [layoutTick, setLayoutTick] = createSignal(0);

    const resizeObserver = new ResizeObserver(() => {
        requestAnimationFrame(reposition);
    });
    onCleanup(() => resizeObserver.disconnect());

    // Word-style alignment: place each comment card at the vertical offset of its
    // anchored block, stacking down to avoid overlaps.
    function reposition(): void {
        const list = threads();
        if (!docEl || !railEl || !list) {
            return;
        }
        const railTop = railEl.getBoundingClientRect().top;
        const placed = list
            .map((thread) => {
                const block = docEl?.querySelector<HTMLElement>(
                    `[data-thread-id="${thread.id}"]`,
                );
                const slot = slotEls.get(thread.id);
                if (!slot) {
                    return null;
                }
                const desired = block
                    ? block.getBoundingClientRect().top - railTop
                    : Number.POSITIVE_INFINITY;
                return { id: thread.id, desired, height: slot.offsetHeight };
            })
            .filter((item): item is { id: number; desired: number; height: number } => item !== null)
            .sort((a, b) => a.desired - b.desired);

        const next: Record<number, number> = {};
        let cursor = 0;
        for (const item of placed) {
            const base = Number.isFinite(item.desired) ? Math.max(item.desired, 0) : cursor;
            const top = Math.max(base, cursor);
            next[item.id] = top;
            cursor = top + item.height + 8;
        }
        setCardTops(next);
    }

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
            setLayoutTick((value) => value + 1);
        });
    });

    // Re-align the comment cards whenever the doc, threads, or layout changes.
    createEffect(() => {
        threads();
        layoutTick();
        const rendered = !html.loading && html();
        if (!rendered) {
            return;
        }
        requestAnimationFrame(reposition);
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

    function readDocSelection(): SelectionAnchor | null {
        if (!docEl) {
            return null;
        }
        const selection = shadowSelection(docEl);
        if (!selection || selection.isCollapsed || selection.rangeCount === 0) {
            return null;
        }
        const range = selection.getRangeAt(0);
        if (!docEl.contains(range.startContainer) || !docEl.contains(range.endContainer)) {
            return null;
        }
        const startBlock = closestSourceBlock(range.startContainer);
        if (!startBlock) {
            return null;
        }
        const startLine = Number(startBlock.dataset['sourceLine']);
        if (Number.isNaN(startLine)) {
            return null;
        }
        const endBlock = closestSourceBlock(range.endContainer) ?? startBlock;
        const endRaw = endBlock.dataset['sourceEndLine'] ?? endBlock.dataset['sourceLine'];
        const endLine = Number(endRaw);
        const rect = range.getBoundingClientRect();
        return {
            startLine,
            endLine: Number.isNaN(endLine) ? startLine : Math.max(startLine, endLine),
            top: rect.top,
            left: Math.min(rect.right + 6, window.innerWidth - 44),
        };
    }

    function onDocMouseDown(): void {
        setSelAnchor(null);
    }

    function onDocMouseUp(): void {
        window.setTimeout(() => {
            const info = readDocSelection();
            if (info) {
                setSelAnchor(info);
            } else if (!composer()) {
                setSelAnchor(null);
            }
        }, 0);
    }

    function onDocClick(event: MouseEvent): void {
        const selection = docEl ? shadowSelection(docEl) : null;
        if (selection && !selection.isCollapsed) {
            return;
        }
        const block = (event.target as HTMLElement | null)?.closest<HTMLElement>('[data-thread-id]');
        const id = block ? Number(block.dataset['threadId']) : Number.NaN;
        if (!Number.isNaN(id)) {
            focusThread(id, 'card');
        }
    }

    function openComposer(): void {
        const anchor = selAnchor();
        if (!anchor) {
            return;
        }
        setComposer({
            ...anchor,
            top: Math.min(anchor.top, window.innerHeight - 320),
            left: Math.min(anchor.left, window.innerWidth - 380),
        });
        setSelAnchor(null);
        setActiveId(null);
    }

    function closeComposer(): void {
        setComposer(null);
        shadowSelection(docEl ?? document.body)?.removeAllRanges?.();
    }

    async function submitNewThread(content: string): Promise<void> {
        const target = composer();
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
        closeComposer();
        void refetchThreads();
    }

    const onScroll = (): void => {
        setSelAnchor(null);
    };
    const onResize = (): void => {
        setLayoutTick((value) => value + 1);
    };
    document.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onResize);
    onCleanup(() => {
        document.removeEventListener('scroll', onScroll, true);
        window.removeEventListener('resize', onResize);
    });

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
                                    resizeObserver.observe(el);
                                }}
                                innerHTML={docHtml()}
                                on:mousedown={onDocMouseDown}
                                on:mouseup={onDocMouseUp}
                                on:click={onDocClick}
                            />
                            <div
                                class="acr-rail"
                                ref={(el) => {
                                    railEl = el;
                                }}
                            >
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
                                                <div class="acr-rail__status">
                                                    No comments yet. Select text in the document to
                                                    comment.
                                                </div>
                                            }
                                        >
                                            <For each={list()}>
                                                {(thread) => {
                                                    onCleanup(() => {
                                                        const el = slotEls.get(thread.id);
                                                        if (el) {
                                                            resizeObserver.unobserve(el);
                                                        }
                                                        slotEls.delete(thread.id);
                                                    });
                                                    return (
                                                        <div
                                                            class="acr-rail__slot"
                                                            data-thread-id={thread.id}
                                                            style={{
                                                                top: `${cardTops()[thread.id] ?? 0}px`,
                                                            }}
                                                            ref={(el) => {
                                                                slotEls.set(thread.id, el);
                                                                resizeObserver.observe(el);
                                                            }}
                                                        >
                                                            <CommentCard
                                                                thread={thread}
                                                                active={activeId() === thread.id}
                                                                prBaseUrl={prBaseUrl()}
                                                                organizationUrl={
                                                                    props.context.organizationUrl
                                                                }
                                                                currentUserId={
                                                                    currentUser()?.id ?? null
                                                                }
                                                                onActivate={(id) =>
                                                                    focusThread(id, 'block')
                                                                }
                                                                onChanged={() =>
                                                                    void refetchThreads()
                                                                }
                                                            />
                                                        </div>
                                                    );
                                                }}
                                            </For>
                                        </Show>
                                    )}
                                </Show>
                            </div>
                        </div>
                    )}
                </Show>
            </Show>

            <Show when={selAnchor()}>
                {(anchor) => (
                    <button
                        class="acr-sel-btn"
                        type="button"
                        title="Add a comment"
                        style={{ top: `${anchor().top}px`, left: `${anchor().left}px` }}
                        on:mousedown={(event) => event.preventDefault()}
                        on:click={openComposer}
                    >
                        <CommentIcon size={15} />
                    </button>
                )}
            </Show>

            <Show when={composer()}>
                {(target) => (
                    <div
                        class="acr-popover"
                        style={{ top: `${target().top}px`, left: `${target().left}px` }}
                    >
                        <div class="acr-popover__title">
                            New comment · {target().startLine === target().endLine
                                ? `line ${target().startLine}`
                                : `lines ${target().startLine}–${target().endLine}`}
                        </div>
                        <CommentComposer
                            prBaseUrl={prBaseUrl()}
                            organizationUrl={props.context.organizationUrl}
                            placeholder="Comment on the selected text…"
                            submitLabel="Comment"
                            onSubmit={submitNewThread}
                            onCancel={closeComposer}
                        />
                    </div>
                )}
            </Show>
        </div>
    );
}
