/** 书签同步：chrome.bookmarks 读取，书签栏图标网格 + 跨全部书签搜索，实时同步 */
import { esc } from '../utils';

const BM_BAR_ID = '1';
type Node = chrome.bookmarks.BookmarkTreeNode;

let bmTree: Node[] = []; // 顶层 = [书签栏, 其他书签]
let bmCurrentFolder = BM_BAR_ID;
let bmQuery = '';
let bmInited = false;

export function renderBookmarksCard(): string {
  return `<div class="widget-card bm-card">
      <div class="bm-head">
        <div class="bm-title">🔖 书签</div>
        <input class="bm-search" id="bmSearch" type="search" placeholder="搜索书签…" autocomplete="off" />
      </div>
      <div class="bm-bar" id="bmBar"></div>
      <div class="bm-grid" id="bmGrid"><div class="bm-empty">加载中…</div></div>
    </div>`;
}

// 本地 favicon：favicon 权限 + _favicon 资源，走浏览器缓存，无网络/不被墙
function favUrl(url: string): string {
  return chrome.runtime.getURL('_favicon/?pageUrl=' + encodeURIComponent(url) + '&size=32');
}
function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}
function letterColor(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 360;
  return `hsl(${h},55%,55%)`;
}
function firstChar(url: string): string {
  return (hostOf(url).charAt(0) || '?').toUpperCase();
}
function trunc(s: string, n: number): string {
  return s.length > n ? s.slice(0, n) + '…' : s;
}

function findFolder(id: string, nodes: Node[] = bmTree): Node | null {
  for (const n of nodes) {
    if (n.id === id) return n;
    if (n.children) {
      const f = findFolder(id, n.children);
      if (f) return f;
    }
  }
  return null;
}

interface FlatBm {
  title: string;
  url: string;
  path: string;
}
function flatten(nodes: Node[], path: string, out: FlatBm[]) {
  for (const n of nodes) {
    if (n.url) {
      out.push({ title: n.title || hostOf(n.url), url: n.url, path });
    } else if (n.children) {
      const p = path ? path + ' / ' + (n.title || '') : n.title || '';
      flatten(n.children, p, out);
    }
  }
}

/** 图标加载失败 -> 首字母色块兜底 */
function bindFavFallback(scope: ParentNode) {
  scope.querySelectorAll('img.bm-fav, img.bm-fav-sm').forEach((img) => {
    const el = img as HTMLImageElement;
    if (el.dataset.bound) return;
    el.dataset.bound = '1';
    el.onerror = () => {
      const isSm = el.classList.contains('bm-fav-sm');
      const span = document.createElement('span');
      span.className = isSm ? 'bm-letter-sm' : 'bm-letter';
      span.style.background = el.dataset.color || '#999';
      span.textContent = el.dataset.letter || '?';
      el.replaceWith(span);
    };
  });
}

function renderGrid() {
  const grid = document.getElementById('bmGrid');
  const bar = document.getElementById('bmBar');
  if (!grid) return;
  const folder = findFolder(bmCurrentFolder);
  const items = folder?.children ?? [];
  if (bar) {
    if (bmCurrentFolder !== BM_BAR_ID && folder?.parentId && folder.parentId !== '0') {
      bar.innerHTML = `<button class="bm-back" id="bmBack" title="返回">‹</button><span class="bm-crumbs">${esc(folder.title || '')}</span>`;
      document.getElementById('bmBack')?.addEventListener('click', () => {
        bmCurrentFolder = folder.parentId!;
        render();
      });
    } else {
      bar.innerHTML = `<span class="bm-crumbs">书签栏</span>`;
    }
  }
  grid.className = 'bm-grid';
  if (!items.length) {
    grid.innerHTML = `<div class="bm-empty">该文件夹为空</div>`;
    return;
  }
  grid.innerHTML = items
    .map((n) => {
      if (n.children) {
        return `<button class="bm-tile bm-folder" data-id="${n.id}" title="${esc(n.title || '')}">
          <span class="bm-fav bm-ico">📁</span>
          <span class="bm-name">${esc(trunc(n.title || '文件夹', 6))}</span>
        </button>`;
      }
      const url = n.url || '';
      return `<a class="bm-tile" href="${esc(url)}" target="_blank" rel="noopener" title="${esc(n.title || '')}">
          <img class="bm-fav" src="${favUrl(url)}" data-letter="${esc(firstChar(url))}" data-color="${letterColor(url)}" alt="" />
          <span class="bm-name">${esc(trunc(n.title || hostOf(url), 6))}</span>
        </a>`;
    })
    .join('');
  bindFavFallback(grid);
  grid.querySelectorAll('.bm-folder').forEach((b) =>
    b.addEventListener('click', () => {
      bmCurrentFolder = (b as HTMLElement).dataset.id!;
      render();
    }),
  );
}

function renderSearch() {
  const grid = document.getElementById('bmGrid');
  const bar = document.getElementById('bmBar');
  if (!grid) return;
  if (bar) bar.innerHTML = `<span class="bm-crumbs">搜索 “${esc(bmQuery)}”</span>`;
  const all: FlatBm[] = [];
  flatten(bmTree, '', all);
  const q = bmQuery.trim().toLowerCase();
  const matched = all
    .filter((b) => b.title.toLowerCase().includes(q) || b.url.toLowerCase().includes(q))
    .slice(0, 30);
  grid.className = 'bm-list';
  if (!matched.length) {
    grid.innerHTML = `<div class="bm-empty">无匹配书签</div>`;
    return;
  }
  grid.innerHTML = matched
    .map(
      (
        b,
      ) => `<a class="bm-row" href="${esc(b.url)}" target="_blank" rel="noopener" title="${esc(b.title)}">
        <img class="bm-fav-sm" src="${favUrl(b.url)}" data-letter="${esc(firstChar(b.url))}" data-color="${letterColor(b.url)}" alt="" />
        <span class="bm-row-main"><span class="bm-row-title">${esc(trunc(b.title, 30))}</span><span class="bm-row-path">${esc(b.path || '书签栏')}</span></span>
      </a>`,
    )
    .join('');
  bindFavFallback(grid);
}

function render() {
  if (bmQuery.trim()) renderSearch();
  else renderGrid();
}

function reload() {
  chrome.bookmarks.getTree().then((tree) => {
    bmTree = tree[0]?.children ?? [];
    render();
  });
}

function bindSync() {
  // 书签增删改移即时重渲染
  const rerender = () => reload();
  chrome.bookmarks.onCreated.addListener(rerender);
  chrome.bookmarks.onRemoved.addListener(rerender);
  chrome.bookmarks.onChanged.addListener(rerender);
  chrome.bookmarks.onMoved.addListener(rerender);
}

export async function initBookmarks() {
  const search = document.getElementById('bmSearch') as HTMLInputElement | null;
  if (search) {
    search.value = bmQuery;
    search.addEventListener('input', () => {
      bmQuery = search.value;
      render();
    });
  }
  if (!bmInited) {
    bmInited = true;
    bindSync();
  }
  const tree = await chrome.bookmarks.getTree();
  bmTree = tree[0]?.children ?? [];
  render();
}
