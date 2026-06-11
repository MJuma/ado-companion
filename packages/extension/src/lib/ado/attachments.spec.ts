import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';

import { attachmentMarkdown, uploadAttachment } from './attachments';
import { fakeResponse, fetchInit, fetchUrl, stubFetch } from './fetch.mock';

const PR = 'https://dev.azure.com/o/p/_apis/git/repositories/r/pullRequests/42';

let fetchMock: Mock;

beforeEach(() => {
    fetchMock = stubFetch();
});

afterEach(() => {
    vi.unstubAllGlobals();
});

describe('uploadAttachment', () => {
    it('POSTs raw bytes to the encoded attachment URL and returns the attachment', async () => {
        fetchMock.mockResolvedValue(
            fakeResponse({ jsonValue: { url: 'https://dev.azure.com/o/p/_apis/.../attachments/x' } }),
        );
        const data = new Uint8Array([1, 2, 3]);

        const attachment = await uploadAttachment(PR, 'my image.png', data);

        expect(attachment.url).toContain('attachments');
        expect(fetchInit(fetchMock).method).toBe('POST');
        expect(fetchUrl(fetchMock)).toBe(`${PR}/attachments/my%20image.png?api-version=7.1`);
        expect(new Headers(fetchInit(fetchMock).headers).get('Content-Type')).toBe(
            'application/octet-stream',
        );
    });
});

describe('attachmentMarkdown', () => {
    it('builds a markdown image reference', () => {
        expect(attachmentMarkdown('shot.png', { url: 'https://x/y' })).toBe(
            '![shot.png](https://x/y)',
        );
    });
});
