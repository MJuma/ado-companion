import { describe, expect, it } from 'vitest';

import {
    getPrApiBaseUrl,
    getRepoApiBaseUrl,
    isMarkdownFile,
    parsePrContext,
} from './pr';

describe('parsePrContext', () => {
    it('parses a dev.azure.com PR markdown URL with a path query', () => {
        const ctx = parsePrContext(
            'https://dev.azure.com/contoso/MyProject/_git/MyRepo/pullrequest/42?path=/docs/spec.md',
        );

        expect(ctx).toEqual({
            organization: 'contoso',
            organizationUrl: 'https://dev.azure.com/contoso',
            project: 'MyProject',
            repositoryId: 'MyRepo',
            pullRequestId: 42,
            filePath: '/docs/spec.md',
        });
    });

    it('parses a legacy visualstudio.com PR markdown URL', () => {
        const ctx = parsePrContext(
            'https://contoso.visualstudio.com/MyProject/_git/MyRepo/pullrequest/7?path=/README.md',
        );

        expect(ctx?.organization).toBe('contoso');
        expect(ctx?.organizationUrl).toBe('https://contoso.visualstudio.com');
        expect(ctx?.pullRequestId).toBe(7);
        expect(ctx?.filePath).toBe('/README.md');
    });

    it('reads (and decodes) the file path from the URL hash', () => {
        const ctx = parsePrContext(
            'https://dev.azure.com/contoso/MyProject/_git/MyRepo/pullrequest/42#_a=files&path=%2Fdocs%2Fmy%20spec.md',
        );

        expect(ctx?.filePath).toBe('/docs/my spec.md');
    });

    it('is case-insensitive for the pullrequest segment and .md extension', () => {
        const ctx = parsePrContext(
            'https://dev.azure.com/contoso/MyProject/_git/MyRepo/pullRequest/9?path=/A.MD',
        );

        expect(ctx?.pullRequestId).toBe(9);
        expect(ctx?.filePath).toBe('/A.MD');
    });

    it('returns null for a non-markdown file', () => {
        expect(
            parsePrContext(
                'https://dev.azure.com/contoso/MyProject/_git/MyRepo/pullrequest/42?path=/src/index.ts',
            ),
        ).toBeNull();
    });

    it('returns null when no file path is present', () => {
        expect(
            parsePrContext('https://dev.azure.com/contoso/MyProject/_git/MyRepo/pullrequest/42'),
        ).toBeNull();
    });

    it('returns null for a non-PR ADO URL', () => {
        expect(
            parsePrContext('https://dev.azure.com/contoso/MyProject/_git/MyRepo?path=/a.md'),
        ).toBeNull();
    });

    it('returns null for an unrelated host', () => {
        expect(parsePrContext('https://github.com/foo/bar/pull/1')).toBeNull();
    });
});

describe('base URL helpers', () => {
    const devCtx = parsePrContext(
        'https://dev.azure.com/contoso/MyProject/_git/MyRepo/pullrequest/42?path=/a.md',
    )!;

    it('builds the repo API base URL', () => {
        expect(getRepoApiBaseUrl(devCtx)).toBe(
            'https://dev.azure.com/contoso/MyProject/_apis/git/repositories/MyRepo',
        );
    });

    it('builds the PR API base URL', () => {
        expect(getPrApiBaseUrl(devCtx)).toBe(
            'https://dev.azure.com/contoso/MyProject/_apis/git/repositories/MyRepo/pullRequests/42',
        );
    });

    it('builds a visualstudio.com PR API base URL without an org path segment', () => {
        const vsCtx = parsePrContext(
            'https://contoso.visualstudio.com/MyProject/_git/MyRepo/pullrequest/7?path=/a.md',
        )!;
        expect(getPrApiBaseUrl(vsCtx)).toBe(
            'https://contoso.visualstudio.com/MyProject/_apis/git/repositories/MyRepo/pullRequests/7',
        );
    });
});

describe('isMarkdownFile', () => {
    it('accepts .md (any case) and rejects others', () => {
        expect(isMarkdownFile('/docs/a.md')).toBe(true);
        expect(isMarkdownFile('/docs/a.MD')).toBe(true);
        expect(isMarkdownFile('/docs/a.markdown')).toBe(false);
        expect(isMarkdownFile('/docs/a.txt')).toBe(false);
    });
});
