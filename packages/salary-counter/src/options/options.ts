/**
 * 薪资跳动 — 设置页
 */

const STORAGE_KEY = 'salary_settings';

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

// DOM refs
const inputIncome = document.getElementById('monthlyIncome') as HTMLInputElement;
const inputStart = document.getElementById('workStart') as HTMLInputElement;
const inputEnd = document.getElementById('workEnd') as HTMLInputElement;
const btnSave = document.getElementById('btnSave')!;
const statusEl = document.getElementById('status')!;

async function loadSettings() {
  const result = await chrome.storage.sync.get(STORAGE_KEY);
  const s: SalarySettings = { ...DEFAULT_SETTINGS, ...result[STORAGE_KEY] };
  inputIncome.value = String(s.monthlyIncome);
  inputStart.value = s.workStart;
  inputEnd.value = s.workEnd;
}

async function saveSettings() {
  const monthlyIncome = parseInt(inputIncome.value, 10) || 0;
  const workStart = inputStart.value || '09:00';
  const workEnd = inputEnd.value || '18:00';

  if (monthlyIncome <= 0) {
    showStatus('月收入必须大于 0', 'error');
    return;
  }

  await chrome.storage.sync.set({
    [STORAGE_KEY]: { monthlyIncome, workStart, workEnd },
  });

  showStatus('✅ 已保存', 'success');
}

function showStatus(msg: string, type: 'success' | 'error') {
  statusEl.textContent = msg;
  statusEl.className = `status show status-${type}`;
  setTimeout(() => statusEl.classList.remove('show'), 2500);
}

document.addEventListener('DOMContentLoaded', loadSettings);
btnSave.addEventListener('click', saveSettings);
