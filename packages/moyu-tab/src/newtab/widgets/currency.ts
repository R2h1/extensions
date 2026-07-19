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

let curLoading = false;
let curInited = false;
let curLastFetch = 0;

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

function opts(selected: string): string {
  return CURRENCIES.map(
    (c) => `<option value="${c.code}"${c.code === selected ? ' selected' : ''}>${c.code} ${c.name}</option>`,
  ).join('');
}
function fmtTime(ts: number) {
  const d = new Date(ts);
  return pad(d.getHours()) + ':' + pad(d.getMinutes());
}

export function renderCurrencyCard(): string {
  const d = loadInput();
  return `<div class="widget-card currency-card">
      <div class="cur-head">
        <div class="cur-title">💱 汇率换算</div>
        <div class="cur-meta">
          <span class="cur-upd" id="curUpd">加载中…</span>
          <button class="cur-refresh" id="curRefresh" title="刷新">↻</button>
        </div>
      </div>
      <div class="cur-form">
        <input id="curAmount" type="number" inputmode="decimal" min="0" value="${d.amount}" />
        <div class="cur-row">
          <select id="curFrom">${opts(d.from)}</select>
          <button class="cur-swap" id="curSwap" title="互换">⇄</button>
          <select id="curTo">${opts(d.to)}</select>
        </div>
      </div>
      <div class="cur-result" id="curResult"><div class="calc-empty">加载汇率中…</div></div>
    </div>`;
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
  const fEl = document.getElementById('curFrom') as HTMLSelectElement | null;
  const tEl = document.getElementById('curTo') as HTMLSelectElement | null;
  const out = document.getElementById('curResult');
  if (!aEl || !fEl || !tEl || !out) return;
  const amount = parseFloat(aEl.value) || 0;
  const from = fEl.value,
    to = tEl.value;
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
      <div class="cur-rate-sub">1 ${from} = ${isFinite(unitRate) ? unitRate.toFixed(4) : '--'} ${to} · ${fmtTime(c.ts)} 更新</div>`;
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
  compute();
  document.getElementById('curAmount')?.addEventListener('input', compute);
  document.getElementById('curFrom')?.addEventListener('change', compute);
  document.getElementById('curTo')?.addEventListener('change', compute);
  document.getElementById('curSwap')?.addEventListener('click', () => {
    const f = document.getElementById('curFrom') as HTMLSelectElement | null;
    const t = document.getElementById('curTo') as HTMLSelectElement | null;
    if (!f || !t) return;
    const tmp = f.value;
    f.value = t.value;
    t.value = tmp;
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
