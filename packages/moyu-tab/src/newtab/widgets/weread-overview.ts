/** 微信读书概览卡：统计 + 在读 + 推荐(3+更多)。书架/笔记/搜书入口在头部工具栏，全量视图由弹窗承载。 */
import { esc, pad } from '../utils';
import { loadWereadKey, renderWereadKeyPrompt } from './weread-shared';
import { loadCache as loadRD, saveCache as saveRD, type RDStat } from './readdata';
import { loadCache as loadShelf, saveCache as saveShelf, type WRShelfBook } from './weread';
import { loadCache as loadRC, saveCache as saveRC, type RCBook } from './recommend';

const OV_TTL = 60 * 60 * 1000;

/** 微信读书之外的延伸阅读站点（书源 / 阅读视频 / 公共书） */
const EXTRA_READS = [
  { name: '楠悦读', url: 'https://www.nanyuedu.com/', color: '#0ea5e9', letter: '楠' },
  { name: '文书阁', url: 'https://www.wenshuoge.com/', color: '#64748b', letter: '文' },
  { name: 'Topbook', url: 'https://topbook.cc/overview', color: '#ef4444', letter: 'T' },
  { name: 'How To Cook', url: 'https://howtocook.aiursoft.com/', color: '#f59e0b', letter: 'H' },
  { name: 'Z-Library', url: 'https://zlib.2rdh.com/', color: '#6d28d9', letter: 'Z' },
];
function renderExtraReads(): string {
  const chips = EXTRA_READS.map(
    (s) =>
      `<a class="mkt-link-chip" href="${esc(s.url)}" target="_blank" rel="noopener" title="${esc(s.name)}"><span class="mkt-link-letter" style="background:${s.color}">${s.letter}</span><span>${esc(s.name)}</span></a>`,
  ).join('');
  return `<div class="wr-ov-sec">
    <div class="wr-ov-sec-head"><span class="wr-ov-sec-title">延伸阅读</span></div>
    <div class="mkt-link-row">${chips}</div>
  </div>`;
}

let ovLoading = false;
let rcLoading = false;
let ovInited = false;
let ovLastFetch = 0;
// 由 newtab.ts 注入：点入口/查看更多/搜索时打开弹窗
let openModal: (tab: string, query?: string) => void = () => {};
let reviewOpener: (book: {
  bid: string;
  title: string;
  cover: string;
  deepLink: string;
}) => void = () => {};

export function renderWereadOverviewCard(): string {
  return `<div class="widget-card hot-card weread-ov-card">
      <div class="hot-head">
        <div class="hot-title"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 7v14"/><path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z"/></svg>微信读书</div>
        <div class="hot-meta">
          <span class="hot-upd" id="wrOvUpd"></span>
          <button class="hot-swap" data-tab="shelf" type="button" title="我的书架"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m16 6 4 14"/><path d="M12 6v14"/><path d="M8 8v12"/><path d="M4 4v16"/></svg>我的书架</button>
          <button class="hot-swap" data-tab="notes" type="button" title="我的笔记"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 6h4"/><path d="M2 10h4"/><path d="M2 14h4"/><path d="M2 18h4"/><rect width="16" height="20" x="4" y="2" rx="2"/></svg>我的笔记</button>
          <button class="hot-swap" data-tab="search" type="button" title="搜书"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>搜书</button>
          <button class="wr-refresh" id="wrOvRefresh" title="刷新统计">↻</button>
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
  return `<div class="wr-ov-hero"><a class="wr-ov-hero-link" data-bid="${esc(cur.bid)}"${href}><span class="wr-ov-label">${label}</span><span class="wr-ov-book">《${esc(cur.title)}》</span>${author}${tag}</a></div>`;
}

function renderRecommend(books: RCBook[]): string {
  if (!books || !books.length) return '';
  const items = books
    .map((b) => {
      const rating = fmtRating(b.rating);
      const ratingStr = rating ? `<span class="wr-rec-rating">★ ${rating}</span>` : '';
      const cover = b.cover
        ? `<img src="${esc(b.cover)}" alt="" loading="lazy" referrerpolicy="no-referrer"/>`
        : '<div class="wr-rec-cover-ph">📖</div>';
      const author = b.author
        ? `<span class="wr-rec-author">${esc(b.author)}</span>`
        : '<span></span>';
      return `<a class="wr-rec-item" href="${esc(b.deepLink)}" target="_blank" rel="noopener" data-bid="${esc(b.bid)}" title="查看书评"><div class="wr-rec-cover">${cover}</div><div class="wr-rec-title">${esc(b.title)}</div><div class="wr-rec-meta">${author}${ratingStr}</div></a>`;
    })
    .join('');
  return `<div class="wr-ov-sec">
      <div class="wr-ov-sec-head"><span class="wr-ov-sec-title"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/></svg>为你推荐</span><button class="hot-swap" id="wrOvRecSwap" type="button" title="换一换推荐"><span class="wr-rec-swap-ico">↻</span>换一批</button></div>
      <div class="wr-rec-grid wr-rec-grid-5">${items}</div>
    </div>`;
}

async function renderOV(error?: string) {
  const body = document.getElementById('wrOvBody');
  const upd = document.getElementById('wrOvUpd');
  if (!body) return;
  const key = await loadWereadKey();
  if (!key) {
    renderWereadKeyPrompt(body, '未设置 API Key');
    if (upd) upd.textContent = '';
    return;
  }
  const rd = loadRD();
  const shelf = loadShelf();
  const rc = loadRC();
  if (!rd?.stat && !shelf?.books?.length && !rc?.books?.length) {
    if (error === 'API Key 无效') {
      renderWereadKeyPrompt(body, 'API Key 无效');
    } else {
      body.innerHTML = `<div class="hot-empty">${error ? '⚠ ' + esc(error) + ' · 点击重试' : '加载中…'}</div>`;
      body.onclick = error ? () => refreshOV() : null;
    }
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
  const extra = renderExtraReads();
  body.innerHTML = stats + hero + recommend + extra;
  // 在读书名 / 推荐书封 -> 打开该书书评弹窗
  const heroLink = body.querySelector<HTMLElement>('.wr-ov-hero-link');
  heroLink?.addEventListener('click', (e) => {
    e.preventDefault();
    const b = shelf?.books?.find((x) => x.bid === heroLink.dataset.bid);
    if (b) reviewOpener(b);
  });
  body.querySelectorAll<HTMLElement>('.wr-ov-sec .wr-rec-item').forEach((el) =>
    el.addEventListener('click', (e) => {
      e.preventDefault();
      const b = rc?.books?.find((x) => x.bid === el.dataset.bid);
      if (b) reviewOpener(b);
    }),
  );
  document.getElementById('wrOvRecSwap')?.addEventListener('click', refreshRecommend);
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
    const [rdRes, shRes] = (await Promise.all([
      chrome.runtime.sendMessage({ type: 'WEREAD_READDATA_FETCH', apiKey: key }),
      chrome.runtime.sendMessage({ type: 'WEREAD_SHELF_FETCH', apiKey: key }),
    ])) as [
      { success: boolean; data?: RDStat; error?: string } | undefined,
      (
        | { success: boolean; data?: { books: WRShelfBook[]; total: number }; error?: string }
        | undefined
      ),
    ];
    if (rdRes?.success && rdRes.data) saveRD({ stat: rdRes.data, ts: Date.now() });
    if (shRes?.success && shRes.data?.books?.length)
      saveShelf({ books: shRes.data.books, total: shRes.data.total, ts: Date.now() });
    ovLastFetch = Date.now();
    const err =
      rdRes?.error === 'invalid_key' || shRes?.error === 'invalid_key'
        ? 'API Key 无效'
        : !rdRes?.success && !shRes?.success
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

async function refreshRecommend() {
  if (rcLoading) return;
  if (!document.getElementById('wrOvBody')) return;
  const key = await loadWereadKey();
  if (!key) {
    renderOV();
    return;
  }
  rcLoading = true;
  const btn = document.getElementById('wrOvRecSwap');
  btn?.classList.add('spin');
  try {
    const res = (await chrome.runtime.sendMessage({
      type: 'WEREAD_RECOMMEND_FETCH',
      apiKey: key,
    })) as { success: boolean; data?: { books: RCBook[] }; error?: string } | undefined;
    if (res?.success && res.data?.books?.length) {
      saveRC({ books: res.data.books, ts: Date.now() });
    }
    renderOV();
  } catch {
    renderOV();
  } finally {
    rcLoading = false;
    btn?.classList.remove('spin');
  }
}

function onOVVis() {
  if (document.visibilityState !== 'visible') return;
  if (Date.now() - ovLastFetch > OV_TTL) refreshOV();
}

export function refreshWereadOverview() {
  refreshOV();
  refreshRecommend();
}

export async function initWereadOverview(
  opener: (tab: string, query?: string) => void,
  reviewOpenerFn: (book: { bid: string; title: string; cover: string; deepLink: string }) => void,
) {
  openModal = opener;
  reviewOpener = reviewOpenerFn;
  await renderOV();
  document.getElementById('wrOvRefresh')?.addEventListener('click', refreshOV);
  document
    .querySelectorAll<HTMLElement>('.weread-ov-card .hot-head [data-tab]')
    .forEach((b) => b.addEventListener('click', () => openModal(b.dataset.tab!)));
  if (ovInited) return;
  ovInited = true;
  const key = await loadWereadKey();
  if (key) {
    const rd = loadRD();
    const shelf = loadShelf();
    const rc = loadRC();
    const stale = !rd || !shelf || Date.now() - Math.max(rd.ts, shelf.ts) > OV_TTL;
    if (stale) refreshOV();
    if (!rc || Date.now() - rc.ts > OV_TTL) refreshRecommend();
  }
  document.addEventListener('visibilitychange', onOVVis);
}
