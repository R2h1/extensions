/**
 * 闲页 — Background Service Worker
 *
 * 管理番茄钟持久化状态、alarms 定时检查、通知发送。
 */

import { initSiteTracker, getSiteRankings } from './site-tracker';

// ─── Types ──────────────────────────────────────────────

interface PomodoroState {
  status: 'idle' | 'focus' | 'break' | 'focus-paused' | 'break-paused';
  phaseStartTime: number | null;
  focusDuration: number;
  breakDuration: number;
  sessionCount: number;
  remainingSeconds: number;
}

interface PomodoroMessage {
  type: 'POM_GET_STATE' | 'POM_START' | 'POM_PAUSE' | 'POM_RESUME' | 'POM_RESET' | 'POM_SETTINGS';
  payload?: Partial<PomodoroState>;
}

interface PomodoroResponse {
  success: boolean;
  state: PomodoroState;
}

// ─── Storage ────────────────────────────────────────────

const STORAGE_KEY = 'moyu_pomodoro';
const ALARM_TICK = 'pomodoro_tick';
const ALARM_COMPLETE = 'pomodoro_complete';

const DEFAULT_STATE: PomodoroState = {
  status: 'idle',
  phaseStartTime: null,
  focusDuration: 25,
  breakDuration: 5,
  sessionCount: 0,
  remainingSeconds: 0,
};

let cachedState: PomodoroState = { ...DEFAULT_STATE };

async function loadState(): Promise<PomodoroState> {
  const result = await chrome.storage.local.get(STORAGE_KEY);
  if (result[STORAGE_KEY]) {
    cachedState = { ...DEFAULT_STATE, ...result[STORAGE_KEY] };
  }
  return cachedState;
}

async function saveState() {
  await chrome.storage.local.set({ [STORAGE_KEY]: cachedState });
}

// ─── Alarm ──────────────────────────────────────────────

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === ALARM_TICK) {
    await tickCheck();
  } else if (alarm.name === ALARM_COMPLETE) {
    await onPhaseComplete();
  }
});

/** 每分钟检查一次：当前阶段是否已完成 */
async function tickCheck() {
  await loadState();
  if (cachedState.status !== 'focus' && cachedState.status !== 'break') return;

  const now = Date.now();
  const elapsed = now - (cachedState.phaseStartTime ?? now);
  const totalDurationMs =
    cachedState.status === 'focus'
      ? cachedState.focusDuration * 60 * 1000
      : cachedState.breakDuration * 60 * 1000;

  if (elapsed >= totalDurationMs) {
    await onPhaseComplete();
  } else {
    await saveState();
  }
}

/** 阶段完成：切换状态 + 发通知 */
async function onPhaseComplete() {
  const wasFocus = cachedState.status === 'focus';

  if (wasFocus) {
    cachedState.sessionCount++;
    cachedState.status = 'break';
    cachedState.phaseStartTime = Date.now();
    cachedState.remainingSeconds = 0;
    await saveState();

    await showNotification('🍅 专注完成！', `休息 ${cachedState.breakDuration} 分钟吧 ☕`);
    const breakMs = cachedState.breakDuration * 60 * 1000;
    chrome.alarms.create(ALARM_COMPLETE, { delayInMinutes: breakMs / 60000 });
  } else {
    cachedState.status = 'idle';
    cachedState.phaseStartTime = null;
    cachedState.remainingSeconds = 0;
    await saveState();

    await showNotification('☕ 休息结束！', '开始新一轮专注吧 💪');
    chrome.alarms.clear(ALARM_COMPLETE);
  }
}

async function showNotification(title: string, message: string) {
  try {
    await chrome.notifications.create({
      type: 'basic',
      iconUrl:
        'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🍅</text></svg>',
      title,
      message,
      priority: 2,
    });
  } catch {
    // 静默失败
  }
}

// ─── Fund Estimate ─────────────────────────────────────

interface FundQuote {
  name: string;
  dwjz: string;
  gsz: string;
  gszzl: string;
  gztime: string;
}
interface FundResponse {
  success: boolean;
  data?: Record<string, FundQuote | null>;
  error?: string;
}

/** fundgz 实时估值（A 股基金盘中估算）。返回 jsonpgz({...}); 格式，正则提取后解析。QDII 等无实时估值的基金返回 null。 */
async function fetchFundgz(code: string): Promise<FundQuote | null> {
  const ctrl = new AbortController();
  const to = setTimeout(() => ctrl.abort(), 12000);
  try {
    const res = await fetch(`https://fundgz.1234567.com.cn/js/${code}.js`, {
      cache: 'no-store',
      signal: ctrl.signal,
    });
    if (!res.ok) return null;
    const text = await res.text();
    const m = text.match(/jsonpgz\((.*)\)/);
    if (!m) return null;
    const obj = JSON.parse(m[1]);
    if (!obj?.fundcode) return null;
    return {
      name: String(obj.name ?? ''),
      dwjz: String(obj.dwjz ?? ''),
      gsz: String(obj.gsz ?? ''),
      gszzl: String(obj.gszzl ?? ''),
      gztime: String(obj.gztime ?? ''),
    };
  } catch {
    return null;
  } finally {
    clearTimeout(to);
  }
}

/** pingzhongdata 最新净值（兜底：QDII / 新基金等 fundgz 无实时估值时）。fS_name=名称，Data_netWorthTrend 末条=最新净值（y=净值 equityReturn=涨跌幅 x=日期）。接口不校验 Referer。 */
async function fetchFundDetail(code: string): Promise<FundQuote | null> {
  const ctrl = new AbortController();
  const to = setTimeout(() => ctrl.abort(), 12000);
  try {
    const res = await fetch(`https://fund.eastmoney.com/pingzhongdata/${code}.js`, {
      cache: 'no-store',
      signal: ctrl.signal,
    });
    if (!res.ok) return null;
    const text = await res.text();
    const nameM = text.match(/fS_name\s*=\s*"([^"]*)"/);
    const nwM = text.match(/Data_netWorthTrend\s*=\s*(\[[\s\S]*?\]);/);
    if (!nwM) return null;
    const arr = JSON.parse(nwM[1]) as { x?: number; y?: number; equityReturn?: number }[];
    const last = arr[arr.length - 1];
    if (!last || last.y == null) return null;
    const gztime = last.x ? new Date(last.x).toISOString().slice(0, 10) : '';
    return {
      name: nameM?.[1] ?? '',
      dwjz: String(last.y),
      gsz: String(last.y),
      gszzl: String(last.equityReturn ?? ''),
      gztime,
    };
  } catch {
    return null;
  } finally {
    clearTimeout(to);
  }
}

/** 抓取单只基金：先 fundgz 实时估值，拿不到（QDII 等）回退 pingzhongdata 最新净值。 */
async function fetchOneFund(code: string): Promise<FundQuote | null> {
  const gz = await fetchFundgz(code);
  if (gz && gz.gsz) return gz;
  return fetchFundDetail(code);
}

async function handleFundFetch(codes: string[]): Promise<FundResponse> {
  const data: Record<string, FundQuote | null> = {};
  await Promise.all(
    codes.map(async (c) => {
      data[c] = await fetchOneFund(c);
    }),
  );
  return { success: true, data };
}

// ─── A股 / 个股行情（东财 qt/stock/get）───────────────

interface StockQuote {
  name: string;
  current: number;
  prevClose: number;
  change: number;
  changePct: number;
}
interface StockResponse {
  success: boolean;
  data?: Record<string, StockQuote | null>;
  error?: string;
}

/** 代码 -> 东财 secid：sh->1. sz/bj->0. */
function toEastSecid(code: string): string {
  const m = code.match(/^([a-z]+)(\w+)$/i);
  if (!m) return code;
  const p = m[1].toLowerCase();
  const rest = m[2];
  if (p === 'sh') return '1.' + rest;
  if (p === 'sz' || p === 'bj') return '0.' + rest;
  return code;
}

/** A股/全球指数/个股批量（东财 ulist.np，单请求拿全部 secid，规避逐只并发触发 IP 限流）。fltt=2=实际小数价；字段 f2=现价 f3=涨跌幅% f4=涨跌额 f14=名称 f18=昨收。 */
async function handleStockFetch(codes: string[]): Promise<StockResponse> {
  if (!codes.length) return { success: true, data: {} };
  const secidToCode = new Map<string, string>();
  const secids = codes.map((c) => {
    const secid = toEastSecid(c);
    secidToCode.set(secid, c);
    return secid;
  });
  const ctrl = new AbortController();
  const to = setTimeout(() => ctrl.abort(), 12000);
  try {
    const res = await fetch(
      `https://push2.eastmoney.com/api/qt/ulist.np/get?secids=${secids.join(',')}&fields=f12,f13,f2,f3,f4,f14,f18&fltt=2`,
      { cache: 'no-store', signal: ctrl.signal },
    );
    if (!res.ok) return { success: false, error: 'HTTP ' + res.status };
    const j = await res.json();
    const diff = (j?.data?.diff ?? []) as Record<string, unknown>[];
    const data: Record<string, StockQuote | null> = {};
    for (const d of diff) {
      const secid = d.f13 + '.' + d.f12;
      const code = secidToCode.get(secid);
      if (!code) continue;
      const current = Number(d.f2);
      if (isNaN(current)) {
        data[code] = null;
        continue;
      }
      const prevClose = Number(d.f18);
      const change = Number(d.f4);
      const changePct = Number(d.f3);
      data[code] = {
        name: String(d.f14 ?? ''),
        current,
        prevClose: isNaN(prevClose) ? 0 : prevClose,
        change: isNaN(change) ? 0 : change,
        changePct: isNaN(changePct) ? 0 : changePct,
      };
    }
    for (const c of codes) if (!(c in data)) data[c] = null;
    return { success: true, data };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : String(e) };
  } finally {
    clearTimeout(to);
  }
}

// ─── Sector Ranking (东财 行业板块) ───────────────────

interface SectorQuote {
  name: string;
  changePct: number;
  price: number;
  leader: string;
  leaderPrice: number;
}
interface SectorResponse {
  success: boolean;
  data?: SectorQuote[];
  error?: string;
}

/** 抓取行业板块涨跌幅排行（东财 clist，fs=m:90+t:2，按 f3 降序 Top 12）。f14=板块名 f3=涨跌幅 f128=领涨股 f140=领涨股价。 */
async function handleSectorFetch(): Promise<SectorResponse> {
  const ctrl = new AbortController();
  const to = setTimeout(() => ctrl.abort(), 12000);
  try {
    const url =
      'https://push2.eastmoney.com/api/qt/clist/get?pn=1&pz=12&po=1&np=1&fltt=2&invt=2&fid=f3&fs=m:90+t:2&fields=f2,f3,f12,f14,f128,f140';
    const res = await fetch(url, { cache: 'no-store', signal: ctrl.signal });
    if (!res.ok) return { success: false, error: 'HTTP ' + res.status };
    const j = await res.json();
    const arr = (j?.data?.diff ?? []) as unknown[];
    const items: SectorQuote[] = arr
      .map((x) => {
        const d = x as Record<string, unknown>;
        return {
          name: String(d.f14 ?? ''),
          changePct: Number(d.f3 ?? 0),
          price: Number(d.f2 ?? 0),
          leader: String(d.f128 ?? ''),
          leaderPrice: Number(d.f140 ?? 0),
        };
      })
      .filter((x) => x.name);
    if (!items.length) return { success: false, error: 'empty' };
    return { success: true, data: items };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : String(e) };
  } finally {
    clearTimeout(to);
  }
}

// ─── Hot Search (微博 / B站 / 百度) ─────────────────────

interface HotItem {
  title: string;
  hot: string;
  url: string;
  tag?: string;
}
interface HotResponse {
  success: boolean;
  data?: HotItem[];
  error?: string;
}

/** 微博热搜：weibo.com 接口需 Referer，由 DNR 静态规则注入（fetch 无法设 Referer 头）。 */
async function fetchWeiboHot(): Promise<HotItem[]> {
  const res = await fetch('https://weibo.com/ajax/side/hotSearch', {
    cache: 'no-store',
  });
  if (!res.ok) throw new Error('HTTP ' + res.status);
  const j = await res.json();
  const arr = (j?.data?.realtime ?? []) as any[];
  return arr.slice(0, 30).map((r) => ({
    title: String(r.word || r.note || ''),
    hot: r.num ? String(r.num) : '',
    url: `https://s.weibo.com/weibo?q=${encodeURIComponent(r.word_scheme || r.word || '')}`,
    tag: r.label_name ? String(r.label_name) : '',
  }));
}

/** B站热搜：search/square 接口无需鉴权。 */
async function fetchBilibiliHot(): Promise<HotItem[]> {
  const res = await fetch('https://api.bilibili.com/x/web-interface/wbi/search/square?limit=30', {
    cache: 'no-store',
  });
  if (!res.ok) throw new Error('HTTP ' + res.status);
  const j = await res.json();
  const arr = (j?.data?.trending?.list ?? []) as any[];
  return arr.slice(0, 30).map((r) => ({
    title: String(r.keyword || r.show_name || ''),
    hot: '',
    url: `https://search.bilibili.com/all?keyword=${encodeURIComponent(r.keyword || '')}`,
  }));
}

/** 百度热搜：board 接口无需鉴权。 */
async function fetchBaiduHot(): Promise<HotItem[]> {
  const res = await fetch('https://top.baidu.com/api/board?platform=wise', { cache: 'no-store' });
  if (!res.ok) throw new Error('HTTP ' + res.status);
  const j = await res.json();
  const arr = (j?.data?.cards?.[0]?.content?.[0]?.content ?? []) as any[];
  return arr.slice(0, 30).map((r) => ({
    title: String(r.word || ''),
    hot: r.hotScore ? String(r.hotScore) : '',
    url: String(r.url || `https://www.baidu.com/s?wd=${encodeURIComponent(r.word || '')}`),
    tag: r.isTop ? '置顶' : '',
  }));
}

async function handleHotFetch(platform: string): Promise<HotResponse> {
  try {
    let items: HotItem[];
    if (platform === 'bilibili') items = await fetchBilibiliHot();
    else if (platform === 'baidu') items = await fetchBaiduHot();
    else items = await fetchWeiboHot();
    if (!items.length) return { success: false, error: 'empty' };
    return { success: true, data: items };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : String(e) };
  }
}

// ─── Holiday (节假日) ─────────────────────────────────

interface HolidayBlock {
  name: string;
  date: string; // YYYY-MM-DD
}
interface HolidayResponse {
  success: boolean;
  data?: { list: HolidayBlock[] };
  error?: string;
}

const HOL_DAY = 86400000;

/** 解析 timor.tech 年度数据：把连续的 holiday:true 日期合并成假期块，取首日名称与日期。 */
function parseYearHolidays(map: Record<string, unknown>): HolidayBlock[] {
  const blocks: HolidayBlock[] = [];
  let prevTs: number | null = null;
  let curName = '';
  let curDate = '';
  const flush = () => {
    if (curDate) blocks.push({ name: curName, date: curDate });
    curName = '';
    curDate = '';
  };
  for (const k of Object.keys(map).sort()) {
    const e = map[k] as { holiday?: boolean; name?: string; date?: string } | undefined;
    if (!e || e.holiday !== true || !e.date) {
      flush();
      prevTs = null;
      continue;
    }
    const [y, m, d] = e.date.split('-').map(Number);
    const ts = new Date(y, m - 1, d).getTime();
    if (curDate && prevTs !== null && ts - prevTs === HOL_DAY) {
      // 同一假期块的延续日，保留首日
      prevTs = ts;
    } else {
      flush();
      curName = String(e.name || '');
      curDate = e.date;
      prevTs = ts;
    }
  }
  flush();
  return blocks;
}

/** 抓取指定年份的法定假日块。timor.tech 由 Cloudflare 按 UA 放行，SW fetch 自带浏览器 UA。 */
async function fetchYearHolidays(year: number): Promise<HolidayBlock[]> {
  const ctrl = new AbortController();
  const to = setTimeout(() => ctrl.abort(), 12000);
  try {
    const res = await fetch(`https://timor.tech/api/holiday/year/${year}`, {
      cache: 'no-store',
      signal: ctrl.signal,
    });
    if (!res.ok) return [];
    const j = (await res.json()) as { code?: number; holiday?: Record<string, unknown> };
    if (j?.code !== 0 || !j.holiday) return [];
    return parseYearHolidays(j.holiday);
  } catch {
    return [];
  } finally {
    clearTimeout(to);
  }
}

/** 抓取本年+次年全部假期块，前端按今日过滤并计算倒计时。 */
async function handleHolidayFetch(): Promise<HolidayResponse> {
  try {
    const y = new Date().getFullYear();
    const [cur, nxt] = await Promise.all([fetchYearHolidays(y), fetchYearHolidays(y + 1)]);
    const list = [...cur, ...nxt].sort((a, b) => (a.date < b.date ? -1 : 1));
    return { success: true, data: { list } };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : String(e) };
  }
}

// ─── Juejin Hot (掘金热榜) ───────────────────────────

interface JuejinItem {
  title: string;
  url: string;
  hot: string;
}
interface JuejinResponse {
  success: boolean;
  data?: JuejinItem[];
  error?: string;
}

/** 掘金热榜：recommend_all_feed + sort_type:7（3 天内热门）。POST + JSON body。 */
async function handleJuejinFetch(): Promise<JuejinResponse> {
  const ctrl = new AbortController();
  const to = setTimeout(() => ctrl.abort(), 12000);
  try {
    const res = await fetch('https://api.juejin.cn/recommend_api/v1/article/recommend_all_feed', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cursor: '0',
        limit: 30,
        sort_type: 7,
        id_type: 42,
        client_type: 2608,
      }),
      cache: 'no-store',
      signal: ctrl.signal,
    });
    if (!res.ok) return { success: false, error: 'HTTP ' + res.status };
    const j = await res.json();
    const arr = (j?.data ?? []) as unknown[];
    const items: JuejinItem[] = arr
      .map(
        (x) =>
          x as {
            item_type?: number;
            item_info?: {
              article_info?: { article_id?: string; title?: string; digg_count?: number };
              article_counters?: { digg_count?: number };
            };
          },
      )
      .filter((x) => x?.item_type === 2 && x?.item_info?.article_info)
      .map((x) => {
        const a = x.item_info!.article_info!;
        const aid = String(a.article_id || '');
        const digg = x.item_info!.article_counters?.digg_count ?? a.digg_count ?? 0;
        return {
          title: String(a.title || ''),
          url: `https://juejin.cn/post/${aid}`,
          hot: digg ? String(digg) : '',
        };
      });
    if (!items.length) return { success: false, error: 'empty' };
    return { success: true, data: items };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : String(e) };
  } finally {
    clearTimeout(to);
  }
}

// ─── Zhihu Daily (知乎日报) ───────────────────────────

interface ZhihuItem {
  title: string;
  url: string;
  image?: string;
  hint?: string;
}
interface ZhihuResponse {
  success: boolean;
  data?: { date: string; list: ZhihuItem[] };
  error?: string;
}

/** 知乎日报：每日精选，带封面图。 */
async function handleZhihuFetch(): Promise<ZhihuResponse> {
  const ctrl = new AbortController();
  const to = setTimeout(() => ctrl.abort(), 12000);
  try {
    const res = await fetch('https://news-at.zhihu.com/api/4/news/latest', {
      cache: 'no-store',
      signal: ctrl.signal,
    });
    if (!res.ok) return { success: false, error: 'HTTP ' + res.status };
    const j = await res.json();
    const stories = (j?.stories ?? []) as unknown[];
    const list: ZhihuItem[] = stories.map((s) => {
      const x = s as {
        title?: string;
        url?: string;
        id?: number;
        images?: string[];
        hint?: string;
      };
      return {
        title: String(x.title || ''),
        url: String(x.url || (x.id ? `https://daily.zhihu.com/story/${x.id}` : '')),
        image: Array.isArray(x.images) && x.images[0] ? String(x.images[0]) : '',
        hint: String(x.hint || ''),
      };
    });
    if (!list.length) return { success: false, error: 'empty' };
    return { success: true, data: { date: String(j.date || ''), list } };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : String(e) };
  } finally {
    clearTimeout(to);
  }
}

// ─── Sina 7x24 Finance Flash (新浪财经快讯) ──────────

interface SinaFlashItem {
  text: string;
  time: string;
  url?: string;
}
interface SinaFlashResponse {
  success: boolean;
  data?: SinaFlashItem[];
  error?: string;
}

function stripHtml(s: string): string {
  return s
    .replace(/<[^>]*>/g, '')
    .replace(/&[a-z#0-9]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** 新浪 7x24 财经快讯：实时滚动流，无需 Referer。 */
async function handleSinaFlashFetch(): Promise<SinaFlashResponse> {
  const ctrl = new AbortController();
  const to = setTimeout(() => ctrl.abort(), 12000);
  try {
    const res = await fetch(
      'https://zhibo.sina.com.cn/api/zhibo/feed?page=1&page_size=40&zhibo_id=152&tag_id=0&type=0',
      { cache: 'no-store', signal: ctrl.signal },
    );
    if (!res.ok) return { success: false, error: 'HTTP ' + res.status };
    const j = await res.json();
    const arr = (j?.result?.data?.feed?.list ?? []) as unknown[];
    const items: SinaFlashItem[] = arr
      .map((x) => {
        const it = x as {
          rich_text?: string;
          create_time?: string;
          update_time?: string;
          docurl?: string;
        };
        const t = String(it.create_time || it.update_time || '');
        return {
          text: stripHtml(String(it.rich_text || '')),
          time: t.length >= 16 ? t.slice(11, 16) : '',
          url: it.docurl ? String(it.docurl) : '',
        };
      })
      .filter((x) => x.text);
    if (!items.length) return { success: false, error: 'empty' };
    return { success: true, data: items };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : String(e) };
  } finally {
    clearTimeout(to);
  }
}

// ─── Typhoon Activity (浙江水利厅台风网实时活跃台风) ────

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
  radius7?: string; // 七级风圈半径
  radius10?: string; // 十级风圈半径
  warnlevel?: string | null; // white/blue/yellow/orange/red
  timeformate: string; // "7月29日20时"
}
interface TyphoonActivityResponse {
  success: boolean;
  data?: ActiveTyphoon[];
  error?: string;
}

/** 浙江水利厅台风网 /Api/TyhoonActivity：当前活跃台风实时位置（官方接口名少一个 r，照抄）。无需 Referer。 */
async function handleTyphoonActivityFetch(): Promise<TyphoonActivityResponse> {
  const ctrl = new AbortController();
  const to = setTimeout(() => ctrl.abort(), 12000);
  try {
    const res = await fetch('https://typhoon.slt.zj.gov.cn/Api/TyhoonActivity', {
      cache: 'no-store',
      signal: ctrl.signal,
    });
    if (!res.ok) return { success: false, error: 'HTTP ' + res.status };
    const j = await res.json();
    const arr = (Array.isArray(j) ? j : []) as ActiveTyphoon[];
    return { success: true, data: arr };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : String(e) };
  } finally {
    clearTimeout(to);
  }
}

// ─── Message Router ─────────────────────────────────────

// ─── Weread Shelf (微信读书书架) ────────────────────────

/** bookId 是 hex（reader ID）则拼阅读器页，数字则拼详情页；接口 deepLink 缺失时兜底。 */
function wereadBookUrl(bookId: string): string {
  if (!bookId) return '';
  if (/^[0-9a-fA-F]{20,}$/.test(bookId)) return 'https://weread.qq.com/web/reader/' + bookId;
  return 'https://weread.qq.com/#book/' + bookId;
}

interface WereadShelfBook {
  bid: string;
  title: string;
  author: string;
  cover: string;
  category: string;
  deepLink: string;
  readUpdateTime: number;
  finished: boolean;
  isTop: boolean;
}
interface WereadShelfResponse {
  success: boolean;
  data?: { books: WereadShelfBook[]; total: number };
  error?: string;
}

/** 微信读书书架：经 Agent API Gateway 调 /shelf/sync，需用户 API Key（wrk-）。books[].deepLink 直达阅读。 */
async function handleWereadShelfFetch(apiKey: string): Promise<WereadShelfResponse> {
  if (!apiKey) return { success: false, error: 'no_key' };
  const ctrl = new AbortController();
  const to = setTimeout(() => ctrl.abort(), 12000);
  try {
    const res = await fetch('https://i.weread.qq.com/api/agent/gateway', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ api_name: '/shelf/sync', skill_version: '1.0.4' }),
      cache: 'no-store',
      signal: ctrl.signal,
    });
    if (res.status === 401) return { success: false, error: 'invalid_key' };
    if (!res.ok) return { success: false, error: 'HTTP ' + res.status };
    const j = await res.json();
    if (j?.errcode && j.errcode !== 0)
      return { success: false, error: String(j.errmsg || j.errcode) };
    const books = (j?.books ?? []) as unknown[];
    const albums = (j?.albums ?? []) as unknown[];
    const total = books.length + albums.length + (j?.mp ? 1 : 0);
    const parsed: WereadShelfBook[] = books
      .map((it) => {
        const b = it as Record<string, unknown>;
        return {
          bid: String(b.bookId ?? ''),
          title: String(b.title ?? ''),
          author: String(b.author ?? ''),
          cover: String(b.cover ?? ''),
          category: String(b.category ?? ''),
          deepLink: String(b.deepLink ?? '') || wereadBookUrl(String(b.bookId ?? '')),
          readUpdateTime: Number(b.readUpdateTime ?? 0),
          finished: b.finishReading === 1,
          isTop: b.isTop === 1,
        };
      })
      .filter((b) => b.bid && b.title);
    if (!parsed.length) return { success: false, error: 'empty' };
    return { success: true, data: { books: parsed, total } };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : String(e) };
  } finally {
    clearTimeout(to);
  }
}

// ─── Weread Readdata (阅读统计) ────────────────────────

interface WereadReaddata {
  totalReadTime: number;
  readDays: number;
  dayAverageReadTime: number;
  longest: { title: string; author: string; readTime: number; deepLink: string }[];
  categories: string[];
  categoryWord?: string;
  timeWord?: string;
}
interface WereadReaddataResponse {
  success: boolean;
  data?: WereadReaddata;
  error?: string;
}

/** 微信读书阅读统计：/readdata/detail mode=monthly，需 API Key。时长字段单位为秒。 */
async function handleWereadReaddataFetch(apiKey: string): Promise<WereadReaddataResponse> {
  if (!apiKey) return { success: false, error: 'no_key' };
  const ctrl = new AbortController();
  const to = setTimeout(() => ctrl.abort(), 12000);
  try {
    const res = await fetch('https://i.weread.qq.com/api/agent/gateway', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_name: '/readdata/detail',
        mode: 'monthly',
        skill_version: '1.0.4',
      }),
      cache: 'no-store',
      signal: ctrl.signal,
    });
    if (res.status === 401) return { success: false, error: 'invalid_key' };
    if (!res.ok) return { success: false, error: 'HTTP ' + res.status };
    const j = await res.json();
    if (j?.errcode && j.errcode !== 0)
      return { success: false, error: String(j.errmsg || j.errcode) };
    const longest = ((j?.readLongest ?? []) as unknown[])
      .map((it) => {
        const x = it as {
          book?: Record<string, unknown>;
          albumInfo?: Record<string, unknown>;
          readTime?: number;
        };
        const b = x.book ?? x.albumInfo ?? {};
        const bid = String(b.bookId ?? b.albumId ?? '');
        return {
          title: String(b.title ?? b.name ?? ''),
          author: String(b.author ?? b.authorName ?? ''),
          readTime: Number(x.readTime ?? 0),
          deepLink: String(b.deepLink ?? '') || wereadBookUrl(bid),
        };
      })
      .filter((b) => b.title)
      .slice(0, 3);
    const categories = ((j?.preferCategory ?? []) as unknown[])
      .map((c) => String((c as Record<string, unknown>)?.categoryTitle ?? ''))
      .filter(Boolean)
      .slice(0, 5);
    return {
      success: true,
      data: {
        totalReadTime: Number(j?.totalReadTime ?? 0),
        readDays: Number(j?.readDays ?? 0),
        dayAverageReadTime: Number(j?.dayAverageReadTime ?? 0),
        longest,
        categories,
        categoryWord: j?.preferCategoryWord ? String(j.preferCategoryWord) : undefined,
        timeWord: j?.preferTimeWord ? String(j.preferTimeWord) : undefined,
      },
    };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : String(e) };
  } finally {
    clearTimeout(to);
  }
}

// ─── Weread Recommend (为你推荐) ────────────────────────

interface WereadRecommendBook {
  bid: string;
  title: string;
  author: string;
  cover: string;
  rating: number;
  reason: string;
  deepLink: string;
}
interface WereadRecommendResponse {
  success: boolean;
  data?: { books: WereadRecommendBook[] };
  error?: string;
}

/** 微信读书推荐：/book/recommend，需 API Key。books[].deepLink 直达阅读。 */
async function handleWereadRecommendFetch(apiKey: string): Promise<WereadRecommendResponse> {
  if (!apiKey) return { success: false, error: 'no_key' };
  const ctrl = new AbortController();
  const to = setTimeout(() => ctrl.abort(), 12000);
  try {
    const res = await fetch('https://i.weread.qq.com/api/agent/gateway', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ api_name: '/book/recommend', count: 10, skill_version: '1.0.4' }),
      cache: 'no-store',
      signal: ctrl.signal,
    });
    if (res.status === 401) return { success: false, error: 'invalid_key' };
    if (!res.ok) return { success: false, error: 'HTTP ' + res.status };
    const j = await res.json();
    if (j?.errcode && j.errcode !== 0)
      return { success: false, error: String(j.errmsg || j.errcode) };
    const books = ((j?.books ?? []) as unknown[])
      .map((it) => {
        const b = it as Record<string, unknown>;
        const info = (b.bookInfo as Record<string, unknown>) ?? {};
        const bid = String(info.bookId ?? b.bookId ?? '');
        const dl = String(info.deepLink ?? b.deepLink ?? '');
        return {
          bid,
          title: String(info.title ?? b.title ?? ''),
          author: String(info.author ?? b.author ?? ''),
          cover: String(info.cover ?? b.cover ?? ''),
          rating: Number(info.newRating ?? b.newRating ?? 0),
          reason: String(b.reason ?? info.reason ?? ''),
          deepLink: dl || wereadBookUrl(bid),
        };
      })
      .filter((b) => b.bid && b.title);
    if (!books.length) return { success: false, error: 'empty' };
    // recommend 接口不返回 deepLink，逐本调 /book/info 补 book-detail 链接（并发，失败保留兜底）
    const enriched = await Promise.all(
      books.map(async (b) => {
        if (b.deepLink && b.deepLink !== wereadBookUrl(b.bid) && b.cover) return b;
        try {
          const r = await fetch('https://i.weread.qq.com/api/agent/gateway', {
            method: 'POST',
            headers: { Authorization: 'Bearer ' + apiKey, 'Content-Type': 'application/json' },
            body: JSON.stringify({ api_name: '/book/info', bookId: b.bid, skill_version: '1.0.4' }),
            cache: 'no-store',
          });
          if (r.ok) {
            const ji = await r.json();
            if (!ji?.errcode || ji.errcode === 0) {
              const dl = String(ji?.deepLink ?? '');
              const cover = String(ji?.cover ?? '');
              if (dl || cover) return { ...b, deepLink: dl || b.deepLink, cover: cover || b.cover };
            }
          }
        } catch {}
        return b;
      }),
    );
    return { success: true, data: { books: enriched } };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : String(e) };
  } finally {
    clearTimeout(to);
  }
}

// ─── Weread Notes (我的笔记) ────────────────────────────

interface WereadNotesBook {
  bid: string;
  title: string;
  author: string;
  cover: string;
  deepLink: string;
  noteCount: number;
  progress: number;
  finished: boolean;
  sort: number;
}
interface WereadNotesResponse {
  success: boolean;
  data?: { books: WereadNotesBook[]; totalBooks: number; totalNotes: number };
  error?: string;
}

/** 微信读书笔记概览：/user/notebooks，需 API Key。单本笔记数 = reviewCount + noteCount + bookmarkCount。 */
async function handleWereadNotesFetch(apiKey: string): Promise<WereadNotesResponse> {
  if (!apiKey) return { success: false, error: 'no_key' };
  const ctrl = new AbortController();
  const to = setTimeout(() => ctrl.abort(), 12000);
  try {
    const res = await fetch('https://i.weread.qq.com/api/agent/gateway', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ api_name: '/user/notebooks', count: 20, skill_version: '1.0.4' }),
      cache: 'no-store',
      signal: ctrl.signal,
    });
    if (res.status === 401) return { success: false, error: 'invalid_key' };
    if (!res.ok) return { success: false, error: 'HTTP ' + res.status };
    const j = await res.json();
    if (j?.errcode && j.errcode !== 0)
      return { success: false, error: String(j.errmsg || j.errcode) };
    const books = ((j?.books ?? []) as unknown[])
      .map((it) => {
        const b = it as Record<string, unknown>;
        const info = (b.book as Record<string, unknown>) ?? {};
        const bid = String(b.bookId ?? info.bookId ?? '');
        const reviewCount = Number(b.reviewCount ?? 0);
        const noteCount = Number(b.noteCount ?? 0);
        const bookmarkCount = Number(b.bookmarkCount ?? 0);
        const progress = Number(b.readingProgress ?? 0);
        return {
          bid,
          title: String(info.title ?? b.title ?? ''),
          author: String(info.author ?? b.author ?? ''),
          cover: String(info.cover ?? b.cover ?? ''),
          deepLink: String(info.deepLink ?? b.deepLink ?? '') || wereadBookUrl(bid),
          noteCount: reviewCount + noteCount + bookmarkCount,
          progress,
          finished: progress >= 100,
          sort: Number(b.sort ?? 0),
        };
      })
      .filter((b) => b.bid && b.title);
    if (!books.length) return { success: false, error: 'empty' };
    return {
      success: true,
      data: {
        books,
        totalBooks: Number(j?.totalBookCount ?? books.length),
        totalNotes: Number(j?.totalNoteCount ?? 0),
      },
    };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : String(e) };
  } finally {
    clearTimeout(to);
  }
}

// ─── Weread Notes Content (单本笔记内容) ────────────────

interface WereadNotesContent {
  highlights: { markText: string; chapterUid: number; createTime: number }[];
  thoughts: {
    content: string;
    abstract: string;
    chapterUid: number;
    chapterName: string;
    createTime: number;
    star: number;
  }[];
  chapters: { chapterUid: number; title: string }[];
}
interface WereadNotesContentResponse {
  success: boolean;
  data?: WereadNotesContent;
  error?: string;
}

/** 微信读书单本笔记内容：/book/bookmarklist（划线）+ /review/list/mine（想法/点评）合并。需 API Key。 */
async function handleWereadNotesContentFetch(
  apiKey: string,
  bookId: string,
): Promise<WereadNotesContentResponse> {
  if (!apiKey) return { success: false, error: 'no_key' };
  if (!bookId) return { success: false, error: 'no_bookid' };
  const ctrl = new AbortController();
  const to = setTimeout(() => ctrl.abort(), 12000);
  const headers = { Authorization: 'Bearer ' + apiKey, 'Content-Type': 'application/json' };
  const url = 'https://i.weread.qq.com/api/agent/gateway';
  try {
    const [bmRes, rvRes] = await Promise.all([
      fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({ api_name: '/book/bookmarklist', bookId, skill_version: '1.0.4' }),
        cache: 'no-store',
        signal: ctrl.signal,
      }),
      fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          api_name: '/review/list/mine',
          bookid: bookId,
          count: 50,
          skill_version: '1.0.4',
        }),
        cache: 'no-store',
        signal: ctrl.signal,
      }),
    ]);
    if (bmRes.status === 401 || rvRes.status === 401) return { success: false, error: 'invalid_key' };
    const bm = bmRes.ok ? await bmRes.json() : {};
    const rv = rvRes.ok ? await rvRes.json() : {};
    if ((bm?.errcode && bm.errcode !== 0) || (rv?.errcode && rv.errcode !== 0))
      return { success: false, error: String(bm?.errmsg || rv?.errmsg || bm?.errcode || rv?.errcode) };
    const highlights = ((bm?.updated ?? []) as unknown[])
      .map((it) => {
        const b = it as Record<string, unknown>;
        return {
          markText: String(b.markText ?? ''),
          chapterUid: Number(b.chapterUid ?? 0),
          createTime: Number(b.createTime ?? 0),
        };
      })
      .filter((h) => h.markText);
    const thoughts = ((rv?.reviews ?? []) as unknown[])
      .map((it) => {
        const r = ((it as { review?: Record<string, unknown> })?.review) ?? {};
        return {
          content: String(r.content ?? ''),
          abstract: String(r.abstract ?? ''),
          chapterUid: Number(r.chapterUid ?? 0),
          chapterName: String(r.chapterName ?? ''),
          createTime: Number(r.createTime ?? 0),
          star: Number(r.star ?? 0),
        };
      })
      .filter((t) => t.content);
    const chapters = ((bm?.chapters ?? []) as unknown[])
      .map((it) => {
        const c = it as Record<string, unknown>;
        return { chapterUid: Number(c.chapterUid ?? 0), title: String(c.title ?? '') };
      })
      .filter((c) => c.title);
    if (!highlights.length && !thoughts.length) return { success: false, error: 'empty' };
    return { success: true, data: { highlights, thoughts, chapters } };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : String(e) };
  } finally {
    clearTimeout(to);
  }
}

// ─── Weread Review (书评) ───────────────────────────────

interface WereadReviewItem {
  author: string;
  star: number;
  content: string;
  time: number;
}
interface WereadReviewResponse {
  success: boolean;
  data?: { bookTitle: string; bookCover: string; bookDeepLink: string; reviews: WereadReviewItem[]; total: number };
  error?: string;
}

/** 微信读书书评：默认取书架最近阅读书；传 bookId 则直接查该书。调 /review/list 显示公开点评。需 API Key。 */
async function handleWereadReviewFetch(apiKey: string, bookId?: string): Promise<WereadReviewResponse> {
  if (!apiKey) return { success: false, error: 'no_key' };
  const ctrl = new AbortController();
  const to = setTimeout(() => ctrl.abort(), 15000);
  try {
    let book: { bid: string; title: string; cover: string; deepLink: string };
    if (bookId) {
      book = { bid: bookId, title: '', cover: '', deepLink: '' };
    } else {
      const shelfRes = await fetch('https://i.weread.qq.com/api/agent/gateway', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + apiKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({ api_name: '/shelf/sync', skill_version: '1.0.4' }),
        cache: 'no-store',
        signal: ctrl.signal,
      });
      if (shelfRes.status === 401) return { success: false, error: 'invalid_key' };
      if (!shelfRes.ok) return { success: false, error: 'HTTP ' + shelfRes.status };
      const sj = await shelfRes.json();
      if (sj?.errcode && sj.errcode !== 0)
        return { success: false, error: String(sj.errmsg || sj.errcode) };
      const shelfBooks = ((sj?.books ?? []) as unknown[])
        .map((it) => {
          const b = it as Record<string, unknown>;
          return {
            bid: String(b.bookId ?? ''),
            title: String(b.title ?? ''),
            cover: String(b.cover ?? ''),
            deepLink: String(b.deepLink ?? ''),
            readUpdateTime: Number(b.readUpdateTime ?? 0),
          };
        })
        .filter((b) => b.bid && b.title)
        .sort((a, b) => b.readUpdateTime - a.readUpdateTime);
      if (!shelfBooks.length) return { success: false, error: 'empty_shelf' };
      book = shelfBooks[0];
    }
    const revRes = await fetch('https://i.weread.qq.com/api/agent/gateway', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_name: '/review/list',
        bookId: book.bid,
        reviewListType: 0,
        count: 10,
        skill_version: '1.0.4',
      }),
      cache: 'no-store',
      signal: ctrl.signal,
    });
    if (!revRes.ok) return { success: false, error: 'HTTP ' + revRes.status };
    const rj = await revRes.json();
    if (rj?.errcode && rj.errcode !== 0)
      return { success: false, error: String(rj.errmsg || rj.errcode) };
    const reviews = ((rj?.reviews ?? []) as unknown[])
      .map((it) => {
        const rv = (it as { review?: { review?: Record<string, unknown> } })?.review?.review ?? {};
        const author = rv.author as { name?: string } | undefined;
        return {
          author: String(author?.name ?? ''),
          star: Number(rv.star ?? 0),
          content: String(rv.content ?? ''),
          time: Number(rv.createTime ?? 0),
        };
      })
      .filter((r) => r.content);
    if (!reviews.length) return { success: false, error: 'empty' };
    return {
      success: true,
      data: {
        bookTitle: book.title,
        bookCover: book.cover,
        bookDeepLink: book.deepLink || wereadBookUrl(book.bid),
        reviews,
        total: Number(rj?.reviewsCnt ?? reviews.length),
      },
    };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : String(e) };
  } finally {
    clearTimeout(to);
  }
}

// ─── Weread Search (搜书) ───────────────────────────────

interface WereadSearchBook {
  bid: string;
  title: string;
  author: string;
  cover: string;
  rating: number;
  deepLink: string;
}
interface WereadSearchResponse {
  success: boolean;
  data?: { books: WereadSearchBook[] };
  error?: string;
}

/** 微信读书搜书：/store/search scope=10 电子书。需 API Key。 */
async function handleWereadSearchFetch(
  apiKey: string,
  keyword: string,
): Promise<WereadSearchResponse> {
  if (!apiKey) return { success: false, error: 'no_key' };
  if (!keyword) return { success: false, error: 'no_keyword' };
  const ctrl = new AbortController();
  const to = setTimeout(() => ctrl.abort(), 12000);
  try {
    const res = await fetch('https://i.weread.qq.com/api/agent/gateway', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_name: '/store/search',
        keyword,
        scope: 10,
        count: 10,
        skill_version: '1.0.4',
      }),
      cache: 'no-store',
      signal: ctrl.signal,
    });
    if (res.status === 401) return { success: false, error: 'invalid_key' };
    if (!res.ok) return { success: false, error: 'HTTP ' + res.status };
    const j = await res.json();
    if (j?.errcode && j.errcode !== 0)
      return { success: false, error: String(j.errmsg || j.errcode) };
    const groups = (j?.results ?? []) as unknown[];
    const books: WereadSearchBook[] = [];
    for (const g of groups) {
      const list = (g as { books?: unknown[] })?.books ?? [];
      for (const it of list) {
        const info = (it as { bookInfo?: Record<string, unknown> })?.bookInfo ?? {};
        const bid = String(info.bookId ?? '');
        if (!bid) continue;
        books.push({
          bid,
          title: String(info.title ?? ''),
          author: String(info.author ?? ''),
          cover: String(info.cover ?? ''),
          rating: Number(info.newRating ?? 0),
          deepLink: String(info.deepLink ?? '') || wereadBookUrl(bid),
        });
      }
    }
    const seen = new Set<string>();
    const deduped = books.filter((b) => b.title && !seen.has(b.bid) && seen.add(b.bid));
    if (!deduped.length) return { success: false, error: 'empty' };
    return { success: true, data: { books: deduped } };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : String(e) };
  } finally {
    clearTimeout(to);
  }
}

// ─── Exchange Rate (汇率换算) ──────────────────────────

interface ExchangeResponse {
  success: boolean;
  data?: { rates: Record<string, number>; ts: number };
  error?: string;
}

/** 汇率：open.er-api.com 免 key，base USD，返回 ~160 币种。无 CORS 头，由 SW 凭 host_permissions 绕过。 */
async function handleExchangeFetch(): Promise<ExchangeResponse> {
  const ctrl = new AbortController();
  const to = setTimeout(() => ctrl.abort(), 12000);
  try {
    const res = await fetch('https://open.er-api.com/v6/latest/USD', {
      cache: 'no-store',
      signal: ctrl.signal,
    });
    if (!res.ok) return { success: false, error: 'HTTP ' + res.status };
    const j = (await res.json()) as {
      result?: string;
      rates?: Record<string, number>;
      time_last_update_unix?: number;
    };
    if (j?.result !== 'success' || !j?.rates) return { success: false, error: 'bad data' };
    const ts = j.time_last_update_unix ? j.time_last_update_unix * 1000 : Date.now();
    return { success: true, data: { rates: j.rates, ts } };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : String(e) };
  } finally {
    clearTimeout(to);
  }
}

// ─── AI HOT (AI 资讯 24h 精选) ─────────────────────────

interface AihotItem {
  id: string;
  title: string;
  source: string;
  publishedAt: string;
  summary: string;
  permalink: string;
  category: string;
  score: number;
  url: string;
}
interface AihotResponse {
  success: boolean;
  data?: { items: AihotItem[]; ts: number };
  error?: string;
}

/** AI HOT 公开只读 API：过去 24h 精选条目。默认 curl UA 被 403，浏览器 UA 放行，SW fetch 自带浏览器 UA，无需 DNR 改写。 */
async function handleAihotFetch(): Promise<AihotResponse> {
  const ctrl = new AbortController();
  const to = setTimeout(() => ctrl.abort(), 12000);
  try {
    const since = new Date(Date.now() - 86400000).toISOString();
    const res = await fetch(
      `https://aihot.virxact.com/api/public/items?mode=selected&since=${since}&take=50`,
      { cache: 'no-store', signal: ctrl.signal },
    );
    if (!res.ok) return { success: false, error: 'HTTP ' + res.status };
    const j = await res.json();
    const arr = (j?.items ?? []) as unknown[];
    const items: AihotItem[] = arr
      .map((x) => {
        const it = x as {
          id?: string;
          title?: string;
          source?: string;
          publishedAt?: string;
          summary?: string;
          permalink?: string;
          category?: string;
          score?: number;
          url?: string;
        };
        return {
          id: String(it.id ?? ''),
          title: String(it.title ?? ''),
          source: String(it.source ?? ''),
          publishedAt: String(it.publishedAt ?? ''),
          summary: String(it.summary ?? ''),
          permalink: String(it.permalink ?? ''),
          category: String(it.category ?? ''),
          score: Number(it.score ?? 0),
          url: String(it.url ?? ''),
        };
      })
      .filter((x) => x.title && x.permalink);
    if (!items.length) return { success: false, error: 'empty' };
    return { success: true, data: { items, ts: Date.now() } };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : String(e) };
  } finally {
    clearTimeout(to);
  }
}

// ─── Keep Screen On (chrome.power) ─────────────────────

interface ScreenOnState {
  on: boolean;
  since: number; // 开启时刻（epoch ms），用于前端显示已开启时长
}

const SCREENON_KEY = 'moyu_screenon';
const DEFAULT_SCREENON: ScreenOnState = { on: false, since: 0 };

async function getScreenOn(): Promise<ScreenOnState> {
  const r = await chrome.storage.local.get(SCREENON_KEY);
  return { ...DEFAULT_SCREENON, ...(r[SCREENON_KEY] || {}) };
}

/** 开启屏幕常亮：chrome.power 从 SW 调用，全局生效——任意标签页在前都保持显示不灭、不暗、系统不睡。比网页 Wake Lock（仅页面可见时有效）更强。 */
async function screenOnEnable(): Promise<{ success: boolean; state: ScreenOnState }> {
  chrome.power.requestKeepAwake('display');
  const state: ScreenOnState = { on: true, since: Date.now() };
  await chrome.storage.local.set({ [SCREENON_KEY]: state });
  return { success: true, state };
}

async function screenOnDisable(): Promise<{ success: boolean; state: ScreenOnState }> {
  chrome.power.releaseKeepAwake();
  const state: ScreenOnState = { on: false, since: 0 };
  await chrome.storage.local.set({ [SCREENON_KEY]: state });
  return { success: true, state };
}

/** 浏览器重启后 power 锁会丢失，按存储的状态重新申请。 */
async function restoreScreenOn(): Promise<void> {
  const s = await getScreenOn();
  if (s.on) chrome.power.requestKeepAwake('display');
}

chrome.runtime.onMessage.addListener((message: { type: string }, _sender, sendResponse) => {
  if (message?.type === 'FUND_FETCH') {
    handleFundFetch((message as unknown as { codes?: string[] }).codes ?? []).then(sendResponse);
  } else if (message?.type === 'STOCK_FETCH') {
    handleStockFetch((message as unknown as { codes?: string[] }).codes ?? []).then(sendResponse);
  } else if (message?.type === 'SECTOR_FETCH') {
    handleSectorFetch().then(sendResponse);
  } else if (message?.type === 'HOT_FETCH') {
    handleHotFetch((message as unknown as { platform?: string }).platform ?? 'weibo').then(
      sendResponse,
    );
  } else if (message?.type === 'HOLIDAY_FETCH') {
    handleHolidayFetch().then(sendResponse);
  } else if (message?.type === 'JUEJIN_FETCH') {
    handleJuejinFetch().then(sendResponse);
  } else if (message?.type === 'ZHIHU_FETCH') {
    handleZhihuFetch().then(sendResponse);
  } else if (message?.type === 'SINA_FLASH_FETCH') {
    handleSinaFlashFetch().then(sendResponse);
  } else if (message?.type === 'TYPHOON_FETCH') {
    handleTyphoonActivityFetch().then(sendResponse);
  } else if (message?.type === 'WEREAD_SHELF_FETCH') {
    handleWereadShelfFetch((message as unknown as { apiKey?: string }).apiKey ?? '').then(
      sendResponse,
    );
  } else if (message?.type === 'WEREAD_READDATA_FETCH') {
    handleWereadReaddataFetch((message as unknown as { apiKey?: string }).apiKey ?? '').then(
      sendResponse,
    );
  } else if (message?.type === 'WEREAD_RECOMMEND_FETCH') {
    handleWereadRecommendFetch((message as unknown as { apiKey?: string }).apiKey ?? '').then(
      sendResponse,
    );
  } else if (message?.type === 'WEREAD_NOTES_FETCH') {
    handleWereadNotesFetch((message as unknown as { apiKey?: string }).apiKey ?? '').then(
      sendResponse,
    );
  } else if (message?.type === 'WEREAD_NOTES_CONTENT_FETCH') {
    const m = message as unknown as { apiKey?: string; bookId?: string };
    handleWereadNotesContentFetch(m.apiKey ?? '', m.bookId ?? '').then(sendResponse);
  } else if (message?.type === 'WEREAD_REVIEW_FETCH') {
    const m = message as unknown as { apiKey?: string; bookId?: string };
    handleWereadReviewFetch(m.apiKey ?? '', m.bookId).then(sendResponse);
  } else if (message?.type === 'WEREAD_SEARCH_FETCH') {
    const m = message as unknown as { apiKey?: string; keyword?: string };
    handleWereadSearchFetch(m.apiKey ?? '', m.keyword ?? '').then(sendResponse);
  } else if (message?.type === 'EXCHANGE_FETCH') {
    handleExchangeFetch().then(sendResponse);
  } else if (message?.type === 'AIHOT_FETCH') {
    handleAihotFetch().then(sendResponse);
  } else if (message?.type === 'TRACKER_RANKINGS') {
    const m = message as unknown as { period?: string };
    getSiteRankings((m.period as 'day' | 'week' | 'month') || 'day').then(sendResponse);
  } else if (message?.type === 'SCREENON_ON') {
    screenOnEnable().then(sendResponse);
  } else if (message?.type === 'SCREENON_OFF') {
    screenOnDisable().then(sendResponse);
  } else if (message?.type === 'SCREENON_STATUS') {
    getScreenOn().then((state) => sendResponse({ success: true, state }));
  } else {
    handlePomodoroMessage(message as PomodoroMessage).then(sendResponse);
  }
  return true;
});

async function handlePomodoroMessage(msg: PomodoroMessage): Promise<PomodoroResponse> {
  await loadState();

  switch (msg.type) {
    case 'POM_GET_STATE':
      return { success: true, state: cachedState };

    case 'POM_START': {
      if (msg.payload) {
        if (msg.payload.focusDuration) cachedState.focusDuration = msg.payload.focusDuration;
        if (msg.payload.breakDuration) cachedState.breakDuration = msg.payload.breakDuration;
      }

      if (cachedState.status === 'focus') break;

      cachedState.status = 'focus';
      cachedState.phaseStartTime = Date.now();
      cachedState.remainingSeconds = 0;
      await saveState();

      chrome.alarms.create(ALARM_TICK, { periodInMinutes: 1 });
      return { success: true, state: cachedState };
    }

    case 'POM_PAUSE': {
      if (cachedState.status !== 'focus' && cachedState.status !== 'break') break;

      const now = Date.now();
      const elapsed = now - (cachedState.phaseStartTime ?? now);
      const totalMs =
        cachedState.status === 'focus'
          ? cachedState.focusDuration * 60 * 1000
          : cachedState.breakDuration * 60 * 1000;
      const remaining = Math.max(0, Math.round((totalMs - elapsed) / 1000));

      cachedState.remainingSeconds = remaining;
      cachedState.status = cachedState.status === 'focus' ? 'focus-paused' : 'break-paused';
      cachedState.phaseStartTime = null;
      await saveState();

      chrome.alarms.clear(ALARM_TICK);
      chrome.alarms.clear(ALARM_COMPLETE);

      return { success: true, state: cachedState };
    }

    case 'POM_RESUME': {
      if (cachedState.status !== 'focus-paused' && cachedState.status !== 'break-paused') break;

      const wasFocus = cachedState.status === 'focus-paused';
      cachedState.status = wasFocus ? 'focus' : 'break';
      cachedState.phaseStartTime = Date.now();
      const remainingMs = cachedState.remainingSeconds * 1000;
      cachedState.remainingSeconds = 0;
      await saveState();

      chrome.alarms.create(ALARM_TICK, { periodInMinutes: 1 });
      if (remainingMs > 0) {
        chrome.alarms.create(ALARM_COMPLETE, { delayInMinutes: remainingMs / 60000 });
      }

      return { success: true, state: cachedState };
    }

    case 'POM_RESET': {
      cachedState.status = 'idle';
      cachedState.phaseStartTime = null;
      cachedState.remainingSeconds = 0;
      await saveState();

      chrome.alarms.clear(ALARM_TICK);
      chrome.alarms.clear(ALARM_COMPLETE);

      return { success: true, state: cachedState };
    }

    case 'POM_SETTINGS': {
      if (msg.payload) {
        if (msg.payload.focusDuration) cachedState.focusDuration = msg.payload.focusDuration;
        if (msg.payload.breakDuration) cachedState.breakDuration = msg.payload.breakDuration;
        await saveState();
      }
      return { success: true, state: cachedState };
    }
  }

  return { success: true, state: cachedState };
}

// ─── Boot ───────────────────────────────────────────────

chrome.runtime.onStartup.addListener(restoreScreenOn);

chrome.runtime.onInstalled.addListener(async () => {
  await loadState();
  chrome.alarms.clear(ALARM_TICK);
  chrome.alarms.clear(ALARM_COMPLETE);
  await restoreScreenOn();
});

// 网站使用时长统计：SW 每次唤醒模块重载，需在顶层注册监听（幂等，saveTimer 已防重）
void initSiteTracker();
