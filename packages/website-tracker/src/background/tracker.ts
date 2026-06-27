/**
 * Website time tracker core logic
 *
 * Tracks active tab time by monitoring:
 *  - Tab switches (tabs.onActivated)
 *  - Navigation within tabs (tabs.onUpdated)
 *  - Window focus/blur (windows.onFocusChanged)
 *
 * Data is stored in chrome.storage.local, keyed by date → domain.
 * Auto-saves every 5 seconds via a tick timer.
 */

import type { TrackerData, SiteRecord } from '@extensions/shared';

// ─── Constants ──────────────────────────────────────────

const STORAGE_KEY = 'tracker';
const SESSION_KEY = 'tracker_session';
const SAVE_INTERVAL = 5000; // ms between storage writes
const INTERNAL_PREFIXES = [
  'chrome:',
  'about:',
  'edge:',
  'brave:',
  'view-source:',
  'data:',
  'file:',
  'moz-extension:',
  'chrome-extension:',
];

interface SessionMeta {
  domain: string | null;
  lastTick: number;
}

// ─── State ──────────────────────────────────────────────

let activeTabId: number | null = null;
let activeDomain: string | null = null;
let sessionStart: number = Date.now();
let isPaused = false;
let pauseStart = 0;
let accumulatedPauseMs = 0;
let data: TrackerData = { records: {} };
let saveTimer: ReturnType<typeof setInterval> | null = null;
let isSaving = false;

// ─── Domain Extraction ─────────────────────────────────

// ─── Known Site Names ────────────────────────────────────

const KNOWN_SITES: Record<string, string> = {
  'baidu.com': '百度',
  'bilibili.com': 'B站',
  'zhihu.com': '知乎',
  'github.com': 'GitHub',
  'youtube.com': 'YouTube',
  'google.com': 'Google',
  'twitter.com': 'Twitter',
  'x.com': 'X',
  'weibo.com': '微博',
  'douyin.com': '抖音',
  'qq.com': '腾讯QQ',
  'v.qq.com': '腾讯视频',
  'ixigua.com': '西瓜视频',
  'juejin.cn': '掘金',
  'csdn.net': 'CSDN',
  'stackoverflow.com': 'Stack Overflow',
  'reddit.com': 'Reddit',
  'jira.com': 'Jira',
  'feishu.cn': '飞书',
  'lark.suite.com': 'Lark',
  'dingtalk.com': '钉钉',
  'weixin.qq.com': '微信',
  'work.weixin.qq.com': '企业微信',
  'taobao.com': '淘宝',
  'jd.com': '京东',
  'meituan.com': '美团',
  'dianping.com': '大众点评',
  'xiaohongshu.com': '小红书',
  'netease.com': '网易',
  '163.com': '网易',
  'sina.com.cn': '新浪',
  'sohu.com': '搜狐',
  'mi.com': '小米',
  'bytedance.com': '字节跳动',
  'tencent.com': '腾讯',
  'alibaba.com': '阿里巴巴',
  'microsoft.com': 'Microsoft',
  'apple.com': 'Apple',
  'amazon.com': 'Amazon',
  'netflix.com': 'Netflix',
  'figma.com': 'Figma',
  'notion.so': 'Notion',
  'npmjs.com': 'npm',
  'docker.com': 'Docker',
};

/** Known parent domains for subdomain grouping */
const PARENT_DOMAINS = Object.keys(KNOWN_SITES).filter(
  (d) => d.split('.').length === 2 || d.endsWith('.com.cn') || d.endsWith('.co.jp'),
);

/** Normalize a domain: group subdomains under known parent */
function normalizeDomain(raw: string): string {
  // Already a known exact match
  if (KNOWN_SITES[raw]) return raw;

  // Check if it's a subdomain of a known parent
  for (const parent of PARENT_DOMAINS) {
    if (raw.endsWith('.' + parent)) {
      return parent;
    }
  }

  // Generic subdomain normalization: a.b.c → b.c (remove one level)
  const parts = raw.split('.');
  if (parts.length > 2) {
    // For .com.cn / .co.jp etc, keep 3 parts
    const tld2 = parts.slice(-2).join('.');
    if (['com.cn', 'co.jp', 'org.cn', 'net.cn'].includes(tld2)) {
      if (parts.length > 3) return parts.slice(-3).join('.');
      return raw;
    }
    // Default: keep last 2 parts (e.g., a.baidu.com → baidu.com)
    return parts.slice(-2).join('.');
  }

  return raw;
}

/** Get display name for a domain, falling back to the domain itself */
function getSiteName(domain: string, title?: string): string {
  // Known site mapping
  if (KNOWN_SITES[domain]) return KNOWN_SITES[domain];

  // Extract name from title if available (e.g., "Google - Home" → "Google")
  if (title) {
    const cleaned = title.split(/[–—\-|·•]/)[0]?.trim();
    if (cleaned && cleaned.length > 1 && cleaned.length < 30) return cleaned;
  }

  // Fallback: capitalize domain
  return domain.replace(/\..+$/, '').replace(/^www\./, '');
}

function extractDomain(url: string | undefined): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    // Skip internal pages
    if (INTERNAL_PREFIXES.some((p) => u.protocol.startsWith(p.replace(':', '')))) {
      return null;
    }
    // Normalize: remove www. prefix, then group subdomains
    const raw = u.hostname.replace(/^www\d*\./, '');
    return normalizeDomain(raw);
  } catch {
    return null;
  }
}

function getDateKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// ─── Data Access ────────────────────────────────────────

function ensureTodayRecord(domain: string): SiteRecord {
  const dateKey = getDateKey();
  if (!data.records[dateKey]) data.records[dateKey] = {};
  if (!data.records[dateKey][domain]) {
    data.records[dateKey][domain] = { time: 0, visits: 0, lastVisit: Date.now() };
  }
  return data.records[dateKey][domain];
}

function accumulateTime(domain: string, ms: number) {
  if (ms <= 0 || !domain) return;
  const record = ensureTodayRecord(domain);
  record.time += ms;
  record.lastVisit = Date.now();
}

function countVisit(domain: string) {
  if (!domain) return;
  const record = ensureTodayRecord(domain);
  record.visits += 1;
}

// ─── Save / Load ────────────────────────────────────────

async function loadData(): Promise<void> {
  try {
    const result = await chrome.storage.local.get(STORAGE_KEY);
    if (result[STORAGE_KEY]) {
      data = result[STORAGE_KEY] as TrackerData;
    }
  } catch (err) {
    console.error('[Tracker] Failed to load data:', err);
  }
}

async function flushData(): Promise<void> {
  if (isSaving) return;
  isSaving = true;
  try {
    await chrome.storage.local.set({ [STORAGE_KEY]: data });
  } catch (err) {
    // "No SW" happens during shutdown — benign, data already in memory
    if ((err as Error)?.message !== 'No SW') {
      console.error('[Tracker] Failed to save data:', err);
    }
  } finally {
    isSaving = false;
  }
}

// Save session meta to storage (for gap recovery on SW restart)
async function saveSessionMeta() {
  try {
    const meta: SessionMeta = { domain: activeDomain, lastTick: Date.now() };
    await chrome.storage.local.set({ [SESSION_KEY]: meta });
  } catch {
    /* ignore */
  }
}

// Called every SAVE_INTERVAL ms
function tick() {
  if (isPaused || !activeDomain || activeTabId === null) return;

  const now = Date.now();
  const elapsed = now - sessionStart - accumulatedPauseMs;
  accumulatedPauseMs = 0;
  if (elapsed > 0) {
    accumulateTime(activeDomain, elapsed);
  }
  sessionStart = now;
}

// ─── Tab / Window Event Handlers ────────────────────────

async function onTabActivated(activeInfo: chrome.tabs.TabActiveInfo) {
  // Flush time for previous tab first
  tick();

  activeTabId = activeInfo.tabId;

  // Get the new tab's URL and title
  try {
    const tab = await chrome.tabs.get(activeInfo.tabId);
    const domain = extractDomain(tab.url);
    activeDomain = domain;

    if (domain) {
      countVisit(domain);
      // Store page title for display name
      if (tab.title) {
        const record = ensureTodayRecord(domain);
        record.title = tab.title;
      }
    }

    sessionStart = Date.now();
    accumulatedPauseMs = 0;
  } catch {
    activeDomain = null;
    sessionStart = Date.now();
  }
}

async function onTabUpdated(tabId: number, changeInfo: chrome.tabs.TabChangeInfo) {
  // React to URL changes AND title changes on the active tab
  if (tabId !== activeTabId) return;

  if (changeInfo.url) {
    tick();

    const domain = extractDomain(changeInfo.url);
    activeDomain = domain;

    if (domain) {
      countVisit(domain);
    }

    sessionStart = Date.now();
    accumulatedPauseMs = 0;
  }

  // Capture page title when available
  if (changeInfo.title && activeDomain) {
    const record = ensureTodayRecord(activeDomain);
    record.title = changeInfo.title;
  }
}

function onWindowFocusChanged(windowId: number) {
  if (windowId === chrome.windows.WINDOW_ID_NONE) {
    // Browser lost focus — pause
    if (!isPaused) {
      tick();
      isPaused = true;
      pauseStart = Date.now();
    }
  } else {
    // Browser regained focus — resume
    if (isPaused) {
      accumulatedPauseMs += Date.now() - pauseStart;
      isPaused = false;
      sessionStart = Date.now();
    }
  }
}

// ─── Data Query ─────────────────────────────────────────

function getDateRange(period: 'day' | 'week' | 'month'): string[] {
  const now = new Date();
  const dates: string[] = [];

  if (period === 'day') {
    return [getDateKey()];
  }

  if (period === 'week') {
    const dayOfWeek = now.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    for (let i = mondayOffset; i <= 0; i++) {
      const d = new Date(now);
      d.setDate(d.getDate() + i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      dates.push(key);
    }
    return dates;
  }

  if (period === 'month') {
    const year = now.getFullYear();
    const month = now.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    for (let day = 1; day <= daysInMonth; day++) {
      const key = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      dates.push(key);
    }
    return dates;
  }

  return [];
}

function getRankings(period: 'day' | 'week' | 'month') {
  const dateKeys = getDateRange(period);
  const aggregated: Record<string, { time: number; visits: number }> = {};

  const recordKeys = Object.keys(data.records);
  console.log(
    `[Tracker] getRankings(${period}): dateKeys=${JSON.stringify(dateKeys)}, recordKeys=${JSON.stringify(recordKeys)}`,
  );
  if (dateKeys.length === 0) return [];

  for (const dateKey of dateKeys) {
    const day = data.records[dateKey];
    if (!day) continue;
    for (const [domain, record] of Object.entries(day)) {
      if (!aggregated[domain]) {
        aggregated[domain] = { time: 0, visits: 0 };
      }
      aggregated[domain].time += record.time;
      aggregated[domain].visits += record.visits;
    }
  }

  // Sort by time descending
  const sorted = Object.entries(aggregated).sort(([, a], [, b]) => b.time - a.time);

  const totalTime = sorted.reduce((sum, [, v]) => sum + v.time, 0);

  return sorted.map(([domain, stats]) => {
    // Find the latest title for this domain across all dates
    let title: string | undefined;
    for (const dateKey of dateKeys) {
      const r = data.records[dateKey]?.[domain];
      if (r?.title) {
        title = r.title;
        break;
      }
    }
    return {
      domain,
      name: getSiteName(domain, title),
      time: stats.time,
      visits: stats.visits,
      percentage: totalTime > 0 ? Math.round((stats.time / totalTime) * 100) : 0,
      faviconUrl: `https://www.google.com/s2/favicons?domain=${domain}&sz=32`,
    };
  });
}

function getHistorySummary() {
  const domains = new Map<string, { total: number; visits: number; days: number }>();
  let totalAll = 0;

  const recordKeys = Object.keys(data.records);
  if (recordKeys.length === 0) {
    console.log('[Tracker] getHistorySummary: no records in data');
    return { sites: [], totalTime: 0, siteCount: 0 };
  }
  console.log('[Tracker] getHistorySummary: records keys =', recordKeys);

  for (const [, day] of Object.entries(data.records)) {
    for (const [domain, record] of Object.entries(day)) {
      if (!domains.has(domain)) {
        domains.set(domain, { total: 0, visits: 0, days: 0 });
      }
      const d = domains.get(domain)!;
      d.total += record.time;
      d.visits += record.visits;
      d.days += 1;
      totalAll += record.time;
    }
  }

  // Sort by total time
  const sorted = [...domains.entries()].sort(([, a], [, b]) => b.total - a.total);

  return {
    sites: sorted.map(([domain, stats]) => {
      // Find the latest title for this domain
      let title: string | undefined;
      for (const [, day] of Object.entries(data.records)) {
        if (day[domain]?.title) {
          title = day[domain]!.title;
          break;
        }
      }
      return {
        domain,
        name: getSiteName(domain, title),
        total: stats.total,
        visits: stats.visits,
        days: stats.days,
        percentage: totalAll > 0 ? Math.round((stats.total / totalAll) * 100) : 0,
        faviconUrl: `https://www.google.com/s2/favicons?domain=${domain}&sz=32`,
        today: data.records[getDateKey()]?.[domain]?.time ?? 0,
      };
    }),
    totalTime: totalAll,
    siteCount: sorted.length,
  };
}

// ─── Init ───────────────────────────────────────────────

/** Called by both the interval and the alarm */
async function doTickAndSave() {
  tick();
  await saveSessionMeta();
  await flushData();
}

export async function initTracker() {
  await loadData();

  // Recover time lost during Service Worker suspension
  try {
    const sessionResult = await chrome.storage.local.get(SESSION_KEY);
    const meta = sessionResult[SESSION_KEY] as SessionMeta | undefined;
    if (meta?.domain && meta.lastTick > 0) {
      const gap = Date.now() - meta.lastTick;
      if (gap > 1000 && gap < 300000) {
        console.log(`[Tracker] Recovering ${Math.round(gap / 1000)}s gap for ${meta.domain}`);
        accumulateTime(meta.domain, gap);
      }
    }
  } catch {
    /* ignore */
  }

  // Register event listeners
  chrome.tabs.onActivated.addListener(onTabActivated);
  chrome.tabs.onUpdated.addListener(onTabUpdated);
  chrome.windows.onFocusChanged.addListener(onWindowFocusChanged);

  // Interval tick while SW is alive (real-time tracking)
  saveTimer = setInterval(doTickAndSave, SAVE_INTERVAL);

  // Alarm backup — wakes SW up if terminated, then tick+saves
  chrome.alarms.create('tracker-ping', { periodInMinutes: 1 });
  chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === 'tracker-ping') doTickAndSave();
  });

  // Get current active tab on start
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) {
      activeTabId = tab.id;
      const domain = extractDomain(tab.url);
      activeDomain = domain;
      if (domain) countVisit(domain);
      sessionStart = Date.now();
    }
  } catch {
    // No active tab found
  }

  console.log('[Tracker] Initialized');
}

export async function shutdownTracker() {
  tick();
  await saveSessionMeta();
  await flushData();
  if (saveTimer) clearInterval(saveTimer);
  chrome.alarms.clear('tracker-ping');
  console.log('[Tracker] Shut down');
}

// ─── Public API for message handling ────────────────────

export { getRankings, getHistorySummary, flushData };

export async function resetData(): Promise<void> {
  data = { records: {} };
  await flushData();
}

export function getFullHistory() {
  return getHistorySummary();
}
