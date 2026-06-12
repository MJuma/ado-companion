import { describe, expect, it } from 'vitest';

import { DEFAULT_SETTINGS } from './allowlist';
import type { ReviewSettings } from './allowlist';
import { loadSettings, saveSettings, watchSettings } from './settings';

describe('settings storage', () => {
    it('returns defaults when nothing is stored', async () => {
        expect(await loadSettings()).toEqual(DEFAULT_SETTINGS);
    });

    it('persists saved settings', async () => {
        await saveSettings({ enabled: false, allowlist: ['powerbi'] });
        expect(await loadSettings()).toEqual({ enabled: false, allowlist: ['powerbi'] });
    });

    it('notifies watchers on change', async () => {
        const fired = new Promise<ReviewSettings>((resolve) => {
            const unwatch = watchSettings((settings) => {
                unwatch();
                resolve(settings);
            });
        });
        await saveSettings({ enabled: false, allowlist: ['x'] });
        expect(await fired).toEqual({ enabled: false, allowlist: ['x'] });
    });
});
