import { esc, pad } from '../utils';
import { loadWereadKey, renderWereadKeySetup } from './weread-shared';

const RD_CACHE = 'moyu_weread_readdata_cache';
const RD_TTL = 60 * 60 * 1000;

interface RDLongest {
  title: string;
  author: string;
  readTime: number;
  deepLink: string;
}
interface RDStat {
  totalReadTime: number;
  readDays: number;
  dayAverageReadTime: number;
  longest: RDLongest[];
  categories: string[];
  categoryWord?: string;
  timeWord?: string;
}
interface RDCache {
  stat: RDStat;
  ts: number;
}

let rdLoading = false;
let rdInited = false;
let rdLastFetch = 0;

export function renderReaddataCard(): string {
  return `<div class="widget-card hot-card readdata-card">
      <div class="hot-head">
        <div class="hot-title">📊 阅读统计</div>
        <div class="hot-meta">
          <span class="hot-upd" id="readdataUpd"></span>
          <button class="hot-swap" id="readdataRefresh" title="刷新">↻</button>
        </div>
      </div>
      <div class="readdata-body" id="readdataBody"><div class="hot-empty">加载中…</div></div>
    </div>`;
}

function loadCache(): RDCache | null {
  try {
    const r = localStorage.getItem(RD_CACHE);
    return r ? JSON.parse(r) : null;
  } catch {
    return null;
  }
}
function saveCache(c: RDCache) {
  try {
    localStorage.setItem(RD_CACHE, JSON.stringify(c));
  } catch {}
}
function fmtTime(ts: number) {
  const d = new Date(ts);
  return pad(d.getHours()) + ':' + pad(d.getMinutes());
}
function fmtDuration(sec: number): string {
  if (!sec || sec < 60) return '不足1分';
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (h && m) return h + '时' + m + '分';
  if (h) return h + '小时';
  return m + '分钟';
}

async function renderRD(error?: string) {
  const body = document.getElementById('readdataBody');
  const upd = document.getElementById('readdataUpd');
  if (!body) return;
  const key = await loadWereadKey();
  if (!key) {
    renderWereadKeySetup(body, refreshRD);
    if (upd) upd.textContent = '';
    return;
  }
  const c = loadCache();
  if (!c || !c.stat) {
    body.innerHTML = `<div class="hot-empty">${error ? '⚠ ' + esc(error) + ' · 点击重试' : '加载中…'}</div>`;
    body.onclick = error ? () => refreshRD() : null;
    if (upd) upd.textContent = error ? '⚠ 失败' : '';
    return;
  }
  body.onclick = null;
  const s = c.stat;
  const stats = `<div class="readdata-stats">
      <div class="readdata-stat"><div class="readdata-stat-val">${fmtDuration(s.totalReadTime)}</div><div class="readdata-stat-label">本月时长</div></div>
      <div class="readdata-stat"><div class="readdata-stat-val">${s.readDays}</div><div class="readdata-stat-label">阅读天数</div></div>
      <div class="readdata-stat"><div class="readdata-stat-val">${fmtDuration(s.dayAverageReadTime)}</div><div class="readdata-stat-label">日均</div></div>
    </div>`;
  const longest = s.longest.length
    ? `<div class="readdata-section">读得最多</div>` +
      s.longest
        .map((b, i) => {
          const author = b.author ? ` <span class="weread-author">· ${esc(b.author)}</span>` : '';
          const t = b.readTime ? `<span class="hot-num">${fmtDuration(b.readTime)}</span>` : '';
          const href = b.deepLink ? ` href="${esc(b.deepLink)}" target="_blank" rel="noopener"` : '';
          return `<a class="hot-row"${href}><span class="hot-rank${i < 3 ? ' top' : ''}">${i + 1}</span><span class="hot-title">${esc(b.title)}${author}</span>${t}</a>`;
        })
        .join('')
    : '';
  const cats = s.categories.length
    ? `<div class="readdata-cats">${s.categories.map((cat) => `<span class="readdata-cat">${esc(cat)}</span>`).join('')}</div>`
    : '';
  body.innerHTML = stats + longest + cats;
  if (upd) upd.textContent = fmtTime(c.ts);
}

async function refreshRD() {
  if (rdLoading) return;
  if (!document.getElementById('readdataBody')) return;
  const key = await loadWereadKey();
  if (!key) {
    renderRD();
    return;
  }
  rdLoading = true;
  const btn = document.getElementById('readdataRefresh');
  btn?.classList.add('spin');
  try {
    const res = (await chrome.runtime.sendMessage({ type: 'WEREAD_READDATA_FETCH', apiKey: key })) as
      | { success: boolean; data?: RDStat; error?: string }
      | undefined;
    if (res?.success && res.data) {
      saveCache({ stat: res.data, ts: Date.now() });
      rdLastFetch = Date.now();
      renderRD();
    } else {
      const err = res?.error === 'invalid_key' ? 'API Key 无效' : '获取失败';
      renderRD(err);
    }
  } catch {
    renderRD('获取失败');
  } finally {
    rdLoading = false;
    btn?.classList.remove('spin');
  }
}

function onRDVis() {
  if (document.visibilityState !== 'visible') return;
  if (Date.now() - rdLastFetch > RD_TTL) refreshRD();
}

export async function initReaddata() {
  await renderRD();
  document.getElementById('readdataRefresh')?.addEventListener('click', refreshRD);
  if (rdInited) return;
  rdInited = true;
  const key = await loadWereadKey();
  if (key) {
    const c = loadCache();
    if (!c || Date.now() - c.ts > RD_TTL) refreshRD();
  }
  document.addEventListener('visibilitychange', onRDVis);
}
