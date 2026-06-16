import { describe, expect, it } from 'vitest';

import { parseTimeline, recordStatus, rollupStatus } from './timeline';
import type { TimelineRecord } from './timeline';

describe('recordStatus', () => {
    it('maps results to a normalized status regardless of state', () => {
        expect(recordStatus('completed', 'succeeded')).toBe('succeeded');
        expect(recordStatus('completed', 'failed')).toBe('failed');
        expect(recordStatus('completed', 'skipped')).toBe('skipped');
        expect(recordStatus('completed', 'canceled')).toBe('canceled');
        expect(recordStatus('completed', 'abandoned')).toBe('canceled');
        expect(recordStatus('completed', 'succeededWithIssues')).toBe('warning');
    });

    it('uses state when there is no result yet', () => {
        expect(recordStatus('inProgress', null)).toBe('running');
        expect(recordStatus('pending', null)).toBe('pending');
        expect(recordStatus(null, undefined)).toBe('pending');
    });

    it('treats a completed record with no result as succeeded', () => {
        expect(recordStatus('completed', null)).toBe('succeeded');
    });
});

describe('rollupStatus', () => {
    it('is worst-wins across job statuses', () => {
        expect(rollupStatus(['succeeded', 'failed', 'running'])).toBe('failed');
        expect(rollupStatus(['succeeded', 'running', 'pending'])).toBe('running');
        expect(rollupStatus(['succeeded', 'canceled'])).toBe('canceled');
        expect(rollupStatus(['succeeded', 'pending'])).toBe('pending');
        expect(rollupStatus(['succeeded', 'warning'])).toBe('warning');
        expect(rollupStatus(['succeeded', 'succeeded'])).toBe('succeeded');
    });

    it('defaults to pending when empty', () => {
        expect(rollupStatus([])).toBe('pending');
    });
});

const stage = (id: string, order: number, result: string, name = id): TimelineRecord => ({
    id,
    type: 'Stage',
    name,
    order,
    state: 'completed',
    result,
});
const phase = (id: string, parentId: string): TimelineRecord => ({
    id,
    parentId,
    type: 'Phase',
    name: id,
    state: 'completed',
    result: 'succeeded',
});
const job = (id: string, parentId: string, result: string, order = 1): TimelineRecord => ({
    id,
    parentId,
    type: 'Job',
    name: id,
    order,
    state: 'completed',
    result,
});

describe('parseTimeline', () => {
    it('groups jobs under their stage via the Phase parent chain, ordered by stage order', () => {
        const records: TimelineRecord[] = [
            stage('s2', 2, 'failed', 'Test'),
            stage('s1', 1, 'succeeded', 'Build'),
            phase('p1', 's1'),
            phase('p2', 's2'),
            job('j1', 'p1', 'succeeded'),
            job('j2', 'p2', 'failed'),
            { id: 't1', parentId: 'j1', type: 'Task', name: 'task', state: 'completed', result: 'succeeded' },
        ];

        const result = parseTimeline(records);

        expect(result.map((s) => s.name)).toEqual(['Build', 'Test']);
        expect(result[0]).toMatchObject({ name: 'Build', status: 'succeeded' });
        expect(result[0]?.jobs).toEqual([{ id: 'j1', name: 'j1', status: 'succeeded' }]);
        expect(result[1]).toMatchObject({ name: 'Test', status: 'failed' });
        expect(result[1]?.jobs).toEqual([{ id: 'j2', name: 'j2', status: 'failed' }]);
    });

    it('keeps a stage that has no jobs', () => {
        const result = parseTimeline([stage('s1', 1, 'succeeded')]);
        expect(result).toHaveLength(1);
        expect(result[0]?.jobs).toEqual([]);
    });

    it('collects stage-less (classic) jobs under a synthetic Build stage, rolled up', () => {
        const records: TimelineRecord[] = [
            phase('p1', 'missing'),
            job('j1', 'p1', 'succeeded', 1),
            { id: 'j2', parentId: 'p1', type: 'Job', name: 'j2', order: 2, state: 'inProgress', result: null },
        ];

        const result = parseTimeline(records);

        expect(result).toHaveLength(1);
        expect(result[0]).toMatchObject({ id: '__build__', name: 'Build', status: 'running' });
        expect(result[0]?.jobs.map((j) => j.id)).toEqual(['j1', 'j2']);
    });

    it('orders jobs within a stage by order then name', () => {
        const records: TimelineRecord[] = [
            stage('s1', 1, 'succeeded'),
            phase('p1', 's1'),
            job('b', 'p1', 'succeeded', 2),
            job('a', 'p1', 'succeeded', 1),
        ];

        const result = parseTimeline(records);
        expect(result[0]?.jobs.map((j) => j.id)).toEqual(['a', 'b']);
    });

    it('returns an empty list for no records', () => {
        expect(parseTimeline([])).toEqual([]);
    });
});
