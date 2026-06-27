/**
 * Shared utility functions
 */

import type { ExtensionMessage, ExtensionResponse } from './types.js';

/**
 * Send a message to the background service worker
 */
export async function sendMessage<T = unknown>(
  type: string,
  payload?: unknown,
): Promise<ExtensionResponse & { data?: T }> {
  return chrome.runtime.sendMessage({ type, payload } as ExtensionMessage);
}

/**
 * Get the active tab info
 */
export async function getActiveTabInfo() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

/**
 * Format a timestamp to locale string
 */
export function formatTime(ts: number): string {
  return new Date(ts).toLocaleString();
}

/**
 * Safe JSON parse with fallback
 */
export function safeJsonParse<T>(str: string, fallback: T): T {
  try {
    return JSON.parse(str);
  } catch {
    return fallback;
  }
}

/**
 * Format milliseconds to human-readable duration.
 * Examples: "32s", "45min", "2h 15min"
 */
export function formatDuration(ms: number): string {
  if (Number.isNaN(ms) || ms < 0) return '0s';
  if (ms < 1000) return '0s';

  const totalSeconds = Math.floor(ms / 1000);
  const seconds = totalSeconds % 60;
  const totalMinutes = Math.floor(totalSeconds / 60);
  const minutes = totalMinutes % 60;
  const hours = Math.floor(totalMinutes / 60);

  if (hours > 0) {
    const minStr = minutes > 0 ? ` ${minutes}min` : '';
    return `${hours}h${minStr}`;
  }
  if (minutes > 0) {
    return `${minutes}min`;
  }
  return `${seconds}s`;
}

/**
 * Format milliseconds to detailed duration (e.g., "2h 15min 32s")
 */
export function formatDurationFull(ms: number): string {
  if (ms < 0) return '0s';
  if (ms < 1000) return '0s';

  const totalSeconds = Math.floor(ms / 1000);
  const seconds = totalSeconds % 60;
  const totalMinutes = Math.floor(totalSeconds / 60);
  const minutes = totalMinutes % 60;
  const hours = Math.floor(totalMinutes / 60);

  const parts: string[] = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}min`);
  if (seconds > 0 || parts.length === 0) parts.push(`${seconds}s`);
  return parts.join(' ');
}
