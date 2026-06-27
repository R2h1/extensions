/**
 * Typed storage helper for chrome.storage
 */

import type { AppSettings } from './types.js';

export const DEFAULT_SETTINGS: AppSettings = {
  enabled: true,
  theme: 'auto',
  ignoredDomains: [],
  dailyLimit: 0,
};

/**
 * Get all settings (with defaults applied)
 */
export async function getSettings(): Promise<AppSettings> {
  const result = await chrome.storage.sync.get('settings');
  return { ...DEFAULT_SETTINGS, ...(result.settings as Partial<AppSettings>) };
}

/**
 * Save settings (merges with existing)
 */
export async function saveSettings(partial: Partial<AppSettings>): Promise<void> {
  const current = await getSettings();
  const merged = { ...current, ...partial };
  await chrome.storage.sync.set({ settings: merged });
}

/**
 * Subscribe to setting changes
 */
export function onSettingsChanged(callback: (settings: AppSettings) => void): () => void {
  const handler = (changes: Record<string, chrome.storage.StorageChange>) => {
    if (changes.settings) {
      callback(changes.settings.newValue as AppSettings);
    }
  };
  chrome.storage.onChanged.addListener(handler);
  return () => chrome.storage.onChanged.removeListener(handler);
}
