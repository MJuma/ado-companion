import { storage } from 'wxt/utils/storage';

import { DEFAULT_SETTINGS } from './allowlist';
import type { ReviewSettings } from './allowlist';

const settingsItem = storage.defineItem<ReviewSettings>('local:reviewSettings', {
    fallback: DEFAULT_SETTINGS,
    version: 1,
});

export function loadSettings(): Promise<ReviewSettings> {
    return settingsItem.getValue();
}

export function saveSettings(settings: ReviewSettings): Promise<void> {
    return settingsItem.setValue(settings);
}

/** Subscribe to settings changes; returns an unsubscribe function. */
export function watchSettings(callback: (settings: ReviewSettings) => void): () => void {
    return settingsItem.watch((value) => {
        callback(value ?? DEFAULT_SETTINGS);
    });
}
