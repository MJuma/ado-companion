import { cleanup, fireEvent, render, screen, waitFor } from '@solidjs/testing-library';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { CommentComposer } from './CommentComposer';

vi.mock('../../lib/ado/attachments', () => ({
    uploadAttachment: vi.fn().mockResolvedValue({ url: 'https://example/att' }),
    attachmentMarkdown: vi.fn().mockReturnValue('![image](url)'),
}));

vi.mock('../../lib/ado/identities', () => ({
    searchIdentities: vi.fn().mockResolvedValue([]),
}));

const PR_URL = 'https://dev.azure.com/o/p/_apis/git/repositories/r/pullRequests/42';

interface RenderOptions {
    onSubmit?: (content: string) => void | Promise<void>;
    onCancel?: () => void;
    initialValue?: string;
}

function renderComposer(options: RenderOptions = {}) {
    const onSubmit = options.onSubmit ?? vi.fn().mockResolvedValue(undefined);
    const onCancel = options.onCancel ?? vi.fn();
    const { container } = render(() => (
        <CommentComposer
            prBaseUrl={PR_URL}
            organizationUrl="https://dev.azure.com/o"
            initialValue={options.initialValue}
            onSubmit={onSubmit}
            onCancel={onCancel}
        />
    ));
    const textarea = container.querySelector('.acr-composer__input') as HTMLTextAreaElement;
    const primary = container.querySelector('.acr-btn--primary') as HTMLButtonElement;
    return { container, onSubmit, onCancel, textarea, primary };
}

describe('CommentComposer', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });
    afterEach(() => cleanup());

    it('disables submit until there is non-whitespace content', () => {
        const { primary, textarea } = renderComposer();
        expect(primary.disabled).toBe(true);

        fireEvent.input(textarea, { target: { value: '   ' } });
        expect(primary.disabled).toBe(true);

        fireEvent.input(textarea, { target: { value: 'hello' } });
        expect(primary.disabled).toBe(false);
    });

    it('submits the content and clears the input', async () => {
        const { primary, textarea, onSubmit } = renderComposer();
        fireEvent.input(textarea, { target: { value: 'hello' } });
        fireEvent.click(primary);
        await waitFor(() => expect(onSubmit).toHaveBeenCalledWith('hello'));
        expect(textarea.value).toBe('');
    });

    it('submits on Ctrl/Cmd+Enter', async () => {
        const { textarea, onSubmit } = renderComposer();
        fireEvent.input(textarea, { target: { value: 'via shortcut' } });
        fireEvent.keyDown(textarea, { key: 'Enter', ctrlKey: true });
        await waitFor(() => expect(onSubmit).toHaveBeenCalledWith('via shortcut'));
    });

    it('renders a live markdown preview when content is present', () => {
        const { container } = renderComposer({ initialValue: 'Hello **bold**' });
        const preview = container.querySelector('.acr-composer__preview');
        expect(preview?.querySelector('strong')?.textContent).toBe('bold');
    });

    it('invokes onCancel from the Cancel button', () => {
        const { onCancel } = renderComposer();
        fireEvent.click(screen.getByText('Cancel'));
        expect(onCancel).toHaveBeenCalledTimes(1);
    });
});
