import { esc, pad } from '../utils';
import { loadWereadKey, renderWereadKeySetup } from './weread-shared';

const RC_CACHE = 'moyu_weread_recommend_cache';
const RC_TTL = 30 * 60 * 1000;

interface RCBook {
  bid: string;
  title: string;
  author: string;
  rating: number;
  reason: string;
  deepLink: string;
}
interface RCCache {
  books: RCBook[];
  ts: number;
}

let rcLoading = false;
let rcInited = false;
let rcLastFetch = 0;

export function renderRecommendCard(): string {
  return `<div class="widget-card hot-card recommend-card">
      <div class="hot-head">
        <div class="hot-title">💡 为你推荐</div>
        <div class="hot-meta">
          <span class="hot-upd" id="recommendUpd"></span>
          <button class="hot-swap" id="recommendRefresh" title="刷新">↻</button>
        </div>
      </div>
      <div class="hot-list" id="recommendList"><div class="hot-empty">加载中…</div></div>
    </div>`;
}

function loadCache(): RCCache | null {
  try {
    const r = localStorage.getItem(RC_CACHE);
    return r ? JSON.parse(r) : null;
  } catch {
    return null;
  }
}
function saveCache(c: RCCache) {
  try {
    localStorage.setItem(RC_CACHE, JSON.stringify(c));
  } catch {}
}
function fmtTime(ts: number) {
  const d = new Date(ts);
  return pad(d.getHours()) + ':' + pad(d.getMinutes());
}
function fmtRating(r: number) {
  return r ? (r / 10).toFixed(1) : '';
}

async function renderRC(error?: string) {
  const list = document.getElementById('recommendList');
  const upd = document.getElementById('recommendUpd');
  if (!list) return;
  const key = await loadWereadKey();
  if (!key) {
    renderWereadKeySetup(list, refreshRC);
    if (upd) upd.textContent = '';
    return;
  }
  const c = loadCache();
  if (!c || !c.books.length) {
    list.innerHTML = `<div class="hot-empty">${error ? '⚠ ' + esc(error) + ' · 点击重试' : '加载中…'}</div>`;
    list.onclick = error ? () => refreshRC() : null;
    if (upd) upd.textContent = error ? '⚠ 失败' : '';
    return;
  }
  list.onclick = null;
  list.innerHTML = c.books
    .map((b, i) => {
      const rank = i + 1;
      const top = rank <= 3 ? ' top' : '';
      const author = b.author ? ` <span class="weread-author">· ${esc(b.author)}</span>` : '';
      const rating = fmtRating(b.rating);
      const num = rating ? `<span class="hot-num">${rating}</span>` : '';
      const reason = b.reason ? ` title="${esc(b.reason)}"` : '';
      return `<a class="hot-row" href="${esc(b.deepLink)}" target="_blank" rel="noopener"${reason}><span class="hot-rank${top}">${rank}</span><span class="hot-title">${esc(b.title)}${author}</span>${num}</a>`;
    })
    .join('');
  if (upd) upd.textContent = fmtTime(c.ts);
}

async function refreshRC() {
  if (rcLoading) return;
  if (!document.getElementById('recommendList')) return;
  const key = await loadWereadKey();
  if (!key) {
    renderRC();
    return;
  }
  rcLoading = true;
  const btn = document.getElementById('recommendRefresh');
  btn?.classList.add('spin');
  try {
    const res = (await chrome.runtime.sendMessage({ type: 'WEREAD_RECOMMEND_FETCH', apiKey: key })) as
      | { success: boolean; data?: { books: RCBook[] }; error?: string }
      | undefined;
    if (res?.success && res.data?.books?.length) {
      saveCache({ books: res.data.books, ts: Date.now() });
      rcLastFetch = Date.now();
      renderRC();
    } else {
      const err = res?.error === 'invalid_key' ? 'API Key 无效' : '获取失败';
      renderRC(err);
    }
  } catch {
    renderRC('获取失败');
  } finally {
    rcLoading = false;
    btn?.classList.remove('spin');
  }
}

function onRCVis() {
  if (document.visibilityState !== 'visible') return;
  if (Date.now() - rcLastFetch > RC_TTL) refreshRC();
}

export async function initRecommend() {
  await renderRC();
  document.getElementById('recommendRefresh')?.addEventListener('click', refreshRC);
  if (rcInited) return;
  rcInited = true;
  const key = await loadWereadKey();
  if (key) {
    const c = loadCache();
    if (!c || Date.now() - c.ts > RC_TTL) refreshRC();
  }
  document.addEventListener('visibilitychange', onRCVis);
}
