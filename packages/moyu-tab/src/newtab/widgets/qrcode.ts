/** 二维码生成器：文本/链接 -> Canvas，可调容错/尺寸/颜色，下载 PNG / 复制图片 */
import qrcode from 'qrcode-generator';
import { esc, escAttr } from '../utils';

const QR_KEY = 'moyu_qrcode_input';

type EC = 'L' | 'M' | 'Q' | 'H';
interface QrInput {
  text: string;
  ec: EC;
  size: number;
  fg: string;
  bg: string;
}

const SIZES: [number, string][] = [
  [192, 'S'],
  [256, 'M'],
  [320, 'L'],
  [448, 'XL'],
];

const EC_OPTS: { v: EC; label: string }[] = [
  { v: 'L', label: 'L · 低' },
  { v: 'M', label: 'M · 中' },
  { v: 'Q', label: 'Q · 高' },
  { v: 'H', label: 'H · 最高' },
];
const SIZE_OPTS: { v: string; label: string }[] = SIZES.map(([n, l]) => ({
  v: String(n),
  label: `${l} · ${n}`,
}));
function ecLabel(v: EC): string {
  return EC_OPTS.find((o) => o.v === v)?.label || v;
}
function sizeLabel(v: number): string {
  return SIZE_OPTS.find((o) => o.v === String(v))?.label || String(v);
}

let qrEc: EC = 'M';
let qrSize = 320;
let qrFg = '#000000';
let qrBg = '#ffffff';
let lastQr: ReturnType<typeof qrcode> | null = null;

/** 预览区固定显示边长（px）；尺寸选项只作用于下载/复制的输出，不影响预览 */
const PREVIEW_CSS = 152;

function loadInput(): QrInput {
  try {
    const r = localStorage.getItem(QR_KEY);
    if (r) {
      const d = JSON.parse(r) as Partial<QrInput>;
      return {
        text: d.text ?? '',
        ec: d.ec ?? 'M',
        size: d.size ?? 320,
        fg: d.fg ?? '#000000',
        bg: d.bg ?? '#ffffff',
      };
    }
  } catch {}
  return { text: '', ec: 'M', size: 320, fg: '#000000', bg: '#ffffff' };
}
function saveInput(d: QrInput) {
  try {
    localStorage.setItem(QR_KEY, JSON.stringify(d));
  } catch {}
}

/** UTF-8 编码：库默认仅取低字节（c & 0xff），会损坏中文等多字节字符 */
function utf8Bytes(s: string): number[] {
  const b: number[] = [];
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    if (c < 0x80) b.push(c);
    else if (c < 0x800) b.push(0xc0 | (c >> 6), 0x80 | (c & 0x3f));
    else if (c >= 0xd800 && c <= 0xdbff) {
      // 高位代理：拼成 4 字节
      const c2 = s.charCodeAt(++i);
      const cp = 0x10000 + ((c & 0x3ff) << 10) + (c2 & 0x3ff);
      b.push(
        0xf0 | (cp >> 18),
        0x80 | ((cp >> 12) & 0x3f),
        0x80 | ((cp >> 6) & 0x3f),
        0x80 | (cp & 0x3f),
      );
    } else b.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 0x3f), 0x80 | (c & 0x3f));
  }
  return b;
}
// 覆盖库默认 Latin-1 编码，使中文/Emoji 正确编码进二维码
qrcode.stringToBytes = utf8Bytes;

export function renderQrCard(): string {
  const d = loadInput();
  qrEc = d.ec;
  qrSize = d.size;
  return `<div class="widget-card calc-card qr-card">
      <div class="calc-head"><div class="calc-title">二维码生成器</div></div>
      <div class="calc-form">
        <div class="qr-text-wrap">
          <textarea id="qrText" class="qr-text" rows="3" placeholder="输入文本或链接，自动生成二维码">${esc(d.text)}</textarea>
          <button class="qr-paste" id="qrPaste" type="button" title="从剪贴板粘贴">粘贴</button>
        </div>
        <div class="qr-dd-row">
          <div class="calc-field qr-dd-field">
            <span>容错</span>
            <div class="cal-dd qr-dd" id="qrEcDD">
              <button class="cal-dd-btn" type="button"><span class="cal-dd-val">${ecLabel(qrEc)}</span><span class="cal-dd-arrow">▾</span></button>
              <div class="cal-dd-list" id="qrEcList"></div>
            </div>
          </div>
          <div class="calc-field qr-dd-field">
            <span>尺寸</span>
            <div class="cal-dd qr-dd" id="qrSizeDD">
              <button class="cal-dd-btn" type="button"><span class="cal-dd-val">${sizeLabel(qrSize)}</span><span class="cal-dd-arrow">▾</span></button>
              <div class="cal-dd-list" id="qrSizeList"></div>
            </div>
          </div>
        </div>
        <div class="qr-row"><span class="qr-label">颜色</span>
          <div class="qr-colors">
            <label class="qr-color"><input type="color" id="qrFg" value="${escAttr(d.fg)}"/><span>${d.fg.toUpperCase()}</span></label>
            <label class="qr-color"><input type="color" id="qrBg" value="${escAttr(d.bg)}"/><span>${d.bg.toUpperCase()}</span></label>
            <button class="qr-swap" id="qrSwap" type="button" title="互换前后景色">⇄</button>
          </div>
        </div>
      </div>
      <div class="qr-stage" id="qrStage">
        <canvas id="qrCanvas" class="qr-canvas" hidden></canvas>
        <div class="qr-empty" id="qrEmpty">输入内容生成二维码</div>
        <div class="qr-err" id="qrErr" style="display:none">内容过长，无法生成</div>
      </div>
      <div class="qr-actions">
        <button class="qr-btn qr-btn-pri" id="qrDownload" type="button" disabled>下载 PNG</button>
        <button class="qr-btn qr-btn-ghost" id="qrCopy" type="button" disabled>复制图片</button>
      </div>
    </div>`;
}

function currentEc(): EC {
  return qrEc;
}
function currentSize(): number {
  return qrSize;
}

/** 下拉框（复用日历/汇率同款 .cal-dd）：点击展开、外部收起、互斥 */
function closeQrDDs(): void {
  document.querySelectorAll('.qr-dd.open').forEach((dd) => dd.classList.remove('open'));
}
let qrDocCloseBound = false;
function buildQrDropdown(
  ddId: string,
  opts: { v: string; label: string }[],
  current: string,
  onChange: (v: string) => void,
): void {
  const dd = document.getElementById(ddId);
  if (!dd) return;
  const list = dd.querySelector('.cal-dd-list');
  if (list && !list.children.length) {
    list.innerHTML = opts
      .map(
        (o) =>
          `<div class="cal-dd-opt${o.v === current ? ' active' : ''}" data-v="${o.v}">${o.label}</div>`,
      )
      .join('');
  }
  const btn = dd.querySelector('.cal-dd-btn');
  btn?.addEventListener('click', (e) => {
    e.stopPropagation();
    const wasOpen = dd.classList.contains('open');
    closeQrDDs();
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
  if (!qrDocCloseBound) {
    qrDocCloseBound = true;
    document.addEventListener('click', closeQrDDs);
  }
}
function syncQrDD(ddId: string, value: string, label: string): void {
  const dd = document.getElementById(ddId);
  if (!dd) return;
  const valEl = dd.querySelector('.cal-dd-val');
  if (valEl) valEl.textContent = label;
  dd.querySelectorAll('.cal-dd-opt').forEach((o) =>
    o.classList.toggle('active', (o as HTMLElement).dataset.v === value),
  );
}

function syncColorTxt(): void {
  const f = document.getElementById('qrFg') as HTMLInputElement | null;
  const b = document.getElementById('qrBg') as HTMLInputElement | null;
  f?.parentElement?.querySelector('span')?.replaceChildren(f.value.toUpperCase());
  b?.parentElement?.querySelector('span')?.replaceChildren(b.value.toUpperCase());
}
function setBtn(id: string, on: boolean): void {
  const b = document.getElementById(id) as HTMLButtonElement | null;
  if (b) b.disabled = !on;
}

/** 把已生成的 qr 渲染到 canvas，targetPx 为目标像素边长（cell 取整保证模块锐利） */
function renderTo(canvas: HTMLCanvasElement, targetPx: number, fg: string, bg: string): void {
  if (!lastQr) return;
  const count = lastQr.getModuleCount();
  const margin = 4; // 静默区，保证可扫描
  const total = count + margin * 2;
  const cell = Math.max(1, Math.floor(targetPx / total));
  const dim = cell * total;
  canvas.width = dim;
  canvas.height = dim;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, dim, dim);
  ctx.fillStyle = fg;
  for (let r = 0; r < count; r++) {
    for (let c = 0; c < count; c++) {
      if (lastQr.isDark(r, c)) ctx.fillRect((c + margin) * cell, (r + margin) * cell, cell, cell);
    }
  }
}

function generate(): void {
  const tEl = document.getElementById('qrText') as HTMLTextAreaElement | null;
  const canvas = document.getElementById('qrCanvas') as HTMLCanvasElement | null;
  const empty = document.getElementById('qrEmpty');
  const err = document.getElementById('qrErr');
  if (!tEl || !canvas) return;
  const text = tEl.value;
  const ec = currentEc();
  const size = currentSize();
  const fEl = document.getElementById('qrFg') as HTMLInputElement | null;
  const bEl = document.getElementById('qrBg') as HTMLInputElement | null;
  qrFg = fEl?.value || '#000000';
  qrBg = bEl?.value || '#ffffff';
  saveInput({ text, ec, size, fg: qrFg, bg: qrBg });
  syncColorTxt();

  if (!text.trim()) {
    lastQr = null;
    canvas.hidden = true;
    if (empty) empty.style.display = '';
    if (err) err.style.display = 'none';
    setBtn('qrDownload', false);
    setBtn('qrCopy', false);
    return;
  }
  try {
    const qr = qrcode(0, ec);
    qr.addData(text);
    qr.make();
    lastQr = qr;
  } catch {
    lastQr = null;
    canvas.hidden = true;
    if (empty) empty.style.display = 'none';
    if (err) err.style.display = '';
    setBtn('qrDownload', false);
    setBtn('qrCopy', false);
    return;
  }
  // 预览：固定显示尺寸，按 dpr 提高内部分辨率保持清晰；与尺寸选项无关
  const dpr = window.devicePixelRatio || 1;
  renderTo(canvas, PREVIEW_CSS * dpr, qrFg, qrBg);
  canvas.style.width = PREVIEW_CSS + 'px';
  canvas.hidden = false;
  if (empty) empty.style.display = 'none';
  if (err) err.style.display = 'none';
  setBtn('qrDownload', true);
  setBtn('qrCopy', true);
}

/** 导出用临时 canvas：按尺寸选项渲染，不依赖预览 canvas */
function exportCanvas(): HTMLCanvasElement | null {
  if (!lastQr) return null;
  const tmp = document.createElement('canvas');
  renderTo(tmp, currentSize(), qrFg, qrBg);
  return tmp;
}

function download(): void {
  const tmp = exportCanvas();
  if (!tmp) return;
  const a = document.createElement('a');
  a.download = 'qrcode.png';
  a.href = tmp.toDataURL('image/png');
  a.click();
}

async function copyImage(): Promise<void> {
  const tmp = exportCanvas();
  const btn = document.getElementById('qrCopy') as HTMLButtonElement | null;
  if (!tmp) return;
  const blob = await new Promise<Blob | null>((res) => tmp.toBlob(res, 'image/png'));
  if (!blob) return;
  const ok = await (async () => {
    try {
      if (navigator.clipboard && typeof ClipboardItem !== 'undefined') {
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
        return true;
      }
    } catch {}
    return false;
  })();
  if (!btn) return;
  const old = btn.textContent;
  btn.textContent = ok ? '✓ 已复制' : '复制失败';
  setTimeout(() => (btn.textContent = old), 1500);
}

async function paste(): Promise<void> {
  const tEl = document.getElementById('qrText') as HTMLTextAreaElement | null;
  if (!tEl) return;
  try {
    const text = await navigator.clipboard.readText();
    if (text) {
      tEl.value = text;
      generate();
    }
  } catch {}
}

export function initQr(): void {
  generate();
  document.getElementById('qrText')?.addEventListener('input', generate);
  document.getElementById('qrFg')?.addEventListener('input', generate);
  document.getElementById('qrBg')?.addEventListener('input', generate);
  document.getElementById('qrSwap')?.addEventListener('click', () => {
    const f = document.getElementById('qrFg') as HTMLInputElement | null;
    const b = document.getElementById('qrBg') as HTMLInputElement | null;
    if (!f || !b) return;
    const tmp = f.value;
    f.value = b.value;
    b.value = tmp;
    generate();
  });
  document.getElementById('qrPaste')?.addEventListener('click', () => void paste());
  document.getElementById('qrDownload')?.addEventListener('click', download);
  document.getElementById('qrCopy')?.addEventListener('click', () => void copyImage());
  buildQrDropdown('qrEcDD', EC_OPTS as { v: string; label: string }[], qrEc, (v) => {
    qrEc = v as EC;
    syncQrDD('qrEcDD', v, ecLabel(qrEc));
    generate();
  });
  buildQrDropdown('qrSizeDD', SIZE_OPTS, String(qrSize), (v) => {
    qrSize = Number(v);
    syncQrDD('qrSizeDD', v, sizeLabel(qrSize));
    generate();
  });
}
