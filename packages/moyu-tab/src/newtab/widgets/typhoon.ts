/** 顶部台风气泡：拉取当前活跃台风摘要，点击展开官方路径图（iframe 内嵌浙江水利厅台风网） */
const TY_KEY = 'moyu_typhoon_cache';
const TY_URL = 'https://typhoon.slt.zj.gov.cn/';

interface ActiveTyphoon {
  tfid: string;
  name: string;
  enname?: string;
  strong: string; // 超强台风 / 强台风 / 台风 ...
  power: string; // 风力等级 "17"
  speed: string; // 中心附近最大风速 m/s "60"
  pressure: string; // 中心最低气压 hPa "920"
  lat: string;
  lng: string;
  movedirection: string; // 西北西
  movespeed: string; // 移速 km/h "21"
  warnlevel?: string | null; // white/blue/yellow/orange/red
  timeformate: string; // "7月29日20时"
}
interface TyCache {
  items: ActiveTyphoon[];
  ts: number;
}

let tyLoading = false;
let tyInited = false;
let tyLastFetch = 0;

function loadTy(): TyCache | null {
  try {
    const r = localStorage.getItem(TY_KEY);
    return r ? (JSON.parse(r) as TyCache) : null;
  } catch {
    return null;
  }
}
function saveTy(c: TyCache) {
  try {
    localStorage.setItem(TY_KEY, JSON.stringify(c));
  } catch {}
}

/** 预警等级 -> 颜色（蓝<黄<橙<红）；活跃台风缺省醒目红 */
function warnColor(level?: string | null): string {
  switch ((level || '').toLowerCase()) {
    case 'red':
      return '#dc2626';
    case 'orange':
      return '#f97316';
    case 'yellow':
      return '#eab308';
    case 'blue':
      return '#3b82f6';
    default:
      return '#dc2626';
  }
}

function renderTy(error: boolean) {
  const btn = document.getElementById('headerTyphoon');
  const txt = document.getElementById('typhoonText');
  if (!btn || !txt) return;
  const c = loadTy();
  const items = c?.items ?? [];
  if (!items.length) {
    btn.classList.remove('active');
    btn.classList.add('dim');
    (btn as HTMLElement).style.color = '';
    // 首次拉取前显示加载中，避免「暂无台风」误闪；拉取过且确实为空才判定无台风
    txt.textContent = error ? '获取失败' : tyLastFetch === 0 ? '加载中…' : '暂无台风';
    btn.setAttribute(
      'title',
      error ? '点击重试' : tyLastFetch === 0 ? '正在获取台风信息…' : '当前无活跃台风 · 点击查看台风网',
    );
    return;
  }
  btn.classList.add('active');
  btn.classList.remove('dim');
  const t = items[0];
  const more = items.length > 1 ? ` +${items.length - 1}` : '';
  txt.textContent = `${t.name} ${t.strong}${more}`;
  const detail =
    `${t.strong} ${t.name}（${t.enname || ''}）· ${t.power}级 ${t.speed}m/s · ${t.pressure}hPa · ` +
    `${t.lat}N ${t.lng}E · ${t.movedirection} ${t.movespeed}km/h · ${t.timeformate}` +
    (more ? `（共 ${items.length} 个）` : '');
  btn.setAttribute('title', detail);
  (btn as HTMLElement).style.color = warnColor(t.warnlevel);
}

export async function refreshTyphoon() {
  if (tyLoading) return;
  if (!document.getElementById('headerTyphoon')) return;
  tyLoading = true;
  try {
    const res = (await chrome.runtime.sendMessage({ type: 'TYPHOON_FETCH' })) as
      | { success: boolean; data?: ActiveTyphoon[]; error?: string }
      | undefined;
    if (res?.success && Array.isArray(res.data)) {
      saveTy({ items: res.data, ts: Date.now() });
      tyLastFetch = Date.now();
      renderTy(false);
    } else {
      renderTy(true);
    }
  } catch {
    renderTy(true);
  } finally {
    tyLoading = false;
  }
}

function onTyVis() {
  if (document.visibilityState !== 'visible') return;
  if (Date.now() - tyLastFetch > 600000) refreshTyphoon();
}

function openTyphoonModal() {
  const modal = document.getElementById('typhoonModal');
  const frame = document.getElementById('typhoonFrame') as HTMLIFrameElement | null;
  if (!modal) return;
  if (frame && !frame.src) frame.src = TY_URL;
  modal.classList.add('open');
}
function closeTyphoonModal() {
  const modal = document.getElementById('typhoonModal');
  if (!modal) return;
  modal.classList.remove('open');
  modal.classList.remove('fs'); // 关闭时退出全屏，下次打开恢复默认尺寸
  syncFsBtn(false);
}
const FS_EXPAND =
  '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3"/><path d="M21 8V5a2 2 0 0 0-2-2h-3"/><path d="M3 16v3a2 2 0 0 0 2 2h3"/><path d="M16 21h3a2 2 0 0 0 2-2v-3"/></svg>';
const FS_COLLAPSE =
  '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3v3a2 2 0 0 1-2 2H3"/><path d="M21 8h-3a2 2 0 0 1-2-2V3"/><path d="M3 16h3a2 2 0 0 1 2 2v3"/><path d="M16 21v-3a2 2 0 0 1 2-2h3"/></svg>';
function syncFsBtn(fs: boolean) {
  const btn = document.getElementById('typhoonFsBtn');
  if (!btn) return;
  btn.innerHTML = fs ? FS_COLLAPSE : FS_EXPAND;
  btn.setAttribute('title', fs ? '退出全屏' : '全屏');
}
function toggleFs() {
  const modal = document.getElementById('typhoonModal');
  if (!modal) return;
  const fs = modal.classList.toggle('fs');
  syncFsBtn(fs);
}

export async function initTyphoon() {
  renderTy(false);
  document.getElementById('headerTyphoon')?.addEventListener('click', openTyphoonModal);
  document.getElementById('typhoonFsBtn')?.addEventListener('click', toggleFs);
  document.getElementById('typhoonModalClose')?.addEventListener('click', closeTyphoonModal);
  document.getElementById('typhoonModal')?.addEventListener('click', (e) => {
    if (e.target === document.getElementById('typhoonModal')) closeTyphoonModal();
  });
  if (tyInited) return;
  tyInited = true;
  refreshTyphoon();
  setInterval(refreshTyphoon, 600000); // 10 分钟（台风 3-6 小时才更新一次）
  document.addEventListener('visibilitychange', onTyVis);
}
