import { esc, pad } from '../utils';
import { loadWereadKey, renderWereadKeyPrompt, openBookReviewIn } from './weread-shared';

const WR_CACHE = 'moyu_weread_shelf_cache';
const WR_TTL = 30 * 60 * 1000;

export interface WRShelfBook {
  bid: string;
  title: string;
  author: string;
  cover: string;
  category: string;
  deepLink: string;
  readUpdateTime: number;
  finished: boolean;
  isTop: boolean;
}
export interface WRShelfCache {
  books: WRShelfBook[];
  total: number;
  ts: number;
}

let wrLoading = false;
let wrInited = false;
let wrLastFetch = 0;

export function renderWereadCard(): string {
  return `<div class="widget-card hot-card weread-card">
      <div class="hot-head">
        <div class="hot-title">📚 我的书架</div>
        <div class="hot-meta">
          <span class="hot-upd" id="wereadUpd"></span>
          <button class="hot-swap" id="wereadRefresh" title="刷新">↻</button>
        </div>
      </div>
      <div class="weread-body" id="wereadBody"><div class="hot-empty">加载中…</div></div>
    </div>`;
}

export function loadCache(): WRShelfCache | null {
  try {
    const r = localStorage.getItem(WR_CACHE);
    return r ? JSON.parse(r) : null;
  } catch {
    return null;
  }
}
export function saveCache(c: WRShelfCache) {
  try {
    localStorage.setItem(WR_CACHE, JSON.stringify(c));
  } catch {}
}
function fmtWRTime(ts: number) {
  const d = new Date(ts);
  return pad(d.getHours()) + ':' + pad(d.getMinutes());
}

async function renderWR(error?: string) {
  const body = document.getElementById('wereadBody');
  const upd = document.getElementById('wereadUpd');
  if (!body) return;
  const key = await loadWereadKey();
  if (!key) {
    renderWereadKeyPrompt(body, '未设置 API Key');
    if (upd) upd.textContent = '';
    return;
  }
  const c = loadCache();
  if (!c || !c.books.length) {
    if (error === 'API Key 无效') {
      renderWereadKeyPrompt(body, 'API Key 无效');
    } else {
      body.innerHTML = `<div class="hot-empty">${error ? '⚠ ' + esc(error) + ' · 点击重试' : '加载中…'}</div>`;
      body.onclick = error ? () => refreshWR() : null;
    }
    if (upd) upd.textContent = error ? '⚠ 失败' : '';
    return;
  }
  body.onclick = null;
  const books = [...c.books].sort((a, b) => {
    if (a.isTop !== b.isTop) return a.isTop ? -1 : 1;
    return (b.readUpdateTime || 0) - (a.readUpdateTime || 0);
  });
  const items = books
    .slice(0, 15)
    .map((b) => {
      const badge = b.finished ? '<span class="wr-cover-badge done">读完</span>' : '';
      const cover = b.cover
        ? `<img src="${esc(b.cover)}" alt="" loading="lazy" referrerpolicy="no-referrer"/>`
        : '<div class="wr-rec-cover-ph">📖</div>';
      const author = b.author
        ? `<span class="wr-rec-author">${esc(b.author)}</span>`
        : '<span></span>';
      return `<a class="wr-rec-item" href="${esc(b.deepLink)}" target="_blank" rel="noopener" data-bid="${esc(b.bid)}" title="查看书评"><div class="wr-rec-cover">${cover}${badge}</div><div class="wr-rec-title">${esc(b.title)}</div><div class="wr-rec-meta">${author}</div></a>`;
    })
    .join('');
  body.innerHTML = `<div class="weread-total">书架 ${c.total} 个条目 · 最近在读</div><div class="wr-rec-grid">${items}</div>`;
  if (upd) upd.textContent = fmtWRTime(c.ts);
  body.onclick = (e) => {
    const item = (e.target as HTMLElement).closest('.wr-rec-item') as HTMLElement | null;
    if (!item) return;
    e.preventDefault();
    const b = books.find((x) => x.bid === item.dataset.bid);
    if (b) openBookReviewIn(body, b, renderWR);
  };
}

async function refreshWR() {
  if (wrLoading) return;
  if (!document.getElementById('wereadBody')) return;
  const key = await loadWereadKey();
  if (!key) {
    renderWR();
    return;
  }
  wrLoading = true;
  const btn = document.getElementById('wereadRefresh');
  btn?.classList.add('spin');
  try {
    const res = (await chrome.runtime.sendMessage({ type: 'WEREAD_SHELF_FETCH', apiKey: key })) as
      | { success: boolean; data?: { books: WRShelfBook[]; total: number }; error?: string }
      | undefined;
    if (res?.success && res.data?.books?.length) {
      saveCache({ books: res.data.books, total: res.data.total, ts: Date.now() });
      wrLastFetch = Date.now();
      renderWR();
    } else {
      const err = res?.error === 'invalid_key' ? 'API Key 无效' : '获取失败';
      renderWR(err);
    }
  } catch {
    renderWR('获取失败');
  } finally {
    wrLoading = false;
    btn?.classList.remove('spin');
  }
}

function onWRVis() {
  if (document.visibilityState !== 'visible') return;
  if (Date.now() - wrLastFetch > WR_TTL) refreshWR();
}

export async function initWeread() {
  await renderWR();
  document.getElementById('wereadRefresh')?.addEventListener('click', refreshWR);
  if (wrInited) return;
  wrInited = true;
  const key = await loadWereadKey();
  if (key) {
    const c = loadCache();
    if (!c || Date.now() - c.ts > WR_TTL) refreshWR();
  }
  document.addEventListener('visibilitychange', onWRVis);
}
