import { createSignal, For, onCleanup, onMount, Show } from 'solid-js';

import { attachmentMarkdown, uploadAttachment } from '../../lib/ado/attachments';
import { searchIdentities } from '../../lib/ado/identities';
import type { MentionCandidate } from '../../lib/ado/identities';
import { attachmentFileName, insertText, pickImageFiles } from '../../lib/review/editor';
import { renderMarkdown } from '../../lib/markdown/render';
import {
    applyMentionSelection,
    cacheMentionName,
    encodeMentions,
    findMentionQuery,
    renderMentions,
} from '../../lib/review/mentions';
import type { PendingMention } from '../../lib/review/mentions';

interface CommentComposerProps {
    prBaseUrl: string;
    organizationUrl: string;
    placeholder?: string;
    initialValue?: string;
    submitLabel?: string;
    onSubmit: (content: string) => Promise<void> | void;
    onCancel?: () => void;
}

export function CommentComposer(props: CommentComposerProps) {
    const [value, setValue] = createSignal(props.initialValue ?? '');
    const [busy, setBusy] = createSignal(false);
    const [uploading, setUploading] = createSignal(false);
    const [error, setError] = createSignal<string | null>(null);

    const [candidates, setCandidates] = createSignal<MentionCandidate[]>([]);
    const [mentionsOpen, setMentionsOpen] = createSignal(false);
    const [activeIndex, setActiveIndex] = createSignal(0);
    let pending: PendingMention[] = [];
    let searchTimer: ReturnType<typeof setTimeout> | undefined;

    let textarea: HTMLTextAreaElement | undefined;

    onMount(() => {
        // Focus immediately so the first keystroke lands here (and never in ADO's
        // global search via its document-level shortcut handlers).
        const focus = (): void => textarea?.focus();
        focus();
        requestAnimationFrame(focus);
        window.setTimeout(focus, 40);
    });

    onCleanup(() => {
        if (searchTimer) {
            clearTimeout(searchTimer);
        }
    });

    function setValueAndCaret(next: string, caret: number): void {
        setValue(next);
        requestAnimationFrame(() => {
            if (textarea) {
                textarea.focus();
                textarea.setSelectionRange(caret, caret);
            }
        });
    }

    function insertAtCaret(snippet: string): void {
        const el = textarea;
        const current = value();
        const start = el ? el.selectionStart : current.length;
        const end = el ? el.selectionEnd : current.length;
        const result = insertText(current, start, end, snippet);
        setValueAndCaret(result.value, result.cursor);
    }

    function closeMentions(): void {
        setMentionsOpen(false);
        setCandidates([]);
    }

    async function runSearch(query: string): Promise<void> {
        try {
            const results = await searchIdentities(props.organizationUrl, query);
            const el = textarea;
            const current = el ? findMentionQuery(el.value, el.selectionStart) : null;
            if (!current || current.query !== query) {
                return;
            }
            setCandidates(results);
            setActiveIndex(0);
            setMentionsOpen(results.length > 0);
        } catch {
            closeMentions();
        }
    }

    function updateMentions(text: string, caret: number): void {
        const query = findMentionQuery(text, caret);
        if (!query || query.query.trim().length === 0) {
            closeMentions();
            return;
        }
        if (searchTimer) {
            clearTimeout(searchTimer);
        }
        searchTimer = setTimeout(() => {
            void runSearch(query.query);
        }, 180);
    }

    function selectCandidate(candidate: MentionCandidate): void {
        const el = textarea;
        const current = el ? el.value : value();
        const caret = el ? el.selectionStart : current.length;
        const query = findMentionQuery(current, caret);
        if (!query) {
            closeMentions();
            return;
        }
        const result = applyMentionSelection(current, query.start, caret, candidate.displayName);
        pending = [...pending, { token: result.token, guid: candidate.id }];
        cacheMentionName(candidate.id, candidate.displayName);
        closeMentions();
        setValueAndCaret(result.value, result.cursor);
    }

    async function uploadImages(files: File[]): Promise<void> {
        const images = pickImageFiles(files);
        if (images.length === 0) {
            return;
        }
        setUploading(true);
        setError(null);
        try {
            for (const image of images) {
                const name = attachmentFileName(image.type, new Date());
                const attachment = await uploadAttachment(props.prBaseUrl, name, image);
                insertAtCaret(`\n${attachmentMarkdown(name, attachment)}\n`);
            }
        } catch {
            setError('Image upload failed.');
        } finally {
            setUploading(false);
        }
    }

    function onPaste(event: ClipboardEvent): void {
        const files = event.clipboardData ? Array.from(event.clipboardData.files) : [];
        if (pickImageFiles(files).length > 0) {
            event.preventDefault();
            void uploadImages(files);
        }
    }

    function onDrop(event: DragEvent): void {
        const files = event.dataTransfer ? Array.from(event.dataTransfer.files) : [];
        if (pickImageFiles(files).length > 0) {
            event.preventDefault();
            void uploadImages(files);
        }
    }

    async function submit(): Promise<void> {
        const raw = value().trim();
        if (raw.length === 0 || busy()) {
            return;
        }
        setBusy(true);
        setError(null);
        try {
            await props.onSubmit(encodeMentions(raw, pending));
            setValue('');
            pending = [];
        } catch {
            setError('Could not save your comment.');
        } finally {
            setBusy(false);
        }
    }

    function onKeyDown(event: KeyboardEvent): void {
        const list = candidates();
        if (mentionsOpen() && list.length > 0) {
            if (event.key === 'ArrowDown') {
                event.preventDefault();
                setActiveIndex((activeIndex() + 1) % list.length);
                return;
            }
            if (event.key === 'ArrowUp') {
                event.preventDefault();
                setActiveIndex((activeIndex() - 1 + list.length) % list.length);
                return;
            }
            if (event.key === 'Enter' || event.key === 'Tab') {
                const choice = list[activeIndex()];
                if (choice) {
                    event.preventDefault();
                    selectCandidate(choice);
                    return;
                }
            }
            if (event.key === 'Escape') {
                event.preventDefault();
                closeMentions();
                return;
            }
        }
        if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
            event.preventDefault();
            void submit();
        }
    }

    function onInput(event: Event): void {
        const el = event.currentTarget as HTMLTextAreaElement;
        setValue(el.value);
        updateMentions(el.value, el.selectionStart);
    }

    return (
        <div class="acr-composer">
            <textarea
                class="acr-composer__input"
                placeholder={props.placeholder ?? 'Leave a comment…'}
                value={value()}
                ref={(el) => {
                    textarea = el;
                }}
                on:input={onInput}
                on:paste={onPaste}
                on:drop={onDrop}
                on:keydown={onKeyDown}
            />
            <Show when={mentionsOpen() && candidates().length > 0}>
                <ul class="acr-mentions">
                    <For each={candidates()}>
                        {(candidate, index) => (
                            <li
                                class="acr-mentions__item"
                                classList={{
                                    'acr-mentions__item--active': index() === activeIndex(),
                                }}
                                on:mousedown={(event) => {
                                    event.preventDefault();
                                    selectCandidate(candidate);
                                }}
                            >
                                <span class="acr-mentions__name">{candidate.displayName}</span>
                                <Show when={candidate.mail}>
                                    <span class="acr-mentions__mail">{candidate.mail}</span>
                                </Show>
                            </li>
                        )}
                    </For>
                </ul>
            </Show>
            <Show when={value().trim().length > 0}>
                <div class="acr-composer__preview-label">Preview</div>
                <div
                    class="acr-composer__preview markdown-content"
                    innerHTML={renderMarkdown(renderMentions(value()))}
                />
            </Show>
            <div class="acr-composer__actions">
                <Show when={uploading()}>
                    <span class="acr-composer__hint">Uploading image…</span>
                </Show>
                <Show when={error()}>
                    <span class="acr-composer__error">{error()}</span>
                </Show>
                <span class="acr-composer__spacer" />
                <Show when={props.onCancel}>
                    <button
                        class="acr-btn"
                        type="button"
                        on:click={() => props.onCancel?.()}
                        disabled={busy()}
                    >
                        Cancel
                    </button>
                </Show>
                <button
                    class="acr-btn acr-btn--primary"
                    type="button"
                    on:click={() => void submit()}
                    disabled={busy() || value().trim().length === 0}
                >
                    {props.submitLabel ?? 'Comment'}
                </button>
            </div>
        </div>
    );
}
