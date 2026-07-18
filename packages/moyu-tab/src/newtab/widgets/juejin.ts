import { esc, pad } from '../utils';

export function renderJuejinCard(): string {
  return `<div class="widget-card hot-card">
      <div class="hot-head">
        <div class="hot-title">📦 掘金热榜</div>
        <div class="hot-meta">
          <span class="hot-upd" id="juejinUpd"></span>
          <button class="hot-swap" id="juejinSwap" title="换一换">换一换 <i id="juejinPage">1/3</i></button>
        </div>
      </div>
      <div class="hot-list" id="juejinList"><div class="hot-empty">加载中…</div></div>
    </div>`;
}
const JJ_KEY = 'moyu_juejin_cache';
interface JJItem {
  title: string;
  url: string;
  hot: string;
}
let jjLoading = false;
let jjInited = false;
let jjLastFetch = 0;
let jjPage = 0;
function loadJJ(): { items: JJItem[]; ts: number } | null {
  try {
    const r = localStorage.getItem(JJ_KEY);
    return r ? JSON.parse(r) : null;
  } catch {
    return null;
  }
}
function saveJJ(c: { items: JJItem[]; ts: number }) {
  try {
    localStorage.setItem(JJ_KEY, JSON.stringify(c));
  } catch {}
}
function fmtJJTime(ts: number) {
  const d = new Date(ts);
  return pad(d.getHours()) + ':' + pad(d.getMinutes());
}
function renderJJ(error: boolean) {
  const list = document.getElementById('juejinList');
  const upd = document.getElementById('juejinUpd');
  const pageEl = document.getElementById('juejinPage');
  if (!list) return;
  const c = loadJJ();
  if (!c || !c.items.length) {
    list.innerHTML = `<div class="hot-empty">${error ? '⚠ 获取失败 · 点击重试' : '加载中…'}</div>`;
    list.onclick = error ? () => refreshJJ() : null;
    if (upd) upd.textContent = error ? '⚠ 失败' : '';
    return;
  }
  list.onclick = null;
  const total = Math.min(3, Math.ceil(c.items.length / 10) || 1);
  jjPage = jjPage % total;
  const slice = c.items.slice(jjPage * 10, jjPage * 10 + 10);
  list.innerHTML = slice
    .map((it, i) => {
      const rank = jjPage * 10 + i + 1;
      const top = rank <= 3 ? ' top' : '';
      return `<a class="hot-row" href="${it.url}" target="_blank" rel="noopener"><span class="hot-rank${top}">${rank}</span><span class="hot-title">${esc(it.title)}</span>${it.hot ? `<span class="hot-num">${it.hot}</span>` : ''}</a>`;
    })
    .join('');
  if (pageEl) pageEl.textContent = `${jjPage + 1}/${total}`;
  if (upd) upd.textContent = fmtJJTime(c.ts);
}
function swapJJ() {
  const c = loadJJ();
  if (!c) return;
  const total = Math.min(3, Math.ceil(c.items.length / 10) || 1);
  jjPage = (jjPage + 1) % total;
  renderJJ(false);
}
async function refreshJJ() {
  if (jjLoading) return;
  if (!document.getElementById('juejinList')) return;
  jjLoading = true;
  try {
    const res = (await chrome.runtime.sendMessage({ type: 'JUEJIN_FETCH' })) as
      | { success: boolean; data?: JJItem[]; error?: string }
      | undefined;
    if (res?.success && res.data) {
      saveJJ({ items: res.data, ts: Date.now() });
      jjLastFetch = Date.now();
      renderJJ(false);
    } else {
      renderJJ(true);
    }
  } catch {
    renderJJ(true);
  } finally {
    jjLoading = false;
  }
}
function onJJVis() {
  if (document.visibilityState !== 'visible') return;
  if (Date.now() - jjLastFetch > 300000) refreshJJ();
}
export async function initJuejin() {
  renderJJ(false);
  document.getElementById('juejinSwap')?.addEventListener('click', swapJJ);
  if (jjInited) return;
  jjInited = true;
  refreshJJ();
  setInterval(refreshJJ, 300000);
  document.addEventListener('visibilitychange', onJJVis);
}

