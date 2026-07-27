import APlayer from 'aplayer';
import 'aplayer/dist/APlayer.min.css';
import { renderMarketCard, initMarket } from './widgets/market';
import { initHoliday } from './widgets/holiday';
import { initWeread, renderWereadCard } from './widgets/weread';
import { initNotes, renderNotesCard } from './widgets/notes';
import { initSearch, renderSearchCard } from './widgets/search';
import { initWereadOverview, renderWereadOverviewCard, refreshWereadOverview } from './widgets/weread-overview';
import { openBookReviewIn, renderWereadKeySetup, setWereadSettingsOpener } from './widgets/weread-shared';
import { initTax, renderTaxCard } from './widgets/tax';
import { initMortgage, renderMortgageCard } from './widgets/mortgage';
import { initBmi, renderBmiCard } from './widgets/bmi';
import { initCurrency, renderCurrencyCard } from './widgets/currency';
import { initBookmarks, renderBookmarksCard } from './widgets/bookmarks';
import { initWeather } from './widgets/weather';
import { renderHotCard, initHotCard } from './widgets/hot';
import { renderNewsCard, initNewsCard } from './widgets/news';
import { CAT_TREE, ALL_WIDGETS, TopCat, WID } from './config';

// 实用工具：3 个计算器整合为弹窗，入口卡片始终渲染在 #panel 第一行
function tkSvg(p: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${p}</svg>`;
}
const TK_TITLE_ICON = tkSvg(
  '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>',
);
const TOOLKIT: {
  id: string;
  title: string;
  desc: string;
  icon: string;
  render: () => string;
  init: () => void;
}[] = [
  {
    id: 'tax',
    title: '个税计算器',
    desc: '月薪到手税后',
    icon: tkSvg(
      '<line x1="19" y1="5" x2="5" y2="19"/><circle cx="6.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/>',
    ),
    render: renderTaxCard,
    init: initTax,
  },
  {
    id: 'mortgage',
    title: '房贷计算器',
    desc: '等额本息/本金',
    icon: tkSvg('<path d="M3 10 12 3l9 7"/><path d="M5 9.5V20h14V9.5"/><path d="M10 20v-5h4v5"/>'),
    render: renderMortgageCard,
    init: initMortgage,
  },
  {
    id: 'bmi',
    title: 'BMI 计算器',
    desc: '身体质量指数',
    icon: tkSvg(
      '<rect x="4" y="3" width="16" height="18" rx="2"/><circle cx="12" cy="10" r="3.2"/><line x1="12" y1="10" x2="14" y2="8.2"/>',
    ),
    render: renderBmiCard,
    init: initBmi,
  },
  {
    id: 'currency',
    title: '汇率换算',
    desc: '实时汇率换算',
    icon: tkSvg(
      '<path d="M8 3 4 7l4 4"/><path d="M4 7h16"/><path d="m16 21 4-4-4-4"/><path d="M20 17H4"/>',
    ),
    render: renderCurrencyCard,
    init: initCurrency,
  },
];

const SS = 'moyu_schedule',
  SW = 'moyu_widgets',
  SR = 'moyu_salary',
  WV = 8; // 组件存储结构版本：变更组件分类归属时 +1，触发按新 cat.sub 重组迁移
interface Sch {
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
const DS: Sch = {
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
interface SalStt {
  monthlyIncome: number;
  payDay: number;
}
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
async function getSal(): Promise<SalStt> {
  const r = await chrome.storage.sync.get(SR);
  return (r[SR] as SalStt) ?? { monthlyIncome: 10000, payDay: 10 };
}
async function setSal(s: SalStt) {
  await chrome.storage.sync.set({ [SR]: s });
}
const WDPM = 21.75;

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
let rendered: Record<string, boolean> = {},
  salStt: SalStt = { monthlyIncome: 10000, payDay: 10 };
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
    (w.id === 'hot' || w.id === 'news' ? leftIds : rightIds).push(w.id);
  }
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
  const tkRow = document.getElementById('toolkitRow');
  if (tkRow) {
    // 实用工具卡片 + 行情卡片（常驻）置于面板顶部第一行
    tkRow.innerHTML = renderToolkitCard() + renderMarketCard();
    tkRow
      .querySelectorAll('.toolkit-tile')
      .forEach((b) =>
        b.addEventListener('click', () => openToolkit((b as HTMLElement).dataset.tool!)),
      );
    initMarket();
  }
  for (const id of [...leftIds, ...rightIds]) initW(id);
  nmTrigger();
}
function getCard(w: WID): string {
  if (w.id === 'weread') return renderWereadOverviewCard();
  if (w.id === 'bookmarks') return renderBookmarksCard();
  if (w.id === 'hot') return renderHotCard();
  if (w.id === 'news') return renderNewsCard();
  return `<div class="widget-card clickable" data-widget="${w.id}"><div class="widget-entry"><span>${w.desc}</span><span class="arrow">→</span></div></div>`;
}
function renderToolkitCard(): string {
  const tiles = TOOLKIT.map(
    (t) =>
      `<button class="toolkit-tile" data-tool="${t.id}"><span class="tk-head"><span class="tk-ico">${t.icon}</span><span class="tk-name">${t.title}</span></span><span class="tk-desc">${t.desc}</span></button>`,
  ).join('');
  return `<div class="widget-card toolkit-card">
      <div class="toolkit-title">${TK_TITLE_ICON} 实用工具</div>
      <div class="toolkit-grid">${tiles}</div>
    </div>`;
}
async function initW(id: string) {
  if (rendered[id]) return;
  rendered[id] = true;
  switch (id) {
    case 'hot':
      initHotCard();
      break;
    case 'news':
      initNewsCard();
      break;
    case 'weread':
      initWereadOverview(openWereadModal, openReviewModal);
      break;
    case 'bookmarks':
      initBookmarks();
      break;
  }
}

document.getElementById('addWidgetBtn')!.addEventListener('click', () => openWidgetModal(true));
document.getElementById('settingsBtn')!.addEventListener('click', openSettings);
document.getElementById('gotoToolkitBtn')!.addEventListener('click', () => {
  const row = document.getElementById('toolkitRow');
  if (!row) return;
  row.scrollIntoView({ behavior: 'smooth', block: 'start' });
  const card = row.querySelector('.toolkit-card');
  if (card) {
    card.classList.remove('tk-locate');
    void (card as HTMLElement).offsetWidth; // 重新触发动画
    card.classList.add('tk-locate');
  }
});
document.getElementById('gotoHotBtn')!.addEventListener('click', () => {
  const card = document.querySelector('.hot-card');
  if (!card) return;
  card.scrollIntoView({ behavior: 'smooth', block: 'start' });
  card.classList.remove('locate');
  void (card as HTMLElement).offsetWidth; // 重新触发动画
  card.classList.add('locate');
});
document.getElementById('gotoMarketBtn')!.addEventListener('click', () => {
  const card = document.querySelector('.market-card');
  if (!card) return;
  card.scrollIntoView({ behavior: 'smooth', block: 'start' });
  card.classList.remove('locate');
  void (card as HTMLElement).offsetWidth; // 重新触发动画
  card.classList.add('locate');
});

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

// ── 实用工具弹窗（单工具弹窗：只展示被点击的工具，无工具切换列表）──
const tk = document.getElementById('toolkitModal')!;
let tkCur = 'tax';
function renderTkContent() {
  const t = TOOLKIT.find((x) => x.id === tkCur);
  const c = document.getElementById('tkContent');
  const title = document.getElementById('tkTitle');
  if (!t || !c) return;
  if (title) title.textContent = t.title;
  // 清理上一个工具留在头部的额外控件
  document.querySelectorAll('#toolkitModal .mh .tk-mh-extra').forEach((e) => e.remove());
  c.innerHTML = t.render();
  // 汇率换算：刷新按钮 + 状态提示放到头部标题后（贴标题，远离关闭按钮）
  if (tkCur === 'currency' && title) {
    const extra = document.createElement('div');
    extra.className = 'tk-mh-extra cur-meta';
    extra.innerHTML =
      '<span class="cur-upd" id="curUpd"></span><button class="cur-refresh" id="curRefresh" title="刷新">↻</button>';
    title.after(extra);
  }
  t.init();
}
function openToolkit(tool?: string) {
  if (tool) tkCur = tool;
  renderTkContent();
  tk.classList.add('open');
}
document.getElementById('tkClose')!.addEventListener('click', () => tk.classList.remove('open'));
tk.addEventListener('click', (e) => {
  if (e.target === tk) tk.classList.remove('open');
});

// ── 微信读书弹窗（单视图：点什么看什么，无 tab 切换，复用各 widget 的 render/init）──
const WR_VIEWS = [
  { id: 'shelf', name: '我的书架', render: renderWereadCard, init: initWeread },
  { id: 'notes', name: '我的笔记', render: renderNotesCard, init: initNotes },
  { id: 'search', name: '搜书', render: renderSearchCard, init: () => { const q = pendingSearchQuery; pendingSearchQuery = ''; void initSearch(q); } },
  { id: 'review', name: '书评', render: () => '<div class="hot-empty">加载中…</div>', init: () => { const b = pendingReviewBook; pendingReviewBook = null; if (b) void openBookReviewIn(document.getElementById('wrModalContent')!, b); } },
];
const wrModal = document.getElementById('wereadModal')!;
let wrModalCur = 'shelf';
let pendingSearchQuery = '';
let pendingReviewBook: { bid: string; title: string; cover: string; deepLink: string } | null = null;
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
document.getElementById('wrModalClose')!.addEventListener('click', () => wrModal.classList.remove('open'));
wrModal.addEventListener('click', (e) => {
  if (e.target === wrModal) wrModal.classList.remove('open');
});

// ── 全局消息提示（Toast，页面顶部居中）──
type MsgType = 'success' | 'warning' | 'error' | 'info';
const MSG_ICONS: Record<MsgType, string> = { success: '✓', warning: '!', error: '✕', info: 'i' };
function ensureMsgContainer(): HTMLElement {
  let c = document.getElementById('msgContainer');
  if (!c) {
    c = document.createElement('div');
    c.id = 'msgContainer';
    c.className = 'msg-container';
    document.body.appendChild(c);
  }
  return c;
}
function dismissMsg(toast: HTMLElement) {
  if (!toast.parentNode) return;
  toast.classList.add('out');
  toast.addEventListener('animationend', () => toast.remove(), { once: true });
}
function showMessage(text: string, type: MsgType = 'info') {
  const c = ensureMsgContainer();
  const toast = document.createElement('div');
  toast.className = `msg-toast ${type}`;
  const icon = document.createElement('span');
  icon.className = 'msg-icon';
  icon.textContent = MSG_ICONS[type];
  const txt = document.createElement('span');
  txt.className = 'msg-text';
  txt.textContent = text;
  toast.append(icon, txt);
  toast.addEventListener('click', () => dismissMsg(toast));
  c.appendChild(toast);
  setTimeout(() => dismissMsg(toast), 2500);
}

// ── Settings ──
const sm = document.getElementById('settingsModal')!;
document.getElementById('smClose')!.addEventListener('click', () => sm.classList.remove('open'));
sm.addEventListener('click', (e) => {
  if (e.target === sm) sm.classList.remove('open');
});
document.querySelectorAll('#smSidebar .msb').forEach((b) =>
  b.addEventListener('click', function (this: HTMLElement) {
    document.querySelectorAll('#smSidebar .msb').forEach((x) => x.classList.remove('active'));
    this.classList.add('active');
    if (this.dataset.s === 'time') renderSetTime();
    else if (this.dataset.s === 'weread') renderSetWeread();
    else renderSetSalary();
  }),
);
async function openSettings() {
  document.querySelectorAll('#smSidebar .msb').forEach((b) => b.classList.remove('active'));
  document.querySelector('#smSidebar [data-s="time"]')!.classList.add('active');
  renderSetTime();
  sm.classList.add('open');
}
function renderSetWeread() {
  const body = document.getElementById('settingsBody');
  if (!body) return;
  renderWereadKeySetup(body, async () => {
    sm.classList.remove('open');
    refreshWereadOverview();
  });
}
function openSettingsWeread() {
  document.getElementById('wereadModal')?.classList.remove('open');
  document.querySelectorAll('#smSidebar .msb').forEach((b) => b.classList.remove('active'));
  document.querySelector('#smSidebar [data-s="weread"]')?.classList.add('active');
  renderSetWeread();
  sm.classList.add('open');
}
setWereadSettingsOpener(openSettingsWeread);
async function renderSetTime() {
  const r = await chrome.storage.sync.get(SS);
  const s = { ...DS, ...(r[SS] || {}) };
  const wd: number[] = s.workDays ?? [1, 2, 3, 4, 5];
  const dhtml = ['一', '二', '三', '四', '五', '六', '日']
    .map((d, i) => {
      return `<label class="dc${wd.includes(i < 5 ? i + 1 : 0) ? ' active' : ''}" data-v="${i < 5 ? i + 1 : 0}"><span>${d}</span></label>`;
    })
    .join('');
  const t = (h: number, m: number) => `${pad(h)}:${pad(m)}`;
  document.getElementById('settingsBody')!.innerHTML =
    `<div class="f"><label>上班</label><input type="time" id="sStart" value="${t(s.startHour, s.startMinute)}"/></div><div class="f"><label>午餐</label><input type="time" id="sLunch" value="${t(s.lunchHour, s.lunchMinute)}"/></div><div class="f"><label>午休结束</label><input type="time" id="sRestEnd" value="${t(s.restEndHour, s.restEndMinute)}"/></div><div class="f"><label>下班</label><input type="time" id="sEnd" value="${t(s.endHour, s.endMinute)}"/></div><div class="f"><label>工作日</label><div style="display:flex;gap:5px" id="sDays">${dhtml}</div></div><button class="btn" id="sSave">保存</button>`;
  document.querySelectorAll('#sDays .dc').forEach((el) =>
    el.addEventListener('click', function (this: HTMLElement) {
      this.classList.toggle('active');
    }),
  );
  document.getElementById('sSave')!.addEventListener('click', async () => {
    const [sh, sm] = (document.getElementById('sStart') as HTMLInputElement).value
      .split(':')
      .map(Number);
    const [lh, lm] = (document.getElementById('sLunch') as HTMLInputElement).value
      .split(':')
      .map(Number);
    const [rh, rm] = (document.getElementById('sRestEnd') as HTMLInputElement).value
      .split(':')
      .map(Number);
    const [eh, em] = (document.getElementById('sEnd') as HTMLInputElement).value
      .split(':')
      .map(Number);
    if (isNaN(sh) || isNaN(lh) || isNaN(rh) || isNaN(eh)) {
      showMessage('请填写完整的工作时间', 'warning');
      return;
    }
    const oldRate = salRate();
    const wd: number[] = [];
    document
      .querySelectorAll('#sDays .dc.active')
      .forEach((el) => wd.push(Number((el as HTMLElement).dataset.v)));
    schedule = {
      startHour: sh,
      startMinute: sm,
      lunchHour: lh,
      lunchMinute: lm,
      restEndHour: rh,
      restEndMinute: rm,
      endHour: eh,
      endMinute: em,
      workDays: wd,
    };
    await chrome.storage.sync.set({ [SS]: schedule });
    rescaleSal(oldRate);
    buildSalTimeline();
    tickSalary();
    showMessage('工作时间已保存', 'success');
  });
}
async function renderSetSalary() {
  const s = await getSal();
  document.getElementById('settingsBody')!.innerHTML = `
    <div class="f"><label>月薪（元）</label><input type="number" id="sSalInc" value="${s.monthlyIncome}" min="1" style="width:100%;padding:9px 12px;font-size:13px;border:0.5px solid var(--glass-border);border-radius:var(--radius-xs);background:rgba(255,255,255,0.5);color:var(--text);outline:none;font-family:inherit"/></div>
    <div class="f"><label>发薪日</label><div style="display:flex;align-items:center;gap:8px"><span style="font-size:13px;color:var(--text-secondary)">每月</span><input type="number" id="sSalDay" value="${s.payDay}" min="1" max="31" style="width:80px;padding:9px 12px;font-size:13px;border:0.5px solid var(--glass-border);border-radius:var(--radius-xs);background:rgba(255,255,255,0.5);color:var(--text);outline:none;font-family:inherit;text-align:center"/><span style="font-size:13px;color:var(--text-secondary)">号</span></div></div>
    <div class="f" style="font-size:11px;color:var(--text-tertiary)">工作日 21.75 天/月，薪资按 上班~下班 时段计算（含午休带薪）</div>
    <button class="btn" id="sSalSave">保存</button>`;
  document.getElementById('sSalSave')!.addEventListener('click', async () => {
    const inc = Number((document.getElementById('sSalInc') as HTMLInputElement).value);
    const d = Number((document.getElementById('sSalDay') as HTMLInputElement).value);
    if (inc < 1 || d < 1 || d > 31) {
      showMessage('请输入有效的月薪和发薪日', 'warning');
      return;
    }
    const oldRate = salRate();
    salStt = { monthlyIncome: inc, payDay: d };
    await setSal(salStt);
    rescaleSal(oldRate);
    tickSalary();
    showMessage('薪资设置已保存', 'success');
  });
}

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    wm.classList.remove('open');
    sm.classList.remove('open');
    tk.classList.remove('open');
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
    const res = (await chrome.runtime.sendMessage({ type: 'SCREENON_STATUS' })) as
      | { success: boolean; state?: { on: boolean; since: number } };
    if (res?.state) keepOnState = res.state;
  } catch {}
  btn.classList.toggle('on', keepOnState.on);
  tickKeepOn();
  btn.addEventListener('click', async () => {
    const next = !keepOnState.on;
    try {
      const res = (await chrome.runtime.sendMessage({ type: next ? 'SCREENON_ON' : 'SCREENON_OFF' })) as
        | { success: boolean; state?: { on: boolean; since: number } };
      if (res?.state) keepOnState = res.state;
      btn.classList.toggle('on', keepOnState.on);
      tickKeepOn();
      showMessage(keepOnState.on ? '屏幕已常亮' : '已关闭屏幕常亮', keepOnState.on ? 'success' : 'info');
    } catch {
      showMessage('操作失败，请重试', 'error');
    }
  });
}

const LUNAR_MONTH = ['正', '二', '三', '四', '五', '六', '七', '八', '九', '十', '冬', '腊'];
const LUNAR_DAY = [
  '',
  '初一',
  '初二',
  '初三',
  '初四',
  '初五',
  '初六',
  '初七',
  '初八',
  '初九',
  '初十',
  '十一',
  '十二',
  '十三',
  '十四',
  '十五',
  '十六',
  '十七',
  '十八',
  '十九',
  '二十',
  '廿一',
  '廿二',
  '廿三',
  '廿四',
  '廿五',
  '廿六',
  '廿七',
  '廿八',
  '廿九',
  '三十',
];
const LUNAR_INFO = [
  0x04bd8,
  0x04ae0,
  0x0a570,
  0x054d5,
  0x0d260,
  0x0d950,
  0x16554,
  0x056a0,
  0x09ad0,
  0x055d2, //1900-1909
  0x04ae0,
  0x0a5b6,
  0x0a4d0,
  0x0d250,
  0x1d255,
  0x0b540,
  0x0d6a0,
  0x0ada2,
  0x095b0,
  0x14977, //1910-1919
  0x04970,
  0x0a4b0,
  0x0b4b5,
  0x06a50,
  0x06d40,
  0x1ab54,
  0x02b60,
  0x09570,
  0x052f2,
  0x04970, //1920-1929
  0x06566,
  0x0d4a0,
  0x0ea50,
  0x16a95,
  0x05ad0,
  0x02b60,
  0x186e3,
  0x092e0,
  0x1c8d7,
  0x0c950, //1930-1939
  0x0d4a0,
  0x1d8a6,
  0x0b550,
  0x056a0,
  0x1a5b4,
  0x025d0,
  0x092d0,
  0x0d2b2,
  0x0a950,
  0x0b557, //1940-1949
  0x06ca0,
  0x0b550,
  0x15355,
  0x04da0,
  0x0a5b0,
  0x14573,
  0x052b0,
  0x0a9a8,
  0x0e950,
  0x06aa0, //1950-1959
  0x0aea6,
  0x0ab50,
  0x04b60,
  0x0aae4,
  0x0a570,
  0x05260,
  0x0f263,
  0x0d950,
  0x05b57,
  0x056a0, //1960-1969
  0x096d0,
  0x04dd5,
  0x04ad0,
  0x0a4d0,
  0x0d4d4,
  0x0d250,
  0x0d558,
  0x0b540,
  0x0b6a0,
  0x195a6, //1970-1979
  0x095b0,
  0x049b0,
  0x0a974,
  0x0a4b0,
  0x0b27a,
  0x06a50,
  0x06d40,
  0x0af46,
  0x0ab60,
  0x09570, //1980-1989
  0x04af5,
  0x04970,
  0x064b0,
  0x074a3,
  0x0ea50,
  0x06b58,
  0x05ac0,
  0x0ab60,
  0x096d5,
  0x092e0, //1990-1999
  0x0c960,
  0x0d954,
  0x0d4a0,
  0x0da50,
  0x07552,
  0x056a0,
  0x0abb7,
  0x025d0,
  0x092d0,
  0x0cab5, //2000-2009
  0x0a950,
  0x0b4a0,
  0x0baa4,
  0x0ad50,
  0x055d9,
  0x04ba0,
  0x0a5b0,
  0x15176,
  0x052b0,
  0x0a930, //2010-2019
  0x07954,
  0x06aa0,
  0x0ad50,
  0x05b52,
  0x04b60,
  0x0a6e6,
  0x0a4e0,
  0x0d260,
  0x0ea65,
  0x0d530, //2020-2029
  0x05aa0,
  0x076a3,
  0x096d0,
  0x04afb,
  0x04ad0,
  0x0a4d0,
  0x1d0b6,
  0x0d250,
  0x0d520,
  0x0dd45, //2030-2039
  0x0b5a0,
  0x056d0,
  0x055b2,
  0x049b0,
  0x0a577,
  0x0a4b0,
  0x0aa50,
  0x1b255,
  0x06d20,
  0x0ada0, //2040-2049
  0x14b63,
  0x09370,
  0x049f8,
  0x04970,
  0x064b0,
  0x168a6,
  0x0ea50,
  0x06b20,
  0x1a6c4,
  0x0aae0, //2050-2059
  0x092e0,
  0x0d2e3,
  0x0c960,
  0x0d557,
  0x0d4a0,
  0x0da50,
  0x05d55,
  0x056a0,
  0x0a6d0,
  0x055d4, //2060-2069
  0x052d0,
  0x0a9b8,
  0x0a950,
  0x0b4a0,
  0x0b6a6,
  0x0ad50,
  0x055a0,
  0x0aba4,
  0x0a5b0,
  0x052b0, //2070-2079
  0x0b273,
  0x06930,
  0x07337,
  0x06aa0,
  0x0ad50,
  0x14b55,
  0x04b60,
  0x0a570,
  0x054e4,
  0x0d160, //2080-2089
  0x0e968,
  0x0d520,
  0x0daa0,
  0x16aa6,
  0x056d0,
  0x04ae0,
  0x0a9d4,
  0x0a2d0,
  0x0d150,
  0x0f252, //2090-2099
  0x0d520, //2100
];
function lYearDays(y: number): number {
  let s = 348;
  for (let i = 0x8000; i > 0x8; i >>= 1) s += LUNAR_INFO[y - 1900] & i ? 1 : 0;
  return s + lLeapDays(y);
}
function lLeapMonth(y: number): number {
  return LUNAR_INFO[y - 1900] & 0xf;
}
function lLeapDays(y: number): number {
  if (lLeapMonth(y)) return LUNAR_INFO[y - 1900] & 0x10000 ? 30 : 29;
  return 0;
}
function lMonthDays(y: number, m: number): number {
  return LUNAR_INFO[y - 1900] & (0x10000 >> m) ? 30 : 29;
}
function getLunar(
  y: number,
  m: number,
  d: number,
): { lm: number; ld: number; cM: string; cD: string } {
  if (y < 1900 || y > 2100) return { lm: 0, ld: 0, cM: '', cD: '' };
  let offset = Math.floor((Date.UTC(y, m - 1, d) - Date.UTC(1900, 0, 31)) / 86400000);
  let i: number,
    temp = 0;
  for (i = 1900; i < 2101 && offset > 0; i++) {
    temp = lYearDays(i);
    offset -= temp;
  }
  if (offset < 0) {
    offset += temp;
    i--;
  }
  const ly = i;
  const leap = lLeapMonth(ly);
  let isLeap = false;
  for (i = 1; i < 13 && offset > 0; i++) {
    if (leap > 0 && i === leap + 1 && !isLeap) {
      i--;
      isLeap = true;
      temp = lLeapDays(ly);
    } else {
      temp = lMonthDays(ly, i);
    }
    if (isLeap && i === leap + 1) isLeap = false;
    offset -= temp;
  }
  if (offset === 0 && leap > 0 && i === leap + 1) {
    if (isLeap) isLeap = false;
    else {
      isLeap = true;
      i--;
    }
  }
  if (offset < 0) {
    offset += temp;
    i--;
  }
  const lm = i,
    ld = offset + 1;
  return {
    lm,
    ld,
    cM: (isLeap ? '闰' : '') + (LUNAR_MONTH[lm - 1] || ''),
    cD: LUNAR_DAY[ld] || '',
  };
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

async function loadSal() {
  salStt = await getSal();
}
// ── 薪资明细状态（工作/摸鱼/休息 三项累计，每日重置，刷新补足）──
const SAL_KEY = 'moyu_salary_state';
const FISH_MULT = 0.269;
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
function salRate() {
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
function rescaleSal(oldRate: number) {
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
function buildSalTimeline() {
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
function tickSalary() {
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
function initSalary() {
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

let schedule: Sch = { ...DS };
async function loadSch() {
  const r = await chrome.storage.sync.get(SS);
  if (r[SS]) schedule = { ...DS, ...r[SS] };
}

// ── Wallpaper ──
const WP_KEY = 'moyu_wallpaper';
// 默认壁纸：SVG 渐变（硬编码，零文件零存储）
const DEFAULT_WP_SVG = `<svg xmlns='http://www.w3.org/2000/svg' width='1440' height='900'><defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0%' stop-color='#fde68a'/><stop offset='50%' stop-color='#fca5a5'/><stop offset='100%' stop-color='#a5b4fc'/></linearGradient></defs><rect width='100%' height='100%' fill='url(#g)'/></svg>`;
const DEFAULT_WP_URL = `url("data:image/svg+xml,${encodeURIComponent(DEFAULT_WP_SVG)}")`;
const WP_DB = 'moyu_db';
const WP_STORE = 'wallpaper';
const WP_REC_ID = 'custom';
let curObjUrl = '';
let wpPreviewUrl = '';
const ctxMenu = document.getElementById('ctxMenu')!;
const wpModal = document.getElementById('wallpaperModal')!;
document
  .getElementById('wpClose')!
  .addEventListener('click', () => wpModal.classList.remove('open'));
wpModal.addEventListener('click', (e) => {
  if (e.target === wpModal) wpModal.classList.remove('open');
});
document.addEventListener('contextmenu', (e) => {
  e.preventDefault();
  ctxMenu.style.left = e.clientX + 'px';
  ctxMenu.style.top = e.clientY + 'px';
  ctxMenu.classList.add('open');
});
document.addEventListener('click', () => ctxMenu.classList.remove('open'));
document.getElementById('ctxWidgets')!.addEventListener('click', () => {
  ctxMenu.classList.remove('open');
  openWidgetModal(false);
});
document.getElementById('ctxWallpaper')!.addEventListener('click', async () => {
  ctxMenu.classList.remove('open');
  await openWallpaperModal();
});

// IndexedDB 轻封装：单条 Blob 记录（用户壁纸）
function idbOpen(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(WP_DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(WP_STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
async function idbPutBlob(blob: Blob) {
  const db = await idbOpen();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(WP_STORE, 'readwrite');
    tx.objectStore(WP_STORE).put(blob, WP_REC_ID);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}
async function idbGetBlob(): Promise<Blob | null> {
  const db = await idbOpen();
  const blob = await new Promise<Blob | null>((resolve) => {
    const tx = db.transaction(WP_STORE, 'readonly');
    const req = tx.objectStore(WP_STORE).get(WP_REC_ID);
    req.onsuccess = () => resolve((req.result as Blob) ?? null);
    req.onerror = () => resolve(null);
  });
  db.close();
  return blob;
}
async function idbDelBlob() {
  const db = await idbOpen();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(WP_STORE, 'readwrite');
    tx.objectStore(WP_STORE).delete(WP_REC_ID);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}
// 压缩图片：最大边 1920，JPEG 质量 0.85，避免 IndexedDB 占用过大
function compressImage(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const u = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(u);
      const maxSide = 1920;
      let w = img.width,
        h = img.height;
      if (w > maxSide || h > maxSide) {
        if (w >= h) {
          h = Math.round((h * maxSide) / w);
          w = maxSide;
        } else {
          w = Math.round((w * maxSide) / h);
          h = maxSide;
        }
      }
      const c = document.createElement('canvas');
      c.width = w;
      c.height = h;
      c.getContext('2d')!.drawImage(img, 0, 0, w, h);
      c.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob'))), 'image/jpeg', 0.85);
    };
    img.onerror = () => {
      URL.revokeObjectURL(u);
      reject(new Error('load'));
    };
    img.src = u;
  });
}
// 应用壁纸：custom 读 IndexedDB Blob，default 用内置 SVG
async function applyWallpaper(mode: 'default' | 'custom') {
  if (curObjUrl) {
    URL.revokeObjectURL(curObjUrl);
    curObjUrl = '';
  }
  if (mode === 'custom') {
    const blob = await idbGetBlob();
    if (blob) {
      curObjUrl = URL.createObjectURL(blob);
      document.body.style.backgroundImage = `url(${curObjUrl})`;
      localStorage.setItem(WP_KEY, 'custom');
      return;
    }
  }
  document.body.style.backgroundImage = DEFAULT_WP_URL;
  localStorage.setItem(WP_KEY, 'default');
}

async function openWallpaperModal() {
  if (wpPreviewUrl) {
    URL.revokeObjectURL(wpPreviewUrl);
    wpPreviewUrl = '';
  }
  const mode = (localStorage.getItem(WP_KEY) as 'default' | 'custom') || 'default';
  let bg = DEFAULT_WP_URL;
  if (mode === 'custom') {
    const blob = await idbGetBlob();
    if (blob) {
      wpPreviewUrl = URL.createObjectURL(blob);
      bg = `url(${wpPreviewUrl})`;
    }
  }
  document.getElementById('wpBody')!.innerHTML = `
    <div class="wp-preview" style="background-image:${bg}"></div>
    <div class="wp-status">${mode === 'custom' ? '当前：自定义壁纸' : '当前：默认壁纸'}</div>
    <div class="wp-actions">
      <input type="file" id="wpUpload" accept="image/*" style="display:none"/>
      <button class="wp-btn" id="wpUploadBtn">上传壁纸</button>
      ${mode === 'custom' ? '<button class="wp-btn wp-btn-ghost" id="wpReset">恢复默认</button>' : ''}
    </div>
    <div class="wp-hint">上传将替换当前壁纸（仅保留一张）</div>`;
  wpModal.classList.add('open');
  const fileInput = document.getElementById('wpUpload') as HTMLInputElement;
  document.getElementById('wpUploadBtn')!.addEventListener('click', () => fileInput.click());
  fileInput.onchange = async () => {
    const f = fileInput.files?.[0];
    if (!f) return;
    try {
      const blob = await compressImage(f);
      await idbPutBlob(blob);
      await applyWallpaper('custom');
    } catch {
      const h = document.querySelector('.wp-hint');
      if (h) h.textContent = '⚠ 图片加载失败，请换一张';
      return;
    }
    fileInput.value = '';
    openWallpaperModal();
  };
  document.getElementById('wpReset')?.addEventListener('click', async () => {
    await idbDelBlob();
    await applyWallpaper('default');
    openWallpaperModal();
  });
}

function loadWallpaper() {
  // 先立即应用默认壁纸，避免首屏空白；若用户设过自定义则异步加载替换
  document.body.style.backgroundImage = DEFAULT_WP_URL;
  const m = localStorage.getItem(WP_KEY);
  if (m === 'custom') {
    applyWallpaper('custom');
  } else if (m && m !== 'default') {
    // 旧版本曾把 dataUrl 直接写进 localStorage，清理残留并释放空间
    localStorage.removeItem(WP_KEY);
    chrome.storage.local.remove('moyu_wp_list');
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

// ── 左下角媒体（♪ 图标 → 弹出 APlayer + 视频弹窗）──
const MUSIC_API = 'https://api.i-meto.com/meting/api?server=netease&type=playlist&id=3778678&r=';
let musicInited = false;

async function ensureMusic() {
  if (musicInited) return;
  const container = document.getElementById('musicPlayer');
  if (!container) return;
  musicInited = true;
  container.innerHTML = '<div class="hot-empty">加载中…</div>';
  try {
    const res = await fetch(MUSIC_API + Math.random());
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = (await res.json()) as any[];
    if (!Array.isArray(data) || !data.length) throw new Error('empty');
    const audio = data.map((s) => ({
      name: s.title || '未知',
      artist: s.author || '',
      url: s.url,
      cover: s.pic,
      lrc: s.lrc,
    }));
    container.innerHTML = '';
    new APlayer({
      container: container as HTMLElement,
      audio,
      autoplay: false,
      theme: '#d97706',
      listFolded: false,
      loop: 'all',
      order: 'list',
      listMaxHeight: '260px',
      lrcType: 1,
    });
  } catch {
    container.innerHTML = '<div class="hot-empty">⚠ 加载失败 · 点击重试</div>';
    container.onclick = () => {
      musicInited = false;
      ensureMusic();
    };
    musicInited = false;
  }
}
function closeMediaPanel() {
  document.getElementById('mediaPanel')?.classList.remove('open');
  document.getElementById('mediaFab')?.classList.remove('active');
}
function toggleMediaPanel() {
  const panel = document.getElementById('mediaPanel');
  if (!panel) return;
  const willOpen = !panel.classList.contains('open');
  if (willOpen) {
    panel.classList.add('open');
    document.getElementById('mediaFab')?.classList.add('active');
    ensureMusic();
  } else {
    closeMediaPanel();
  }
}
function openVideoModal() {
  const modal = document.getElementById('videoModal');
  if (!modal) return;
  const frame = document.getElementById('tvFrame') as HTMLIFrameElement | null;
  if (frame && !frame.src) {
    frame.src = `http://app.conan.js.cn/tv?v=${new Date().toISOString().slice(0, 10)}`;
  }
  modal.classList.add('open');
}
function closeVideoModal() {
  document.getElementById('videoModal')?.classList.remove('open');
}
function initMedia() {
  document.getElementById('mediaFab')?.addEventListener('click', () => toggleMediaPanel());
  document.getElementById('mbVideo')?.addEventListener('click', openVideoModal);
  document.getElementById('vmClose')?.addEventListener('click', closeVideoModal);
  document.getElementById('videoModal')?.addEventListener('click', (e) => {
    if (e.target === document.getElementById('videoModal')) closeVideoModal();
  });
  document.addEventListener('click', (e) => {
    const panel = document.getElementById('mediaPanel');
    if (!panel?.classList.contains('open')) return;
    const t = e.target as HTMLElement | null;
    if (t && (t.closest('.media-dock') || t.closest('.aplayer-lrc'))) return;
    closeMediaPanel();
  });
  document.addEventListener('keydown', (e) => {
    if ((e as KeyboardEvent).key !== 'Escape') return;
    closeMediaPanel();
    closeVideoModal();
  });
}

// ── 顶部搜索框 ──
const SB_KEY = 'moyu_search_engine';
const ENGINES: { name: string; url: string }[] = [
  { name: '百度', url: 'https://www.baidu.com/s?wd=' },
  { name: 'Google', url: 'https://www.google.com/search?q=' },
  { name: '必应', url: 'https://www.bing.com/search?q=' },
  { name: '搜狗', url: 'https://www.sogou.com/web?query=' },
];
let sbCur = ENGINES[0];
function initWebSearch() {
  const found = ENGINES.find((e) => e.name === localStorage.getItem(SB_KEY));
  if (found) sbCur = found;
  const nameEl = document.getElementById('sbEngineName');
  const listEl = document.getElementById('sbEngineList');
  const ddEl = document.getElementById('sbEngine');
  const inputEl = document.getElementById('sbInput') as HTMLInputElement | null;
  if (!nameEl || !listEl || !ddEl || !inputEl) return;
  nameEl.textContent = sbCur.name;
  listEl.innerHTML = ENGINES.map(
    (e) =>
      `<div class="sb-engine-opt${e.name === sbCur.name ? ' active' : ''}" data-name="${e.name}">${e.name}</div>`,
  ).join('');
  document.getElementById('sbEngineBtn')?.addEventListener('click', (e) => {
    e.stopPropagation();
    ddEl.classList.toggle('open');
  });
  listEl.querySelectorAll('.sb-engine-opt').forEach((opt) =>
    opt.addEventListener('click', (e) => {
      e.stopPropagation();
      const name = (opt as HTMLElement).dataset.name!;
      const eng = ENGINES.find((x) => x.name === name);
      if (!eng) return;
      sbCur = eng;
      localStorage.setItem(SB_KEY, eng.name);
      nameEl.textContent = eng.name;
      listEl
        .querySelectorAll('.sb-engine-opt')
        .forEach((o) => o.classList.toggle('active', (o as HTMLElement).dataset.name === name));
      ddEl.classList.remove('open');
      inputEl.focus();
    }),
  );
  document.addEventListener('click', () => ddEl.classList.remove('open'));
  const doSearch = () => {
    const q = inputEl.value.trim();
    if (!q) return;
    window.open(sbCur.url + encodeURIComponent(q), '_blank', 'noopener');
  };
  document.getElementById('sbGo')?.addEventListener('click', doSearch);
  inputEl.addEventListener('keydown', (e) => {
    if ((e as KeyboardEvent).key === 'Enter') doSearch();
  });
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
  initMedia();
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
