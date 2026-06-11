import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';

import { fakeResponse, fetchUrl, stubFetch } from './fetch.mock';
import { getPullRequestThreadContext, listIterations } from './iterations';

const PR = 'https://dev.azure.com/o/p/_apis/git/repositories/r/pullRequests/42';

let fetchMock: Mock;

beforeEach(() => {
    fetchMock = stubFetch();
});

afterEach(() => {
    vi.unstubAllGlobals();
});

describe('listIterations', () => {
    it('GETs /iterations and returns the value array', async () => {
        fetchMock.mockResolvedValue(
            fakeResponse({ jsonValue: { count: 2, value: [{ id: 1 }, { id: 2 }] } }),
        );

        const iterations = await listIterations(PR);

        expect(iterations).toHaveLength(2);
        expect(fetchUrl(fetchMock)).toBe(`${PR}/iterations?api-version=7.1`);
    });
});

describe('getPullRequestThreadContext', () => {
    it('resolves the latest iteration and the file changeTrackingId', async () => {
        fetchMock.mockResolvedValueOnce(
            fakeResponse({ jsonValue: { count: 2, value: [{ id: 1 }, { id: 2 }] } }),
        );
        fetchMock.mockResolvedValueOnce(
            fakeResponse({
                jsonValue: {
                    changeEntries: [{ changeId: 1, changeTrackingId: 9, item: { path: '/docs/spec.md' } }],
                },
            }),
        );

        const prtc = await getPullRequestThreadContext(PR, '/docs/spec.md');

        expect(prtc).toEqual({
            iterationContext: { firstComparingIteration: 2, secondComparingIteration: 2 },
            changeTrackingId: 9,
        });
        expect(fetchUrl(fetchMock, 1)).toBe(`${PR}/iterations/2/changes?api-version=7.1`);
    });

    it('matches a file path regardless of a leading slash', async () => {
        fetchMock.mockResolvedValueOnce(fakeResponse({ jsonValue: { count: 1, value: [{ id: 1 }] } }));
        fetchMock.mockResolvedValueOnce(
            fakeResponse({
                jsonValue: {
                    changeEntries: [{ changeId: 1, changeTrackingId: 3, item: { path: 'docs/spec.md' } }],
                },
            }),
        );

        const prtc = await getPullRequestThreadContext(PR, '/docs/spec.md');

        expect(prtc?.changeTrackingId).toBe(3);
    });

    it('returns null when the PR has no iterations', async () => {
        fetchMock.mockResolvedValueOnce(fakeResponse({ jsonValue: { count: 0, value: [] } }));

        expect(await getPullRequestThreadContext(PR, '/x.md')).toBeNull();
    });

    it('returns null when the file is not in the latest iteration', async () => {
        fetchMock.mockResolvedValueOnce(fakeResponse({ jsonValue: { count: 1, value: [{ id: 1 }] } }));
        fetchMock.mockResolvedValueOnce(
            fakeResponse({
                jsonValue: {
                    changeEntries: [{ changeId: 1, changeTrackingId: 9, item: { path: '/other.md' } }],
                },
            }),
        );

        expect(await getPullRequestThreadContext(PR, '/docs/spec.md')).toBeNull();
    });
});
