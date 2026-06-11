import { vi } from 'vitest';
import type { Mock } from 'vitest';

// Shared test helper (excluded from coverage via the *.mock.ts pattern).

export interface FakeResponseInit {
    ok?: boolean;
    status?: number;
    jsonValue?: unknown;
    textValue?: string;
}

export function fakeResponse(init: FakeResponseInit = {}): Response {
    const { ok = true, status = 200, jsonValue = {}, textValue = '' } = init;
    return {
        ok,
        status,
        json: () => Promise.resolve(jsonValue),
        text: () => Promise.resolve(textValue),
    } as unknown as Response;
}

/** Replace global fetch with a vi mock; returns it. Pair with vi.unstubAllGlobals(). */
export function stubFetch(): Mock {
    const mock = vi.fn();
    vi.stubGlobal('fetch', mock);
    return mock;
}

/** The RequestInit passed to the Nth fetch call (default: first). */
export function fetchInit(mock: Mock, callIndex = 0): RequestInit {
    return mock.mock.calls[callIndex]?.[1] as RequestInit;
}

/** The URL passed to the Nth fetch call (default: first). */
export function fetchUrl(mock: Mock, callIndex = 0): string {
    return mock.mock.calls[callIndex]?.[0] as string;
}

/** Parse the JSON body of the Nth fetch call. */
export function fetchJsonBody(mock: Mock, callIndex = 0): unknown {
    const body = fetchInit(mock, callIndex).body;
    return typeof body === 'string' ? JSON.parse(body) : body;
}
