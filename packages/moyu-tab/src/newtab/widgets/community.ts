/** 社区/内容平台快捷入口：DEV/SO/36氪/B3log，点击新标签打开 */
import { esc, escAttr } from '../utils';

interface CommunitySite {
  name: string;
  url: string;
}

/** 公共社区与内容平台（你自己的账号在「我的」悬浮面板里） */
const COMMUNITIES: CommunitySite[] = [
  { name: 'DEV Community', url: 'https://dev.to/' },
  { name: 'Stack Overflow', url: 'https://stackoverflow.com/' },
  { name: '36氪', url: 'https://36kr.com/' },
  { name: 'B3log', url: 'https://b3log.org/' },
];

// 本地 favicon：favicon 权限 + _favicon 资源，走浏览器缓存，无网络/不被墙
function favUrl(url: string): string {
  return chrome.runtime.getURL('_favicon/?pageUrl=' + encodeURIComponent(url) + '&size=32');
}
function letterColor(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 360;
  return `hsl(${h},55%,55%)`;
}

/** favicon 加载失败 -> 首字母色块兜底 */
function bindFavFallback(scope: ParentNode) {
  scope.querySelectorAll('img.community-fav').forEach((img) => {
    const el = img as HTMLImageElement;
    if (el.dataset.bound) return;
    el.dataset.bound = '1';
    el.onerror = () => {
      const span = document.createElement('span');
      span.className = 'community-letter';
      span.style.background = el.dataset.color || '#999';
      span.textContent = el.dataset.letter || '?';
      el.replaceWith(span);
    };
  });
}

function tileHtml(c: CommunitySite): string {
  const letter = (c.name.charAt(0) || '?').toUpperCase();
  return `<a class="community-tile" href="${escAttr(c.url)}" target="_blank" rel="noopener" title="${escAttr(c.name)}">
      <img class="community-fav" src="${favUrl(c.url)}" data-letter="${escAttr(letter)}" data-color="${escAttr(letterColor(c.name))}" alt="" />
      <span class="community-name">${esc(c.name)}</span>
    </a>`;
}

function paint() {
  const grid = document.getElementById('communityGrid');
  if (!grid) return;
  grid.innerHTML = COMMUNITIES.map(tileHtml).join('');
  bindFavFallback(grid);
}

export function renderCommunityCard(): string {
  return `<div class="widget-card community-card">
      <div class="community-head">
        <div class="community-title"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>社区</div>
      </div>
      <div class="community-grid" id="communityGrid"></div>
    </div>`;
}

export async function initCommunity() {
  paint();
}
