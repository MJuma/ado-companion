import { describe, expect, it } from 'vitest';

import { isUrlAllowed } from './allowlist';
import { DEFAULT_SETTINGS } from './model';

const url = 'https://dev.azure.com/powerbi/Power%20BI/_git/repo/pullrequest/1';

describe('isUrlAllowed', () => {
    it('allows everything with the default (empty) allowlist', () => {
        expect(isUrlAllowed(url, DEFAULT_SETTINGS)).toBe(true);
    });

    it('blocks everything when disabled', () => {
        expect(isUrlAllowed(url, { enabled: false, allowlist: [] })).toBe(false);
        expect(isUrlAllowed(url, { enabled: false, allowlist: ['powerbi'] })).toBe(false);
    });

    it('matches an org name in the path', () => {
        expect(isUrlAllowed(url, { enabled: true, allowlist: ['powerbi'] })).toBe(true);
        expect(isUrlAllowed(url, { enabled: true, allowlist: ['otherorg'] })).toBe(false);
    });

    it('matches a host', () => {
        expect(isUrlAllowed(url, { enabled: true, allowlist: ['dev.azure.com'] })).toBe(true);
        const legacy = 'https://contoso.visualstudio.com/proj/_git/r/pullrequest/2';
        expect(isUrlAllowed(legacy, { enabled: true, allowlist: ['contoso'] })).toBe(true);
    });

    it('is case-insensitive and ignores blank entries', () => {
        expect(isUrlAllowed(url, { enabled: true, allowlist: ['  ', 'POWERBI'] })).toBe(true);
        expect(isUrlAllowed(url, { enabled: true, allowlist: ['   '] })).toBe(true);
    });

    it('returns false for an unparseable URL with a non-empty allowlist', () => {
        expect(isUrlAllowed('not a url', { enabled: true, allowlist: ['powerbi'] })).toBe(false);
    });
});
