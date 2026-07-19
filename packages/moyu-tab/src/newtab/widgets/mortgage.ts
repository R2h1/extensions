/** 房贷计算器：等额本息 / 等额本金 */
import { esc } from '../utils';

const MG_KEY = 'moyu_mortgage_input';

interface MgInput {
  amount: string;
  rate: string;
  years: string;
  mode: 'equal' | 'principal';
}

function loadInput(): MgInput {
  try {
    const r = localStorage.getItem(MG_KEY);
    if (r) return JSON.parse(r) as MgInput;
  } catch {}
  return { amount: '', rate: '3.1', years: '30', mode: 'equal' };
}
function saveInput(d: MgInput) {
  try {
    localStorage.setItem(MG_KEY, JSON.stringify(d));
  } catch {}
}

export function renderMortgageCard(): string {
  const d = loadInput();
  return `<div class="widget-card calc-card mortgage-card">
      <div class="calc-head"><div class="calc-title">🏠 房贷计算器</div></div>
      <div class="calc-form">
        <label class="calc-field"><span>贷款金额（万元）</span><input id="mgAmount" type="number" inputmode="decimal" min="0" placeholder="如 100" value="${esc(d.amount)}" /></label>
        <div class="calc-row2">
          <label class="calc-field"><span>年利率（%）</span><input id="mgRate" type="number" inputmode="decimal" min="0" step="0.01" value="${esc(d.rate)}" /></label>
          <label class="calc-field"><span>年限</span><input id="mgYears" type="number" inputmode="numeric" min="1" value="${esc(d.years)}" /></label>
        </div>
        <div class="calc-toggle" id="mgToggle">
          <div class="calc-tb ${d.mode === 'equal' ? 'active' : ''}" data-mode="equal">等额本息</div>
          <div class="calc-tb ${d.mode === 'principal' ? 'active' : ''}" data-mode="principal">等额本金</div>
        </div>
      </div>
      <div class="calc-result" id="mgResult"><div class="calc-empty">输入金额即时计算</div></div>
    </div>`;
}

function fmtMoney(v: number): string {
  return '¥' + v.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function currentMode(): 'equal' | 'principal' {
  const el = document.querySelector('#mgToggle .calc-tb.active') as HTMLElement | null;
  return (el?.dataset.mode as 'equal' | 'principal') || 'equal';
}

function compute(): void {
  const aEl = document.getElementById('mgAmount') as HTMLInputElement | null;
  const rEl = document.getElementById('mgRate') as HTMLInputElement | null;
  const yEl = document.getElementById('mgYears') as HTMLInputElement | null;
  const out = document.getElementById('mgResult');
  if (!aEl || !out) return;
  const amount = (parseFloat(aEl.value) || 0) * 10000; // 万元 → 元
  const annualRate = parseFloat(rEl?.value || '') || 0;
  const years = parseFloat(yEl?.value || '') || 0;
  const mode = currentMode();
  saveInput({ amount: aEl.value, rate: rEl?.value || '', years: yEl?.value || '', mode });

  if (amount <= 0 || years <= 0) {
    out.innerHTML = `<div class="calc-empty">输入金额即时计算</div>`;
    return;
  }
  const n = Math.round(years * 12);
  const r = annualRate / 100 / 12;
  let rows: [string, string][];
  if (mode === 'equal') {
    // 等额本息：月供 = P·r·(1+r)ⁿ / ((1+r)ⁿ − 1)
    const m = r === 0 ? amount / n : (amount * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
    const total = m * n;
    rows = [
      ['每月还款', `<span class="calc-val after">${fmtMoney(m)}</span>`],
      ['还款总额', fmtMoney(total)],
      ['利息总额', `<span class="calc-val tax">${fmtMoney(total - amount)}</span>`],
    ];
  } else {
    // 等额本金：月本金固定，利息逐月递减
    const principal = amount / n;
    const first = principal + amount * r;
    const last = principal + principal * r;
    const totalInterest = (amount * r * (n + 1)) / 2;
    rows = [
      ['首月还款', `<span class="calc-val after">${fmtMoney(first)}</span>`],
      ['每月递减', fmtMoney(principal * r)],
      ['末月还款', fmtMoney(last)],
      ['利息总额', `<span class="calc-val tax">${fmtMoney(totalInterest)}</span>`],
      ['还款总额', fmtMoney(amount + totalInterest)],
    ];
  }
  out.innerHTML = `<div class="calc-rows">${rows
    .map(([k, v]) => `<div class="calc-row"><span>${k}</span>${v}</div>`)
    .join('')}</div>`;
}

export function initMortgage(): void {
  compute();
  ['mgAmount', 'mgRate', 'mgYears'].forEach((id) =>
    document.getElementById(id)?.addEventListener('input', compute),
  );
  document.querySelectorAll('#mgToggle .calc-tb').forEach((b) =>
    b.addEventListener('click', function (this: HTMLElement) {
      document.querySelectorAll('#mgToggle .calc-tb').forEach((x) => x.classList.remove('active'));
      this.classList.add('active');
      compute();
    }),
  );
}
