import { esc, pad } from '../utils';

export function renderFundSection(): string {
  return `<div class="fund-head">
      <div class="fund-title">❖ 基金估值</div>
      <span class="fund-upd" id="fundUpd"></span>
    </div>
    <div class="fund-list" id="fundList"><div class="fund-empty">加载中…</div></div>
    <div class="fund-add">
      <input id="fundInput" placeholder="基金代码，如 001186" />
      <button id="fundAdd">+</button>
    </div>`;
}
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
export async function refreshFund() {
  if (fundLoading) return;
  if (!document.getElementById('fundList')) return;
  if (!fundCodes.length) return;
  fundLoading = true;
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
  document.getElementById('fundAdd')?.addEventListener('click', addFund);
  document.getElementById('fundInput')?.addEventListener('keydown', (e) => {
    if ((e as KeyboardEvent).key === 'Enter') addFund();
  });
}
function onFundVis() {
  if (document.visibilityState !== 'visible') return;
  if (fundCodes.length && Date.now() - fundLastFetch > 60000) refreshFund();
}
export async function initFund() {
  await loadFundCodes();
  renderFundList(false);
  bindFundControls();
  if (fundInited) return;
  fundInited = true;
  refreshFund();
  setInterval(refreshFund, 60000);
  document.addEventListener('visibilitychange', onFundVis);
}

