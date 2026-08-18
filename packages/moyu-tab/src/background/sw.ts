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
const ALARM_WATER = 'water_reminder';
const WATER_KEY = 'moyu_water';

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
  } else if (alarm.name === ALARM_WATER) {
    await onWaterReminder();
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

/** 发送系统通知。iconUrl 必须是扩展内真实 PNG（chrome.notifications 不支持 data: URL，否则报 "Unable to download all specified images"）。
 *  icon128.png 是蓝色水滴图标，正好当喝水/番茄钟通知图标。
 *  @types/chrome 仅提供回调式签名，用 Promise 包装拿到通知 id。 */
async function showNotification(title: string, message: string): Promise<string | undefined> {
  try {
    return await new Promise<string>((resolve, reject) => {
      chrome.notifications.create(
        {
          type: 'basic',
          iconUrl: chrome.runtime.getURL('icons/icon128.png'),
          title,
          message,
          priority: 2,
        },
        (id) => (id ? resolve(id) : reject(new Error('通知 id 为空'))),
      );
    });
  } catch (e) {
    console.error('通知发送失败', e);
    return undefined;
  }
}

// ─── Water Reminder ────────────────────────────────────
/** 到点提醒喝水；当天累计达标则跳过，提醒文案带目标进度 */
async function onWaterReminder() {
  try {
    const r = (await chrome.storage.local.get(WATER_KEY)) as Record<
      string,
      { date?: string; total?: number; goal?: number; cup?: number } | undefined
    >;
    const d = r?.[WATER_KEY];
    if (!d) {
      console.log('[water] onWaterReminder: 无 moyu_water 数据，跳过');
      return;
    }
    const total = d.total ?? 0;
    const goal = typeof d.goal === 'number' && d.goal > 0 ? d.goal : 0;
    // 设了目标且已达标 → 不再打扰
    if (goal > 0 && total >= goal) {
      console.log(`[water] 今日已达标 ${total}/${goal}ml，跳过提醒`);
      return;
    }
    const title = '💧 该喝水啦';
    const message =
      goal > 0
        ? `今日已喝 ${total}/${goal}ml，起来喝一杯（${d.cup ?? 250}ml）润润喉~`
        : `今日已喝 ${total}ml，起来喝一杯（${d.cup ?? 250}ml）润润喉~`;
    console.log('[water] onWaterReminder 发送通知:', {
      title,
      message,
      iconUrl: chrome.runtime.getURL('icons/icon128.png'),
    });
    const notifId = await showNotification(title, message);
    console.log('[water] notifications.create 返回 id:', notifId);
  } catch (e) {
    console.error('[water] onWaterReminder 异常:', e);
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
    if (bmRes.status === 401 || rvRes.status === 401)
      return { success: false, error: 'invalid_key' };
    const bm = bmRes.ok ? await bmRes.json() : {};
    const rv = rvRes.ok ? await rvRes.json() : {};
    if ((bm?.errcode && bm.errcode !== 0) || (rv?.errcode && rv.errcode !== 0))
      return {
        success: false,
        error: String(bm?.errmsg || rv?.errmsg || bm?.errcode || rv?.errcode),
      };
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
        const r = (it as { review?: Record<string, unknown> })?.review ?? {};
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
  data?: {
    bookTitle: string;
    bookCover: string;
    bookDeepLink: string;
    reviews: WereadReviewItem[];
    total: number;
  };
  error?: string;
}

/** 微信读书书评：默认取书架最近阅读书；传 bookId 则直接查该书。调 /review/list 显示公开点评。需 API Key。 */
async function handleWereadReviewFetch(
  apiKey: string,
  bookId?: string,
): Promise<WereadReviewResponse> {
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

// ── 消息路由表：新增消息只需往 HANDLERS 加一行表项 ──
type Msg = Record<string, unknown>;
type MsgHandler = (msg: Msg) => Promise<unknown>;

const HANDLERS: Record<string, MsgHandler> = {
  HOLIDAY_FETCH: () => handleHolidayFetch(),
  ZHIHU_FETCH: () => handleZhihuFetch(),
  SINA_FLASH_FETCH: () => handleSinaFlashFetch(),
  TYPHOON_FETCH: () => handleTyphoonActivityFetch(),
  WEREAD_SHELF_FETCH: (m) => handleWereadShelfFetch((m.apiKey as string | undefined) ?? ''),
  WEREAD_READDATA_FETCH: (m) => handleWereadReaddataFetch((m.apiKey as string | undefined) ?? ''),
  WEREAD_RECOMMEND_FETCH: (m) => handleWereadRecommendFetch((m.apiKey as string | undefined) ?? ''),
  WEREAD_NOTES_FETCH: (m) => handleWereadNotesFetch((m.apiKey as string | undefined) ?? ''),
  WEREAD_NOTES_CONTENT_FETCH: (m) =>
    handleWereadNotesContentFetch(
      (m.apiKey as string | undefined) ?? '',
      (m.bookId as string | undefined) ?? '',
    ),
  WEREAD_REVIEW_FETCH: (m) =>
    handleWereadReviewFetch((m.apiKey as string | undefined) ?? '', m.bookId as string | undefined),
  WEREAD_SEARCH_FETCH: (m) =>
    handleWereadSearchFetch(
      (m.apiKey as string | undefined) ?? '',
      (m.keyword as string | undefined) ?? '',
    ),
  EXCHANGE_FETCH: () => handleExchangeFetch(),
  AIHOT_FETCH: () => handleAihotFetch(),
  TRACKER_RANKINGS: (m) =>
    getSiteRankings((m.period as 'day' | 'week' | 'month' | undefined) || 'day'),
  SCREENON_ON: () => screenOnEnable(),
  SCREENON_OFF: () => screenOnDisable(),
  SCREENON_STATUS: () => getScreenOn().then((state) => ({ success: true, state })),
  WATER_SET_REMINDER: (m) => handleWaterSetReminder((m.interval as number | undefined) ?? 0),
  WATER_SIMULATE: () => onWaterReminder().then(() => ({ success: true })),
  // 番茄钟：消息类型以 POM_ 开头，统一走 handlePomodoroMessage
  POM_GET_STATE: (m) => handlePomodoroMessage(m as unknown as PomodoroMessage),
  POM_START: (m) => handlePomodoroMessage(m as unknown as PomodoroMessage),
  POM_PAUSE: (m) => handlePomodoroMessage(m as unknown as PomodoroMessage),
  POM_RESUME: (m) => handlePomodoroMessage(m as unknown as PomodoroMessage),
  POM_RESET: (m) => handlePomodoroMessage(m as unknown as PomodoroMessage),
  POM_SETTINGS: (m) => handlePomodoroMessage(m as unknown as PomodoroMessage),
};

/** 按间隔重建/清除喝水提醒闹钟 */
async function handleWaterSetReminder(interval: number): Promise<{ success: boolean }> {
  return interval > 0
    ? chrome.alarms
        .create(ALARM_WATER, { periodInMinutes: interval })
        .then(() => ({ success: true }))
    : chrome.alarms.clear(ALARM_WATER).then(() => ({ success: true }));
}

chrome.runtime.onMessage.addListener((message: { type?: string }, _sender, sendResponse) => {
  const handler = HANDLERS[message?.type ?? ''];
  Promise.resolve(
    handler ? handler(message as Msg) : { success: false, error: 'unknown_message' },
  ).then(sendResponse);
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

chrome.runtime.onStartup.addListener(async () => {
  restoreScreenOn();
  // 浏览器重启后恢复喝水提醒闹钟（若用户开启过）
  try {
    const r = (await chrome.storage.local.get(WATER_KEY)) as Record<
      string,
      { interval?: number } | undefined
    >;
    const iv = r?.[WATER_KEY]?.interval || 0;
    if (iv > 0) await chrome.alarms.create(ALARM_WATER, { periodInMinutes: iv });
  } catch {}
});

chrome.runtime.onInstalled.addListener(async () => {
  await loadState();
  chrome.alarms.clear(ALARM_TICK);
  chrome.alarms.clear(ALARM_COMPLETE);
  await restoreScreenOn();
});

// 网站使用时长统计：SW 每次唤醒模块重载，需在顶层注册监听（幂等，saveTimer 已防重）
void initSiteTracker();
