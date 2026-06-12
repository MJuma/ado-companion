import { cleanup, fireEvent, render, screen, waitFor } from '@solidjs/testing-library';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ThreadStatus } from '../../lib/ado/pr-types';
import { setThreadStatus } from '../../lib/ado/threads';

import { CommentCard } from './CommentCard';
import { makeComment, makeThread } from './fixtures';

vi.mock('../../lib/ado/threads', () => ({
    addReply: vi.fn().mockResolvedValue(undefined),
    setThreadStatus: vi.fn().mockResolvedValue(undefined),
    deleteComment: vi.fn().mockResolvedValue(undefined),
    likeComment: vi.fn().mockResolvedValue(undefined),
    unlikeComment: vi.fn().mockResolvedValue(undefined),
    updateComment: vi.fn().mockResolvedValue(undefined),
}));

const NOW = Date.parse('2024-01-01T00:00:00.000Z');
const PR_URL = 'https://dev.azure.com/o/p/_apis/git/repositories/r/pullRequests/42';

interface RenderOptions {
    thread?: ReturnType<typeof makeThread>;
    active?: boolean;
    onActivate?: (id: number) => void;
    onChanged?: () => void;
}

function renderCard(options: RenderOptions = {}) {
    const onActivate = options.onActivate ?? vi.fn();
    const onChanged = options.onChanged ?? vi.fn();
    const { container } = render(() => (
        <CommentCard
            thread={options.thread ?? makeThread()}
            active={options.active ?? false}
            prBaseUrl={PR_URL}
            organizationUrl="https://dev.azure.com/o"
            currentUserId="user-1"
            now={NOW}
            onActivate={onActivate}
            onChanged={onChanged}
        />
    ));
    return { container, onActivate, onChanged };
}

describe('CommentCard', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });
    afterEach(() => cleanup());

    it('shows the comment body for an active thread', () => {
        const { container } = renderCard();
        expect(container.querySelector('.acr-comment__body')).toBeTruthy();
    });

    it('starts collapsed when the thread is resolved and expands on click', () => {
        const thread = makeThread({
            status: ThreadStatus.Fixed,
            comments: [makeComment(), makeComment({ id: 2 })],
        });
        const { container } = renderCard({ thread });

        expect(container.querySelector('.acr-comment__body')).toBeNull();
        expect(container.querySelector('.acr-card__summary')?.textContent).toContain('2 comments');

        fireEvent.click(screen.getByTitle('Expand'));
        expect(container.querySelector('.acr-comment__body')).toBeTruthy();
    });

    it('activates the thread when the card is clicked', () => {
        const { container, onActivate } = renderCard();
        fireEvent.click(container.querySelector('.acr-card') as HTMLElement);
        expect(onActivate).toHaveBeenCalledWith(100);
    });

    it('changes the thread status', async () => {
        const { container } = renderCard();
        const select = container.querySelector('.acr-select') as HTMLSelectElement;
        fireEvent.change(select, { target: { value: ThreadStatus.Fixed } });
        await waitFor(() => expect(setThreadStatus).toHaveBeenCalledTimes(1));
        expect(setThreadStatus).toHaveBeenCalledWith(PR_URL, 100, ThreadStatus.Fixed);
    });

    it('reveals a reply composer', () => {
        const { container } = renderCard();
        fireEvent.click(screen.getByText('Reply'));
        expect(container.querySelector('.acr-card__reply .acr-composer__input')).toBeTruthy();
    });
});
