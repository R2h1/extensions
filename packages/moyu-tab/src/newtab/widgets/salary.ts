// ── 摸鱼工资：作息安排 + 工作/摸鱼/休息 三项累计（每日重置，刷新补足）──
import { pad } from '../utils';

export interface Sch {
  startHour: number;
  startMinute: number;
  lunchHour: number;
  lunchMinute: number;
  restEndHour: number;
  restEndMinute: number;
  endHour: number;
  endMinute: number;
  workDays: number[];
}
export interface SalStt {
  monthlyIncome: number;
  payDay: number;
}
interface SalState {
  date: string;
  mode: 'work' | 'fish';
  workIncome: number;
  fishIncome: number;
  restIncome: number;
  workSeconds: number;
  fishSeconds: number;
  lastUpdate: number;
}

const SS = 'moyu_schedule',
  SR = 'moyu_salary';
export const DEFAULT_SCHEDULE: Sch = {
  startHour: 9,
  startMinute: 0,
  lunchHour: 12,
  lunchMinute: 0,
  restEndHour: 14,
  restEndMinute: 0,
  endHour: 17,
  endMinute: 0,
  workDays: [1, 2, 3, 4, 5],
};
const WDPM = 21.75;

let schedule: Sch = { ...DEFAULT_SCHEDULE };
let salStt: SalStt = { monthlyIncome: 10000, payDay: 10 };

export async function getSal(): Promise<SalStt> {
  const r = await chrome.storage.sync.get(SR);
  return (r[SR] as SalStt) ?? { monthlyIncome: 10000, payDay: 10 };
}
/** 设置发薪配置：更新内存态 + 持久化（供设置弹窗使用） */
export async function saveSalStt(s: SalStt): Promise<void> {
  salStt = s;
  await chrome.storage.sync.set({ [SR]: s });
}
/** 读取作息安排（合并默认值，供设置弹窗展示） */
export async function getSchedule(): Promise<Sch> {
  const r = await chrome.storage.sync.get(SS);
  return { ...DEFAULT_SCHEDULE, ...(r[SS] || {}) };
}
/** 保存作息安排：更新内存态 + 持久化 */
export async function saveSchedule(s: Sch): Promise<void> {
  schedule = s;
  await chrome.storage.sync.set({ [SS]: s });
}

export async function loadSch() {
  schedule = await getSchedule();
}
export async function loadSal() {
  salStt = await getSal();
}

// ── 薪资明细状态（工作/摸鱼/休息 三项累计，每日重置，刷新补足）──
const SAL_KEY = 'moyu_salary_state';
const FISH_MULT = 0.269;
let salState: SalState = {
  date: '',
  mode: 'work',
  workIncome: 0,
  fishIncome: 0,
  restIncome: 0,
  workSeconds: 0,
  fishSeconds: 0,
  lastUpdate: Date.now(),
};
function salToday() {
  const n = new Date();
  return `${n.getFullYear()}-${n.getMonth() + 1}-${n.getDate()}`;
}
export function salRate() {
  const start = schedule.startHour * 3600 + schedule.startMinute * 60;
  const off = schedule.endHour * 3600 + schedule.endMinute * 60;
  const daySec = off - start;
  if (daySec <= 0) return 0;
  return salStt.monthlyIncome / WDPM / daySec;
}
function backfillFromStart() {
  const n = new Date();
  salState.workIncome = 0;
  salState.fishIncome = 0;
  salState.restIncome = 0;
  salState.workSeconds = 0;
  salState.fishSeconds = 0;
  salState.mode = 'work';
  salState.lastUpdate = Date.now();
  if (!schedule.workDays.includes(n.getDay())) return;
  const { start, lunch, restEnd, off } = salBandTimes();
  const rate = salRate();
  if (rate <= 0) return;
  const cur = n.getHours() * 3600 + n.getMinutes() * 60 + n.getSeconds();
  let workBand = 0;
  if (cur > start) workBand += Math.max(0, Math.min(cur, lunch) - start);
  if (cur > restEnd) workBand += Math.max(0, Math.min(cur, off) - restEnd);
  const restBand = cur > lunch ? Math.max(0, Math.min(cur, restEnd) - lunch) : 0;
  salState.workIncome = workBand * rate;
  salState.workSeconds = workBand;
  salState.restIncome = restBand * rate;
}
function loadSalState() {
  const today = salToday();
  try {
    const raw = localStorage.getItem(SAL_KEY);
    if (raw) {
      const d = JSON.parse(raw) as Partial<SalState>;
      if (d.date === today) {
        salState = { ...salState, ...d, date: today } as SalState;
        const diff = Math.floor((Date.now() - (d.lastUpdate || Date.now())) / 1000);
        if (diff > 0 && diff < 86400) recoverGap(diff);
      } else {
        backfillFromStart();
        salState.date = today;
      }
    } else {
      backfillFromStart();
      salState.date = today;
    }
  } catch {
    backfillFromStart();
    salState.date = today;
  }
}
function recoverGap(diff: number) {
  const n = new Date();
  if (!schedule.workDays.includes(n.getDay())) return;
  const cur = n.getHours() * 3600 + n.getMinutes() * 60 + n.getSeconds();
  const start = schedule.startHour * 3600 + schedule.startMinute * 60;
  const lunch = schedule.lunchHour * 3600 + schedule.lunchMinute * 60;
  const restEnd = schedule.restEndHour * 3600 + schedule.restEndMinute * 60;
  const off = schedule.endHour * 3600 + schedule.endMinute * 60;
  const rate = salRate();
  const inWork = (cur >= start && cur < lunch) || (cur >= restEnd && cur < off);
  const inRest = cur >= lunch && cur < restEnd;
  if (inWork) {
    if (salState.mode === 'work') {
      salState.workIncome += diff * rate;
      salState.workSeconds += diff;
    } else {
      salState.fishIncome += diff * rate * FISH_MULT;
      salState.fishSeconds += diff;
    }
  } else if (inRest) {
    salState.restIncome += diff * rate;
  }
}
export function rescaleSal(oldRate: number) {
  const newRate = salRate();
  if (oldRate > 0 && newRate > 0) {
    const ratio = newRate / oldRate;
    salState.workIncome *= ratio;
    salState.fishIncome *= ratio;
    salState.restIncome *= ratio;
  }
  saveSalState();
}
function saveSalState() {
  salState.lastUpdate = Date.now();
  try {
    localStorage.setItem(SAL_KEY, JSON.stringify(salState));
  } catch {}
}
function toMoney(v: number) {
  return '¥' + v.toFixed(2);
}
function toTime(sec: number) {
  const h = Math.floor(sec / 3600),
    m = Math.floor((sec % 3600) / 60),
    s = Math.floor(sec % 60);
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}
function salBandTimes() {
  const start = schedule.startHour * 3600 + schedule.startMinute * 60;
  const lunch = schedule.lunchHour * 3600 + schedule.lunchMinute * 60;
  const restEnd = schedule.restEndHour * 3600 + schedule.restEndMinute * 60;
  const off = schedule.endHour * 3600 + schedule.endMinute * 60;
  return { start, lunch, restEnd, off };
}
export function buildSalTimeline() {
  const track = document.getElementById('salTrack');
  if (!track) return;
  const { start, lunch, restEnd, off } = salBandTimes();
  const total = off - start;
  if (total <= 0) {
    track.innerHTML = '';
    return;
  }
  const mPct = ((lunch - start) / total) * 100;
  const rPct = ((restEnd - lunch) / total) * 100;
  const aPct = ((off - restEnd) / total) * 100;
  const fmt = (s: number) => `${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}`;
  const fmtDur = (s: number) => (s / 3600).toFixed(2).replace(/\.?0+$/, '') + 'h';
  track.innerHTML =
    `<div class="sal-seg seg-work" style="left:0;width:${mPct}%">上午 ${fmtDur(lunch - start)}</div>` +
    `<div class="sal-seg seg-rest" style="left:${mPct}%;width:${rPct}%">午休 ${fmtDur(restEnd - lunch)}</div>` +
    `<div class="sal-seg seg-work" style="left:${mPct + rPct}%;width:${aPct}%">下午 ${fmtDur(off - restEnd)}</div>`;
  const ticks = document.getElementById('salTicks');
  if (ticks)
    ticks.innerHTML = `<div>${fmt(start)}</div><div>${fmt(lunch)}</div><div>${fmt(restEnd)}</div><div>${fmt(off)}</div>`;
}
export function tickSalary() {
  const amt = document.getElementById('salAmount'),
    workEl = document.getElementById('salWork'),
    fishEl = document.getElementById('salFish'),
    restEl = document.getElementById('salRest'),
    timerEl = document.getElementById('salTimer'),
    ind = document.getElementById('salIndicator'),
    cd = document.getElementById('salCountdown'),
    pdp = document.getElementById('salPayDay');
  const n = new Date(),
    wd = n.getDay();
  const cur = n.getHours() * 3600 + n.getMinutes() * 60 + n.getSeconds();
  const { start, lunch, restEnd, off } = salBandTimes();
  const isWorkday = schedule.workDays.includes(wd);
  const rate = salRate();

  // 按时段累计明细收入
  if (isWorkday) {
    const inWork = (cur >= start && cur < lunch) || (cur >= restEnd && cur < off);
    const inRest = cur >= lunch && cur < restEnd;
    if (inWork) {
      if (salState.mode === 'work') {
        salState.workIncome += rate;
        salState.workSeconds++;
      } else {
        salState.fishIncome += rate * FISH_MULT;
        salState.fishSeconds++;
      }
    } else if (inRest) {
      salState.restIncome += rate;
    }
  }

  // 金额与明细
  const total = salState.workIncome + salState.fishIncome + salState.restIncome;
  if (amt) amt.textContent = toMoney(total);
  if (workEl) workEl.textContent = toMoney(salState.workIncome);
  if (fishEl) fishEl.textContent = toMoney(salState.fishIncome);
  if (restEl) restEl.textContent = toMoney(salState.restIncome);

  // 状态计时器
  if (timerEl)
    timerEl.textContent = toTime(
      salState.mode === 'work' ? salState.workSeconds : salState.fishSeconds,
    );

  // 指示针
  if (ind) {
    if (isWorkday && off > start) {
      ind.style.display = 'block';
      let pct = 0;
      if (cur < start) pct = 0;
      else if (cur > off) pct = 100;
      else pct = ((cur - start) / (off - start)) * 100;
      ind.style.left = pct + '%';
    } else {
      ind.style.display = 'none';
    }
  }

  // 倒计时
  if (cd) {
    if (!isWorkday) {
      cd.innerHTML = '周末双休，享受生活';
    } else {
      let target = 0,
        label = '';
      if (cur < start) {
        target = start;
        label = '距离上班还有';
      } else if (cur < lunch) {
        target = lunch;
        label = '距离午休还有';
      } else if (cur < restEnd) {
        target = restEnd;
        label = '午休中 · 距离上班还有';
      } else if (cur < off) {
        target = off;
        label = '距离下班还有';
      } else {
        target = start + 86400;
        label = '距离明早上班还有';
      }
      let diff = target - cur;
      if (diff < 0) diff = 0;
      cd.innerHTML = `${label} <span>${toTime(diff)}</span>`;
    }
  }

  // 发薪日
  if (pdp) {
    const y = n.getFullYear(),
      m = n.getMonth(),
      d = n.getDate();
    let next = new Date(y, m, salStt.payDay);
    if (d >= salStt.payDay) next = new Date(y, m + 1, salStt.payDay);
    const diff = Math.ceil((next.getTime() - new Date(y, m, d).getTime()) / 86400000);
    pdp.textContent =
      diff === 0
        ? '今天发薪日'
        : '距离发薪 · ' +
          diff +
          ' 天 · ' +
          pad(next.getMonth() + 1) +
          '月' +
          pad(salStt.payDay) +
          '日';
  }

  saveSalState();
}
export function initSalary() {
  loadSalState();
  buildSalTimeline();
  document.querySelectorAll('#salToggle .sal-tb').forEach((b) => {
    b.classList.toggle('active', (b as HTMLElement).dataset.mode === salState.mode);
    b.addEventListener('click', function (this: HTMLElement) {
      const m = this.dataset.mode as 'work' | 'fish';
      if (!m || salState.mode === m) return;
      salState.mode = m;
      document.querySelectorAll('#salToggle .sal-tb').forEach((x) => x.classList.remove('active'));
      this.classList.add('active');
      saveSalState();
    });
  });
  tickSalary();
}
