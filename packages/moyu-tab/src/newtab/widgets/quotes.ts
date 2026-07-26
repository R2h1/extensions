/** A股 / 全球 指数 Tab：东财 qt/stock/get 拉取，小卡片网格 + 红涨绿跌 */
import { esc } from '../utils';
import type { MarketTab } from './market';

interface StockQuote {
  name: string;
  current: number;
  prevClose: number;
  change: number;
  changePct: number;
}
interface StockCache {
  quotes: Record<string, StockQuote>;
  ts: number;
}

interface QuoteCode {
  code: string;
  name: string;
  cnyCode?: string; // 附带人民币计价 secid（黄金：美元/盎司 + 人民币/克）
}
const STOCK_CODES: QuoteCode[] = [
  { code: 'sh000001', name: '上证指数' },
  { code: 'sz399001', name: '深证成指' },
  { code: 'sz399006', name: '创业板指' },
  { code: 'sh000300', name: '沪深300' },
  { code: 'sh000016', name: '上证50' },
  { code: 'sh000688', name: '科创50' },
  { code: 'sh000680', name: '科创综指' },
];
// 全球指数：直接用东财 secid。恒生科技属港股指数（市场 124），纳斯达克东财代码为 NDX（非雅虎 IXIC）。
const GLOBAL_CODES: QuoteCode[] = [
  { code: '100.HSI', name: '恒生指数' },
  { code: '124.HSTECH', name: '恒生科技' },
  { code: '100.DJIA', name: '道琼斯' },
  { code: '100.NDX', name: '纳斯达克' },
  { code: '100.SPX', name: '标普500' },
  { code: '100.N225', name: '日经225' },
  { code: '122.XAU', name: '黄金', cnyCode: '118.AU9999' }, // 现货黄金 美元/盎司 + 黄金9999 人民币/克
];

function tileCls(change: number): string {
  if (Math.abs(change) < 0.001) return 'flat';
  return change > 0 ? 'up' : 'down';
}
function fmtPrice(v: number): string {
  return v.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmtChange(change: number, pct: number): string {
  const sign = change > 0 ? '+' : '';
  return `${sign}${change.toFixed(2)} ${sign}${pct.toFixed(2)}%`;
}

function makeQuoteTab(
  id: string,
  name: string,
  codes: QuoteCode[],
  cacheKey: string,
  msgType: string,
): MarketTab {
  const gridId = id + 'Grid';
  function loadCache(): StockCache | null {
    try {
      const raw = localStorage.getItem(cacheKey);
      return raw ? (JSON.parse(raw) as StockCache) : null;
    } catch {
      return null;
    }
  }
  function saveCache(c: StockCache) {
    try {
      localStorage.setItem(cacheKey, JSON.stringify(c));
    } catch {}
  }
  function renderTiles(quotes: Record<string, StockQuote>, error: boolean): string {
    let html = '';
    for (const c of codes) {
      const q = quotes[c.code];
      if (q) {
        const cls = tileCls(q.change);
        const cny = c.cnyCode ? quotes[c.cnyCode] : undefined;
        const usdUnit = cny ? '<span class="mkt-unit">/盎司</span>' : '';
        const cnyLine = cny ? `<span class="mkt-cny">¥${fmtPrice(cny.current)}/克</span>` : '';
        html += `<div class="mkt-tile ${cls}">
          <div class="mkt-name">${esc(c.name)}</div>
          <div class="mkt-price">${cny ? '$' : ''}${fmtPrice(q.current)}${usdUnit}${cnyLine}</div>
          <div class="mkt-chg ${cls}">${fmtChange(q.change, q.changePct)}</div>
        </div>`;
      } else {
        html += `<div class="mkt-tile flat">
          <div class="mkt-name">${esc(c.name)}</div>
          <div class="mkt-price">--</div>
          <div class="mkt-chg flat">${error ? '⚠ 失败' : '—'}</div>
        </div>`;
      }
    }
    return html;
  }
  function paint(error: boolean) {
    const grid = document.getElementById(gridId);
    if (!grid) return;
    const cache = loadCache();
    const quotes = cache?.quotes ?? {};
    if (!Object.keys(quotes).length) {
      grid.innerHTML = `<div class="mkt-empty">${error ? '⚠ 获取失败 · 点刷新重试' : '加载中…'}</div>`;
      return;
    }
    grid.innerHTML = renderTiles(quotes, error);
  }
  async function refresh() {
    if (!document.getElementById(gridId)) return;
    try {
      const res = (await chrome.runtime.sendMessage({
        type: msgType,
        codes: [...codes.map((c) => c.code), ...codes.flatMap((c) => (c.cnyCode ? [c.cnyCode] : []))],
      })) as
        | { success: boolean; data?: Record<string, StockQuote | null>; error?: string }
        | undefined;
      if (!res?.success || !res.data) throw new Error(res?.error || 'fetch failed');
      const quotes: Record<string, StockQuote> = {};
      for (const c of codes) {
        const q = res.data[c.code];
        if (q) quotes[c.code] = q;
        if (c.cnyCode) {
          const cq = res.data[c.cnyCode];
          if (cq) quotes[c.cnyCode] = cq;
        }
      }
      saveCache({ quotes, ts: Date.now() });
      paint(false);
    } catch {
      paint(true);
    }
  }
  return {
    id,
    name,
    render: () => `<div class="mkt-grid" id="${gridId}"><div class="mkt-empty">加载中…</div></div>`,
    init: () => paint(false),
    refresh,
  };
}

export const stockTab = makeQuoteTab('stock', 'A股', STOCK_CODES, 'moyu_stock_cache', 'STOCK_FETCH');
export const globalTab = makeQuoteTab('global', '全球', GLOBAL_CODES, 'moyu_global_cache', 'STOCK_FETCH');
