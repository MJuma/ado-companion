// Parsing and base-URL helpers for an Azure DevOps pull request Markdown view.
// Supports both modern `dev.azure.com/{org}/{project}` and legacy
// `{org}.visualstudio.com/{project}` cloud URL styles.

export interface PrContext {
    /** Organization name (path segment on dev.azure.com, subdomain on visualstudio.com). */
    organization: string;
    /** Organization-level API origin: `https://dev.azure.com/{org}` or `https://{org}.visualstudio.com`. */
    organizationUrl: string;
    project: string;
    repositoryId: string;
    pullRequestId: number;
    /** Decoded repo-relative file path, e.g. `/docs/spec.md`. */
    filePath: string;
}

const DEV_AZURE_PR =
    /^https:\/\/dev\.azure\.com\/([^/]+)\/([^/]+)\/_git\/([^/]+)\/pullrequest\/(\d+)/i;
const VISUALSTUDIO_PR =
    /^https:\/\/([^./]+)\.visualstudio\.com\/([^/]+)\/_git\/([^/]+)\/pullrequest\/(\d+)/i;

export function isMarkdownFile(path: string): boolean {
    return /\.md$/i.test(path);
}

type PrMatch = Omit<PrContext, 'filePath'>;

function matchPrUrl(rawUrl: string): PrMatch | null {
    const dev = DEV_AZURE_PR.exec(rawUrl);
    if (dev) {
        const [, organization, project, repositoryId, prId] = dev;
        return {
            organization,
            organizationUrl: `https://dev.azure.com/${organization}`,
            project,
            repositoryId,
            pullRequestId: Number(prId),
        };
    }

    const vs = VISUALSTUDIO_PR.exec(rawUrl);
    if (vs) {
        const [, organization, project, repositoryId, prId] = vs;
        return {
            organization,
            organizationUrl: `https://${organization}.visualstudio.com`,
            project,
            repositoryId,
            pullRequestId: Number(prId),
        };
    }

    return null;
}

function extractFilePath(url: URL): string | null {
    const fromQuery = url.searchParams.get('path');
    if (fromQuery) {
        return fromQuery;
    }
    return new URLSearchParams(url.hash.replace(/^#/, '')).get('path');
}

/**
 * Parse a PR Markdown-file URL into context, or return null when the URL is
 * not a pull request viewing a `.md` file.
 */
export function parsePrContext(rawUrl: string): PrContext | null {
    const match = matchPrUrl(rawUrl);
    if (!match) {
        return null;
    }

    // matchPrUrl already required a well-formed https URL.
    const filePath = extractFilePath(new URL(rawUrl));
    if (!filePath || !isMarkdownFile(filePath)) {
        return null;
    }

    return { ...match, filePath };
}

export function getRepoApiBaseUrl(ctx: PrContext): string {
    return `${ctx.organizationUrl}/${ctx.project}/_apis/git/repositories/${ctx.repositoryId}`;
}

export function getPrApiBaseUrl(ctx: PrContext): string {
    return `${getRepoApiBaseUrl(ctx)}/pullRequests/${ctx.pullRequestId}`;
}
