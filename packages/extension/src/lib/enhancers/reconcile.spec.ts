import { describe, expect, it } from 'vitest';

import { findStale, planReconcile } from './reconcile';
import type { MountResult, SurfaceEnhancer } from './types';

function enhancer(
    id: string,
    matchKey: string | null,
    anchor = `.anchor-${id}`,
): SurfaceEnhancer {
    return {
        id,
        feature: 'review',
        anchor,
        matches: () => matchKey,
        mount: (): MountResult => ({ cleanup: () => {}, marker: {} as Node }),
    };
}

const anchorsPresent = (): boolean => true;
const anchorsAbsent = (): boolean => false;

describe('planReconcile', () => {
    it('mounts a newly-active enhancer when its anchor is present', () => {
        const plan = planReconcile([enhancer('a', 'k1')], new Map(), 'url', anchorsPresent);

        expect(plan.mount).toEqual([{ id: 'a', key: 'k1' }]);
        expect(plan.unmount).toEqual([]);
    });

    it('does not mount when the anchor is absent', () => {
        const plan = planReconcile([enhancer('a', 'k1')], new Map(), 'url', anchorsAbsent);

        expect(plan.mount).toEqual([]);
        expect(plan.unmount).toEqual([]);
    });

    it('is a no-op when already active for the same key', () => {
        const plan = planReconcile(
            [enhancer('a', 'k1')],
            new Map([['a', 'k1']]),
            'url',
            anchorsPresent,
        );

        expect(plan).toEqual({ unmount: [], mount: [] });
    });

    it('unmounts then remounts when the key changes (e.g. switched files)', () => {
        const plan = planReconcile(
            [enhancer('a', 'k2')],
            new Map([['a', 'k1']]),
            'url',
            anchorsPresent,
        );

        expect(plan.unmount).toEqual(['a']);
        expect(plan.mount).toEqual([{ id: 'a', key: 'k2' }]);
    });

    it('unmounts (without remounting) when the key changes but the anchor is gone', () => {
        const plan = planReconcile(
            [enhancer('a', 'k2')],
            new Map([['a', 'k1']]),
            'url',
            anchorsAbsent,
        );

        expect(plan.unmount).toEqual(['a']);
        expect(plan.mount).toEqual([]);
    });

    it('unmounts when an active enhancer no longer matches', () => {
        const plan = planReconcile(
            [enhancer('a', null)],
            new Map([['a', 'k1']]),
            'url',
            anchorsPresent,
        );

        expect(plan.unmount).toEqual(['a']);
        expect(plan.mount).toEqual([]);
    });

    it('leaves an inactive, unmatched enhancer alone', () => {
        const plan = planReconcile([enhancer('a', null)], new Map(), 'url', anchorsPresent);
        expect(plan).toEqual({ unmount: [], mount: [] });
    });

    it('does not mount an enhancer whose feature is disabled', () => {
        const plan = planReconcile(
            [enhancer('a', 'k1')],
            new Map(),
            'url',
            anchorsPresent,
            () => false,
        );

        expect(plan).toEqual({ unmount: [], mount: [] });
    });

    it('unmounts an active enhancer when its feature becomes disabled', () => {
        const plan = planReconcile(
            [enhancer('a', 'k1')],
            new Map([['a', 'k1']]),
            'url',
            anchorsPresent,
            () => false,
        );

        expect(plan.unmount).toEqual(['a']);
        expect(plan.mount).toEqual([]);
    });

    it('only gates the disabled enhancer, leaving enabled ones active', () => {
        const plan = planReconcile(
            [enhancer('a', 'k1'), enhancer('b', 'k2')],
            new Map(),
            'url',
            anchorsPresent,
            (e) => e.id === 'b',
        );

        expect(plan.mount).toEqual([{ id: 'b', key: 'k2' }]);
        expect(plan.unmount).toEqual([]);
    });
});

describe('findStale', () => {
    it('returns ids whose marker is no longer present', () => {
        const live = {} as Node;
        const dead = {} as Node;
        const active = new Map([
            ['a', { marker: live }],
            ['b', { marker: dead }],
        ]);

        const stale = findStale(active, (node) => node === live);

        expect(stale).toEqual(['b']);
    });
});
