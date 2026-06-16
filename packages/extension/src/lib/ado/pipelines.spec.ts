import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';

import { fakeResponse, fetchUrl, stubFetch } from './fetch.mock';
import {
    fetchBuildTimeline,
    fetchPrBuilds,
    loadPrPipelines,
    pipelinesOverallStatus,
} from './pipelines';
import type { PrPipeline } from './pipelines';
import type { PrRef } from './pr';

const ref: PrRef = {
    organization: 'o',
    organizationUrl: 'https://dev.azure.com/o',
    project: 'p',
    repositoryId: 'r',
    pullRequestId: 42,
};

const build = (id: number, defId: number, name: string) => ({
    id,
    definition: { id: defId, name },
});

const pipelineOf = (...statuses: PrPipeline['stages'][number]['status'][]): PrPipeline => ({
    buildId: 1,
    name: 'P',
    stages: statuses.map((status, i) => ({ id: `s${i}`, name: `s${i}`, order: i, status, jobs: [] })),
});

let fetchMock: Mock;

beforeEach(() => {
    fetchMock = stubFetch();
});

afterEach(() => {
    vi.unstubAllGlobals();
});

describe('fetchPrBuilds', () => {
    it('returns the latest build per pipeline definition on the PR merge ref', async () => {
        fetchMock.mockResolvedValue(
            fakeResponse({
                jsonValue: {
                    value: [
                        build(111, 6881, 'PR Build'),
                        build(110, 6881, 'PR Build'),
                        build(222, 7000, 'Optional Checks'),
                    ],
                },
            }),
        );

        expect(await fetchPrBuilds(ref)).toEqual([
            { buildId: 111, name: 'PR Build' },
            { buildId: 222, name: 'Optional Checks' },
        ]);
        const url = fetchUrl(fetchMock);
        expect(url).toContain('https://dev.azure.com/o/p/_apis/build/builds');
        expect(url).toContain('branchName=refs/pull/42/merge');
    });

    it('falls back to a generic name and skips records without ids', async () => {
        fetchMock.mockResolvedValue(
            fakeResponse({
                jsonValue: { value: [{ id: 5, definition: { id: 1 } }, { definition: { id: 2 } }] },
            }),
        );
        expect(await fetchPrBuilds(ref)).toEqual([{ buildId: 5, name: 'Build 5' }]);
    });

    it('returns an empty list when no builds ran', async () => {
        fetchMock.mockResolvedValue(fakeResponse({ jsonValue: {} }));
        expect(await fetchPrBuilds(ref)).toEqual([]);
    });
});

describe('fetchBuildTimeline', () => {
    it('returns the timeline records for a build', async () => {
        fetchMock.mockResolvedValue(
            fakeResponse({ jsonValue: { records: [{ id: 's1', type: 'Stage' }] } }),
        );

        expect(await fetchBuildTimeline(ref, 99)).toEqual([{ id: 's1', type: 'Stage' }]);
        expect(fetchUrl(fetchMock)).toBe(
            'https://dev.azure.com/o/p/_apis/build/builds/99/timeline?api-version=7.1',
        );
    });

    it('returns an empty list when the build has no records', async () => {
        fetchMock.mockResolvedValue(fakeResponse({ jsonValue: {} }));
        expect(await fetchBuildTimeline(ref, 99)).toEqual([]);
    });
});

describe('loadPrPipelines', () => {
    it('resolves builds → parsed timelines, carrying the pipeline name', async () => {
        fetchMock
            .mockResolvedValueOnce(
                fakeResponse({ jsonValue: { value: [build(111, 6881, 'PR Build')] } }),
            )
            .mockResolvedValueOnce(
                fakeResponse({
                    jsonValue: {
                        records: [
                            { id: 's1', type: 'Stage', name: 'Build', order: 1, state: 'completed', result: 'succeeded' },
                            { id: 'p1', parentId: 's1', type: 'Phase' },
                            { id: 'j1', parentId: 'p1', type: 'Job', name: 'Job 1', state: 'completed', result: 'succeeded' },
                        ],
                    },
                }),
            );

        const pipelines = await loadPrPipelines(ref);

        expect(pipelines).toHaveLength(1);
        expect(pipelines[0]).toMatchObject({ buildId: 111, name: 'PR Build' });
        expect(pipelines[0]?.stages.map((s) => s.name)).toEqual(['Build']);
        expect(pipelines[0]?.stages[0]?.jobs).toEqual([
            { id: 'j1', name: 'Job 1', status: 'succeeded' },
        ]);
    });

    it('returns an empty list when no builds ran', async () => {
        fetchMock.mockResolvedValueOnce(fakeResponse({ jsonValue: { value: [] } }));
        expect(await loadPrPipelines(ref)).toEqual([]);
        expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('skips a build whose timeline cannot be fetched', async () => {
        fetchMock
            .mockResolvedValueOnce(
                fakeResponse({
                    jsonValue: { value: [build(111, 1, 'A'), build(222, 2, 'B')] },
                }),
            )
            .mockResolvedValueOnce(fakeResponse({ jsonValue: { records: [] } }))
            .mockResolvedValueOnce(fakeResponse({ ok: false, status: 404, textValue: 'none' }));

        const pipelines = await loadPrPipelines(ref);
        expect(pipelines.map((p) => p.buildId)).toEqual([111]);
    });
});

describe('pipelinesOverallStatus', () => {
    it('rolls up worst-wins across all pipelines', () => {
        expect(pipelinesOverallStatus([pipelineOf('succeeded'), pipelineOf('failed')])).toBe('failed');
        expect(pipelinesOverallStatus([pipelineOf('succeeded', 'running')])).toBe('running');
        expect(pipelinesOverallStatus([pipelineOf('succeeded', 'succeeded')])).toBe('succeeded');
    });

    it('returns null when there are no stages', () => {
        expect(pipelinesOverallStatus([])).toBeNull();
        expect(pipelinesOverallStatus([{ buildId: 1, name: 'P', stages: [] }])).toBeNull();
    });
});
