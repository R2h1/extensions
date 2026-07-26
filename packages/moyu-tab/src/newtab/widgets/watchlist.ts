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
  const del = `<button class="mkt-del" data-type="${item.type}" data-code="${esc(item.code)}" title="移除"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/></svg></button>`;
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
function confirmRemove(name: string): Promise<boolean> {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'mo open';
    overlay.innerHTML = `<div class="ms" style="max-width:300px">
      <div class="mh"><span class="mt">移除自选</span></div>
      <div class="modal-content" style="padding:16px 20px 20px">
        <div style="font-size:13px;color:var(--text);margin-bottom:16px;line-height:1.5">确定移除「${esc(name)}」?</div>
        <div style="display:flex;gap:8px">
          <button data-act="cancel" style="flex:1;padding:8px;font-size:13px;border:none;border-radius:var(--radius-xs);background:rgba(0,0,0,0.05);color:var(--text-secondary);cursor:pointer;font-family:inherit">取消</button>
          <button data-act="ok" style="flex:1;padding:8px;font-size:13px;border:none;border-radius:var(--radius-xs);background:#dc2626;color:#fff;cursor:pointer;font-family:inherit;font-weight:600">移除</button>
        </div>
      </div>
    </div>`;
    document.body.appendChild(overlay);
    const done = (ok: boolean) => {
      overlay.remove();
      resolve(ok);
    };
    overlay.querySelector('[data-act=cancel]')!.addEventListener('click', () => done(false));
    overlay.querySelector('[data-act=ok]')!.addEventListener('click', () => done(true));
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) done(false);
    });
  });
}
function paint(error: boolean) {
  const grid = document.getElementById(GRID_ID);
  if (!grid) return;
  if (!items.length) {
    grid.innerHTML = `<div class="mkt-empty">暂无自选 · 点「+ 添加」添加</div>`;
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
      const c0 = loadCache();
      const q0 = type === 'stock' ? c0?.stock?.[code] : c0?.fund?.[code];
      if (!(await confirmRemove(q0?.name || code))) return;
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
function promptAdd(): Promise<string | null> {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'mo open';
    overlay.innerHTML = `<div class="ms" style="max-width:300px">
      <div class="mh"><span class="mt">添加自选</span></div>
      <div class="modal-content" style="padding:16px 20px 20px">
        <input data-act="input" placeholder="股票 sh600519 / 基金 001186" style="width:100%;padding:8px 10px;font-size:13px;border:none;border-radius:var(--radius-xs);background:rgba(0,0,0,0.05);color:var(--text);outline:none;font-family:inherit;box-sizing:border-box" />
        <div data-act="err" style="font-size:11px;color:#dc2626;margin-top:6px;min-height:14px;line-height:1.4"></div>
        <div style="display:flex;gap:8px;margin-top:8px">
          <button data-act="cancel" style="flex:1;padding:8px;font-size:13px;border:none;border-radius:var(--radius-xs);background:rgba(0,0,0,0.05);color:var(--text-secondary);cursor:pointer;font-family:inherit">取消</button>
          <button data-act="ok" style="flex:1;padding:8px;font-size:13px;border:none;border-radius:var(--radius-xs);background:var(--accent);color:#fff;cursor:pointer;font-family:inherit;font-weight:600">添加</button>
        </div>
      </div>
    </div>`;
    document.body.appendChild(overlay);
    const input = overlay.querySelector('[data-act=input]') as HTMLInputElement;
    const errEl = overlay.querySelector('[data-act=err]') as HTMLElement;
    input.focus();
    const done = (val: string | null) => {
      overlay.remove();
      resolve(val);
    };
    const submit = () => {
      const code = input.value.trim();
      if (!code) {
        errEl.textContent = '请输入代码';
        return;
      }
      if (!/^(sh|sz|bj)\d{6}$/.test(code) && !/^\d{5,6}$/.test(code)) {
        errEl.textContent = '格式不对：股票 sh/sz/bj+6位，基金 5-6位数字';
        return;
      }
      done(code);
    };
    overlay.querySelector('[data-act=cancel]')!.addEventListener('click', () => done(null));
    overlay.querySelector('[data-act=ok]')!.addEventListener('click', submit);
    input.addEventListener('keydown', (e) => {
      const k = (e as KeyboardEvent).key;
      if (k === 'Enter') submit();
      else if (k === 'Escape') done(null);
    });
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) done(null);
    });
  });
}
async function add() {
  const code = await promptAdd();
  if (!code) return;
  const type: WType = /^(sh|sz|bj)\d{6}$/.test(code) ? 'stock' : 'fund';
  if (items.some((x) => x.code === code && x.type === type)) return;
  items = [...items, { type, code }];
  await setItems(items);
  paint(false);
  refresh();
}
function bind() {
  document.getElementById('wlAddBtn')?.addEventListener('click', add);
}
export const watchlistTab: MarketTab = {
  id: 'watchlist',
  name: '自选',
  render: () =>
    `<section class="market-section">
      <div class="market-subtitle-row">
        <span class="market-subtitle">自选</span>
        <button class="wl-add-btn" id="wlAddBtn">+ 添加</button>
      </div>
      <div class="mkt-grid mkt-grid-5" id="${GRID_ID}"><div class="mkt-empty">加载中…</div></div>
    </section>`,
  init: async () => {
    await migrate();
    paint(false);
    bind();
  },
  refresh,
};
