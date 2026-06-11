import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
    AdoApiError,
    adoGetJson,
    adoGetText,
    adoPostBinary,
    adoSendJson,
    adoSendVoid,
} from './http';

interface FakeResponseInit {
    ok?: boolean;
    status?: number;
    jsonValue?: unknown;
    textValue?: string;
}

function fakeResponse(init: FakeResponseInit = {}): Response {
    const { ok = true, status = 200, jsonValue = {}, textValue = '' } = init;
    return {
        ok,
        status,
        json: () => Promise.resolve(jsonValue),
        text: () => Promise.resolve(textValue),
    } as unknown as Response;
}

const fetchMock = vi.fn();

beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock);
    fetchMock.mockReset();
});

afterEach(() => {
    vi.unstubAllGlobals();
});

function lastInit(): RequestInit {
    return fetchMock.mock.calls[0]?.[1] as RequestInit;
}

function headerOf(init: RequestInit, name: string): string | null {
    return new Headers(init.headers).get(name);
}

describe('adoGetJson', () => {
    it('issues a credentialed GET with the FedAuth-suppress header and returns parsed JSON', async () => {
        fetchMock.mockResolvedValue(fakeResponse({ jsonValue: { value: 42 } }));

        const result = await adoGetJson<{ value: number }>('https://dev.azure.com/x');

        expect(result).toEqual({ value: 42 });
        expect(fetchMock).toHaveBeenCalledWith('https://dev.azure.com/x', expect.anything());
        const init = lastInit();
        expect(init.method).toBe('GET');
        expect(init.credentials).toBe('include');
        expect(headerOf(init, 'X-TFS-FedAuthRedirect')).toBe('Suppress');
    });
});

describe('adoGetText', () => {
    it('returns the response text', async () => {
        fetchMock.mockResolvedValue(fakeResponse({ textValue: '# Title' }));
        await expect(adoGetText('https://dev.azure.com/file')).resolves.toBe('# Title');
    });
});

describe('adoSendJson', () => {
    it('sends a JSON body with the correct content type', async () => {
        fetchMock.mockResolvedValue(fakeResponse({ jsonValue: { id: 1 } }));

        const result = await adoSendJson<{ id: number }>('POST', 'https://dev.azure.com/threads', {
            content: 'hi',
        });

        expect(result).toEqual({ id: 1 });
        const init = lastInit();
        expect(init.method).toBe('POST');
        expect(headerOf(init, 'Content-Type')).toBe('application/json');
        expect(init.body).toBe(JSON.stringify({ content: 'hi' }));
    });
});

describe('adoSendVoid', () => {
    it('omits the body when no JSON is provided', async () => {
        fetchMock.mockResolvedValue(fakeResponse());
        await adoSendVoid('POST', 'https://dev.azure.com/likes');
        expect(lastInit().body).toBeUndefined();
    });

    it('includes a JSON body when provided', async () => {
        fetchMock.mockResolvedValue(fakeResponse());
        await adoSendVoid('PATCH', 'https://dev.azure.com/threads/1', { status: 'closed' });
        expect(lastInit().body).toBe(JSON.stringify({ status: 'closed' }));
    });
});

describe('adoPostBinary', () => {
    it('posts raw bytes as octet-stream by default', async () => {
        fetchMock.mockResolvedValue(fakeResponse({ jsonValue: { url: 'u' } }));
        const data = new Uint8Array([1, 2, 3]);

        const result = await adoPostBinary<{ url: string }>(
            'https://dev.azure.com/attachments/x',
            data,
        );

        expect(result).toEqual({ url: 'u' });
        const init = lastInit();
        expect(init.method).toBe('POST');
        expect(headerOf(init, 'Content-Type')).toBe('application/octet-stream');
        expect(init.body).toBe(data);
    });
});

describe('error handling', () => {
    it('throws AdoApiError with status and body on a non-ok response', async () => {
        fetchMock.mockResolvedValue(
            fakeResponse({ ok: false, status: 404, textValue: 'not found' }),
        );

        await expect(adoGetJson('https://dev.azure.com/missing')).rejects.toBeInstanceOf(
            AdoApiError,
        );
    });

    it('captures the status and body on the error', async () => {
        fetchMock.mockResolvedValue(
            fakeResponse({ ok: false, status: 403, textValue: 'denied' }),
        );

        await expect(adoGetJson('https://dev.azure.com/forbidden')).rejects.toMatchObject({
            status: 403,
            body: 'denied',
        });
    });
});
