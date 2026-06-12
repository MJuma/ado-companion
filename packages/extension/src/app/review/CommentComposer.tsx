import { createSignal, Show } from 'solid-js';

import { attachmentMarkdown, uploadAttachment } from '../../lib/ado/attachments';
import { attachmentFileName, insertText, pickImageFiles } from '../../lib/review/editor';

interface CommentComposerProps {
    prBaseUrl: string;
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

    let textarea: HTMLTextAreaElement | undefined;
    let fileInput: HTMLInputElement | undefined;

    function insertAtCaret(snippet: string): void {
        const el = textarea;
        const current = value();
        const start = el ? el.selectionStart : current.length;
        const end = el ? el.selectionEnd : current.length;
        const result = insertText(current, start, end, snippet);
        setValue(result.value);
        requestAnimationFrame(() => {
            if (el) {
                el.focus();
                el.setSelectionRange(result.cursor, result.cursor);
            }
        });
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

    function onFilePick(event: Event): void {
        const input = event.currentTarget as HTMLInputElement;
        const files = input.files ? Array.from(input.files) : [];
        void uploadImages(files);
        input.value = '';
    }

    async function submit(): Promise<void> {
        const content = value().trim();
        if (content.length === 0 || busy()) {
            return;
        }
        setBusy(true);
        setError(null);
        try {
            await props.onSubmit(content);
            setValue('');
        } catch {
            setError('Could not save your comment.');
        } finally {
            setBusy(false);
        }
    }

    function onKeyDown(event: KeyboardEvent): void {
        if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
            event.preventDefault();
            void submit();
        }
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
                on:input={(event) => {
                    setValue((event.currentTarget as HTMLTextAreaElement).value);
                }}
                on:paste={onPaste}
                on:drop={onDrop}
                on:keydown={onKeyDown}
            />
            <input
                type="file"
                accept="image/*"
                multiple
                hidden
                ref={(el) => {
                    fileInput = el;
                }}
                on:change={onFilePick}
            />
            <div class="acr-composer__actions">
                <button
                    class="acr-btn"
                    type="button"
                    title="Attach an image"
                    on:click={() => fileInput?.click()}
                    disabled={uploading()}
                >
                    Image
                </button>
                <Show when={uploading()}>
                    <span class="acr-composer__hint">Uploading…</span>
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
