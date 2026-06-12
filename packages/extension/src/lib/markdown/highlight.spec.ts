import { describe, expect, it } from 'vitest';

import {
    findQuoteOffset,
    parseHighlightProp,
    rawLineQuote,
    serializeHighlightProp,
    textOffsetWithin,
    unwrapHighlights,
    wrapTextRange,
} from './highlight';

function makeMark(): HTMLElement {
    const mark = document.createElement('mark');
    mark.className = 'acr-hl';
    return mark;
}

function para(html: string): HTMLParagraphElement {
    const p = document.createElement('p');
    p.innerHTML = html;
    return p;
}

describe('textOffsetWithin', () => {
    it('counts characters across inline elements', () => {
        const p = para('Hello <strong>brave</strong> world');
        const braveText = p.querySelector('strong')!.firstChild!;
        expect(textOffsetWithin(p, braveText, 2)).toBe(8); // "Hello br"
    });

    it('returns 0 for an invalid boundary', () => {
        const p = para('abc');
        const other = document.createElement('div');
        expect(textOffsetWithin(p, other, 0)).toBe(0);
    });
});

describe('findQuoteOffset', () => {
    it('finds the nearest occurrence to the hint', () => {
        expect(findQuoteOffset('abc abc', 'abc', 0)).toBe(0);
        expect(findQuoteOffset('abc abc', 'abc', 5)).toBe(4);
    });

    it('returns -1 when absent or empty', () => {
        expect(findQuoteOffset('hello', 'xyz')).toBe(-1);
        expect(findQuoteOffset('hello', '   ')).toBe(-1);
    });
});

describe('wrapTextRange', () => {
    it('wraps a range contained in a single inline element', () => {
        const p = para('Hello <strong>brave</strong> world');
        const marks = wrapTextRange(p, 6, 11, makeMark);
        expect(marks).toHaveLength(1);
        expect(marks[0]?.textContent).toBe('brave');
        expect(p.textContent).toBe('Hello brave world');
        expect(p.querySelector('strong .acr-hl')).toBeTruthy();
    });

    it('splits across element boundaries into multiple marks', () => {
        const p = para('Hello <strong>brave</strong> world');
        const marks = wrapTextRange(p, 3, 9, makeMark);
        expect(marks).toHaveLength(2);
        expect(marks.map((m) => m.textContent).join('')).toBe('lo bra');
        expect(p.textContent).toBe('Hello brave world');
    });

    it('returns nothing for an empty range', () => {
        const p = para('abc');
        expect(wrapTextRange(p, 2, 2, makeMark)).toHaveLength(0);
    });
});

describe('unwrapHighlights', () => {
    it('removes marks and restores the original text', () => {
        const p = para('Hello brave world');
        wrapTextRange(p, 6, 11, makeMark);
        expect(p.querySelectorAll('.acr-hl')).toHaveLength(1);
        unwrapHighlights(p, 'acr-hl');
        expect(p.querySelectorAll('.acr-hl')).toHaveLength(0);
        expect(p.textContent).toBe('Hello brave world');
        expect(p.childNodes).toHaveLength(1);
    });
});

describe('highlight prop serialization', () => {
    it('round-trips quote + offset', () => {
        const value = serializeHighlightProp('some text', 12);
        expect(parseHighlightProp(value)).toEqual({ quote: 'some text', offset: 12 });
    });

    it('defaults a missing offset to 0', () => {
        expect(parseHighlightProp(JSON.stringify({ q: 'x' }))).toEqual({ quote: 'x', offset: 0 });
    });

    it('rejects non-strings and malformed values', () => {
        expect(parseHighlightProp(42)).toBeNull();
        expect(parseHighlightProp('not json')).toBeNull();
        expect(parseHighlightProp(JSON.stringify({ o: 1 }))).toBeNull();
    });
});

describe('rawLineQuote', () => {
    const lines = ['', 'The quick brown fox'];

    it('extracts a single-line range from the raw source', () => {
        expect(rawLineQuote(lines, 2, 5, 2, 10)).toEqual({ quote: 'quick', offset: 4 });
    });

    it('returns null for multi-line, empty, or whole-line ranges', () => {
        expect(rawLineQuote(lines, 2, 5, 3, 10)).toBeNull();
        expect(rawLineQuote(lines, 2, 5, 2, 5)).toBeNull();
        expect(rawLineQuote(lines, 2, 1, 2, 100)).toBeNull();
        expect(rawLineQuote(lines, 9, 1, 9, 5)).toBeNull();
    });
});
