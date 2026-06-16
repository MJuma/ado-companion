import { describe, expect, it } from 'vitest';

import { DEFAULT_SETTINGS, FEATURES, featureEnabled, migrateToV2 } from './model';
import type { CompanionSettings } from './model';

function settings(overrides: Partial<CompanionSettings> = {}): CompanionSettings {
    return { ...DEFAULT_SETTINGS, ...overrides };
}

describe('DEFAULT_SETTINGS', () => {
    it('enables every known feature by default', () => {
        for (const feature of FEATURES) {
            expect(DEFAULT_SETTINGS.features[feature.id]).toBe(true);
        }
    });

    it('starts with an empty allowlist and no hidden tabs', () => {
        expect(DEFAULT_SETTINGS.allowlist).toEqual([]);
        expect(DEFAULT_SETTINGS.hiddenPrTabs).toEqual([]);
    });
});

describe('FEATURES', () => {
    it('lists review, timeline and pipelines with labels', () => {
        expect(FEATURES.map((feature) => feature.id)).toEqual(['review', 'timeline', 'pipelines']);
        for (const feature of FEATURES) {
            expect(feature.label.length).toBeGreaterThan(0);
            expect(feature.description.length).toBeGreaterThan(0);
        }
    });
});

describe('featureEnabled', () => {
    it('is true when the master switch and the feature toggle are on', () => {
        expect(featureEnabled(DEFAULT_SETTINGS, 'review')).toBe(true);
    });

    it('is false when the master switch is off, regardless of the feature toggle', () => {
        const off = settings({ enabled: false });
        for (const feature of FEATURES) {
            expect(featureEnabled(off, feature.id)).toBe(false);
        }
    });

    it('is false when the feature toggle is explicitly off', () => {
        const s = settings({ features: { review: false, timeline: true, pipelines: true } });
        expect(featureEnabled(s, 'review')).toBe(false);
        expect(featureEnabled(s, 'timeline')).toBe(true);
    });
});

describe('migrateToV2', () => {
    it('keeps the prior master switch + allowlist and enables every feature', () => {
        const migrated = migrateToV2({ enabled: false, allowlist: ['powerbi'] });
        expect(migrated).toEqual({
            enabled: false,
            allowlist: ['powerbi'],
            features: { review: true, timeline: true, pipelines: true },
            hiddenPrTabs: [],
        });
    });

    it('falls back to defaults for null or partial legacy settings', () => {
        expect(migrateToV2(null)).toEqual(DEFAULT_SETTINGS);
        expect(migrateToV2({ enabled: true })).toEqual(DEFAULT_SETTINGS);
    });
});
