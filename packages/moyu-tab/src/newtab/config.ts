/** 静态配置：图标、分类树、组件元数据、共享类型 */

export interface SubCat {
  id: string;
  name: string;
}
export interface TopCat {
  id: string;
  name: string;
  icon: string;
  subs: SubCat[];
}
export interface WID {
  id: string;
  name: string;
  desc: string;
  cat: string;
  sub: string;
}

function svg(p: string) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${p}</svg>`;
}

export const ICONS: Record<string, string> = {
  life: svg(
    '<circle cx="12" cy="12" r="4"/><path d="M12 3v2M12 19v2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M3 12h2M19 12h2M5.6 18.4l1.4-1.4M17 7l1.4-1.4"/>',
  ),
  news: svg(
    '<path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/>',
  ),
  fun: svg(
    '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>',
  ),
  work: svg(
    '<rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>',
  ),
  study: svg(
    '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>',
  ),
  ai: svg(
    '<path d="M12 3l1.9 4.6L18.5 9.5l-4.6 1.9L12 16l-1.9-4.6L5.5 9.5l4.6-1.9z"/><path d="M19 14l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z"/>',
  ),
  tools: svg(
    '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>',
  ),
  bookmark: svg('<path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>'),
};

export const CAT_TREE: TopCat[] = [
  {
    id: 'news',
    name: '资讯',
    icon: ICONS.news,
    subs: [
      { id: 'hot', name: '热搜' },
      { id: 'news', name: '资讯' },
      { id: 'community', name: '社区' },
      { id: 'stats', name: '网站统计' },
    ],
  },
  {
    id: 'study',
    name: '学习',
    icon: ICONS.study,
    subs: [
      { id: 'wiki', name: '百科' },
      { id: 'read', name: '读书' },
    ],
  },
  {
    id: 'ai',
    name: 'AI',
    icon: ICONS.ai,
    subs: [{ id: 'ai', name: 'AI 全栈' }],
  },
  {
    id: 'bookmark',
    name: '书签',
    icon: ICONS.bookmark,
    subs: [
      { id: 'devnav', name: '开发导航' },
      { id: 'toolbox', name: '前端工具箱' },
      { id: 'cloud', name: '云平台' },
      { id: 'translate', name: '翻译' },
    ],
  },
  {
    id: 'life',
    name: '生活',
    icon: ICONS.life,
    subs: [{ id: 'food', name: '今天吃什么' }],
  },
];

export const ALL_WIDGETS: WID[] = [
  { id: 'hot', name: '热搜', desc: '微博/B站/百度/掘金热榜', cat: 'news', sub: 'hot' },
  { id: 'news', name: '资讯', desc: 'AI精选/知乎日报/财经快讯', cat: 'news', sub: 'news' },
  {
    id: 'community',
    name: '社区',
    desc: 'DEV/Stack Overflow/36氪/B3log',
    cat: 'news',
    sub: 'community',
  },
  {
    id: 'weread',
    name: '微信读书',
    desc: '书架/统计/笔记/书评/推荐/搜书',
    cat: 'study',
    sub: 'read',
  },
  { id: 'cloud', name: '云平台', desc: '七牛/华为/腾讯/阿里/百度', cat: 'bookmark', sub: 'cloud' },
  {
    id: 'translate',
    name: '翻译平台',
    desc: '有道/DeepL/彩云/搜狗/金山词霸/CNKI',
    cat: 'bookmark',
    sub: 'translate',
  },
  {
    id: 'ai',
    name: 'AI 全栈',
    desc: 'LLM/Agent/RAG/AIGC 导航',
    cat: 'ai',
    sub: 'ai',
  },
  {
    id: 'devnav',
    name: '开发导航',
    desc: '语言/框架/样式/后端/面试 全量可搜',
    cat: 'bookmark',
    sub: 'devnav',
  },
  {
    id: 'toolbox',
    name: '前端工具箱',
    desc: 'CSS 生成器 / 图片 / Playground',
    cat: 'bookmark',
    sub: 'toolbox',
  },
  { id: 'food', name: '今天吃什么', desc: '随机推荐一道菜', cat: 'life', sub: 'food' },
  { id: 'stats', name: '网站统计', desc: '今日上网时长排行', cat: 'news', sub: 'stats' },
];
