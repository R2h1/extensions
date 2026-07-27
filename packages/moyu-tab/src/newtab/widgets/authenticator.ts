/** 两步验证器：TOTP/HOTP 动态码，支持 otpauth:// 与 Google Authenticator 迁移链接导入 */
import { esc, escAttr } from '../utils';
import { KeyUtilities, OTPType, OTPAlgorithm } from './otp-core';
import { getOTPAuthPerLineFromOPTAuthMigration } from './otp-migrate';

const KEY = 'moyu_authenticator';

interface OtpEntry {
  id: string;
  issuer: string;
  account: string;
  secret: string;
  type: OTPType;
  period: number;
  digits: number;
  algorithm: OTPAlgorithm;
  counter: number;
}

async function load(): Promise<OtpEntry[]> {
  const r = await chrome.storage.local.get(KEY);
  return (r[KEY] as OtpEntry[]) ?? [];
}
async function save(list: OtpEntry[]) {
  await chrome.storage.local.set({ [KEY]: list });
}

/** crypto.randomUUID 在 Chrome 92+ 可用；MV3 页面为安全上下文，留个兜底以防极旧版本 */
function uuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function genCode(e: OtpEntry): string {
  try {
    return KeyUtilities.generate(e.type, e.secret, e.counter, e.period, e.digits, e.algorithm, 0);
  } catch {
    return '--';
  }
}

/** 解析 otpauth://totp/Issuer:account?secret=...&period=30&digits=6&algorithm=SHA1
 *  逻辑移植自 Authenticator 的 background.ts */
function parseOtpauth(uri: string): OtpEntry | null {
  if (!uri.startsWith('otpauth://')) return null;
  const uri2 = uri.split('otpauth://')[1];
  const typeStr = uri2.substr(0, 4).toLowerCase(); // totp / hotp
  const rest = uri2.substr(5);
  const label = decodeURIComponent(rest.split('?')[0] || '');
  const params = new URLSearchParams(rest.split('?')[1] || '');
  const secret = params.get('secret') || '';
  if (!secret) return null;
  let issuer = params.get('issuer') || '';
  let account = label;
  if (label.includes(':')) {
    issuer = issuer || label.split(':')[0];
    account = label.split(':')[1];
  }
  const period = Number(params.get('period')) || 30;
  const digits = Number(params.get('digits')) || 6;
  const algStr = (params.get('algorithm') || 'SHA1').toUpperCase();
  const algorithm =
    algStr === 'SHA256' ? OTPAlgorithm.SHA256 : algStr === 'SHA512' ? OTPAlgorithm.SHA512 : OTPAlgorithm.SHA1;
  const counter = Number(params.get('counter')) || 0;
  const isHex = /^[0-9a-f]+$/i.test(secret);
  let type: OTPType;
  if (typeStr === 'hotp') type = isHex ? OTPType.hhex : OTPType.hotp;
  else type = isHex ? OTPType.hex : OTPType.totp;
  return { id: uuid(), issuer, account, secret, type, period, digits, algorithm, counter };
}

export function renderAuthenticatorCard(): string {
  return `<div class="widget-card calc-card otp-card">
    <div class="calc-head"><div class="calc-title">🔑 验证器</div></div>
    <div class="otp-list" id="otpList"></div>
    <div class="otp-add">
      <input id="otpInput" class="otp-input" placeholder="粘贴 otpauth:// 链接或密钥" />
      <button class="qr-btn qr-btn-pri" id="otpAdd" type="button">添加</button>
    </div>
  </div>`;
}

let entries: OtpEntry[] = [];
let tick: Record<string, number> = {};
let timerHandle: ReturnType<typeof setInterval> | null = null;

function renderList() {
  const list = document.getElementById('otpList');
  if (!list) return;
  if (!entries.length) {
    list.innerHTML = '<div class="hot-empty">暂无验证项 · 粘贴 otpauth:// 链接添加</div>';
    return;
  }
  list.innerHTML = entries
    .map((e) => {
      const code = genCode(e);
      const isHotp = e.type === OTPType.hotp || e.type === OTPType.hhex;
      const issuer = e.issuer ? esc(e.issuer) : '未命名';
      return `<div class="otp-item" data-id="${escAttr(e.id)}">
      <div class="otp-info"><div class="otp-issuer">${issuer}</div>
      <div class="otp-account">${esc(e.account)}</div></div>
      <div class="otp-code" id="code-${escAttr(e.id)}" title="点击复制">${esc(code)}</div>
      ${isHotp
        ? `<button class="otp-next" data-id="${escAttr(e.id)}" type="button" title="下一个">▶</button>`
        : `<div class="otp-timer" id="timer-${escAttr(e.id)}"></div>`}
      <button class="otp-del" data-id="${escAttr(e.id)}" type="button" title="删除">✕</button>
    </div>`;
    })
    .join('');
}

function refreshTimers() {
  const now = Math.floor(Date.now() / 1000);
  for (const e of entries) {
    if (e.type === OTPType.hotp || e.type === OTPType.hhex) continue;
    const counter = Math.floor(now / e.period);
    const remaining = e.period - (now % e.period);
    const codeEl = document.getElementById('code-' + e.id);
    if (codeEl && tick[e.id] !== counter) {
      tick[e.id] = counter;
      codeEl.textContent = genCode(e);
    }
    const tEl = document.getElementById('timer-' + e.id);
    if (tEl) {
      tEl.textContent = String(remaining);
      tEl.classList.toggle('warn', remaining <= 5);
    }
  }
}

/** 复制验证码并给短暂反馈 */
async function copyCode(id: string) {
  const codeEl = document.getElementById('code-' + id);
  if (!codeEl) return;
  const code = (codeEl.textContent || '').replace(/\s/g, '');
  try {
    await navigator.clipboard.writeText(code);
    codeEl.classList.add('copied');
    setTimeout(() => codeEl.classList.remove('copied'), 1200);
  } catch {}
}

export async function initAuthenticator() {
  // 工具箱弹窗每次打开都会重新调 init，先清掉旧定时器避免累积
  if (timerHandle) clearInterval(timerHandle);

  entries = await load();
  renderList();
  refreshTimers();
  // 定时刷新；弹窗关闭或切到其他工具后自停（otpList 不再在 DOM 中），下次打开由 init 重启
  timerHandle = setInterval(() => {
    const modal = document.getElementById('toolkitModal');
    if (!modal || !modal.classList.contains('open') || !document.getElementById('otpList')) {
      if (timerHandle) clearInterval(timerHandle);
      timerHandle = null;
      return;
    }
    if (document.visibilityState === 'visible') refreshTimers();
  }, 1000);

  const addBtn = document.getElementById('otpAdd')!;
  const input = document.getElementById('otpInput') as HTMLInputElement;
  const doAdd = async () => {
    const v = input.value.trim();
    if (!v) return;
    const added: OtpEntry[] = [];
    if (v.startsWith('otpauth://')) {
      const p = parseOtpauth(v);
      if (p) added.push(p);
    } else if (v.startsWith('otpauth-migration://')) {
      // Google Authenticator 批量迁移
      added.push(
        ...getOTPAuthPerLineFromOPTAuthMigration(v)
          .map((u) => parseOtpauth(u))
          .filter(Boolean) as OtpEntry[],
      );
    } else {
      // 裸 secret：默认 TOTP/SHA1/6位/30s，hex 串自动识别为 hex
      const isHex = /^[0-9a-f]+$/i.test(v);
      added.push({
        id: uuid(),
        issuer: '',
        account: '手动',
        secret: v,
        type: isHex ? OTPType.hex : OTPType.totp,
        period: 30,
        digits: 6,
        algorithm: OTPAlgorithm.SHA1,
        counter: 0,
      });
    }
    if (added.length) {
      entries.push(...added);
      await save(entries);
      input.value = '';
      renderList();
      refreshTimers();
    }
  };
  addBtn.addEventListener('click', doAdd);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') doAdd();
  });

  document.getElementById('otpList')!.addEventListener('click', async (e) => {
    const t = e.target as HTMLElement;
    const id = t.dataset.id;
    if (id) {
      if (t.classList.contains('otp-del')) {
        entries = entries.filter((x) => x.id !== id);
        await save(entries);
        renderList();
        return;
      }
      if (t.classList.contains('otp-next')) {
        const item = entries.find((x) => x.id === id);
        if (!item) return;
        item.counter++;
        await save(entries);
        (document.getElementById('code-' + id)!).textContent = genCode(item);
        return;
      }
    }
    if (t.closest('.otp-code')) {
      const item = t.closest('.otp-item') as HTMLElement | null;
      if (item) await copyCode(item.dataset.id!);
    }
  });
}
