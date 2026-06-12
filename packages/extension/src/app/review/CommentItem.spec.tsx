import { cleanup, fireEvent, render, screen, waitFor } from '@solidjs/testing-library';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { deleteComment, likeComment, unlikeComment, updateComment } from '../../lib/ado/threads';

import { CommentItem } from './CommentItem';
import { makeComment, makeIdentity } from './fixtures';

vi.mock('../../lib/ado/threads', () => ({
    deleteComment: vi.fn().mockResolvedValue(undefined),
    likeComment: vi.fn().mockResolvedValue(undefined),
    unlikeComment: vi.fn().mockResolvedValue(undefined),
    updateComment: vi.fn().mockResolvedValue(undefined),
}));

const NOW = Date.parse('2024-01-01T00:00:00.000Z');
const PR_URL = 'https://dev.azure.com/o/p/_apis/git/repositories/r/pullRequests/42';

interface RenderOptions {
    comment?: ReturnType<typeof makeComment>;
    canEdit?: boolean;
    currentUserId?: string | null;
    onChanged?: () => void;
}

function renderItem(options: RenderOptions = {}) {
    const onChanged = options.onChanged ?? vi.fn();
    const { container } = render(() => (
        <CommentItem
            comment={options.comment ?? makeComment()}
            threadId={100}
            prBaseUrl={PR_URL}
            organizationUrl="https://dev.azure.com/o"
            canEdit={options.canEdit ?? false}
            currentUserId={options.currentUserId ?? null}
            now={NOW}
            onChanged={onChanged}
        />
    ));
    return { container, onChanged };
}

describe('CommentItem', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });
    afterEach(() => cleanup());

    it('renders author, rendered markdown body and a relative timestamp', () => {
        const { container } = renderItem();
        expect(screen.getByText('Ada Lovelace')).toBeTruthy();
        expect(screen.getByText('Just now')).toBeTruthy();
        const body = container.querySelector('.acr-comment__body');
        expect(body?.querySelector('strong')?.textContent).toBe('world');
    });

    it('hides edit/delete controls unless canEdit is true', () => {
        renderItem({ canEdit: false });
        expect(screen.queryByTitle('Edit')).toBeNull();
        expect(screen.queryByTitle('Delete')).toBeNull();
        cleanup();

        renderItem({ canEdit: true });
        expect(screen.queryByTitle('Edit')).toBeTruthy();
        expect(screen.queryByTitle('Delete')).toBeTruthy();
    });

    it('likes a comment that the current user has not liked yet', async () => {
        const { onChanged } = renderItem({
            comment: makeComment({ usersLiked: [] }),
            currentUserId: 'user-1',
        });
        fireEvent.click(screen.getByTitle('Like'));
        await waitFor(() => expect(likeComment).toHaveBeenCalledTimes(1));
        expect(unlikeComment).not.toHaveBeenCalled();
        expect(onChanged).toHaveBeenCalled();
    });

    it('unlikes and shows a count when the current user already liked it', async () => {
        renderItem({
            comment: makeComment({ usersLiked: [makeIdentity({ id: 'user-1' })] }),
            currentUserId: 'user-1',
        });
        expect(screen.getByText('1')).toBeTruthy();
        fireEvent.click(screen.getByTitle('Unlike'));
        await waitFor(() => expect(unlikeComment).toHaveBeenCalledTimes(1));
        expect(likeComment).not.toHaveBeenCalled();
    });

    it('requires confirmation before deleting', async () => {
        const { container } = renderItem({ canEdit: true });
        expect(deleteComment).not.toHaveBeenCalled();

        fireEvent.click(screen.getByTitle('Delete'));
        expect(screen.getByText('Delete this comment?')).toBeTruthy();

        const confirm = container.querySelector('.acr-linkbtn--danger') as HTMLButtonElement;
        fireEvent.click(confirm);
        await waitFor(() => expect(deleteComment).toHaveBeenCalledTimes(1));
    });

    it('opens an inline editor and saves edits', async () => {
        const { container } = renderItem({ canEdit: true });
        fireEvent.click(screen.getByTitle('Edit'));

        const textarea = container.querySelector('.acr-composer__input') as HTMLTextAreaElement;
        expect(textarea).toBeTruthy();
        fireEvent.input(textarea, { target: { value: 'Edited body' } });

        const save = container.querySelector('.acr-btn--primary') as HTMLButtonElement;
        fireEvent.click(save);
        await waitFor(() => expect(updateComment).toHaveBeenCalledTimes(1));
        expect(updateComment).toHaveBeenCalledWith(PR_URL, 100, 1, 'Edited body');
    });

    it('copies a deep link to the comment', async () => {
        const writeText = vi.fn().mockResolvedValue(undefined);
        Object.defineProperty(navigator, 'clipboard', {
            value: { writeText },
            configurable: true,
        });
        renderItem();
        fireEvent.click(screen.getByTitle('Copy link to comment'));
        await waitFor(() => expect(writeText).toHaveBeenCalledTimes(1));
        expect(writeText.mock.calls[0]?.[0]).toContain('discussionId=100');
    });
});
