/**
 * 策展导航数据：取代直接读取 chrome.bookmarks 的临时方案。
 * 所有链接经过人工筛选（去重/去过期/去无关），按大类→分组组织。
 * 三张卡（AI 全栈 / 前端工具箱 / 开发导航）共用这棵树 + 同一个大弹窗。
 */

export interface NavLink {
  name: string;
  url: string;
  /** 自定义色块颜色；不填则用 favicon */
  color?: string;
  /** 自定义色块字母；不填则取 name 首字 */
  letter?: string;
}
export interface NavSection {
  title: string;
  links: NavLink[];
}
export interface NavGroup {
  id: string;
  name: string;
  /** 线性 SVG path（stroke=currentColor），24x24 */
  icon: string;
  sections: NavSection[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    id: 'ai',
    name: 'AI 全栈',
    icon: '<path d="M12 3l1.9 4.6L18.5 9.5l-4.6 1.9L12 16l-1.9-4.6L5.5 9.5l4.6-1.9z"/><path d="M19 14l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z"/><path d="M5 16l.6 1.4L7 18l-1.4.6L5 20l-.6-1.4L3 18l1.4-.6z"/>',
    sections: [
      {
        title: 'LLM 厂商 / 对话',
        links: [
          { name: 'Anthropic', url: 'https://www.anthropic.com/', color: '#d97706' },
          { name: 'DeepSeek', url: 'https://www.deepseek.com/', color: '#4d6bfe' },
          { name: 'OpenAI', url: 'https://platform.openai.com/', color: '#10a37f' },
          { name: 'Forefront', url: 'https://chat.forefront.ai/', color: '#7c3aed' },
          { name: 'BAI Chat', url: 'https://chatbot.theb.ai/', color: '#0ea5e9' },
          { name: '莓用 AI', url: 'https://ai.usesless.com/', color: '#16a34a' },
          { name: 'Vercel AI SDK', url: 'https://sdk.vercel.ai/', color: '#111' },
          { name: 'Anthropic 文档', url: 'https://docs.anthropic.com/', color: '#d97706' },
        ],
      },
      {
        title: 'Agent / 编排 / 浏览器自动化',
        links: [
          {
            name: 'crawl4ai',
            url: 'https://github.com/unclecode/crawl4ai',
            color: '#0ea5e9',
            letter: 'C',
          },
          {
            name: 'browser-use',
            url: 'https://github.com/browser-use/browser-use',
            color: '#2563eb',
            letter: 'B',
          },
          { name: 'Stagehand', url: 'https://www.stagehand.dev/', color: '#7c3aed' },
          {
            name: 'UI-TARS',
            url: 'https://github.com/bytedance/UI-TARS-desktop',
            color: '#dc2626',
          },
          { name: 'Automa', url: 'https://github.com/AutomaApp/automa', color: '#0891b2' },
          { name: 'n8n', url: 'https://github.com/n8n-io/n8n', color: '#ea4b71' },
          { name: 'LangChain.js', url: 'https://js.langchain.com/', color: '#10a37f' },
          { name: 'Mastra', url: 'https://mastra.ai/', color: '#6d28d9' },
          { name: 'Inngest', url: 'https://www.inngest.com/', color: '#0ea5e9' },
          { name: 'AirCode', url: 'https://aircode.io/', color: '#2563eb' },
          { name: 'ECC', url: 'https://github.com/affaan-m/ECC', color: '#475569' },
          {
            name: '深入理解 AI Agent',
            url: 'https://bojieli.github.io/ai-agent-book/',
            color: '#b45309',
          },
        ],
      },
      {
        title: 'RAG / 应用 / 模板',
        links: [
          { name: 'ChatDOC', url: 'https://chatdoc.com/', color: '#0ea5e9' },
          {
            name: 'Code Reviewer Skill',
            url: 'https://www.aitmpl.com/component/skill/development/code-reviewer',
            color: '#475569',
          },
          { name: 'Locofy 设计转码', url: 'https://www.locofy.ai/', color: '#7c3aed' },
        ],
      },
      {
        title: 'AIGC（视频/音频/图像）',
        links: [
          { name: 'bark (TTS)', url: 'https://github.com/suno-ai/bark', color: '#ef4444' },
          { name: 'Noiz AI TTS', url: 'https://noiz.ai/landing', color: '#0ea5e9' },
          { name: 'Viggle AI', url: 'https://viggle.ai/home', color: '#7c3aed' },
          {
            name: 'EMO',
            url: 'https://humanaigc.github.io/emote-portrait-alive/',
            color: '#dc2626',
          },
          { name: '闪剪数字人', url: 'https://app.shanjian.tv/', color: '#2563eb' },
          { name: 'Runway', url: 'https://app.runwayml.com/', color: '#111' },
          {
            name: 'MoneyPrinterTurbo',
            url: 'https://github.com/harry0703/MoneyPrinterTurbo',
            color: '#dc2626',
          },
          {
            name: 'webnovel-writer',
            url: 'https://github.com/lingfengQAQ/webnovel-writer',
            color: '#6d28d9',
          },
        ],
      },
      {
        title: '导航 / 资讯 / 学习',
        links: [
          { name: 'WaytoAGI 提示词', url: 'https://www.waytoagi.com/zh/prompts', color: '#16a34a' },
          { name: 'AIHOT', url: 'https://aihot.virxact.com/', color: '#ef4444' },
          { name: 'AI 工具集', url: 'https://ai-bot.cn/', color: '#0ea5e9' },
          { name: 'ChatGPT 调教指南', url: 'https://chatguide.plexpt.com/', color: '#10b981' },
          {
            name: '免费 ChatGPT 镜像',
            url: 'https://github.com/LiLittleCat/awesome-free-chatgpt',
            color: '#10b981',
          },
          { name: 'VibeVibe', url: 'https://www.vibevibe.cn/', color: '#6d28d9' },
          { name: 'cclog', url: 'https://cclog.vibeapi.cn/', color: '#475569' },
          {
            name: 'KunTab-AI 新标签页',
            url: 'https://github.com/quin95/KunTab-AI',
            color: '#16a34a',
          },
          { name: 'Jack Cui', url: 'https://cuijiahua.com/', color: '#dc2626' },
        ],
      },
    ],
  },
  {
    id: 'lang',
    name: '语言基础',
    icon: '<polyline points="4 7 4 4 20 4 20 7"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/>',
    sections: [
      {
        title: 'JavaScript',
        links: [
          { name: 'MDN', url: 'https://developer.mozilla.org/zh-CN/', color: '#000' },
          { name: '现代 JavaScript 教程', url: 'https://zh.javascript.info/', color: '#ef4444' },
          { name: 'web.dev', url: 'https://web.dev/', color: '#1a73e8' },
          { name: '30 seconds of code', url: 'https://www.30secondsofcode.org/', color: '#111' },
          { name: 'docschina', url: 'https://docschina.org/', color: '#e60012' },
          { name: 'coderutil', url: 'https://www.coderutil.com/', color: '#0ea5e9' },
        ],
      },
      {
        title: 'TypeScript',
        links: [
          {
            name: 'TS 官方文档',
            url: 'https://www.typescriptlang.org/zh/docs/handbook/tsconfig-json.html',
            color: '#3178c6',
          },
          {
            name: 'TS Playground',
            url: 'https://www.typescriptlang.org/zh/play',
            color: '#3178c6',
          },
          {
            name: 'DefinitelyTyped',
            url: 'https://github.com/DefinitelyTyped/DefinitelyTyped',
            color: '#9b4f96',
          },
          { name: 'type-fest', url: 'https://github.com/sindresorhus/type-fest', color: '#ef4444' },
          {
            name: 'type-challenges',
            url: 'https://github.com/type-challenges/type-challenges',
            color: '#3178c6',
          },
        ],
      },
      {
        title: '常用 JS 库',
        links: [
          { name: 'immer', url: 'https://github.com/immerjs/immer', color: '#00e7c3' },
          { name: 'nanoid', url: 'https://github.com/ai/nanoid', color: '#ec4899' },
          { name: 'decimal.js', url: 'https://github.com/MikeMcl/decimal.js', color: '#f59e0b' },
          {
            name: 'number-precision',
            url: 'https://github.com/nefe/number-precision',
            color: '#475569',
          },
          { name: 'howler.js', url: 'https://howlerjs.com/', color: '#111' },
          {
            name: 'screenfull',
            url: 'https://github.com/sindresorhus/screenfull',
            color: '#475569',
          },
          {
            name: 'node-html-parser',
            url: 'https://github.com/taoqf/node-html-parser',
            color: '#10b981',
          },
          { name: 'Format.JS', url: 'https://formatjs.io/', color: '#ef4444' },
          { name: 'JSDoc', url: 'https://jsdoc.app/', color: '#111' },
          { name: 'chroma.js', url: 'https://vis4.net/chromajs/', color: '#d97706' },
          {
            name: 'Color Thief',
            url: 'https://lokeshdhakar.com/projects/color-thief/',
            color: '#6d28d9',
          },
          { name: 'ethers.js', url: 'https://github.com/ethers-io/ethers.js/', color: '#6d67d4' },
          { name: '100px 抽奖插件', url: 'https://100px.net/', color: '#ef4444' },
          { name: 'zTree (jQuery)', url: 'https://treejs.cn/v3/main.php', color: '#475569' },
        ],
      },
      {
        title: '算法 / 计算机基础',
        links: [
          {
            name: 'javascript-algorithms',
            url: 'https://github.com/trekhleb/javascript-algorithms',
            color: '#ef4444',
          },
          {
            name: 'LeetCode-Book',
            url: 'https://github.com/krahets/LeetCode-Book',
            color: '#2563eb',
          },
          { name: '小林 coding', url: 'https://www.xiaolincoding.com/', color: '#16a34a' },
          { name: 'V8', url: 'https://github.com/v8/v8', color: '#475569' },
        ],
      },
      {
        title: 'Python / 量子计算（留档）',
        links: [
          { name: 'pyscript', url: 'https://github.com/pyscript/pyscript', color: '#f7df1e' },
          { name: 'pdf2docx', url: 'https://github.com/dothinking/pdf2docx', color: '#3776ab' },
          { name: 'iswbm', url: 'https://github.com/iswbm', color: '#475569' },
          {
            name: '量桨 API 文档',
            url: 'https://qml.baidu.com/api/introduction.html',
            color: '#2932e1',
          },
          { name: 'QuTiP', url: 'https://qutip.org/', color: '#475569' },
          {
            name: 'QPanda-2 优化算法',
            url: 'https://pyqpanda-toturial.readthedocs.io/zh/latest/Optimizer.html',
            color: '#1f78bf',
          },
        ],
      },
    ],
  },
  {
    id: 'framework',
    name: '框架视图',
    icon: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/>',
    sections: [
      {
        title: 'React 核心',
        links: [
          { name: 'React 文档', url: 'https://zh-hans.react.dev/', color: '#149eca' },
          { name: 'Redux', url: 'https://cn.redux.js.org/', color: '#764abc' },
          { name: 'Recoil', url: 'https://recoiljs.org/', color: '#3578e5' },
          {
            name: 'awesome-react',
            url: 'https://github.com/enaqx/awesome-react',
            color: '#149eca',
          },
          { name: 'dumi', url: 'https://d.umijs.org/zh-CN', color: '#c2a633' },
        ],
      },
      {
        title: 'React Hooks / 状态',
        links: [
          { name: 'react-use', url: 'https://github.com/streamich/react-use', color: '#149eca' },
          { name: 'ahooks', url: 'https://ahooks.gitee.io/zh-CN', color: '#1677ff' },
          {
            name: 'beautiful-react-hooks',
            url: 'https://antonioru.github.io/beautiful-react-hooks/',
            color: '#db2777',
          },
          { name: 'Zustand', url: 'https://zustand-demo.pmnd.rs/', color: '#44322c' },
          { name: 'React Query', url: 'https://react-query.tanstack.com/', color: '#ef4444' },
          { name: 'React Virtual', url: 'https://react-virtual.tanstack.com/', color: '#ef4444' },
          {
            name: 'react-hotkeys-hook',
            url: 'https://github.com/JohannesKlauss/react-hotkeys-hook',
            color: '#149eca',
          },
        ],
      },
      {
        title: '组件库 / 后台框架',
        links: [
          { name: 'shadcn/ui', url: 'https://ui.shadcn.com/', color: '#000' },
          { name: 'Mantine', url: 'https://mantine.dev/', color: '#339af0' },
          { name: 'Semi Design', url: 'https://semi.design/zh-CN', color: '#0077fa' },
          { name: 'React Spectrum', url: 'https://react-spectrum.adobe.com/', color: '#e1261c' },
          { name: 'Headless UI', url: 'https://headlessui.com/', color: '#111' },
          { name: 'Quark Design', url: 'https://quark-design.hellobike.com/', color: '#0068ff' },
          { name: 'UmiJS', url: 'https://umijs.org/', color: '#111' },
          { name: 'Redwood', url: 'https://github.com/redwoodjs/redwood', color: '#bf4722' },
          { name: 'react-admin', url: 'https://github.com/marmelab/react-admin', color: '#1976d2' },
          { name: 'Horizon UI', url: 'https://horizon-ui.com/', color: '#4318ff' },
          {
            name: 'awesome-components',
            url: 'https://github.com/brillout/awesome-react-components',
            color: '#149eca',
          },
          { name: 'React Examples', url: 'https://reactjsexample.com/', color: '#61dafb' },
          { name: 'Storybook', url: 'https://storybook.js.org/', color: '#ff4785' },
        ],
      },
      {
        title: 'Vue 生态',
        links: [
          { name: 'Vue.js', url: 'https://cn.vuejs.org/', color: '#42b883' },
          { name: 'VueUse', url: 'https://vueuse.org/', color: '#42b883' },
          { name: 'Vue 生态导航', url: 'https://vitejs.cn/', color: '#646cff' },
          {
            name: 'awesome-vue',
            url: 'https://github.com/rumengkai/awesome-vue',
            color: '#42b883',
          },
          { name: 'Vue 挑战', url: 'https://cn-vuejs-challenges.netlify.app/', color: '#42b883' },
          { name: 'vue-echarts', url: 'https://github.com/ecomfe/vue-echarts', color: '#c23531' },
          {
            name: 'vue-virtual-scroller',
            url: 'https://github.com/Akryum/vue-virtual-scroller',
            color: '#42b883',
          },
          { name: 'Fluid DnD', url: 'https://fluid-dnd.netlify.app/vue/', color: '#3498db' },
          {
            name: 'unplugin-auto-import',
            url: 'https://github.com/unplugin/unplugin-auto-import',
            color: '#42b883',
          },
          {
            name: 'vite-plugin-inspect',
            url: 'https://github.com/antfu/vite-plugin-inspect',
            color: '#646cff',
          },
          {
            name: 'Fantastic-admin',
            url: 'https://fantastic-admin.hurui.me/guide/auth.html',
            color: '#409eff',
          },
        ],
      },
      {
        title: '跨端 / 桌面 / 微前端',
        links: [
          { name: 'React Native', url: 'https://github.com/react/react-native', color: '#149eca' },
          { name: 'Pushy 热更新', url: 'https://pushy.reactnative.cn/', color: '#16a34a' },
          {
            name: 'react-native-skia',
            url: 'https://github.com/shopify/react-native-skia',
            color: '#95bf47',
          },
          {
            name: 'Flutter',
            url: 'https://flutterchina.club/get-started/test-drive/',
            color: '#0468d7',
          },
          { name: 'electron-vite', url: 'https://cn.electron-vite.org/', color: '#6d28d9' },
          { name: 'qiankun', url: 'https://qiankun.umijs.org/zh/guide', color: '#1f78bf' },
          { name: 'HuLa', url: 'https://github.com/HuLaSpark/HuLa', color: '#22c55e' },
        ],
      },
      {
        title: '微信小程序',
        links: [
          { name: 'Vant Weapp', url: 'https://youzan.github.io/vant-weapp/', color: '#07c160' },
          { name: 'mp-html', url: 'https://jin-yufeng.gitee.io/mp-html/', color: '#19be6b' },
          {
            name: 'echarts-for-weixin',
            url: 'https://github.com/ecomfe/echarts-for-weixin',
            color: '#c23531',
          },
          { name: 'CRMEB 商城', url: 'https://github.com/crmeb/CRMEB', color: '#ef4444' },
          {
            name: 'wechat-app-mall',
            url: 'https://github.com/EastWorld/wechat-app-mall',
            color: '#07c160',
          },
        ],
      },
    ],
  },
  {
    id: 'style',
    name: '样式与 UI',
    icon: '<circle cx="13.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="10.5" r="2.5"/><circle cx="8.5" cy="7.5" r="2.5"/><circle cx="6.5" cy="12.5" r="2.5"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.8 0 1.5-.7 1.5-1.5 0-.4-.2-.8-.4-1-.3-.3-.4-.6-.4-1 0-.8.7-1.5 1.5-1.5H16c3.3 0 6-2.7 6-6 0-5-4.5-9-10-9z"/>',
    sections: [
      {
        title: 'CSS 学习 / 技巧',
        links: [
          { name: 'CSS-Tricks', url: 'https://css-tricks.com/', color: '#111' },
          { name: '张鑫旭', url: 'https://www.zhangxinxu.com/', color: '#000' },
          { name: 'iCSS', url: 'https://github.com/chokcoco/iCSS', color: '#3178c6' },
          { name: 'Uiverse', url: 'https://uiverse.io/', color: '#7c3aed' },
          { name: 'React Bits', url: 'https://reactbits.dev/', color: '#111' },
          { name: 'Can I Use', url: 'https://caniuse.com/', color: '#1f78bf' },
          { name: 'W3C', url: 'https://www.w3.org/zh-hans/', color: '#005a9c' },
        ],
      },
      {
        title: '动画 / 特效库',
        links: [
          { name: 'GSAP', url: 'https://greensock.com/', color: '#88ce02' },
          { name: 'Animate.css', url: 'https://animate.style/', color: '#f59e0b' },
          { name: 'Animista', url: 'https://animista.net/', color: '#db2777' },
          { name: '缓动函数', url: 'https://easings.net/zh-cn', color: '#0ea5e9' },
          { name: 'LottieFiles', url: 'https://lottiefiles.com/', color: '#00d9a3' },
          {
            name: 'tsParticles',
            url: 'https://github.com/matteobruni/tsparticles',
            color: '#d97706',
          },
          { name: 'p5.js', url: 'https://github.com/processing/p5.js', color: '#ed225d' },
          { name: 'Driver.js', url: 'https://driverjs.com/', color: '#4f46e5' },
        ],
      },
      {
        title: 'CSS 生成器',
        links: [
          { name: 'Grabient', url: 'https://grabient.com/', color: '#8b5cf6' },
          { name: 'uiGradients', url: 'https://uigradients.com/', color: '#4f46e5' },
          {
            name: 'Box Shadow',
            url: 'https://cssgenerator.org/box-shadow-css-generator.html',
            color: '#475569',
          },
          { name: 'Transform 可视化', url: 'https://css-transform.moro.es/', color: '#0ea5e9' },
          { name: 'Flexbox 生成器', url: 'https://loading.io/flexbox/', color: '#16a34a' },
          { name: 'Grid 生成器', url: 'https://grid.layoutit.com/', color: '#db2777' },
          { name: '1-Line Layouts', url: 'https://1linelayouts.glitch.me/', color: '#111' },
          { name: 'cubic-bezier', url: 'https://cubic-bezier.com/', color: '#f59e0b' },
          { name: 'Shape Divider', url: 'https://www.shapedivider.app/', color: '#4f46e5' },
          { name: 'SVG Path', url: 'https://svg-path-visualizer.netlify.app/', color: '#475569' },
          { name: 'SVG Filters', url: 'https://yoksel.github.io/svg-filters/', color: '#eab308' },
          { name: 'SVGator', url: 'https://www.svgator.com/', color: '#00d9a3' },
          { name: 'css-doodle', url: 'https://css-doodle.com/', color: '#111' },
          { name: 'Autoprefixer', url: 'https://autoprefixer.github.io/', color: '#d97706' },
          { name: 'loading.io', url: 'https://loading.io/', color: '#16a34a' },
        ],
      },
      {
        title: 'CSS 工程化 / 播放器',
        links: [
          { name: 'UnoCSS', url: 'https://unocss.dev/', color: '#444' },
          { name: 'PostCSS', url: 'https://www.postcss.com.cn/', color: '#dc285b' },
          { name: 'PurgeCSS', url: 'https://github.com/FullHuman/purgecss', color: '#475569' },
          { name: 'cssnano', url: 'https://github.com/cssnano/cssnano', color: '#d3392d' },
          { name: 'Normalize.css', url: 'http://necolas.github.io/normalize.css/', color: '#111' },
          { name: 'Artplayer', url: 'https://www.artplayer.org/document/', color: '#e14730' },
          { name: 'DPlayer', url: 'https://dplayer.diygod.dev/zh/', color: '#4f46e5' },
        ],
      },
    ],
  },
  {
    id: 'tooling',
    name: '工程化',
    icon: '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94z"/>',
    sections: [
      {
        title: '编译 / 打包',
        links: [
          { name: 'Vite', url: 'https://github.com/vitejs/vite', color: '#646cff' },
          {
            name: 'esbuild-loader',
            url: 'https://github.com/privatenumber/esbuild-loader',
            color: '#ffcf00',
          },
          { name: 'Biome', url: 'https://biomejs.dev/zh-cn/', color: '#60a5fa' },
          { name: 'terser', url: 'https://terser.org/', color: '#f59e0b' },
          { name: 'ESLint', url: 'https://eslint.org/', color: '#4b32c3' },
          { name: 'depcheck', url: 'https://github.com/depcheck/depcheck', color: '#475569' },
          { name: 'AST explorer', url: 'https://astexplorer.net/', color: '#111' },
          { name: 'Docusaurus', url: 'https://github.com/facebook/docusaurus', color: '#2e8555' },
          { name: 'vscode.dev 工作区', url: 'https://vscode.dev/', color: '#007acc' },
        ],
      },
      {
        title: 'Monorepo / 测试 / API',
        links: [
          { name: 'Nx', url: 'https://www.npmjs.com/package/nx', color: '#143055' },
          { name: 'Lerna', url: 'https://www.npmjs.com/package/lerna', color: '#9333ea' },
          { name: 'Playwright', url: 'https://playwright.dev/', color: '#2ead6b' },
          { name: 'Mocha', url: 'https://www.npmjs.com/package/mocha', color: '#8d6748' },
          { name: 'Apifox', url: 'https://apifox.com/', color: '#1e80ff' },
          { name: 'Postman', url: 'https://www.postman.com/', color: '#ff6c37' },
        ],
      },
      {
        title: '浏览器扩展开发 ⭐',
        links: [
          {
            name: 'crxjs',
            url: 'https://github.com/crxjs/chrome-extension-tools',
            color: '#4f46e5',
          },
          {
            name: 'create-chrome-ext',
            url: 'https://github.com/guocaoyi/create-chrome-ext',
            color: '#16a34a',
          },
          { name: 'Plasmo', url: 'https://www.plasmo.com/', color: '#111' },
          {
            name: 'browser-extension 模板',
            url: 'https://github.com/Debdut/browser-extension',
            color: '#149eca',
          },
          {
            name: 'MV3 开发实战',
            url: 'https://juejin.cn/post/7229238405406294074',
            color: '#1e80ff',
          },
          {
            name: 'VS Code 插件文档',
            url: 'https://liiked.github.io/VS-Code-Extension-Doc-ZH/',
            color: '#007acc',
          },
        ],
      },
      {
        title: '调试 / 代理 / 性能',
        links: [
          { name: 'Whistle', url: 'https://wproxy.org/', color: '#1f78bf' },
          { name: 'Browserhacks', url: 'http://browserhacks.com/', color: '#111' },
          { name: 'Browserleaks', url: 'https://browserleaks.com/', color: '#475569' },
          { name: 'Fingerprint Pro', url: 'https://fingerprint.com/', color: '#111' },
        ],
      },
      {
        title: '监控 / 埋点 / 录制',
        links: [
          {
            name: 'react-tracking',
            url: 'https://github.com/nytimes/react-tracking',
            color: '#149eca',
          },
          { name: 'rrweb (录屏)', url: 'https://www.rrweb.io/', color: '#f97316' },
          {
            name: '前端性能 SDK 实战',
            url: 'https://juejin.cn/post/7586482860104613915',
            color: '#1e80ff',
          },
        ],
      },
    ],
  },
  {
    id: 'backend',
    name: 'Node 后端',
    icon: '<rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/><path d="M6 8h.01M9 8h.01"/>',
    sections: [
      {
        title: '运行时 / 规范',
        links: [
          { name: 'Node 指南', url: 'https://nodejs.org/zh-cn/docs/guides/', color: '#339933' },
          { name: 'Node 中文网', url: 'https://nodejs.cn/', color: '#339933' },
          {
            name: 'Node 源码剖析',
            url: 'https://theanarkh.github.io/understand-nodejs/',
            color: '#111',
          },
          {
            name: 'Node Best Practices',
            url: 'https://github.com/goldbergyoni/nodebestpractices',
            color: '#1f78bf',
          },
          { name: 'CNode 社区', url: 'https://cnodejs.org/', color: '#4e4e4e' },
          {
            name: 'nvm-windows',
            url: 'https://github.com/coreybutler/nvm-windows',
            color: '#339933',
          },
          { name: 'nodemon', url: 'https://www.npmjs.com/package/nodemon', color: '#76d04b' },
          {
            name: 'ts-node-dev',
            url: 'https://www.npmjs.com/package/ts-node-dev',
            color: '#3178c6',
          },
        ],
      },
      {
        title: 'Web 框架 / 实时',
        links: [
          { name: 'Nest.js', url: 'https://docs.nestjs.cn/', color: '#e0234e' },
          { name: 'Egg.js', url: 'https://www.eggjs.org/zh-CN', color: '#1f78bf' },
          { name: 'Strapi CMS', url: 'https://strapi.io/', color: '#4945ff' },
          { name: 'Socket.IO', url: 'https://github.com/socketio/socket.io', color: '#010101' },
          {
            name: 'public-apis-cn',
            url: 'https://github.com/llf007/public-apis-cn',
            color: '#e60012',
          },
          { name: 'public-apis', url: 'https://github.com/public-apis/public-apis', color: '#111' },
          { name: '天行数据', url: 'https://www.tianapi.com/list/', color: '#0ea5e9' },
          {
            name: '网易云音乐 Node API',
            url: 'https://docs-neteasecloudmusicapi.focalors.ltd/',
            color: '#c20c0c',
          },
        ],
      },
      {
        title: '数据库 / 中间件',
        links: [
          { name: 'mongodb 驱动', url: 'https://www.npmjs.com/package/mongodb', color: '#13aa52' },
          { name: 'mongoose', url: 'https://www.npmjs.com/package/mongoose', color: '#880000' },
          {
            name: 'jsonwebtoken',
            url: 'https://github.com/auth0/node-jsonwebtoken',
            color: '#d63aff',
          },
          {
            name: 'express-validator',
            url: 'https://www.npmjs.com/package/express-validator',
            color: '#475569',
          },
          { name: 'joi', url: 'https://joi.dev/', color: '#0c73c2' },
          { name: 'multer', url: 'https://www.npmjs.com/package/multer', color: '#e34c26' },
          { name: 'cors', url: 'https://www.npmjs.com/package/cors', color: '#475569' },
          { name: 'axios', url: 'https://www.npmjs.com/package/axios', color: '#5a29e4' },
          { name: 'cheerio', url: 'https://cheerio.js.org/', color: '#d3392d' },
          { name: 'chokidar', url: 'https://www.npmjs.com/package/chokidar', color: '#111' },
          { name: 'execa', url: 'https://www.npmjs.com/package/execa', color: '#ef4444' },
          { name: 'simple-git', url: 'https://www.npmjs.com/package/simple-git', color: '#f05133' },
          { name: 'semver', url: 'https://www.npmjs.com/package/semver', color: '#475569' },
          { name: 'Shields.io', url: 'https://shields.io/', color: '#000' },
          { name: 'Linux 命令搜索', url: 'https://wangchujiang.com/linux-command/', color: '#000' },
        ],
      },
      {
        title: 'CLI / 脚本工具链',
        links: [
          { name: 'zx', url: 'https://github.com/google/zx', color: '#3178c6' },
          { name: 'yargs', url: 'https://www.npmjs.com/package/yargs', color: '#c4161c' },
          { name: 'inquirer', url: 'https://www.npmjs.com/package/inquirer', color: '#000' },
          { name: 'prompts', url: 'https://www.npmjs.com/package/prompts', color: '#475569' },
          { name: 'chalk', url: 'https://www.npmjs.com/package/chalk', color: '#f59e0b' },
          { name: 'ora', url: 'https://www.npmjs.com/package/ora', color: '#475569' },
          { name: 'listr', url: 'https://www.npmjs.com/package/listr', color: '#25acf8' },
        ],
      },
    ],
  },
  {
    id: 'news',
    name: '资讯博客',
    icon: '<path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2"/><path d="M18 14h-8M15 18h-5M10 6h8v4h-8z"/>',
    sections: [
      {
        title: '周刊 / 综合资讯',
        links: [
          { name: 'JS 周刊', url: 'https://docschina.org/news/weekly/js', color: '#e60012' },
          { name: '前端精读周刊', url: 'https://github.com/ascoders/weekly', color: '#111' },
          { name: 'InfoQ', url: 'https://www.infoq.cn/', color: '#1682ef' },
          { name: 'HelloGitHub', url: 'https://hellogithub.com/', color: '#ef4444' },
          {
            name: 'build-your-own-x',
            url: 'https://github.com/codecrafters-io/build-your-own-x',
            color: '#111',
          },
        ],
      },
      {
        title: '个人博客',
        links: [
          { name: 'Developer Way', url: 'https://www.developerway.com/', color: '#111' },
          { name: '茂茂物语', url: 'https://notes.fe-mm.com/', color: '#42b883' },
          { name: '王先生笔记', url: 'https://wxsnote.cn/', color: '#0ea5e9' },
          { name: '张洪 Heo', url: 'https://blog.zhheo.com/', color: '#ff6b35' },
          { name: 'Lifeline', url: 'https://lifelinest.github.io/', color: '#4f46e5' },
          { name: 'azhubaby', url: 'https://azhubaby.com/', color: '#475569' },
          { name: '随易科技', url: 'https://yicode.tech/', color: '#0ea5e9' },
          { name: 'Easy', url: 'https://github.com/easychen', color: '#111' },
          { name: '咖喱君资源库', url: 'https://link3.cc/galijun', color: '#db2777' },
          { name: '卢内尔 lunel.dev', url: 'https://lunel.dev/', color: '#475569' },
        ],
      },
    ],
  },
  {
    id: 'interview',
    name: '面试求职',
    icon: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="15" x2="15" y2="15"/>',
    sections: [
      {
        title: '面试题 / 基础',
        links: [
          {
            name: '中级前端面试指南',
            url: 'https://github.com/sl1673495/blogs/issues/52',
            color: '#111',
          },
          { name: '大厂每日一题', url: 'https://q.shanyue.tech/', color: '#ef4444' },
          {
            name: '前端面试 QA',
            url: 'https://github.com/markyun/My-blog/tree/master/Front-end-Developer-Questions/Questions-and-Answers',
            color: '#111',
          },
          {
            name: '反问面试官',
            url: 'https://github.com/perklet/reverse-interview-zh',
            color: '#111',
          },
        ],
      },
      {
        title: '简历 / 平台',
        links: [
          { name: '一纸简历', url: 'https://cv.devtool.tech/', color: '#111' },
          { name: 'dnd-resume', url: 'https://dnd-resume.com/', color: '#4f46e5' },
        ],
      },
      {
        title: '远程 / 独立开发',
        links: [
          { name: '电鸭社区', url: 'https://eleduck.com/', color: '#ff6b35' },
          { name: 'Thoughtworks', url: 'https://www.thoughtworks.cn/', color: '#111' },
          { name: '之马工场', url: 'https://www.zhimawork.com/', color: '#0ea5e9' },
          { name: 'Brix', url: 'https://brix-zh.webflow.io/', color: '#4f46e5' },
          {
            name: '独立开发者列表',
            url: 'https://github.com/1c7/chinese-independent-developer',
            color: '#111',
          },
        ],
      },
      {
        title: '招聘入口 / 平台',
        links: [
          {
            name: '牛客社招',
            url: 'https://www.nowcoder.com/jobs/fulltime/center',
            color: '#0cb856',
          },
          {
            name: '咪咕招聘',
            url: 'https://www.migu.cn/about/join/social/job/0/0/4.html',
            color: '#e60012',
          },
          { name: '腾讯音乐招聘', url: 'https://join.tencentmusic.com/social', color: '#31c27c' },
          { name: '豆瓣招聘', url: 'https://jobs.douban.com/jobs/social/', color: '#00b51d' },
          { name: 'OPPO 招聘', url: 'https://career.oppo.com/pc/post/list', color: '#00a651' },
          {
            name: 'TCL 招聘',
            url: 'https://sc.hotjob.cn/wt/TCL/mobweb/v8/position/list',
            color: '#1f78bf',
          },
          { name: '快手招聘', url: 'https://zhaopin.kuaishou.cn/recruit/e/', color: '#ff4906' },
          {
            name: '字节跳动招聘',
            url: 'https://jobs.bytedance.com/experienced/position',
            color: '#325ab4',
          },
          { name: '百度招聘', url: 'https://talent.baidu.com/jobs/social-list', color: '#2932e1' },
          {
            name: '拼多多招聘',
            url: 'https://m.zhipin.com/gongsir/ea9c5680f57d53d71HV90ty5.html',
            color: '#e02e24',
          },
          { name: '喜马拉雅招聘', url: 'https://jobs.ximalaya.com/social', color: '#e6162d' },
        ],
      },
    ],
  },
  {
    id: 'life',
    name: '生活实用',
    icon: '<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>',
    sections: [
      {
        title: '设计 / 图片处理',
        links: [
          { name: 'Squoosh', url: 'https://squoosh.app/', color: '#db2777' },
          { name: 'TinyPNG', url: 'https://tinypng.com/', color: '#111' },
          { name: '图片转 DataURI', url: 'http://tool.c7sky.com/datauri/', color: '#0ea5e9' },
          { name: 'Lorem Picsum', url: 'https://picsum.photos/', color: '#6d28d9' },
        ],
      },
      {
        title: '视频 / 思维导图 / 文档',
        links: [
          { name: '抖音去水印', url: 'https://www.dy114.com/douyin', color: '#000' },
          { name: 'B站视频解析', url: 'https://bilibili.iiilab.com/', color: '#fb7299' },
          { name: '视频压缩', url: 'https://tools.rotato.app/compress', color: '#4f46e5' },
          { name: 'aconvert 转换', url: 'https://www.aconvert.com/', color: '#0ea5e9' },
          { name: 'Excalidraw', url: 'https://excalidraw.com/', color: '#111' },
          { name: 'MD2Card', url: 'https://md2card.com/zh', color: '#4f46e5' },
          { name: 'PDF24 Tools', url: 'https://tools.pdf24.org/zh/', color: '#111' },
          {
            name: '影速 影视采集测速',
            url: 'https://github.com/fish2018/yingsu',
            color: '#475569',
          },
        ],
      },
      {
        title: '壁纸 / 效率',
        links: [
          { name: '哲风壁纸', url: 'https://haowallpaper.com/', color: '#0ea5e9' },
          { name: '临时邮箱', url: 'https://linshiyouxiang.net/mailbox/rrh/', color: '#ef4444' },
          { name: '蓝奏云', url: 'https://up.woozooo.com/', color: '#1976f3' },
          { name: 'Keep Screen On', url: 'https://www.keepscreenon.com/', color: '#475569' },
          { name: '正则备忘', url: 'https://ihateregex.io/', color: '#db2777' },
          { name: 'Let’s Encrypt', url: 'https://letsencrypt.org/', color: '#111' },
          { name: '龙猫云', url: 'https://a14.lml2vipaff01.cc/inv', color: '#6d28d9' },
          { name: 'MotionGo PPT 动画', url: 'https://motion.yoo-ai.com/', color: '#ea4b71' },
          { name: '电脑开荒网', url: 'https://www.cyhaoka.vip/', color: '#1f78bf' },
        ],
      },
      {
        title: '排行榜 / 选购',
        links: [
          { name: 'Versus 对比', url: 'https://versus.com/cn', color: '#4f46e5' },
          { name: 'BuildCores 装机', url: 'https://www.buildcores.com/', color: '#111' },
        ],
      },
      {
        title: '娱乐 / 个人兴趣',
        links: [
          { name: '摸鱼岛', url: 'https://yucoder.cn/index', color: '#0ea5e9' },
          { name: '小霸王 FC 在线', url: 'https://www.yikm.net/', color: '#ef4444' },
          { name: 'Animeko', url: 'https://animeko.org/', color: '#7c3aed' },
          { name: 'B站录播姬', url: 'https://rec.danmuji.org/', color: '#fb7299' },
          {
            name: 'KikoPlay 弹幕播放器',
            url: 'https://github.com/KikoPlayProject/KikoPlay',
            color: '#2563eb',
          },
          {
            name: '柯南各卷目录',
            url: 'https://baike.baidu.com/item/名侦探柯南各卷目录/49790351',
            color: '#000',
          },
          {
            name: '柯南各集列表',
            url: 'https://baike.baidu.com/item/名侦探柯南各集列表/49823770',
            color: '#000',
          },
          {
            name: '数字直觉排行榜',
            url: 'https://numfeel.996.ninja/pages/leaderboard/',
            color: '#4f46e5',
          },
          { name: 'Bangumi 番组计划', url: 'https://bgm.tv/', color: '#f09199' },
          { name: '大麦抢票脚本', url: 'https://github.com/Guyungy/damaihelper', color: '#ff4906' },
        ],
      },
    ],
  },
];

export function findGroup(id: string): NavGroup | undefined {
  return NAV_GROUPS.find((g) => g.id === id);
}

/** 扁平化所有链接，供全局搜索 */
export function flatAll(): { link: NavLink; group: string; section: string }[] {
  const out: { link: NavLink; group: string; section: string }[] = [];
  for (const g of NAV_GROUPS) {
    for (const s of g.sections) {
      for (const l of s.links) out.push({ link: l, group: g.name, section: s.title });
    }
  }
  return out;
}
