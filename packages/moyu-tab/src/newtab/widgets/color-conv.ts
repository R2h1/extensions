/** 颜色转换器：粘贴任意颜色（#hex / rgba()/rgb()）自动解析，输出全部格式 + 色块预览 + 点击复制 */
import { esc } from '../utils';

const COL_KEY = 'moyu_color_input';

function loadInput(): string {
  try {
    return localStorage.getItem(COL_KEY) || '';
  } catch {
    return '';
  }
}
function saveInput(v: string) {
  try {
    localStorage.setItem(COL_KEY, v);
  } catch {}
}

export function renderColorConvCard(): string {
  return `<div class="widget-card calc-card color-card">
      <div class="calc-head"><div class="calc-title">颜色转换</div></div>
      <div class="calc-form">
        <label class="calc-field"><span>颜色</span>
          <input id="colInput" type="text" placeholder="#4285f4 / #fff / rgb() / rgba()" value="${esc(loadInput())}" spellcheck="false" />
        </label>
      </div>
      <div class="calc-result" id="colResult"><div class="calc-empty">粘贴颜色自动转换，点击复制</div></div>
    </div>`;
}

interface Parsed {
  r: number;
  g: number;
  b: number;
  a01: number;
}

/** 解析 #hex（3/4/6/8 位）、rgb()/rgba()、无括号数字序列 */
function parseColor(raw: string): Parsed | null {
  let s = raw.trim().toLowerCase();
  if (!s) return null;
  // #hex
  if (s.startsWith('#')) {
    let h = s.slice(1);
    if (!/^[\da-f]{3,8}$/.test(h)) return null;
    if (h.length === 3 || h.length === 4) h = h.split('').map((c) => c + c).join('');
    if (h.length !== 6 && h.length !== 8) return null;
    return {
      r: parseInt(h.slice(0, 2), 16),
      g: parseInt(h.slice(2, 4), 16),
      b: parseInt(h.slice(4, 6), 16),
      a01: h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1,
    };
  }
  // 提取数字 token（r g b [a%]），兼容逗号 / 空格 / 斜杠分隔
  const paren = s.match(/rgba?\s*\(([^)]*)\)/);
  if (!paren && s.includes('(')) return null; // 有括号但不是 rgb()/rgba()，无法识别
  const inner = paren ? paren[1] : s;
  const toks = (inner.match(/-?[\d.]+%?/g) || []).map((t) => t.trim());
  if (toks.length < 3) return null;
  const byte = (t: string) => {
    const pct = t.endsWith('%');
    const v = parseFloat(t) || 0;
    const n = pct ? (v / 100) * 255 : v;
    return Math.round(Math.min(255, Math.max(0, n)));
  };
  const aTok = toks[3];
  let a01 = 1;
  if (aTok !== undefined) {
    a01 = aTok.endsWith('%') ? (parseFloat(aTok) || 0) / 100 : parseFloat(aTok) || 0;
    a01 = Math.min(1, Math.max(0, a01));
  }
  return { r: byte(toks[0]), g: byte(toks[1]), b: byte(toks[2]), a01 };
}

function toHex(v: number): string {
  return v.toString(16).padStart(2, '0').toUpperCase();
}

function compute(): void {
  const input = document.getElementById('colInput') as HTMLInputElement | null;
  const out = document.getElementById('colResult');
  if (!input || !out) return;
  const p = parseColor(input.value);
  saveInput(input.value);
  if (!p) {
    out.innerHTML = `<div class="calc-empty">无法识别，支持 #hex / rgb() / rgba()</div>`;
    return;
  }
  const hex = '#' + toHex(p.r) + toHex(p.g) + toHex(p.b);
  const hexA = hex + toHex(Math.round(p.a01 * 255));
  const rgb = `rgb(${p.r}, ${p.g}, ${p.b})`;
  const rgba = `rgba(${p.r}, ${p.g}, ${p.b}, ${p.a01.toFixed(2)})`;
  const bg = p.a01 < 1 ? hexA : hex;
  out.innerHTML = `<div class="col-swatch" style="background:${bg}"></div>
    <div class="col-hex" data-copy="${hex}" title="点击复制">${hex}</div>
    <div class="col-hex" data-copy="${hexA}" title="点击复制">${hexA}</div>
    <div class="col-hex" data-copy="${rgb}" title="点击复制">${rgb}</div>
    <div class="col-hex" data-copy="${rgba}" title="点击复制">${rgba}</div>`;
}

export function initColorConv(): void {
  compute();
  document.getElementById('colInput')?.addEventListener('input', compute);
  const out = document.getElementById('colResult');
  out?.addEventListener('click', (e) => {
    const t = (e.target as HTMLElement).closest('.col-hex') as HTMLElement | null;
    if (!t) return;
    const val = t.dataset.copy || '';
    navigator.clipboard?.writeText(val).then(() => {
      const orig = t.textContent;
      t.textContent = '已复制 ✓';
      setTimeout(() => {
        if (t.textContent === '已复制 ✓') t.textContent = orig;
      }, 900);
    });
  });
}