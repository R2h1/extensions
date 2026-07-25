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
      <div class="calc-head"><div class="calc-title">BMI 计算器</div></div>
      <div class="calc-form">
        <div class="calc-row2">
          <label class="calc-field"><span>身高（cm）</span><input id="bmiHeight" type="number" inputmode="decimal" min="0" placeholder="如 170" value="${esc(d.height)}" /></label>
          <label class="calc-field"><span>体重（kg）</span><input id="bmiWeight" type="number" inputmode="decimal" min="0" placeholder="如 65" value="${esc(d.weight)}" /></label>
        </div>
      </div>
      <div class="calc-result" id="bmiResult"><div class="calc-empty">输入身高体重计算</div></div>
      <div class="bmi-std">
        <div class="bmi-std-title">中国成人 BMI 分级标准</div>
        <div class="bmi-std-table">
          <div class="bmi-std-row" data-cat="thin"><span class="bmi-std-label">偏瘦</span><span class="bmi-std-range">&lt; 18.5</span></div>
          <div class="bmi-std-row" data-cat="normal"><span class="bmi-std-label">正常</span><span class="bmi-std-range">18.5 - 24.0</span></div>
          <div class="bmi-std-row" data-cat="over"><span class="bmi-std-label">超重</span><span class="bmi-std-range">24.0 - 28.0</span></div>
          <div class="bmi-std-row" data-cat="obese"><span class="bmi-std-label">肥胖</span><span class="bmi-std-range">≥ 28.0</span></div>
        </div>
      </div>
      <div class="bmi-about">
        <div class="bmi-about-title">关于 BMI</div>
        <div class="bmi-about-grid">
          <div class="bmi-about-item"><div class="bmi-about-head"><div class="bmi-about-num">1</div><div class="bmi-about-h">计算公式</div></div><div class="bmi-about-t">BMI = 体重(kg) ÷ 身高(m)²，是国际通用的体重评估指标</div></div>
          <div class="bmi-about-item"><div class="bmi-about-head"><div class="bmi-about-num">2</div><div class="bmi-about-h">中国标准</div></div><div class="bmi-about-t">采用 WS/T 428-2013 成人体重判定标准，18.5-24 为正常范围</div></div>
          <div class="bmi-about-item"><div class="bmi-about-head"><div class="bmi-about-num">3</div><div class="bmi-about-h">即时计算</div></div><div class="bmi-about-t">输入身高体重即可实时获取 BMI 值和健康分类，无需点击按钮</div></div>
          <div class="bmi-about-item"><div class="bmi-about-head"><div class="bmi-about-num">4</div><div class="bmi-about-h">参考价值</div></div><div class="bmi-about-t">BMI 非诊断标准，建议结合腰围（男&lt;90cm，女&lt;85cm）、体脂率综合评估</div></div>
        </div>
      </div>
    </div>`;
}

function setStdActive(cat: string): void {
  document.querySelectorAll('.bmi-std-row').forEach((r) => {
    (r as HTMLElement).classList.toggle('active', (r as HTMLElement).dataset.cat === cat);
  });
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
    setStdActive('');
    return;
  }
  const m = h / 100;
  const bmi = w / (m * m);
  let label = '',
    cls = '',
    cat = '';
  if (bmi < 18.5) {
    label = '偏瘦';
    cls = 'thin';
    cat = 'thin';
  } else if (bmi < 24) {
    label = '正常';
    cls = 'up';
    cat = 'normal';
  } else if (bmi < 28) {
    label = '超重';
    cls = 'warn';
    cat = 'over';
  } else {
    label = '肥胖';
    cls = 'down';
    cat = 'obese';
  }
  const lo = 18.5 * m * m,
    hi = 24 * m * m;
  out.innerHTML = `<div class="bmi-main">
        <span class="bmi-val ${cls}">${bmi.toFixed(1)}</span>
        <span class="bmi-tag ${cls}">${label}</span>
      </div>
      <div class="calc-row bmi-range"><span>健康体重范围</span><span>${lo.toFixed(1)} – ${hi.toFixed(1)} kg</span></div>`;
  setStdActive(cat);
}

export function initBmi(): void {
  compute();
  ['bmiHeight', 'bmiWeight'].forEach((id) =>
    document.getElementById(id)?.addEventListener('input', compute),
  );
}
