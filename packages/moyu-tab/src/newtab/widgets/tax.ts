/** 个税计算器：月度综合所得简化版（起征点 5000 + 7 级超额累进） */
import { esc } from '../utils';

const TAX_KEY = 'moyu_tax_input';

interface TaxInput {
  salary: string;
  insurance: string;
  special: string;
}

// 7 级超额累进（月度）：[应纳税所得额上限, 税率%, 速算扣除数]
const BRACKETS: [number, number, number][] = [
  [3000, 3, 0],
  [12000, 10, 210],
  [25000, 20, 1410],
  [35000, 25, 2660],
  [55000, 30, 4410],
  [80000, 35, 7160],
  [Infinity, 45, 15160],
];
const THRESHOLD = 5000;

function loadInput(): TaxInput {
  try {
    const r = localStorage.getItem(TAX_KEY);
    if (r) return JSON.parse(r) as TaxInput;
  } catch {}
  return { salary: '', insurance: '', special: '' };
}
function saveInput(d: TaxInput) {
  try {
    localStorage.setItem(TAX_KEY, JSON.stringify(d));
  } catch {}
}

export function renderTaxCard(): string {
  const d = loadInput();
  return `<div class="widget-card calc-card tax-card">
      <div class="calc-head"><div class="calc-title">🧾 个税计算器</div><div class="calc-sub">月度综合所得</div></div>
      <div class="calc-form">
        <label class="calc-field"><span>税前月薪（元）</span><input id="taxSalary" type="number" inputmode="decimal" min="0" placeholder="如 15000" value="${esc(d.salary)}" /></label>
        <label class="calc-field"><span>五险一金扣除（元/月）</span><input id="taxInsurance" type="number" inputmode="decimal" min="0" placeholder="选填" value="${esc(d.insurance)}" /></label>
        <label class="calc-field"><span>专项附加扣除（元/月）</span><input id="taxSpecial" type="number" inputmode="decimal" min="0" placeholder="选填" value="${esc(d.special)}" /></label>
      </div>
      <div class="calc-result" id="taxResult"><div class="calc-empty">输入月薪即时计算</div></div>
    </div>`;
}

function fmtMoney(v: number): string {
  return '¥' + v.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function compute(): void {
  const sEl = document.getElementById('taxSalary') as HTMLInputElement | null;
  const iEl = document.getElementById('taxInsurance') as HTMLInputElement | null;
  const pEl = document.getElementById('taxSpecial') as HTMLInputElement | null;
  const out = document.getElementById('taxResult');
  if (!sEl || !out) return;
  const salary = parseFloat(sEl.value) || 0;
  const insurance = parseFloat(iEl?.value || '') || 0;
  const special = parseFloat(pEl?.value || '') || 0;
  saveInput({ salary: sEl.value, insurance: iEl?.value || '', special: pEl?.value || '' });

  if (salary <= 0) {
    out.innerHTML = `<div class="calc-empty">输入月薪即时计算</div>`;
    return;
  }
  const taxable = salary - THRESHOLD - insurance - special;
  let tax = 0,
    rate = 0,
    deduct = 0;
  if (taxable > 0) {
    for (const [cap, r, d] of BRACKETS) {
      if (taxable <= cap) {
        rate = r;
        deduct = d;
        tax = (taxable * r) / 100 - d;
        break;
      }
    }
    if (tax < 0) tax = 0;
  }
  const after = salary - insurance - tax;
  const rows: [string, string][] = [
    ['应纳税所得额', fmtMoney(Math.max(0, taxable))],
    ['适用税率', rate + '%'],
    ['速算扣除数', fmtMoney(deduct)],
    ['应纳个税', `<span class="calc-val tax">${fmtMoney(tax)}</span>`],
    ['税后到手', `<span class="calc-val after">${fmtMoney(after)}</span>`],
  ];
  out.innerHTML = `<div class="calc-rows">${rows
    .map(([k, v]) => `<div class="calc-row"><span>${k}</span>${v}</div>`)
    .join('')}</div>`;
}

export function initTax(): void {
  compute();
  ['taxSalary', 'taxInsurance', 'taxSpecial'].forEach((id) =>
    document.getElementById(id)?.addEventListener('input', compute),
  );
}
