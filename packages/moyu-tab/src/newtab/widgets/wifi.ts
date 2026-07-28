/** WiFi 二维码：填写 SSID/密码/加密方式，生成扫码即连的 WiFi 二维码。
 *  内容格式遵循通用 WIFI: 协议：WIFI:T:<enc>;S:<ssid>;P:<password>;[H:true;];;
 *  特殊字符（\ ; : , "）按规范反斜杠转义，中文 SSID 经 UTF-8 编码进二维码。 */
import { esc, escAttr } from '../utils';
import {
  ensureQrUtf8Bytes,
  makeQr,
  renderQrToCanvas,
  downloadCanvasPng,
  copyCanvasImage,
  type QrInstance,
} from './qr-render';

ensureQrUtf8Bytes();

const WIFI_KEY = 'moyu_wifi_input';

type Enc = 'WPA' | 'WEP' | 'nopass';
interface WifiInput {
  ssid: string;
  password: string;
  enc: Enc;
  hidden: boolean;
}

const ENC_OPTS: { v: Enc; label: string }[] = [
  { v: 'WPA', label: 'WPA/WPA2' },
  { v: 'WEP', label: 'WEP' },
  { v: 'nopass', label: '无密码' },
];

/** 预览区固定显示边长（px） */
const PREVIEW_CSS = 168;

let wifiEnc: Enc = 'WPA';
let lastQr: QrInstance | null = null;

const EYE_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>';
const EYE_OFF_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" y1="2" x2="22" y2="22"/></svg>';

function loadInput(): WifiInput {
  try {
    const r = localStorage.getItem(WIFI_KEY);
    if (r) {
      const d = JSON.parse(r) as Partial<WifiInput>;
      return {
        ssid: d.ssid ?? '',
        password: d.password ?? '',
        enc: d.enc ?? 'WPA',
        hidden: d.hidden ?? false,
      };
    }
  } catch {}
  return { ssid: '', password: '', enc: 'WPA', hidden: false };
}
function saveInput(d: WifiInput) {
  try {
    localStorage.setItem(WIFI_KEY, JSON.stringify(d));
  } catch {}
}

function encLabel(v: Enc): string {
  return ENC_OPTS.find((o) => o.v === v)?.label || v;
}

/** 转义 WiFi 串中的特殊字符（\ ; : , " 前加反斜杠） */
function escapeWifi(s: string): string {
  return s.replace(/([\\;:,"])/g, '\\$1');
}

/** 构造 WIFI: 二维码内容 */
function buildWifiString(d: WifiInput): string {
  const parts = [`T:${d.enc}`, `S:${escapeWifi(d.ssid)}`];
  if (d.enc !== 'nopass') parts.push(`P:${escapeWifi(d.password)}`);
  if (d.hidden) parts.push('H:true');
  return `WIFI:${parts.join(';')};;`;
}

export function renderWifiCard(): string {
  const d = loadInput();
  wifiEnc = d.enc;
  return `<div class="widget-card calc-card wifi-card">
      <div class="calc-head"><div class="calc-title">WiFi 二维码</div></div>
      <div class="calc-form">
        <div class="calc-field">
          <span>WiFi 名称 (SSID)</span>
          <input type="text" id="wfSsid" class="wf-input" placeholder="例如 MyHome_5G" value="${escAttr(d.ssid)}" autocomplete="off"/>
        </div>
        <div class="calc-field wf-pw-field" id="wfPwField">
          <span>密码</span>
          <div class="wf-pw-wrap">
            <input type="password" id="wfPw" class="wf-input" placeholder="WiFi 密码" value="${escAttr(d.password)}" autocomplete="new-password"/>
            <button class="wf-eye" id="wfEye" type="button" title="显示/隐藏密码">${EYE_SVG}</button>
          </div>
        </div>
        <div class="calc-field">
          <span>加密方式</span>
          <div class="cal-dd wf-dd" id="wfEncDD">
            <button class="cal-dd-btn" type="button"><span class="cal-dd-val">${encLabel(wifiEnc)}</span><span class="cal-dd-arrow">▾</span></button>
            <div class="cal-dd-list" id="wfEncList"></div>
          </div>
        </div>
        <label class="wf-hidden">
          <input type="checkbox" id="wfHidden" ${d.hidden ? 'checked' : ''}/>
          <span class="wf-switch"><span class="wf-switch-knob"></span></span>
          <span class="wf-hidden-txt">隐藏网络</span>
        </label>
      </div>
      <div class="qr-stage wf-stage" id="wfStage">
        <canvas id="wfCanvas" class="qr-canvas" hidden></canvas>
        <div class="qr-empty" id="wfEmpty">填写信息生成 WiFi 二维码</div>
        <div class="qr-err" id="wfErr" style="display:none"></div>
      </div>
      <div class="qr-actions wf-actions">
        <button class="qr-btn qr-btn-pri" id="wfDownload" type="button" disabled>下载 PNG</button>
        <button class="qr-btn qr-btn-ghost" id="wfCopy" type="button" disabled>复制图片</button>
      </div>
      <p class="wf-note">扫码后手机将自动连接 WiFi（iOS 11+ / 安卓大部分系统）</p>
    </div>`;
}

/** 下拉框（复用 .cal-dd 同款）：点击展开、外部收起、互斥 */
function closeWfDDs(): void {
  document.querySelectorAll('.wf-dd.open').forEach((dd) => dd.classList.remove('open'));
}
let wfDocCloseBound = false;
function buildWfDropdown(
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
    closeWfDDs();
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
  if (!wfDocCloseBound) {
    wfDocCloseBound = true;
    document.addEventListener('click', closeWfDDs);
  }
}
function syncWfDD(ddId: string, value: string, label: string): void {
  const dd = document.getElementById(ddId);
  if (!dd) return;
  const valEl = dd.querySelector('.cal-dd-val');
  if (valEl) valEl.textContent = label;
  dd.querySelectorAll('.cal-dd-opt').forEach((o) =>
    o.classList.toggle('active', (o as HTMLElement).dataset.v === value),
  );
}

function setBtn(id: string, on: boolean): void {
  const b = document.getElementById(id) as HTMLButtonElement | null;
  if (b) b.disabled = !on;
}

function readInput(): WifiInput {
  const ssid = (document.getElementById('wfSsid') as HTMLInputElement | null)?.value ?? '';
  const password = (document.getElementById('wfPw') as HTMLInputElement | null)?.value ?? '';
  const hidden = (document.getElementById('wfHidden') as HTMLInputElement | null)?.checked ?? false;
  return { ssid, password, enc: wifiEnc, hidden };
}

/** nopass 时隐藏密码字段 */
function syncPwField(): void {
  const field = document.getElementById('wfPwField');
  if (field) field.style.display = wifiEnc === 'nopass' ? 'none' : '';
}

function generate(): void {
  const canvas = document.getElementById('wfCanvas') as HTMLCanvasElement | null;
  const empty = document.getElementById('wfEmpty');
  const err = document.getElementById('wfErr');
  if (!canvas) return;
  const d = readInput();
  saveInput(d);
  syncPwField();

  // 校验：无 SSID -> 空状态；需要密码但为空 -> 提示
  if (!d.ssid.trim()) {
    lastQr = null;
    canvas.hidden = true;
    if (empty) {
      empty.textContent = '填写信息生成 WiFi 二维码';
      empty.style.display = '';
    }
    if (err) err.style.display = 'none';
    setBtn('wfDownload', false);
    setBtn('wfCopy', false);
    return;
  }
  if (d.enc !== 'nopass' && !d.password) {
    lastQr = null;
    canvas.hidden = true;
    if (empty) empty.style.display = 'none';
    if (err) {
      err.textContent = '请输入 WiFi 密码';
      err.style.display = '';
    }
    setBtn('wfDownload', false);
    setBtn('wfCopy', false);
    return;
  }

  lastQr = makeQr(buildWifiString(d), 'M');
  if (!lastQr) {
    canvas.hidden = true;
    if (empty) empty.style.display = 'none';
    if (err) {
      err.textContent = '内容过长，无法生成';
      err.style.display = '';
    }
    setBtn('wfDownload', false);
    setBtn('wfCopy', false);
    return;
  }
  // 预览：固定显示尺寸，按 dpr 提高内部分辨率保持清晰
  const dpr = window.devicePixelRatio || 1;
  renderQrToCanvas(canvas, lastQr, PREVIEW_CSS * dpr, '#000000', '#ffffff');
  canvas.style.width = PREVIEW_CSS + 'px';
  canvas.hidden = false;
  if (empty) empty.style.display = 'none';
  if (err) err.style.display = 'none';
  setBtn('wfDownload', true);
  setBtn('wfCopy', true);
}

/** 导出用临时 canvas：固定 320px 输出 */
function exportCanvas(): HTMLCanvasElement | null {
  if (!lastQr) return null;
  const tmp = document.createElement('canvas');
  renderQrToCanvas(tmp, lastQr, 320, '#000000', '#ffffff');
  return tmp;
}

export function initWifi(): void {
  syncPwField();
  generate();
  document.getElementById('wfSsid')?.addEventListener('input', generate);
  document.getElementById('wfPw')?.addEventListener('input', generate);
  document.getElementById('wfHidden')?.addEventListener('change', generate);
  document.getElementById('wfEye')?.addEventListener('click', () => {
    const pw = document.getElementById('wfPw') as HTMLInputElement | null;
    const eye = document.getElementById('wfEye');
    if (!pw || !eye) return;
    const show = pw.type === 'password';
    pw.type = show ? 'text' : 'password';
    eye.innerHTML = show ? EYE_OFF_SVG : EYE_SVG;
    eye.classList.toggle('on', show);
  });
  buildWfDropdown('wfEncDD', ENC_OPTS as { v: string; label: string }[], wifiEnc, (v) => {
    wifiEnc = v as Enc;
    syncWfDD('wfEncDD', v, encLabel(wifiEnc));
    generate();
  });
  document.getElementById('wfDownload')?.addEventListener('click', () => {
    const tmp = exportCanvas();
    if (tmp) downloadCanvasPng(tmp, 'wifi.png');
  });
  document.getElementById('wfCopy')?.addEventListener('click', () => {
    const tmp = exportCanvas();
    const btn = document.getElementById('wfCopy') as HTMLButtonElement | null;
    if (tmp && btn) void copyCanvasImage(tmp, btn);
  });
}
