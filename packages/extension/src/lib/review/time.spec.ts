import { describe, expect, it } from 'vitest';

import { absoluteTime, relativeTime } from './time';

const base = Date.parse('2026-06-12T12:00:00Z');

describe('relativeTime', () => {
    it('shows "Just now" within a minute (and for future dates)', () => {
        expect(relativeTime('2026-06-12T11:59:30Z', base)).toBe('Just now');
        expect(relativeTime('2026-06-12T12:00:30Z', base)).toBe('Just now');
    });

    it('shows minutes, hours, and days', () => {
        expect(relativeTime('2026-06-12T11:55:00Z', base)).toBe('5m ago');
        expect(relativeTime('2026-06-12T09:00:00Z', base)).toBe('3h ago');
        expect(relativeTime('2026-06-10T12:00:00Z', base)).toBe('2d ago');
    });

    it('falls back to a date older than a week', () => {
        const out = relativeTime('2026-05-01T12:00:00Z', base);
        expect(out).not.toMatch(/ago|Just now/);
        expect(out.length).toBeGreaterThan(0);
    });

    it('returns empty string for an unparseable date', () => {
        expect(relativeTime('not-a-date', base)).toBe('');
    });
});

describe('absoluteTime', () => {
    it('returns a non-empty localized string for a valid date', () => {
        expect(absoluteTime('2026-06-12T12:00:00Z').length).toBeGreaterThan(0);
    });

    it('returns empty string for an unparseable date', () => {
        expect(absoluteTime('nope')).toBe('');
    });
});
