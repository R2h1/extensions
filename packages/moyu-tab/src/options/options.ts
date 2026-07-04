/**
 * 工位搭子 — 设置页
 *
 * 时间设置 + 摸鱼语录管理
 */

const STORAGE_SCHEDULE = 'moyu_schedule';
const STORAGE_QUOTES = 'moyu_quotes';

// ─── DOM ─────────────────────────────────────────────

const inputLunch = document.getElementById('lunchTime') as HTMLInputElement;
const inputEnd = document.getElementById('endTime') as HTMLInputElement;
const btnSave = document.getElementById('btnSave')!;
const saveStatusEl = document.getElementById('saveStatus')!;

const quoteListEl = document.getElementById('quoteList')!;
const newQuoteInput = document.getElementById('newQuoteInput') as HTMLInputElement;
const addQuoteBtn = document.getElementById('addQuoteBtn')!;
const quoteStatusEl = document.getElementById('quoteStatus')!;

// ─── 内置语录 ────────────────────────────────────────

const BUILT_IN_QUOTES: string[] = [
  '摸鱼是一种态度，不是一种行为。',
  '上班不摸鱼，回家睡不香。',
  '工作总会做完的，不急这一时。',
  '真正的摸鱼，是让你看起来在忙，实际上在休息。',
  '摸鱼五分钟，精神两小时。',
  '不是在摸鱼，是在给大脑充电。',
  '生活不止眼前的 KPI，还有摸鱼和远方。',
  '高效的摸鱼是一门艺术。',
  '你今天摸鱼了吗？',
  '工作是为了更好的摸鱼，摸鱼是为了更好的工作。',
  '不急不躁，慢慢来，反正也做不完。',
  '真正的自由，是心在摸鱼。',
  '摸鱼是成年人的课间休息。',
  '不想工作的时候就摸摸鱼，鱼也需要陪伴。',
  '人生苦短，及时摸鱼。',
  '摸鱼不是懒，是战略性休整。',
  '每个认真摸鱼的打工人，运气都不会太差。',
  '工作使我快乐——摸鱼使我更快乐。',
  '摸鱼的本质，是与内心的自己对话。',
  '不会摸鱼的员工，不是好员工；只会摸鱼的员工，也不是好员工。',
  '适度摸鱼益脑，过度摸鱼伤身。',
  '与其焦虑地工作，不如快乐地摸鱼。',
];

interface QuoteData {
  builtIn: string[];
  custom: string[];
  enabledIndices: number[];
}

function getDefaultQuoteData(): QuoteData {
  return {
    builtIn: BUILT_IN_QUOTES,
    custom: [],
    enabledIndices: BUILT_IN_QUOTES.map((_, i) => i),
  };
}

async function loadQuoteData(): Promise<QuoteData> {
  const result = await chrome.storage.sync.get(STORAGE_QUOTES);
  const data = result[STORAGE_QUOTES] as QuoteData | undefined;
  if (data && Array.isArray(data.builtIn) && data.builtIn.length > 0) {
    return data;
  }
  const defaults = getDefaultQuoteData();
  await chrome.storage.sync.set({ [STORAGE_QUOTES]: defaults });
  return defaults;
}

async function saveQuoteData(data: QuoteData): Promise<void> {
  await chrome.storage.sync.set({ [STORAGE_QUOTES]: data });
}

// ─── 渲染语录列表 ────────────────────────────────────

function escapeHtml(str: string): string {
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}

async function renderQuoteList() {
  const data = await loadQuoteData();
  const enabledSet = new Set(data.enabledIndices);

  let html = '';

  // 内置语录
  data.builtIn.forEach((q, i) => {
    const enabled = enabledSet.has(i);
    html += `
      <li class="quote-item">
        <span class="index">#${i + 1}</span>
        <span class="text built-in">${escapeHtml(q)}</span>
        <span class="actions">
          <button class="btn-danger toggle-builtin" data-index="${i}" data-enable="${!enabled ? '1' : '0'}">
            ${enabled ? '🔇 隐藏' : '🔊 显示'}
          </button>
        </span>
      </li>`;
  });

  // 自定义语录
  data.custom.forEach((q, i) => {
    html += `
      <li class="quote-item">
        <span class="index">C${i + 1}</span>
        <span class="text">${escapeHtml(q)}</span>
        <span class="actions">
          <button class="btn-danger delete-custom" data-index="${i}">✕ 删除</button>
        </span>
      </li>`;
  });

  if (data.custom.length === 0) {
    html += `
      <li class="quote-item" style="color: #555; font-size: 12px; justify-content: center; padding: 16px 0;">
        暂无自定义语录，在上方添加吧 ✨
      </li>`;
  }

  quoteListEl.innerHTML = html;

  // 绑定内置语录切换事件
  document.querySelectorAll('.toggle-builtin').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const index = Number((btn as HTMLElement).dataset.index);
      const enable = (btn as HTMLElement).dataset.enable === '1';
      const quoteData = await loadQuoteData();
      if (enable) {
        quoteData.enabledIndices.push(index);
      } else {
        quoteData.enabledIndices = quoteData.enabledIndices.filter((i) => i !== index);
      }
      await saveQuoteData(quoteData);
      await renderQuoteList();
    });
  });

  // 绑定自定义语录删除事件
  document.querySelectorAll('.delete-custom').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const index = Number((btn as HTMLElement).dataset.index);
      const quoteData = await loadQuoteData();
      quoteData.custom.splice(index, 1);
      await saveQuoteData(quoteData);
      await renderQuoteList();
    });
  });
}

// ─── 添加语录 ────────────────────────────────────────

addQuoteBtn.addEventListener('click', async () => {
  const text = newQuoteInput.value.trim();
  if (!text) return;

  const quoteData = await loadQuoteData();
  quoteData.custom.push(text);
  await saveQuoteData(quoteData);
  newQuoteInput.value = '';
  await renderQuoteList();
  showQuoteStatus('✅ 已添加');
});

newQuoteInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    addQuoteBtn.click();
  }
});

function showQuoteStatus(msg: string) {
  quoteStatusEl.textContent = msg;
  quoteStatusEl.className = 'status show status-success';
  setTimeout(() => quoteStatusEl.classList.remove('show'), 2500);
}

// ─── 时间设置 ────────────────────────────────────────

async function loadSettings() {
  const result = await chrome.storage.sync.get(STORAGE_SCHEDULE);
  const s = result[STORAGE_SCHEDULE] || {
    lunchHour: 11,
    lunchMinute: 30,
    endHour: 18,
    endMinute: 0,
    workDays: [1, 2, 3, 4, 5],
  };
  inputLunch.value = `${String(s.lunchHour).padStart(2, '0')}:${String(s.lunchMinute).padStart(2, '0')}`;
  inputEnd.value = `${String(s.endHour).padStart(2, '0')}:${String(s.endMinute).padStart(2, '0')}`;

  // 工作日
  const dayChecks = document.querySelectorAll('.day-check');
  const workDays: number[] = s.workDays ?? [1, 2, 3, 4, 5];
  dayChecks.forEach((el) => {
    const input = el.querySelector('input')!;
    const val = Number(input.value);
    if (workDays.includes(val)) {
      el.classList.add('active');
    } else {
      el.classList.remove('active');
    }
  });
}

btnSave.addEventListener('click', async () => {
  const [lh, lm] = inputLunch.value.split(':').map(Number);
  const [eh, em] = inputEnd.value.split(':').map(Number);
  if (isNaN(lh) || isNaN(lm) || isNaN(eh) || isNaN(em)) return;

  // 收集选中的工作日
  const workDays: number[] = [];
  document.querySelectorAll('.day-check.active').forEach((el) => {
    workDays.push(Number(el.querySelector('input')!.value));
  });

  await chrome.storage.sync.set({
    [STORAGE_SCHEDULE]: {
      lunchHour: lh, lunchMinute: lm,
      endHour: eh, endMinute: em,
      workDays,
    },
  });

  showSaveStatus('✅ 已保存');
});

// 工作日点击切换
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.day-check').forEach((el) => {
    el.addEventListener('click', () => {
      el.classList.toggle('active');
    });
  });
});

function showSaveStatus(msg: string) {
  saveStatusEl.textContent = msg;
  saveStatusEl.className = 'status show status-success';
  setTimeout(() => saveStatusEl.classList.remove('show'), 2500);
}

// ─── Boot ────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', async () => {
  await loadSettings();
  await renderQuoteList();
});