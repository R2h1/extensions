import { esc, pad } from '../utils';
import { loadWereadKey, renderWereadKeySetup } from './weread-shared';

const RV_CACHE = 'moyu_weread_review_cache';
const RV_TTL = 60 * 60 * 1000;

interface RVReview {
  author: string;
  star: number;
  content: string;
  time: number;
}
interface RVCache {
  bookTitle: string;
  bookDeepLink: string;
  reviews: RVReview[];
  total: number;
  ts: number;
}

let rvLoading = false;
let rvInited = false;
let rvLastFetch = 0;

export function renderReviewCard(): string {
  return `<div class="widget-card hot-card review-card">
      <div class="hot-head">
        <div class="hot-title">💬 书评</div>
        <div class="hot-meta">
          <span class="hot-upd" id="reviewUpd"></span>
          <button class="hot-swap" id="reviewRefresh" title="刷新">↻</button>
        </div>
      </div>
      <div class="review-body" id="reviewBody"><div class="hot-empty">加载中…</div></div>
    </div>`;
}

function loadCache(): RVCache | null {
  try {
    const r = localStorage.getItem(RV_CACHE);
    return r ? JSON.parse(r) : null;
  } catch {
    return null;
  }
}
function saveCache(c: RVCache) {
  try {
    localStorage.setItem(RV_CACHE, JSON.stringify(c));
  } catch {}
}
function fmtTime(ts: number) {
  const d = new Date(ts);
  return pad(d.getHours()) + ':' + pad(d.getMinutes());
}
function fmtStar(star: number): string {
  const n = Math.round(star / 20);
  return n > 0 ? '★'.repeat(n) : '';
}

async function renderRV(error?: string) {
  const body = document.getElementById('reviewBody');
  const upd = document.getElementById('reviewUpd');
  if (!body) return;
  const key = await loadWereadKey();
  if (!key) {
    renderWereadKeySetup(body, refreshRV);
    if (upd) upd.textContent = '';
    return;
  }
  const c = loadCache();
  if (!c || !c.reviews.length) {
    body.innerHTML = `<div class="hot-empty">${error ? '⚠ ' + esc(error) + ' · 点击重试' : '加载中…'}</div>`;
    body.onclick = error ? () => refreshRV() : null;
    if (upd) upd.textContent = error ? '⚠ 失败' : '';
    return;
  }
  body.onclick = null;
  const head = c.bookDeepLink
    ? `<a class="review-book" href="${esc(c.bookDeepLink)}" target="_blank" rel="noopener">《${esc(c.bookTitle)}》· ${c.total} 条书评</a>`
    : `<div class="review-book">《${esc(c.bookTitle)}》· ${c.total} 条书评</div>`;
  const rows = c.reviews
    .map((r) => {
      const star = fmtStar(r.star);
      const content = r.content.length > 80 ? r.content.slice(0, 80) + '…' : r.content;
      return `<div class="review-row"><div class="review-meta"><span class="review-author">${esc(r.author)}</span>${star ? `<span class="review-star">${star}</span>` : ''}</div><div class="review-content">${esc(content)}</div></div>`;
    })
    .join('');
  body.innerHTML = head + rows;
  if (upd) upd.textContent = fmtTime(c.ts);
}

async function refreshRV() {
  if (rvLoading) return;
  if (!document.getElementById('reviewBody')) return;
  const key = await loadWereadKey();
  if (!key) {
    renderRV();
    return;
  }
  rvLoading = true;
  const btn = document.getElementById('reviewRefresh');
  btn?.classList.add('spin');
  try {
    const res = (await chrome.runtime.sendMessage({ type: 'WEREAD_REVIEW_FETCH', apiKey: key })) as
      | { success: boolean; data?: { bookTitle: string; bookDeepLink: string; reviews: RVReview[]; total: number }; error?: string }
      | undefined;
    if (res?.success && res.data) {
      saveCache({
        bookTitle: res.data.bookTitle,
        bookDeepLink: res.data.bookDeepLink,
        reviews: res.data.reviews,
        total: res.data.total,
        ts: Date.now(),
      });
      rvLastFetch = Date.now();
      renderRV();
    } else {
      const err =
        res?.error === 'invalid_key'
          ? 'API Key 无效'
          : res?.error === 'empty_shelf'
            ? '书架无书'
            : res?.error === 'empty'
              ? '暂无书评'
              : '获取失败';
      renderRV(err);
    }
  } catch {
    renderRV('获取失败');
  } finally {
    rvLoading = false;
    btn?.classList.remove('spin');
  }
}

function onRVVis() {
  if (document.visibilityState !== 'visible') return;
  if (Date.now() - rvLastFetch > RV_TTL) refreshRV();
}

export async function initReview() {
  await renderRV();
  document.getElementById('reviewRefresh')?.addEventListener('click', refreshRV);
  if (rvInited) return;
  rvInited = true;
  const key = await loadWereadKey();
  if (key) {
    const c = loadCache();
    if (!c || Date.now() - c.ts > RV_TTL) refreshRV();
  }
  document.addEventListener('visibilitychange', onRVVis);
}
