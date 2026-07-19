/** BMI 计算器（中国成人标准） */
import { esc } from '../utils';

const BMI_KEY = 'moyu_bmi_input';

interface BmiInput {
  height: string;
  weight: string;
}

function loadInput(): BmiInput {
  try {
    const r = localStorage.getItem(BMI_KEY);
    if (r) return JSON.parse(r) as BmiInput;
  } catch {}
  return { height: '', weight: '' };
}
function saveInput(d: BmiInput) {
  try {
    localStorage.setItem(BMI_KEY, JSON.stringify(d));
  } catch {}
}

export function renderBmiCard(): string {
  const d = loadInput();
  return `<div class="widget-card calc-card bmi-card">
      <div class="calc-head"><div class="calc-title">⚖ BMI 计算器</div></div>
      <div class="calc-form">
        <div class="calc-row2">
          <label class="calc-field"><span>身高（cm）</span><input id="bmiHeight" type="number" inputmode="decimal" min="0" placeholder="如 170" value="${esc(d.height)}" /></label>
          <label class="calc-field"><span>体重（kg）</span><input id="bmiWeight" type="number" inputmode="decimal" min="0" placeholder="如 65" value="${esc(d.weight)}" /></label>
        </div>
      </div>
      <div class="calc-result" id="bmiResult"><div class="calc-empty">输入身高体重计算</div></div>
    </div>`;
}

function compute(): void {
  const hEl = document.getElementById('bmiHeight') as HTMLInputElement | null;
  const wEl = document.getElementById('bmiWeight') as HTMLInputElement | null;
  const out = document.getElementById('bmiResult');
  if (!hEl || !wEl || !out) return;
  const h = parseFloat(hEl.value) || 0;
  const w = parseFloat(wEl.value) || 0;
  saveInput({ height: hEl.value, weight: wEl.value });
  if (h <= 0 || w <= 0) {
    out.innerHTML = `<div class="calc-empty">输入身高体重计算</div>`;
    return;
  }
  const m = h / 100;
  const bmi = w / (m * m);
  let label = '',
    cls = '';
  if (bmi < 18.5) {
    label = '偏瘦';
    cls = 'down';
  } else if (bmi < 24) {
    label = '正常';
    cls = 'up';
  } else if (bmi < 28) {
    label = '超重';
    cls = 'warn';
  } else {
    label = '肥胖';
    cls = 'down';
  }
  const lo = 18.5 * m * m,
    hi = 24 * m * m;
  out.innerHTML = `<div class="bmi-main">
        <span class="bmi-val ${cls}">${bmi.toFixed(1)}</span>
        <span class="bmi-tag ${cls}">${label}</span>
      </div>
      <div class="calc-row bmi-range"><span>健康体重范围</span><span>${lo.toFixed(1)} – ${hi.toFixed(1)} kg</span></div>`;
}

export function initBmi(): void {
  compute();
  ['bmiHeight', 'bmiWeight'].forEach((id) =>
    document.getElementById(id)?.addEventListener('input', compute),
  );
}
