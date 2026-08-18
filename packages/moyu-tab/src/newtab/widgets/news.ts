/** 资讯卡：AI资讯 / 知乎日报 / 7x24快讯 合并为单卡片，Tab 切换 */
import { initAihot, refreshAH, swapAHPage } from './aihot';
import { initZhihu, refreshZH } from './zhihu';
import { initSinaFlash, refreshSF } from './sina-flash';

interface NewsSource {
  id: string;
  name: string;
  pane: string; // 列表元素 id（各源渲染到自己的 pane，仅激活的显示）
  init: () => void;
  refresh: () => Promise<void> | void;
  hasSwap: boolean; // 是否有「换一换」分页
}
const NEWS_SOURCES: NewsSource[] = [
  {
    id: 'aihot',
    name: 'AI精选',
    pane: 'aihotList',
    init: initAihot,
    refresh: refreshAH,
    hasSwap: true,
  },
  {
    id: 'zhihu',
    name: '知乎日报',
    pane: 'zhihuList',
    init: initZhihu,
    refresh: refreshZH,
    hasSwap: false,
  },
  {
    id: 'sina',
    name: '财经快讯',
    pane: 'sinaList',
    init: initSinaFlash,
    refresh: refreshSF,
    hasSwap: false,
  },
];

let newsActive = NEWS_SOURCES[0].id;

export function renderNewsCard(): string {
  const tabs = NEWS_SOURCES.map(
    (s) =>
      `<button class="hot-tab${s.id === newsActive ? ' active' : ''}" data-source="${s.id}">${s.name}</button>`,
  ).join('');
  const panes = NEWS_SOURCES.map(
    (s) =>
      `<div class="news-pane${s.id === newsActive ? ' active' : ''}" id="${s.pane}"><div class="hot-empty">加载中…</div></div>`,
  ).join('');
  const swapHidden = !NEWS_SOURCES.find((s) => s.id === newsActive)?.hasSwap;
  return `<div class="widget-card news-card">
      <div class="hot-head">
        <div class="hot-tabs">${tabs}</div>
        <div class="hot-meta">
          <button class="hot-refresh" id="newsRefresh" title="刷新">↻</button>
          <button class="hot-swap" id="newsSwap" title="换一换"${swapHidden ? ' style="display:none"' : ''}>换一换 <i id="newsPage">1/5</i></button>
        </div>
      </div>
      <div class="news-list">${panes}</div>
    </div>`;
}

function switchNews(id: string) {
  if (id === newsActive) return;
  newsActive = id;
  const src = NEWS_SOURCES.find((s) => s.id === id);
  document
    .querySelectorAll('.hot-tab[data-source]')
    .forEach((t) => t.classList.toggle('active', (t as HTMLElement).dataset.source === id));
  document
    .querySelectorAll('.news-pane')
    .forEach((p) => p.classList.toggle('active', (p as HTMLElement).id === src?.pane));
  const swap = document.getElementById('newsSwap');
  if (swap) swap.style.display = src?.hasSwap ? '' : 'none';
}

async function refreshActive() {
  const src = NEWS_SOURCES.find((s) => s.id === newsActive);
  if (!src) return;
  const btn = document.getElementById('newsRefresh');
  btn?.classList.add('spin');
  try {
    await src.refresh();
  } finally {
    btn?.classList.remove('spin');
  }
}

export async function initNewsCard() {
  document.getElementById('newsRefresh')?.addEventListener('click', refreshActive);
  document.getElementById('newsSwap')?.addEventListener('click', () => {
    if (newsActive === 'aihot') swapAHPage();
  });
  document
    .querySelectorAll('.hot-tab[data-source]')
    .forEach((t) =>
      t.addEventListener('click', () => switchNews((t as HTMLElement).dataset.source!)),
    );
  // 各源均初始化（拉取 + 定时刷新 + 可见性补刷），保证切 Tab 即有数据
  NEWS_SOURCES.forEach((s) => s.init());
}
