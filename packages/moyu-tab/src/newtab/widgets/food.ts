/** 「今天吃什么」卡片：两份私人清单（外卖店名 / 自己做菜名），纯随机摇一个。
 *  清单在「全局设置 -> 今天吃什么」里批量编辑（逗号分隔）；存 chrome.storage.sync，多端同步。
 *  动画参考 qoom：主菜名快速轮换 + 飘字随机位置淡入淡出，点「开始/换一个」开始、「停止」定格。
 *  刷新回到问号提示态（不持久化结果）；当前 tab 存 localStorage。 */
type Tab = 'takeout' | 'cook';
interface FoodData {
  takeout: string[];
  cook: string[];
}

const FOOD_KEY = 'moyu_food';
const TAB_KEY = 'moyu_food_tab';
const PROMPT = '今天吃什么？';

let data: FoodData = { takeout: [], cook: [] };
let activeTab: Tab = 'takeout';
let spinning = false;
let nameTimer = 0;
let spawnTimer = 0;
// 本会话内每个 tab 的摇中结果（不持久化，刷新清空）
let sessionResult: Record<Tab, string | null> = { takeout: null, cook: null };

async function loadData(): Promise<FoodData> {
  try {
    const r = (await chrome.storage.sync.get(FOOD_KEY)) as Record<string, FoodData> | undefined;
    const d = r?.[FOOD_KEY];
    if (d && Array.isArray(d.takeout) && Array.isArray(d.cook)) return d;
  } catch {}
  return { takeout: [], cook: [] };
}
async function saveData() {
  try {
    await chrome.storage.sync.set({ [FOOD_KEY]: data });
  } catch {}
}

function list(): string[] {
  return data[activeTab];
}
function pickFood(exclude?: string): string | null {
  const arr = list();
  if (!arr.length) return null;
  if (arr.length === 1) return arr[0];
  let f = arr[Math.floor(Math.random() * arr.length)];
  let guard = 0;
  while (f === exclude && guard++ < 8) f = arr[Math.floor(Math.random() * arr.length)];
  return f;
}

const ICON =
  '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 2v7c0 1.1.9 2 2 2h0a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/></svg>';

export function renderFoodCard(): string {
  return `<div class="widget-card food-card">
      <div class="food-head">
        <div class="food-title">${ICON}今天吃什么</div>
        <div class="food-tabs" id="foodTabs">
          <button class="food-tab active" data-tab="takeout" type="button">外卖</button>
          <button class="food-tab" data-tab="cook" type="button">自己做</button>
        </div>
      </div>
      <div class="food-stage" id="foodStage">
        <div class="food-name" id="foodName">--</div>
        <button class="food-swap" id="foodSwap" type="button">开始</button>
      </div>
    </div>`;
}

function renderTabs() {
  document.getElementById('foodTabs')?.querySelectorAll('.food-tab').forEach((b) => {
    b.classList.toggle('active', (b as HTMLElement).dataset.tab === activeTab);
  });
}

function renderStage() {
  const stage = document.getElementById('foodStage');
  const nameEl = document.getElementById('foodName');
  const swap = document.getElementById('foodSwap') as HTMLButtonElement | null;
  if (!stage || !nameEl || !swap) return;
  const arr = list();
  nameEl.classList.remove('pop');
  if (!arr.length) {
    nameEl.textContent = '还没有菜，去设置添加';
    nameEl.classList.add('prompt');
    swap.style.display = 'none';
    return;
  }
  if (arr.length < 2) {
    nameEl.textContent = arr[0];
    nameEl.classList.remove('prompt');
    swap.style.display = 'none';
    return;
  }
  nameEl.classList.remove('prompt');
  swap.style.display = '';
  const r = sessionResult[activeTab];
  if (r && arr.includes(r)) {
    nameEl.textContent = r;
    void nameEl.offsetWidth; // 重新触发 pop 动画
    nameEl.classList.add('pop');
    swap.textContent = '换一个';
  } else {
    nameEl.textContent = PROMPT;
    nameEl.classList.add('prompt');
    swap.textContent = '开始';
  }
}

// ── 动画（参考 qoom）：主菜名快速轮换 + 飘字随机位置淡入淡出，持续到点「停止」──
function haltSpin(removeFloaters: boolean) {
  spinning = false;
  if (nameTimer) {
    clearInterval(nameTimer);
    nameTimer = 0;
  }
  if (spawnTimer) {
    clearInterval(spawnTimer);
    spawnTimer = 0;
  }
  if (removeFloaters) {
    document.getElementById('foodStage')?.querySelectorAll('.food-floater').forEach((f) => f.remove());
  }
}

function startSpin() {
  if (spinning) return;
  const arr = list();
  if (arr.length < 2) return;
  const stage = document.getElementById('foodStage');
  const btn = document.getElementById('foodSwap') as HTMLButtonElement | null;
  const nameEl = document.getElementById('foodName');
  if (!stage || !btn || !nameEl) return;
  spinning = true;
  btn.textContent = '停止';
  btn.classList.add('is-spinning');
  nameEl.classList.remove('prompt', 'pop');
  // 主菜名快速轮换
  const cycleName = () => {
    const n = document.getElementById('foodName');
    if (!n) {
      haltSpin(true);
      return;
    }
    n.textContent = pickFood() || '';
  };
  cycleName();
  nameTimer = window.setInterval(cycleName, 250);
  // 飘字：每 100ms 生成一个，固定随机位置，淡入淡出 1.2s 后自动移除
  const spawn = () => {
    if (!document.getElementById('foodStage')) {
      haltSpin(true);
      return;
    }
    const el = document.createElement('span');
    el.className = 'food-floater';
    el.textContent = pickFood() || '';
    el.style.left = Math.random() * 80 + 5 + '%';
    el.style.top = Math.random() * 60 + 10 + '%';
    el.style.fontSize = Math.round(14 + Math.random() * 10) + 'px';
    stage.appendChild(el);
    el.addEventListener('animationend', () => el.remove());
  };
  spawn();
  spawnTimer = window.setInterval(spawn, 100);
}

function stopSpin() {
  if (!spinning) return;
  haltSpin(false); // 飘字自然淡出
  const nameEl = document.getElementById('foodName');
  const btn = document.getElementById('foodSwap') as HTMLButtonElement | null;
  const next = pickFood(nameEl?.textContent || undefined);
  if (nameEl && next) {
    sessionResult[activeTab] = next;
    nameEl.classList.remove('prompt');
    nameEl.textContent = next;
    nameEl.classList.remove('pop');
    void nameEl.offsetWidth;
    nameEl.classList.add('pop');
  }
  if (btn) {
    btn.textContent = '换一个';
    btn.classList.remove('is-spinning');
  }
}

function toggleSpin() {
  if (spinning) stopSpin();
  else startSpin();
}

function switchTab(tab: Tab) {
  if (tab === activeTab) return;
  if (spinning) haltSpin(true);
  activeTab = tab;
  try {
    localStorage.setItem(TAB_KEY, tab);
  } catch {}
  renderTabs();
  renderStage();
}

export async function initFood() {
  data = await loadData();
  try {
    const t = localStorage.getItem(TAB_KEY) as Tab | null;
    if (t === 'takeout' || t === 'cook') activeTab = t;
  } catch {}
  sessionResult = { takeout: null, cook: null }; // 刷新清空
  renderTabs();
  renderStage();
  document.getElementById('foodTabs')?.querySelectorAll('.food-tab').forEach((b) =>
    b.addEventListener('click', () => switchTab((b as HTMLElement).dataset.tab as Tab)),
  );
  document.getElementById('foodSwap')?.addEventListener('click', toggleSpin);
}

// ── 全局设置：批量编辑两份清单（逗号分隔）──
export function renderFoodSettings(body: HTMLElement, onSaved: () => void) {
  if (spinning) haltSpin(true);
  body.innerHTML = `<div class="food-edit-row">
      <div class="food-edit-label">外卖 · 店名</div>
      <textarea class="food-edit-area" id="foodSetTakeout" placeholder="逗号分隔，例如 杨铭福黄焖鸡，沙县小吃，张亮麻辣烫"></textarea>
    </div>
    <div class="food-edit-row">
      <div class="food-edit-label">自己做 · 菜名</div>
      <textarea class="food-edit-area" id="foodSetCook" placeholder="逗号分隔，例如 番茄炒蛋，煮面，青椒肉丝"></textarea>
    </div>
    <button class="btn" id="foodSetSave" type="button">保存</button>`;
  (body.querySelector('#foodSetTakeout') as HTMLTextAreaElement).value = data.takeout.join('，');
  (body.querySelector('#foodSetCook') as HTMLTextAreaElement).value = data.cook.join('，');
  body.querySelector('#foodSetSave')?.addEventListener('click', () => {
    const parse = (sel: string): string[] => {
      const v = (body.querySelector(sel) as HTMLTextAreaElement | null)?.value || '';
      const seen = new Set<string>();
      return v
        .split(/[,，\n]/)
        .map((s) => s.trim())
        .filter((s) => {
          if (!s || seen.has(s)) return false;
          seen.add(s);
          return true;
        });
    };
    data = { takeout: parse('#foodSetTakeout'), cook: parse('#foodSetCook') };
    void saveData().then(() => {
      // 会话结果若已不在清单里则清空
      if (sessionResult.takeout && !data.takeout.includes(sessionResult.takeout)) sessionResult.takeout = null;
      if (sessionResult.cook && !data.cook.includes(sessionResult.cook)) sessionResult.cook = null;
      renderStage();
      onSaved();
    });
  });
}
