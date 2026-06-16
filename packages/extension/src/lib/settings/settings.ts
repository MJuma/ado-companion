import { storage } from 'wxt/utils/storage';

import { DEFAULT_SETTINGS, migrateToV2 } from './model';
import type { CompanionSettings, LegacySettings } from './model';

const settingsItem = storage.defineItem<CompanionSettings>('local:reviewSettings', {
    fallback: DEFAULT_SETTINGS,
    version: 2,
    migrations: {
        2: (old: LegacySettings | null): CompanionSettings => migrateToV2(old),
    },
});

export function loadSettings(): Promise<CompanionSettings> {
    return settingsItem.getValue();
}

export function saveSettings(settings: CompanionSettings): Promise<void> {
    return settingsItem.setValue(settings);
}

/** Subscribe to settings changes; returns an unsubscribe function. */
export function watchSettings(callback: (settings: CompanionSettings) => void): () => void {
    return settingsItem.watch((value) => {
        callback(value ?? DEFAULT_SETTINGS);
    });
}
