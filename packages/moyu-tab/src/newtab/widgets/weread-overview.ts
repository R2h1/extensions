/** 微信读书概览卡：统计 + 在读 + 推荐(3+更多) + 搜书 + 书架/笔记/书评入口。全量视图由弹窗承载。 */
import { esc, pad } from '../utils';
import { loadWereadKey, renderWereadKeySetup } from './weread-shared';
import { loadCache as loadRD, saveCache as saveRD, type RDStat } from './readdata';
import { loadCache as loadShelf, saveCache as saveShelf, type WRShelfBook } from './weread';
import { loadCache as loadRC, saveCache as saveRC, type RCBook } from './recommend';

const OV_TTL = 60 * 60 * 1000;

const CHIPS = [
  { id: 'shelf', name: '书架' },
  { id: 'notes', name: '笔记' },
  { id: 'review', name: '书评' },
];

let ovLoading = false;
let ovInited = false;
let ovLastFetch = 0;
// 由 newtab.ts 注入：点入口/查看更多/搜索时打开弹窗
let openModal: (tab: string, query?: string) => void = () => {};

export function renderWereadOverviewCard(): string {
  return `<div class="widget-card hot-card weread-ov-card">
      <div class="hot-head">
        <div class="hot-title">📚 微信读书</div>
        <div class="hot-meta">
          <span class="hot-upd" id="wrOvUpd"></span>
          <button class="hot-swap" id="wrOvRefresh" title="刷新">↻</button>
        </div>
      </div>
      <div class="weread-ov-body" id="wrOvBody"><div class="hot-empty">加载中…</div></div>
    </div>`;
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
function fmtRating(r: number) {
  return r ? (r / 10).toFixed(1) : '';
}

function renderHero(books: WRShelfBook[]): string {
  if (!books || !books.length) return '';
  const sorted = [...books].sort((a, b) => {
    if (a.isTop !== b.isTop) return a.isTop ? -1 : 1;
    return (b.readUpdateTime || 0) - (a.readUpdateTime || 0);
  });
  const cur = sorted.find((b) => !b.finished) || sorted[0];
  const label = cur.finished ? '最近' : '在读';
  const author = cur.author ? `<span class="wr-ov-author">· ${esc(cur.author)}</span>` : '';
  const tag = cur.finished ? '<span class="weread-tag done">读完</span>' : '';
  const href = cur.deepLink ? ` href="${esc(cur.deepLink)}" target="_blank" rel="noopener"` : '';
  return `<a class="wr-ov-hero"${href}><span class="wr-ov-label">${label}</span><span class="wr-ov-book">《${esc(cur.title)}》</span>${author}${tag}</a>`;
}

function renderRecommend(books: RCBook[]): string {
  if (!books || !books.length) return '';
  const rows = books
    .slice(0, 3)
    .map((b, i) => {
      const rank = i + 1;
      const top = rank <= 3 ? ' top' : '';
      const author = b.author ? ` <span class="wr-ov-author">· ${esc(b.author)}</span>` : '';
      const rating = fmtRating(b.rating);
      const num = rating ? `<span class="hot-num">${rating}</span>` : '';
      const reason = b.reason ? ` title="${esc(b.reason)}"` : '';
      return `<a class="hot-row" href="${esc(b.deepLink)}" target="_blank" rel="noopener"${reason}><span class="hot-rank${top}">${rank}</span><span class="hot-title">${esc(b.title)}${author}</span>${num}</a>`;
    })
    .join('');
  return `<div class="wr-ov-sec">
      <div class="wr-ov-sec-head"><span class="wr-ov-sec-title">💡 推荐</span><button class="wr-ov-more" data-tab="recommend" type="button">查看更多 ›</button></div>
      ${rows}
    </div>`;
}

function renderSearch(): string {
  return `<div class="search-box"><input id="wrOvSearchInput" class="search-input" type="text" placeholder="搜索书名 / 作者" autocomplete="off" /><button id="wrOvSearchBtn" class="weread-key-btn" type="button">搜索</button></div>`;
}

function renderChips(): string {
  return `<div class="wr-ov-chips">${CHIPS.map((c) => `<button class="wr-ov-chip" data-tab="${c.id}" type="button">${c.name}</button>`).join('')}</div>`;
}

async function renderOV(error?: string) {
  const body = document.getElementById('wrOvBody');
  const upd = document.getElementById('wrOvUpd');
  if (!body) return;
  const key = await loadWereadKey();
  if (!key) {
    renderWereadKeySetup(body, refreshOV);
    if (upd) upd.textContent = '';
    return;
  }
  const rd = loadRD();
  const shelf = loadShelf();
  const rc = loadRC();
  if (!rd?.stat && !shelf?.books?.length && !rc?.books?.length) {
    body.innerHTML = `<div class="hot-empty">${error ? '⚠ ' + esc(error) + ' · 点击重试' : '加载中…'}</div>`;
    body.onclick = error ? () => refreshOV() : null;
    if (upd) upd.textContent = error ? '⚠ 失败' : '';
    return;
  }
  body.onclick = null;
  const s = rd?.stat;
  const stats = s
    ? `<div class="readdata-stats">
        <div class="readdata-stat"><div class="readdata-stat-val">${fmtDuration(s.totalReadTime)}</div><div class="readdata-stat-label">本月时长</div></div>
        <div class="readdata-stat"><div class="readdata-stat-val">${s.readDays}</div><div class="readdata-stat-label">阅读天数</div></div>
        <div class="readdata-stat"><div class="readdata-stat-val">${fmtDuration(s.dayAverageReadTime)}</div><div class="readdata-stat-label">日均</div></div>
      </div>`
    : '<div class="hot-empty" style="padding:6px 0">暂无统计数据</div>';
  const hero = shelf?.books?.length ? renderHero(shelf.books) : '';
  const recommend = rc?.books?.length ? renderRecommend(rc.books) : '';
  body.innerHTML = stats + hero + recommend + renderSearch() + renderChips();
  // 入口 chip + 推荐查看更多 -> 打开弹窗对应 tab
  body.querySelectorAll<HTMLElement>('[data-tab]').forEach((b) =>
    b.addEventListener('click', () => openModal(b.dataset.tab!)),
  );
  // 搜索框 -> 打开弹窗搜书 tab 并预填 query 自动搜
  const searchInput = body.querySelector<HTMLInputElement>('#wrOvSearchInput');
  const submitSearch = () => {
    const q = searchInput?.value.trim();
    if (q) openModal('search', q);
  };
  body.querySelector('#wrOvSearchBtn')?.addEventListener('click', submitSearch);
  searchInput?.addEventListener('keydown', (e) => {
    if ((e as KeyboardEvent).key === 'Enter') submitSearch();
  });
  const ts = Math.max(rd?.ts || 0, shelf?.ts || 0, rc?.ts || 0);
  if (upd && ts) upd.textContent = fmtTime(ts);
}

async function refreshOV() {
  if (ovLoading) return;
  if (!document.getElementById('wrOvBody')) return;
  const key = await loadWereadKey();
  if (!key) {
    renderOV();
    return;
  }
  ovLoading = true;
  const btn = document.getElementById('wrOvRefresh');
  btn?.classList.add('spin');
  try {
    const [rdRes, shRes, rcRes] = (await Promise.all([
      chrome.runtime.sendMessage({ type: 'WEREAD_READDATA_FETCH', apiKey: key }),
      chrome.runtime.sendMessage({ type: 'WEREAD_SHELF_FETCH', apiKey: key }),
      chrome.runtime.sendMessage({ type: 'WEREAD_RECOMMEND_FETCH', apiKey: key }),
    ])) as [
      | { success: boolean; data?: RDStat; error?: string }
      | undefined,
      | { success: boolean; data?: { books: WRShelfBook[]; total: number }; error?: string }
      | undefined,
      | { success: boolean; data?: { books: RCBook[] }; error?: string }
      | undefined,
    ];
    if (rdRes?.success && rdRes.data) saveRD({ stat: rdRes.data, ts: Date.now() });
    if (shRes?.success && shRes.data?.books?.length)
      saveShelf({ books: shRes.data.books, total: shRes.data.total, ts: Date.now() });
    if (rcRes?.success && rcRes.data?.books?.length) saveRC({ books: rcRes.data.books, ts: Date.now() });
    ovLastFetch = Date.now();
    const err =
      rdRes?.error === 'invalid_key' || shRes?.error === 'invalid_key' || rcRes?.error === 'invalid_key'
        ? 'API Key 无效'
        : !rdRes?.success && !shRes?.success && !rcRes?.success
          ? '获取失败'
          : undefined;
    renderOV(err);
  } catch {
    renderOV('获取失败');
  } finally {
    ovLoading = false;
    btn?.classList.remove('spin');
  }
}

function onOVVis() {
  if (document.visibilityState !== 'visible') return;
  if (Date.now() - ovLastFetch > OV_TTL) refreshOV();
}

export async function initWereadOverview(opener: (tab: string, query?: string) => void) {
  openModal = opener;
  await renderOV();
  document.getElementById('wrOvRefresh')?.addEventListener('click', refreshOV);
  if (ovInited) return;
  ovInited = true;
  const key = await loadWereadKey();
  if (key) {
    const rd = loadRD();
    const shelf = loadShelf();
    const rc = loadRC();
    const stale = !rd || !shelf || !rc || Date.now() - Math.max(rd.ts, shelf.ts, rc.ts) > OV_TTL;
    if (stale) refreshOV();
  }
  document.addEventListener('visibilitychange', onOVVis);
}
