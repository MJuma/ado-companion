import { describe, expect, it } from 'vitest';

import {
    buildBotByTimestamp,
    categorizeRow,
    isBotDescriptor,
    isVisibleUnder,
    lookupBot,
    TIMELINE_TABS,
    toEpochSeconds,
} from './classify';

describe('isBotDescriptor', () => {
    it('treats svc. and s2s. as bots', () => {
        expect(isBotDescriptor('svc.ZWQ0')).toBe(true);
        expect(isBotDescriptor('s2s.MDAw')).toBe(true);
    });

    it('treats aad./msa./unknown/missing as human', () => {
        expect(isBotDescriptor('aad.OTcy')).toBe(false);
        expect(isBotDescriptor('msa.abcd')).toBe(false);
        expect(isBotDescriptor('weird.xyz')).toBe(false);
        expect(isBotDescriptor(null)).toBe(false);
        expect(isBotDescriptor(undefined)).toBe(false);
    });
});

describe('toEpochSeconds', () => {
    it('converts an ISO date to whole epoch seconds', () => {
        expect(toEpochSeconds('2026-06-02T19:00:00.000Z')).toBe(1780426800);
    });

    it('returns null for missing or unparseable input', () => {
        expect(toEpochSeconds(null)).toBeNull();
        expect(toEpochSeconds(undefined)).toBeNull();
        expect(toEpochSeconds('')).toBeNull();
        expect(toEpochSeconds('not a date')).toBeNull();
    });
});

describe('buildBotByTimestamp', () => {
    const threads = [
        {
            comments: [
                { author: { descriptor: 'svc.bot' }, publishedDate: '2026-06-02T19:00:00.000Z' },
                { author: { descriptor: 'aad.user' }, publishedDate: '2026-06-02T19:05:00.000Z' },
            ],
        },
        {
            comments: [
                { author: { descriptor: 'aad.user' }, publishedDate: '2026-06-02T20:00:00.000Z' },
            ],
        },
    ];

    it('maps every comment timestamp to the thread author (first comment)', () => {
        const map = buildBotByTimestamp(threads);
        // First thread is bot-authored — both its comment timestamps map to true.
        expect(map.get(toEpochSeconds('2026-06-02T19:00:00.000Z') ?? 0)).toBe(true);
        expect(map.get(toEpochSeconds('2026-06-02T19:05:00.000Z') ?? 0)).toBe(true);
        // Second thread is human-authored.
        expect(map.get(toEpochSeconds('2026-06-02T20:00:00.000Z') ?? 0)).toBe(false);
    });

    it('skips threads with no comments', () => {
        expect(buildBotByTimestamp([{ comments: [] }]).size).toBe(0);
    });
});

describe('lookupBot', () => {
    const map = new Map<number, boolean>([[1000, true]]);

    it('finds an exact or near (±2s) timestamp', () => {
        expect(lookupBot(map, 1000)).toBe(true);
        expect(lookupBot(map, 1002)).toBe(true);
        expect(lookupBot(map, 998)).toBe(true);
    });

    it('defaults to human when absent or null', () => {
        expect(lookupBot(map, 1010)).toBe(false);
        expect(lookupBot(map, null)).toBe(false);
    });
});

describe('categorizeRow', () => {
    it('splits comments by bot authorship', () => {
        expect(categorizeRow({ isComment: true, isCommit: false, isBot: false })).toBe('comment');
        expect(categorizeRow({ isComment: true, isCommit: false, isBot: true })).toBe('system');
    });

    it('classifies commits, and everything else as action', () => {
        expect(categorizeRow({ isComment: false, isCommit: true, isBot: false })).toBe('commit');
        expect(categorizeRow({ isComment: false, isCommit: false, isBot: false })).toBe('action');
    });
});

describe('isVisibleUnder', () => {
    it('shows everything under the All tab', () => {
        for (const cat of ['comment', 'commit', 'action', 'system'] as const) {
            expect(isVisibleUnder('all', cat)).toBe(true);
        }
    });

    it('shows only the matching category for each tab', () => {
        expect(isVisibleUnder('comments', 'comment')).toBe(true);
        expect(isVisibleUnder('comments', 'system')).toBe(false);
        expect(isVisibleUnder('system', 'system')).toBe(true);
        expect(isVisibleUnder('system', 'comment')).toBe(false);
        expect(isVisibleUnder('commits', 'commit')).toBe(true);
        expect(isVisibleUnder('commits', 'action')).toBe(false);
        expect(isVisibleUnder('actions', 'action')).toBe(true);
        expect(isVisibleUnder('actions', 'commit')).toBe(false);
    });
});

describe('TIMELINE_TABS', () => {
    it('lists the five tabs in order', () => {
        expect(TIMELINE_TABS.map((t) => t.id)).toEqual([
            'all',
            'actions',
            'commits',
            'comments',
            'system',
        ]);
        expect(TIMELINE_TABS.map((t) => t.label)).toEqual([
            'All',
            'Actions',
            'Commits',
            'Comments',
            'System Messages',
        ]);
    });
});
