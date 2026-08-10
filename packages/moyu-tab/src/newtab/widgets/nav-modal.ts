/**
 * 通用导航大弹窗：左侧分类树 + 右侧分组网格 + 全局搜索。
 * 三张卡（AI 全栈 / 前端工具箱 / 开发导航）共用，卡片按钮调用 openNavModal(id?)。
 */
import { esc, escAttr } from '../utils';
import { NAV_GROUPS, flatAll, findGroup, type NavLink } from './nav-data';

const MODAL_ID = 'navModal';
let modalEl: HTMLElement | null = null;
let curGroup = 'ai';
let query = '';

function favUrl(url: string): string {
  return chrome.runtime.getURL('_favicon/?pageUrl=' + encodeURIComponent(url) + '&size=32');
}
function letterColor(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 360;
  return `hsl(${h},55%,55%)`;
}
function letterOf(l: NavLink): string {
  return (l.letter || l.name.charAt(0) || '?').toUpperCase();
}

function tileHtml(l: NavLink): string {
  const letter = letterOf(l);
  return `<a class="nv-tile" href="${escAttr(l.url)}" target="_blank" rel="noopener" title="${escAttr(l.name)}">
    <img class="nv-fav" src="${favUrl(l.url)}" data-letter="${escAttr(letter)}" data-color="${escAttr(l.color || letterColor(l.name))}" alt="" />
    <span class="nv-name">${esc(l.name)}</span>
  </a>`;
}

function bindFavFallback(scope: ParentNode) {
  scope.querySelectorAll('img.nv-fav').forEach((img) => {
    const el = img as HTMLImageElement;
    if (el.dataset.bound) return;
    el.dataset.bound = '1';
    el.onerror = () => {
      const span = document.createElement('span');
      span.className = 'nv-letter';
      span.style.background = el.dataset.color || '#999';
      span.textContent = el.dataset.letter || '?';
      el.replaceWith(span);
    };
  });
}

function sidebarHtml(): string {
  return NAV_GROUPS.map(
    (g) =>
      `<button class="nv-sb${g.id === curGroup ? ' active' : ''}" data-g="${g.id}" type="button">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${g.icon}</svg>
        <span>${esc(g.name)}</span>
      </button>`,
  ).join('');
}

function groupHtml(id: string): string {
  const g = findGroup(id);
  if (!g) return '';
  return g.sections
    .map(
      (s) =>
        `<section class="nv-sec">
          <div class="nv-sec-title">${esc(s.title)}</div>
          <div class="nv-grid">${s.links.map(tileHtml).join('')}</div>
        </section>`,
    )
    .join('');
}

function searchHtml(q: string): string {
  const k = q.trim().toLowerCase();
  const matched = flatAll()
    .filter(
      (x) =>
        x.link.name.toLowerCase().includes(k) ||
        x.link.url.toLowerCase().includes(k) ||
        x.group.toLowerCase().includes(k) ||
        x.section.toLowerCase().includes(k),
    )
    .slice(0, 60);
  if (!matched.length) return `<div class="nv-empty">无匹配结果</div>`;
  return `<section class="nv-sec">
    <div class="nv-sec-title">搜索结果（${matched.length}）</div>
    <div class="nv-list">
      ${matched
        .map(
          (
            x,
          ) => `<a class="nv-row" href="${escAttr(x.link.url)}" target="_blank" rel="noopener" title="${escAttr(x.link.name)}">
        <img class="nv-fav-sm" src="${favUrl(x.link.url)}" data-letter="${escAttr(letterOf(x.link))}" data-color="${escAttr(x.link.color || letterColor(x.link.name))}" alt="" />
        <span class="nv-row-main"><span class="nv-row-title">${esc(x.link.name)}</span><span class="nv-row-path">${esc(x.group)} · ${esc(x.section)}</span></span>
      </a>`,
        )
        .join('')}
    </div>
  </section>`;
}

function render() {
  if (!modalEl) return;
  modalEl.querySelector<HTMLElement>('[data-nv=sb]')!.innerHTML = sidebarHtml();
  const content = modalEl.querySelector<HTMLElement>('[data-nv=content]')!;
  content.innerHTML = query.trim() ? searchHtml(query) : groupHtml(curGroup);
  bindFavFallback(content);
  const titleEl = modalEl.querySelector<HTMLElement>('[data-nv=title]');
  if (titleEl) {
    const g = findGroup(curGroup);
    titleEl.textContent = query.trim() ? '搜索导航' : g ? g.name : '导航';
  }
  modalEl.querySelectorAll<HTMLElement>('.nv-sb').forEach((b) =>
    b.addEventListener('click', () => {
      curGroup = b.dataset.g!;
      query = '';
      const input = modalEl!.querySelector<HTMLInputElement>('[data-nv=search]');
      if (input) input.value = '';
      render();
    }),
  );
}

function ensureModal(): HTMLElement {
  if (modalEl) return modalEl;
  const el = document.createElement('div');
  el.className = 'mo';
  el.id = MODAL_ID;
  el.innerHTML = `<div class="ms nv-ms">
    <div class="mh">
      <span class="mt" data-nv="title">导航</span>
      <input class="nv-search" data-nv="search" type="search" placeholder="搜索全部链接…" autocomplete="off" />
      <button class="mc" data-nv="close" type="button">✕</button>
    </div>
    <div class="modal-split">
      <div class="modal-sidebar nv-sidebar" data-nv="sb"></div>
      <div class="modal-content nv-content" data-nv="content"></div>
    </div>
  </div>`;
  document.body.appendChild(el);
  el.querySelector('[data-nv=close]')!.addEventListener('click', () => closeNavModal());
  el.addEventListener('click', (e) => {
    if (e.target === el) closeNavModal();
  });
  const input = el.querySelector<HTMLInputElement>('[data-nv=search]')!;
  input.addEventListener('input', () => {
    query = input.value;
    render();
  });
  document.addEventListener('keydown', onKey);
  modalEl = el;
  return el;
}

function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape' && modalEl?.classList.contains('open')) closeNavModal();
}

export function openNavModal(groupId?: string) {
  if (groupId) curGroup = groupId;
  query = '';
  const el = ensureModal();
  const input = el.querySelector<HTMLInputElement>('[data-nv=search]')!;
  input.value = '';
  render();
  el.classList.add('open');
  // 下一帧聚焦搜索框，方便直接键入
  requestAnimationFrame(() => input.focus());
}

export function closeNavModal() {
  modalEl?.classList.remove('open');
}
