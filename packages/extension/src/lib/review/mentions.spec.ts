import { afterEach, describe, expect, it } from 'vitest';

import {
    applyMentionSelection,
    cacheMentionName,
    clearMentionNames,
    encodeMentions,
    findMentionQuery,
    renderMentions,
    resolveMentionName,
} from './mentions';

afterEach(() => {
    clearMentionNames();
});

describe('findMentionQuery', () => {
    it('detects a query at the start of the value', () => {
        expect(findMentionQuery('@jane', 5)).toEqual({ query: 'jane', start: 0 });
    });

    it('detects a query after whitespace and allows spaces in the name', () => {
        const value = 'cc @jane doe';
        expect(findMentionQuery(value, value.length)).toEqual({ query: 'jane doe', start: 3 });
    });

    it('does not trigger inside an email address', () => {
        expect(findMentionQuery('mail me at a@b.com', 18)).toBeNull();
    });

    it('returns null once the token is an encoded mention', () => {
        const value = '@<00000000-0000-0000-0000-000000000000> hi';
        expect(findMentionQuery(value, value.length)).toBeNull();
    });

    it('returns null when there is no @ before the caret', () => {
        expect(findMentionQuery('hello world', 5)).toBeNull();
    });
});

describe('applyMentionSelection', () => {
    it('replaces the @query with @Display and a trailing space', () => {
        const result = applyMentionSelection('cc @ja', 3, 6, 'Jane Doe');
        expect(result.value).toBe('cc @Jane Doe ');
        expect(result.token).toBe('@Jane Doe');
        expect(result.cursor).toBe('cc @Jane Doe '.length);
    });

    it('preserves text after the caret', () => {
        const result = applyMentionSelection('@ja please', 0, 3, 'Jane');
        expect(result.value).toBe('@Jane please');
    });
});

describe('encodeMentions', () => {
    it('swaps readable tokens for @<GUID> on submit', () => {
        const content = 'cc @Jane Doe and @Bob';
        const encoded = encodeMentions(content, [
            { token: '@Jane Doe', guid: 'AAAA' },
            { token: '@Bob', guid: 'BBBB' },
        ]);
        expect(encoded).toBe('cc @<AAAA> and @<BBBB>');
    });

    it('processes longer tokens first so prefixes do not mis-match', () => {
        const content = 'hi @Jane Doe';
        const encoded = encodeMentions(content, [
            { token: '@Jane', guid: 'SHORT' },
            { token: '@Jane Doe', guid: 'LONG' },
        ]);
        expect(encoded).toBe('hi @<LONG>');
    });

    it('leaves content unchanged when a token is absent', () => {
        expect(encodeMentions('no mentions', [{ token: '@Ghost', guid: 'X' }])).toBe('no mentions');
    });
});

describe('mention name cache + renderMentions', () => {
    const guid = '91C644C9-8C41-602B-85F5-ED6F3782BBF6';

    it('renders a cached GUID as its name (case-insensitive)', () => {
        cacheMentionName(guid, 'Jane Doe');
        expect(resolveMentionName(guid.toLowerCase())).toBe('Jane Doe');
        expect(renderMentions(`@<${guid}> ping`)).toBe('@Jane Doe ping');
    });

    it('falls back to @mention for unknown GUIDs', () => {
        expect(renderMentions(`@<${guid}> ping`)).toBe('@mention ping');
    });

    it('leaves non-mention content untouched', () => {
        expect(renderMentions('plain @notamention text')).toBe('plain @notamention text');
    });
});
