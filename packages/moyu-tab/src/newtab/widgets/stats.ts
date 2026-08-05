/** 「网站统计」轻量卡片：今日上网总时长 + TOP 5 网站排行。数据由 background 的 site-tracker 通过 TRACKER_RANKINGS 提供。 */
import { esc } from '../utils';

const ST_KEY = 'moyu_stats_cache';

interface StatsRow {
  domain: string;
  name: string;
  time: number;
  percentage: number;
}
interface StatsCache {
  rows: StatsRow[];
  ts: number;
  period: string;
}

let statsLoading = false;
let statsInited = false;
let statsLastFetch = 0;

const ICON =
  '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2.5"/><path d="M9 2h6"/></svg>';

function pad(n: number): string {
  return String(n).padStart(2, '0');
}
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
function fmtTs(ts: number): string {
  const d = new Date(ts);
  return pad(d.getHours()) + ':' + pad(d.getMinutes());
}

function loadCache(): StatsCache | null {
  try {
    const r = localStorage.getItem(ST_KEY);
    return r ? (JSON.parse(r) as StatsCache) : null;
  } catch {
    return null;
  }
}
function saveCache(c: StatsCache) {
  try {
    localStorage.setItem(ST_KEY, JSON.stringify(c));
  } catch {}
}

export function renderStatsCard(): string {
  return `<div class="widget-card stats-card">
      <div class="stats-head">
        <div class="stats-title">${ICON}网站统计</div>
        <div class="stats-meta">
          <span class="stats-upd" id="statsUpd"></span>
          <button class="stats-refresh" id="statsRefresh" title="刷新">↻</button>
        </div>
      </div>
      <div class="stats-body" id="statsBody"><div class="stats-empty">加载中…</div></div>
    </div>`;
}

function renderBody(error: boolean) {
  const body = document.getElementById('statsBody');
  const upd = document.getElementById('statsUpd');
  if (!body) return;
  const c = loadCache();
  if (!c || !c.rows.length) {
    body.innerHTML = `<div class="stats-empty">${error ? '⚠ 获取失败 · 点刷新重试' : '暂无数据，多逛逛再来看看'}</div>`;
    if (upd) upd.textContent = error ? '⚠ 失败' : '';
    return;
  }
  const total = c.rows.reduce((s, r) => s + r.time, 0);
  const top = c.rows.slice(0, 5);
  const maxPct = Math.max(1, ...top.map((r) => r.percentage));
  body.innerHTML = `<div class="stats-total">今日 <b>${fmtStatsTime(total)}</b></div>
    <div class="stats-list">${top
      .map(
        (r, i) =>
          `<div class="stats-row">
            <span class="stats-rank r${i + 1}">${i + 1}</span>
            <span class="stats-name" title="${esc(r.domain)}">${esc(r.name)}</span>
            <span class="stats-bar"><i style="width:${Math.max(4, Math.round((r.percentage / maxPct) * 100))}%"></i></span>
            <span class="stats-time">${fmtShort(r.time)}</span>
          </div>`,
      )
      .join('')}</div>`;
  if (upd) upd.textContent = (error ? '⚠ ' : '') + fmtTs(c.ts) + ' 更新';
}

async function refreshStats() {
  if (statsLoading) return;
  if (!document.getElementById('statsBody')) return;
  const btn = document.getElementById('statsRefresh');
  statsLoading = true;
  btn?.classList.add('spin');
  try {
    const res = (await chrome.runtime.sendMessage({ type: 'TRACKER_RANKINGS', period: 'day' })) as
      | StatsRow[]
      | undefined;
    if (Array.isArray(res)) {
      saveCache({ rows: res, ts: Date.now(), period: 'day' });
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

function onStatsVis() {
  if (document.visibilityState !== 'visible') return;
  if (Date.now() - statsLastFetch > 60000) refreshStats();
}

export async function initStats() {
  renderBody(false);
  document.getElementById('statsRefresh')?.addEventListener('click', refreshStats);
  if (statsInited) return;
  statsInited = true;
  refreshStats();
  setInterval(refreshStats, 600000);
  document.addEventListener('visibilitychange', onStatsVis);
}