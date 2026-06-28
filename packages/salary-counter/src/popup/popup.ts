/**
 * 薪资跳动 — Popup
 *
 * 显示当前累计收入、每秒收入、工作时长。
 */

const STORAGE_KEY = 'salary_settings';
const WORK_DAYS_PER_MONTH = 21.75;

interface SalarySettings {
  monthlyIncome: number;
  workStart: string;
  workEnd: string;
}

const DEFAULT_SETTINGS: SalarySettings = {
  monthlyIncome: 10000,
  workStart: '09:00',
  workEnd: '18:00',
};

// ─── DOM ───────────────────────────────────────────────

const contentEl = document.getElementById('content')!;
const statusTag = document.getElementById('statusTag')!;
document.getElementById('btnSettings')!.addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
});

// ─── Helpers ──────────────────────────────────────────

function todayAt(time: string): Date {
  const [h, m] = time.split(':').map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d;
}

function isWorkDay(): boolean {
  const day = new Date().getDay();
  return day >= 1 && day <= 5;
}

function getStatus(): { working: boolean; label: string } {
  const now = new Date();
  const start = todayAt(settings.workStart);
  const end = todayAt(settings.workEnd);

  if (!isWorkDay()) return { working: false, label: '休息' };
  if (now < start) return { working: false, label: '待开工' };
  if (now > end) return { working: false, label: '下班' };
  return { working: true, label: '工作中' };
}

let settings: SalarySettings = { ...DEFAULT_SETTINGS };

async function loadSettings() {
  const result = await chrome.storage.sync.get(STORAGE_KEY);
  settings = { ...DEFAULT_SETTINGS, ...result[STORAGE_KEY] };
}

function calcAndRender() {
  const now = new Date();
  const start = todayAt(settings.workStart);
  const end = todayAt(settings.workEnd);
  const status = getStatus();

  statusTag.textContent = status.label;
  if (!status.working) statusTag.classList.add('idle');
  else statusTag.classList.remove('idle');

  if (!status.working) {
    contentEl.innerHTML = '<div class="idle-msg">非工作时间</div>';
    return;
  }

  const workSeconds = Math.floor((end.getTime() - start.getTime()) / 1000);
  if (workSeconds <= 0) return;

  const elapsed = Math.max(0, Math.floor((now.getTime() - start.getTime()) / 1000));
  const clampedElapsed = Math.min(elapsed, workSeconds);
  const ratePerSecond = settings.monthlyIncome / WORK_DAYS_PER_MONTH / workSeconds;
  const accumulated = ratePerSecond * clampedElapsed;

  const hours = Math.floor(clampedElapsed / 3600);
  const mins = Math.floor((clampedElapsed % 3600) / 60);

  // 格式：前面补空格对齐，像老式计算器显示
  const amountStr = accumulated.toFixed(4).padStart(10, ' ');

  contentEl.innerHTML = `
    <div class="amount">${amountStr} <span class="unit">元</span></div>
    <div class="detail">
      每秒 ${ratePerSecond.toFixed(6)} 元<br />
      ELAPSED: ${hours}h ${mins}m
    </div>
  `;
}

// ─── Boot ──────────────────────────────────────────────

async function init() {
  await loadSettings();
  calcAndRender();
  setInterval(calcAndRender, 1000);
}

init();
