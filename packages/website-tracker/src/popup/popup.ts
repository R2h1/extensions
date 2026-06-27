/**
 * Popup — Website Usage Rankings
 *
 * Displays a ranked list of websites by time spent.
 * Supports today / this week / this month views.
 */

import { sendMessage, formatDuration } from '@extensions/shared';
import { MSG, type RankingItem, type RankingPeriod } from '@extensions/shared';

// ─── DOM Refs ──────────────────────────────────────────

const contentWrap = document.getElementById('contentWrap')!;
const periodBtns = document.querySelectorAll('.period-btn');
const siteCountEl = document.getElementById('siteCount')!;
const footerStat = document.getElementById('footerStat')!;
const footerUpdate = document.getElementById('footerUpdate')!;
const btnRefresh = document.getElementById('btnRefresh')!;
const btnSettings = document.getElementById('btnSettings')!;

// ─── State ─────────────────────────────────────────────

let currentPeriod: RankingPeriod = 'day';

// ─── Init ───────────────────────────────────────────────

function init() {
  // Period buttons
  periodBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const period = (btn as HTMLElement).dataset.period as RankingPeriod;
      if (period === currentPeriod) return;
      currentPeriod = period;
      periodBtns.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      loadRankings(period);
    });
  });

  btnRefresh.addEventListener('click', () => loadRankings(currentPeriod));
  btnSettings.addEventListener('click', () => chrome.runtime.openOptionsPage());

  // Initial load
  loadRankings('day');
}

// ─── Load & Render ─────────────────────────────────────

async function loadRankings(period: RankingPeriod, retries = 3) {
  // Show loading
  contentWrap.innerHTML = `
    <div class="loading-state">
      <div class="spinner"></div>
    </div>
  `;

  const result = await sendMessage<RankingItem[]>(MSG.GET_RANKINGS, { period });
  const rankings = (result.success ? result.data : []) ?? [];

  // Retry with delay if empty (cold start: service worker may need time)
  if ((!rankings || rankings.length === 0) && retries > 0) {
    await new Promise((r) => setTimeout(r, 400));
    return loadRankings(period, retries - 1);
  }

  renderRankings(rankings);
}

function renderRankings(items: RankingItem[]) {
  if (!items || items.length === 0) {
    renderEmpty();
    return;
  }

  const totalTime = items.reduce((s, i) => s + i.time, 0);

  siteCountEl.textContent = `${items.length} 站点`;
  footerStat.textContent = `共 ${items.length} 个站点 · 总计 ${formatDuration(totalTime)}`;

  const listHtml = items.map((item, idx) => renderItem(item, idx)).join('');

  contentWrap.innerHTML = `<div class="ranking-list">${listHtml}</div>`;
  showUpdateTime();
}

function showUpdateTime() {
  const now = new Date();
  const h = String(now.getHours()).padStart(2, '0');
  const m = String(now.getMinutes()).padStart(2, '0');
  const s = String(now.getSeconds()).padStart(2, '0');
  footerUpdate.textContent = `更新于 ${h}:${m}:${s}`;
}

function renderItem(item: RankingItem, index: number): string {
  const rank = index + 1;
  const rankClass = rank <= 3 ? `rank-${rank}` : '';
  const rankLabel = rank <= 3 ? ['🥇', '🥈', '🥉'][rank - 1] : String(rank);

  const displayName = item.name || item.domain;

  return `
    <div class="ranking-item" data-domain="${escapeAttr(item.domain)}">
      <div class="rank-badge ${rankClass}">${rankLabel}</div>
      <div class="site-info">
        <div class="site-domain" title="${escapeAttr(item.domain)}">${escapeHtml(displayName)}</div>
        <div class="site-sub">${escapeHtml(item.domain)} · ${item.visits} 次访问</div>
      </div>
      <div class="time-col">
        <span class="time-text">${formatDuration(item.time)}</span>
        <div class="progress-bar-wrap">
          <div class="progress-bar" style="width: ${item.percentage}%"></div>
        </div>
      </div>
    </div>
  `;
}

function renderEmpty() {
  siteCountEl.textContent = '0 站点';
  footerStat.textContent = '尚无数据';
  showUpdateTime();

  contentWrap.innerHTML = `
    <div class="empty-state">
      <div class="empty-icon">🕐</div>
      <div class="empty-title">尚无浏览记录</div>
      <div class="empty-desc">开始浏览网页，数据会自动记录</div>
    </div>
  `;
}

// ─── Helpers ────────────────────────────────────────────

function escapeHtml(str: string): string {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function escapeAttr(str: string): string {
  return str
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// ─── Boot ───────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', init);
