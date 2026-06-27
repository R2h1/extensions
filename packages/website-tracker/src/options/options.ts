/**
 * Options — Full Analytics Dashboard
 *
 * Shows summary cards, detailed site table, data management.
 */

import { sendMessage, formatDuration, formatDurationFull } from '@extensions/shared';
import { MSG } from '@extensions/shared';

// ─── Types ─────────────────────────────────────────────

interface HistorySite {
  domain: string;
  /** Display name */
  name: string;
  total: number;
  visits: number;
  days: number;
  percentage: number;
  faviconUrl: string;
  today: number;
}

interface HistoryData {
  sites: HistorySite[];
  totalTime: number;
  siteCount: number;
}

// ─── DOM Refs ──────────────────────────────────────────

const summaryCards = {
  today: {
    value: document.getElementById('todayValue')!,
    sub: document.getElementById('todaySub')!,
  },
  week: { value: document.getElementById('weekValue')!, sub: document.getElementById('weekSub')! },
  month: {
    value: document.getElementById('monthValue')!,
    sub: document.getElementById('monthSub')!,
  },
  all: { value: document.getElementById('allValue')!, sub: document.getElementById('allSub')! },
};

const tableWrap = document.getElementById('tableWrap')!;
const loadingState = document.getElementById('loadingState')!;
const statusBar = document.getElementById('statusBar')!;
const btnRefresh = document.getElementById('btnRefresh')!;
const btnReset = document.getElementById('btnReset')!;
const btnExport = document.getElementById('btnExport')!;

// ─── Main ──────────────────────────────────────────────

function init() {
  loadDashboard();

  btnRefresh.addEventListener('click', () => loadDashboard());
  btnReset.addEventListener('click', confirmReset);
  btnExport.addEventListener('click', exportCSV);

  // Auto-refresh when tab becomes active again
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      loadDashboard();
    }
  });
}

async function loadDashboard() {
  showLoading(true);

  const result = await Promise.all([
    sendMessage<HistoryData>(MSG.GET_HISTORY),
    sendMessage<unknown>(MSG.GET_RANKINGS, { period: 'day' }),
    sendMessage<unknown>(MSG.GET_RANKINGS, { period: 'week' }),
    sendMessage<unknown>(MSG.GET_RANKINGS, { period: 'month' }),
  ]);

  const [history, dayRank, weekRank, monthRank] = result as [
    { success: boolean; data?: HistoryData },
    { success: boolean; data?: { time: number }[] },
    { success: boolean; data?: { time: number }[] },
    { success: boolean; data?: { time: number }[] },
  ];

  showLoading(false);

  const historyData = history.data;
  if (!historyData) {
    showStatus('无法加载数据', 'error');
    return;
  }

  updateSummaryCards(historyData, dayRank.data, weekRank.data, monthRank.data);
  renderTable(historyData.sites);
}

// ─── Summary Cards ─────────────────────────────────────

function updateSummaryCards(
  history: HistoryData,
  dayData?: { time: number }[],
  weekData?: { time: number }[],
  monthData?: { time: number }[],
) {
  const dayTotal = dayData?.reduce((s, d) => s + d.time, 0) ?? 0;
  const weekTotal = weekData?.reduce((s, d) => s + d.time, 0) ?? 0;
  const monthTotal = monthData?.reduce((s, d) => s + d.time, 0) ?? 0;

  summaryCards.today.value.textContent = formatDuration(dayTotal);
  summaryCards.today.sub.textContent = `${dayData?.length ?? 0} 站点`;
  summaryCards.week.value.textContent = formatDuration(weekTotal);
  summaryCards.week.sub.textContent = `${weekData?.length ?? 0} 站点`;
  summaryCards.month.value.textContent = formatDuration(monthTotal);
  summaryCards.month.sub.textContent = `${monthData?.length ?? 0} 站点`;
  summaryCards.all.value.textContent = formatDuration(history.totalTime ?? 0);
  summaryCards.all.sub.textContent = `${history.siteCount ?? 0} 站点`;
}

// ─── Table ─────────────────────────────────────────────

function renderTable(sites: HistorySite[]) {
  if (!sites || sites.length === 0) {
    tableWrap.innerHTML =
      '<div style="padding: 40px; text-align: center; color: var(--text-tertiary)">暂无数据</div>';
    return;
  }

  const rows = sites
    .map(
      (s) => `
    <tr>
      <td>
        <div class="domain-cell">
          <span>${escapeHtml(s.name || s.domain)}</span>
          <span style="font-size:11px;color:var(--text-tertiary);margin-left:4px">${s.name ? escapeHtml(s.domain) : ''}</span>
        </div>
      </td>
      <td class="time-cell">${formatDuration(s.today)}</td>
      <td class="time-cell">${formatDuration(s.total)}</td>
      <td>${s.visits}</td>
      <td>${s.days}</td>
      <td>
        <div class="pct-bar-cell">
          <div class="pct-bar">
            <div class="pct-bar-fill" style="width: ${s.percentage}%"></div>
          </div>
        </div>
      </td>
      <td style="font-size: 12px; color: var(--text-secondary)">${s.percentage}%</td>
    </tr>`,
    )
    .join('');

  tableWrap.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>站点</th>
          <th>今日</th>
          <th>总计</th>
          <th>访问</th>
          <th>天数</th>
          <th>占比</th>
          <th></th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

// ─── Data Management ───────────────────────────────────

function confirmReset() {
  // Create modal
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal-box">
      <h3>确认重置数据</h3>
      <p>这将清除所有追踪记录，此操作不可撤销。</p>
      <div class="modal-actions">
        <button class="btn btn-ghost" id="modalCancel">取消</button>
        <button class="btn btn-danger" id="modalConfirm">确认重置</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  overlay.querySelector('#modalCancel')?.addEventListener('click', () => overlay.remove());
  overlay.querySelector('#modalConfirm')?.addEventListener('click', async () => {
    overlay.remove();
    await sendMessage(MSG.RESET_DATA);
    showStatus('✅ 数据已重置', 'success');
    loadDashboard();
  });

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.remove();
  });
}

async function exportCSV() {
  const result = await sendMessage<HistoryData>(MSG.GET_HISTORY);
  const data = result.data;
  if (!data || !data.sites.length) {
    showStatus('没有可导出的数据', 'error');
    return;
  }

  const headers = ['站点', '今日用时', '总计用时', '访问次数', '活跃天数', '占比'];
  const rows = data.sites.map((s) => [
    s.domain,
    formatDurationFull(s.today),
    formatDurationFull(s.total),
    String(s.visits),
    String(s.days),
    `${s.percentage}%`,
  ]);

  const csv = [headers.join(','), ...rows.map((r) => r.map(escapeCsv).join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = `website-usage-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);

  showStatus('✅ CSV 已导出', 'success');
}

function escapeCsv(str: string): string {
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

// ─── UI Helpers ────────────────────────────────────────

function showLoading(loading: boolean) {
  if (loading) {
    loadingState!.style.display = 'block';
    tableWrap.querySelector('table')?.remove();
  } else {
    loadingState!.style.display = 'none';
  }
}

function showStatus(msg: string, type: 'success' | 'error') {
  statusBar.textContent = msg;
  statusBar.className = `status-bar show status-${type}`;
  setTimeout(() => statusBar.classList.remove('show'), 3000);
}

function escapeHtml(str: string): string {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ─── Boot ──────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', init);
