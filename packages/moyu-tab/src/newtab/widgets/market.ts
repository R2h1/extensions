/** 行情卡编排器：Tab 栏 / 切换 / 统一刷新节奏。各 Tab 实现 MarketTab 接口。 */
import { goldTab } from './gold';
import { stockTab, globalTab } from './quotes';
import { sectorTab } from './sectors';
import { watchlistTab } from './watchlist';

export interface MarketTab {
  id: string;
  name: string;
  render(): string;
  init(): void | Promise<void>;
  refresh(): Promise<void>;
}

const TABS: MarketTab[] = [stockTab, sectorTab, globalTab, goldTab, watchlistTab];
const TAB_KEY = 'moyu_market_tab';
const REFRESH_MS = 60000;

let activeId = TABS[0].id;
const lastRefresh: Record<string, number> = {};
let cadenceStarted = false;

export function renderMarketCard(): string {
  return `<div class="widget-card market-card">
      <div class="market-head">
        <div class="market-title">◆ 行情</div>
        <button class="market-refresh" id="marketRefresh" title="刷新">↻</button>
      </div>
      <div class="market-tabs" id="marketTabs"></div>
      <div class="market-body" id="marketBody"></div>
    </div>`;
}

function renderTabs() {
  const bar = document.getElementById('marketTabs');
  if (!bar) return;
  bar.innerHTML = TABS.map(
    (t) =>
      `<button class="market-tab${t.id === activeId ? ' active' : ''}" data-tab="${t.id}">${t.name}</button>`,
  ).join('');
  bar
    .querySelectorAll('.market-tab')
    .forEach((b) => b.addEventListener('click', () => switchTab((b as HTMLElement).dataset.tab!)));
}

async function switchTab(id: string) {
  const tab = TABS.find((t) => t.id === id);
  if (!tab) return;
  activeId = id;
  localStorage.setItem(TAB_KEY, id);
  renderTabs();
  const body = document.getElementById('marketBody');
  if (body) body.innerHTML = tab.render();
  await tab.init();
  if (!lastRefresh[id] || Date.now() - lastRefresh[id] > REFRESH_MS) {
    void refreshMarket();
  }
}

export async function refreshMarket() {
  const tab = TABS.find((t) => t.id === activeId);
  if (!tab) return;
  const btn = document.getElementById('marketRefresh');
  btn?.classList.add('spin');
  try {
    await tab.refresh();
    lastRefresh[activeId] = Date.now();
  } finally {
    btn?.classList.remove('spin');
  }
}

function onVis() {
  if (document.visibilityState !== 'visible') return;
  if (!lastRefresh[activeId] || Date.now() - lastRefresh[activeId] > REFRESH_MS) {
    void refreshMarket();
  }
}

export async function initMarket() {
  const saved = localStorage.getItem(TAB_KEY);
  if (saved && TABS.some((t) => t.id === saved)) activeId = saved;
  renderTabs();
  document.getElementById('marketRefresh')?.addEventListener('click', refreshMarket);
  await switchTab(activeId);
  if (!cadenceStarted) {
    cadenceStarted = true;
    setInterval(() => {
      if (document.visibilityState === 'visible') void refreshMarket();
    }, REFRESH_MS);
    document.addEventListener('visibilitychange', onVis);
  }
}
