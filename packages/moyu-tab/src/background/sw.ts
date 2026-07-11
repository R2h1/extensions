/**
 * 工位搭子 — Background Service Worker
 *
 * 管理番茄钟持久化状态、alarms 定时检查、通知发送。
 */

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

// ─── Gold Price ────────────────────────────────────────

interface GoldPrice {
  ounce: string;
  gram: string;
  tola: string;
}
interface GoldResponse {
  success: boolean;
  data?: { cny: GoldPrice; usd: GoldPrice };
  error?: string;
}
const GOLD_API = 'https://goldprice.today/api.php?data=live';

/** 抓取实时金价。接口无 CORS 头，凭 host_permissions 在 SW 内绕过跨域。 */
async function handleGoldFetch(): Promise<GoldResponse> {
  const ctrl = new AbortController();
  const to = setTimeout(() => ctrl.abort(), 12000);
  try {
    const res = await fetch(GOLD_API, { cache: 'no-store', signal: ctrl.signal });
    if (!res.ok) return { success: false, error: 'HTTP ' + res.status };
    const data = await res.json();
    const cny = data?.CNY as GoldPrice | undefined;
    const usd = data?.USD as GoldPrice | undefined;
    if (!cny?.gram || !usd?.ounce) return { success: false, error: 'bad data' };
    return { success: true, data: { cny, usd } };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : String(e) };
  } finally {
    clearTimeout(to);
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

/** 抓取单只基金实时估值。返回 jsonpgz({...}); 格式，正则提取后解析。 */
async function fetchOneFund(code: string): Promise<FundQuote | null> {
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

async function handleFundFetch(codes: string[]): Promise<FundResponse> {
  const data: Record<string, FundQuote | null> = {};
  await Promise.all(
    codes.map(async (c) => {
      data[c] = await fetchOneFund(c);
    }),
  );
  return { success: true, data };
}

// ─── Message Router ─────────────────────────────────────

chrome.runtime.onMessage.addListener((message: { type: string }, _sender, sendResponse) => {
  if (message?.type === 'GOLD_FETCH') {
    handleGoldFetch().then(sendResponse);
  } else if (message?.type === 'FUND_FETCH') {
    handleFundFetch((message as unknown as { codes?: string[] }).codes ?? []).then(sendResponse);
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

chrome.runtime.onInstalled.addListener(async () => {
  await loadState();
  chrome.alarms.clear(ALARM_TICK);
  chrome.alarms.clear(ALARM_COMPLETE);
});
