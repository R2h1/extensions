/**
 * 工位搭子 — 新标签页
 *
 * 敲木鱼 + 今日待办 + 午餐倒计时
 */

// ─── Storage Keys ────────────────────────────────────

const STORAGE_MERIT = 'moyu_merit';
const STORAGE_TODOS = 'moyu_todos';
const STORAGE_SCHEDULE = 'moyu_schedule';

interface TodoItem {
  id: number;
  text: string;
  done: boolean;
}

interface ScheduleSettings {
  lunchHour: number;
  lunchMinute: number;
  endHour: number;
  endMinute: number;
}

const DEFAULT_SCHEDULE: ScheduleSettings = {
  lunchHour: 11,
  lunchMinute: 30,
  endHour: 18,
  endMinute: 0,
};

// ─── DOM ─────────────────────────────────────────────

const timeDisplay = document.getElementById('timeDisplay')!;
const dateDisplay = document.getElementById('dateDisplay')!;
const meritCount = document.getElementById('meritCount')!;
const fishBtn = document.getElementById('fishBtn')!;
const todoInput = document.getElementById('todoInput') as HTMLInputElement;
const todoAddBtn = document.getElementById('todoAddBtn')!;
const todoList = document.getElementById('todoList')!;
const lunchDisplay = document.getElementById('lunchDisplay')!;
const settingsBtn = document.getElementById('settingsBtn')!;

// ─── 时间 ────────────────────────────────────────────

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function updateTime() {
  const now = new Date();
  const h = pad(now.getHours());
  const m = pad(now.getMinutes());
  const s = pad(now.getSeconds());
  timeDisplay.textContent = `${h}:${m}:${s}`;

  const y = now.getFullYear();
  const mo = pad(now.getMonth() + 1);
  const d = pad(now.getDate());
  const days = ['日', '一', '二', '三', '四', '五', '六'];
  const wd = days[now.getDay()];
  dateDisplay.textContent = `${y}.${mo}.${d} 周${wd}`;
}

// ─── 木鱼 ────────────────────────────────────────────

let merit = 0;

async function loadMerit() {
  const result = await chrome.storage.local.get(STORAGE_MERIT);
  merit = result[STORAGE_MERIT] ?? 0;
  meritCount.textContent = String(merit);
}

async function saveMerit() {
  await chrome.storage.local.set({ [STORAGE_MERIT]: merit });
}

fishBtn.addEventListener('click', async () => {
  merit++;
  meritCount.textContent = String(merit);
  await saveMerit();
  // 敲击动画
  fishBtn.classList.remove('knock');
  void fishBtn.offsetWidth; // 触发回流以重启动画
  fishBtn.classList.add('knock');
});

// ─── 待办 ────────────────────────────────────────────

let todos: TodoItem[] = [];
let nextId = 1;

async function loadTodos() {
  const result = await chrome.storage.local.get(STORAGE_TODOS);
  const data = result[STORAGE_TODOS];
  if (data) {
    todos = data.items;
    nextId = data.nextId;
  }
  renderTodos();
}

async function saveTodos() {
  await chrome.storage.local.set({
    [STORAGE_TODOS]: { items: todos, nextId },
  });
}

function renderTodos() {
  if (todos.length === 0) {
    todoList.innerHTML = '<li class="todo-empty">今天没有任务</li>';
    return;
  }

  todoList.innerHTML = todos
    .map(
      (t) => `
    <li class="todo-item">
      <button class="todo-check${t.done ? ' done' : ''}" data-id="${t.id}">${t.done ? '✓' : ''}</button>
      <span class="todo-text${t.done ? ' done' : ''}">${escapeHtml(t.text)}</span>
      <button class="todo-del" data-id="${t.id}">✕</button>
    </li>`,
    )
    .join('');

  // 勾选
  todoList.querySelectorAll('.todo-check').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = Number((btn as HTMLElement).dataset.id);
      const todo = todos.find((t) => t.id === id);
      if (todo) {
        todo.done = !todo.done;
        renderTodos();
        saveTodos();
      }
    });
  });

  // 删除
  todoList.querySelectorAll('.todo-del').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = Number((btn as HTMLElement).dataset.id);
      todos = todos.filter((t) => t.id !== id);
      renderTodos();
      saveTodos();
    });
  });
}

function addTodo(text: string) {
  if (!text.trim()) return;
  todos.push({ id: nextId++, text: text.trim(), done: false });
  renderTodos();
  saveTodos();
}

todoAddBtn.addEventListener('click', () => {
  addTodo(todoInput.value);
  todoInput.value = '';
});

todoInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    addTodo(todoInput.value);
    todoInput.value = '';
  }
});

function escapeHtml(str: string): string {
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}

// ─── 倒计时（午餐 / 下班） ────────────────────────────

let schedule: ScheduleSettings = { ...DEFAULT_SCHEDULE };

async function loadSchedule() {
  const result = await chrome.storage.sync.get(STORAGE_SCHEDULE);
  if (result[STORAGE_SCHEDULE]) {
    schedule = { ...DEFAULT_SCHEDULE, ...result[STORAGE_SCHEDULE] };
  }
}

function todayAt(h: number, m: number): Date {
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d;
}

function formatDiff(ms: number): string {
  const totalMin = Math.round(ms / 60000);
  const h = Math.floor(totalMin / 60);
  const min = totalMin % 60;
  if (h > 0) return `${h}h ${min}min`;
  return `${min}min`;
}

function updateCountdown() {
  const now = new Date();
  const lunchTime = todayAt(schedule.lunchHour, schedule.lunchMinute);
  const endTime = todayAt(schedule.endHour, schedule.endMinute);

  // 已下班
  if (now >= endTime) {
    lunchDisplay.textContent = '🕐 已下班 · 明天再来';
    return;
  }

  // 午餐前 → 显示午餐倒计时
  if (now < lunchTime) {
    const diff = lunchTime.getTime() - now.getTime();
    lunchDisplay.textContent = `🍱 午餐 ${pad(schedule.lunchHour)}:${pad(schedule.lunchMinute)} · ${formatDiff(diff)} 后`;
    return;
  }

  // 午餐后到下班 → 显示下班倒计时
  const diff = endTime.getTime() - now.getTime();
  lunchDisplay.textContent = `🕐 下班 ${pad(schedule.endHour)}:${pad(schedule.endMinute)} · ${formatDiff(diff)} 后`;
}

// ─── 设置 ────────────────────────────────────────────

settingsBtn.addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
});

// ─── Boot ────────────────────────────────────────────

async function init() {
  updateTime();
  await Promise.all([loadMerit(), loadTodos(), loadSchedule()]);
  updateCountdown();

  // 定时更新
  setInterval(() => {
    updateTime();
    updateCountdown();
  }, 1000);
}

init();
