import { describe, expect, it } from 'vitest';

import { renderMarkdown } from './render';

describe('renderMarkdown', () => {
    it('annotates block elements with 1-based source lines', () => {
        const html = renderMarkdown('# Title\n\nA paragraph.');

        expect(html).toContain('<h1 data-source-line="1"');
        expect(html).toContain('<p data-source-line="3"');
    });

    it('annotates lists and individual list items', () => {
        const html = renderMarkdown('- one\n- two');

        expect(html).toMatch(/<ul data-source-line="1"/);
        expect(html).toMatch(/<li data-source-line="1"/);
        expect(html).toMatch(/<li data-source-line="2"/);
    });

    it('annotates fenced code blocks', () => {
        const html = renderMarkdown('```\ncode\n```');

        expect(html).toContain('<pre');
        expect(html).toContain('data-source-line="1"');
    });

    it('renders GFM tables', () => {
        const html = renderMarkdown('| a | b |\n| - | - |\n| 1 | 2 |');
        expect(html).toContain('<table');
    });

    it('strips script tags from untrusted content', () => {
        const html = renderMarkdown('<script>alert(1)</script>\n\nsafe');

        expect(html).not.toContain('<script');
        expect(html).toContain('safe');
    });

    it('sanitizes javascript: hrefs from raw HTML', () => {
        const html = renderMarkdown('<a href="javascript:alert(1)">click</a>');

        expect(html).toContain('click');
        expect(html).not.toContain('javascript:');
    });
});
