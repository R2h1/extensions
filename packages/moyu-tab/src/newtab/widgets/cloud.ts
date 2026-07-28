/** 云平台快捷入口：5 个写死 + 用户自添加（校验链接可达 & 图标可获取），点击新标签打开 */
import { esc, escAttr } from '../utils';

interface Cloud {
  name: string;
  url: string;
}

/** 写死的五大云平台 */
const CLOUDS: Cloud[] = [
  { name: '七牛云', url: 'https://www.qiniu.com' },
  { name: '华为云', url: 'https://www.huaweicloud.com' },
  { name: '腾讯云', url: 'https://cloud.tencent.com' },
  { name: '阿里云', url: 'https://aliyun.com' },
  { name: '百度智能云', url: 'https://cloud.baidu.com' },
];

const SW = 'moyu_clouds';
let userClouds: Cloud[] = [];

async function loadUserClouds(): Promise<Cloud[]> {
  const r = await chrome.storage.sync.get(SW);
  return (r[SW] as Cloud[]) ?? [];
}
async function saveUserClouds(list: Cloud[]) {
  await chrome.storage.sync.set({ [SW]: list });
}

// 本地 favicon：favicon 权限 + _favicon 资源，走浏览器缓存，无网络/不被墙
function favUrl(url: string): string {
  return chrome.runtime.getURL('_favicon/?pageUrl=' + encodeURIComponent(url) + '&size=32');
}
function letterColor(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 360;
  return `hsl(${h},55%,55%)`;
}
function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}
/** 补全协议并归一为 origin（https://host），非法返回空串 */
function normalizeUrl(input: string): string {
  let u = input.trim();
  if (!u) return '';
  if (!/^https?:\/\//i.test(u)) u = 'https://' + u;
  try {
    return new URL(u).origin;
  } catch {
    return '';
  }
}

/** 校验链接可达：no-cors fetch，网络层不 reject 即视为可达 */
function checkReachable(url: string, timeoutMs = 6000): Promise<boolean> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  return fetch(url, {
    mode: 'no-cors',
    method: 'HEAD',
    signal: ctrl.signal,
    cache: 'no-store',
    redirect: 'follow',
  })
    .then(() => true)
    .catch(() => false)
    .finally(() => clearTimeout(timer));
}

/** 校验图标可获取：走 _favicon 服务（Chrome 抓取目标页 favicon，解析 <link rel=icon>，绕过站点 WAF / /favicon.ico 403），onload 即可获取 */
function checkFavicon(url: string, timeoutMs = 8000): Promise<boolean> {
  return new Promise((resolve) => {
    const img = new Image();
    const timer = setTimeout(() => {
      img.src = '';
      resolve(false);
    }, timeoutMs);
    img.onload = () => {
      clearTimeout(timer);
      resolve(img.naturalWidth > 0);
    };
    img.onerror = () => {
      clearTimeout(timer);
      resolve(false);
    };
    img.src = favUrl(url);
  });
}

/** favicon 加载失败 -> 首字母色块兜底 */
function bindFavFallback(scope: ParentNode) {
  scope.querySelectorAll('img.cloud-fav').forEach((img) => {
    const el = img as HTMLImageElement;
    if (el.dataset.bound) return;
    el.dataset.bound = '1';
    el.onerror = () => {
      const span = document.createElement('span');
      span.className = 'cloud-letter';
      span.style.background = el.dataset.color || '#999';
      span.textContent = el.dataset.letter || '?';
      el.replaceWith(span);
    };
  });
}

function tileHtml(c: Cloud, removable: boolean): string {
  const letter = (c.name.charAt(0) || '?').toUpperCase();
  const del = removable
    ? `<button class="cloud-del" data-url="${escAttr(c.url)}" title="移除" aria-label="移除"><svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/></svg></button>`
    : '';
  return `<a class="cloud-tile" href="${escAttr(c.url)}" target="_blank" rel="noopener" title="${escAttr(c.name)}">
      ${del}
      <img class="cloud-fav" src="${favUrl(c.url)}" data-letter="${escAttr(letter)}" data-color="${escAttr(letterColor(c.name))}" alt="" />
      <span class="cloud-name">${esc(c.name)}</span>
    </a>`;
}

function paint() {
  const grid = document.getElementById('cloudGrid');
  if (!grid) return;
  const all = [...CLOUDS, ...userClouds];
  grid.innerHTML = all.map((c, i) => tileHtml(c, i >= CLOUDS.length)).join('');
  bindFavFallback(grid);
  grid.querySelectorAll('.cloud-del').forEach((b) =>
    b.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      const url = (b as HTMLElement).dataset.url!;
      const item = userClouds.find((x) => x.url === url);
      if (!item) return;
      if (!(await confirmRemove(item.name))) return;
      userClouds = userClouds.filter((x) => x.url !== url);
      await saveUserClouds(userClouds);
      paint();
    }),
  );
}

function confirmRemove(name: string): Promise<boolean> {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'mo open';
    overlay.innerHTML = `<div class="ms" style="max-width:300px">
      <div class="mh"><span class="mt">移除云平台</span></div>
      <div class="modal-content" style="padding:16px 20px 20px">
        <div style="font-size:13px;color:var(--text);margin-bottom:16px;line-height:1.5">确定移除「${esc(name)}」?</div>
        <div style="display:flex;gap:8px">
          <button data-act="cancel" style="flex:1;padding:8px;font-size:13px;border:none;border-radius:var(--radius-xs);background:rgba(0,0,0,0.05);color:var(--text-secondary);cursor:pointer;font-family:inherit">取消</button>
          <button data-act="ok" style="flex:1;padding:8px;font-size:13px;border:none;border-radius:var(--radius-xs);background:#dc2626;color:#fff;cursor:pointer;font-family:inherit;font-weight:600">移除</button>
        </div>
      </div>
    </div>`;
    document.body.appendChild(overlay);
    const done = (ok: boolean) => {
      overlay.remove();
      resolve(ok);
    };
    overlay.querySelector('[data-act=cancel]')!.addEventListener('click', () => done(false));
    overlay.querySelector('[data-act=ok]')!.addEventListener('click', () => done(true));
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) done(false);
    });
  });
}

function promptAddCloud(): Promise<Cloud | null> {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'mo open';
    overlay.innerHTML = `<div class="ms" style="max-width:320px">
      <div class="mh"><span class="mt">添加云平台</span></div>
      <div class="modal-content" style="padding:16px 20px 20px">
        <input data-act="name" placeholder="名称，如 金山云" style="width:100%;padding:8px 10px;font-size:13px;border:none;border-radius:var(--radius-xs);background:rgba(0,0,0,0.05);color:var(--text);outline:none;font-family:inherit;box-sizing:border-box" />
        <input data-act="url" placeholder="链接，如 www.ksyun.com" style="width:100%;padding:8px 10px;font-size:13px;border:none;border-radius:var(--radius-xs);background:rgba(0,0,0,0.05);color:var(--text);outline:none;font-family:inherit;box-sizing:border-box;margin-top:8px" />
        <div data-act="err" style="font-size:11px;color:#dc2626;margin-top:6px;min-height:14px;line-height:1.4"></div>
        <div style="display:flex;gap:8px;margin-top:8px">
          <button data-act="cancel" style="flex:1;padding:8px;font-size:13px;border:none;border-radius:var(--radius-xs);background:rgba(0,0,0,0.05);color:var(--text-secondary);cursor:pointer;font-family:inherit">取消</button>
          <button data-act="ok" style="flex:1;padding:8px;font-size:13px;border:none;border-radius:var(--radius-xs);background:var(--accent);color:#fff;cursor:pointer;font-family:inherit;font-weight:600">校验并添加</button>
        </div>
      </div>
    </div>`;
    document.body.appendChild(overlay);
    const nameI = overlay.querySelector('[data-act=name]') as HTMLInputElement;
    const urlI = overlay.querySelector('[data-act=url]') as HTMLInputElement;
    const errEl = overlay.querySelector('[data-act=err]') as HTMLElement;
    const okBtn = overlay.querySelector('[data-act=ok]') as HTMLButtonElement;
    nameI.focus();
    const done = (val: Cloud | null) => {
      overlay.remove();
      resolve(val);
    };
    const resetBtn = () => {
      okBtn.disabled = false;
      okBtn.textContent = '校验并添加';
      errEl.style.color = '#dc2626';
    };
    const submit = async () => {
      const name = nameI.value.trim();
      const url = normalizeUrl(urlI.value);
      if (!name) {
        errEl.textContent = '请输入名称';
        return;
      }
      if (!url) {
        errEl.textContent = '链接格式不正确';
        return;
      }
      const dup = [...CLOUDS, ...userClouds].some((c) => hostOf(c.url) === hostOf(url));
      if (dup) {
        errEl.textContent = '该云平台已存在';
        return;
      }
      okBtn.disabled = true;
      okBtn.textContent = '校验中…';
      errEl.style.color = 'var(--text-tertiary)';
      errEl.textContent = '正在校验链接与图标…';
      const [reachable, icon] = await Promise.all([checkReachable(url), checkFavicon(url)]);
      if (!reachable) {
        resetBtn();
        errEl.textContent = '链接不可达，请检查网址';
        return;
      }
      if (!icon) {
        resetBtn();
        errEl.textContent = '图标获取失败';
        return;
      }
      done({ name, url });
    };
    overlay.querySelector('[data-act=cancel]')!.addEventListener('click', () => done(null));
    okBtn.addEventListener('click', submit);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter') submit();
      else if (e.key === 'Escape') done(null);
    };
    nameI.addEventListener('keydown', onKey);
    urlI.addEventListener('keydown', onKey);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) done(null);
    });
  });
}

async function add() {
  const res = await promptAddCloud();
  if (!res) return;
  userClouds = [...userClouds, res];
  await saveUserClouds(userClouds);
  paint();
}

export function renderCloudCard(): string {
  return `<div class="widget-card cloud-card">
      <div class="cloud-head">
        <div class="cloud-title"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/></svg>云平台</div>
        <button class="cloud-add-btn" id="cloudAddBtn" title="添加云平台">+ 添加</button>
      </div>
      <div class="cloud-grid" id="cloudGrid"></div>
    </div>`;
}

export async function initCloud() {
  userClouds = await loadUserClouds();
  paint();
  document.getElementById('cloudAddBtn')?.addEventListener('click', add);
}
