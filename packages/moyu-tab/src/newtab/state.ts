/** chrome.storage 封装 + 共享类型/常量/默认值 */
import { ALL_WIDGETS } from './config';

// ─── storage keys ───
export const SM = 'moyu_merit'; // 木鱼功德
export const SS = 'moyu_schedule'; // 工作时间表
export const SQ = 'moyu_quotes'; // 语录数据
export const SW = 'moyu_widgets'; // 已启用组件
export const SL = 'moyu_links'; // 快捷网址
export const SR = 'moyu_salary'; // 薪资设置

// ─── types ───
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
export const DS: Sch = {
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
export interface QD {
  builtIn: string[];
  custom: string[];
  enabledIndices: number[];
}
export interface Lk {
  name: string;
  url: string;
}
export interface SalStt {
  monthlyIncome: number;
  payDay: number;
}
export const WDPM = 21.75;

// ─── widget 启用列表 ───
export type WData = { subs: Record<string, string[]> };
export function subKey(cat: string, sub: string) {
  return cat + '.' + sub;
}
export async function getWD(): Promise<WData> {
  const r = await chrome.storage.sync.get(SW);
  const raw = r[SW] as
    | { subs?: Record<string, string[]>; cats?: Record<string, string[]> }
    | undefined;
  if (raw?.subs && !raw.cats) return { subs: raw.subs };
  // 迁移：旧 cats（按一级）或首次，按组件新 cat.sub 重组
  const subs: Record<string, string[]> = {};
  const feed = (id: string) => {
    if (id === 'clock') return;
    if (id === 'hot') {
      // 旧单个 hot 拆为三平台卡片
      ['hot_weibo', 'hot_bilibili', 'hot_baidu'].forEach((hid) => feed(hid));
      return;
    }
    const w = ALL_WIDGETS.find((x) => x.id === id);
    if (!w) return;
    const k = subKey(w.cat, w.sub);
    if (!subs[k]) subs[k] = [];
    if (!subs[k].includes(id)) subs[k].push(id);
  };
  if (raw?.cats) {
    for (const k of Object.keys(raw.cats)) {
      const arr = raw.cats[k];
      if (Array.isArray(arr)) arr.forEach(feed);
    }
  } else if (raw?.subs) {
    for (const k of Object.keys(raw.subs)) {
      const arr = raw.subs[k];
      if (Array.isArray(arr)) arr.forEach(feed);
    }
  } else {
    // 首次：默认开启所有现有组件
    ALL_WIDGETS.forEach((w) => feed(w.id));
  }
  await chrome.storage.sync.set({ [SW]: { subs } });
  return { subs };
}
export async function setWD(d: WData) {
  await chrome.storage.sync.set({ [SW]: { subs: d.subs } });
}

// ─── 快捷网址 ───
export async function getLinks(): Promise<Lk[]> {
  const r = await chrome.storage.sync.get(SL);
  return (r[SL] as Lk[]) ?? [];
}
export async function setLinks(ls: Lk[]) {
  await chrome.storage.sync.set({ [SL]: ls });
}

// ─── 薪资设置 ───
export async function getSal(): Promise<SalStt> {
  const r = await chrome.storage.sync.get(SR);
  return (r[SR] as SalStt) ?? { monthlyIncome: 10000, payDay: 10 };
}
export async function setSal(s: SalStt) {
  await chrome.storage.sync.set({ [SR]: s });
}
