import { describe, expect, it } from 'vitest';

import { DEFAULT_SETTINGS } from './model';
import type { CompanionSettings } from './model';
import { loadSettings, saveSettings, watchSettings } from './settings';

describe('settings storage', () => {
    it('returns defaults when nothing is stored', async () => {
        expect(await loadSettings()).toEqual(DEFAULT_SETTINGS);
    });

    it('persists saved settings', async () => {
        const next: CompanionSettings = {
            ...DEFAULT_SETTINGS,
            enabled: false,
            allowlist: ['powerbi'],
            features: { review: false, timeline: true, pipelines: true },
            hiddenPrTabs: ['Synapse diff'],
        };
        await saveSettings(next);
        expect(await loadSettings()).toEqual(next);
    });

    it('notifies watchers on change', async () => {
        const next: CompanionSettings = { ...DEFAULT_SETTINGS, enabled: false, allowlist: ['x'] };
        const fired = new Promise<CompanionSettings>((resolve) => {
            const unwatch = watchSettings((settings) => {
                unwatch();
                resolve(settings);
            });
        });
        await saveSettings(next);
        expect(await fired).toEqual(next);
    });
});
