import { buildImageItemUrl } from '../ado/items';

const ABSOLUTE = /^(?:[a-z][a-z0-9+.-]*:|\/\/|data:|#)/i;

/** The repo-relative directory of a file path (e.g. `/a/b/c.md` → `/a/b`). */
export function repoDirOf(filePath: string): string {
    const slash = filePath.lastIndexOf('/');
    return slash <= 0 ? '/' : filePath.slice(0, slash);
}

/**
 * Resolve a (possibly relative) path against a base directory, collapsing
 * `.`/`..` segments, returning an absolute repo path (leading slash).
 */
export function resolveRepoPath(baseDir: string, relative: string): string {
    if (relative.startsWith('/')) {
        return normalizeSegments(relative);
    }
    return normalizeSegments(`${baseDir}/${relative}`);
}

function normalizeSegments(path: string): string {
    const out: string[] = [];
    for (const segment of path.split('/')) {
        if (segment === '' || segment === '.') {
            continue;
        }
        if (segment === '..') {
            out.pop();
        } else {
            out.push(segment);
        }
    }
    return `/${out.join('/')}`;
}

/**
 * Map an image `src` from a rendered Markdown doc to a URL the browser can load.
 * Absolute/data/anchor URLs pass through; repo-relative paths resolve against the
 * doc's directory and become an ADO items URL at the PR's source commit (with
 * Git LFS resolution). Returns null when there's nothing to rewrite.
 */
export function resolveImageSrc(
    src: string,
    options: { repoBaseUrl: string; filePath: string; commitId: string },
): string | null {
    if (!src || ABSOLUTE.test(src)) {
        return null;
    }
    const target = resolveRepoPath(repoDirOf(options.filePath), src);
    return buildImageItemUrl(options.repoBaseUrl, target, options.commitId);
}
