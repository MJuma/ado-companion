// Parse an Azure DevOps build "Timeline" (records of type Stage / Phase / Job /
// Task) into the stage → job hierarchy the Pipelines tab renders. Pure and
// framework-free so it is unit-testable; the enhancer does the fetching + DOM.
//
// Hierarchy (verified live): Stage → Phase → Job → Task. Jobs link to a stage by
// climbing parentId (Job.parentId = Phase.id, Phase.parentId = Stage.id). Classic
// (stage-less) pipelines have only Phase/Job records — those jobs are collected
// under a single synthetic "Build" stage.

/** A single record from the build timeline API (only the fields we use). */
export interface TimelineRecord {
    id: string;
    parentId?: string | null;
    type: string;
    name?: string | null;
    state?: string | null;
    result?: string | null;
    order?: number | null;
}

/** Normalized status for a stage or job, driving its icon/color. */
export type PipelineStatus =
    | 'succeeded'
    | 'failed'
    | 'running'
    | 'pending'
    | 'skipped'
    | 'canceled'
    | 'warning';

export interface PipelineJob {
    id: string;
    name: string;
    status: PipelineStatus;
}

export interface PipelineStage {
    id: string;
    name: string;
    order: number;
    status: PipelineStatus;
    jobs: PipelineJob[];
}

const SYNTHETIC_STAGE_ID = '__build__';

/** Map a record's `state` + `result` to a normalized status. */
export function recordStatus(
    state: string | null | undefined,
    result: string | null | undefined,
): PipelineStatus {
    switch (result) {
        case 'succeeded':
            return 'succeeded';
        case 'succeededWithIssues':
            return 'warning';
        case 'failed':
            return 'failed';
        case 'canceled':
            return 'canceled';
        case 'abandoned':
            return 'canceled';
        case 'skipped':
            return 'skipped';
        default:
            break;
    }
    if (state === 'inProgress') {
        return 'running';
    }
    if (state === 'completed') {
        return 'succeeded';
    }
    return 'pending';
}

/** Roll up a set of job statuses into a single stage status (worst-wins). */
export function rollupStatus(statuses: readonly PipelineStatus[]): PipelineStatus {
    const has = (status: PipelineStatus): boolean => statuses.includes(status);
    if (has('failed')) {
        return 'failed';
    }
    if (has('running')) {
        return 'running';
    }
    if (has('canceled')) {
        return 'canceled';
    }
    if (has('pending')) {
        return 'pending';
    }
    if (has('warning')) {
        return 'warning';
    }
    if (statuses.length === 0) {
        return 'pending';
    }
    return 'succeeded';
}

function byOrderThenName<T extends { order?: number | null; name?: string | null }>(
    a: T,
    b: T,
): number {
    const orderDelta = (a.order ?? 0) - (b.order ?? 0);
    if (orderDelta !== 0) {
        return orderDelta;
    }
    return (a.name ?? '').localeCompare(b.name ?? '');
}

/**
 * Parse build timeline records into ordered stages, each carrying its jobs.
 * Stages keep their own reported status; the synthetic stage (for stage-less
 * pipelines) is rolled up from its jobs.
 */
export function parseTimeline(records: readonly TimelineRecord[]): PipelineStage[] {
    const byId = new Map<string, TimelineRecord>();
    for (const record of records) {
        byId.set(record.id, record);
    }

    const stageAncestor = (record: TimelineRecord): TimelineRecord | null => {
        let current: TimelineRecord | undefined = record;
        const seen = new Set<string>();
        while (current && !seen.has(current.id)) {
            if (current.type === 'Stage') {
                return current;
            }
            seen.add(current.id);
            current = current.parentId ? byId.get(current.parentId) : undefined;
        }
        return null;
    };

    const stages = new Map<string, PipelineStage>();
    for (const record of records.filter((r) => r.type === 'Stage')) {
        stages.set(record.id, {
            id: record.id,
            name: record.name ?? '',
            order: record.order ?? 0,
            status: recordStatus(record.state, record.result),
            jobs: [],
        });
    }

    let synthetic: PipelineStage | null = null;
    for (const job of records.filter((r) => r.type === 'Job').sort(byOrderThenName)) {
        const stageRecord = stageAncestor(job);
        let stage = stageRecord ? stages.get(stageRecord.id) : undefined;
        if (!stage) {
            synthetic ??= {
                id: SYNTHETIC_STAGE_ID,
                name: 'Build',
                order: -1,
                status: 'pending',
                jobs: [],
            };
            stage = synthetic;
        }
        stage.jobs.push({
            id: job.id,
            name: job.name ?? '',
            status: recordStatus(job.state, job.result),
        });
    }

    if (synthetic) {
        synthetic.status = rollupStatus(synthetic.jobs.map((job) => job.status));
        stages.set(synthetic.id, synthetic);
    }

    return [...stages.values()].sort(byOrderThenName);
}
