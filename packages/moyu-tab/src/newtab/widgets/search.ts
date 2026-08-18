import { esc } from '../utils';
import { loadWereadKey, renderWereadKeyPrompt } from './weread-shared';

interface SRBook {
  bid: string;
  title: string;
  author: string;
  cover: string;
  rating: number;
  deepLink: string;
}

let srInited = false;
let srLoading = false;

export function renderSearchCard(): string {
  return `<div class="widget-card hot-card search-card">
      <div class="hot-head">
        <div class="hot-title">🔍 搜书</div>
        <div class="hot-meta"><span class="hot-upd" id="searchUpd"></span></div>
      </div>
      <div class="search-box">
        <input id="searchInput" class="search-input" type="text" placeholder="搜索书名 / 作者" autocomplete="off" />
        <button id="searchBtn" class="weread-key-btn">搜索</button>
      </div>
      <div class="hot-list" id="searchList"><div class="hot-empty">输入关键词开始搜索</div></div>
    </div>`;
}

async function doSearch() {
  if (srLoading) return;
  const inp = document.getElementById('searchInput') as HTMLInputElement | null;
  const list = document.getElementById('searchList');
  const upd = document.getElementById('searchUpd');
  if (!inp || !list) return;
  const kw = inp.value.trim();
  if (!kw) return;
  srLoading = true;
  list.onclick = null;
  list.innerHTML = '<div class="hot-empty">搜索中…</div>';
  try {
    const key = await loadWereadKey();
    const res = (await chrome.runtime.sendMessage({
      type: 'WEREAD_SEARCH_FETCH',
      apiKey: key,
      keyword: kw,
    })) as { success: boolean; data?: { books: SRBook[] }; error?: string } | undefined;
    if (res?.success && res.data?.books?.length) {
      list.innerHTML = `<div class="wr-rec-grid">${res.data.books
        .map((b) => {
          const rating = b.rating ? (b.rating / 10).toFixed(1) : '';
          const ratingStr = rating ? `<span class="wr-rec-rating">★ ${rating}</span>` : '';
          const cover = b.cover
            ? `<img src="${esc(b.cover)}" alt="" loading="lazy" referrerpolicy="no-referrer"/>`
            : '<div class="wr-rec-cover-ph">📖</div>';
          const author = b.author
            ? `<span class="wr-rec-author">${esc(b.author)}</span>`
            : '<span></span>';
          return `<a class="wr-rec-item" href="${esc(b.deepLink)}" target="_blank" rel="noopener"><div class="wr-rec-cover">${cover}</div><div class="wr-rec-title">${esc(b.title)}</div><div class="wr-rec-meta">${author}${ratingStr}</div></a>`;
        })
        .join('')}</div>`;
      if (upd) upd.textContent = `${res.data.books.length} 本`;
    } else if (res?.error === 'invalid_key') {
      renderWereadKeyPrompt(list, 'API Key 无效');
      if (upd) upd.textContent = '';
    } else {
      list.innerHTML = '<div class="hot-empty">无搜索结果</div>';
      if (upd) upd.textContent = '';
    }
  } catch {
    list.innerHTML = '<div class="hot-empty">搜索失败 · 点击重试</div>';
    list.onclick = () => {
      list.onclick = null;
      doSearch();
    };
    if (upd) upd.textContent = '';
  } finally {
    srLoading = false;
  }
}

export async function initSearch(initialQuery?: string) {
  const list = document.getElementById('searchList');
  const key = await loadWereadKey();
  if (!key) {
    if (list) renderWereadKeyPrompt(list, '未设置 API Key');
    return;
  }
  const inp = document.getElementById('searchInput') as HTMLInputElement | null;
  document.getElementById('searchBtn')?.addEventListener('click', doSearch);
  inp?.addEventListener('keydown', (e) => {
    if ((e as KeyboardEvent).key === 'Enter') doSearch();
  });
  if (initialQuery && inp) {
    inp.value = initialQuery;
    doSearch();
  }
  if (srInited) return;
  srInited = true;
}
