import { esc, escAttr } from '../utils';

// 热搜平台：微博 / B站 / 百度 / 掘金 合并为单卡片，Tab 切换
export const HOT_PLATFORMS: {
  platform: string;
  name: string;
  msg: { type: string; platform?: string };
}[] = [
  { platform: 'weibo', name: '微博', msg: { type: 'HOT_FETCH', platform: 'weibo' } },
  { platform: 'bilibili', name: 'B站', msg: { type: 'HOT_FETCH', platform: 'bilibili' } },
  { platform: 'baidu', name: '百度', msg: { type: 'HOT_FETCH', platform: 'baidu' } },
  { platform: 'juejin', name: '掘金', msg: { type: 'JUEJIN_FETCH' } },
];

let hotActive = HOT_PLATFORMS[0].platform;

export function renderHotCard(): string {
  const tabs = HOT_PLATFORMS.map(
    (p) =>
      `<button class="hot-tab${p.platform === hotActive ? ' active' : ''}" data-platform="${p.platform}">${p.name}</button>`,
  ).join('');
  return `<div class="widget-card hot-card">
      <div class="hot-head">
        <div class="hot-tabs">${tabs}</div>
        <div class="hot-meta">
          <button class="hot-refresh" id="hotRefresh" title="刷新">↻</button>
          <button class="hot-swap" id="hotSwap" title="换一换">换一换 <i id="hotPage">1/3</i></button>
        </div>
      </div>
      <div class="hot-list" id="hotList"><div class="hot-empty">加载中…</div></div>
    </div>`;
}
const HC_KEY = 'moyu_hot_cache';
interface HItem {
  title: string;
  hot: string;
  url: string;
  tag?: string;
}
const hotLoading: Record<string, boolean> = {};
const hotLastFetch: Record<string, number> = {};
const hotInited: Record<string, boolean> = {};
const hotPage: Record<string, number> = {};
function loadHotCache(): Record<string, { items: HItem[]; ts: number }> {
  try {
    const raw = localStorage.getItem(HC_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}
function saveHotCache(c: Record<string, { items: HItem[]; ts: number }>) {
  try {
    localStorage.setItem(HC_KEY, JSON.stringify(c));
  } catch {}
}
function renderHotList(platform: string, error: boolean) {
  // 仅刷新当前激活平台的 DOM；其余平台只更新缓存，切 Tab 时再渲染
  if (platform !== hotActive) return;
  const list = document.getElementById('hotList');
  const pageEl = document.getElementById('hotPage');
  if (!list) return;
  const cache = loadHotCache();
  const c = cache[platform];
  if (!c || !c.items.length) {
    list.innerHTML = `<div class="hot-empty">${error ? '⚠ 获取失败 · 点击 ↻ 重试' : '加载中…'}</div>`;
    return;
  }
  const total = Math.min(3, Math.ceil(c.items.length / 10) || 1);
  const page = (hotPage[platform] || 0) % total;
  const slice = c.items.slice(page * 10, page * 10 + 10);
  list.innerHTML = slice
    .map((it, i) => {
      const rank = page * 10 + i + 1;
      return `<a class="hot-row" href="${it.url}" target="_blank" rel="noopener"><span class="hot-rank${rank <= 3 ? ' top' : ''}">${rank}</span><span class="hot-title"><span class="hot-title-text" title="${escAttr(it.title)}">${esc(it.title)}</span>${it.tag ? `<i class="hot-tag">${esc(it.tag)}</i>` : ''}</span>${it.hot ? `<span class="hot-num">${esc(it.hot)}</span>` : ''}</a>`;
    })
    .join('');
  if (pageEl) pageEl.textContent = page + 1 + '/' + total;
}
function swapHotPage() {
  const cache = loadHotCache();
  const c = cache[hotActive];
  if (!c || !c.items.length) return;
  const total = Math.min(3, Math.ceil(c.items.length / 10) || 1);
  hotPage[hotActive] = ((hotPage[hotActive] || 0) + 1) % total;
  renderHotList(hotActive, false);
}
async function refreshHot(platform: string) {
  if (hotLoading[platform]) return;
  if (!document.getElementById('hotList')) return;
  hotLoading[platform] = true;
  try {
    const spec = HOT_PLATFORMS.find((x) => x.platform === platform);
    const res = (await chrome.runtime.sendMessage(
      spec?.msg ?? { type: 'HOT_FETCH', platform },
    )) as | { success: boolean; data?: HItem[]; error?: string } | undefined;
    if (res?.success && res.data) {
      const cache = loadHotCache();
      cache[platform] = { items: res.data, ts: Date.now() };
      saveHotCache(cache);
      hotLastFetch[platform] = Date.now();
      renderHotList(platform, false);
    } else {
      renderHotList(platform, true);
    }
  } catch {
    renderHotList(platform, true);
  } finally {
    hotLoading[platform] = false;
  }
}
async function refreshActive() {
  if (hotLoading[hotActive]) return;
  const btn = document.getElementById('hotRefresh');
  btn?.classList.add('spin');
  try {
    await refreshHot(hotActive);
  } finally {
    btn?.classList.remove('spin');
  }
}
function onHotVis(platform: string) {
  if (document.visibilityState !== 'visible') return;
  if (Date.now() - (hotLastFetch[platform] || 0) > 300000) refreshHot(platform);
}
function ensureHotInit(platform: string) {
  if (hotInited[platform]) return;
  hotInited[platform] = true;
  refreshHot(platform);
  setInterval(() => refreshHot(platform), 300000);
  document.addEventListener('visibilitychange', () => onHotVis(platform));
}
function switchHot(platform: string) {
  if (platform === hotActive) return;
  hotActive = platform;
  document.querySelectorAll('.hot-tab[data-platform]').forEach((t) =>
    t.classList.toggle('active', (t as HTMLElement).dataset.platform === platform),
  );
  renderHotList(platform, false);
}
export async function initHotCard() {
  renderHotList(hotActive, false);
  document.getElementById('hotSwap')?.addEventListener('click', swapHotPage);
  document.getElementById('hotRefresh')?.addEventListener('click', refreshActive);
  document
    .querySelectorAll('.hot-tab[data-platform]')
    .forEach((t) =>
      t.addEventListener('click', () => switchHot((t as HTMLElement).dataset.platform!)),
    );
  // 各平台均初始化（拉取 + 定时刷新 + 可见性补刷），保证切 Tab 即有数据
  HOT_PLATFORMS.forEach((p) => ensureHotInit(p.platform));
}
