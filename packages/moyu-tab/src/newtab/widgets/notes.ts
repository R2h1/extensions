import { esc, pad } from '../utils';
import { loadWereadKey, renderWereadKeyPrompt } from './weread-shared';

const NB_CACHE = 'moyu_weread_notes_cache';
const NB_TTL = 60 * 60 * 1000;

interface NBBook {
  bid: string;
  title: string;
  author: string;
  cover: string;
  deepLink: string;
  noteCount: number;
  progress: number;
  finished: boolean;
  sort: number;
}
interface NBCache {
  books: NBBook[];
  totalBooks: number;
  totalNotes: number;
  ts: number;
}

let nbLoading = false;
let nbInited = false;
let nbLastFetch = 0;

export function renderNotesCard(): string {
  return `<div class="widget-card hot-card notes-card">
      <div class="hot-head">
        <div class="hot-title">📝 我的笔记</div>
        <div class="hot-meta">
          <span class="hot-upd" id="notesUpd"></span>
          <button class="hot-swap" id="notesRefresh" title="刷新">↻</button>
        </div>
      </div>
      <div class="hot-list" id="notesList"><div class="hot-empty">加载中…</div></div>
    </div>`;
}

function loadCache(): NBCache | null {
  try {
    const r = localStorage.getItem(NB_CACHE);
    return r ? JSON.parse(r) : null;
  } catch {
    return null;
  }
}
function saveCache(c: NBCache) {
  try {
    localStorage.setItem(NB_CACHE, JSON.stringify(c));
  } catch {}
}
function fmtTime(ts: number) {
  const d = new Date(ts);
  return pad(d.getHours()) + ':' + pad(d.getMinutes());
}

async function renderNB(error?: string) {
  const list = document.getElementById('notesList');
  const upd = document.getElementById('notesUpd');
  if (!list) return;
  const key = await loadWereadKey();
  if (!key) {
    renderWereadKeyPrompt(list, '未设置 API Key');
    if (upd) upd.textContent = '';
    return;
  }
  const c = loadCache();
  if (!c || !c.books.length) {
    if (error === 'API Key 无效') {
      renderWereadKeyPrompt(list, 'API Key 无效');
    } else {
      list.innerHTML = `<div class="hot-empty">${error ? '⚠ ' + esc(error) + ' · 点击重试' : '加载中…'}</div>`;
      list.onclick = error ? () => refreshNB() : null;
    }
    if (upd) upd.textContent = error ? '⚠ 失败' : '';
    return;
  }
  list.onclick = null;
  const books = [...c.books].sort((a, b) => (b.sort || 0) - (a.sort || 0));
  const items = books
    .slice(0, 15)
    .map((b) => {
      const badge = b.finished
        ? '<span class="wr-cover-badge done">读完</span>'
        : b.progress
          ? `<span class="wr-cover-badge progress">${b.progress}%</span>`
          : '';
      const cover = b.cover
        ? `<img src="${esc(b.cover)}" alt="" loading="lazy" referrerpolicy="no-referrer"/>`
        : '<div class="wr-rec-cover-ph">📖</div>';
      const author = b.author
        ? `<span class="wr-rec-author">${esc(b.author)}</span>`
        : '<span></span>';
      const num = b.noteCount ? `<span class="wr-rec-rating">${b.noteCount}条</span>` : '';
      return `<a class="wr-rec-item" href="${esc(b.deepLink)}" target="_blank" rel="noopener" data-bid="${esc(b.bid)}" title="查看笔记详情"><div class="wr-rec-cover">${cover}${badge}</div><div class="wr-rec-title">${esc(b.title)}</div><div class="wr-rec-meta">${author}${num}</div></a>`;
    })
    .join('');
  list.innerHTML = `<div class="weread-total">${c.totalBooks} 本 · ${c.totalNotes} 条笔记</div><div class="wr-rec-grid">${items}</div>`;
  if (upd) upd.textContent = fmtTime(c.ts);
  list.onclick = (e) => {
    const item = (e.target as HTMLElement).closest('.wr-rec-item') as HTMLElement | null;
    if (!item) return;
    e.preventDefault();
    const b = books.find((x) => x.bid === item.dataset.bid);
    if (b) openBookNotes(b);
  };
}

interface NBNoteContent {
  highlights: { markText: string; chapterUid: number; createTime: number }[];
  thoughts: {
    content: string;
    abstract: string;
    chapterUid: number;
    chapterName: string;
    createTime: number;
    star: number;
  }[];
  chapters: { chapterUid: number; title: string }[];
}

/** 下钻：单本书的笔记内容（划线 + 想法/点评，按章节分组） */
async function openBookNotes(b: NBBook) {
  const list = document.getElementById('notesList');
  if (!list) return;
  list.onclick = null;
  list.innerHTML = '<div class="hot-empty">加载中…</div>';
  const key = await loadWereadKey();
  if (!key) {
    renderWereadKeyPrompt(list, '未设置 API Key');
    return;
  }
  try {
    const res = (await chrome.runtime.sendMessage({
      type: 'WEREAD_NOTES_CONTENT_FETCH',
      apiKey: key,
      bookId: b.bid,
    })) as { success: boolean; data?: NBNoteContent; error?: string } | undefined;
    if (res?.success && res.data) {
      renderNotesContent(list, b, res.data);
    } else {
      list.innerHTML = `<div class="hot-empty">${
        res?.error === 'invalid_key' ? 'API Key 无效' : '暂无笔记内容'
      }</div>`;
    }
  } catch {
    list.innerHTML = '<div class="hot-empty">加载失败 · 点击重试</div>';
    list.onclick = () => openBookNotes(b);
  }
}

function renderNotesContent(list: HTMLElement, b: NBBook, d: NBNoteContent) {
  const chMap = new Map<number, string>();
  d.chapters.forEach((c) => chMap.set(c.chapterUid, c.title));
  const uids = new Set<number>();
  d.highlights.forEach((h) => uids.add(h.chapterUid));
  d.thoughts.forEach((t) => uids.add(t.chapterUid));
  const sections = [...uids]
    .sort((a, b2) => a - b2)
    .map((uid) => {
      const title = chMap.get(uid) || (uid ? '第 ' + uid + ' 节' : '未分组');
      const hs = d.highlights.filter((h) => h.chapterUid === uid);
      const ts = d.thoughts.filter((t) => t.chapterUid === uid);
      const hHtml = hs.map((h) => `<div class="wr-note-hl">${esc(h.markText)}</div>`).join('');
      const tHtml = ts
        .map((t) => {
          const abs = t.abstract ? `<div class="wr-note-abs">${esc(t.abstract)}</div>` : '';
          return `<div class="wr-note-th">${abs}<div class="wr-note-th-content">${esc(t.content)}</div></div>`;
        })
        .join('');
      return `<div class="wr-note-chap"><div class="wr-note-chap-title">${esc(title)}</div>${hHtml}${tHtml}</div>`;
    })
    .join('');
  const cover = b.cover
    ? `<img src="${esc(b.cover)}" alt="" loading="lazy" referrerpolicy="no-referrer"/>`
    : '<div class="wr-rec-cover-ph">📖</div>';
  list.innerHTML = `<button class="wr-notes-back" type="button" id="notesBack">‹ 返回</button>
      <div class="wr-notes-head"><div class="wr-rec-cover wr-notes-cover">${cover}</div><div class="wr-notes-info"><div class="wr-notes-title">《${esc(b.title)}》</div><a class="wr-notes-open" href="${esc(b.deepLink)}" target="_blank" rel="noopener">在微信读书打开 ↗</a></div></div>
      <div class="wr-notes-body">${sections || '<div class="hot-empty">暂无笔记内容</div>'}</div>`;
  document.getElementById('notesBack')?.addEventListener('click', () => renderNB());
}

async function refreshNB() {
  if (nbLoading) return;
  if (!document.getElementById('notesList')) return;
  const key = await loadWereadKey();
  if (!key) {
    renderNB();
    return;
  }
  nbLoading = true;
  const btn = document.getElementById('notesRefresh');
  btn?.classList.add('spin');
  try {
    const res = (await chrome.runtime.sendMessage({ type: 'WEREAD_NOTES_FETCH', apiKey: key })) as
      | {
          success: boolean;
          data?: { books: NBBook[]; totalBooks: number; totalNotes: number };
          error?: string;
        }
      | undefined;
    if (res?.success && res.data?.books?.length) {
      saveCache({
        books: res.data.books,
        totalBooks: res.data.totalBooks,
        totalNotes: res.data.totalNotes,
        ts: Date.now(),
      });
      nbLastFetch = Date.now();
      renderNB();
    } else {
      const err = res?.error === 'invalid_key' ? 'API Key 无效' : '获取失败';
      renderNB(err);
    }
  } catch {
    renderNB('获取失败');
  } finally {
    nbLoading = false;
    btn?.classList.remove('spin');
  }
}

function onNBVis() {
  if (document.visibilityState !== 'visible') return;
  if (Date.now() - nbLastFetch > NB_TTL) refreshNB();
}

export async function initNotes() {
  await renderNB();
  document.getElementById('notesRefresh')?.addEventListener('click', refreshNB);
  if (nbInited) return;
  nbInited = true;
  const key = await loadWereadKey();
  if (key) {
    const c = loadCache();
    if (!c || Date.now() - c.ts > NB_TTL) refreshNB();
  }
  document.addEventListener('visibilitychange', onNBVis);
}
