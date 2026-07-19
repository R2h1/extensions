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
  finance: svg('<path d="M3 17l6-6 4 4 8-8"/><path d="M21 7v6h-6"/>'),
  tools: svg(
    '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>',
  ),
  games: svg(
    '<rect x="3" y="3" width="18" height="18" rx="3"/><path d="M8 8h.01M16 8h.01M8 16h.01M16 16h.01M12 12h.01"/>',
  ),
};

export const CAT_TREE: TopCat[] = [
  {
    id: 'life',
    name: '生活',
    icon: ICONS.life,
    subs: [
      { id: 'weather', name: '天气' },
      { id: 'calendar', name: '日历' },
      { id: 'trip', name: '出行' },
    ],
  },
  {
    id: 'news',
    name: '资讯',
    icon: ICONS.news,
    subs: [
      { id: 'hot', name: '热搜' },
      { id: 'news', name: '新闻' },
      { id: 'flash', name: '快讯' },
    ],
  },
  {
    id: 'fun',
    name: '娱乐',
    icon: ICONS.fun,
    subs: [
      { id: 'joke', name: '段子' },
      { id: 'merit', name: '功德' },
      { id: 'media', name: '影音' },
      { id: 'read', name: '阅读' },
    ],
  },
  {
    id: 'work',
    name: '工作',
    icon: ICONS.work,
    subs: [
      { id: 'salary', name: '薪资' },
      { id: 'effi', name: '效率' },
      { id: 'office', name: '办公' },
    ],
  },
  {
    id: 'study',
    name: '学习',
    icon: ICONS.study,
    subs: [
      { id: 'wiki', name: '百科' },
      { id: 'dict', name: '词典' },
      { id: 'course', name: '课程' },
    ],
  },
  {
    id: 'finance',
    name: '理财',
    icon: ICONS.finance,
    subs: [
      { id: 'market', name: '行情' },
      { id: 'stock', name: '股市' },
      { id: 'rate', name: '汇率' },
      { id: 'account', name: '记账' },
    ],
  },
  {
    id: 'tools',
    name: '工具',
    icon: ICONS.tools,
    subs: [
      { id: 'nav', name: '导航' },
      { id: 'conv', name: '换算' },
      { id: 'calc', name: '计算' },
    ],
  },
  {
    id: 'games',
    name: '游戏',
    icon: ICONS.games,
    subs: [
      { id: 'puzzle', name: '益智' },
      { id: 'casual', name: '休闲' },
    ],
  },
];

export const ALL_WIDGETS: WID[] = [
  { id: 'weather', name: '天气', desc: '实时天气', cat: 'life', sub: 'weather' },
  { id: 'holiday', name: '节假日倒计时', desc: '距下次放假', cat: 'life', sub: 'trip' },
  { id: 'calendar', name: '日历', desc: '月历+农历', cat: 'life', sub: 'calendar' },
  { id: 'hot_weibo', name: '微博热搜', desc: '微博实时热搜', cat: 'news', sub: 'hot' },
  { id: 'hot_bilibili', name: 'B站热搜', desc: 'B站实时热搜', cat: 'news', sub: 'hot' },
  { id: 'hot_baidu', name: '百度热搜', desc: '百度实时热搜', cat: 'news', sub: 'hot' },
  { id: 'juejin', name: '掘金热榜', desc: '掘金热门文章', cat: 'news', sub: 'news' },
  { id: 'zhihu', name: '知乎日报', desc: '每日精选', cat: 'news', sub: 'news' },
  { id: 'sina_flash', name: '7x24快讯', desc: '财经实时快讯', cat: 'news', sub: 'flash' },
  { id: 'quote', name: '语录', desc: '随机摸鱼语录', cat: 'fun', sub: 'joke' },
  { id: 'fish', name: '功德', desc: '敲木鱼计数器', cat: 'fun', sub: 'merit' },
  { id: 'tv', name: '视频', desc: '视频网站', cat: 'fun', sub: 'media' },
  { id: 'music', name: '音乐', desc: '音乐播放器', cat: 'fun', sub: 'media' },
  { id: 'weread', name: '微信读书', desc: '我的书架', cat: 'fun', sub: 'read' },
  { id: 'readdata', name: '阅读统计', desc: '本月阅读数据', cat: 'fun', sub: 'read' },
  { id: 'recommend', name: '为你推荐', desc: '个性化推荐', cat: 'fun', sub: 'read' },
  { id: 'notes', name: '我的笔记', desc: '笔记与划线', cat: 'fun', sub: 'read' },
  { id: 'review', name: '书评', desc: '最近在读书评', cat: 'fun', sub: 'read' },
  { id: 'search', name: '搜书', desc: '搜索书城', cat: 'fun', sub: 'read' },
  { id: 'salary', name: '薪资跳动', desc: '实时薪资计数器', cat: 'work', sub: 'salary' },
  { id: 'gold', name: '金价', desc: '实时黄金价格', cat: 'finance', sub: 'market' },
  { id: 'fund', name: '基金', desc: '实时基金估值', cat: 'finance', sub: 'market' },
  { id: 'links', name: '网址', desc: '常用快捷网址', cat: 'tools', sub: 'nav' },
  { id: 'tax', name: '个税计算器', desc: '月薪到手税后', cat: 'tools', sub: 'calc' },
  { id: 'mortgage', name: '房贷计算器', desc: '等额本息/本金', cat: 'tools', sub: 'calc' },
  { id: 'bmi', name: 'BMI 计算器', desc: '身体质量指数', cat: 'tools', sub: 'calc' },
  { id: 'currency', name: '汇率换算', desc: '实时汇率换算', cat: 'tools', sub: 'conv' },
];
