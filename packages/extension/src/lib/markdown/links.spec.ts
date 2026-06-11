import { describe, expect, it } from 'vitest';

import { classifyTarget, isAnchorLink, isExternalUrl, resolveRelativePath } from './links';

describe('isExternalUrl', () => {
    it('detects absolute and scheme-relative URLs', () => {
        expect(isExternalUrl('https://example.com')).toBe(true);
        expect(isExternalUrl('http://example.com')).toBe(true);
        expect(isExternalUrl('mailto:a@b.com')).toBe(true);
        expect(isExternalUrl('//cdn.example.com/x')).toBe(true);
    });

    it('treats repo-relative and anchor targets as not external', () => {
        expect(isExternalUrl('docs/a.md')).toBe(false);
        expect(isExternalUrl('/abs/a.md')).toBe(false);
        expect(isExternalUrl('#section')).toBe(false);
    });
});

describe('isAnchorLink', () => {
    it('detects fragment links', () => {
        expect(isAnchorLink('#section')).toBe(true);
        expect(isAnchorLink('a.md')).toBe(false);
    });
});

describe('resolveRelativePath', () => {
    it('resolves a sibling file', () => {
        expect(resolveRelativePath('/docs/spec.md', 'other.md')).toBe('/docs/other.md');
    });

    it('resolves an explicit ./ prefix', () => {
        expect(resolveRelativePath('/docs/spec.md', './other.md')).toBe('/docs/other.md');
    });

    it('resolves parent traversal', () => {
        expect(resolveRelativePath('/docs/spec.md', '../img/a.png')).toBe('/img/a.png');
    });

    it('resolves multiple parent traversals', () => {
        expect(resolveRelativePath('/docs/guide/x.md', '../../top.md')).toBe('/top.md');
    });

    it('passes through a repo-absolute target', () => {
        expect(resolveRelativePath('/docs/spec.md', '/assets/logo.png')).toBe('/assets/logo.png');
    });
});

describe('classifyTarget', () => {
    it('classifies anchors, external, markdown, and resource targets', () => {
        expect(classifyTarget('#section')).toBe('anchor');
        expect(classifyTarget('https://example.com')).toBe('external');
        expect(classifyTarget('./guide.md')).toBe('markdown');
        expect(classifyTarget('other.md#frag')).toBe('markdown');
        expect(classifyTarget('img/logo.png')).toBe('resource');
    });
});
