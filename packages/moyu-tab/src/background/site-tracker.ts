/**
 * 网站使用时长统计核心（从 website-tracker 集成）
 *
 * 监听 tabs.onActivated / onUpdated、windows.onFocusChanged，5 秒 tick 一次把活跃 tab 的时长
 * 累计进 chrome.storage.local（key 'tracker'，按 日期→域名 分桶）。SW 被终止后由 1 分钟 alarm
 * 兜底唤醒保存，重启时用 session meta 恢复 SW 休眠期间丢失的时长。
 * 纯逻辑，不碰 DOM；类型内联（moyu-tab 不依赖 @extensions/shared）。
 */

// ─── Types ──────────────────────────────────────────────

interface SiteRecord {
  time: number;
  visits: number;
  lastVisit: number;
  title?: string;
}
interface TrackerData {
  records: { [date: string]: { [domain: string]: SiteRecord } };
}
export interface SiteRankingItem {
  domain: string;
  name: string;
  time: number;
  visits: number;
  percentage: number;
}

// ─── Constants ──────────────────────────────────────────

const STORAGE_KEY = 'tracker';
const SESSION_KEY = 'tracker_session';
const SAVE_INTERVAL = 5000;
const ALARM_PING = 'site-tracker-ping';
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
  'juejin.cn': '掘金',
  'csdn.net': 'CSDN',
  'stackoverflow.com': 'Stack Overflow',
  'feishu.cn': '飞书',
  'dingtalk.com': '钉钉',
  'weixin.qq.com': '微信',
  'taobao.com': '淘宝',
  'jd.com': '京东',
  'meituan.com': '美团',
  'dianping.com': '大众点评',
  'xiaohongshu.com': '小红书',
  '163.com': '网易',
  'mi.com': '小米',
  'bytedance.com': '字节跳动',
  'tencent.com': '腾讯',
  'alibaba.com': '阿里巴巴',
  'microsoft.com': 'Microsoft',
  'apple.com': 'Apple',
  'figma.com': 'Figma',
  'notion.so': 'Notion',
  'docker.com': 'Docker',
};
const PARENT_DOMAINS = Object.keys(KNOWN_SITES).filter(
  (d) => d.split('.').length === 2 || d.endsWith('.com.cn') || d.endsWith('.co.jp'),
);

// ─── State ──────────────────────────────────────────────

let activeTabId: number | null = null;
let activeDomain: string | null = null;
let sessionStart: number = Date.now();
let isPaused = false;
let data: TrackerData = { records: {} };
let saveTimer: ReturnType<typeof setInterval> | null = null;
let isSaving = false;

// ─── Domain / Name ──────────────────────────────────────

function normalizeDomain(raw: string): string {
  if (KNOWN_SITES[raw]) return raw;
  // 只对已知平台的父域做归并（如 v.qq.com → qq.com）；未知域名保留完整子域，避免误合并（如 r2h1.github.io）
  for (const parent of PARENT_DOMAINS) {
    if (raw.endsWith('.' + parent)) return parent;
  }
  return raw;
}
function getSiteName(domain: string, title?: string): string {
  if (KNOWN_SITES[domain]) return KNOWN_SITES[domain];
  if (title) {
    const cleaned = title.split(/[–—\-|·•]/)[0]?.trim();
    if (cleaned && cleaned.length > 1 && cleaned.length < 30) return cleaned;
  }
  return domain.replace(/\..+$/, '').replace(/^www\./, '');
}
function extractDomain(url: string | undefined): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    if (INTERNAL_PREFIXES.some((p) => u.protocol.startsWith(p.replace(':', '')))) return null;
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

// ─── Data ──────────────────────────────────────────────

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

async function loadData(): Promise<void> {
  try {
    const result = await chrome.storage.local.get(STORAGE_KEY);
    if (result[STORAGE_KEY]) data = result[STORAGE_KEY] as TrackerData;
  } catch {
    /* ignore */
  }
}
async function flushData(): Promise<void> {
  if (isSaving) return;
  isSaving = true;
  try {
    await chrome.storage.local.set({ [STORAGE_KEY]: data });
  } catch {
    /* ignore */
  } finally {
    isSaving = false;
  }
}
async function saveSessionMeta() {
  try {
    await chrome.storage.local.set({ [SESSION_KEY]: { domain: activeDomain, lastTick: Date.now() } as SessionMeta });
  } catch {
    /* ignore */
  }
}
function tick() {
  if (isPaused || !activeDomain || activeTabId === null) return;
  const now = Date.now();
  const elapsed = now - sessionStart;
  if (elapsed > 0) accumulateTime(activeDomain, elapsed);
  sessionStart = now;
}

// ─── Event Handlers ────────────────────────────────────

let tabSeq = 0; // 切换竞态防护：忽略乱序返回的过期 tab 信息
async function onTabActivated(activeInfo: chrome.tabs.TabActiveInfo) {
  tick();
  await flushData(); // 切 tab 立即落盘，保证查询读到最新时长（避免 interval 未 flush 时读到旧数据）
  activeTabId = activeInfo.tabId;
  const seq = ++tabSeq;
  try {
    const tab = await chrome.tabs.get(activeInfo.tabId);
    if (seq !== tabSeq) return; // 期间又切了 tab，丢弃这次过期结果
    const domain = extractDomain(tab.url);
    activeDomain = domain;
    if (domain) {
      countVisit(domain);
      if (tab.title) {
        const record = ensureTodayRecord(domain);
        record.title = tab.title;
      }
    }
    sessionStart = Date.now();
    await saveSessionMeta(); // 就地更新 meta，让 SW 休眠后的缺口恢复落到当前活跃站
  } catch {
    if (seq !== tabSeq) return;
    activeDomain = null;
    sessionStart = Date.now();
  }
}
async function onTabUpdated(tabId: number, changeInfo: chrome.tabs.TabChangeInfo) {
  if (tabId !== activeTabId) return;
  if (changeInfo.url) {
    tick();
    await flushData(); // 页面导航立即落盘
    const domain = extractDomain(changeInfo.url);
    activeDomain = domain;
    if (domain) countVisit(domain);
    sessionStart = Date.now();
    await saveSessionMeta(); // 导航后同步 meta
  }
  if (changeInfo.title && activeDomain) {
    const record = ensureTodayRecord(activeDomain);
    record.title = changeInfo.title;
  }
}
function onWindowFocusChanged(windowId: number) {
  if (windowId === chrome.windows.WINDOW_ID_NONE) {
    // 浏览器整体失焦：先把失焦前的时长落地，暂停累计
    if (!isPaused) {
      tick();
      void flushData(); // 失焦落地
      isPaused = true;
    }
  } else if (isPaused) {
    // 恢复聚焦：暂停期间本就没在 tick，直接重新计时即可，不重复扣除
    isPaused = false;
    sessionStart = Date.now();
  }
}

// ─── Query ─────────────────────────────────────────────

function dateRange(period: 'day' | 'week' | 'month'): string[] {
  const now = new Date();
  const dates: string[] = [];
  if (period === 'day') return [getDateKey()];
  if (period === 'week') {
    const dow = now.getDay();
    const offset = dow === 0 ? -6 : 1 - dow;
    for (let i = offset; i <= 0; i++) {
      const d = new Date(now);
      d.setDate(d.getDate() + i);
      dates.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
    }
    return dates;
  }
  if (period === 'month') {
    const days = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    for (let day = 1; day <= days; day++) {
      dates.push(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`);
    }
  }
  return dates;
}
export async function getSiteRankings(period: 'day' | 'week' | 'month'): Promise<SiteRankingItem[]> {
  await flushData(); // 先把内存最新时长落盘，再读回，避免读到旧数据
  await loadData();
  const keys = dateRange(period);
  const agg: Record<string, { time: number; visits: number }> = {};
  for (const dateKey of keys) {
    const day = data.records[dateKey];
    if (!day) continue;
    for (const [domain, r] of Object.entries(day)) {
      if (!agg[domain]) agg[domain] = { time: 0, visits: 0 };
      agg[domain].time += r.time;
      agg[domain].visits += r.visits;
    }
  }
  const sorted = Object.entries(agg).sort(([, a], [, b]) => b.time - a.time);
  const total = sorted.reduce((s, [, v]) => s + v.time, 0);
  return sorted.map(([domain, s]) => {
    let title: string | undefined;
    for (const dateKey of keys) {
      const r = data.records[dateKey]?.[domain];
      if (r?.title) {
        title = r.title;
        break;
      }
    }
    return {
      domain,
      name: getSiteName(domain, title),
      time: s.time,
      visits: s.visits,
      percentage: total > 0 ? Math.round((s.time / total) * 100) : 0,
    };
  });
}

// ─── Init / Shutdown ───────────────────────────────────

async function doTickAndSave() {
  tick();
  await saveSessionMeta();
  await flushData();
}

function initListeners() {
  chrome.tabs.onActivated.addListener(onTabActivated);
  chrome.tabs.onUpdated.addListener(onTabUpdated);
  chrome.windows.onFocusChanged.addListener(onWindowFocusChanged);
}

/** 启动统计：载入数据、恢复休眠缺口、注册监听、启动 tick 与 alarm 兜底。SW 每次唤醒都会跑到（模块重载），幂等。 */
export async function initSiteTracker() {
  await loadData();
  try {
    const r = await chrome.storage.local.get(SESSION_KEY);
    const meta = r[SESSION_KEY] as SessionMeta | undefined;
    if (meta?.domain && meta.lastTick > 0) {
      const gap = Date.now() - meta.lastTick;
      if (gap > 1000 && gap < 300000) accumulateTime(meta.domain, gap);
    }
  } catch {
    /* ignore */
  }
  initListeners();
  if (!saveTimer) saveTimer = setInterval(doTickAndSave, SAVE_INTERVAL);
  chrome.alarms.create(ALARM_PING, { periodInMinutes: 1 });
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) {
      activeTabId = tab.id;
      activeDomain = extractDomain(tab.url); // 只设当前域用于计时，不 countVisit（避免 SW 每次唤醒虚增访问）
      sessionStart = Date.now();
    }
  } catch {
    /* ignore */
  }
}

export async function shutdownSiteTracker() {
  tick();
  await saveSessionMeta();
  await flushData();
  if (saveTimer) {
    clearInterval(saveTimer);
    saveTimer = null;
  }
  chrome.alarms.clear(ALARM_PING);
}

export async function resetSiteTracker() {
  data = { records: {} };
  await flushData();
}