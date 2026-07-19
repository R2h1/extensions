import { esc, pad } from '../utils';
import { loadWereadKey, renderWereadKeySetup } from './weread-shared';

const NB_CACHE = 'moyu_weread_notes_cache';
const NB_TTL = 60 * 60 * 1000;

interface NBBook {
  bid: string;
  title: string;
  author: string;
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
    renderWereadKeySetup(list, refreshNB);
    if (upd) upd.textContent = '';
    return;
  }
  const c = loadCache();
  if (!c || !c.books.length) {
    list.innerHTML = `<div class="hot-empty">${error ? '⚠ ' + esc(error) + ' · 点击重试' : '加载中…'}</div>`;
    list.onclick = error ? () => refreshNB() : null;
    if (upd) upd.textContent = error ? '⚠ 失败' : '';
    return;
  }
  list.onclick = null;
  const books = [...c.books].sort((a, b) => (b.sort || 0) - (a.sort || 0));
  const rows = books
    .slice(0, 15)
    .map((b) => {
      const author = b.author ? ` <span class="weread-author">· ${esc(b.author)}</span>` : '';
      const num = b.noteCount ? `<span class="hot-num">${b.noteCount}条</span>` : '';
      const prog = b.finished
        ? '<span class="weread-tag done">读完</span>'
        : b.progress
          ? `<span class="notes-prog">${b.progress}%</span>`
          : '';
      return `<a class="hot-row" href="${esc(b.deepLink)}" target="_blank" rel="noopener"><span class="hot-title">${esc(b.title)}${author}</span>${num}${prog}</a>`;
    })
    .join('');
  list.innerHTML = `<div class="weread-total">${c.totalBooks} 本 · ${c.totalNotes} 条笔记</div>${rows}`;
  if (upd) upd.textContent = fmtTime(c.ts);
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
      | { success: boolean; data?: { books: NBBook[]; totalBooks: number; totalNotes: number }; error?: string }
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
