/** 喝水提醒：右下角量杯图标 + 点击弹出简洁打水层；设置（目标/杯量/提醒间隔/模拟提醒）在「全局设置 → 喝水」里。
 *  数据存 chrome.storage.local（SW 的定时提醒闹钟也读同一份，跨天自动重置累计、保留设置）。 */
const WATER_KEY = 'moyu_water';

interface WaterData {
  date: string; // 'YYYY-MM-DD' 该累计归属的日期
  total: number; // 当日累计 ml
  goal: number; // 每日目标 ml
  cup: number; // 单次「+一杯」ml
  interval: number; // 提醒间隔分钟，0=关闭
}

const GOALS = [1500, 2000, 2500, 3000];
const CUPS = [150, 250, 300, 500];
const INTERVALS = [
  { v: 0, label: '关闭' },
  { v: 30, label: '30 分钟' },
  { v: 60, label: '60 分钟' },
  { v: 120, label: '120 分钟' },
];

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const DEFAULTS: WaterData = { date: todayStr(), total: 0, goal: 2000, cup: 250, interval: 60 };

let data: WaterData = { ...DEFAULTS };

async function load(): Promise<WaterData> {
  try {
    const r = (await chrome.storage.local.get(WATER_KEY)) as Record<string, WaterData | undefined>;
    const d = r?.[WATER_KEY];
    if (d && typeof d.goal === 'number') {
      const cur = todayStr();
      // 跨天：累计清零，保留目标/杯量/间隔设置
      return { ...d, date: cur, total: d.date === cur ? d.total : 0 };
    }
  } catch {}
  return { ...DEFAULTS, date: todayStr() };
}
async function save() {
  try {
    await chrome.storage.local.set({ [WATER_KEY]: data });
  } catch {}
}
/** 通知 SW 按当前间隔重建/清除提醒闹钟 */
function syncReminder() {
  void chrome.runtime
    .sendMessage({ type: 'WATER_SET_REMINDER', interval: data.interval })
    .catch(() => {});
}

const CUP_ICON =
  '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M7.5 3h9v1.5h-1.2V8a3.8 3.8 0 0 0 2.4 3.5V19a2 2 0 0 1-2 2h-7a2 2 0 0 1-2-2v-7.5A3.8 3.8 0 0 0 9 8V4.5H7.5z"/><path d="M9.5 12.5h5M9.5 15h5M9.5 17.5h5"/></svg>';

/** 分段选项 HTML（用于设置与弹层） */
function tg(id: string, opts: { v: number; label: string }[], cur: number): string {
  return `<div class="calc-toggle water-tg" id="${id}">${opts
    .map((o) => `<span class="calc-tb${o.v === cur ? ' active' : ''}" data-v="${o.v}">${o.label}</span>`)
    .join('')}</div>`;
}
function goalOpts() {
  return GOALS.map((v) => ({ v, label: `${v / 1000}L` }));
}

/** 刷新右下角弹层内容 */
function refreshWater() {
  const num = document.getElementById('waterPopNum');
  const goal = document.getElementById('waterPopGoal');
  const fill = document.getElementById('waterPopFill');
  const meta = document.getElementById('waterPopMeta');
  const add = document.getElementById('waterPopAdd') as HTMLButtonElement | null;
  if (num) num.textContent = String(data.total);
  if (goal) goal.textContent = `目标 ${data.goal}ml`;
  if (fill) fill.style.width = `${Math.min(100, Math.round((data.total / data.goal) * 100))}%`;
  if (meta) {
    const remain = Math.max(0, data.goal - data.total);
    meta.textContent =
      data.total >= data.goal
        ? `🎉 已达标！今日 ${(data.total / data.cup).toFixed(1)} 杯`
        : `已 ${(data.total / data.cup).toFixed(1)} 杯 · 还差 ${remain}ml`;
  }
  if (add) add.textContent = `+ 一杯（${data.cup}ml）`;
}

function togglePop(open?: boolean) {
  const pop = document.getElementById('waterPop');
  if (!pop) return;
  const show = open ?? !pop.classList.contains('open');
  pop.classList.toggle('open', show);
  if (show) refreshWater();
}

export async function initWater() {
  data = await load();
  refreshWater();
  document.getElementById('waterFab')?.addEventListener('click', () => togglePop());
  document.getElementById('waterPopAdd')?.addEventListener('click', () => {
    data.total += data.cup;
    void save().then(() => {
      refreshWater();
      syncReminder(); // 达标后让 SW 跳过后续提醒
    });
  });
  document.getElementById('waterPopUndo')?.addEventListener('click', () => {
    data.total = Math.max(0, data.total - data.cup);
    void save().then(refreshWater);
  });
  document.addEventListener('click', (e) => {
    if (!(e.target as HTMLElement).closest('#waterDock')) togglePop(false);
  });
  document.addEventListener('keydown', (e) => {
    if ((e as KeyboardEvent).key === 'Escape') togglePop(false);
  });
  syncReminder(); // 页面打开即确保闹钟存在（SW 重启/浏览器重启后重新拉起）
}

/** 全局设置 → 喝水：目标 / 杯量 / 间隔 + 模拟提醒 */
export function renderWaterSettings(body: HTMLElement, onSaved: () => void) {
  body.innerHTML = `
    <div class="f"><label>每日目标</label>${tg('wsGoal', goalOpts(), data.goal)}</div>
    <div class="f"><label>单杯容量（点一下 + 的量）</label>${tg('wsCup', CUPS.map((v) => ({ v, label: `${v}ml` })), data.cup)}</div>
    <div class="f"><label>提醒间隔</label>${tg('wsInt', INTERVALS, data.interval)}</div>
    <div class="f"><label>模拟提醒</label><button class="btn" id="wsSim" type="button">发送一条测试提醒</button></div>`;
  const bind = (id: string, apply: (v: number) => void) =>
    body.querySelectorAll(`#${id} .calc-tb`).forEach((b) =>
      b.addEventListener('click', () => {
        apply(Number((b as HTMLElement).dataset.v));
        void save().then(() => {
          syncReminder();
          refreshWater();
          onSaved();
        });
      }),
    );
  bind('wsGoal', (v) => (data.goal = v));
  bind('wsCup', (v) => (data.cup = v));
  bind('wsInt', (v) => (data.interval = v));
  body.querySelector('#wsSim')?.addEventListener('click', () => {
    void chrome.runtime
      .sendMessage({ type: 'WATER_SIMULATE' })
      .then(() => onSaved());
  });
}