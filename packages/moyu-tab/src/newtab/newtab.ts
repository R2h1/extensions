const SM = 'moyu_merit',
  SS = 'moyu_schedule',
  SQ = 'moyu_quotes',
  SW = 'moyu_widgets',
  SL = 'moyu_links',
  SR = 'moyu_salary';
interface Sch {
  lunchHour: number;
  lunchMinute: number;
  endHour: number;
  endMinute: number;
  workDays: number[];
}
const DS: Sch = {
  lunchHour: 11,
  lunchMinute: 30,
  endHour: 18,
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
const CATS = ['home', 'fish', 'efficiency', 'tools'] as const;
interface WID {
  id: string;
  name: string;
  desc: string;
  category: (typeof CATS)[number];
}
const ALL_WIDGETS: WID[] = [
  { id: 'clock', name: '时钟', desc: '时间和日期', category: 'home' },
  { id: 'quote', name: '语录', desc: '随机摸鱼语录', category: 'home' },
  { id: 'salary', name: '薪资跳动', desc: '实时薪资计数器', category: 'home' },
  { id: 'fish', name: '功德', desc: '敲木鱼计数器', category: 'fish' },
  { id: 'links', name: '链接', desc: '常用快捷网址', category: 'tools' },
];
type WData = { [K in (typeof CATS)[number]]: string[] };
async function getWD(): Promise<WData> {
  const r = await chrome.storage.sync.get(SW);
  const d = r[SW] as { cats: WData } | undefined;
  return d?.cats ?? { home: [], fish: [], efficiency: [], tools: [] };
}
async function setWD(d: WData) {
  await chrome.storage.sync.set({ [SW]: { cats: d } });
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

const sbCd = document.getElementById('sbCountdown')!;
const TABS = document.querySelectorAll('.sb-btn[data-tab]');
function sw(i: number) {
  ['panel0', 'panel1', 'panel2', 'panel3'].forEach((id, idx) =>
    document.getElementById(id)!.classList.toggle('active', idx === i),
  );
  TABS.forEach((b, idx) => b.classList.toggle('active', idx === i));
}
TABS.forEach((b) => b.addEventListener('click', () => sw(Number((b as HTMLElement).dataset.tab))));

let rendered: Record<string, boolean> = {},
  salStt: SalStt = { monthlyIncome: 10000, payDay: 10 };
async function renderAll() {
  const d = await getWD();
  rendered = {};
  for (let i = 0; i < 4; i++) {
    const cat = CATS[i],
      panel = document.getElementById('panel' + i)!,
      ids = d[cat];
    if (!ids.length) {
      panel.innerHTML = `<div class="empty"><div>暂无组件</div><div class="add-hint">左侧点击 添加组件</div></div>`;
      continue;
    }
    let h = '';
    for (const id of ids) {
      const w = ALL_WIDGETS.find((x) => x.id === id);
      if (!w) continue;
      h += getCard(w);
    }
    panel.innerHTML = h;
    for (const id of ids) initW(id);
  }
}
function getCard(w: WID): string {
  if (w.id === 'clock')
    return `<div style="text-align:center;padding:24px 20px 16px"><div id="wg-clock"><span style="font-size:72px;font-weight:600;letter-spacing:6px;color:white;line-height:1;cursor:pointer" id="timeDisplay">--:--</span><div style="font-size:14px;color:white;margin-top:10px;letter-spacing:2px" id="dateDisplay"></div></div></div>`;
  if (w.id === 'quote')
    return `<div class="widget-card"><div style="font-size:13px;line-height:1.7;color:var(--text-secondary);text-align:center;cursor:pointer" id="quoteText">加载中...</div></div>`;
  if (w.id === 'salary')
    return `<div class="widget-card"><div id="wg-salary"><div style="display:flex;align-items:baseline;gap:4px"><span style="font-size:28px;font-weight:250;color:var(--accent);font-family:'Courier New',monospace" id="salAmount">0.00</span><span style="font-size:13px;color:var(--text-secondary)">元</span></div><div style="font-size:11px;color:var(--text-tertiary);margin-top:4px" id="salDetail"></div><div style="font-size:10px;font-weight:500;margin-top:2px;display:inline-block;padding:2px 8px;border-radius:4px" id="salTag"></div><div style="font-size:10px;color:var(--text-tertiary);margin-top:4px;border-top:0.5px solid rgba(0,0,0,0.04);padding-top:4px" id="salPayDay"></div></div>`;
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
    case 'clock':
      initClock();
      break;
    case 'salary':
      initSalary();
      break;
  }
  if (id === 'fish' || id === 'links') {
    document
      .querySelectorAll(`.clickable[data-widget="${id}"]`)
      .forEach((card) => card.addEventListener('click', () => openFeatureModal(id)));
  }
}

document.getElementById('addWidgetBtn')!.addEventListener('click', openWidgetModal);
document.getElementById('settingsBtn')!.addEventListener('click', openSettings);

// ── Feature Modal ──
const fm = document.getElementById('featureModal')!,
  fmT = document.getElementById('fmTitle')!,
  fmB = document.getElementById('fmBody')!;
document.getElementById('fmClose')!.addEventListener('click', () => fm.classList.remove('open'));
fm.addEventListener('click', (e) => {
  if (e.target === fm) fm.classList.remove('open');
});
function openFeatureModal(wid: string) {
  const w = ALL_WIDGETS.find((x) => x.id === wid);
  if (!w) return;
  fmT.textContent = w.name;
  if (wid === 'fish') {
    fmB.innerHTML = `<div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px"><span style="font-size:11px;color:var(--text-tertiary);letter-spacing:3px">功 德</span><span style="font-size:64px;font-weight:250;color:var(--accent);font-family:'Courier New',monospace;letter-spacing:6px" id="fmMerit">${merit}</span><button id="fmFishBtn" style="width:130px;height:130px;border-radius:50%;background:rgba(255,255,255,0.5);border:0.5px solid rgba(0,0,0,0.08);color:var(--accent);font-size:38px;cursor:pointer;transition:all 0.2s;display:flex;align-items:center;justify-content:center">◒</button><span style="font-size:11px;color:var(--text-tertiary)">点一下 · 积功德</span></div>`;
    fm.classList.add('open');
    setTimeout(() => {
      const b = document.getElementById('fmFishBtn');
      if (b)
        b.addEventListener('click', async () => {
          merit++;
          const el = document.getElementById('fmMerit');
          if (el) el.textContent = String(merit);
          await saveM();
          playF();
          b.classList.remove('knock');
          void b.offsetWidth;
          b.classList.add('knock');
        });
    }, 100);
  } else renderLinksModal();
}
async function renderLinksModal() {
  const ls = await getLinks();
  let h = ls.length
    ? ls
        .map(
          (l, i) =>
            `<div class="lrow" style="display:flex;align-items:center;gap:8px;padding:8px 0;border-bottom:0.5px solid rgba(0,0,0,0.04)"><a href="${l.url}" target="_blank" style="flex:1;text-decoration:none;color:var(--text);font-size:13px;transition:color 0.2s">${esc(l.name)}</a><button class="ldel" data-i="${i}" style="background:none;border:none;color:var(--text-tertiary);cursor:pointer;font-size:12px;padding:2px 6px;opacity:0.5;transition:all 0.15s">x</button></div>`,
        )
        .join('')
    : `<div style="font-size:12px;color:var(--text-tertiary);text-align:center;padding:16px 0">暂无链接 · 在下方添加</div>`;
  h += `<div style="display:flex;gap:6px;margin-top:12px"><input id="lnkName" placeholder="名称" style="flex:1;padding:8px 10px;font-size:12px;border:0.5px solid var(--glass-border);border-radius:var(--radius-xs);background:rgba(255,255,255,0.5);color:var(--text);outline:none;font-family:inherit"/><input id="lnkUrl" placeholder="https://..." style="flex:2;padding:8px 10px;font-size:12px;border:0.5px solid var(--glass-border);border-radius:var(--radius-xs);background:rgba(255,255,255,0.5);color:var(--text);outline:none;font-family:inherit"/><button id="lnkAdd" style="padding:8px 14px;font-size:12px;border:0.5px solid var(--glass-border);border-radius:var(--radius-xs);background:var(--glass);color:var(--text-secondary);cursor:pointer;font-family:inherit">+</button></div>`;
  fmB.innerHTML = h;
  fm.classList.add('open');
  document.querySelectorAll('.ldel').forEach((b) =>
    b.addEventListener('click', async () => {
      const i = Number((b as HTMLElement).dataset.i);
      const ls = await getLinks();
      ls.splice(i, 1);
      await setLinks(ls);
      renderLinksModal();
    }),
  );
  document.getElementById('lnkAdd')!.addEventListener('click', async () => {
    const n = (document.getElementById('lnkName') as HTMLInputElement).value.trim();
    const u = (document.getElementById('lnkUrl') as HTMLInputElement).value.trim();
    if (!n || !u) return;
    const ls = await getLinks();
    ls.push({ name: n, url: u });
    await setLinks(ls);
    renderLinksModal();
  });
  document.getElementById('lnkUrl')!.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key === 'Enter') document.getElementById('lnkAdd')!.click();
  });
}

// ── Widget Modal ──
const wm = document.getElementById('widgetModal')!;
document.getElementById('wmClose')!.addEventListener('click', () => wm.classList.remove('open'));
wm.addEventListener('click', (e) => {
  if (e.target === wm) wm.classList.remove('open');
});
let wmCat: (typeof CATS)[number] = CATS[0];
async function renderWmList(cat: (typeof CATS)[number]) {
  const d = await getWD();
  const wid = ALL_WIDGETS.filter((w) => w.category === cat);
  if (!wid.length) {
    document.getElementById('widgetList')!.innerHTML =
      '<div style="font-size:12px;color:var(--text-tertiary);text-align:center;padding:20px 0">暂无可用组件</div>';
    return;
  }
  let h = '';
  wid.forEach((w) => {
    const on = d[cat].includes(w.id);
    h += `<div class="wg-item"><div><div class="wg-name">${w.name}</div><div class="wg-desc">${w.desc}</div></div><button class="wg-toggle ${on ? 'on' : 'off'}" data-id="${w.id}" data-cat="${cat}"></button></div>`;
  });
  document.getElementById('widgetList')!.innerHTML = h;
  document
    .getElementById('widgetList')!
    .querySelectorAll('.wg-toggle')
    .forEach((b) =>
      b.addEventListener('click', async function (this: HTMLElement) {
        const id = this.dataset.id!,
          c = this.dataset.cat! as (typeof CATS)[number];
        const d = await getWD();
        if (this.classList.contains('on')) {
          this.classList.replace('on', 'off');
          d[c] = d[c].filter((x) => x !== id);
        } else {
          this.classList.replace('off', 'on');
          d[c] = [...d[c], id];
        }
        await setWD(d);
        renderAll();
        renderWmList(c);
      }),
    );
}
async function openWidgetModal() {
  wmCat = CATS[0];
  document.querySelectorAll('#wmSidebar .msb').forEach((b) => b.classList.remove('active'));
  document.querySelector('#wmSidebar [data-c="home"]')!.classList.add('active');
  await renderWmList(wmCat);
  wm.classList.add('open');
}
document.querySelectorAll('#wmSidebar .msb').forEach((b) =>
  b.addEventListener('click', async function (this: HTMLElement) {
    wmCat = this.dataset.c as (typeof CATS)[number];
    document.querySelectorAll('#wmSidebar .msb').forEach((x) => x.classList.remove('active'));
    this.classList.add('active');
    renderWmList(wmCat);
  }),
);

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
  const s = r[SS] || DS;
  const wd: number[] = s.workDays ?? [1, 2, 3, 4, 5];
  const dhtml = ['一', '二', '三', '四', '五', '六', '日']
    .map((d, i) => {
      return `<label class="dc${wd.includes(i < 5 ? i + 1 : 0) ? ' active' : ''}" data-v="${i < 5 ? i + 1 : 0}"><span>${d}</span></label>`;
    })
    .join('');
  document.getElementById('settingsBody')!.innerHTML =
    `<div class="f"><label>午餐</label><input type="time" id="sLunch" value="${String(s.lunchHour).padStart(2, '0')}:${String(s.lunchMinute).padStart(2, '0')}"/></div><div class="f"><label>下班</label><input type="time" id="sEnd" value="${String(s.endHour).padStart(2, '0')}:${String(s.endMinute).padStart(2, '0')}"/></div><div class="f"><label>工作日</label><div style="display:flex;gap:5px" id="sDays">${dhtml}</div></div><button class="btn" id="sSave">保存</button><div id="sStatus" style="text-align:center;font-size:12px;padding:6px;display:none;color:var(--accent)"></div>`;
  document.querySelectorAll('#sDays .dc').forEach((el) =>
    el.addEventListener('click', function (this: HTMLElement) {
      this.classList.toggle('active');
    }),
  );
  document.getElementById('sSave')!.addEventListener('click', async () => {
    const [lh, lm] = (document.getElementById('sLunch') as HTMLInputElement).value
      .split(':')
      .map(Number);
    const [eh, em] = (document.getElementById('sEnd') as HTMLInputElement).value
      .split(':')
      .map(Number);
    if (isNaN(lh) || isNaN(lm) || isNaN(eh) || isNaN(em)) return;
    const wd: number[] = [];
    document
      .querySelectorAll('#sDays .dc.active')
      .forEach((el) => wd.push(Number((el as HTMLElement).dataset.v)));
    await chrome.storage.sync.set({
      [SS]: { lunchHour: lh, lunchMinute: lm, endHour: eh, endMinute: em, workDays: wd },
    });
    schedule = { lunchHour: lh, lunchMinute: lm, endHour: eh, endMinute: em, workDays: wd };
    updC();
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
    <div class="f" style="font-size:11px;color:var(--text-tertiary)">工作日 21.75 天/月，薪资按 09:00~下班计算</div>
    <button class="btn" id="sSalSave">保存</button>
    <div id="sSalStat" style="text-align:center;font-size:12px;padding:6px;display:none;color:var(--accent)"></div>`;
  document.getElementById('sSalSave')!.addEventListener('click', async () => {
    const inc = Number((document.getElementById('sSalInc') as HTMLInputElement).value);
    const d = Number((document.getElementById('sSalDay') as HTMLInputElement).value);
    if (inc < 1 || d < 1 || d > 31) return;
    salStt = { monthlyIncome: inc, payDay: d };
    await setSal(salStt);
    document.getElementById('sSalStat')!.textContent = '已保存';
    document.getElementById('sSalStat')!.style.display = 'block';
    setTimeout(() => (document.getElementById('sSalStat')!.style.display = 'none'), 2500);
  });
}

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    wm.classList.remove('open');
    sm.classList.remove('open');
    fm.classList.remove('open');
  }
});

function pad(n: number) {
  return String(n).padStart(2, '0');
}
function initClock() {
  const app = document.documentElement;
  const ts = localStorage.getItem('moyu_locked') === '1';
  if (ts) app.classList.add('locked');
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
const LUNAR_NY: Record<number, [number, number, number]> = {
  2025: [1, 29],
  2026: [2, 17],
  2027: [2, 6],
  2028: [1, 26],
};
const LUNAR_MD: Record<number, number[]> = {
  2025: [1, 0, 1, 0, 0, 0, 1, 0, 1, 0, 1, 1],
  2026: [0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 0],
  2027: [0, 1, 0, 1, 0, 1, 0, 0, 1, 0, 1, 1],
  2028: [0, 1, 0, 1, 0, 0, 1, 0, 1, 0, 1, 0],
};
function getLunar(
  y: number,
  m: number,
  d: number,
): { lm: number; ld: number; cM: string; cD: string } {
  const ny = LUNAR_NY[y];
  if (!ny) return { lm: 0, ld: 0, cM: '', cD: '' };
  const [nyM, nyD] = ny;
  const gDate = new Date(y, m - 1, d),
    nyDate = new Date(y, nyM - 1, nyD);
  let diff = Math.floor((gDate.getTime() - nyDate.getTime()) / 86400000);
  if (diff < 0) {
    const py = y - 1;
    const pny = LUNAR_NY[py];
    if (!pny) return { lm: 0, ld: 0, cM: '', cD: '' };
    const pnyDate = new Date(py, pny[0] - 1, pny[1]);
    diff = Math.floor((gDate.getTime() - pnyDate.getTime()) / 86400000);
    const pMD = LUNAR_MD[py] || [];
    let lm = 0,
      acc = 0;
    for (let i = 0; i < 12; i++) {
      const dc = 29 + (pMD[i] || 0);
      if (acc + dc > diff) {
        lm = i;
        break;
      }
      acc += dc;
    }
    const ld = diff - acc + 1;
    return { lm, ld, cM: LUNAR_MONTH[lm], cD: LUNAR_DAY[ld] };
  }
  const MD = LUNAR_MD[y] || [];
  let lm = 0,
    acc = 0;
  for (let i = 0; i < 12; i++) {
    const dc = 29 + (MD[i] || 0);
    if (acc + dc > diff) {
      lm = i;
      break;
    }
    acc += dc;
  }
  const ld = diff - acc + 1;
  return { lm, ld, cM: LUNAR_MONTH[lm], cD: LUNAR_DAY[ld] };
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
  qt.addEventListener('click', async () => {
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
function initFish() {
  loadM();
}

async function loadSal() {
  salStt = await getSal();
}
function tickSalary() {
  const amt = document.getElementById('salAmount'),
    det = document.getElementById('salDetail'),
    tag = document.getElementById('salTag'),
    pdp = document.getElementById('salPayDay');
  if (!amt || !det || !tag) return;
  const n = new Date();
  const wEnd = `${pad(schedule.endHour)}:${pad(schedule.endMinute)}`;
  const [eh, em] = wEnd.split(':').map(Number);
  const startDt = new Date(n.getFullYear(), n.getMonth(), n.getDate(), 9, 0, 0);
  const endDt = new Date(n.getFullYear(), n.getMonth(), n.getDate(), eh, em, 0);
  const workSec = Math.floor((endDt.getTime() - startDt.getTime()) / 1000);
  const wd = new Date().getDay();
  if (workSec <= 0 || !schedule.workDays.includes(wd)) {
    amt.textContent = '0.00';
    det.textContent = '非工作时间';
    tag.textContent = '休息';
    tag.style.background = 'rgba(0,0,0,0.04)';
    tag.style.color = 'var(--text-tertiary)';
  } else {
    const now = n.getTime();
    if (now < startDt.getTime()) {
      amt.textContent = '0.00';
      det.textContent = '待开工';
      tag.textContent = '待开工';
      tag.style.background = 'rgba(0,0,0,0.04)';
      tag.style.color = 'var(--text-tertiary)';
    } else if (now > endDt.getTime()) {
      const full = salStt.monthlyIncome / WDPM;
      amt.textContent = full.toFixed(2);
      det.textContent = '今天已赚满';
      tag.textContent = '下班';
      tag.style.background = 'rgba(0,0,0,0.04)';
      tag.style.color = 'var(--text-tertiary)';
    } else {
      const rate = salStt.monthlyIncome / WDPM / workSec,
        elapsed = Math.floor((now - startDt.getTime()) / 1000),
        acc = rate * elapsed;
      const h = Math.floor(elapsed / 3600),
        m = Math.floor((elapsed % 3600) / 60);
      amt.textContent = acc.toFixed(2);
      det.textContent = `每秒 ${rate.toFixed(6)} 元 · 已工作 ${h}h${m}m`;
      tag.textContent = '工作中';
      tag.style.background = 'var(--glass-accent)';
      tag.style.color = 'var(--accent)';
    }
  }
  if (pdp) {
    const y = n.getFullYear(),
      m = n.getMonth(),
      d = n.getDate();
    let next = new Date(y, m, salStt.payDay);
    if (d >= salStt.payDay) next = new Date(y, m + 1, salStt.payDay);
    const diff = Math.ceil((next.getTime() - new Date(y, m, d).getTime()) / 86400000);
    pdp.textContent =
      diff === 0
        ? '今天发薪日  '
        : '距离发薪 · ' +
          diff +
          ' 天 · ' +
          pad(next.getMonth() + 1) +
          '月' +
          pad(salStt.payDay) +
          '日';
  }
}
function initSalary() {
  loadSal();
  tickSalary();
}

let schedule: Sch = { ...DS };
async function loadSch() {
  const r = await chrome.storage.sync.get(SS);
  if (r[SS]) schedule = { ...DS, ...r[SS] };
  updC();
}
function th(h: number, m: number) {
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d;
}
function fd(ms: number) {
  const tm = Math.round(ms / 60000),
    h = Math.floor(tm / 60),
    min = tm % 60;
  return h > 0 ? `${h}h ${min}min` : `${min}min`;
}
function updC() {
  const n = new Date(),
    t = n.getDay();
  if (!schedule.workDays.includes(t)) {
    sbCd.textContent = '今天休息';
    return;
  }
  const lt = th(schedule.lunchHour, schedule.lunchMinute),
    et = th(schedule.endHour, schedule.endMinute);
  if (n >= et) {
    sbCd.textContent = '已下班 · 明天再来';
    return;
  }
  if (n < lt) {
    sbCd.textContent = `午餐 ${pad(schedule.lunchHour)}:${pad(schedule.lunchMinute)} · ${fd(lt.getTime() - n.getTime())} 后`;
    return;
  }
  sbCd.textContent = `下班 ${pad(schedule.endHour)}:${pad(schedule.endMinute)} · ${fd(et.getTime() - n.getTime())} 后`;
}

// ── Wallpaper ──
const WP_KEY = 'moyu_wallpaper';
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

async function openWallpaperModal() {
  const current = localStorage.getItem(WP_KEY) || '';
  let html = '<div class="wp-grid">';
  try {
    const res = await fetch('https://peapix.com/bing/feed?format=json');
    const data = await res.json();
    data.forEach((img: any) => {
      html += `<div class="wp-item${img.imageUrl === current ? ' active' : ''}" data-url="${img.imageUrl}" style="background-image:url(${img.thumbUrl})" title="${img.title}"></div>`;
    });
  } catch (e) {}
  html += '</div>';
  document.getElementById('wpBody')!.innerHTML = html;
  wpModal.classList.add('open');
  document.querySelectorAll('.wp-item').forEach((el) =>
    el.addEventListener('click', function (this: HTMLElement) {
      const url = this.dataset.url!;
      localStorage.setItem(WP_KEY, url);
      document.body.style.backgroundImage = `url(${url})`;
      document.querySelectorAll('.wp-item').forEach((e) => e.classList.remove('active'));
      this.classList.add('active');
    }),
  );
}
function loadWallpaper() {
  const url = localStorage.getItem(WP_KEY);
  if (url) document.body.style.backgroundImage = `url(${url})`;
}

async function init() {
  loadWallpaper();
  await loadSch();
  await loadM();
  await loadSal();
  renderAll();
  setInterval(() => {
    updT();
    updC();
    tickSalary();
  }, 1000);
}
init();
