import APlayer from 'aplayer';
import 'aplayer/dist/APlayer.min.css';
import { initGold, renderGoldSection, refreshGold } from './widgets/gold';
import { initHoliday } from './widgets/holiday';
import { initJuejin, renderJuejinCard } from './widgets/juejin';
import { initZhihu, renderZhihuCard } from './widgets/zhihu';
import { initWeread, renderWereadCard } from './widgets/weread';
import { initReaddata, renderReaddataCard } from './widgets/readdata';
import { initRecommend, renderRecommendCard } from './widgets/recommend';
import { initNotes, renderNotesCard } from './widgets/notes';
import { initReview, renderReviewCard } from './widgets/review';
import { initSearch, renderSearchCard } from './widgets/search';
import { initSinaFlash, renderSinaFlashCard } from './widgets/sina-flash';
import { initTax, renderTaxCard } from './widgets/tax';
import { initMortgage, renderMortgageCard } from './widgets/mortgage';
import { initBmi, renderBmiCard } from './widgets/bmi';
import { initCurrency, renderCurrencyCard } from './widgets/currency';
import { initBookmarks, renderBookmarksCard } from './widgets/bookmarks';
import { initAihot, renderAihotCard } from './widgets/aihot';
import { initFund, renderFundSection, refreshFund } from './widgets/fund';
import { initWeather } from './widgets/weather';
import { HOT_WIDGETS, renderHotCard, initHotCard } from './widgets/hot';
import { CAT_TREE, ALL_WIDGETS, TopCat, WID } from './config';

const SS = 'moyu_schedule',
  SW = 'moyu_widgets',
  SR = 'moyu_salary',
  WV = 2; // 组件存储结构版本：变更组件分类归属时 +1，触发按新 cat.sub 重组迁移
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

const nmContent = document.querySelector('.content') as HTMLElement;
const NM_ENTER_DUR = 500;
let curCat = CAT_TREE[0].id;
let curSub = 'all';
let nmEnterStart = 0;
let nmLag = 0;
let nmLastTop = nmContent.scrollTop;
let nmRaf = 0;
function nmSchedule() {
  if (nmRaf) return;
  nmRaf = requestAnimationFrame(nmUpdate);
}
function nmUpdate() {
  nmRaf = 0;
  nmLag *= 0.85;
  if (Math.abs(nmLag) < 0.3) nmLag = 0;
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
        el.style.transform = `translateY(${nmLag + enter * 22}px) scale(${1 - enter * 0.04})`;
      } else if (nmLag !== 0) {
        el.style.opacity = '';
        el.style.transform = `translateY(${nmLag}px)`;
      } else {
        el.style.opacity = '';
        el.style.transform = '';
      }
    });
  }
  if (entering || nmLag !== 0) nmSchedule();
}
function nmTrigger() {
  nmEnterStart = performance.now();
  nmSchedule();
}
nmContent.addEventListener(
  'scroll',
  () => {
    const dt = nmContent.scrollTop - nmLastTop;
    nmLastTop = nmContent.scrollTop;
    nmLag = Math.max(-28, Math.min(28, nmLag + dt * 0.2));
    nmSchedule();
  },
  { passive: true },
);
function nonEmptySubs(top: TopCat) {
  return top.subs.filter((s) => ALL_WIDGETS.some((w) => w.cat === top.id && w.sub === s.id));
}
function renderSidebar() {
  const nav = document.getElementById('sidebarNav')!;
  nav.innerHTML = CAT_TREE.map(
    (top) =>
      `<button class="sb-btn sb-top" data-cat="${top.id}"><span class="ic">${top.icon}</span>${top.name}</button>`,
  ).join('');
  nav.querySelectorAll('.sb-top').forEach((b) =>
    b.addEventListener('click', () => showCat((b as HTMLElement).dataset.cat!)),
  );
}
function highlightCat() {
  const nav = document.getElementById('sidebarNav')!;
  nav.querySelectorAll('.sb-top').forEach((b) => {
    (b as HTMLElement).classList.toggle('active', (b as HTMLElement).dataset.cat === curCat);
  });
}
function renderSubFilter() {
  const f = document.getElementById('subFilter')!;
  const top = CAT_TREE.find((t) => t.id === curCat);
  const subs = top ? nonEmptySubs(top) : [];
  if (subs.length <= 1) {
    f.innerHTML = '';
    return;
  }
  const chip = (id: string, name: string) =>
    `<button class="sf-chip${id === curSub ? ' active' : ''}" data-sub="${id}">${name}</button>`;
  f.innerHTML = chip('all', '全部') + subs.map((s) => chip(s.id, s.name)).join('');
  f.querySelectorAll('.sf-chip').forEach((b) =>
    b.addEventListener('click', () => {
      curSub = (b as HTMLElement).dataset.sub!;
      renderSubFilter();
      renderPanel();
    }),
  );
}

let rendered: Record<string, boolean> = {},
  salStt: SalStt = { monthlyIncome: 10000, payDay: 10 };
let masonCols = 0;
function computeCols(panel: HTMLElement) {
  const gap = 10;
  const minCard = 300;
  const w = panel.clientWidth;
  const n = Math.floor((w + gap) / (minCard + gap));
  return Math.max(1, Math.min(4, n));
}
function masonryLayout(panel: HTMLElement, cards: HTMLElement[]) {
  const n = computeCols(panel);
  panel.innerHTML = '';
  const cols: HTMLElement[] = [];
  for (let i = 0; i < n; i++) {
    const c = document.createElement('div');
    c.className = 'mason-col';
    panel.appendChild(c);
    cols.push(c);
  }
  for (const card of cards) {
    let min = cols[0];
    let minH = cols[0].offsetHeight;
    for (let i = 1; i < cols.length; i++) {
      const h = cols[i].offsetHeight;
      if (h < minH) {
        minH = h;
        min = cols[i];
      }
    }
    min.appendChild(card);
  }
  masonCols = n;
}
function masonryRelayout() {
  const panel = document.getElementById('panel');
  if (!panel) return;
  const cards = Array.from(panel.querySelectorAll('.widget-card')) as HTMLElement[];
  if (!cards.length) return;
  if (computeCols(panel) === masonCols) return;
  masonryLayout(panel, cards);
}
let masonResizeTimer = 0;
window.addEventListener('resize', () => {
  clearTimeout(masonResizeTimer);
  masonResizeTimer = setTimeout(masonryRelayout, 150);
});
async function renderPanel() {
  const d = await getWD();
  const top = CAT_TREE.find((t) => t.id === curCat);
  const subs = top ? nonEmptySubs(top) : [];
  const subIds =
    curSub === 'all'
      ? subs.map((s) => s.id)
      : subs.some((s) => s.id === curSub)
        ? [curSub]
        : [];
  const ids: string[] = [];
  for (const sid of subIds) {
    for (const id of d.subs[subKey(curCat, sid)] || []) {
      if (!ids.includes(id)) ids.push(id);
    }
  }
  const panel = document.getElementById('panel')!;
  rendered = {};
  if (!ids.length) {
    panel.innerHTML = `<div class="empty"><div>暂无组件</div><div class="add-hint">左侧点击 组件库</div></div>`;
    nmTrigger();
    return;
  }
  const tmp = document.createElement('div');
  for (const id of ids) {
    const w = ALL_WIDGETS.find((x) => x.id === id);
    if (!w) continue;
    tmp.insertAdjacentHTML('beforeend', getCard(w));
  }
  const cards = Array.from(tmp.children) as HTMLElement[];
  if (!cards.length) {
    panel.innerHTML = `<div class="empty"><div>暂无组件</div><div class="add-hint">左侧点击 组件库</div></div>`;
    nmTrigger();
    return;
  }
  masonryLayout(panel, cards);
  for (const id of ids) initW(id);
  nmTrigger();
}
async function showCat(cat: string) {
  curCat = cat;
  curSub = 'all';
  highlightCat();
  renderSubFilter();
  await renderPanel();
}
function getCard(w: WID): string {
  if (w.id === 'salary')
    return `<div class="widget-card sal-card"><div class="sal-grid">
      <div class="sal-left">
        <div class="sal-title">✦ 薪资跳动</div>
        <div class="sal-label">今日实时收入</div>
        <div class="sal-amount" id="salAmount">¥0.000</div>
        <div class="sal-breakdown">
          <div class="bd-item"><span>工作</span><span id="salWork">¥0.000</span></div>
          <span class="bd-sym">+</span>
          <div class="bd-item"><span>摸鱼</span><span id="salFish" class="t-green">¥0.000</span></div>
          <span class="bd-sym">+</span>
          <div class="bd-item"><span>额外</span><span id="salRest" class="t-green">¥0.000</span></div>
        </div>
      </div>
      <div class="sal-right">
        <div class="sal-toggle" id="salToggle">
          <div class="sal-tb active" data-mode="work">😤 工作</div>
          <div class="sal-tb" data-mode="fish">🐟 摸鱼</div>
        </div>
        <div class="sal-timer" id="salTimer">00:00:00</div>
        <div class="sal-text" id="salText">专注工作中</div>
      </div>
      <div class="sal-bottom">
        <div class="sal-ticks" id="salTicks"></div>
        <div class="sal-trackwrap">
          <div class="sal-track" id="salTrack"></div>
          <div class="sal-indicator" id="salIndicator" style="display:none"></div>
        </div>
        <div class="sal-countdown" id="salCountdown">⏲️ 距离上班还有 <span>--:--:--</span></div>
        <div class="sal-payday" id="salPayDay"></div>
      </div>
    </div></div>`;
  if (w.id === 'market')
    return `<div class="widget-card market-card">
      <div class="market-head">
        <div class="market-title">◆ 行情</div>
        <button class="market-refresh" id="marketRefresh" title="刷新">↻</button>
      </div>
      ${renderGoldSection()}
      <div class="market-divider"></div>
      ${renderFundSection()}
    </div>`;
  if (w.id === 'tv')
    return `<div class="widget-card tv-card">
      <div class="tv-head">
        <div class="tv-title">▶ 视频</div>
        <div class="tv-controls">
          <button class="tv-back" id="tvBack" title="返回">←</button>
          <a class="tv-open" href="http://app.conan.js.cn/tv" target="_blank" rel="noopener">新标签打开 ↗</a>
        </div>
      </div>
      <iframe class="tv-frame" id="tvFrame" src="http://app.conan.js.cn/tv?v=${new Date().toISOString().slice(0, 10)}" referrerpolicy="no-referrer" loading="lazy" allow="fullscreen; encrypted-media" allowfullscreen></iframe>
    </div>`;
  if (w.id === 'music')
    return `<div class="widget-card music-card">
      <div class="music-head">
        <div class="music-title">♫ 音乐</div>
        <div class="music-ctrl">
          <button class="music-btn" id="musicPrev" title="上一首">‹</button>
          <button class="music-btn" id="musicNext" title="下一首">›</button>
        </div>
      </div>
      <div class="music-player" id="musicPlayer"></div>
    </div>`;
  if (w.id === 'juejin') return renderJuejinCard();
  if (w.id === 'zhihu') return renderZhihuCard();
  if (w.id === 'weread') return renderWereadCard();
  if (w.id === 'readdata') return renderReaddataCard();
  if (w.id === 'recommend') return renderRecommendCard();
  if (w.id === 'notes') return renderNotesCard();
  if (w.id === 'review') return renderReviewCard();
  if (w.id === 'search') return renderSearchCard();
  if (w.id === 'sina_flash') return renderSinaFlashCard();
  if (w.id === 'aihot') return renderAihotCard();
  if (w.id === 'tax') return renderTaxCard();
  if (w.id === 'mortgage') return renderMortgageCard();
  if (w.id === 'bmi') return renderBmiCard();
  if (w.id === 'currency') return renderCurrencyCard();
  if (w.id === 'bookmarks') return renderBookmarksCard();
  if (HOT_WIDGETS[w.id]) return renderHotCard(w);
  return `<div class="widget-card clickable" data-widget="${w.id}"><div class="widget-entry"><span>${w.desc}</span><span class="arrow">→</span></div></div>`;
}
async function refreshMarket() {
  const btn = document.getElementById('marketRefresh');
  btn?.classList.add('spin');
  try {
    await Promise.all([refreshGold(), refreshFund()]);
  } finally {
    btn?.classList.remove('spin');
  }
}
async function initMarket() {
  initGold();
  await initFund();
  document.getElementById('marketRefresh')?.addEventListener('click', refreshMarket);
}
async function initW(id: string) {
  if (rendered[id]) return;
  rendered[id] = true;
  switch (id) {
    case 'salary':
      initSalary();
      break;
    case 'market':
      initMarket();
      break;
    case 'music':
      initMusic();
      break;
    case 'tv':
      initTv();
      break;
    case 'hot_weibo':
      initHotCard('weibo');
      break;
    case 'hot_bilibili':
      initHotCard('bilibili');
      break;
    case 'hot_baidu':
      initHotCard('baidu');
      break;
    case 'juejin':
      initJuejin();
      break;
    case 'zhihu':
      initZhihu();
      break;
    case 'weread':
      initWeread();
      break;
    case 'readdata':
      initReaddata();
      break;
    case 'recommend':
      initRecommend();
      break;
    case 'notes':
      initNotes();
      break;
    case 'review':
      initReview();
      break;
    case 'search':
      initSearch();
      break;
    case 'sina_flash':
      initSinaFlash();
      break;
    case 'aihot':
      initAihot();
      break;
    case 'tax':
      initTax();
      break;
    case 'mortgage':
      initMortgage();
      break;
    case 'bmi':
      initBmi();
      break;
    case 'currency':
      initCurrency();
      break;
    case 'bookmarks':
      initBookmarks();
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
        showCat(wmCat);
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
    else renderSetSalary();
  }),
);
async function openSettings() {
  document.querySelectorAll('#smSidebar .msb').forEach((b) => b.classList.remove('active'));
  document.querySelector('#smSidebar [data-s="time"]')!.classList.add('active');
  renderSetTime();
  sm.classList.add('open');
}
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
    `<div class="f"><label>上班</label><input type="time" id="sStart" value="${t(s.startHour, s.startMinute)}"/></div><div class="f"><label>午餐</label><input type="time" id="sLunch" value="${t(s.lunchHour, s.lunchMinute)}"/></div><div class="f"><label>午休结束</label><input type="time" id="sRestEnd" value="${t(s.restEndHour, s.restEndMinute)}"/></div><div class="f"><label>下班</label><input type="time" id="sEnd" value="${t(s.endHour, s.endMinute)}"/></div><div class="f"><label>工作日</label><div style="display:flex;gap:5px" id="sDays">${dhtml}</div></div><button class="btn" id="sSave">保存</button><div id="sStatus" style="text-align:center;font-size:12px;padding:6px;display:none;color:var(--accent)"></div>`;
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
    if (isNaN(sh) || isNaN(lh) || isNaN(rh) || isNaN(eh)) return;
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
    document.getElementById('sStatus')!.textContent = '已保存';
    document.getElementById('sStatus')!.style.display = 'block';
    setTimeout(() => (document.getElementById('sStatus')!.style.display = 'none'), 2500);
  });
}
async function renderSetSalary() {
  const s = await getSal();
  document.getElementById('settingsBody')!.innerHTML = `
    <div class="f"><label>月薪（元）</label><input type="number" id="sSalInc" value="${s.monthlyIncome}" min="1" style="width:100%;padding:9px 12px;font-size:13px;border:0.5px solid var(--glass-border);border-radius:var(--radius-xs);background:rgba(255,255,255,0.5);color:var(--text);outline:none;font-family:inherit"/></div>
    <div class="f"><label>发薪日</label><div style="display:flex;align-items:center;gap:8px"><span style="font-size:13px;color:var(--text-secondary)">每月</span><input type="number" id="sSalDay" value="${s.payDay}" min="1" max="31" style="width:80px;padding:9px 12px;font-size:13px;border:0.5px solid var(--glass-border);border-radius:var(--radius-xs);background:rgba(255,255,255,0.5);color:var(--text);outline:none;font-family:inherit;text-align:center"/><span style="font-size:13px;color:var(--text-secondary)">号</span></div></div>
    <div class="f" style="font-size:11px;color:var(--text-tertiary)">工作日 21.75 天/月，薪资按 上班~下班 时段计算（含午休带薪）</div>
    <button class="btn" id="sSalSave">保存</button>
    <div id="sSalStat" style="text-align:center;font-size:12px;padding:6px;display:none;color:var(--accent)"></div>`;
  document.getElementById('sSalSave')!.addEventListener('click', async () => {
    const inc = Number((document.getElementById('sSalInc') as HTMLInputElement).value);
    const d = Number((document.getElementById('sSalDay') as HTMLInputElement).value);
    if (inc < 1 || d < 1 || d > 31) return;
    const oldRate = salRate();
    salStt = { monthlyIncome: inc, payDay: d };
    await setSal(salStt);
    rescaleSal(oldRate);
    tickSalary();
    document.getElementById('sSalStat')!.textContent = '已保存';
    document.getElementById('sSalStat')!.style.display = 'block';
    setTimeout(() => (document.getElementById('sSalStat')!.style.display = 'none'), 2500);
  });
}

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    wm.classList.remove('open');
    sm.classList.remove('open');
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
function toMoney3(v: number) {
  return '¥' + v.toFixed(3);
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
    textEl = document.getElementById('salText'),
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
  if (amt) amt.textContent = toMoney3(total);
  if (workEl) workEl.textContent = toMoney3(salState.workIncome);
  if (fishEl) fishEl.textContent = toMoney3(salState.fishIncome);
  if (restEl) restEl.textContent = toMoney3(salState.restIncome);

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
      cd.innerHTML = '🛏️ 周末双休，享受生活';
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
      cd.innerHTML = `⏲️ ${label} <span>${toTime(diff)}</span>`;
    }
  }

  // 状态文字
  if (textEl) {
    if (!isWorkday) textEl.textContent = '周末休息中';
    else if (cur < start) textEl.textContent = '还没开工';
    else if (cur >= off) textEl.textContent = '今天已下班';
    else if (salState.mode === 'work') textEl.textContent = '专注工作中';
    else textEl.textContent = '摸鱼中';
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
    .querySelectorAll('.cal-popover.open, .weather-popover.open')
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

// ── 音乐（APlayer + Meting API）──
const MUSIC_API = 'https://api.i-meto.com/meting/api?server=netease&type=playlist&id=3778678&r=';
let musicAp: any = null;
async function initMusic() {
  const container = document.getElementById('musicPlayer');
  if (!container) return;
  container.onclick = null;
  container.innerHTML = '<div class="hot-empty">加载中…</div>';
  document.getElementById('musicPrev')?.addEventListener('click', () => musicAp?.skipBack());
  document.getElementById('musicNext')?.addEventListener('click', () => musicAp?.skipForward());
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
    musicAp = new APlayer({
      container: container as HTMLElement,
      audio,
      autoplay: false,
      theme: '#d97706',
      listFolded: true,
      loop: 'all',
      order: 'list',
      listMaxHeight: '220px',
      lrcType: 3,
    });
  } catch {
    container.innerHTML = '<div class="hot-empty">⚠ 加载失败 · 点击重试</div>';
    container.onclick = () => initMusic();
  }
}

function initTv() {
  document.getElementById('tvBack')?.addEventListener('click', () => {
    const f = document.getElementById('tvFrame') as HTMLIFrameElement | null;
    if (!f) return;
    try {
      // 跨域 iframe 会拦截 history 访问，能回退就用回退
      f.contentWindow?.history.back();
    } catch {
      // 拦截则重载回首页（带唯一 r 防同 URL 不刷新）
      f.src = `http://app.conan.js.cn/tv?v=${new Date().toISOString().slice(0, 10)}&r=${Date.now()}`;
    }
  });
}

// ── 顶部搜索框 ──
const SB_KEY = 'moyu_search_engine';
const ENGINES: { name: string; url: string }[] = [
  { name: '百度', url: 'https://www.baidu.com/s?wd=' },
  { name: 'Google', url: 'https://www.google.com/search?q=' },
  { name: '必应', url: 'https://www.bing.com/search?q=' },
  { name: 'DuckDuckGo', url: 'https://duckduckgo.com/?q=' },
  { name: '360', url: 'https://www.so.com/s?q=' },
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
    (e) => `<div class="sb-engine-opt${e.name === sbCur.name ? ' active' : ''}" data-name="${e.name}">${e.name}</div>`,
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
      listEl.querySelectorAll('.sb-engine-opt').forEach((o) =>
        o.classList.toggle('active', (o as HTMLElement).dataset.name === name),
      );
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
  initCalendarPopover();
  initWeatherPopover();
  initWebSearch();
  await loadSch();
  await loadSal();
  renderSidebar();
  await showCat(curCat);
  setInterval(() => {
    updT();
    tickSalary();
  }, 1000);
}
init();
