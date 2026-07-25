/** 行业 Tab：东财行业板块涨跌幅排行，小卡片网格 + 红涨绿跌 */
import { esc } from '../utils';
import type { MarketTab } from './market';

interface SectorQuote {
  name: string;
  changePct: number;
  price: number;
  leader: string;
  leaderPrice: number;
}
interface SectorCache {
  items: SectorQuote[];
  ts: number;
}

const CACHE_KEY = 'moyu_sector_cache';
const GRID_ID = 'sectorGrid';

function loadCache(): SectorCache | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? (JSON.parse(raw) as SectorCache) : null;
  } catch {
    return null;
  }
}
function saveCache(c: SectorCache) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(c));
  } catch {}
}
function tileCls(pct: number): string {
  if (Math.abs(pct) < 0.01) return 'flat';
  return pct > 0 ? 'up' : 'down';
}
function fmtPct(pct: number): string {
  const sign = pct > 0 ? '+' : '';
  return `${sign}${pct.toFixed(2)}%`;
}
function paint(error: boolean) {
  const grid = document.getElementById(GRID_ID);
  if (!grid) return;
  const cache = loadCache();
  if (!cache?.items?.length) {
    grid.innerHTML = `<div class="mkt-empty">${error ? '⚠ 获取失败 · 点刷新重试' : '加载中…'}</div>`;
    return;
  }
  grid.innerHTML = cache.items
    .map((it) => {
      const cls = tileCls(it.changePct);
      return `<div class="mkt-tile ${cls}">
        <div class="mkt-name">${esc(it.name)}</div>
        <div class="mkt-price">${fmtPct(it.changePct)}</div>
        <div class="mkt-leader">${esc(it.leader || '-')}</div>
      </div>`;
    })
    .join('');
}
async function refresh() {
  if (!document.getElementById(GRID_ID)) return;
  try {
    const res = (await chrome.runtime.sendMessage({ type: 'SECTOR_FETCH' })) as
      | { success: boolean; data?: SectorQuote[]; error?: string }
      | undefined;
    if (!res?.success || !res.data) throw new Error(res?.error || 'fetch failed');
    saveCache({ items: res.data, ts: Date.now() });
    paint(false);
  } catch {
    paint(true);
  }
}
export const sectorTab: MarketTab = {
  id: 'sector',
  name: '行业',
  render: () => `<div class="mkt-grid" id="${GRID_ID}"><div class="mkt-empty">加载中…</div></div>`,
  init: () => paint(false),
  refresh,
};
