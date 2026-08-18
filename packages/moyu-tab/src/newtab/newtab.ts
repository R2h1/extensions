import { initHoliday } from './widgets/holiday';
import { initWeread, renderWereadCard } from './widgets/weread';
import { initNotes, renderNotesCard } from './widgets/notes';
import { initSearch, renderSearchCard } from './widgets/search';
import { initWereadOverview, renderWereadOverviewCard } from './widgets/weread-overview';
import { openBookReviewIn } from './widgets/weread-shared';
import { initWater } from './widgets/water';
import {
  initNavCards,
  renderAiCard,
  renderToolboxCard,
  renderNavHubCard,
} from './widgets/nav-cards';
import { initCloud, renderCloudCard } from './widgets/cloud';
import { initTranslate, renderTranslateCard } from './widgets/translate';
import { initCommunity, renderCommunityCard } from './widgets/community';
import { initWeather } from './widgets/weather';
import { initTyphoon } from './widgets/typhoon';
import { renderNewsCard, initNewsCard } from './widgets/news';
import { renderStatsCard, initStats } from './widgets/stats';
import { getLunar } from './lunar';
import { CAT_TREE, ALL_WIDGETS, TopCat, WID } from './config';
import { showMessage } from './ui/toast';
import { initWebSearch } from './widgets/searchbox';
import { initMedia } from './widgets/media';
import { loadWallpaper, setWallpaperWidgetOpener } from './widgets/wallpaper';
import { initSalary, tickSalary, loadSal, loadSch } from './widgets/salary';
import { openSettings, closeSettings } from './ui/settings';

// 顶部快捷入口条（搜索框下方）：配置数组驱动，新增入口只需往 DOCK_ITEMS 加一条。
// 工具策略：所有计算/工具功能在网站 conan.js.cn 实现，moyu-tab 只提供跳转。
interface DockItem {
  id: string;
  label: string;
  href: string;
  external?: boolean; // 新标签页打开
  letter?: string; // 可选小方块字母（mkt-link-chip / mkt-link-letter 风格）
  color?: string; // 可选小方块背景色
}
const DOCK_ITEMS: DockItem[] = [
  {
    id: 'tools',
    label: '工具箱',
    href: 'https://conan.js.cn/',
    external: true,
    letter: '工',
    color: '#d97706',
  },
  {
    id: 'market',
    label: '行情',
    href: 'https://conan.js.cn/market',
    external: true,
    letter: '行',
    color: '#dc2626',
  },
  {
    id: 'hot',
    label: '热搜',
    href: 'https://conan.js.cn/hot',
    external: true,
    letter: '热',
    color: '#ef4444',
  },
];

const SW = 'moyu_widgets',
  WV = 8; // 组件存储结构版本：变更组件分类归属时 +1，触发按新 cat.sub 重组迁移
// 类型、图标、分类树、组件元数据统一从 ./config 导入（消除与 config.ts 的双份维护）
type WData = { subs: Record<string, string[]> };
function subKey(cat: string, sub: string) {
  return cat + '.' + sub;
}
async function getWD(): Promise<WData> {
  const r = await chrome.storage.sync.get(SW);
  const raw = r[SW] as
    | { subs?: Record<string, string[]>; cats?: Record<string, string[]>; v?: number }
    | undefined;
  if (raw?.subs && !raw.cats && raw.v === WV) return { subs: raw.subs };
  // 迁移：旧 cats（按一级）、版本不匹配或首次，按组件新 cat.sub 重组
  const subs: Record<string, string[]> = {};
  const feed = (id: string) => {
    if (id === 'clock') return;
    // 旧的「书签同步」卡已被三张策展导航卡取代
    if (id === 'bookmarks') {
      ['ai', 'toolbox', 'devnav'].forEach(feed);
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
  await chrome.storage.sync.set({ [SW]: { subs, v: WV } });
  return { subs };
}
async function setWD(d: WData) {
  await chrome.storage.sync.set({ [SW]: { subs: d.subs, v: WV } });
}

const NM_ENTER_DUR = 500;
const curCat = CAT_TREE[0].id;
const curSub = 'all';
let nmEnterStart = 0;
let nmRaf = 0;
function nmSchedule() {
  if (nmRaf) return;
  nmRaf = requestAnimationFrame(nmUpdate);
}
function nmUpdate() {
  nmRaf = 0;
  const now = performance.now();
  const panel = document.getElementById('panel');
  let entering = false;
  if (panel) {
    const cards = Array.from(panel.querySelectorAll('.widget-card')) as HTMLElement[];
    cards.forEach((el, idx) => {
      const elapsed = now - nmEnterStart - idx * 70;
      let enter = 0;
      if (elapsed < 0) enter = 1;
      else if (elapsed < NM_ENTER_DUR) {
        enter = 1 - elapsed / NM_ENTER_DUR;
        entering = true;
      }
      if (enter > 0.001) {
        el.style.opacity = String(1 - enter);
        el.style.transform = `translateY(${enter * 22}px) scale(${1 - enter * 0.04})`;
      } else {
        el.style.opacity = '';
        el.style.transform = '';
      }
    });
  }
  if (entering) nmSchedule();
}
function nmTrigger() {
  nmEnterStart = performance.now();
  nmSchedule();
}
function nonEmptySubs(top: TopCat) {
  return top.subs.filter((s) => ALL_WIDGETS.some((w) => w.cat === top.id && w.sub === s.id));
}
let rendered: Record<string, boolean> = {};
async function renderPanel() {
  const d = await getWD();
  const enabled = new Set<string>();
  for (const k of Object.keys(d.subs)) {
    for (const id of d.subs[k]) enabled.add(id);
  }
  const leftIds: string[] = [];
  const rightIds: string[] = [];
  for (const w of ALL_WIDGETS) {
    if (!enabled.has(w.id)) continue;
    (w.id === 'news' || w.id === 'stats' ? leftIds : rightIds).push(w.id);
  }
  // 左列顺序：网站统计 → 资讯
  const leftOrder = ['stats', 'news'];
  leftIds.sort((a, b) => leftOrder.indexOf(a) - leftOrder.indexOf(b));
  const feedCol = document.getElementById('feedCol');
  const cardsCol = document.getElementById('cardsCol');
  rendered = {};
  if (!feedCol || !cardsCol) return;
  const html = (ids: string[]) =>
    ids
      .map((id) => ALL_WIDGETS.find((x) => x.id === id))
      .filter(Boolean)
      .map((w) => getCard(w!))
      .join('');
  feedCol.innerHTML = leftIds.length ? html(leftIds) : '';
  cardsCol.innerHTML = rightIds.length
    ? html(rightIds)
    : `<div class="empty"><div>暂无组件</div><div class="add-hint">左下角点 添加</div></div>`;
  for (const id of [...leftIds, ...rightIds]) initW(id);
  nmTrigger();
}
function getCard(w: WID): string {
  if (w.id === 'weread') return renderWereadOverviewCard();
  if (w.id === 'ai') return renderAiCard();
  if (w.id === 'toolbox') return renderToolboxCard();
  if (w.id === 'devnav') return renderNavHubCard();
  if (w.id === 'cloud') return renderCloudCard();
  if (w.id === 'translate') return renderTranslateCard();
  if (w.id === 'community') return renderCommunityCard();
  if (w.id === 'news') return renderNewsCard();
  if (w.id === 'stats') return renderStatsCard();
  return `<div class="widget-card clickable" data-widget="${w.id}"><div class="widget-entry"><span>${w.desc}</span><span class="arrow">→</span></div></div>`;
}
async function initW(id: string) {
  if (rendered[id]) return;
  rendered[id] = true;
  switch (id) {
    case 'news':
      initNewsCard();
      break;
    case 'weread':
      initWereadOverview(openWereadModal, openReviewModal);
      break;
    case 'ai':
    case 'toolbox':
    case 'devnav':
      initNavCards();
      break;
    case 'cloud':
      initCloud();
      break;
    case 'translate':
      initTranslate();
      break;
    case 'community':
      initCommunity();
      break;
    case 'stats':
      initStats();
      break;
  }
}

document.getElementById('addWidgetBtn')!.addEventListener('click', () => openWidgetModal(true));
document.getElementById('settingsBtn')!.addEventListener('click', openSettings);

// ── Widget Modal ──
const wm = document.getElementById('widgetModal')!;
document.getElementById('wmClose')!.addEventListener('click', () => wm.classList.remove('open'));
wm.addEventListener('click', (e) => {
  if (e.target === wm) wm.classList.remove('open');
});
async function renderWmList(cat: string, sub: string) {
  const d = await getWD();
  const top = CAT_TREE.find((t) => t.id === cat);
  const subs = top ? nonEmptySubs(top) : [];
  const wid = ALL_WIDGETS.filter((w) => {
    if (w.cat !== cat) return false;
    if (sub === 'all') return subs.some((s) => s.id === w.sub);
    return w.sub === sub;
  });
  if (!wid.length) {
    document.getElementById('widgetList')!.innerHTML =
      '<div style="font-size:12px;color:var(--text-tertiary);text-align:center;padding:20px 0">该分类暂无可用组件</div>';
    return;
  }
  let h = '';
  wid.forEach((w) => {
    const on = (d.subs[subKey(w.cat, w.sub)] || []).includes(w.id);
    h += `<div class="wg-item"><div><div class="wg-name">${w.name}</div><div class="wg-desc">${w.desc}</div></div><button class="wg-toggle ${on ? 'on' : 'off'}" data-id="${w.id}" data-cat="${w.cat}" data-sub="${w.sub}"></button></div>`;
  });
  document.getElementById('widgetList')!.innerHTML = h;
  document
    .getElementById('widgetList')!
    .querySelectorAll('.wg-toggle')
    .forEach((b) =>
      b.addEventListener('click', async function (this: HTMLElement) {
        const id = this.dataset.id!,
          wcat = this.dataset.cat!,
          wsub = this.dataset.sub!;
        const d = await getWD();
        const k = subKey(wcat, wsub);
        const arr = d.subs[k] || [];
        if (this.classList.contains('on')) {
          this.classList.replace('on', 'off');
          d.subs[k] = arr.filter((x) => x !== id);
        } else {
          this.classList.replace('off', 'on');
          d.subs[k] = [...arr, id];
        }
        await setWD(d);
        renderPanel();
        renderWmList(wmCat, wmSub);
      }),
    );
}
let wmCat = curCat;
let wmSub = curSub;
function renderWmSidebar() {
  const sb = document.getElementById('wmSidebar')!;
  sb.innerHTML = CAT_TREE.map(
    (top) =>
      `<button class="wm-cat${top.id === wmCat ? ' active' : ''}" data-cat="${top.id}">${top.name}</button>`,
  ).join('');
  sb.querySelectorAll('.wm-cat').forEach((b) =>
    b.addEventListener('click', () => {
      wmCat = (b as HTMLElement).dataset.cat!;
      wmSub = 'all';
      renderWmSidebar();
      renderWmTabs();
      renderWmList(wmCat, wmSub);
    }),
  );
}
function renderWmTabs() {
  const tabs = document.getElementById('wmTabs')!;
  const top = CAT_TREE.find((t) => t.id === wmCat);
  const subs = top ? nonEmptySubs(top) : [];
  if (subs.length <= 1) {
    tabs.style.display = 'none';
    return;
  }
  tabs.style.display = '';
  const chip = (id: string, name: string) =>
    `<button class="wm-tab${id === wmSub ? ' active' : ''}" data-sub="${id}">${name}</button>`;
  tabs.innerHTML = chip('all', '全部') + subs.map((s) => chip(s.id, s.name)).join('');
  tabs.querySelectorAll('.wm-tab').forEach((b) =>
    b.addEventListener('click', () => {
      wmSub = (b as HTMLElement).dataset.sub!;
      renderWmTabs();
      renderWmList(wmCat, wmSub);
    }),
  );
}
async function openWidgetModal(showTree: boolean) {
  wmCat = curCat;
  wmSub = curSub;
  const sb = document.getElementById('wmSidebar')!;
  if (showTree) {
    renderWmSidebar();
    sb.style.display = '';
  } else {
    sb.style.display = 'none';
  }
  renderWmTabs();
  await renderWmList(wmCat, wmSub);
  wm.classList.add('open');
}
setWallpaperWidgetOpener(() => openWidgetModal(false));

// ── 实用工具弹窗（单工具弹窗：只展示被点击的工具，无工具切换列表）──
// ── 微信读书弹窗（单视图：点什么看什么，无 tab 切换，复用各 widget 的 render/init）──
const WR_VIEWS = [
  { id: 'shelf', name: '我的书架', render: renderWereadCard, init: initWeread },
  { id: 'notes', name: '我的笔记', render: renderNotesCard, init: initNotes },
  {
    id: 'search',
    name: '搜书',
    render: renderSearchCard,
    init: () => {
      const q = pendingSearchQuery;
      pendingSearchQuery = '';
      void initSearch(q);
    },
  },
  {
    id: 'review',
    name: '书评',
    render: () => '<div class="hot-empty">加载中…</div>',
    init: () => {
      const b = pendingReviewBook;
      pendingReviewBook = null;
      if (b) void openBookReviewIn(document.getElementById('wrModalContent')!, b);
    },
  },
];
const wrModal = document.getElementById('wereadModal')!;
let wrModalCur = 'shelf';
let pendingSearchQuery = '';
let pendingReviewBook: { bid: string; title: string; cover: string; deepLink: string } | null =
  null;
function renderWrPane() {
  const v = WR_VIEWS.find((x) => x.id === wrModalCur);
  const c = document.getElementById('wrModalContent');
  const title = document.getElementById('wrModalTitle');
  const mh = document.querySelector('#wereadModal .mh');
  if (!v || !c) return;
  if (title) title.textContent = v.name;
  mh?.querySelector('.hot-swap')?.remove();
  c.innerHTML = v.render();
  v.init();
  // 把刷新按钮移到标题后面（更新时间留在卡片内不展示）
  const swap = c.querySelector('.hot-swap');
  if (swap && title?.parentNode) title.parentNode.insertBefore(swap, title.nextSibling);
}
function openWereadModal(tab?: string, query?: string) {
  if (tab) wrModalCur = tab;
  if (tab === 'search' && query) pendingSearchQuery = query;
  renderWrPane();
  wrModal.classList.add('open');
}
function openReviewModal(book: { bid: string; title: string; cover: string; deepLink: string }) {
  pendingReviewBook = book;
  openWereadModal('review');
}
document
  .getElementById('wrModalClose')!
  .addEventListener('click', () => wrModal.classList.remove('open'));
wrModal.addEventListener('click', (e) => {
  if (e.target === wrModal) wrModal.classList.remove('open');
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    wm.classList.remove('open');
    closeSettings();
  }
});

function pad(n: number) {
  return String(n).padStart(2, '0');
}
function initClock() {
  const app = document.documentElement;
  const lockBtn = document.getElementById('lockBtn');
  const toggleLock = () => {
    const l = app.classList.toggle('locked');
    localStorage.setItem('moyu_locked', l ? '1' : '0');
    lockBtn?.classList.toggle('on', l);
  };
  lockBtn?.addEventListener('click', toggleLock);
  if (app.classList.contains('locked')) lockBtn?.classList.add('on');
  updT();
}

// ── 屏幕常亮（chrome.power，由 SW 全局保持显示）──
let keepOnState = { on: false, since: 0 };
function fmtKeepOnElapsed(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const p = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${p(m)}:${p(sec)}` : `${p(m)}:${p(sec)}`;
}
function tickKeepOn(): void {
  const btn = document.getElementById('keepOnBtn');
  if (!btn) return;
  if (keepOnState.on && keepOnState.since) {
    btn.setAttribute('title', `屏幕常亮 · ${fmtKeepOnElapsed(Date.now() - keepOnState.since)}`);
  } else {
    btn.setAttribute('title', '屏幕常亮');
  }
}
async function initKeepOn(): Promise<void> {
  const btn = document.getElementById('keepOnBtn');
  if (!btn) return;
  try {
    const res = (await chrome.runtime.sendMessage({ type: 'SCREENON_STATUS' })) as {
      success: boolean;
      state?: { on: boolean; since: number };
    };
    if (res?.state) keepOnState = res.state;
  } catch {}
  btn.classList.toggle('on', keepOnState.on);
  tickKeepOn();
  btn.addEventListener('click', async () => {
    const next = !keepOnState.on;
    try {
      const res = (await chrome.runtime.sendMessage({
        type: next ? 'SCREENON_ON' : 'SCREENON_OFF',
      })) as { success: boolean; state?: { on: boolean; since: number } };
      if (res?.state) keepOnState = res.state;
      btn.classList.toggle('on', keepOnState.on);
      tickKeepOn();
      showMessage(
        keepOnState.on ? '屏幕已常亮' : '已关闭屏幕常亮',
        keepOnState.on ? 'success' : 'info',
      );
    } catch {
      showMessage('操作失败，请重试', 'error');
    }
  });
}

function updT() {
  const n = new Date();
  const td = document.getElementById('timeDisplay');
  if (td) td.textContent = `${pad(n.getHours())}:${pad(n.getMinutes())}:${pad(n.getSeconds())}`;
  const dd = document.getElementById('dateDisplay');
  if (dd) {
    const l = getLunar(n.getFullYear(), n.getMonth() + 1, n.getDate());
    const wk = '日一二三四五六'[n.getDay()];
    const lunar = l.ld > 0 ? ` <span class="d-lunar">${l.cM}月${l.cD}</span>` : '';
    dd.innerHTML = `<span class="d-year">${n.getFullYear()}年</span><span class="d-md">${pad(n.getMonth() + 1)}月${pad(n.getDate())}日</span> <span class="d-week">星期${wk}</span>${lunar}`;
  }
}

// ── 日历 ──
let calYear = 0,
  calMonth = 0;
let calDocCloseBound = false;
function closeAllDropdowns() {
  document.querySelectorAll('.cal-dd.open').forEach((dd) => dd.classList.remove('open'));
}
function buildDropdown(
  ddId: string,
  opts: { v: string; label: string }[],
  current: string,
  onChange: (v: string) => void,
) {
  const dd = document.getElementById(ddId);
  if (!dd) return;
  const list = dd.querySelector('.cal-dd-list');
  if (list && !list.children.length) {
    list.innerHTML = opts
      .map(
        (o) =>
          `<div class="cal-dd-opt${o.v === current ? ' active' : ''}" data-v="${o.v}">${o.label}</div>`,
      )
      .join('');
  }
  const btn = dd.querySelector('.cal-dd-btn');
  btn?.addEventListener('click', (e) => {
    e.stopPropagation();
    const wasOpen = dd.classList.contains('open');
    closeAllDropdowns();
    if (!wasOpen) {
      dd.classList.add('open');
      list?.querySelector('.active')?.scrollIntoView({ block: 'nearest' });
    }
  });
  list?.querySelectorAll('.cal-dd-opt').forEach((opt) =>
    opt.addEventListener('click', (e) => {
      e.stopPropagation();
      const v = (opt as HTMLElement).dataset.v!;
      dd.classList.remove('open');
      onChange(v);
    }),
  );
}
function syncDD(ddId: string, value: string, label: string) {
  const dd = document.getElementById(ddId);
  if (!dd) return;
  const valEl = dd.querySelector('.cal-dd-val');
  if (valEl) valEl.textContent = label;
  dd.querySelectorAll('.cal-dd-opt').forEach((o) =>
    o.classList.toggle('active', (o as HTMLElement).dataset.v === value),
  );
}
function renderCalendar() {
  const grid = document.getElementById('calGrid');
  if (!grid) return;
  const y = calYear,
    m = calMonth;
  syncDD('calYearDD', String(y), y + '年');
  syncDD('calMonthDD', String(m), m + 1 + '月');
  const firstWeekday = (new Date(y, m, 1).getDay() + 6) % 7; // 周一=0
  const lastDate = new Date(y, m + 1, 0).getDate();
  const today = new Date();
  const isCurMonth = today.getFullYear() === y && today.getMonth() === m;
  let html = '';
  for (let i = 0; i < firstWeekday; i++) html += '<div class="cal-cell blank"></div>';
  for (let d = 1; d <= lastDate; d++) {
    const isToday = isCurMonth && d === today.getDate();
    const isWeekend = (firstWeekday + d - 1) % 7 >= 5;
    const lunar = getLunar(y, m + 1, d);
    const lunarText = d === 1 ? (lunar.cM ? lunar.cM + '月' : '') : lunar.cD || '';
    html += `<div class="cal-cell${isToday ? ' today' : ''}${isWeekend ? ' weekend' : ''}"><span class="cal-d">${d}</span><span class="cal-l">${lunarText}</span></div>`;
  }
  grid.innerHTML = html;
}
function initCalendar() {
  const now = new Date();
  calYear = now.getFullYear();
  calMonth = now.getMonth();
  const yOpts: { v: string; label: string }[] = [];
  for (let y = 1900; y <= 2099; y++) yOpts.push({ v: String(y), label: y + '年' });
  const mOpts: { v: string; label: string }[] = [];
  for (let m = 0; m < 12; m++) mOpts.push({ v: String(m), label: m + 1 + '月' });
  buildDropdown('calYearDD', yOpts, String(calYear), (v) => {
    calYear = Number(v);
    renderCalendar();
  });
  buildDropdown('calMonthDD', mOpts, String(calMonth), (v) => {
    calMonth = Number(v);
    renderCalendar();
  });
  renderCalendar();
  document.getElementById('calPrev')?.addEventListener('click', () => {
    calMonth--;
    if (calMonth < 0) {
      calMonth = 11;
      calYear--;
    }
    renderCalendar();
  });
  document.getElementById('calNext')?.addEventListener('click', () => {
    calMonth++;
    if (calMonth > 11) {
      calMonth = 0;
      calYear++;
    }
    renderCalendar();
  });
  document.getElementById('calToday')?.addEventListener('click', () => {
    const n = new Date();
    calYear = n.getFullYear();
    calMonth = n.getMonth();
    renderCalendar();
  });
  if (!calDocCloseBound) {
    calDocCloseBound = true;
    document.addEventListener('click', closeAllDropdowns);
  }
  initHoliday();
}

// ── 顶部 header 浮层（日历 / 天气，互斥展开）──
function closeAllPopovers() {
  document
    .querySelectorAll('.cal-popover.open, .weather-popover.open, .sal-popover.open')
    .forEach((p) => p.classList.remove('open'));
}
function setupHeaderPopover(triggerId: string, popId: string, onClose?: () => void) {
  const triggerEl = document.getElementById(triggerId);
  const popEl = document.getElementById(popId);
  if (!triggerEl || !popEl) return;
  const position = () => {
    const r = triggerEl.getBoundingClientRect();
    const w = popEl.offsetWidth;
    let left = r.left;
    if (left + w > window.innerWidth - 12) left = window.innerWidth - 12 - w;
    if (left < 12) left = 12;
    popEl.style.top = r.bottom + 8 + 'px';
    popEl.style.left = left + 'px';
  };
  triggerEl.addEventListener('click', (e) => {
    e.stopPropagation();
    const willOpen = !popEl.classList.contains('open');
    closeAllPopovers();
    onClose?.();
    if (willOpen) {
      popEl.classList.add('open');
      position();
    }
  });
  document.addEventListener('click', (e) => {
    if (!popEl.classList.contains('open')) return;
    const t = e.target as Node;
    if (popEl.contains(t) || triggerEl.contains(t)) return;
    closeAllPopovers();
    onClose?.();
  });
  document.addEventListener('keydown', (e) => {
    if ((e as KeyboardEvent).key === 'Escape' && popEl.classList.contains('open')) {
      closeAllPopovers();
      onClose?.();
    }
  });
  window.addEventListener('resize', () => {
    if (popEl.classList.contains('open')) closeAllPopovers();
  });
}
function initCalendarPopover() {
  initCalendar();
  setupHeaderPopover('dateDisplay', 'calPopover', closeAllDropdowns);
}
function initWeatherPopover() {
  initWeather();
  setupHeaderPopover('headerWeather', 'weatherPopover');
}
function initSalaryPopover() {
  initSalary();
  setupHeaderPopover('timeDisplay', 'salPopover');
}

/** 渲染顶部快捷入口行（搜索框下方）：由 DOCK_ITEMS 配置驱动，复用市场卡片的 mkt-link-chip 胶囊样式 */
function renderTopDock() {
  const dock = document.getElementById('topDock');
  if (!dock) return;
  dock.innerHTML = DOCK_ITEMS.map(
    (it) =>
      `<a class="mkt-link-chip" href="${it.href}"${it.external ? ' target="_blank" rel="noopener"' : ''} title="${it.label}">${it.letter ? `<span class="mkt-link-letter" style="background:${it.color ?? '#d97706'}">${it.letter}</span>` : ''}<span>${it.label}</span></a>`,
  ).join('');
}
async function init() {
  requestAnimationFrame(() =>
    requestAnimationFrame(() => document.documentElement.classList.add('animated')),
  );
  loadWallpaper();
  initClock();
  initKeepOn();
  initCalendarPopover();
  initWeatherPopover();
  initWebSearch();
  renderTopDock();
  initMedia();
  initTyphoon();
  initWater();
  await loadSch();
  await loadSal();
  initSalaryPopover();
  await renderPanel();
  setInterval(() => {
    updT();
    tickKeepOn();
    tickSalary();
  }, 1000);
}
init();
