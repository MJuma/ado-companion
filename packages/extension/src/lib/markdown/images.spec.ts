import { describe, expect, it } from 'vitest';

import { repoDirOf, resolveImageSrc, resolveRepoPath } from './images';

describe('repoDirOf', () => {
    it('returns the directory of a file path', () => {
        expect(repoDirOf('/a/b/c.md')).toBe('/a/b');
        expect(repoDirOf('/c.md')).toBe('/');
    });
});

describe('resolveRepoPath', () => {
    it('resolves relative paths against the base dir', () => {
        expect(resolveRepoPath('/a/b', 'img.png')).toBe('/a/b/img.png');
        expect(resolveRepoPath('/a/b', './img.png')).toBe('/a/b/img.png');
        expect(resolveRepoPath('/a/b', '../img.png')).toBe('/a/img.png');
        expect(resolveRepoPath('/a/b', '../../x/y.png')).toBe('/x/y.png');
    });

    it('treats leading-slash paths as absolute repo paths', () => {
        expect(resolveRepoPath('/a/b', '/root/img.png')).toBe('/root/img.png');
    });
});

describe('resolveImageSrc', () => {
    const opts = { repoBaseUrl: 'https://dev.azure.com/o/p/_apis/git/repositories/r', filePath: '/docs/spec.md', commitId: 'abc123' };

    it('passes through absolute / data / anchor URLs', () => {
        expect(resolveImageSrc('https://x/y.png', opts)).toBeNull();
        expect(resolveImageSrc('data:image/png;base64,AAAA', opts)).toBeNull();
        expect(resolveImageSrc('#frag', opts)).toBeNull();
        expect(resolveImageSrc('', opts)).toBeNull();
    });

    it('builds an items URL for a relative image, resolving LFS at the commit', () => {
        const url = resolveImageSrc('images/diagram.png', opts);
        expect(url).toContain('/items?');
        expect(url).toContain('path=%2Fdocs%2Fimages%2Fdiagram.png');
        expect(url).toContain('resolveLfs=true');
        expect(url).toContain('versionDescriptor.version=abc123');
    });

    it('resolves parent-relative images', () => {
        const url = resolveImageSrc('../assets/a.png', opts);
        expect(url).toContain('path=%2Fassets%2Fa.png');
    });
});
