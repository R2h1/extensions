/**
 * 工位搭子 — 设置页
 */

const STORAGE_SCHEDULE = 'moyu_schedule';

const inputLunch = document.getElementById('lunchTime') as HTMLInputElement;
const inputEnd = document.getElementById('endTime') as HTMLInputElement;
const btnSave = document.getElementById('btnSave')!;
const statusEl = document.getElementById('status')!;

async function loadSettings() {
  const result = await chrome.storage.sync.get(STORAGE_SCHEDULE);
  const s = result[STORAGE_SCHEDULE] || {
    lunchHour: 11,
    lunchMinute: 30,
    endHour: 18,
    endMinute: 0,
  };
  inputLunch.value = `${String(s.lunchHour).padStart(2, '0')}:${String(s.lunchMinute).padStart(2, '0')}`;
  inputEnd.value = `${String(s.endHour).padStart(2, '0')}:${String(s.endMinute).padStart(2, '0')}`;
}

btnSave.addEventListener('click', async () => {
  const [lh, lm] = inputLunch.value.split(':').map(Number);
  const [eh, em] = inputEnd.value.split(':').map(Number);
  if (isNaN(lh) || isNaN(lm) || isNaN(eh) || isNaN(em)) return;

  await chrome.storage.sync.set({
    [STORAGE_SCHEDULE]: { lunchHour: lh, lunchMinute: lm, endHour: eh, endMinute: em },
  });

  showStatus('✅ 已保存');
});

function showStatus(msg: string) {
  statusEl.textContent = msg;
  statusEl.className = 'status show status-success';
  setTimeout(() => statusEl.classList.remove('show'), 2500);
}

document.addEventListener('DOMContentLoaded', loadSettings);
