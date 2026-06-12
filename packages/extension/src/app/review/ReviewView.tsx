import {
    createEffect,
    createMemo,
    createResource,
    createSignal,
    For,
    onCleanup,
    Show,
} from 'solid-js';
import { createStore, reconcile } from 'solid-js/store';

import { fetchCurrentUser } from '../../lib/ado/identities';
import { getFileContent, getPrSourceCommit } from '../../lib/ado/items';
import { getPrApiBaseUrl, getRepoApiBaseUrl } from '../../lib/ado/pr';
import type { PrContext } from '../../lib/ado/pr';
import { ThreadStatus, isFileThread } from '../../lib/ado/pr-types';
import type { CommentThread, IdentityRef } from '../../lib/ado/pr-types';
import { buildLineThreadContext, createThread, listThreads } from '../../lib/ado/threads';
import { anchorThreads } from '../../lib/markdown/anchor';
import { resolveImageSrc } from '../../lib/markdown/images';
import { renderMarkdown } from '../../lib/markdown/render';
import { cacheMentionName } from '../../lib/review/mentions';

import { CommentCard } from './CommentCard';
import { CommentComposer } from './CommentComposer';
import { ChevronDownIcon, ChevronUpIcon, CommentIcon } from './Icons';
import { STATUS_OPTIONS } from './status';

type StatusFilter = 'all' | ThreadStatus;

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
    { value: 'all', label: 'All comments' },
    ...STATUS_OPTIONS,
];

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

function threadAuthors(thread: CommentThread): IdentityRef[] {
    return thread.comments
        .filter((comment) => !comment.isDeleted)
        .map((comment) => comment.author);
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

    // Mirror the fetched threads into a store and reconcile by id, so a refetch
    // (after a like, reply, status change…) patches in place instead of remounting
    // every card — no flash, and per-card UI state (collapse) survives.
    const [store, setStore] = createStore<{ list: CommentThread[] }>({ list: [] });
    createEffect(() => {
        const list = threads();
        if (list) {
            setStore('list', reconcile(list, { key: 'id' }));
        }
    });

    const prBaseUrl = (): string => getPrApiBaseUrl(props.context);

    const [currentUser] = createResource(
        () => props.context,
        (context) => fetchCurrentUser(context.organizationUrl).catch(() => null),
    );

    const [commitId] = createResource(
        () => props.context,
        (context) => getPrSourceCommit(getPrApiBaseUrl(context)).catch(() => null),
    );

    const [statusFilter, setStatusFilter] = createSignal<StatusFilter>('all');
    const [personFilter, setPersonFilter] = createSignal('all');
    // Comment-pane width. Ephemeral by design — resets to the default on reload.
    const [railWidth, setRailWidth] = createSignal(340);
    const [now, setNow] = createSignal(Date.now());
    const nowTimer = window.setInterval(() => setNow(Date.now()), 60_000);
    onCleanup(() => window.clearInterval(nowTimer));

    // Distinct people who have commented, for the "by person" filter.
    const people = createMemo<IdentityRef[]>(() => {
        const byId = new Map<string, IdentityRef>();
        for (const thread of store.list) {
            for (const author of threadAuthors(thread)) {
                if (author.id && !byId.has(author.id)) {
                    byId.set(author.id, author);
                }
            }
        }
        return [...byId.values()].sort((a, b) => a.displayName.localeCompare(b.displayName));
    });

    const visibleThreads = createMemo<CommentThread[]>(() => {
        const status = statusFilter();
        const person = personFilter();
        return store.list.filter((thread) => {
            const statusOk = status === 'all' || thread.status === status;
            const personOk =
                person === 'all' || threadAuthors(thread).some((author) => author.id === person);
            return statusOk && personOk;
        });
    });

    // Resolve names for @<GUID> mentions from everyone who has commented.
    createEffect(() => {
        for (const thread of store.list) {
            for (const comment of thread.comments) {
                if (comment.author.id) {
                    cacheMentionName(comment.author.id, comment.author.displayName);
                }
            }
        }
    });

    // Rewrite relative/LFS doc images to ADO items URLs once content + commit load.
    createEffect(() => {
        const rendered = !html.loading && html();
        const commit = commitId();
        if (!docEl || !rendered || !commit) {
            return;
        }
        requestAnimationFrame(() => {
            const root = docEl;
            if (!root) {
                return;
            }
            for (const img of root.querySelectorAll<HTMLImageElement>('img[src]')) {
                const original = img.getAttribute('src') ?? '';
                const resolved = resolveImageSrc(original, {
                    repoBaseUrl: getRepoApiBaseUrl(props.context),
                    filePath: props.context.filePath,
                    commitId: commit,
                });
                if (resolved) {
                    img.setAttribute('src', resolved);
                }
            }
        });
    });

    let docEl: HTMLDivElement | undefined;
    let railEl: HTMLDivElement | undefined;
    let toolbarEl: HTMLDivElement | undefined;
    let layoutEl: HTMLDivElement | undefined;
    let reviewEl: HTMLDivElement | undefined;
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

    // Drag the divider to resize the comment pane. Widening the rail narrows the
    // doc (which reflows), so the ResizeObserver re-aligns the cards.
    function startResize(event: MouseEvent): void {
        event.preventDefault();
        const startX = event.clientX;
        const startWidth = railWidth();
        const maxWidth = layoutEl ? layoutEl.clientWidth - 360 : 900;
        reviewEl?.classList.add('acr-resizing');
        const onMove = (moveEvent: MouseEvent): void => {
            const next = startWidth - (moveEvent.clientX - startX);
            setRailWidth(Math.max(260, Math.min(next, Math.max(260, maxWidth))));
        };
        const onUp = (): void => {
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onUp);
            reviewEl?.classList.remove('acr-resizing');
        };
        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
    }

    // Re-align cards whenever the pane is resized.
    createEffect(() => {
        railWidth();
        requestAnimationFrame(reposition);
    });

    // Word-style alignment: place each comment card at the vertical offset of its
    // anchored block, stacking down to avoid overlaps.
    function reposition(): void {
        const list = visibleThreads();
        if (!docEl || !railEl) {
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
        // Start below the sticky toolbar so the first card isn't hidden behind it.
        const headroom = toolbarEl ? toolbarEl.offsetHeight + 8 : 0;
        let cursor = headroom;
        for (const item of placed) {
            const base = Number.isFinite(item.desired) ? Math.max(item.desired, headroom) : cursor;
            const top = Math.max(base, cursor);
            next[item.id] = top;
            cursor = top + item.height + 8;
        }
        setCardTops(next);
    }

    // Highlight rendered blocks that carry comments, once doc + threads are ready.
    createEffect(() => {
        const list = visibleThreads();
        const rendered = !html.loading && html();
        if (!docEl || !rendered) {
            return;
        }
        requestAnimationFrame(() => {
            const root = docEl;
            if (!root) {
                return;
            }
            // Clear previous anchors so a filter change doesn't leave stale ones.
            for (const stale of root.querySelectorAll<HTMLElement>('[data-thread-id]')) {
                stale.classList.remove('acr-anchored', 'acr-anchored--active');
                delete stale.dataset['threadId'];
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
        visibleThreads();
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

    // Step to the next/previous comment in the current (filtered) order, wrapping
    // at either end. Starts from the active thread, or the first/last when none.
    function jumpComment(direction: 1 | -1): void {
        const list = visibleThreads();
        if (list.length === 0) {
            return;
        }
        const currentIdx = list.findIndex((thread) => thread.id === activeId());
        const nextIdx =
            currentIdx === -1
                ? direction === 1
                    ? 0
                    : list.length - 1
                : (currentIdx + direction + list.length) % list.length;
        const next = list[nextIdx];
        if (next) {
            focusThread(next.id, 'block');
        }
    }

    // When ADO links to a specific comment (clicking it in the file tree sets
    // ?discussionId=, without changing the file), scroll to and highlight that
    // thread. Polled because a same-file click is a URL change with no remount.
    let focusedDiscussion: string | null = null;
    function focusFromUrl(): void {
        const list = store.list;
        if (list.length === 0) {
            return;
        }
        const params = new URL(window.location.href).searchParams;
        const wanted = params.get('discussionId') ?? params.get('activeDiscussionId');
        if (!wanted || wanted === focusedDiscussion) {
            return;
        }
        const id = Number(wanted);
        if (Number.isNaN(id) || !list.some((thread) => thread.id === id)) {
            return;
        }
        focusedDiscussion = wanted;
        requestAnimationFrame(() => focusThread(id, 'block'));
    }

    createEffect(() => {
        void store.list;
        layoutTick();
        focusFromUrl();
    });

    const discussionPoll = window.setInterval(focusFromUrl, 500);
    onCleanup(() => window.clearInterval(discussionPoll));

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
        const aboveTop = rect.top - 32;
        return {
            startLine,
            endLine: Number.isNaN(endLine) ? startLine : Math.max(startLine, endLine),
            top: aboveTop >= 6 ? aboveTop : rect.bottom + 6,
            left: Math.min(Math.max(rect.left, 6), window.innerWidth - 40),
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
        <div
            class="ado-companion-review"
            ref={(el) => {
                reviewEl = el;
            }}
        >
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
                        <>
                            <div
                                class="acr-layout"
                                ref={(el) => {
                                    layoutEl = el;
                                }}
                            >
                                <div
                                    class="acr-doc markdown-content"
                                    role="document"
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
                                    class="acr-divider"
                                    role="separator"
                                    aria-orientation="vertical"
                                    aria-label="Resize comments pane"
                                    title="Drag to resize"
                                    on:mousedown={startResize}
                                />
                                <div
                                    class="acr-rail"
                                    role="complementary"
                                    aria-label="Comments"
                                    style={{ flex: `0 0 ${railWidth()}px` }}
                                    ref={(el) => {
                                        railEl = el;
                                    }}
                                >
                                    <div
                                        class="acr-toolbar"
                                        role="toolbar"
                                        aria-label="Review comments"
                                        ref={(el) => {
                                            toolbarEl = el;
                                            resizeObserver.observe(el);
                                        }}
                                    >
                                        <span class="acr-toolbar__count">
                                            {visibleThreads().length === store.list.length
                                                ? `${store.list.length} ${store.list.length === 1 ? 'thread' : 'threads'}`
                                                : `${visibleThreads().length} of ${store.list.length}`}
                                        </span>
                                        <span class="acr-nav">
                                            <button
                                                class="acr-iconbtn"
                                                type="button"
                                                title="Previous comment"
                                                aria-label="Previous comment"
                                                disabled={visibleThreads().length === 0}
                                                on:click={() => jumpComment(-1)}
                                            >
                                                <ChevronUpIcon size={14} />
                                            </button>
                                            <button
                                                class="acr-iconbtn"
                                                type="button"
                                                title="Next comment"
                                                aria-label="Next comment"
                                                disabled={visibleThreads().length === 0}
                                                on:click={() => jumpComment(1)}
                                            >
                                                <ChevronDownIcon size={14} />
                                            </button>
                                        </span>
                                        <span class="acr-toolbar__spacer" />
                                        <select
                                            class="acr-filter"
                                            aria-label="Filter by status"
                                            value={statusFilter()}
                                            on:change={(event) =>
                                                setStatusFilter(
                                                    (event.currentTarget as HTMLSelectElement)
                                                        .value as StatusFilter,
                                                )
                                            }
                                        >
                                            <For each={STATUS_FILTERS}>
                                                {(option) => (
                                                    <option value={option.value}>
                                                        {option.label}
                                                    </option>
                                                )}
                                            </For>
                                        </select>
                                        <Show when={people().length > 0}>
                                            <select
                                                class="acr-filter"
                                                aria-label="Filter by person"
                                                value={personFilter()}
                                                on:change={(event) =>
                                                    setPersonFilter(
                                                        (event.currentTarget as HTMLSelectElement)
                                                            .value,
                                                    )
                                                }
                                            >
                                                <option value="all">All people</option>
                                                <For each={people()}>
                                                    {(person) => (
                                                        <option value={person.id}>
                                                            {person.displayName}
                                                        </option>
                                                    )}
                                                </For>
                                            </select>
                                        </Show>
                                    </div>
                                    <Show
                                        when={!threads.loading || store.list.length > 0}
                                        fallback={
                                            <div class="acr-rail__status">Loading comments…</div>
                                        }
                                    >
                                        <Show
                                            when={visibleThreads().length > 0}
                                            fallback={
                                                <div class="acr-rail__status">
                                                    {store.list.length === 0
                                                        ? 'No comments yet. Select text in the document to comment.'
                                                        : 'No comments match this filter.'}
                                                </div>
                                            }
                                        >
                                            <For each={visibleThreads()}>
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
                                                                now={now()}
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
                                    </Show>
                                </div>
                            </div>
                        </>
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
