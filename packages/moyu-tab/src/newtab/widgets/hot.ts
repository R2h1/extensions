import { esc, pad } from '../utils';
import { WID } from '../config';

export function renderHotCard(w: WID): string {
  const p = HOT_WIDGETS[w.id].platform;
  return `<div class="widget-card hot-card">
      <div class="hot-head">
        <div class="hot-title">${HOT_WIDGETS[w.id].name}</div>
        <div class="hot-meta">
          <span class="hot-upd" id="hotUpd-${p}"></span>
          <button class="hot-swap" id="hotSwap-${p}" title="换一换">换一换 <i id="hotPage-${p}">1/3</i></button>
        </div>
      </div>
      <div class="hot-list" id="hotList-${p}"><div class="hot-empty">加载中…</div></div>
    </div>`;
}
const HC_KEY = 'moyu_hot_cache';
export const HOT_WIDGETS: Record<string, { platform: string; name: string }> = {
  hot_weibo: { platform: 'weibo', name: '微博热搜' },
  hot_bilibili: { platform: 'bilibili', name: 'B站热搜' },
  hot_baidu: { platform: 'baidu', name: '百度热搜' },
};
interface HItem {
  title: string;
  hot: string;
  url: string;
  tag?: string;
}
const hotLoading: Record<string, boolean> = {};
const hotLastFetch: Record<string, number> = {};
const hotInited: Record<string, boolean> = {};
const hotPage: Record<string, number> = {};
function loadHotCache(): Record<string, { items: HItem[]; ts: number }> {
  try {
    const raw = localStorage.getItem(HC_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}
function saveHotCache(c: Record<string, { items: HItem[]; ts: number }>) {
  try {
    localStorage.setItem(HC_KEY, JSON.stringify(c));
  } catch {}
}
function fmtHotTime(ts: number) {
  const d = new Date(ts);
  return pad(d.getHours()) + ':' + pad(d.getMinutes());
}
function renderHotList(platform: string, error: boolean) {
  const list = document.getElementById('hotList-' + platform);
  const upd = document.getElementById('hotUpd-' + platform);
  const pageEl = document.getElementById('hotPage-' + platform);
  if (!list) return;
  const cache = loadHotCache();
  const c = cache[platform];
  if (!c || !c.items.length) {
    list.innerHTML = `<div class="hot-empty">${error ? '⚠ 获取失败' : '加载中…'}</div>`;
    if (upd) upd.textContent = error ? '⚠ 失败' : '';
    return;
  }
  const total = Math.min(3, Math.ceil(c.items.length / 10) || 1);
  const page = (hotPage[platform] || 0) % total;
  const slice = c.items.slice(page * 10, page * 10 + 10);
  list.innerHTML = slice
    .map((it, i) => {
      const rank = page * 10 + i + 1;
      return `<a class="hot-row" href="${it.url}" target="_blank" rel="noopener"><span class="hot-rank${rank <= 3 ? ' top' : ''}">${rank}</span><span class="hot-title">${esc(it.title)}${it.tag ? `<i class="hot-tag">${esc(it.tag)}</i>` : ''}</span>${it.hot ? `<span class="hot-num">${esc(it.hot)}</span>` : ''}</a>`;
    })
    .join('');
  if (pageEl) pageEl.textContent = page + 1 + '/' + total;
  if (upd) upd.textContent = (error ? '⚠ ' : '') + fmtHotTime(c.ts) + ' 更新';
}
function swapHotPage(platform: string) {
  const cache = loadHotCache();
  const c = cache[platform];
  if (!c || !c.items.length) return;
  const total = Math.min(3, Math.ceil(c.items.length / 10) || 1);
  hotPage[platform] = ((hotPage[platform] || 0) + 1) % total;
  renderHotList(platform, false);
}
async function refreshHot(platform: string) {
  if (hotLoading[platform]) return;
  if (!document.getElementById('hotList-' + platform)) return;
  hotLoading[platform] = true;
  try {
    const res = (await chrome.runtime.sendMessage({ type: 'HOT_FETCH', platform })) as
      | { success: boolean; data?: HItem[]; error?: string }
      | undefined;
    if (res?.success && res.data) {
      const cache = loadHotCache();
      cache[platform] = { items: res.data, ts: Date.now() };
      saveHotCache(cache);
      hotLastFetch[platform] = Date.now();
      renderHotList(platform, false);
    } else {
      renderHotList(platform, true);
    }
  } catch {
    renderHotList(platform, true);
  } finally {
    hotLoading[platform] = false;
  }
}
function onHotVis(platform: string) {
  if (document.visibilityState !== 'visible') return;
  if (Date.now() - (hotLastFetch[platform] || 0) > 300000) refreshHot(platform);
}
export async function initHotCard(platform: string) {
  renderHotList(platform, false);
  document
    .getElementById('hotSwap-' + platform)
    ?.addEventListener('click', () => swapHotPage(platform));
  if (hotInited[platform]) return;
  hotInited[platform] = true;
  refreshHot(platform);
  setInterval(() => refreshHot(platform), 300000);
  document.addEventListener('visibilitychange', () => onHotVis(platform));
}

