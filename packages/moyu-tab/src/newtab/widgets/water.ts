/** 喝水提醒：记录每日饮水量，按设定间隔定时提醒。
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
/** 通知 SW 按当前间隔重建/清除提醒闹钟（页面每次打开也会同步一次，保证闹钟存在） */
function syncReminder() {
  void chrome.runtime
    .sendMessage({ type: 'WATER_SET_REMINDER', interval: data.interval })
    .catch(() => {});
}

const DROP =
  '<svg width="54" height="54" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2.7S6 9.5 6 13.8a6 6 0 0 0 12 0C18 9.5 12 2.7 12 2.7z"/><path d="M9.5 14a3 3 0 0 0 2.5 3"/></svg>';

function tg(id: string, cur: number): string {
  const opts =
    id === 'waterGoalTg'
      ? GOALS.map((v) => ({ v, label: `${v / 1000}L` }))
      : id === 'waterCupTg'
        ? CUPS.map((v) => ({ v, label: `${v}ml` }))
        : INTERVALS;
  return `<div class="calc-toggle" id="${id}">${opts
    .map((o) => `<span class="calc-tb${o.v === cur ? ' active' : ''}" data-v="${o.v}">${o.label}</span>`)
    .join('')}</div>`;
}

export function renderWaterCard(): string {
  const pct = Math.min(100, Math.round((data.total / data.goal) * 100));
  return `<div class="widget-card calc-card water-card">
      <div class="water-main">
        <span class="water-ico">${DROP}</span>
        <div class="water-num" id="waterNum">${data.total}</div>
        <span class="water-unit">ml / 目标 ${data.goal}ml</span>
      </div>
      <div class="water-bar"><div class="water-fill" id="waterFill" style="width:${pct}%"></div></div>
      <div class="water-meta" id="waterMeta"></div>
      <div class="water-actions">
        <button class="water-add" id="waterAdd" type="button">+ 一杯（${data.cup}ml）</button>
        <button class="water-undo" id="waterUndo" type="button" title="撤回一杯">↺</button>
      </div>
      <div class="water-settings">
        <div class="water-set"><span class="water-set-label">每日目标</span>${tg('waterGoalTg', data.goal)}</div>
        <div class="water-set"><span class="water-set-label">单杯容量</span>${tg('waterCupTg', data.cup)}</div>
        <div class="water-set"><span class="water-set-label">提醒间隔</span>${tg('waterIntTg', data.interval)}</div>
      </div>
    </div>`;
}

function renderWater() {
  const num = document.getElementById('waterNum');
  const fill = document.getElementById('waterFill');
  const meta = document.getElementById('waterMeta');
  const add = document.getElementById('waterAdd') as HTMLButtonElement | null;
  if (num) num.textContent = String(data.total);
  if (fill) fill.style.width = `${Math.min(100, Math.round((data.total / data.goal) * 100))}%`;
  if (meta) {
    const cups = data.total / data.cup;
    const remain = Math.max(0, data.goal - data.total);
    meta.textContent =
      data.total >= data.goal
        ? `🎉 已达标！今日 ${cups.toFixed(1)} 杯`
        : `今日已喝 ${cups.toFixed(1)} 杯 · 还差 ${remain}ml`;
  }
  if (add) add.textContent = `+ 一杯（${data.cup}ml）`;
  // 同步各设置项高亮
  const syncTg = (id: string, cur: number) =>
    document.getElementById(id)?.querySelectorAll('.calc-tb').forEach((b) => {
      b.classList.toggle('active', Number((b as HTMLElement).dataset.v) === cur);
    });
  syncTg('waterGoalTg', data.goal);
  syncTg('waterCupTg', data.cup);
  syncTg('waterIntTg', data.interval);
}

function bindWater() {
  document.getElementById('waterAdd')?.addEventListener('click', () => {
    data.total += data.cup;
    void save().then(() => {
      renderWater();
      syncReminder(); // 达标后让 SW 跳过后续提醒
    });
  });
  document.getElementById('waterUndo')?.addEventListener('click', () => {
    data.total = Math.max(0, data.total - data.cup);
    void save().then(renderWater);
  });
  const bindTg = (id: string, apply: (v: number) => void) =>
    document.getElementById(id)?.querySelectorAll('.calc-tb').forEach((b) =>
      b.addEventListener('click', () => {
        apply(Number((b as HTMLElement).dataset.v));
        void save().then(() => {
          renderWater();
          syncReminder();
        });
      }),
    );
  bindTg('waterGoalTg', (v) => (data.goal = v));
  bindTg('waterCupTg', (v) => (data.cup = v));
  bindTg('waterIntTg', (v) => (data.interval = v));
}

export async function initWater() {
  data = await load();
  renderWater();
  bindWater();
  syncReminder(); // 页面打开即确保闹钟存在（SW 重启/浏览器重启后重新拉起）
}