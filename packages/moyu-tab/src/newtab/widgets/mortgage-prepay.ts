/** 房贷提前还款计算器（等额本息）：提前还一笔，选「缩短年限 / 减少月供」，对比节省利息 */
import { esc } from '../utils';

const MGP_KEY = 'moyu_mortgage_prepay_input';

interface MgpInput {
  amount: string;
  rate: string;
  years: string;
  paid: string;
  prepay: string;
  mode: 'shorten' | 'reduce';
}

function loadInput(): MgpInput {
  try {
    const r = localStorage.getItem(MGP_KEY);
    if (r) return JSON.parse(r) as MgpInput;
  } catch {}
  return { amount: '100', rate: '3.1', years: '30', paid: '12', prepay: '10', mode: 'shorten' };
}
function saveInput(d: MgpInput) {
  try {
    localStorage.setItem(MGP_KEY, JSON.stringify(d));
  } catch {}
}

export function renderMortgagePrepayCard(): string {
  const d = loadInput();
  return `<div class="widget-card calc-card mortgage-prepay-card">
      <div class="calc-head"><div class="calc-title">房贷提前还款</div></div>
      <div class="calc-form">
        <label class="calc-field"><span>贷款总额（万元）</span><input id="mgpAmount" type="number" inputmode="decimal" min="0" placeholder="如 100" value="${esc(d.amount)}" /></label>
        <div class="calc-row2">
          <label class="calc-field"><span>年利率（%）</span><input id="mgpRate" type="number" inputmode="decimal" min="0" step="0.01" placeholder="如 3.1" value="${esc(d.rate)}" /></label>
          <label class="calc-field"><span>贷款年限</span><input id="mgpYears" type="number" inputmode="numeric" min="1" placeholder="如 30" value="${esc(d.years)}" /></label>
        </div>
        <div class="calc-row2">
          <label class="calc-field"><span>已还月数</span><input id="mgpPaid" type="number" inputmode="numeric" min="0" placeholder="如 12" value="${esc(d.paid)}" /></label>
          <label class="calc-field"><span>提前还款（万元）</span><input id="mgpPrepay" type="number" inputmode="decimal" min="0" placeholder="如 10" value="${esc(d.prepay)}" /></label>
        </div>
        <div class="calc-toggle" id="mgpToggle">
          <div class="calc-tb ${d.mode === 'shorten' ? 'active' : ''}" data-mode="shorten">缩短年限</div>
          <div class="calc-tb ${d.mode === 'reduce' ? 'active' : ''}" data-mode="reduce">减少月供</div>
        </div>
      </div>
      <div class="calc-result" id="mgpResult"><div class="calc-empty">输入金额即时计算</div></div>
    </div>`;
}

function fmtMoney(v: number): string {
  return '¥' + v.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmtYears(n: number): string {
  const y = Math.floor(n);
  const mo = Math.round((n - y) * 12);
  return mo ? `${y} 年 ${mo} 个月` : `${y} 年`;
}

function currentMode(): 'shorten' | 'reduce' {
  const el = document.querySelector('#mgpToggle .calc-tb.active') as HTMLElement | null;
  return (el?.dataset.mode as 'shorten' | 'reduce') || 'shorten';
}

function compute(): void {
  const g = (id: string) => document.getElementById(id) as HTMLInputElement | null;
  const aEl = g('mgpAmount');
  const rEl = g('mgpRate');
  const yEl = g('mgpYears');
  const pEl = g('mgpPaid');
  const ppEl = g('mgpPrepay');
  const out = document.getElementById('mgpResult');
  if (!aEl || !out) return;
  const amount = (parseFloat(aEl.value) || 0) * 10000; // 万元 → 元
  const annualRate = parseFloat(rEl?.value || '') || 0;
  const years = parseFloat(yEl?.value || '') || 0;
  const paid = Math.round(parseFloat(pEl?.value || '') || 0);
  const prepay = (parseFloat(ppEl?.value || '') || 0) * 10000;
  const mode = currentMode();
  saveInput({ amount: aEl.value, rate: rEl?.value || '', years: yEl?.value || '', paid: pEl?.value || '', prepay: ppEl?.value || '', mode });

  if (amount <= 0 || years <= 0) {
    out.innerHTML = `<div class="calc-empty">输入金额即时计算</div>`;
    return;
  }
  const n = Math.round(years * 12);
  const r = annualRate / 100 / 12;
  const k = Math.min(paid, n);
  if (prepay <= 0) {
    out.innerHTML = `<div class="calc-empty">输入提前还款金额</div>`;
    return;
  }
  // 等额本息月供
  const m = r === 0 ? amount / n : (amount * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
  // 已还 k 期后的剩余本金
  const bal = r === 0 ? amount - m * k : amount * Math.pow(1 + r, k) - (m * (Math.pow(1 + r, k) - 1)) / r;
  const balAfter = Math.max(0, bal - prepay);
  const rem = n - k; // 剩余期数
  if (balAfter <= 0) {
    // 一次还清
    out.innerHTML = `<div class="calc-rows">
      <div class="calc-row"><span>剩余本金</span>${fmtMoney(bal)}</div>
      <div class="calc-row"><span>一次还清金额</span>${fmtMoney(prepay)}</div>
      <div class="calc-row"><span>节省利息</span><span class="calc-val tax">${fmtMoney(m * rem - bal)}</span></div>
      <div class="calc-row"><span>此后无月供</span><span class="calc-val after">已结清</span></div>
    </div>`;
    return;
  }
  const noPrepayInterest = m * rem - bal; // 不提前还时的剩余利息
  let rows: [string, string][];
  if (mode === 'shorten') {
    // 月供不变，缩短至 n' 期
    const np = r === 0 ? balAfter / m : -Math.log(1 - (balAfter * r) / m) / Math.log(1 + r);
    const newInterest = m * np - balAfter;
    rows = [
      ['剩余本金', fmtMoney(bal)],
      ['提前还款前剩余利息', fmtMoney(noPrepayInterest)],
      ['新月供（不变）', `<span class="calc-val after">${fmtMoney(m)}</span>`],
      ['新剩余年限', `<span class="calc-val after">${fmtYears(np / 12)}</span>`],
      ['提前还款后利息', fmtMoney(newInterest)],
      ['节省利息', `<span class="calc-val tax">${fmtMoney(noPrepayInterest - newInterest)}</span>`],
    ];
  } else {
    // 剩余期数不变，重算月供
    const m2 = r === 0 ? balAfter / rem : (balAfter * r * Math.pow(1 + r, rem)) / (Math.pow(1 + r, rem) - 1);
    const newInterest = m2 * rem - balAfter;
    rows = [
      ['剩余本金', fmtMoney(bal)],
      ['提前还款前剩余利息', fmtMoney(noPrepayInterest)],
      ['新月供', `<span class="calc-val after">${fmtMoney(m2)}</span>`],
      ['剩余年限（不变）', `<span class="calc-val after">${fmtYears(rem / 12)}</span>`],
      ['提前还款后利息', fmtMoney(newInterest)],
      ['节省利息', `<span class="calc-val tax">${fmtMoney(noPrepayInterest - newInterest)}</span>`],
    ];
  }
  out.innerHTML = `<div class="calc-rows">${rows
    .map(([k2, v]) => `<div class="calc-row"><span>${k2}</span>${v}</div>`)
    .join('')}</div>`;
}

export function initMortgagePrepay(): void {
  compute();
  ['mgpAmount', 'mgpRate', 'mgpYears', 'mgpPaid', 'mgpPrepay'].forEach((id) =>
    document.getElementById(id)?.addEventListener('input', compute),
  );
  document.querySelectorAll('#mgpToggle .calc-tb').forEach((b) =>
    b.addEventListener('click', function (this: HTMLElement) {
      document.querySelectorAll('#mgpToggle .calc-tb').forEach((x) => x.classList.remove('active'));
      this.classList.add('active');
      compute();
    }),
  );
}