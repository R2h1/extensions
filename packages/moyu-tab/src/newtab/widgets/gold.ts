/** 金价卡片：SW 代理抓取，1 分钟刷新 */
import { pad } from '../utils';

const GOLD_KEY = 'moyu_gold_cache';
interface GoldPrice {
  ounce: string;
  gram: string;
  tola: string;
}
interface GoldCache {
  gram: number;
  usdOunce: number;
  ts: number;
  prevGram: number;
}
let goldInited = false;
let goldLoading = false;

export function renderGoldCard(): string {
  return `<div class="widget-card gold-card">
      <div class="gold-head">
        <div class="gold-title">◆ 实时金价</div>
        <div class="gold-meta">
          <span class="gold-upd" id="goldUpd">加载中…</span>
          <button class="gold-refresh" id="goldRefresh" title="刷新">↻</button>
        </div>
      </div>
      <div class="gold-main">
        <span class="gold-amount" id="goldGram">¥--</span>
        <span class="gold-unit">元/克</span>
      </div>
      <div class="gold-sub">
        <div class="gold-sub-i"><span>美元/盎司</span><span id="goldUsd">$--</span></div>
        <div class="gold-delta flat" id="goldDelta">实时</div>
      </div>
    </div>`;
}

function loadGoldCache(): GoldCache | null {
  try {
    const raw = localStorage.getItem(GOLD_KEY);
    return raw ? (JSON.parse(raw) as GoldCache) : null;
  } catch {
    return null;
  }
}
function saveGoldCache(c: GoldCache) {
  try {
    localStorage.setItem(GOLD_KEY, JSON.stringify(c));
  } catch {}
}
function fmtGoldMoney(v: number, prefix: string) {
  return prefix + v.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmtGoldTime(ts: number) {
  const d = new Date(ts);
  return pad(d.getHours()) + ':' + pad(d.getMinutes());
}
function renderGold(c: GoldCache | null, error: boolean) {
  const gramEl = document.getElementById('goldGram');
  const usdEl = document.getElementById('goldUsd');
  const updEl = document.getElementById('goldUpd');
  const deltaEl = document.getElementById('goldDelta');
  if (!c) {
    if (gramEl) gramEl.textContent = error ? '获取失败' : '¥--';
    if (updEl) updEl.textContent = error ? '⚠ 失败 · 点刷新重试' : '加载中…';
    return;
  }
  if (gramEl) gramEl.textContent = fmtGoldMoney(c.gram, '¥');
  if (usdEl) usdEl.textContent = fmtGoldMoney(c.usdOunce, '$');
  if (updEl) updEl.textContent = (error ? '⚠ 更新失败 · ' : '') + fmtGoldTime(c.ts) + ' 更新';
  if (deltaEl) {
    if (c.prevGram > 0) {
      const diff = c.gram - c.prevGram;
      const pct = (diff / c.prevGram) * 100;
      if (Math.abs(diff) < 0.005) {
        deltaEl.className = 'gold-delta flat';
        deltaEl.textContent = '- 持平';
      } else {
        const up = diff > 0;
        deltaEl.className = 'gold-delta ' + (up ? 'up' : 'down');
        deltaEl.textContent =
          (up ? '▲ +' : '▼ ') + diff.toFixed(2) + ' (' + (up ? '+' : '') + pct.toFixed(2) + '%)';
      }
    } else {
      deltaEl.className = 'gold-delta flat';
      deltaEl.textContent = '实时';
    }
  }
}
async function fetchGold(): Promise<{ cny: GoldPrice; usd: GoldPrice }> {
  // 接口无 CORS 头，由 background SW 凭 host_permissions 绕过跨域
  const res = (await chrome.runtime.sendMessage({ type: 'GOLD_FETCH' })) as
    | {
        success: boolean;
        data?: { cny: GoldPrice; usd: GoldPrice };
        error?: string;
      }
    | undefined;
  if (!res?.success || !res.data) throw new Error(res?.error || 'fetch failed');
  return res.data;
}
async function refreshGold() {
  if (goldLoading) return;
  if (!document.getElementById('goldGram')) return;
  const btn = document.getElementById('goldRefresh');
  goldLoading = true;
  btn?.classList.add('spin');
  try {
    const prev = loadGoldCache();
    const r = await fetchGold();
    const c: GoldCache = {
      gram: parseFloat(r.cny.gram),
      usdOunce: parseFloat(r.usd.ounce),
      ts: Date.now(),
      prevGram: prev?.gram ?? 0,
    };
    renderGold(c, false);
    saveGoldCache(c);
  } catch {
    renderGold(loadGoldCache(), true);
  } finally {
    goldLoading = false;
    btn?.classList.remove('spin');
  }
}
function onGoldVis() {
  if (document.visibilityState !== 'visible') return;
  const c = loadGoldCache();
  if (!c || Date.now() - c.ts > 60000) refreshGold();
}
export function initGold() {
  renderGold(loadGoldCache(), false);
  document.getElementById('goldRefresh')?.addEventListener('click', refreshGold);
  if (goldInited) return;
  goldInited = true;
  refreshGold();
  setInterval(refreshGold, 60000);
  document.addEventListener('visibilitychange', onGoldVis);
}
