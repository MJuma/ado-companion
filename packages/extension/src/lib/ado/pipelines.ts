// Azure DevOps REST calls for the Pipelines tab: list every pipeline that ran on
// the PR's merge ref → each build's timeline, parsed into stages/jobs.
//
// Data path (verified live): builds for `refs/pull/{id}/merge` give all pipeline
// definitions that ran on the PR (latest build per definition, with the pipeline
// name); each build's timeline yields the stage/job tree.

import { adoGetJson } from './http';
import type { PrRef } from './pr';
import { parseTimeline, rollupStatus } from '../pipelines/timeline';
import type { PipelineStage, PipelineStatus, TimelineRecord } from '../pipelines/timeline';

const API_VERSION = 'api-version=7.1';

interface BuildRef {
    id?: number;
    definition?: { id?: number; name?: string };
}

interface BuildsResponse {
    value?: BuildRef[];
}

interface TimelineResponse {
    records?: TimelineRecord[];
}

export interface PrBuild {
    buildId: number;
    name: string;
}

export interface PrPipeline {
    buildId: number;
    name: string;
    stages: PipelineStage[];
}

/**
 * The latest build per pipeline definition that ran on the PR's merge ref —
 * i.e. every pipeline associated with the pull request, newest build each.
 */
export async function fetchPrBuilds(ref: PrRef): Promise<PrBuild[]> {
    const url =
        `${ref.organizationUrl}/${ref.project}/_apis/build/builds` +
        `?branchName=refs/pull/${ref.pullRequestId}/merge` +
        `&queryOrder=queueTimeDescending&$top=100&${API_VERSION}`;
    const data = await adoGetJson<BuildsResponse>(url);

    const seenDefinitions = new Set<number>();
    const builds: PrBuild[] = [];
    for (const build of data.value ?? []) {
        const definitionId = build.definition?.id;
        if (typeof build.id !== 'number' || typeof definitionId !== 'number') {
            continue;
        }
        if (!seenDefinitions.has(definitionId)) {
            seenDefinitions.add(definitionId);
            builds.push({ buildId: build.id, name: build.definition?.name ?? `Build ${build.id}` });
        }
    }
    return builds;
}

/** The build's timeline records (Stage / Phase / Job / Task). */
export async function fetchBuildTimeline(ref: PrRef, buildId: number): Promise<TimelineRecord[]> {
    const url = `${ref.organizationUrl}/${ref.project}/_apis/build/builds/${buildId}/timeline?${API_VERSION}`;
    const data = await adoGetJson<TimelineResponse>(url);
    return data.records ?? [];
}

/**
 * Resolve every pipeline that ran on the PR and parse each into stages/jobs.
 * Returns an empty list when no build ran; a build whose timeline can't be
 * fetched (e.g. not started) is skipped.
 */
export async function loadPrPipelines(ref: PrRef): Promise<PrPipeline[]> {
    const builds = await fetchPrBuilds(ref);
    const pipelines: PrPipeline[] = [];
    for (const build of builds) {
        try {
            const records = await fetchBuildTimeline(ref, build.buildId);
            pipelines.push({ buildId: build.buildId, name: build.name, stages: parseTimeline(records) });
        } catch {
            // No timeline yet (queued/expired build) — skip this one.
        }
    }
    return pipelines;
}

/**
 * A single status across all of a PR's pipelines (worst-wins) for the tab badge,
 * or null when there are no stages to summarize.
 */
export function pipelinesOverallStatus(pipelines: readonly PrPipeline[]): PipelineStatus | null {
    const statuses = pipelines.flatMap((pipeline) =>
        pipeline.stages.map((stage) => stage.status),
    );
    return statuses.length > 0 ? rollupStatus(statuses) : null;
}
