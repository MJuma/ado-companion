import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';

import { fakeResponse, fetchJsonBody, fetchUrl, stubFetch } from './fetch.mock';
import { fetchCurrentUser, searchIdentities } from './identities';

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

describe('searchIdentities', () => {
    it('returns nothing for a blank query without calling the API', async () => {
        expect(await searchIdentities('https://dev.azure.com/o', '   ')).toEqual([]);
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it('maps identities with a localId and posts the query', async () => {
        fetchMock.mockResolvedValue(
            fakeResponse({
                jsonValue: {
                    results: [
                        {
                            identities: [
                                { localId: 'g1', displayName: 'Jane Doe', mail: 'jane@x.com' },
                                { localId: null, displayName: 'No Local' },
                                { displayName: 'No Id' },
                                { localId: 'g2', displayName: 'Bob', signInAddress: 'bob@x.com' },
                            ],
                        },
                    ],
                },
            }),
        );

        const results = await searchIdentities('https://dev.azure.com/o', 'ja');

        expect(results).toEqual([
            {
                id: 'g1',
                displayName: 'Jane Doe',
                mail: 'jane@x.com',
                imageUrl: 'https://dev.azure.com/o/_api/_common/identityImage?id=g1',
            },
            {
                id: 'g2',
                displayName: 'Bob',
                mail: 'bob@x.com',
                imageUrl: 'https://dev.azure.com/o/_api/_common/identityImage?id=g2',
            },
        ]);
        expect(fetchUrl(fetchMock)).toContain('/_apis/IdentityPicker/Identities');
        expect((fetchJsonBody(fetchMock) as { query: string }).query).toBe('ja');
    });

    it('handles an empty result set', async () => {
        fetchMock.mockResolvedValue(fakeResponse({ jsonValue: { results: [] } }));
        expect(await searchIdentities('https://dev.azure.com/o', 'zzz')).toEqual([]);
    });
});
