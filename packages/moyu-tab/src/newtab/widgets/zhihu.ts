import { esc, pad, isSameDay } from '../utils';

export function renderZhihuCard(): string {
  return `<div class="widget-card zhihu-card">
      <div class="zhihu-head">
        <div class="zhihu-title">📰 知乎日报</div>
        <div class="zhihu-meta">
          <span class="zhihu-upd" id="zhihuUpd">加载中…</span>
          <button class="zhihu-refresh" id="zhihuRefresh" title="刷新">↻</button>
        </div>
      </div>
      <div class="zhihu-list" id="zhihuList"><div class="hot-empty">加载中…</div></div>
    </div>`;
}
const ZH_KEY = 'moyu_zhihu_cache';
interface ZHItem {
  title: string;
  url: string;
  image?: string;
  hint?: string;
}
interface ZHCache {
  list: ZHItem[];
  date: string;
  ts: number;
}
let zhLoading = false;
let zhInited = false;
function loadZH(): ZHCache | null {
  try {
    const r = localStorage.getItem(ZH_KEY);
    return r ? JSON.parse(r) : null;
  } catch {
    return null;
  }
}
function saveZH(c: ZHCache) {
  try {
    localStorage.setItem(ZH_KEY, JSON.stringify(c));
  } catch {}
}
function zhNeedsFetch(): boolean {
  const c = loadZH();
  if (c && isSameDay(c.ts)) return false;
  if (c?.ts && Date.now() - c.ts < 5 * 60 * 1000) return false;
  return true;
}
function renderZH(error: boolean) {
  const list = document.getElementById('zhihuList');
  const upd = document.getElementById('zhihuUpd');
  if (!list) return;
  const c = loadZH();
  if (!c || !c.list.length) {
    list.innerHTML = `<div class="hot-empty">${error ? '⚠ 获取失败 · 点击重试' : '加载中…'}</div>`;
    list.onclick = error ? () => refreshZH() : null;
    if (upd) upd.textContent = error ? '⚠ 失败' : '';
    return;
  }
  list.onclick = null;
  list.innerHTML = c.list
    .map(
      (s) =>
        `<a class="zhihu-row" href="${s.url}" target="_blank" rel="noopener">${s.image ? `<img class="zhihu-img" src="${s.image}" loading="lazy" referrerpolicy="no-referrer"/>` : ''}<div class="zhihu-info"><div class="zhihu-title-row">${esc(s.title)}</div>${s.hint ? `<div class="zhihu-hint">${esc(s.hint)}</div>` : ''}</div></a>`,
    )
    .join('');
  if (upd) upd.textContent = c.date || '';
}
async function refreshZH() {
  if (zhLoading) return;
  if (!document.getElementById('zhihuList')) return;
  const btn = document.getElementById('zhihuRefresh');
  zhLoading = true;
  btn?.classList.add('spin');
  try {
    const res = (await chrome.runtime.sendMessage({ type: 'ZHIHU_FETCH' })) as
      | { success: boolean; data?: { date: string; list: ZHItem[] }; error?: string }
      | undefined;
    if (res?.success && res.data?.list) {
      saveZH({ list: res.data.list, date: res.data.date, ts: Date.now() });
      renderZH(false);
    } else {
      renderZH(true);
    }
  } catch {
    renderZH(true);
  } finally {
    zhLoading = false;
    btn?.classList.remove('spin');
  }
}
function onZHVis() {
  if (document.visibilityState !== 'visible') return;
  if (zhNeedsFetch()) refreshZH();
}
export async function initZhihu() {
  renderZH(false);
  document.getElementById('zhihuRefresh')?.addEventListener('click', refreshZH);
  if (zhInited) return;
  zhInited = true;
  if (zhNeedsFetch()) refreshZH();
  document.addEventListener('visibilitychange', onZHVis);
}

