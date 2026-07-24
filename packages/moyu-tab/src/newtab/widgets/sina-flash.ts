/** 7x24快讯：新浪财经实时快讯（合并进资讯卡，Tab 之一） */
import { esc } from '../utils';

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
function renderSF(error: boolean) {
  const list = document.getElementById('sinaList');
  if (!list) return;
  const c = loadSF();
  if (!c || !c.items.length) {
    list.innerHTML = `<div class="hot-empty">${error ? '⚠ 获取失败 · 点击重试' : '加载中…'}</div>`;
    list.onclick = error ? () => refreshSF() : null;
    return;
  }
  list.onclick = null;
  list.innerHTML = c.items
    .slice(0, 15)
    .map((it) => `<div class="sina-row"><span class="sina-time">${esc(it.time)}</span><span class="sina-text">${esc(it.text)}</span></div>`)
    .join('');
}
export async function refreshSF() {
  if (sfLoading) return;
  if (!document.getElementById('sinaList')) return;
  sfLoading = true;
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
  }
}
function onSFVis() {
  if (document.visibilityState !== 'visible') return;
  if (Date.now() - sfLastFetch > 300000) refreshSF();
}
export async function initSinaFlash() {
  renderSF(false);
  if (sfInited) return;
  sfInited = true;
  refreshSF();
  setInterval(refreshSF, 300000);
  document.addEventListener('visibilitychange', onSFVis);
}
