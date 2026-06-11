import { adoGetJson } from './http';
import { getPrApiBaseUrl, getRepoApiBaseUrl } from './pr';
import type { PrContext } from './pr';

const API_VERSION = '7.1';

interface PrDetails {
    lastMergeSourceCommit?: { commitId?: string } | null;
}

function itemsUrl(repoBaseUrl: string, params: Record<string, string>): string {
    const search = new URLSearchParams({ 'api-version': API_VERSION, ...params });
    return `${repoBaseUrl}/items?${search.toString()}`;
}

/** Get the PR's source commit id (the head of the source branch being merged). */
export async function getPrSourceCommit(prBaseUrl: string): Promise<string | null> {
    const pr = await adoGetJson<PrDetails>(`${prBaseUrl}?api-version=${API_VERSION}`);
    return pr.lastMergeSourceCommit?.commitId ?? null;
}

export async function getFileContentAtCommit(
    repoBaseUrl: string,
    filePath: string,
    commitId: string,
): Promise<string> {
    const url = itemsUrl(repoBaseUrl, {
        path: filePath,
        includeContent: 'true',
        'versionDescriptor.version': commitId,
        'versionDescriptor.versionType': 'commit',
    });
    const item = await adoGetJson<{ content?: string }>(url);
    return item.content ?? '';
}

/**
 * Build an `<img src>` URL that returns the raw image bytes at the given commit,
 * resolving Git LFS pointer files to their actual content. Same-origin to ADO,
 * so the browser loads it with the user's session cookies.
 */
export function buildImageItemUrl(
    repoBaseUrl: string,
    filePath: string,
    commitId: string,
): string {
    return itemsUrl(repoBaseUrl, {
        path: filePath,
        download: 'true',
        resolveLfs: 'true',
        'versionDescriptor.version': commitId,
        'versionDescriptor.versionType': 'commit',
    });
}

/** Fetch a PR file's content at the PR source commit, or null if none. */
export async function getFileContent(ctx: PrContext): Promise<string | null> {
    const commitId = await getPrSourceCommit(getPrApiBaseUrl(ctx));
    if (!commitId) {
        return null;
    }
    return getFileContentAtCommit(getRepoApiBaseUrl(ctx), ctx.filePath, commitId);
}
