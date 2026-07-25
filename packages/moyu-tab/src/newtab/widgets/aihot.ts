/** AI精选：AI HOT 公开 API 过去 24h 精选，分页列表（合并进资讯卡，Tab 之一） */
import { esc, escAttr, pad } from '../utils';

const AH_KEY = 'moyu_aihot_cache';
const PAGE_SIZE = 10;
const MAX_PAGES = 5;

interface AHItem {
  id: string;
  title: string;
  source: string;
  publishedAt: string;
  summary: string;
  permalink: string;
  category: string;
  score: number;
  url: string;
}

let ahLoading = false;
let ahInited = false;
let ahLastFetch = 0;
let ahPage = 0;

const CAT_LABEL: Record<string, string> = {
  'ai-models': '模型',
  'ai-products': '产品',
  paper: '论文',
  industry: '行业',
  tip: '技巧',
};

function loadAH(): { items: AHItem[]; ts: number } | null {
  try {
    const r = localStorage.getItem(AH_KEY);
    return r ? JSON.parse(r) : null;
  } catch {
    return null;
  }
}
function saveAH(c: { items: AHItem[]; ts: number }) {
  try {
    localStorage.setItem(AH_KEY, JSON.stringify(c));
  } catch {}
}

function fmtAHTime(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  const hh = pad(d.getHours());
  const mm = pad(d.getMinutes());
  return sameDay ? hh + ':' + mm : pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + ' ' + hh + ':' + mm;
}

function pageCount(items: AHItem[]): number {
  return Math.min(MAX_PAGES, Math.ceil(items.length / PAGE_SIZE) || 1);
}

function renderAH(error: boolean) {
  const list = document.getElementById('aihotList');
  const pageEl = document.getElementById('newsPage');
  if (!list) return;
  const c = loadAH();
  if (!c || !c.items.length) {
    list.innerHTML = `<div class="aihot-empty">${error ? '⚠ 获取失败 · 点击重试' : '加载中…'}</div>`;
    list.onclick = error ? () => refreshAH() : null;
    if (pageEl) pageEl.textContent = '1/1';
    return;
  }
  list.onclick = null;
  const total = pageCount(c.items);
  const page = ahPage % total;
  const slice = c.items.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);
  list.innerHTML = slice
    .map((it, i) => {
      const rank = page * PAGE_SIZE + i + 1;
      const cat = it.category ? CAT_LABEL[it.category] : '';
      const time = fmtAHTime(it.publishedAt);
      const sub = [it.source, time].filter(Boolean).join(' · ');
      return `<a class="aihot-row" href="${escAttr(it.permalink)}" target="_blank" rel="noopener" title="${escAttr(it.summary || it.title)}">
        <span class="aihot-rank${rank <= 3 ? ' top' : ''}">${rank}</span>
        <span class="aihot-main">
          <span class="aihot-name">${esc(it.title)}</span>
          <span class="aihot-sub"><span class="aihot-sub-txt">${esc(sub)}</span>${cat ? `<i class="aihot-tag">${esc(cat)}</i>` : ''}${it.score ? `<i class="aihot-score">${it.score}</i>` : ''}</span>
        </span>
      </a>`;
    })
    .join('');
  if (pageEl) pageEl.textContent = page + 1 + '/' + total;
}

export function swapAHPage() {
  const c = loadAH();
  if (!c || !c.items.length) return;
  const total = pageCount(c.items);
  ahPage = (ahPage + 1) % total;
  renderAH(false);
}

export async function refreshAH() {
  if (ahLoading) return;
  if (!document.getElementById('aihotList')) return;
  ahLoading = true;
  try {
    const res = (await chrome.runtime.sendMessage({ type: 'AIHOT_FETCH' })) as
      | { success: boolean; data?: { items: AHItem[]; ts: number }; error?: string }
      | undefined;
    if (res?.success && res.data) {
      saveAH({ items: res.data.items, ts: res.data.ts });
      ahLastFetch = Date.now();
      ahPage = 0;
      renderAH(false);
    } else {
      renderAH(true);
    }
  } catch {
    renderAH(true);
  } finally {
    ahLoading = false;
  }
}

function onAHVis() {
  if (document.visibilityState !== 'visible') return;
  if (Date.now() - ahLastFetch > 300000) refreshAH();
}

export async function initAihot() {
  renderAH(false);
  if (ahInited) return;
  ahInited = true;
  refreshAH();
  setInterval(refreshAH, 300000);
  document.addEventListener('visibilitychange', onAHVis);
}
