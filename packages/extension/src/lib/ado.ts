// Pure logic for understanding the current Azure DevOps page context.
// Kept framework-free so it is independently unit-testable.

export interface AdoContext {
    isAzureDevOps: boolean;
    organization: string | null;
    project: string | null;
}

const NOT_ADO: AdoContext = {
    isAzureDevOps: false,
    organization: null,
    project: null,
};

const VISUALSTUDIO_SUFFIX = '.visualstudio.com';

function firstProjectSegment(segments: string[], index: number): string | null {
    const segment = segments[index];
    if (segment === undefined || segment.startsWith('_')) {
        return null;
    }

    return segment;
}

/**
 * Parse the Azure DevOps organization and project from a page URL.
 *
 * Supports both the modern `dev.azure.com/{org}/{project}` layout and the
 * legacy `{org}.visualstudio.com/{project}` layout.
 */
export function parseAdoContext(rawUrl: string): AdoContext {
    let url: URL;
    try {
        url = new URL(rawUrl);
    } catch {
        return NOT_ADO;
    }

    const host = url.hostname.toLowerCase();
    const segments = url.pathname.split('/').filter(Boolean);

    if (host === 'dev.azure.com') {
        const organization = segments[0] ?? null;
        return {
            isAzureDevOps: organization !== null,
            organization,
            project: firstProjectSegment(segments, 1),
        };
    }

    if (host.endsWith(VISUALSTUDIO_SUFFIX)) {
        const subdomain = host.slice(0, -VISUALSTUDIO_SUFFIX.length);
        const organization = subdomain.length > 0 ? subdomain : null;
        return {
            isAzureDevOps: organization !== null,
            organization,
            project: firstProjectSegment(segments, 0),
        };
    }

    return NOT_ADO;
}
