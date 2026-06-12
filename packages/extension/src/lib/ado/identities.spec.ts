import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';

import { fakeResponse, fetchUrl, stubFetch } from './fetch.mock';
import { fetchCurrentUser } from './identities';

let fetchMock: Mock;

beforeEach(() => {
    fetchMock = stubFetch();
});

afterEach(() => {
    vi.unstubAllGlobals();
});

describe('fetchCurrentUser', () => {
    it('maps the authenticatedUser from connectionData', async () => {
        fetchMock.mockResolvedValue(
            fakeResponse({
                jsonValue: {
                    authenticatedUser: { id: 'u1', providerDisplayName: 'Jane', imageUrl: 'http://img' },
                },
            }),
        );

        const user = await fetchCurrentUser('https://dev.azure.com/o');

        expect(user).toEqual({ id: 'u1', displayName: 'Jane', imageUrl: 'http://img' });
        expect(fetchUrl(fetchMock)).toBe(
            'https://dev.azure.com/o/_apis/connectionData?api-version=7.1-preview',
        );
    });

    it('returns null when there is no authenticated user', async () => {
        fetchMock.mockResolvedValue(fakeResponse({ jsonValue: {} }));
        expect(await fetchCurrentUser('https://dev.azure.com/o')).toBeNull();
    });

    it('falls back to customDisplayName when providerDisplayName is missing', async () => {
        fetchMock.mockResolvedValue(
            fakeResponse({ jsonValue: { authenticatedUser: { id: 'u2', customDisplayName: 'Bob' } } }),
        );

        const user = await fetchCurrentUser('https://dev.azure.com/o');

        expect(user).toEqual({ id: 'u2', displayName: 'Bob', imageUrl: undefined });
    });
});
