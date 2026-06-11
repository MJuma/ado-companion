// Pure helpers for resolving and classifying markdown link/image targets
// relative to the current repo file.

const HAS_SCHEME = /^[a-z][a-z0-9+.-]*:/i;

export type LinkKind = 'anchor' | 'external' | 'markdown' | 'resource';

export function isExternalUrl(target: string): boolean {
    return HAS_SCHEME.test(target) || target.startsWith('//');
}

export function isAnchorLink(target: string): boolean {
    return target.startsWith('#');
}

/**
 * Resolve a relative link/image target against the directory of the current
 * repo file. Returns a repo-absolute path (leading slash). A target that is
 * already absolute is normalized from the repo root.
 */
export function resolveRelativePath(currentFilePath: string, target: string): string {
    const currentDir = currentFilePath.replace(/\/[^/]*$/, '');
    const stack: string[] = target.startsWith('/')
        ? []
        : currentDir.split('/').filter(Boolean);

    for (const segment of target.split('/')) {
        if (segment === '' || segment === '.') {
            continue;
        }
        if (segment === '..') {
            stack.pop();
        } else {
            stack.push(segment);
        }
    }

    return `/${stack.join('/')}`;
}

export function classifyTarget(target: string): LinkKind {
    if (isAnchorLink(target)) {
        return 'anchor';
    }
    if (isExternalUrl(target)) {
        return 'external';
    }
    if (/\.md(?:[?#]|$)/i.test(target)) {
        return 'markdown';
    }
    return 'resource';
}
