/** 「网站统计」轻量卡片：今日/本周/本月上网总时长 + TOP 5 网站排行。数据由 background 的 site-tracker 通过 TRACKER_RANKINGS 提供。 */
import { esc } from '../utils';

const ST_KEY = 'moyu_stats_cache';

type Period = 'day' | 'week' | 'month';
const PERIODS: { id: Period; name: string }[] = [
  { id: 'day', name: '今日' },
  { id: 'week', name: '本周' },
  { id: 'month', name: '本月' },
];

interface StatsRow {
  domain: string;
  name: string;
  time: number;
  percentage: number;
}
interface StatsCache {
  rows: StatsRow[];
  ts: number;
}

let statsLoading = false;
let statsInited = false;
let statsLastFetch = 0;
let activePeriod: Period = 'day';

const ICON =
  '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2.5"/><path d="M9 2h6"/></svg>';

function fmtStatsTime(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return s ? `${h} 小时 ${m} 分 ${s} 秒` : `${h} 小时 ${m} 分`;
  if (m > 0) return `${m} 分 ${s} 秒`;
  return `${s} 秒`;
}
function fmtShort(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return m || s ? `${h}时${m}分${s}秒` : `${h}小时`;
  if (m > 0) return `${m}分${s}秒`;
  return `${s}秒`;
}
function loadCache(): Record<Period, StatsCache> {
  try {
    const r = localStorage.getItem(ST_KEY);
    const o = r ? JSON.parse(r) : {};
    return { day: o.day, week: o.week, month: o.month };
  } catch {
    return { day: undefined, week: undefined, month: undefined };
  }
}
function saveCache(period: Period, c: StatsCache) {
  try {
    const all = loadCache();
    all[period] = c;
    localStorage.setItem(ST_KEY, JSON.stringify(all));
  } catch {}
}

export function renderStatsCard(): string {
  const tabs = PERIODS.map(
    (p) =>
      `<button class="stats-tab${p.id === activePeriod ? ' active' : ''}" data-period="${p.id}">${p.name}</button>`,
  ).join('');
  return `<div class="widget-card stats-card">
      <div class="stats-head">
        <div class="stats-title">${ICON}网站统计</div>
        <div class="stats-tabs">${tabs}</div>
        <div class="stats-meta">
          <button class="stats-refresh" id="statsRefresh" title="刷新">↻</button>
        </div>
      </div>
      <div class="stats-body" id="statsBody"><div class="stats-empty">加载中…</div></div>
    </div>`;
}

function renderBody(error: boolean) {
  const body = document.getElementById('statsBody');
  if (!body) return;
  const c = loadCache()[activePeriod];
  if (!c || !c.rows.length) {
    body.innerHTML = `<div class="stats-empty">${error ? '⚠ 获取失败 · 点刷新重试' : '暂无数据，多逛逛再来看看'}</div>`;
    return;
  }
  const total = c.rows.reduce((s, r) => s + r.time, 0);
  const top = c.rows.slice(0, 5);
  const label = PERIODS.find((p) => p.id === activePeriod)?.name || '今日';
  body.innerHTML = `<div class="stats-total">${label} <b>${fmtStatsTime(total)}</b></div>
    <div class="stats-list">${top
      .map(
        (r, i) =>
          `<div class="stats-row">
            <span class="stats-rank r${i + 1}">${i + 1}</span>
            <span class="stats-name" title="${esc(r.domain)}">${esc(r.name)}</span>
            <span class="stats-time">${fmtShort(r.time)}</span>
            <span class="stats-bar"><i style="width:${Math.max(6, r.percentage)}%"></i></span>
          </div>`,
      )
      .join('')}</div>`;
}

async function refreshStats() {
  if (statsLoading) return;
  if (!document.getElementById('statsBody')) return;
  const btn = document.getElementById('statsRefresh');
  statsLoading = true;
  btn?.classList.add('spin');
  try {
    const res = (await chrome.runtime.sendMessage({ type: 'TRACKER_RANKINGS', period: activePeriod })) as
      | StatsRow[]
      | undefined;
    if (Array.isArray(res)) {
      saveCache(activePeriod, { rows: res, ts: Date.now() });
      statsLastFetch = Date.now();
      renderBody(false);
    } else {
      renderBody(true);
    }
  } catch {
    renderBody(true);
  } finally {
    statsLoading = false;
    btn?.classList.remove('spin');
  }
}

function switchPeriod(p: Period) {
  if (p === activePeriod) return;
  activePeriod = p;
  document.querySelectorAll('.stats-tab').forEach((b) =>
    b.classList.toggle('active', (b as HTMLElement).dataset.period === p),
  );
  const c = loadCache()[p];
  if (c) {
    renderBody(false);
  } else {
    const body = document.getElementById('statsBody');
    if (body) body.innerHTML = `<div class="stats-empty">加载中…</div>`;
  }
  refreshStats();
}

function onStatsVis() {
  if (document.visibilityState !== 'visible') return;
  if (Date.now() - statsLastFetch > 60000) refreshStats();
}

export async function initStats() {
  renderBody(false);
  document.getElementById('statsRefresh')?.addEventListener('click', refreshStats);
  document.querySelectorAll('.stats-tab').forEach((b) =>
    b.addEventListener('click', () => switchPeriod((b as HTMLElement).dataset.period as Period)),
  );
  if (statsInited) return;
  statsInited = true;
  refreshStats();
  setInterval(refreshStats, 600000);
  document.addEventListener('visibilitychange', onStatsVis);
}