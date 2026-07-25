/** 自选 Tab：股票(腾讯) + 基金(fundgz) 混排，自动判型添加/删除，迁移旧 moyu_funds */
import { esc } from '../utils';
import type { MarketTab } from './market';

type WType = 'stock' | 'fund';
interface WatchItem {
  type: WType;
  code: string;
}
interface StockQ {
  name: string;
  current: number;
  prevClose: number;
  change: number;
  changePct: number;
}
interface FundQ {
  name: string;
  dwjz: string;
  gsz: string;
  gszzl: string;
  gztime: string;
}
interface WLCache {
  stock: Record<string, StockQ>;
  fund: Record<string, FundQ>;
  ts: number;
}

const SW = 'moyu_watchlist';
const OLD_FUND = 'moyu_funds';
const CACHE_KEY = 'moyu_watchlist_cache';
const GRID_ID = 'wlGrid';

let items: WatchItem[] = [];

async function getItems(): Promise<WatchItem[]> {
  const r = await chrome.storage.sync.get(SW);
  return (r[SW] as WatchItem[]) ?? [];
}
async function setItems(it: WatchItem[]) {
  await chrome.storage.sync.set({ [SW]: it });
}
/** 首次加载：watchlist 为空且旧 moyu_funds 存在时，把基金代码迁移为 fund 项 */
async function migrate() {
  const cur = await getItems();
  if (cur.length) {
    items = cur;
    return;
  }
  const r = await chrome.storage.sync.get(OLD_FUND);
  const old = r[OLD_FUND] as string[] | undefined;
  if (old && old.length) {
    items = old.map((code) => ({ type: 'fund' as WType, code }));
    await setItems(items);
  } else {
    items = [];
  }
}
function loadCache(): WLCache | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? (JSON.parse(raw) as WLCache) : null;
  } catch {
    return null;
  }
}
function saveCache(c: WLCache) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(c));
  } catch {}
}
function tileCls(pct: number): string {
  if (isNaN(pct) || Math.abs(pct) < 0.001) return 'flat';
  return pct > 0 ? 'up' : 'down';
}
function fmtPrice(v: number): string {
  return v.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmtChange(change: number, pct: number): string {
  const sign = change > 0 ? '+' : '';
  return `${sign}${change.toFixed(2)} ${sign}${pct.toFixed(2)}%`;
}
function fmtPct(pct: number): string {
  const sign = pct > 0 ? '+' : '';
  return `${sign}${pct.toFixed(2)}%`;
}
function renderTile(item: WatchItem, cache: WLCache | null, error: boolean): string {
  const del = `<button class="mkt-del" data-type="${item.type}" data-code="${esc(item.code)}" title="删除">×</button>`;
  if (item.type === 'stock') {
    const q = cache?.stock?.[item.code];
    if (q) {
      const cls = tileCls(q.changePct);
      return `<div class="mkt-tile ${cls}">${del}
        <div class="mkt-name">${esc(q.name || item.code)}</div>
        <div class="mkt-price">${fmtPrice(q.current)}</div>
        <div class="mkt-chg ${cls}">${fmtChange(q.change, q.changePct)}</div>
      </div>`;
    }
  } else {
    const q = cache?.fund?.[item.code];
    if (q) {
      const pct = parseFloat(q.gszzl);
      const cls = tileCls(pct);
      return `<div class="mkt-tile ${cls}">${del}
        <div class="mkt-name">${esc(q.name || item.code)}</div>
        <div class="mkt-price">${esc(q.gsz || '--')}</div>
        <div class="mkt-chg ${cls}">${fmtPct(pct)}</div>
      </div>`;
    }
  }
  return `<div class="mkt-tile flat">${del}
    <div class="mkt-name">${esc(item.code)}</div>
    <div class="mkt-price">--</div>
    <div class="mkt-chg flat">${error ? '⚠ 失败' : '加载中'}</div>
  </div>`;
}
function paint(error: boolean) {
  const grid = document.getElementById(GRID_ID);
  if (!grid) return;
  if (!items.length) {
    grid.innerHTML = `<div class="mkt-empty">暂无自选 · 下方输入代码添加</div>`;
    return;
  }
  const cache = loadCache();
  grid.innerHTML = items.map((it) => renderTile(it, cache, error)).join('');
  grid.querySelectorAll('.mkt-del').forEach((b) =>
    b.addEventListener('click', async (e) => {
      e.stopPropagation();
      const el = b as HTMLElement;
      const code = el.dataset.code!,
        type = el.dataset.type as WType;
      items = items.filter((x) => !(x.code === code && x.type === type));
      await setItems(items);
      const c = loadCache();
      if (c) {
        delete c[type][code];
        saveCache(c);
      }
      paint(false);
    }),
  );
}
async function refresh() {
  if (!document.getElementById(GRID_ID)) return;
  if (!items.length) {
    paint(false);
    return;
  }
  const stockCodes = items.filter((i) => i.type === 'stock').map((i) => i.code);
  const fundCodes = items.filter((i) => i.type === 'fund').map((i) => i.code);
  const cache = loadCache() ?? { stock: {}, fund: {}, ts: 0 };
  let ok = false;
  try {
    if (stockCodes.length) {
      const res = (await chrome.runtime.sendMessage({
        type: 'STOCK_FETCH',
        codes: stockCodes,
      })) as { success: boolean; data?: Record<string, StockQ | null>; error?: string } | undefined;
      if (res?.success && res.data) {
        for (const code of stockCodes) {
          const q = res.data[code];
          if (q) {
            cache.stock[code] = q;
            ok = true;
          }
        }
      }
    }
    if (fundCodes.length) {
      const res = (await chrome.runtime.sendMessage({
        type: 'FUND_FETCH',
        codes: fundCodes,
      })) as { success: boolean; data?: Record<string, FundQ | null>; error?: string } | undefined;
      if (res?.success && res.data) {
        for (const code of fundCodes) {
          const q = res.data[code];
          if (q) {
            cache.fund[code] = q;
            ok = true;
          }
        }
      }
    }
    cache.ts = Date.now();
    saveCache(cache);
    paint(!ok);
  } catch {
    paint(true);
  }
}
async function add() {
  const input = document.getElementById('wlInput') as HTMLInputElement | null;
  if (!input) return;
  const code = input.value.trim();
  let type: WType | null = null;
  if (/^(sh|sz|bj)\d{6}$/.test(code)) type = 'stock';
  else if (/^\d{5,6}$/.test(code)) type = 'fund';
  if (!type) {
    input.classList.add('err');
    setTimeout(() => input.classList.remove('err'), 600);
    return;
  }
  if (items.some((x) => x.code === code && x.type === type)) {
    input.value = '';
    return;
  }
  items = [...items, { type, code }];
  await setItems(items);
  input.value = '';
  paint(false);
  refresh();
}
function bind() {
  document.getElementById('wlAdd')?.addEventListener('click', add);
  document.getElementById('wlInput')?.addEventListener('keydown', (e) => {
    if ((e as KeyboardEvent).key === 'Enter') add();
  });
}
export const watchlistTab: MarketTab = {
  id: 'watchlist',
  name: '自选',
  render: () =>
    `<div class="mkt-grid" id="${GRID_ID}"><div class="mkt-empty">加载中…</div></div>` +
    `<div class="wl-add"><input id="wlInput" placeholder="股票 sh600519 / 基金 001186" /><button id="wlAdd">+</button></div>`,
  init: async () => {
    await migrate();
    paint(false);
    bind();
  },
  refresh,
};
