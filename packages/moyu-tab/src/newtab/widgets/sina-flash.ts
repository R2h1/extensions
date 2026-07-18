import { esc, pad } from '../utils';

export function renderSinaFlashCard(): string {
  return `<div class="widget-card sina-card">
      <div class="sina-head">
        <div class="sina-title">⚡ 7x24快讯</div>
        <div class="sina-meta">
          <span class="sina-upd" id="sinaUpd">加载中…</span>
          <button class="sina-refresh" id="sinaRefresh" title="刷新">↻</button>
        </div>
      </div>
      <div class="sina-list" id="sinaList"><div class="hot-empty">加载中…</div></div>
    </div>`;
}
const SF_KEY = 'moyu_sina_flash_cache';
interface SFItem {
  text: string;
  time: string;
  url?: string;
}
let sfLoading = false;
let sfInited = false;
let sfLastFetch = 0;
function loadSF(): { items: SFItem[]; ts: number } | null {
  try {
    const r = localStorage.getItem(SF_KEY);
    return r ? JSON.parse(r) : null;
  } catch {
    return null;
  }
}
function saveSF(c: { items: SFItem[]; ts: number }) {
  try {
    localStorage.setItem(SF_KEY, JSON.stringify(c));
  } catch {}
}
function fmtSFTime(ts: number) {
  const d = new Date(ts);
  return pad(d.getHours()) + ':' + pad(d.getMinutes());
}
function renderSF(error: boolean) {
  const list = document.getElementById('sinaList');
  const upd = document.getElementById('sinaUpd');
  if (!list) return;
  const c = loadSF();
  if (!c || !c.items.length) {
    list.innerHTML = `<div class="hot-empty">${error ? '⚠ 获取失败 · 点击重试' : '加载中…'}</div>`;
    list.onclick = error ? () => refreshSF() : null;
    if (upd) upd.textContent = error ? '⚠ 失败' : '';
    return;
  }
  list.onclick = null;
  list.innerHTML = c.items
    .slice(0, 15)
    .map((it) => `<div class="sina-row"><span class="sina-time">${esc(it.time)}</span><span class="sina-text">${esc(it.text)}</span></div>`)
    .join('');
  if (upd) upd.textContent = fmtSFTime(c.ts);
}
async function refreshSF() {
  if (sfLoading) return;
  if (!document.getElementById('sinaList')) return;
  const btn = document.getElementById('sinaRefresh');
  sfLoading = true;
  btn?.classList.add('spin');
  try {
    const res = (await chrome.runtime.sendMessage({ type: 'SINA_FLASH_FETCH' })) as
      | { success: boolean; data?: SFItem[]; error?: string }
      | undefined;
    if (res?.success && res.data) {
      saveSF({ items: res.data, ts: Date.now() });
      sfLastFetch = Date.now();
      renderSF(false);
    } else {
      renderSF(true);
    }
  } catch {
    renderSF(true);
  } finally {
    sfLoading = false;
    btn?.classList.remove('spin');
  }
}
function onSFVis() {
  if (document.visibilityState !== 'visible') return;
  if (Date.now() - sfLastFetch > 300000) refreshSF();
}
export async function initSinaFlash() {
  renderSF(false);
  document.getElementById('sinaRefresh')?.addEventListener('click', refreshSF);
  if (sfInited) return;
  sfInited = true;
  refreshSF();
  setInterval(refreshSF, 300000);
  document.addEventListener('visibilitychange', onSFVis);
}

