/**
 * 三张导航卡：AI 全栈 / 前端工具箱 / 开发导航。
 * 卡片上只露高频入口，"更多"打开通用大弹窗（nav-modal）查看全量并搜索。
 * 用于取代直接镜像 Chrome 书签的 bookmarks.ts。
 */
import { esc, escAttr } from '../utils';
import { openNavModal } from './nav-modal';
import type { NavLink } from './nav-data';

function favUrl(url: string): string {
  return chrome.runtime.getURL('_favicon/?pageUrl=' + encodeURIComponent(url) + '&size=32');
}
function letterColor(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 360;
  return `hsl(${h},55%,55%)`;
}
function tileHtml(l: NavLink, sm = false): string {
  const letter = (l.letter || l.name.charAt(0) || '?').toUpperCase();
  const favCls = sm ? 'nv-fav-sm' : 'nv-fav';
  const letterCls = sm ? 'nv-letter-sm' : 'nv-letter';
  return `<a class="nv-tile" href="${escAttr(l.url)}" target="_blank" rel="noopener" title="${escAttr(l.name)}">
    <img class="${favCls}" src="${favUrl(l.url)}" data-letter="${escAttr(letter)}" data-color="${escAttr(l.color || letterColor(l.name))}" data-letter-cls="${letterCls}" alt="" />
    <span class="nv-name">${esc(l.name)}</span>
  </a>`;
}
function bindFav(scope: ParentNode) {
  scope.querySelectorAll('img.nv-fav,img.nv-fav-sm').forEach((img) => {
    const el = img as HTMLImageElement;
    if (el.dataset.bound) return;
    el.dataset.bound = '1';
    el.onerror = () => {
      const span = document.createElement('span');
      span.className = el.dataset.letterCls || 'nv-letter';
      span.style.background = el.dataset.color || '#999';
      span.textContent = el.dataset.letter || '?';
      el.replaceWith(span);
    };
  });
}

function head(title: string, svg: string, moreGroup?: string): string {
  const more = moreGroup
    ? `<button class="nv-more" data-nv-more="${moreGroup}" type="button" title="查看全部 / 搜索">更多 →</button>`
    : '';
  return `<div class="nv-head"><div class="nv-title"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${svg}</svg>${esc(title)}</div>${more}</div>`;
}

// ── AI 全栈：卡片露 9 个核心，更多开弹窗 ai 组 ──
const AI_FEATURED: NavLink[] = [
  { name: 'Anthropic', url: 'https://www.anthropic.com/', color: '#d97706' },
  { name: 'DeepSeek', url: 'https://www.deepseek.com/', color: '#4d6bfe' },
  { name: 'Vercel AI SDK', url: 'https://sdk.vercel.ai/', color: '#111' },
  { name: 'LangChain.js', url: 'https://js.langchain.com/', color: '#10a37f' },
  { name: 'Mastra', url: 'https://mastra.ai/', color: '#6d28d9' },
  { name: 'crawl4ai', url: 'https://github.com/unclecode/crawl4ai', color: '#0ea5e9', letter: 'C' },
  {
    name: 'browser-use',
    url: 'https://github.com/browser-use/browser-use',
    color: '#2563eb',
    letter: 'B',
  },
  { name: 'Stagehand', url: 'https://www.stagehand.dev/', color: '#7c3aed' },
];
const AI_CHIPS: NavLink[] = [
  { name: 'AIHOT', url: 'https://aihot.virxact.com/', color: '#ef4444' },
  { name: 'AI 工具集', url: 'https://ai-bot.cn/', color: '#0ea5e9' },
  { name: 'n8n 自动化', url: 'https://github.com/n8n-io/n8n', color: '#ea4b71' },
];

export function renderAiCard(): string {
  return `<div class="widget-card nv-card ai-card">
    ${head('AI 全栈', '<path d="M12 3l1.9 4.6L18.5 9.5l-4.6 1.9L12 16l-1.9-4.6L5.5 9.5l4.6-1.9z"/><path d="M19 14l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z"/><path d="M5 16l.6 1.4L7 18l-1.4.6L5 20l-.6-1.4L3 18l1.4-.6z"/>', 'ai')}
    <div class="nv-grid">${AI_FEATURED.map((l) => tileHtml(l)).join('')}</div>
    <div class="nv-chips">${AI_CHIPS.map(
      (l) =>
        `<a class="nv-chip" href="${escAttr(l.url)}" target="_blank" rel="noopener" title="${escAttr(l.name)}"><span class="nv-chip-dot" style="background:${l.color}"></span>${esc(l.name)}</a>`,
    ).join('')}</div>
  </div>`;
}

// ── 前端工具箱：CSS 生成器 / 图片 / Playground 三块高频 ──
const TOOL_CSS: NavLink[] = [
  { name: 'Grabient', url: 'https://grabient.com/', color: '#8b5cf6' },
  { name: 'Flexbox', url: 'https://loading.io/flexbox/', color: '#16a34a' },
  { name: 'Grid', url: 'https://grid.layoutit.com/', color: '#db2777' },
  {
    name: 'Box Shadow',
    url: 'https://cssgenerator.org/box-shadow-css-generator.html',
    color: '#475569',
  },
  { name: '缓动函数', url: 'https://easings.net/zh-cn', color: '#0ea5e9' },
  { name: 'cubic-bezier', url: 'https://cubic-bezier.com/', color: '#f59e0b' },
];
const TOOL_IMG: NavLink[] = [
  { name: 'Squoosh', url: 'https://squoosh.app/', color: '#db2777' },
  { name: 'TinyPNG', url: 'https://tinypng.com/', color: '#111' },
  { name: 'Carbon', url: 'https://carbon.now.sh/', color: '#111' },
];
const TOOL_PLAY: NavLink[] = [
  { name: 'CodePen', url: 'https://codepen.io/', color: '#000' },
  { name: 'TS Playground', url: 'https://www.typescriptlang.org/zh/play', color: '#3178c6' },
  { name: 'AST explorer', url: 'https://astexplorer.net/', color: '#111' },
  { name: '正则备忘', url: 'https://ihateregex.io/', color: '#db2777' },
  { name: 'perf.link', url: 'https://perf.link/', color: '#4f46e5' },
  { name: 'HTML→JSX', url: 'https://transform.tools/html-to-jsx', color: '#111' },
];
function toolBlock(label: string, links: NavLink[]): string {
  return `<div class="nv-toolblock"><span class="nv-tool-label">${esc(label)}</span><div class="nv-mini">${links
    .map((l) => tileHtml(l, true))
    .join('')}</div></div>`;
}
export function renderToolboxCard(): string {
  return `<div class="widget-card nv-card toolbox-card">
    ${head('前端工具箱', '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94z"/>', 'style')}
    ${toolBlock('CSS 生成器', TOOL_CSS)}
    ${toolBlock('图片 / 截图', TOOL_IMG)}
    ${toolBlock('Playground', TOOL_PLAY)}
  </div>`;
}

// ── 开发导航中枢：分类快捷入口 + 搜索 ──
const HUB_CATS: { id: string; name: string; color: string; icon: string }[] = [
  {
    id: 'lang',
    name: '语言基础',
    color: '#f7df1e',
    icon: '<polyline points="4 7 4 4 20 4 20 7"/><line x1="12" y1="4" x2="12" y2="20"/>',
  },
  {
    id: 'framework',
    name: '框架视图',
    color: '#149eca',
    icon: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/>',
  },
  {
    id: 'style',
    name: '样式 UI',
    color: '#1572b6',
    icon: '<circle cx="12" cy="12" r="9"/><path d="M12 3v18"/><path d="M3 12h18"/>',
  },
  {
    id: 'tooling',
    name: '工程化',
    color: '#4f46e5',
    icon: '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94z"/>',
  },
  {
    id: 'backend',
    name: 'Node 后端',
    color: '#339933',
    icon: '<rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>',
  },
  {
    id: 'news',
    name: '资讯博客',
    color: '#1682ef',
    icon: '<path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2z"/>',
  },
  {
    id: 'interview',
    name: '面试求职',
    color: '#ef4444',
    icon: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>',
  },
  {
    id: 'life',
    name: '生活实用',
    color: '#ec4899',
    icon: '<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>',
  },
];
// 研报 · 数据（原行情卡「研报 · 数据」区迁入）
const RESEARCH_LINKS: NavLink[] = [
  { name: '行行查', url: 'https://www.hanghangcha.com/', color: '#0ea5e9' },
  {
    name: '晨星网',
    url: 'https://www.morningstar.cn/main/default.aspx',
    color: '#d97706',
  },
  { name: '洞见研报', url: 'https://www.djyanbao.com/index', color: '#059669' },
  {
    name: '蛋卷指数',
    url: 'https://danjuanapp.com/index-detail/SH000016',
    color: '#ef4444',
  },
];
export function renderNavHubCard(): string {
  const cats = HUB_CATS.map(
    (c) =>
      `<button class="nv-hub-cat" data-nv-g="${c.id}" type="button" title="${escAttr(c.name)}">
        <span class="nv-hub-ico" style="background:${c.color}1a;color:${c.color}">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${c.icon}</svg>
        </span>
        <span class="nv-hub-name">${esc(c.name)}</span>
      </button>`,
  ).join('');
  return `<div class="widget-card nv-card nv-hub">
    ${head('开发导航', '<circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>')}
    <button class="nv-search-btn" data-nv-search type="button">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
      <span>搜索全部链接…</span>
    </button>
    <div class="nv-hub-grid">${cats}</div>
    <div class="nv-research">
      <div class="nv-research-title">研报 · 数据</div>
      <div class="nv-chips">${RESEARCH_LINKS.map(
        (l) =>
          `<a class="nv-chip" href="${escAttr(l.url)}" target="_blank" rel="noopener" title="${escAttr(l.name)}"><span class="nv-chip-dot" style="background:${l.color}"></span>${esc(l.name)}</a>`,
      ).join('')}</div>
    </div>
  </div>`;
}

let navCardsBound = false;
export async function initNavCards(root: ParentNode = document) {
  bindFav(root);
  if (navCardsBound) return;
  // 事件委托：卡片随面板重渲染会被整体替换，绑在 document 上一次即可
  document.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    const more = target.closest<HTMLElement>('[data-nv-more]');
    if (more) {
      openNavModal(more.dataset.nvMore!);
      return;
    }
    const cat = target.closest<HTMLElement>('[data-nv-g]');
    if (cat) {
      openNavModal(cat.dataset.nvG!);
      return;
    }
    if (target.closest('[data-nv-search]')) openNavModal('ai');
  });
  navCardsBound = true;
}
