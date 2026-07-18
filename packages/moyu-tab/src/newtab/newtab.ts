const SM = 'moyu_merit',
  SS = 'moyu_schedule',
  SQ = 'moyu_quotes',
  SW = 'moyu_widgets',
  SL = 'moyu_links',
  SR = 'moyu_salary';
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
interface QD {
  builtIn: string[];
  custom: string[];
  enabledIndices: number[];
}
interface Lk {
  name: string;
  url: string;
}
interface SalStt {
  monthlyIncome: number;
  payDay: number;
}
interface SubCat {
  id: string;
  name: string;
}
interface TopCat {
  id: string;
  name: string;
  icon: string;
  subs: SubCat[];
}
function svg(p: string) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${p}</svg>`;
}
const ICONS: Record<string, string> = {
  life: svg('<circle cx="12" cy="12" r="4"/><path d="M12 3v2M12 19v2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M3 12h2M19 12h2M5.6 18.4l1.4-1.4M17 7l1.4-1.4"/>'),
  news: svg('<path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/>'),
  fun: svg('<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>'),
  work: svg('<rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>'),
  study: svg('<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>'),
  finance: svg('<path d="M3 17l6-6 4 4 8-8"/><path d="M21 7v6h-6"/>'),
  tools: svg('<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>'),
  games: svg('<rect x="3" y="3" width="18" height="18" rx="3"/><path d="M8 8h.01M16 8h.01M8 16h.01M16 16h.01M12 12h.01"/>'),
};
const CAT_TREE: TopCat[] = [
  {
    id: 'life',
    name: '生活',
    icon: ICONS.life,
    subs: [
      { id: 'weather', name: '天气' },
      { id: 'calendar', name: '日历' },
      { id: 'fortune', name: '运势' },
      { id: 'trip', name: '出行' },
    ],
  },
  {
    id: 'news',
    name: '资讯',
    icon: ICONS.news,
    subs: [
      { id: 'hot', name: '热搜' },
      { id: 'news', name: '新闻' },
      { id: 'flash', name: '快讯' },
    ],
  },
  {
    id: 'fun',
    name: '娱乐',
    icon: ICONS.fun,
    subs: [
      { id: 'joke', name: '段子' },
      { id: 'merit', name: '功德' },
      { id: 'media', name: '影音' },
      { id: 'read', name: '阅读' },
    ],
  },
  {
    id: 'work',
    name: '工作',
    icon: ICONS.work,
    subs: [
      { id: 'salary', name: '薪资' },
      { id: 'effi', name: '效率' },
      { id: 'office', name: '办公' },
    ],
  },
  {
    id: 'study',
    name: '学习',
    icon: ICONS.study,
    subs: [
      { id: 'wiki', name: '百科' },
      { id: 'dict', name: '词典' },
      { id: 'course', name: '课程' },
    ],
  },
  {
    id: 'finance',
    name: '理财',
    icon: ICONS.finance,
    subs: [
      { id: 'market', name: '行情' },
      { id: 'stock', name: '股市' },
      { id: 'rate', name: '汇率' },
      { id: 'account', name: '记账' },
    ],
  },
  {
    id: 'tools',
    name: '工具',
    icon: ICONS.tools,
    subs: [
      { id: 'nav', name: '导航' },
      { id: 'conv', name: '换算' },
      { id: 'calc', name: '计算' },
    ],
  },
  {
    id: 'games',
    name: '游戏',
    icon: ICONS.games,
    subs: [
      { id: 'puzzle', name: '益智' },
      { id: 'casual', name: '休闲' },
    ],
  },
];
interface WID {
  id: string;
  name: string;
  desc: string;
  cat: string;
  sub: string;
}
const ALL_WIDGETS: WID[] = [
  { id: 'weather', name: '天气', desc: '实时天气', cat: 'life', sub: 'weather' },
  { id: 'calendar', name: '日历', desc: '月历+农历', cat: 'life', sub: 'calendar' },
  { id: 'hot_weibo', name: '微博热搜', desc: '微博实时热搜', cat: 'news', sub: 'hot' },
  { id: 'hot_bilibili', name: 'B站热搜', desc: 'B站实时热搜', cat: 'news', sub: 'hot' },
  { id: 'hot_baidu', name: '百度热搜', desc: '百度实时热搜', cat: 'news', sub: 'hot' },
  { id: 'quote', name: '语录', desc: '随机摸鱼语录', cat: 'fun', sub: 'joke' },
  { id: 'fish', name: '功德', desc: '敲木鱼计数器', cat: 'fun', sub: 'merit' },
  { id: 'salary', name: '薪资跳动', desc: '实时薪资计数器', cat: 'work', sub: 'salary' },
  { id: 'gold', name: '金价', desc: '实时黄金价格', cat: 'finance', sub: 'market' },
  { id: 'fund', name: '基金', desc: '实时基金估值', cat: 'finance', sub: 'market' },
  { id: 'links', name: '网址', desc: '常用快捷网址', cat: 'tools', sub: 'nav' },
];
type WData = { subs: Record<string, string[]> };
function subKey(cat: string, sub: string) {
  return cat + '.' + sub;
}
async function getWD(): Promise<WData> {
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
async function setWD(d: WData) {
  await chrome.storage.sync.set({ [SW]: { subs: d.subs } });
}
async function getLinks(): Promise<Lk[]> {
  const r = await chrome.storage.sync.get(SL);
  return (r[SL] as Lk[]) ?? [];
}
async function setLinks(ls: Lk[]) {
  await chrome.storage.sync.set({ [SL]: ls });
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
let curSub = CAT_TREE[0].subs[0].id;
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
    const cards = Array.from(panel.children) as HTMLElement[];
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
function renderSidebar() {
  const nav = document.getElementById('sidebarNav')!;
  nav.innerHTML = CAT_TREE.map(
    (top) =>
      `<div class="sb-group" data-top="${top.id}"><button class="sb-btn sb-top" data-top="${top.id}"><span class="ic">${top.icon}</span>${top.name}<span class="sb-arrow">▾</span></button><div class="sb-subs">${top.subs
        .map((s) => `<button class="sb-btn sb-sub" data-cat="${top.id}" data-sub="${s.id}">${s.name}</button>`)
        .join('')}</div></div>`,
  ).join('');
  nav.querySelectorAll('.sb-top').forEach((b) =>
    b.addEventListener('click', function (this: HTMLElement) {
      const g = this.closest('.sb-group') as HTMLElement;
      const wasOpen = g.classList.contains('open');
      nav.querySelectorAll('.sb-group').forEach((x) => x.classList.remove('open'));
      if (!wasOpen) g.classList.add('open');
    }),
  );
  nav.querySelectorAll('.sb-sub').forEach((b) =>
    b.addEventListener('click', () => {
      const el = b as HTMLElement;
      showSub(el.dataset.cat!, el.dataset.sub!);
    }),
  );
}
function highlightSub() {
  const nav = document.getElementById('sidebarNav')!;
  nav.querySelectorAll('.sb-sub').forEach((b) => {
    const el = b as HTMLElement;
    el.classList.toggle('active', el.dataset.cat === curCat && el.dataset.sub === curSub);
  });
  const g = nav.querySelector(`.sb-group[data-top="${curCat}"]`);
  if (g && !g.classList.contains('open')) {
    nav.querySelectorAll('.sb-group').forEach((x) => x.classList.remove('open'));
    (g as HTMLElement).classList.add('open');
  }
}

let rendered: Record<string, boolean> = {},
  salStt: SalStt = { monthlyIncome: 10000, payDay: 10 };
async function showSub(cat: string, sub: string) {
  curCat = cat;
  curSub = sub;
  const d = await getWD();
  const ids = d.subs[subKey(cat, sub)] || [];
  const panel = document.getElementById('panel')!;
  rendered = {};
  if (!ids.length) {
    panel.innerHTML = `<div class="empty"><div>暂无组件</div><div class="add-hint">左侧点击 组件库</div></div>`;
    highlightSub();
    nmTrigger();
    return;
  }
  let h = '';
  for (const id of ids) {
    const w = ALL_WIDGETS.find((x) => x.id === id);
    if (!w) continue;
    h += getCard(w);
  }
  panel.innerHTML = h;
  for (const id of ids) initW(id);
  highlightSub();
  nmTrigger();
}
function getCard(w: WID): string {
  if (w.id === 'quote')
    return `<div class="widget-card quote-card">
      <div class="quote-head">
        <div class="quote-title">❝ 摸鱼语录</div>
        <div class="quote-hint">点击换</div>
      </div>
      <div class="quote-text" id="quoteText">加载中...</div>
    </div>`;
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
  if (w.id === 'gold')
    return `<div class="widget-card gold-card">
      <div class="gold-head">
        <div class="gold-title">◆ 实时金价</div>
        <div class="gold-meta">
          <span class="gold-upd" id="goldUpd">加载中…</span>
          <button class="gold-refresh" id="goldRefresh" title="刷新">↻</button>
        </div>
      </div>
      <div class="gold-main">
        <span class="gold-amount" id="goldGram">¥--</span>
        <span class="gold-unit">元/克</span>
      </div>
      <div class="gold-sub">
        <div class="gold-sub-i"><span>美元/盎司</span><span id="goldUsd">$--</span></div>
        <div class="gold-delta flat" id="goldDelta">实时</div>
      </div>
    </div>`;
  if (w.id === 'fund')
    return `<div class="widget-card fund-card">
      <div class="fund-head">
        <div class="fund-title">❖ 基金估值</div>
        <div class="fund-meta">
          <span class="fund-upd" id="fundUpd"></span>
          <button class="fund-refresh" id="fundRefresh" title="刷新">↻</button>
        </div>
      </div>
      <div class="fund-list" id="fundList"><div class="fund-empty">加载中…</div></div>
      <div class="fund-add">
        <input id="fundInput" placeholder="基金代码，如 001186" />
        <button id="fundAdd">+</button>
      </div>
    </div>`;
  if (w.id === 'fish')
    return `<div class="widget-card fish-card">
      <div class="fish-head">
        <div class="fish-title">✿ 功德</div>
        <div class="fish-merit" id="fishMerit">0</div>
      </div>
      <button class="fish-btn" id="fishBtn" title="敲一下">◒</button>
      <div class="fish-hint">点一下 · 积功德</div>
    </div>`;
  if (w.id === 'links')
    return `<div class="widget-card links-card">
      <div class="links-head"><div class="links-title">⊕ 快捷网址</div></div>
      <div class="links-list" id="linksList"><div class="links-empty">加载中…</div></div>
      <div class="links-add">
        <input id="lnkName" placeholder="名称" />
        <input id="lnkUrl" placeholder="https://..." />
        <button id="lnkAdd">+</button>
      </div>
    </div>`;
  if (w.id === 'weather')
    return `<div class="widget-card weather-card">
      <div class="weather-head">
        <div class="weather-title">☂ 实时天气</div>
        <div class="weather-meta">
          <span class="weather-upd" id="weatherUpd">加载中…</span>
          <button class="weather-refresh" id="weatherRefresh" title="刷新">↻</button>
        </div>
      </div>
      <div class="weather-city" id="weatherCityWrap"><span id="weatherCity">--</span><input id="weatherCityInput" placeholder="输入城市" style="display:none"/></div>
      <div class="weather-main">
        <span class="weather-icon" id="weatherIcon">--</span>
        <span class="weather-temp" id="weatherTemp">--°</span>
      </div>
      <div class="weather-desc" id="weatherDesc">--</div>
      <div class="weather-sub">
        <div class="weather-sub-i"><span>体感</span><span id="weatherFeel">--</span></div>
        <div class="weather-sub-i"><span>湿度</span><span id="weatherHum">--</span></div>
        <div class="weather-sub-i"><span>风速</span><span id="weatherWind">--</span></div>
      </div>
    </div>`;
  if (w.id === 'calendar')
    return `<div class="widget-card cal-card">
      <div class="cal-head">
        <button class="cal-nav" id="calPrev">‹</button>
        <div class="cal-ym">
          <div class="cal-dd" id="calYearDD"><button class="cal-dd-btn" type="button"><span class="cal-dd-val">年</span><span class="cal-dd-arrow">▾</span></button><div class="cal-dd-list" id="calYearList"></div></div>
          <div class="cal-dd" id="calMonthDD"><button class="cal-dd-btn" type="button"><span class="cal-dd-val">月</span><span class="cal-dd-arrow">▾</span></button><div class="cal-dd-list" id="calMonthList"></div></div>
        </div>
        <button class="cal-nav" id="calNext">›</button>
        <button class="cal-today" id="calToday" title="回到今日">今</button>
      </div>
      <div class="cal-week"><span>一</span><span>二</span><span>三</span><span>四</span><span>五</span><span>六</span><span>日</span></div>
      <div class="cal-grid" id="calGrid"></div>
    </div>`;
  if (HOT_WIDGETS[w.id]) {
    const p = HOT_WIDGETS[w.id].platform;
    return `<div class="widget-card hot-card">
      <div class="hot-head">
        <div class="hot-title">${HOT_WIDGETS[w.id].name}</div>
        <div class="hot-meta">
          <span class="hot-upd" id="hotUpd-${p}"></span>
          <button class="hot-swap" id="hotSwap-${p}" title="换一换">换一换 <i id="hotPage-${p}">1/3</i></button>
        </div>
      </div>
      <div class="hot-list" id="hotList-${p}"><div class="hot-empty">加载中…</div></div>
    </div>`;
  }
  return `<div class="widget-card clickable" data-widget="${w.id}"><div class="widget-entry"><span>${w.desc}</span><span class="arrow">→</span></div></div>`;
}
async function initW(id: string) {
  if (rendered[id]) return;
  rendered[id] = true;
  switch (id) {
    case 'fish':
      initFish();
      break;
    case 'quote':
      initQuote();
      break;
    case 'salary':
      initSalary();
      break;
    case 'gold':
      initGold();
      break;
    case 'fund':
      initFund();
      break;
    case 'links':
      initLinks();
      break;
    case 'weather':
      initWeather();
      break;
    case 'calendar':
      initCalendar();
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
  }
}

document.getElementById('addWidgetBtn')!.addEventListener('click', openWidgetModal);
document.getElementById('settingsBtn')!.addEventListener('click', openSettings);

// ── 快捷网址卡片 ──
async function renderLinksCard() {
  const ls = await getLinks();
  const list = document.getElementById('linksList');
  if (!list) return;
  if (!ls.length) {
    list.innerHTML = `<div class="links-empty">暂无链接 · 下方添加</div>`;
    return;
  }
  list.innerHTML = ls
    .map(
      (l, i) =>
        `<div class="links-row"><a href="${l.url}" target="_blank" rel="noopener" class="links-name">${esc(l.name)}</a><button class="links-del" data-i="${i}" title="删除">x</button></div>`,
    )
    .join('');
  list.querySelectorAll('.links-del').forEach((b) =>
    b.addEventListener('click', async () => {
      const i = Number((b as HTMLElement).dataset.i);
      const ls = await getLinks();
      ls.splice(i, 1);
      await setLinks(ls);
      renderLinksCard();
    }),
  );
}
async function addLink() {
  const nameEl = document.getElementById('lnkName') as HTMLInputElement | null;
  const urlEl = document.getElementById('lnkUrl') as HTMLInputElement | null;
  if (!nameEl || !urlEl) return;
  const n = nameEl.value.trim();
  let u = urlEl.value.trim();
  if (!n || !u) return;
  if (!/^https?:\/\//i.test(u)) u = 'https://' + u;
  const ls = await getLinks();
  ls.push({ name: n, url: u });
  await setLinks(ls);
  nameEl.value = '';
  urlEl.value = '';
  renderLinksCard();
}
async function initLinks() {
  await renderLinksCard();
  document.getElementById('lnkAdd')?.addEventListener('click', addLink);
  document.getElementById('lnkUrl')?.addEventListener('keydown', (e) => {
    if ((e as KeyboardEvent).key === 'Enter') addLink();
  });
}

// ── Widget Modal ──
const wm = document.getElementById('widgetModal')!;
document.getElementById('wmClose')!.addEventListener('click', () => wm.classList.remove('open'));
wm.addEventListener('click', (e) => {
  if (e.target === wm) wm.classList.remove('open');
});
async function renderWmList(cat: string, sub: string) {
  const d = await getWD();
  const wid = ALL_WIDGETS.filter((w) => w.cat === cat && w.sub === sub);
  const k = subKey(cat, sub);
  const onIds = d.subs[k] || [];
  if (!wid.length) {
    document.getElementById('widgetList')!.innerHTML =
      '<div style="font-size:12px;color:var(--text-tertiary);text-align:center;padding:20px 0">该分类暂无可用组件</div>';
    return;
  }
  let h = '';
  wid.forEach((w) => {
    const on = onIds.includes(w.id);
    h += `<div class="wg-item"><div><div class="wg-name">${w.name}</div><div class="wg-desc">${w.desc}</div></div><button class="wg-toggle ${on ? 'on' : 'off'}" data-id="${w.id}" data-cat="${cat}" data-sub="${sub}"></button></div>`;
  });
  document.getElementById('widgetList')!.innerHTML = h;
  document
    .getElementById('widgetList')!
    .querySelectorAll('.wg-toggle')
    .forEach((b) =>
      b.addEventListener('click', async function (this: HTMLElement) {
        const id = this.dataset.id!,
          cat = this.dataset.cat!,
          sub = this.dataset.sub!;
        const d = await getWD();
        const k = subKey(cat, sub);
        const arr = d.subs[k] || [];
        if (this.classList.contains('on')) {
          this.classList.replace('on', 'off');
          d.subs[k] = arr.filter((x) => x !== id);
        } else {
          this.classList.replace('off', 'on');
          d.subs[k] = [...arr, id];
        }
        await setWD(d);
        showSub(cat, sub);
        renderWmList(cat, sub);
      }),
    );
}
async function openWidgetModal() {
  await renderWmList(curCat, curSub);
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
    else if (this.dataset.s === 'quote') renderSetQuote();
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
async function renderSetQuote() {
  const d = await loadQD();
  const en = new Set(d.enabledIndices);
  let h = '';
  d.builtIn.forEach((q, i) => {
    h += `<div class="qi"><span class="i">#${i + 1}</span><span class="t">${esc(q)}</span><span class="a"><button class="tq" data-i="${i}" data-e="${en.has(i) ? '0' : '1'}">${en.has(i) ? '隐藏' : '显示'}</button></span></div>`;
  });
  d.custom.forEach((q, i) => {
    h += `<div class="qi"><span class="i">C${i + 1}</span><span class="t">${esc(q)}</span><span class="a"><button class="dq" data-i="${i}">删除</button></span></div>`;
  });
  if (!d.custom.length)
    h +=
      '<div style="font-size:11px;color:var(--text-tertiary);text-align:center;padding:10px 0">暂无自定义语录</div>';
  h += `<div class="aqr"><input id="sNewQ" placeholder="新语录"/><button id="sAddQ">添加</button></div><div id="sQStat" style="text-align:center;font-size:11px;padding:4px;display:none;color:var(--accent)"></div>`;
  document.getElementById('settingsBody')!.innerHTML = h;
  document.querySelectorAll('.tq').forEach((b) =>
    b.addEventListener('click', async () => {
      const i = Number((b as HTMLElement).dataset.i),
        e = (b as HTMLElement).dataset.e === '1';
      const d = await loadQD();
      if (e) d.enabledIndices.push(i);
      else d.enabledIndices = d.enabledIndices.filter((x) => x !== i);
      await saveQD(d);
      renderSetQuote();
    }),
  );
  document.querySelectorAll('.dq').forEach((b) =>
    b.addEventListener('click', async () => {
      const i = Number((b as HTMLElement).dataset.i);
      const d = await loadQD();
      d.custom.splice(i, 1);
      await saveQD(d);
      renderSetQuote();
    }),
  );
  document.getElementById('sAddQ')!.addEventListener('click', async () => {
    const t = (document.getElementById('sNewQ') as HTMLInputElement).value.trim();
    if (!t) return;
    const d = await loadQD();
    d.custom.push(t);
    await saveQD(d);
    (document.getElementById('sNewQ') as HTMLInputElement).value = '';
    renderSetQuote();
    document.getElementById('sQStat')!.textContent = '已添加';
    document.getElementById('sQStat')!.style.display = 'block';
    setTimeout(() => (document.getElementById('sQStat')!.style.display = 'none'), 2000);
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
  document.getElementById('timeDisplay')!.addEventListener('click', () => {
    const l = app.classList.toggle('locked');
    localStorage.setItem('moyu_locked', l ? '1' : '0');
  });
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
  0x04bd8, 0x04ae0, 0x0a570, 0x054d5, 0x0d260, 0x0d950, 0x16554, 0x056a0, 0x09ad0, 0x055d2, //1900-1909
  0x04ae0, 0x0a5b6, 0x0a4d0, 0x0d250, 0x1d255, 0x0b540, 0x0d6a0, 0x0ada2, 0x095b0, 0x14977, //1910-1919
  0x04970, 0x0a4b0, 0x0b4b5, 0x06a50, 0x06d40, 0x1ab54, 0x02b60, 0x09570, 0x052f2, 0x04970, //1920-1929
  0x06566, 0x0d4a0, 0x0ea50, 0x16a95, 0x05ad0, 0x02b60, 0x186e3, 0x092e0, 0x1c8d7, 0x0c950, //1930-1939
  0x0d4a0, 0x1d8a6, 0x0b550, 0x056a0, 0x1a5b4, 0x025d0, 0x092d0, 0x0d2b2, 0x0a950, 0x0b557, //1940-1949
  0x06ca0, 0x0b550, 0x15355, 0x04da0, 0x0a5b0, 0x14573, 0x052b0, 0x0a9a8, 0x0e950, 0x06aa0, //1950-1959
  0x0aea6, 0x0ab50, 0x04b60, 0x0aae4, 0x0a570, 0x05260, 0x0f263, 0x0d950, 0x05b57, 0x056a0, //1960-1969
  0x096d0, 0x04dd5, 0x04ad0, 0x0a4d0, 0x0d4d4, 0x0d250, 0x0d558, 0x0b540, 0x0b6a0, 0x195a6, //1970-1979
  0x095b0, 0x049b0, 0x0a974, 0x0a4b0, 0x0b27a, 0x06a50, 0x06d40, 0x0af46, 0x0ab60, 0x09570, //1980-1989
  0x04af5, 0x04970, 0x064b0, 0x074a3, 0x0ea50, 0x06b58, 0x05ac0, 0x0ab60, 0x096d5, 0x092e0, //1990-1999
  0x0c960, 0x0d954, 0x0d4a0, 0x0da50, 0x07552, 0x056a0, 0x0abb7, 0x025d0, 0x092d0, 0x0cab5, //2000-2009
  0x0a950, 0x0b4a0, 0x0baa4, 0x0ad50, 0x055d9, 0x04ba0, 0x0a5b0, 0x15176, 0x052b0, 0x0a930, //2010-2019
  0x07954, 0x06aa0, 0x0ad50, 0x05b52, 0x04b60, 0x0a6e6, 0x0a4e0, 0x0d260, 0x0ea65, 0x0d530, //2020-2029
  0x05aa0, 0x076a3, 0x096d0, 0x04afb, 0x04ad0, 0x0a4d0, 0x1d0b6, 0x0d250, 0x0d520, 0x0dd45, //2030-2039
  0x0b5a0, 0x056d0, 0x055b2, 0x049b0, 0x0a577, 0x0a4b0, 0x0aa50, 0x1b255, 0x06d20, 0x0ada0, //2040-2049
  0x14b63, 0x09370, 0x049f8, 0x04970, 0x064b0, 0x168a6, 0x0ea50, 0x06b20, 0x1a6c4, 0x0aae0, //2050-2059
  0x092e0, 0x0d2e3, 0x0c960, 0x0d557, 0x0d4a0, 0x0da50, 0x05d55, 0x056a0, 0x0a6d0, 0x055d4, //2060-2069
  0x052d0, 0x0a9b8, 0x0a950, 0x0b4a0, 0x0b6a6, 0x0ad50, 0x055a0, 0x0aba4, 0x0a5b0, 0x052b0, //2070-2079
  0x0b273, 0x06930, 0x07337, 0x06aa0, 0x0ad50, 0x14b55, 0x04b60, 0x0a570, 0x054e4, 0x0d160, //2080-2089
  0x0e968, 0x0d520, 0x0daa0, 0x16aa6, 0x056d0, 0x04ae0, 0x0a9d4, 0x0a2d0, 0x0d150, 0x0f252, //2090-2099
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
  return { lm, ld, cM: (isLeap ? '闰' : '') + (LUNAR_MONTH[lm - 1] || ''), cD: LUNAR_DAY[ld] || '' };
}
function updT() {
  const n = new Date(),
    h = n.getHours(),
    ampm = h < 12 ? '上午' : '下午';
  const td = document.getElementById('timeDisplay');
  if (td) td.textContent = `${pad(h)}:${pad(n.getMinutes())}:${pad(n.getSeconds())}`;
  const dd = document.getElementById('dateDisplay');
  if (dd) {
    const l = getLunar(n.getFullYear(), n.getMonth() + 1, n.getDate());
    const ln = l.ld > 0 ? ' · 农历' + l.cM + '月' + l.cD : '';
    dd.textContent = `${n.getFullYear()}.${pad(n.getMonth() + 1)}.${pad(n.getDate())} 周${['日', '一', '二', '三', '四', '五', '六'][n.getDay()]} ${ampm}${ln}`;
  }
}

let cQ = '';
const BI = [
  '摸鱼是一种态度',
  '上班不摸鱼回家睡不香',
  '工作总会做完的不急这一时',
  '摸鱼五分钟精神两小时',
  '不是在摸鱼在给大脑充电',
  '生活不止眼前的KPI还有摸鱼和远方',
  '高效的摸鱼是一门艺术',
  '你今天摸鱼了吗',
  '工作是为了更好的摸鱼',
  '不急不躁慢慢来反正也做不完',
  '真正的自由是心在摸鱼',
  '摸鱼是成年人的课间休息',
  '不想工作就摸摸鱼',
  '人生苦短及时摸鱼',
  '摸鱼不是懒是战略性休整',
  '摸鱼使我快乐',
  '适度摸鱼益脑过度摸鱼伤身',
];
function gQD(): QD {
  return { builtIn: BI, custom: [], enabledIndices: BI.map((_, i) => i) };
}
async function loadQD(): Promise<QD> {
  const r = await chrome.storage.sync.get(SQ);
  const d = r[SQ] as QD | undefined;
  if (d && Array.isArray(d.builtIn) && d.builtIn.length) return d;
  const def = gQD();
  await chrome.storage.sync.set({ [SQ]: def });
  return def;
}
async function saveQD(d: QD) {
  await chrome.storage.sync.set({ [SQ]: d });
}
function aQ(d: QD) {
  const e: string[] = [];
  for (const i of d.enabledIndices) if (i >= 0 && i < d.builtIn.length) e.push(d.builtIn[i]);
  return [...e, ...d.custom].filter(Boolean);
}
function initQuote() {
  const qt = document.getElementById('quoteText');
  if (!qt) return;
  const card = qt.closest('.quote-card') as HTMLElement | null;
  (card || qt).addEventListener('click', async () => {
    const d = await loadQD();
    sRQ(d);
  });
  loadQD().then((d) => sRQ(d));
}
function sRQ(d: QD) {
  const qt = document.getElementById('quoteText');
  if (!qt) return;
  const all = aQ(d);
  if (!all.length) {
    qt.textContent = '暂无';
    return;
  }
  let n = '';
  do {
    n = all[Math.floor(Math.random() * all.length)];
  } while (n === cQ && all.length > 1);
  cQ = n;
  qt.textContent = cQ;
}
function esc(s: string) {
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

let merit = 0;
async function loadM() {
  const r = await chrome.storage.local.get(SM);
  merit = r[SM] ?? 0;
}
async function saveM() {
  await chrome.storage.local.set({ [SM]: merit });
}
let aCtx: AudioContext | null = null;
function playF() {
  if (!aCtx) aCtx = new AudioContext();
  const bs = aCtx.sampleRate * 0.03,
    noise = aCtx.createBufferSource(),
    nb = aCtx.createBuffer(1, bs, aCtx.sampleRate),
    d = nb.getChannelData(0);
  for (let i = 0; i < bs; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / bs);
  noise.buffer = nb;
  const o = aCtx.createOscillator(),
    g = aCtx.createGain();
  o.type = 'sine';
  o.frequency.value = 380;
  g.gain.setValueAtTime(0.3, aCtx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, aCtx.currentTime + 0.15);
  o.connect(g);
  const ng = aCtx.createGain();
  ng.gain.setValueAtTime(0.08, aCtx.currentTime);
  ng.gain.exponentialRampToValueAtTime(0.001, aCtx.currentTime + 0.05);
  noise.connect(ng);
  g.connect(aCtx.destination);
  ng.connect(aCtx.destination);
  o.start(aCtx.currentTime);
  o.stop(aCtx.currentTime + 0.15);
  noise.start(aCtx.currentTime);
  noise.stop(aCtx.currentTime + 0.03);
}
async function initFish() {
  await loadM();
  const meritEl = document.getElementById('fishMerit');
  if (meritEl) meritEl.textContent = String(merit);
  document.getElementById('fishBtn')?.addEventListener('click', async () => {
    merit++;
    const el = document.getElementById('fishMerit');
    if (el) el.textContent = String(merit);
    await saveM();
    playF();
  });
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
const WP_LIST = 'moyu_wp_list';
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
document.getElementById('ctxWallpaper')!.addEventListener('click', async () => {
  ctxMenu.classList.remove('open');
  await openWallpaperModal();
});

async function getWpList(): Promise<{ name: string; dataUrl: string }[]> {
  const r = await chrome.storage.local.get(WP_LIST);
  return (r[WP_LIST] as any[]) || [];
}
async function saveWpList(list: { name: string; dataUrl: string }[]) {
  await chrome.storage.local.set({ [WP_LIST]: list });
}

async function openWallpaperModal() {
  const list = await getWpList();
  const current = localStorage.getItem(WP_KEY) || '';
  let html = `<div style="margin-bottom:12px;text-align:right"><input type="file" id="wpUpload" accept="image/*" multiple style="display:none"/><button id="wpUploadBtn" style="padding:6px 16px;font-size:12px;font-weight:500;border:0.5px solid var(--glass-border);border-radius:var(--radius-xs);background:var(--glass);color:var(--text-secondary);cursor:pointer;font-family:inherit">上传图片</button></div>`;
  if (list.length) {
    html += '<div class="wp-grid">';
    list.forEach((img, i) => {
      html += `<div class="wp-item${img.dataUrl === current ? ' active' : ''}" data-url="${img.dataUrl}" style="background-image:url(${img.dataUrl})" title="${img.name}"><button class="wp-del" data-i="${i}" style="position:absolute;top:4px;right:4px;background:rgba(0,0,0,0.4);border:none;color:#fff;width:20px;height:20px;border-radius:50%;cursor:pointer;font-size:10px;display:none">x</button></div>`;
    });
    html += '</div>';
  } else {
    html +=
      '<div style="text-align:center;padding:48px 0;color:var(--text-tertiary);font-size:13px">暂无壁纸 · 点击上方按钮上传</div>';
  }
  document.getElementById('wpBody')!.innerHTML = html;
  wpModal.classList.add('open');
  // click to apply
  document.querySelectorAll('.wp-item').forEach((el) =>
    el.addEventListener('click', function (this: HTMLElement) {
      const url = this.dataset.url!;
      localStorage.setItem(WP_KEY, url);
      document.body.style.backgroundImage = `url(${url})`;
      document.querySelectorAll('.wp-item').forEach((e) => e.classList.remove('active'));
      this.classList.add('active');
    }),
  );
  // hover to show delete
  document.querySelectorAll('.wp-item').forEach((el) => {
    el.addEventListener('mouseenter', function (this: HTMLElement) {
      const d = this.querySelector('.wp-del') as HTMLElement;
      if (d) d.style.display = 'block';
    });
    el.addEventListener('mouseleave', function (this: HTMLElement) {
      const d = this.querySelector('.wp-del') as HTMLElement;
      if (d) d.style.display = 'none';
    });
  });
  // delete
  document.querySelectorAll('.wp-del').forEach((b) =>
    b.addEventListener('click', async (e) => {
      e.stopPropagation();
      const i = Number((b as HTMLElement).dataset.i);
      const list = await getWpList();
      const removed = list[i];
      list.splice(i, 1);
      await saveWpList(list);
      if (localStorage.getItem(WP_KEY) === removed.dataUrl) {
        localStorage.removeItem(WP_KEY);
        document.body.style.backgroundImage = 'none';
      }
      openWallpaperModal();
    }),
  );
  // upload
  const fileInput = document.getElementById('wpUpload') as HTMLInputElement;
  document.getElementById('wpUploadBtn')!.addEventListener('click', () => fileInput.click());
  fileInput.onchange = async () => {
    const files = fileInput.files;
    if (!files) return;
    const list = await getWpList();
    for (const f of files) {
      const dataUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(f);
      });
      list.push({ name: f.name, dataUrl });
    }
    await saveWpList(list);
    fileInput.value = '';
    openWallpaperModal();
  };
}

function loadWallpaper() {
  const url = localStorage.getItem(WP_KEY);
  if (url) document.body.style.backgroundImage = `url(${url})`;
}

// ── 实时金价 ──
const GOLD_KEY = 'moyu_gold_cache';
interface GoldPrice {
  ounce: string;
  gram: string;
  tola: string;
}
interface GoldCache {
  gram: number;
  usdOunce: number;
  ts: number;
  prevGram: number;
}
let goldInited = false;
let goldLoading = false;
function loadGoldCache(): GoldCache | null {
  try {
    const raw = localStorage.getItem(GOLD_KEY);
    return raw ? (JSON.parse(raw) as GoldCache) : null;
  } catch {
    return null;
  }
}
function saveGoldCache(c: GoldCache) {
  try {
    localStorage.setItem(GOLD_KEY, JSON.stringify(c));
  } catch {}
}
function fmtGoldMoney(v: number, prefix: string) {
  return prefix + v.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmtGoldTime(ts: number) {
  const d = new Date(ts);
  return pad(d.getHours()) + ':' + pad(d.getMinutes());
}
function renderGold(c: GoldCache | null, error: boolean) {
  const gramEl = document.getElementById('goldGram');
  const usdEl = document.getElementById('goldUsd');
  const updEl = document.getElementById('goldUpd');
  const deltaEl = document.getElementById('goldDelta');
  if (!c) {
    if (gramEl) gramEl.textContent = error ? '获取失败' : '¥--';
    if (updEl) updEl.textContent = error ? '⚠ 失败 · 点刷新重试' : '加载中…';
    return;
  }
  if (gramEl) gramEl.textContent = fmtGoldMoney(c.gram, '¥');
  if (usdEl) usdEl.textContent = fmtGoldMoney(c.usdOunce, '$');
  if (updEl) updEl.textContent = (error ? '⚠ 更新失败 · ' : '') + fmtGoldTime(c.ts) + ' 更新';
  if (deltaEl) {
    if (c.prevGram > 0) {
      const diff = c.gram - c.prevGram;
      const pct = (diff / c.prevGram) * 100;
      if (Math.abs(diff) < 0.005) {
        deltaEl.className = 'gold-delta flat';
        deltaEl.textContent = '— 持平';
      } else {
        const up = diff > 0;
        deltaEl.className = 'gold-delta ' + (up ? 'up' : 'down');
        deltaEl.textContent =
          (up ? '▲ +' : '▼ ') + diff.toFixed(2) + ' (' + (up ? '+' : '') + pct.toFixed(2) + '%)';
      }
    } else {
      deltaEl.className = 'gold-delta flat';
      deltaEl.textContent = '实时';
    }
  }
}
async function fetchGold(): Promise<{ cny: GoldPrice; usd: GoldPrice }> {
  // 接口无 CORS 头，由 background SW 凭 host_permissions 绕过跨域
  const res = (await chrome.runtime.sendMessage({ type: 'GOLD_FETCH' })) as
    | {
        success: boolean;
        data?: { cny: GoldPrice; usd: GoldPrice };
        error?: string;
      }
    | undefined;
  if (!res?.success || !res.data) throw new Error(res?.error || 'fetch failed');
  return res.data;
}
async function refreshGold() {
  if (goldLoading) return;
  if (!document.getElementById('goldGram')) return;
  const btn = document.getElementById('goldRefresh');
  goldLoading = true;
  btn?.classList.add('spin');
  try {
    const prev = loadGoldCache();
    const r = await fetchGold();
    const c: GoldCache = {
      gram: parseFloat(r.cny.gram),
      usdOunce: parseFloat(r.usd.ounce),
      ts: Date.now(),
      prevGram: prev?.gram ?? 0,
    };
    renderGold(c, false);
    saveGoldCache(c);
  } catch {
    renderGold(loadGoldCache(), true);
  } finally {
    goldLoading = false;
    btn?.classList.remove('spin');
  }
}
function onGoldVis() {
  if (document.visibilityState !== 'visible') return;
  const c = loadGoldCache();
  if (!c || Date.now() - c.ts > 60000) refreshGold();
}
function initGold() {
  renderGold(loadGoldCache(), false);
  document.getElementById('goldRefresh')?.addEventListener('click', refreshGold);
  if (goldInited) return;
  goldInited = true;
  refreshGold();
  setInterval(refreshGold, 60000);
  document.addEventListener('visibilitychange', onGoldVis);
}

// ── 基金估值 ──
const SF = 'moyu_funds';
const FC_KEY = 'moyu_fund_cache';
interface FundData {
  name: string;
  dwjz: string;
  gsz: string;
  gszzl: string;
  gztime: string;
  ts: number;
}
let fundCodes: string[] = [];
let fundInited = false;
let fundLoading = false;
let fundLastFetch = 0;
async function getFunds(): Promise<string[]> {
  const r = await chrome.storage.sync.get(SF);
  return (r[SF] as string[]) ?? [];
}
async function setFunds(codes: string[]) {
  await chrome.storage.sync.set({ [SF]: codes });
}
async function loadFundCodes() {
  fundCodes = await getFunds();
}
function loadFundCache(): Record<string, FundData> {
  try {
    const raw = localStorage.getItem(FC_KEY);
    return raw ? (JSON.parse(raw) as Record<string, FundData>) : {};
  } catch {
    return {};
  }
}
function saveFundCache(c: Record<string, FundData>) {
  try {
    localStorage.setItem(FC_KEY, JSON.stringify(c));
  } catch {}
}
function fmtFundTime(ts: number) {
  const d = new Date(ts);
  return pad(d.getHours()) + ':' + pad(d.getMinutes());
}
function fmtFundChange(s: string) {
  const v = parseFloat(s);
  if (isNaN(v)) return { text: '--', cls: 'fund-chg flat' };
  if (v > 0) return { text: '+' + v.toFixed(2) + '%', cls: 'fund-chg up' };
  if (v < 0) return { text: v.toFixed(2) + '%', cls: 'fund-chg down' };
  return { text: '0.00%', cls: 'fund-chg flat' };
}
function renderFundList(error: boolean) {
  const list = document.getElementById('fundList');
  const upd = document.getElementById('fundUpd');
  if (!list) return;
  const cache = loadFundCache();
  if (!fundCodes.length) {
    list.innerHTML = `<div class="fund-empty">暂无基金 · 下方输入代码添加</div>`;
    if (upd) upd.textContent = '';
    return;
  }
  let latestTs = 0;
  let html = '';
  for (const code of fundCodes) {
    const d = cache[code];
    if (d) {
      latestTs = Math.max(latestTs, d.ts);
      const chg = fmtFundChange(d.gszzl);
      const t = d.gztime ? d.gztime.slice(-5) : '';
      html += `<div class="fund-row" data-code="${code}">
        <div class="fund-main">
          <div class="fund-name">${esc(d.name || code)}</div>
          <div class="fund-sub">${code} · 净值 ${d.dwjz || '--'}${t ? ' · ' + t : ''}</div>
        </div>
        <div class="fund-right">
          <div class="fund-gsz">${d.gsz || '--'}</div>
          <div class="${chg.cls}">${chg.text}</div>
        </div>
        <button class="fund-del" data-code="${code}" title="删除">x</button>
      </div>`;
    } else {
      html += `<div class="fund-row" data-code="${code}">
        <div class="fund-main">
          <div class="fund-name">${code}</div>
          <div class="fund-sub">${error ? '获取失败 · 检查代码' : '加载中…'}</div>
        </div>
        <div class="fund-right"><div class="fund-gsz">--</div><div class="fund-chg flat">--</div></div>
        <button class="fund-del" data-code="${code}" title="删除">x</button>
      </div>`;
    }
  }
  list.innerHTML = html;
  if (upd) {
    if (latestTs) upd.textContent = (error ? '⚠ ' : '') + fmtFundTime(latestTs) + ' 更新';
    else if (error) upd.textContent = '⚠ 失败';
    else upd.textContent = '';
  }
  list.querySelectorAll('.fund-del').forEach((b) =>
    b.addEventListener('click', async () => {
      const code = (b as HTMLElement).dataset.code!;
      fundCodes = fundCodes.filter((c) => c !== code);
      await setFunds(fundCodes);
      const cache = loadFundCache();
      delete cache[code];
      saveFundCache(cache);
      renderFundList(false);
    }),
  );
}
async function fetchFunds(codes: string[]): Promise<Record<string, Omit<FundData, 'ts'> | null>> {
  const res = (await chrome.runtime.sendMessage({ type: 'FUND_FETCH', codes })) as
    | {
        success: boolean;
        data?: Record<string, Omit<FundData, 'ts'> | null>;
      }
    | undefined;
  if (!res?.success || !res.data) throw new Error('fetch failed');
  return res.data;
}
async function refreshFund() {
  if (fundLoading) return;
  if (!document.getElementById('fundList')) return;
  if (!fundCodes.length) return;
  const btn = document.getElementById('fundRefresh');
  fundLoading = true;
  btn?.classList.add('spin');
  try {
    const data = await fetchFunds(fundCodes);
    const cache = loadFundCache();
    const now = Date.now();
    let ok = false;
    for (const code of fundCodes) {
      const d = data[code];
      if (d) {
        cache[code] = { ...d, ts: now };
        ok = true;
      }
    }
    saveFundCache(cache);
    fundLastFetch = Date.now();
    renderFundList(!ok);
  } catch {
    renderFundList(true);
  } finally {
    fundLoading = false;
    btn?.classList.remove('spin');
  }
}
async function addFund() {
  const input = document.getElementById('fundInput') as HTMLInputElement | null;
  if (!input) return;
  const code = input.value.trim();
  if (!/^\d{5,6}$/.test(code)) {
    input.classList.add('err');
    setTimeout(() => input.classList.remove('err'), 600);
    return;
  }
  if (fundCodes.includes(code)) {
    input.value = '';
    return;
  }
  fundCodes = [...fundCodes, code];
  await setFunds(fundCodes);
  input.value = '';
  renderFundList(false);
  refreshFund();
}
function bindFundControls() {
  document.getElementById('fundRefresh')?.addEventListener('click', refreshFund);
  document.getElementById('fundAdd')?.addEventListener('click', addFund);
  document.getElementById('fundInput')?.addEventListener('keydown', (e) => {
    if ((e as KeyboardEvent).key === 'Enter') addFund();
  });
}
function onFundVis() {
  if (document.visibilityState !== 'visible') return;
  if (fundCodes.length && Date.now() - fundLastFetch > 60000) refreshFund();
}
async function initFund() {
  await loadFundCodes();
  renderFundList(false);
  bindFundControls();
  if (fundInited) return;
  fundInited = true;
  refreshFund();
  setInterval(refreshFund, 60000);
  document.addEventListener('visibilitychange', onFundVis);
}

// ── 天气（Open-Meteo，前端直连，浏览器自带 UA）──
const WC_KEY = 'moyu_weather_city';
const WX_CACHE = 'moyu_weather_cache';
interface WCity {
  name: string;
  lat: number;
  lon: number;
}
interface WCache {
  temp: number;
  feel: number;
  hum: number;
  wind: number;
  code: number;
  ts: number;
  city: string;
}
const WMO: Record<number, { t: string; e: string }> = {
  0: { t: '晴', e: '☀️' },
  1: { t: '主要晴', e: '🌤️' },
  2: { t: '局部多云', e: '⛅' },
  3: { t: '阴', e: '☁️' },
  45: { t: '雾', e: '🌫️' },
  48: { t: '雾凇', e: '🌫️' },
  51: { t: '毛毛雨', e: '🌦️' },
  53: { t: '毛毛雨', e: '🌦️' },
  55: { t: '强毛毛雨', e: '🌧️' },
  56: { t: '冻毛毛雨', e: '🌧️' },
  57: { t: '强冻毛毛雨', e: '🌧️' },
  61: { t: '小雨', e: '🌦️' },
  63: { t: '中雨', e: '🌧️' },
  65: { t: '大雨', e: '🌧️' },
  66: { t: '冻雨', e: '🌧️' },
  67: { t: '强冻雨', e: '🌧️' },
  71: { t: '小雪', e: '🌨️' },
  73: { t: '中雪', e: '🌨️' },
  75: { t: '大雪', e: '❄️' },
  77: { t: '雪粒', e: '🌨️' },
  80: { t: '阵雨', e: '🌦️' },
  81: { t: '强阵雨', e: '🌧️' },
  82: { t: '暴雨', e: '⛈️' },
  85: { t: '阵雪', e: '🌨️' },
  86: { t: '强阵雪', e: '❄️' },
  95: { t: '雷暴', e: '⛈️' },
  96: { t: '雷暴伴冰雹', e: '⛈️' },
  99: { t: '强雷暴伴冰雹', e: '⛈️' },
};
let wCity: WCity | null = null;
let wLoading = false;
let wInited = false;
async function getWCity(): Promise<WCity | null> {
  const r = await chrome.storage.sync.get(WC_KEY);
  return (r[WC_KEY] as WCity) ?? null;
}
async function setWCity(c: WCity) {
  await chrome.storage.sync.set({ [WC_KEY]: c });
}
function loadWCache(): WCache | null {
  try {
    const raw = localStorage.getItem(WX_CACHE);
    return raw ? (JSON.parse(raw) as WCache) : null;
  } catch {
    return null;
  }
}
function saveWCache(c: WCache) {
  try {
    localStorage.setItem(WX_CACHE, JSON.stringify(c));
  } catch {}
}
function fmtWTime(ts: number) {
  const d = new Date(ts);
  return pad(d.getHours()) + ':' + pad(d.getMinutes());
}
function renderWeather(c: WCache | null, error: boolean) {
  const cityEl = document.getElementById('weatherCity');
  const iconEl = document.getElementById('weatherIcon');
  const tempEl = document.getElementById('weatherTemp');
  const descEl = document.getElementById('weatherDesc');
  const feelEl = document.getElementById('weatherFeel');
  const humEl = document.getElementById('weatherHum');
  const windEl = document.getElementById('weatherWind');
  const updEl = document.getElementById('weatherUpd');
  if (!c) {
    if (updEl) updEl.textContent = error ? '⚠ 获取失败 · 点刷新重试' : '加载中…';
    return;
  }
  const wmo = WMO[c.code] || { t: '未知', e: '🌡️' };
  if (cityEl) cityEl.textContent = c.city;
  if (iconEl) iconEl.textContent = wmo.e;
  if (tempEl) tempEl.textContent = Math.round(c.temp) + '°';
  if (descEl) descEl.textContent = wmo.t;
  if (feelEl) feelEl.textContent = Math.round(c.feel) + '°';
  if (humEl) humEl.textContent = c.hum + '%';
  if (windEl) windEl.textContent = Math.round(c.wind) + ' km/h';
  if (updEl) updEl.textContent = (error ? '⚠ 更新失败 · ' : '') + fmtWTime(c.ts) + ' 更新';
}
async function geocodeCity(name: string): Promise<WCity | null> {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(name)}&count=1&language=zh`;
  const ctrl = new AbortController();
  const to = setTimeout(() => ctrl.abort(), 10000);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) return null;
    const j = await res.json();
    const r = j?.results?.[0];
    if (!r) return null;
    return { name: String(r.name), lat: r.latitude, lon: r.longitude };
  } catch {
    return null;
  } finally {
    clearTimeout(to);
  }
}
async function refreshWeather() {
  if (wLoading) return;
  if (!document.getElementById('weatherTemp')) return;
  if (!wCity) return;
  const btn = document.getElementById('weatherRefresh');
  wLoading = true;
  btn?.classList.add('spin');
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${wCity.lat}&longitude=${wCity.lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m&timezone=auto`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const j = await res.json();
    const cur = j?.current;
    if (!cur) throw new Error('bad data');
    const c: WCache = {
      temp: cur.temperature_2m,
      feel: cur.apparent_temperature,
      hum: cur.relative_humidity_2m,
      wind: cur.wind_speed_10m,
      code: cur.weather_code,
      ts: Date.now(),
      city: wCity.name,
    };
    renderWeather(c, false);
    saveWCache(c);
  } catch {
    renderWeather(loadWCache(), true);
  } finally {
    wLoading = false;
    btn?.classList.remove('spin');
  }
}
function onWeatherVis() {
  if (document.visibilityState !== 'visible') return;
  const c = loadWCache();
  if (wCity && (!c || Date.now() - c.ts > 600000)) refreshWeather();
}
async function initWeather() {
  wCity = await getWCity();
  if (!wCity) {
    wCity = await geocodeCity('北京');
    if (wCity) await setWCity(wCity);
  }
  renderWeather(loadWCache(), false);
  document.getElementById('weatherRefresh')?.addEventListener('click', refreshWeather);
  const wrapEl = document.getElementById('weatherCityWrap');
  const inputEl = document.getElementById('weatherCityInput') as HTMLInputElement | null;
  wrapEl?.addEventListener('click', () => {
    if (inputEl && inputEl.style.display === 'none') {
      inputEl.style.display = 'block';
      inputEl.value = '';
      inputEl.focus();
    }
  });
  inputEl?.addEventListener('keydown', async (e) => {
    if ((e as KeyboardEvent).key !== 'Enter') return;
    const name = inputEl.value.trim();
    if (!name) return;
    const c = await geocodeCity(name);
    if (!c) {
      inputEl.classList.add('err');
      setTimeout(() => inputEl.classList.remove('err'), 600);
      return;
    }
    wCity = c;
    await setWCity(c);
    inputEl.style.display = 'none';
    refreshWeather();
  });
  inputEl?.addEventListener('blur', () => {
    inputEl.style.display = 'none';
    inputEl.classList.remove('err');
  });
  if (wInited) return;
  wInited = true;
  refreshWeather();
  setInterval(refreshWeather, 600000);
  document.addEventListener('visibilitychange', onWeatherVis);
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
      .map((o) => `<div class="cal-dd-opt${o.v === current ? ' active' : ''}" data-v="${o.v}">${o.label}</div>`)
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
    const lunar = getLunar(y, m + 1, d);
    const lunarText = d === 1 ? (lunar.cM ? lunar.cM + '月' : '') : lunar.cD || '';
    html += `<div class="cal-cell${isToday ? ' today' : ''}"><span class="cal-d">${d}</span><span class="cal-l">${lunarText}</span></div>`;
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
}

// ── 热搜（微博 / B站 / 百度，SW 直抓，三张独立卡片）──
const HC_KEY = 'moyu_hot_cache';
const HOT_WIDGETS: Record<string, { platform: string; name: string }> = {
  hot_weibo: { platform: 'weibo', name: '微博热搜' },
  hot_bilibili: { platform: 'bilibili', name: 'B站热搜' },
  hot_baidu: { platform: 'baidu', name: '百度热搜' },
};
interface HItem {
  title: string;
  hot: string;
  url: string;
  tag?: string;
}
const hotLoading: Record<string, boolean> = {};
const hotLastFetch: Record<string, number> = {};
const hotInited: Record<string, boolean> = {};
const hotPage: Record<string, number> = {};
function loadHotCache(): Record<string, { items: HItem[]; ts: number }> {
  try {
    const raw = localStorage.getItem(HC_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}
function saveHotCache(c: Record<string, { items: HItem[]; ts: number }>) {
  try {
    localStorage.setItem(HC_KEY, JSON.stringify(c));
  } catch {}
}
function fmtHotTime(ts: number) {
  const d = new Date(ts);
  return pad(d.getHours()) + ':' + pad(d.getMinutes());
}
function renderHotList(platform: string, error: boolean) {
  const list = document.getElementById('hotList-' + platform);
  const upd = document.getElementById('hotUpd-' + platform);
  const pageEl = document.getElementById('hotPage-' + platform);
  if (!list) return;
  const cache = loadHotCache();
  const c = cache[platform];
  if (!c || !c.items.length) {
    list.innerHTML = `<div class="hot-empty">${error ? '⚠ 获取失败' : '加载中…'}</div>`;
    if (upd) upd.textContent = error ? '⚠ 失败' : '';
    return;
  }
  const total = Math.min(3, Math.ceil(c.items.length / 10) || 1);
  const page = (hotPage[platform] || 0) % total;
  const slice = c.items.slice(page * 10, page * 10 + 10);
  list.innerHTML = slice
    .map((it, i) => {
      const rank = page * 10 + i + 1;
      return `<a class="hot-row" href="${it.url}" target="_blank" rel="noopener"><span class="hot-rank${rank <= 3 ? ' top' : ''}">${rank}</span><span class="hot-title">${esc(it.title)}${it.tag ? `<i class="hot-tag">${esc(it.tag)}</i>` : ''}</span>${it.hot ? `<span class="hot-num">${esc(it.hot)}</span>` : ''}</a>`;
    })
    .join('');
  if (pageEl) pageEl.textContent = page + 1 + '/' + total;
  if (upd) upd.textContent = (error ? '⚠ ' : '') + fmtHotTime(c.ts) + ' 更新';
}
function swapHotPage(platform: string) {
  const cache = loadHotCache();
  const c = cache[platform];
  if (!c || !c.items.length) return;
  const total = Math.min(3, Math.ceil(c.items.length / 10) || 1);
  hotPage[platform] = ((hotPage[platform] || 0) + 1) % total;
  renderHotList(platform, false);
}
async function refreshHot(platform: string) {
  if (hotLoading[platform]) return;
  if (!document.getElementById('hotList-' + platform)) return;
  hotLoading[platform] = true;
  try {
    const res = (await chrome.runtime.sendMessage({ type: 'HOT_FETCH', platform })) as
      | { success: boolean; data?: HItem[]; error?: string }
      | undefined;
    if (res?.success && res.data) {
      const cache = loadHotCache();
      cache[platform] = { items: res.data, ts: Date.now() };
      saveHotCache(cache);
      hotLastFetch[platform] = Date.now();
      renderHotList(platform, false);
    } else {
      renderHotList(platform, true);
    }
  } catch {
    renderHotList(platform, true);
  } finally {
    hotLoading[platform] = false;
  }
}
function onHotVis(platform: string) {
  if (document.visibilityState !== 'visible') return;
  if (Date.now() - (hotLastFetch[platform] || 0) > 300000) refreshHot(platform);
}
async function initHotCard(platform: string) {
  renderHotList(platform, false);
  document.getElementById('hotSwap-' + platform)?.addEventListener('click', () => swapHotPage(platform));
  if (hotInited[platform]) return;
  hotInited[platform] = true;
  refreshHot(platform);
  setInterval(() => refreshHot(platform), 300000);
  document.addEventListener('visibilitychange', () => onHotVis(platform));
}

async function init() {
  requestAnimationFrame(() =>
    requestAnimationFrame(() => document.documentElement.classList.add('animated')),
  );
  loadWallpaper();
  initClock();
  await loadSch();
  await loadM();
  await loadSal();
  renderSidebar();
  await showSub(curCat, curSub);
  setInterval(() => {
    updT();
    tickSalary();
  }, 1000);
}
init();
