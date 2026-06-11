import { describe, expect, it } from 'vitest';

import { parseAdoContext } from './ado';

describe('parseAdoContext', () => {
    it('parses organization and project from a dev.azure.com URL', () => {
        const context = parseAdoContext(
            'https://dev.azure.com/contoso/MyProject/_git/repo',
        );

        expect(context).toEqual({
            isAzureDevOps: true,
            organization: 'contoso',
            project: 'MyProject',
        });
    });

    it('parses organization only when no project is present', () => {
        const context = parseAdoContext('https://dev.azure.com/contoso');

        expect(context).toEqual({
            isAzureDevOps: true,
            organization: 'contoso',
            project: null,
        });
    });

    it('ignores underscore-prefixed segments as projects', () => {
        const context = parseAdoContext(
            'https://dev.azure.com/contoso/_settings',
        );

        expect(context.project).toBeNull();
        expect(context.organization).toBe('contoso');
    });

    it('parses the legacy visualstudio.com layout', () => {
        const context = parseAdoContext(
            'https://contoso.visualstudio.com/MyProject/_boards',
        );

        expect(context).toEqual({
            isAzureDevOps: true,
            organization: 'contoso',
            project: 'MyProject',
        });
    });

    it('returns a non-ADO context for unrelated hosts', () => {
        expect(parseAdoContext('https://github.com/foo/bar')).toEqual({
            isAzureDevOps: false,
            organization: null,
            project: null,
        });
    });

    it('returns a non-ADO context for invalid URLs', () => {
        expect(parseAdoContext('not a url')).toEqual({
            isAzureDevOps: false,
            organization: null,
            project: null,
        });
    });
});
