/** 节假日倒计时：融入日历卡。timor.tech SW 代理，周末本地计算，每日一拉 */
import { esc, pad, isSameDay, todayMidnight, ymdMidnight } from '../utils';

const HOL_KEY = 'moyu_holiday_cache';
const HOL_DAY = 86400000;
interface HolBlock {
  name: string;
  date: string;
}
interface HolCache {
  list: HolBlock[];
  ts: number; // 上次成功拉取时间戳
  attemptTs?: number; // 上次尝试时间（含失败），用于失败冷却，避免压满每日配额
}
let holLoading = false;
let holInited = false;

function loadHolCache(): HolCache | null {
  try {
    const raw = localStorage.getItem(HOL_KEY);
    return raw ? (JSON.parse(raw) as HolCache) : null;
  } catch {
    return null;
  }
}
function saveHolCache(c: HolCache) {
  try {
    localStorage.setItem(HOL_KEY, JSON.stringify(c));
  } catch {}
}
/** 每日最多自动拉取一次：当天成功过即跳过，失败/进行中冷却 5 分钟。手动 ↻ 不走此门控。 */
function holNeedsFetch(): boolean {
  const c = loadHolCache();
  if (c && isSameDay(c.ts)) return false;
  if (c?.attemptTs && Date.now() - c.attemptTs < 5 * 60 * 1000) return false;
  return true;
}
function holDaysLeft(dateStr: string): number {
  return Math.round((ymdMidnight(dateStr) - todayMidnight()) / HOL_DAY);
}
function fmtHolDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const wd = ['日', '一', '二', '三', '四', '五', '六'][new Date(y, m - 1, d).getDay()];
  return `${m}月${d}日 周${wd}`;
}
function fmtHolTime(ts: number): string {
  const d = new Date(ts);
  return pad(d.getHours()) + ':' + pad(d.getMinutes());
}
/** 周末行：本地计算距周六天数，格式与假期行一致，作为列表首行。 */
function weekendRow(): string {
  const n = new Date();
  const daysToSat = (6 - n.getDay() + 7) % 7;
  const sat = new Date(n.getFullYear(), n.getMonth(), n.getDate() + daysToSat);
  const ymd = `${sat.getFullYear()}-${pad(sat.getMonth() + 1)}-${pad(sat.getDate())}`;
  const leftTxt = daysToSat === 0 ? '今天' : `${daysToSat} 天`;
  return `<div class="hol-row"><span class="hol-name">周末</span><span class="hol-date">${fmtHolDate(ymd)}</span><span class="hol-days">${leftTxt}</span></div>`;
}
function renderHolList(error: boolean) {
  const list = document.getElementById('holidayList');
  const upd = document.getElementById('holidayUpd');
  if (!list) return;
  const cache = loadHolCache();
  const items = (cache?.list ?? []).filter((b) => holDaysLeft(b.date) >= 0).slice(0, 3);
  const rows = [
    weekendRow(),
    ...items.map((b) => {
      const left = holDaysLeft(b.date);
      const leftTxt = left === 0 ? '今天' : `${left} 天`;
      return `<div class="hol-row"><span class="hol-name">${esc(b.name)}</span><span class="hol-date">${fmtHolDate(b.date)}</span><span class="hol-days">${leftTxt}</span></div>`;
    }),
  ];
  if (!items.length) {
    rows.push(`<div class="hot-empty">${error ? '⚠ 获取失败 · 点击重试' : '假期加载中…'}</div>`);
    list.innerHTML = rows.join('');
    list.onclick = error ? () => refreshHoliday() : null;
    if (upd) upd.textContent = error ? '⚠ 失败' : '';
    return;
  }
  list.onclick = null;
  list.innerHTML = rows.join('');
  if (upd) upd.textContent = cache ? `于 ${fmtHolTime(cache.ts)} 更新` : '';
}
async function refreshHoliday() {
  if (holLoading) return;
  if (!document.getElementById('holidayList')) return;
  const btn = document.getElementById('holidayRefresh');
  holLoading = true;
  btn?.classList.add('spin');
  // 记录本次尝试时间，跨标签页并发去重 + 失败冷却
  const prev = loadHolCache();
  saveHolCache({ list: prev?.list ?? [], ts: prev?.ts ?? 0, attemptTs: Date.now() });
  try {
    const res = (await chrome.runtime.sendMessage({ type: 'HOLIDAY_FETCH' })) as
      | { success: boolean; data?: { list: HolBlock[] }; error?: string }
      | undefined;
    if (res?.success && res.data?.list) {
      saveHolCache({ list: res.data.list, ts: Date.now(), attemptTs: Date.now() });
      renderHolList(false);
    } else {
      renderHolList(true);
    }
  } catch {
    renderHolList(true);
  } finally {
    holLoading = false;
    btn?.classList.remove('spin');
  }
}
function onHolVis() {
  if (document.visibilityState !== 'visible') return;
  if (holNeedsFetch()) refreshHoliday();
}
export async function initHoliday() {
  renderHolList(false);
  document.getElementById('holidayRefresh')?.addEventListener('click', refreshHoliday);
  if (holInited) return;
  holInited = true;
  // 每日最多自动拉取一次（成功后当日不再请求），保护 timor.tech 1万次/日共享配额
  if (holNeedsFetch()) refreshHoliday();
  document.addEventListener('visibilitychange', onHolVis);
}
