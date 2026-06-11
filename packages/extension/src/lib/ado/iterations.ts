import { adoGetJson } from './http';
import type {
    IterationChangesResponse,
    ListResponse,
    PrIteration,
    PullRequestThreadContext,
} from './pr-types';

const API = 'api-version=7.1';

export async function listIterations(prBaseUrl: string): Promise<PrIteration[]> {
    const response = await adoGetJson<ListResponse<PrIteration>>(
        `${prBaseUrl}/iterations?${API}`,
    );
    return response.value;
}

export async function getIterationChanges(
    prBaseUrl: string,
    iterationId: number,
): Promise<IterationChangesResponse> {
    return adoGetJson<IterationChangesResponse>(
        `${prBaseUrl}/iterations/${iterationId}/changes?${API}`,
    );
}

/**
 * Resolve the iteration + changeTrackingId for a file in the latest iteration,
 * used to build a native-compatible `pullRequestThreadContext`. Returns null if
 * the PR has no iterations or the file isn't part of the latest iteration.
 */
export async function getPullRequestThreadContext(
    prBaseUrl: string,
    filePath: string,
): Promise<PullRequestThreadContext | null> {
    const iterations = await listIterations(prBaseUrl);
    if (iterations.length === 0) {
        return null;
    }

    const latest = iterations[iterations.length - 1];
    const changes = await getIterationChanges(prBaseUrl, latest.id);
    const normalized = filePath.replace(/^\//, '');
    const entry = changes.changeEntries.find(
        (change) =>
            change.item.path === filePath ||
            change.item.path.replace(/^\//, '') === normalized,
    );
    if (!entry) {
        return null;
    }

    return {
        iterationContext: {
            firstComparingIteration: latest.id,
            secondComparingIteration: latest.id,
        },
        changeTrackingId: entry.changeTrackingId,
    };
}
