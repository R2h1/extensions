/**
 * 工位搭子 — 设置页
 */

const STORAGE_LUNCH = 'moyu_lunch';

const inputTime = document.getElementById('lunchTime') as HTMLInputElement;
const btnSave = document.getElementById('btnSave')!;
const statusEl = document.getElementById('status')!;

async function loadSettings() {
  const result = await chrome.storage.sync.get(STORAGE_LUNCH);
  const lunch = result[STORAGE_LUNCH] || { hour: 11, minute: 30 };
  inputTime.value = `${String(lunch.hour).padStart(2, '0')}:${String(lunch.minute).padStart(2, '0')}`;
}

btnSave.addEventListener('click', async () => {
  const [h, m] = inputTime.value.split(':').map(Number);
  if (isNaN(h) || isNaN(m)) return;

  await chrome.storage.sync.set({
    [STORAGE_LUNCH]: { hour: h, minute: m },
  });

  showStatus('✅ 已保存');
});

function showStatus(msg: string) {
  statusEl.textContent = msg;
  statusEl.className = 'status show status-success';
  setTimeout(() => statusEl.classList.remove('show'), 2500);
}

document.addEventListener('DOMContentLoaded', loadSettings);
