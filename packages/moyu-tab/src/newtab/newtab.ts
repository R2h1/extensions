/**
 * 工位搭子 — 新标签页
 *
 * 敲木鱼 + 今日待办 + 午餐倒计时
 */

// ─── Storage Keys ────────────────────────────────────

const STORAGE_MERIT = 'moyu_merit';
const STORAGE_TODOS = 'moyu_todos';
const STORAGE_LUNCH = 'moyu_lunch';

interface TodoItem {
  id: number;
  text: string;
  done: boolean;
}

interface LunchSettings {
  hour: number; // 0-23
  minute: number; // 0-59
}

const DEFAULT_LUNCH: LunchSettings = { hour: 11, minute: 30 };

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
  timeDisplay.textContent = `${h}:${m}`;

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

// ─── 午餐倒计时 ──────────────────────────────────────

let lunch: LunchSettings = { ...DEFAULT_LUNCH };

async function loadLunch() {
  const result = await chrome.storage.sync.get(STORAGE_LUNCH);
  if (result[STORAGE_LUNCH]) {
    lunch = { ...DEFAULT_LUNCH, ...result[STORAGE_LUNCH] };
  }
}

function updateLunch() {
  const now = new Date();
  const lunchTime = new Date();
  lunchTime.setHours(lunch.hour, lunch.minute, 0, 0);

  const diffMs = lunchTime.getTime() - now.getTime();

  if (diffMs <= 0) {
    // 已过午餐时间 → 显示明天
    const tomorrow = new Date(lunchTime);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const diff = tomorrow.getTime() - now.getTime();
    const totalMin = Math.round(diff / 60000);
    const h = Math.floor(totalMin / 60);
    const m = totalMin % 60;
    lunchDisplay.textContent = `🍱 午餐 ${pad(lunch.hour)}:${pad(lunch.minute)} · ${h}h ${m}min 后`;
    return;
  }

  const totalMin = Math.round(diffMs / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  lunchDisplay.textContent = `🍱 午餐 ${pad(lunch.hour)}:${pad(lunch.minute)} · ${h}h ${m}min 后`;
}

// ─── 设置 ────────────────────────────────────────────

settingsBtn.addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
});

// ─── Boot ────────────────────────────────────────────

async function init() {
  updateTime();
  await Promise.all([loadMerit(), loadTodos(), loadLunch()]);
  updateLunch();

  // 定时更新
  setInterval(() => {
    updateTime();
    updateLunch();
  }, 1000);
}

init();
