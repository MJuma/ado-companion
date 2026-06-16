import { describe, expect, it } from 'vitest';

import { shouldHideTab } from './tab-filter';

describe('shouldHideTab', () => {
    it('hides a tab whose label matches an entry (case-insensitive, trimmed)', () => {
        expect(shouldHideTab('Synapse diff', ['synapse diff'])).toBe(true);
        expect(shouldHideTab('  Conflicts  ', ['conflicts'])).toBe(true);
        expect(shouldHideTab('Owners', ['  OWNERS '])).toBe(true);
    });

    it('does not hide tabs that are not listed', () => {
        expect(shouldHideTab('Files', ['Synapse diff'])).toBe(false);
        expect(shouldHideTab('Commits', [])).toBe(false);
    });

    it('never hides Overview, even if listed', () => {
        expect(shouldHideTab('Overview', ['overview'])).toBe(false);
        expect(shouldHideTab('  overview ', ['Overview'])).toBe(false);
    });

    it('ignores blank labels', () => {
        expect(shouldHideTab('   ', ['anything'])).toBe(false);
    });
});
