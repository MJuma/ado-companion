import { afterEach, describe, expect, it, vi } from 'vitest';

import { isDarkColor } from './theme';

afterEach(() => vi.restoreAllMocks());

describe('isDarkColor', () => {
    it('treats low-luminance colors as dark', () => {
        expect(isDarkColor('rgb(32, 31, 30)')).toBe(true);
        expect(isDarkColor('rgba(0, 0, 0, 1)')).toBe(true);
        expect(isDarkColor('rgb(20,20,20)')).toBe(true);
    });

    it('treats light colors as not dark', () => {
        expect(isDarkColor('rgb(255, 255, 255)')).toBe(false);
        expect(isDarkColor('rgba(245, 245, 245, 1)')).toBe(false);
    });

    it('returns false for unparseable values', () => {
        expect(isDarkColor('')).toBe(false);
        expect(isDarkColor('transparent')).toBe(false);
        expect(isDarkColor('var(--x)')).toBe(false);
    });
});
