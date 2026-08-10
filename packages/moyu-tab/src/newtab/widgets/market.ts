/** 行情卡编排器：A股/行业/全球 tab 切换 + 自选常驻，统一刷新节奏。各分区实现 MarketTab 接口。 */
import { stockTab, globalTab } from './quotes';
import { sectorTab } from './sectors';
import { watchlistTab } from './watchlist';
import { esc, escAttr } from '../utils';

/** 研报/数据参考站：看行情时顺手查研报、评级、估值 */
const RESEARCH_LINKS = [
  { name: '行行查', url: 'https://www.hanghangcha.com/', color: '#0ea5e9', letter: '行' },
  {
    name: '晨星网',
    url: 'https://www.morningstar.cn/main/default.aspx',
    color: '#d97706',
    letter: '晨',
  },
  { name: '洞见研报', url: 'https://www.djyanbao.com/index', color: '#059669', letter: '洞' },
  {
    name: '蛋卷指数',
    url: 'https://danjuanapp.com/index-detail/SH000016',
    color: '#ef4444',
    letter: '蛋',
  },
];
function researchRow(): string {
  const chips = RESEARCH_LINKS.map(
    (s) =>
      `<a class="mkt-link-chip" href="${escAttr(s.url)}" target="_blank" rel="noopener" title="${escAttr(s.name)}"><span class="mkt-link-letter" style="background:${s.color}">${s.letter}</span><span>${esc(s.name)}</span></a>`,
  ).join('');
  return `<section class="market-section mkt-links-sec">
    <div class="market-subtitle-row"><span class="market-subtitle">研报 · 数据</span></div>
    <div class="mkt-link-row">${chips}</div>
  </section>`;
}

export interface MarketTab {
  id: string;
  name: string;
  render(): string;
  init(): void | Promise<void>;
  refresh(): Promise<void>;
}

const TABS: MarketTab[] = [stockTab, sectorTab, globalTab];
const TAB_KEY = 'moyu_market_tab';
const REFRESH_MS = 60000;

let activeId = TABS[0].id;
let lastRefresh = 0;
let cadenceStarted = false;

export function renderMarketCard(): string {
  return `<div class="widget-card market-card">
      <div class="market-head">
        <div class="market-title"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="7" y1="4" x2="7" y2="20"/><rect x="5" y="8" width="4" height="6" rx="1"/><line x1="17" y1="4" x2="17" y2="20"/><rect x="15" y="11" width="4" height="5" rx="1"/></svg>行情</div>
        <button class="market-refresh" id="marketRefresh" title="刷新">↻</button>
      </div>
      <div class="market-tabs" id="marketTabs"></div>
      <div class="market-body" id="marketBody"></div>
      ${watchlistTab.render()}
      ${researchRow()}
    </div>`;
}

function activeTab(): MarketTab {
  return TABS.find((t) => t.id === activeId) ?? TABS[0];
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
  void refreshMarket();
}

export async function refreshMarket() {
  const btn = document.getElementById('marketRefresh');
  btn?.classList.add('spin');
  try {
    await Promise.all([activeTab().refresh(), watchlistTab.refresh()]);
    lastRefresh = Date.now();
  } finally {
    btn?.classList.remove('spin');
  }
}

function onVis() {
  if (document.visibilityState !== 'visible') return;
  if (!lastRefresh || Date.now() - lastRefresh > REFRESH_MS) {
    void refreshMarket();
  }
}

export async function initMarket() {
  const saved = localStorage.getItem(TAB_KEY);
  if (saved && TABS.some((t) => t.id === saved)) activeId = saved;
  renderTabs();
  const tab = activeTab();
  const body = document.getElementById('marketBody');
  if (body) body.innerHTML = tab.render();
  await Promise.all([tab.init(), watchlistTab.init()]);
  document.getElementById('marketRefresh')?.addEventListener('click', refreshMarket);
  void refreshMarket();
  if (!cadenceStarted) {
    cadenceStarted = true;
    setInterval(() => {
      if (document.visibilityState === 'visible') void refreshMarket();
    }, REFRESH_MS);
    document.addEventListener('visibilitychange', onVis);
  }
}
