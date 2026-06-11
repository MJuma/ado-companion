import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';

import { fakeResponse, fetchUrl, stubFetch } from './fetch.mock';
import {
    buildImageItemUrl,
    getFileContent,
    getFileContentAtCommit,
    getPrSourceCommit,
} from './items';
import type { PrContext } from './pr';

const PR = 'https://dev.azure.com/o/p/_apis/git/repositories/r/pullRequests/42';
const REPO = 'https://dev.azure.com/o/p/_apis/git/repositories/r';

const ctx: PrContext = {
    organization: 'o',
    organizationUrl: 'https://dev.azure.com/o',
    project: 'p',
    repositoryId: 'r',
    pullRequestId: 42,
    filePath: '/docs/spec.md',
};

let fetchMock: Mock;

beforeEach(() => {
    fetchMock = stubFetch();
});

afterEach(() => {
    vi.unstubAllGlobals();
});

describe('getPrSourceCommit', () => {
    it('returns the lastMergeSourceCommit id', async () => {
        fetchMock.mockResolvedValue(
            fakeResponse({ jsonValue: { lastMergeSourceCommit: { commitId: 'abc123' } } }),
        );

        expect(await getPrSourceCommit(PR)).toBe('abc123');
        expect(fetchUrl(fetchMock)).toBe(`${PR}?api-version=7.1`);
    });

    it('returns null when there is no source commit', async () => {
        fetchMock.mockResolvedValue(fakeResponse({ jsonValue: {} }));
        expect(await getPrSourceCommit(PR)).toBeNull();
    });
});

describe('getFileContentAtCommit', () => {
    it('requests raw content with includeContent and the commit version', async () => {
        fetchMock.mockResolvedValue(fakeResponse({ textValue: '# Hello' }));

        const content = await getFileContentAtCommit(REPO, '/docs/spec.md', 'sha1');

        expect(content).toBe('# Hello');
        const url = fetchUrl(fetchMock);
        expect(url).toContain('/items?');
        expect(url).toContain('includeContent=true');
        expect(url).toContain('versionDescriptor.version=sha1');
        expect(url).toContain('versionDescriptor.versionType=commit');
        expect(decodeURIComponent(url)).toContain('path=/docs/spec.md');
    });

    it('returns an empty string for an empty file', async () => {
        fetchMock.mockResolvedValue(fakeResponse({ textValue: '' }));
        expect(await getFileContentAtCommit(REPO, '/a.md', 'sha')).toBe('');
    });
});

describe('buildImageItemUrl', () => {
    it('builds a raw-download URL that resolves Git LFS', () => {
        const url = buildImageItemUrl(REPO, '/img/logo.png', 'abc');

        expect(url.startsWith(`${REPO}/items?`)).toBe(true);
        expect(url).toContain('download=true');
        expect(url).toContain('resolveLfs=true');
        expect(url).toContain('versionDescriptor.version=abc');
        expect(decodeURIComponent(url)).toContain('path=/img/logo.png');
    });
});

describe('getFileContent', () => {
    it('resolves the source commit then fetches the file content', async () => {
        fetchMock.mockResolvedValueOnce(
            fakeResponse({ jsonValue: { lastMergeSourceCommit: { commitId: 'abc123' } } }),
        );
        fetchMock.mockResolvedValueOnce(fakeResponse({ textValue: '# Doc' }));

        const content = await getFileContent(ctx);

        expect(content).toBe('# Doc');
        expect(fetchUrl(fetchMock, 0)).toBe(`${PR}?api-version=7.1`);
        expect(fetchUrl(fetchMock, 1)).toContain('versionDescriptor.version=abc123');
    });

    it('returns null when the PR has no source commit', async () => {
        fetchMock.mockResolvedValueOnce(fakeResponse({ jsonValue: {} }));
        expect(await getFileContent(ctx)).toBeNull();
    });
});
