/**
 * 薪资跳动 — Background Service Worker
 *
 * 根据月薪和工作时间，在工具栏 Badge 实时显示累计收入。
 * 工作时间外显示状态文字，每日自动重置。
 */

const STORAGE_KEY = 'salary_settings';

/** 劳动法月均工作日 */
const WORK_DAYS_PER_MONTH = 21.75;

interface SalarySettings {
  monthlyIncome: number;
  workStart: string; // "HH:MM"
  workEnd: string; // "HH:MM"
}

const DEFAULT_SETTINGS: SalarySettings = {
  monthlyIncome: 10000,
  workStart: '09:00',
  workEnd: '18:00',
};

let settings: SalarySettings = { ...DEFAULT_SETTINGS };
let tickTimer: ReturnType<typeof setInterval> | null = null;
let todayDate = ''; // yyyy-MM-dd, 用于检测跨天重置

// ─── Icon ──────────────────────────────────────────────

function createIconImageData(size: number): ImageData {
  const pixels = new Uint8ClampedArray(size * size * 4);
  const cx = size / 2;
  const cy = size / 2;
  const r = cx - 1;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // 圆形裁剪
      if (dist > r) {
        pixels[i + 3] = 0;
        continue;
      }

      // 背景 — 深色
      const bg = 0.08 + 0.06 * (1 - dist / r);
      pixels[i] = Math.round(18 * bg);
      pixels[i + 1] = Math.round(18 * bg);
      pixels[i + 2] = Math.round(18 * bg);

      // 画一个 "¥" 符号（用线条）
      const relX = x - cx;
      const relY = y - cy;
      const halfSize = size * 0.35;
      const strokeW = Math.max(1, size * 0.06);

      let isGreen = false;

      if (size >= 32) {
        // ¥ 的两条斜线（上半部分 "Y"）
        const lineW1 = Math.abs(relX - relY); // 左斜
        const lineW2 = Math.abs(relX + relY); // 右斜
        const isLeftLeg = lineW1 <= strokeW && relY <= -strokeW;
        const isRightLeg = lineW2 <= strokeW && relY <= -strokeW;

        // 水平横杠（中间和底部之一）
        const isMidBar = Math.abs(relY) <= strokeW && Math.abs(relX) <= halfSize;
        const isBotBar =
          Math.abs(relY - halfSize * 0.6) <= strokeW && Math.abs(relX) <= halfSize * 0.7;

        // 竖线
        const isVLine = Math.abs(relX) <= strokeW && relY >= -halfSize && relY <= halfSize;

        isGreen = isLeftLeg || isRightLeg || isMidBar || isBotBar || isVLine;
      } else {
        // 小尺寸 — 简单绿色圆点
        if (dist < r * 0.5) isGreen = true;
      }

      if (isGreen) {
        pixels[i] = 74;
        pixels[i + 1] = 222;
        pixels[i + 2] = 128;
        pixels[i + 3] = Math.round(255 * (0.85 + 0.15 * (1 - dist / r)));
      } else {
        pixels[i + 3] = Math.round(255 * (0.5 + 0.3 * (1 - dist / r)));
      }
    }
  }
  return new ImageData(pixels, size, size);
}

function setToolbarIcon() {
  const data: Record<number, ImageData> = {};
  for (const s of [16, 32, 48, 128]) {
    data[s] = createIconImageData(s);
  }
  chrome.action.setIcon({ imageData: data }).catch(() => undefined);
}

// ─── Settings ─────────────────────────────────────────

async function loadSettings(): Promise<void> {
  try {
    const result = await chrome.storage.sync.get(STORAGE_KEY);
    if (result[STORAGE_KEY]) {
      settings = { ...DEFAULT_SETTINGS, ...result[STORAGE_KEY] };
    }
  } catch {
    settings = { ...DEFAULT_SETTINGS };
  }
}

// ─── Time Helpers ──────────────────────────────────────

/** "HH:MM" → 今天的 Date 对象 */
function todayAt(time: string): Date {
  const [h, m] = time.split(':').map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d;
}

function getSecondsSince(t: Date): number {
  return Math.max(0, Math.floor((Date.now() - t.getTime()) / 1000));
}

function getSecondsUntil(t: Date): number {
  return Math.max(0, Math.floor((t.getTime() - Date.now()) / 1000));
}

function isWorkDay(): boolean {
  const day = new Date().getDay(); // 0=Sun, 1=Mon...
  return day >= 1 && day <= 5;
}

function getDateStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// ─── Badge ─────────────────────────────────────────────

function setBadge(text: string, color: string = '#22c55e') {
  chrome.action.setBadgeBackgroundColor({ color });
  chrome.action.setBadgeText({ text: text.slice(0, 5) });
}

function getStatusText(): string {
  const now = new Date();
  const start = todayAt(settings.workStart);
  const end = todayAt(settings.workEnd);

  if (!isWorkDay()) {
    return '休息';
  }

  if (now < start) {
    const secs = getSecondsUntil(start);
    const min = Math.ceil(secs / 60);
    if (min >= 60) return `${Math.floor(min / 60)}h${min % 60}m后上班`;
    return `${min}min后上班`;
  }

  if (now > end) {
    return '下班';
  }

  return '';
}

// ─── Core Logic ────────────────────────────────────────

function calcAndDisplay() {
  const now = new Date();
  const start = todayAt(settings.workStart);
  const end = todayAt(settings.workEnd);

  const today = getDateStr();
  if (today !== todayDate) {
    todayDate = today;
  }

  if (!isWorkDay() || now < start || now > end) {
    const status = getStatusText();
    setBadge(status, status === '下班' || status === '休息' ? '#22c55e' : '#f59e0b');
    chrome.action.setTitle({ title: status });
    return;
  }

  const workSeconds = Math.floor((end.getTime() - start.getTime()) / 1000);
  if (workSeconds <= 0) return;

  const elapsed = getSecondsSince(start);
  const clampedElapsed = Math.min(elapsed, workSeconds);

  const ratePerSecond = settings.monthlyIncome / WORK_DAYS_PER_MONTH / workSeconds;
  const accumulated = ratePerSecond * clampedElapsed;

  let badgeText: string;
  if (accumulated < 0.01) badgeText = accumulated.toFixed(4);
  else if (accumulated < 1) badgeText = accumulated.toFixed(3);
  else if (accumulated < 10) badgeText = accumulated.toFixed(2);
  else if (accumulated < 100) badgeText = accumulated.toFixed(1);
  else badgeText = Math.round(accumulated).toString();

  setBadge(badgeText, '#22c55e');

  const prefix = '收入+';
  const unit = '元';
  const fullText = `${prefix}${accumulated.toFixed(4)}${unit} | 每秒 ${ratePerSecond.toFixed(6)}${unit}`;
  chrome.action.setTitle({ title: fullText });
}

// ─── Lifecycle ─────────────────────────────────────────

async function init() {
  setToolbarIcon();
  await loadSettings();
  todayDate = getDateStr();
  calcAndDisplay();
  tickTimer = setInterval(calcAndDisplay, 200);
}

function shutdown() {
  if (tickTimer) clearInterval(tickTimer);
}

// ─── Boot ──────────────────────────────────────────────

chrome.runtime.onInstalled.addListener(() => {
  init();
});

chrome.runtime.onSuspend.addListener(() => {
  shutdown();
});

chrome.storage.onChanged.addListener((changes) => {
  if (changes[STORAGE_KEY]) {
    settings = { ...DEFAULT_SETTINGS, ...changes[STORAGE_KEY].newValue };
  }
});

init();
