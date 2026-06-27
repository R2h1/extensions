/**
 * Shared type definitions for all extensions
 */

// ─── Extension Message Protocol ─────────────────────────

export interface ExtensionMessage {
  type: string;
  payload?: unknown;
}

export interface ExtensionResponse {
  success: boolean;
  data?: unknown;
  error?: string;
}

// ─── Website Tracker Types ──────────────────────────────

/** Single site record for one day */
export interface SiteRecord {
  /** Accumulated time in milliseconds */
  time: number;
  /** Number of visits (tab switches) */
  visits: number;
  /** Last visit timestamp (epoch ms) */
  lastVisit: number;
  /** Last known page title */
  title?: string;
}

/** Storage schema for tracker data */
export interface TrackerData {
  /** Keyed by date "2026-06-26" → domain → SiteRecord */
  records: Record<string, Record<string, SiteRecord>>;
}

/** Ranking display item */
export interface RankingItem {
  domain: string;
  /** Display name (e.g. "哔哩哔哩", "GitHub") */
  name: string;
  time: number;
  visits: number;
  /** Percentage of total time (0-100) */
  percentage: number;
  /** Google favicon URL */
  faviconUrl: string;
}

/** Ranking query period */
export type RankingPeriod = 'day' | 'week' | 'month';

// ─── App Settings ───────────────────────────────────────

export interface AppSettings {
  enabled: boolean;
  /** Theme preference */
  theme: 'light' | 'dark' | 'auto';
  /** Domains to ignore in tracking */
  ignoredDomains: string[];
  /** Daily time limit per domain (ms). 0 = no limit */
  dailyLimit: number;
}

// ─── Message Types ──────────────────────────────────────

/** Messages the tracker background handles */
export const MSG = {
  GET_RANKINGS: 'GET_RANKINGS',
  GET_HISTORY: 'GET_HISTORY',
  RESET_DATA: 'RESET_DATA',
  ADD_IGNORE: 'ADD_IGNORE',
  REMOVE_IGNORE: 'REMOVE_IGNORE',
  GET_IGNORED: 'GET_IGNORED',
} as const;

export type MessageType = (typeof MSG)[keyof typeof MSG];
