/** 汇率换算：SW 代理取 open.er-api（base USD），1h 缓存 */
import { pad } from '../utils';

const CUR_KEY = 'moyu_currency_cache';
const CUR_INPUT = 'moyu_currency_input';
const TTL = 60 * 60 * 1000;

interface CurCache {
  rates: Record<string, number>;
  ts: number;
}
interface CurInput {
  amount: string;
  from: string;
  to: string;
}

const CURRENCIES: { code: string; name: string }[] = [
  { code: 'CNY', name: '人民币' },
  { code: 'USD', name: '美元' },
  { code: 'EUR', name: '欧元' },
  { code: 'GBP', name: '英镑' },
  { code: 'JPY', name: '日元' },
  { code: 'HKD', name: '港币' },
  { code: 'KRW', name: '韩元' },
  { code: 'TWD', name: '新台币' },
  { code: 'AUD', name: '澳元' },
  { code: 'CAD', name: '加元' },
  { code: 'SGD', name: '新加坡元' },
  { code: 'CHF', name: '瑞郎' },
  { code: 'RUB', name: '卢布' },
  { code: 'THB', name: '泰铢' },
  { code: 'MYR', name: '林吉特' },
];

/** 线性图标：双向箭头，表"换算"（替代 💱 表情） */
const CUR_ICON =
  '<svg class="cur-ic" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 3 4 7l4 4"/><path d="M4 7h16"/><path d="m16 21 4-4-4-4"/><path d="M20 17H4"/></svg>';

let curLoading = false;
let curInited = false;
let curLastFetch = 0;
let curFrom = 'CNY';
let curTo = 'USD';
let curDocCloseBound = false;

function loadCache(): CurCache | null {
  try {
    const r = localStorage.getItem(CUR_KEY);
    return r ? (JSON.parse(r) as CurCache) : null;
  } catch {
    return null;
  }
}
function saveCache(c: CurCache) {
  try {
    localStorage.setItem(CUR_KEY, JSON.stringify(c));
  } catch {}
}
function loadInput(): CurInput {
  try {
    const r = localStorage.getItem(CUR_INPUT);
    if (r) return JSON.parse(r) as CurInput;
  } catch {}
  return { amount: '100', from: 'CNY', to: 'USD' };
}
function saveInput(d: CurInput) {
  try {
    localStorage.setItem(CUR_INPUT, JSON.stringify(d));
  } catch {}
}

function curLabel(code: string): string {
  const c = CURRENCIES.find((x) => x.code === code);
  return c ? `${c.code} ${c.name}` : code;
}
function fmtTime(ts: number) {
  const d = new Date(ts);
  return pad(d.getHours()) + ':' + pad(d.getMinutes());
}

export function renderCurrencyCard(): string {
  const d = loadInput();
  curFrom = d.from;
  curTo = d.to;
  return `<div class="widget-card currency-card">
      <div class="cur-head">
        <div class="cur-title">${CUR_ICON} 汇率换算</div>
        <div class="cur-meta">
          <span class="cur-upd" id="curUpd">加载中…</span>
          <button class="cur-refresh" id="curRefresh" title="刷新">↻</button>
        </div>
      </div>
      <div class="cur-form">
        <input id="curAmount" type="number" inputmode="decimal" min="0" value="${d.amount}" />
        <div class="cur-row">
          <div class="cal-dd cur-dd" id="curFromDD">
            <button class="cal-dd-btn" type="button"><span class="cal-dd-val">${curLabel(curFrom)}</span><span class="cal-dd-arrow">▾</span></button>
            <div class="cal-dd-list" id="curFromList"></div>
          </div>
          <button class="cur-swap" id="curSwap" title="互换">⇄</button>
          <div class="cal-dd cur-dd" id="curToDD">
            <button class="cal-dd-btn" type="button"><span class="cal-dd-val">${curLabel(curTo)}</span><span class="cal-dd-arrow">▾</span></button>
            <div class="cal-dd-list" id="curToList"></div>
          </div>
        </div>
      </div>
      <div class="cur-result" id="curResult"><div class="calc-empty">加载汇率中…</div></div>
    </div>`;
}

/** 复用日历卡片同款 .cal-dd 下拉：点击展开、外部点击收起、互斥关闭 */
function closeAllDDs() {
  document.querySelectorAll('.cal-dd.open').forEach((dd) => dd.classList.remove('open'));
}
function buildCurDropdown(
  ddId: string,
  current: string,
  onChange: (v: string) => void,
) {
  const dd = document.getElementById(ddId);
  if (!dd) return;
  const list = dd.querySelector('.cal-dd-list');
  if (list && !list.children.length) {
    list.innerHTML = CURRENCIES.map(
      (c) =>
        `<div class="cal-dd-opt${c.code === current ? ' active' : ''}" data-v="${c.code}">${c.code} ${c.name}</div>`,
    ).join('');
  }
  const btn = dd.querySelector('.cal-dd-btn');
  btn?.addEventListener('click', (e) => {
    e.stopPropagation();
    const wasOpen = dd.classList.contains('open');
    closeAllDDs();
    if (!wasOpen) {
      dd.classList.add('open');
      list?.querySelector('.active')?.scrollIntoView({ block: 'nearest' });
    }
  });
  list?.querySelectorAll('.cal-dd-opt').forEach((opt) =>
    opt.addEventListener('click', (e) => {
      e.stopPropagation();
      const v = (opt as HTMLElement).dataset.v!;
      dd.classList.remove('open');
      onChange(v);
    }),
  );
  if (!curDocCloseBound) {
    curDocCloseBound = true;
    document.addEventListener('click', closeAllDDs);
  }
}
function syncCurDD(ddId: string, value: string) {
  const dd = document.getElementById(ddId);
  if (!dd) return;
  const valEl = dd.querySelector('.cal-dd-val');
  if (valEl) valEl.textContent = curLabel(value);
  dd.querySelectorAll('.cal-dd-opt').forEach((o) =>
    o.classList.toggle('active', (o as HTMLElement).dataset.v === value),
  );
}

function convert(amount: number, from: string, to: string, rates: Record<string, number>): number {
  // base USD：先折成美元，再换成目标币
  const rf = rates[from];
  const rt = rates[to];
  if (!rf || !rt) return NaN;
  return (amount / rf) * rt;
}

function compute(): void {
  const aEl = document.getElementById('curAmount') as HTMLInputElement | null;
  const out = document.getElementById('curResult');
  if (!aEl || !out) return;
  const amount = parseFloat(aEl.value) || 0;
  const from = curFrom,
    to = curTo;
  saveInput({ amount: aEl.value, from, to });
  const c = loadCache();
  if (!c || !c.rates[from] || !c.rates[to]) {
    out.innerHTML = `<div class="calc-empty">加载汇率中…</div>`;
    return;
  }
  const result = convert(amount, from, to, c.rates);
  const unitRate = convert(1, from, to, c.rates);
  out.innerHTML = `<div class="cur-amount">${result.toLocaleString('zh-CN', { maximumFractionDigits: 4 })} <span class="cur-unit">${to}</span></div>
      <div class="cur-rate">${amount} ${from} = ${result.toLocaleString('zh-CN', { maximumFractionDigits: 4 })} ${to}</div>
      <div class="cur-rate-sub">1 ${from} = ${isFinite(unitRate) ? unitRate.toFixed(4) : '--'} ${to}</div>`;
}

async function refresh(): Promise<void> {
  if (curLoading) return;
  if (!document.getElementById('curResult')) return;
  curLoading = true;
  const btn = document.getElementById('curRefresh');
  btn?.classList.add('spin');
  try {
    const res = (await chrome.runtime.sendMessage({ type: 'EXCHANGE_FETCH' })) as
      | { success: boolean; data?: { rates: Record<string, number>; ts: number }; error?: string }
      | undefined;
    const upd = document.getElementById('curUpd');
    if (res?.success && res.data?.rates) {
      const ts = res.data.ts || Date.now();
      saveCache({ rates: res.data.rates, ts });
      curLastFetch = Date.now();
      if (upd) upd.textContent = fmtTime(ts) + ' 更新';
      compute();
    } else {
      if (upd) upd.textContent = '⚠ 失败 · 点刷新重试';
    }
  } catch {
    const upd = document.getElementById('curUpd');
    if (upd) upd.textContent = '⚠ 失败';
  } finally {
    curLoading = false;
    btn?.classList.remove('spin');
  }
}

function onVis() {
  if (document.visibilityState !== 'visible') return;
  const c = loadCache();
  if (!c || Date.now() - c.ts > TTL) refresh();
}

export async function initCurrency(): Promise<void> {
  const d = loadInput();
  curFrom = d.from;
  curTo = d.to;
  buildCurDropdown('curFromDD', curFrom, (v) => {
    curFrom = v;
    syncCurDD('curFromDD', v);
    compute();
  });
  buildCurDropdown('curToDD', curTo, (v) => {
    curTo = v;
    syncCurDD('curToDD', v);
    compute();
  });
  compute();
  document.getElementById('curAmount')?.addEventListener('input', compute);
  document.getElementById('curSwap')?.addEventListener('click', () => {
    const tmp = curFrom;
    curFrom = curTo;
    curTo = tmp;
    syncCurDD('curFromDD', curFrom);
    syncCurDD('curToDD', curTo);
    compute();
  });
  document.getElementById('curRefresh')?.addEventListener('click', refresh);
  const c = loadCache();
  if (c) {
    const upd = document.getElementById('curUpd');
    if (upd) upd.textContent = fmtTime(c.ts) + ' 更新';
  }
  if (curInited) return;
  curInited = true;
  if (!c || Date.now() - c.ts > TTL) refresh();
  setInterval(() => {
    if (Date.now() - curLastFetch > TTL) refresh();
  }, TTL);
  document.addEventListener('visibilitychange', onVis);
}
