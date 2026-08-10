# 前端书签整理方案

> 目标:前端工程师 → 补后端 → **AI 全栈(Agent)工程师**
> 现状:18 个顶层文件夹、约 200+ 条。问题:React 组件切得太碎(40+ 微文件夹),
> `工具/`、`nodejs/工具` 是大杂烩,`Flutter` 混进 RN/乾坤,`数据` 混进 YouTube,
> 存在重复项、过期招聘、与目标无关内容。
>
> 整理日期:2026-08-10。后续可按本文「卡片化建议」把高频区做成 moyutab 卡片。

---

## 一、推荐的新目录结构(总览)

```
前端/
├─ 01 语言基础/
│  ├─ JavaScript
│  ├─ TypeScript
│  └─ 算法与计算机基础
├─ 02 框架与视图/
│  ├─ React 核心
│  ├─ React Hooks 与状态
│  ├─ React 组件库
│  ├─ React 功能组件/ (按用途归 6 组,见下)
│  ├─ Vue
│  └─ 跨端与桌面 (RN / Flutter / Electron / 微前端)
├─ 03 样式与 UI 资源/
│  ├─ CSS 学习与技巧
│  ├─ 动画
│  ├─ CSS 生成器
│  └─ CSS 工程化
├─ 04 工程化与构建/
│  ├─ 编译与打包
│  ├─ Monorepo
│  ├─ 质量与测试
│  ├─ 浏览器扩展 (和本项目直接相关)
│  └─ 调试代理
├─ 05 Node.js 与后端/   ← 你要补的方向
│  ├─ 运行时与规范
│  ├─ Web 框架
│  ├─ 数据库
│  ├─ 中间件 / 鉴权 / 工具
│  └─ CLI 与脚本工具链
├─ 06 AI 与 Agent/      ← 你的核心目标,目前几乎空白
├─ 07 资讯·周刊·博客/
├─ 08 在线工具与效率/
│  ├─ Playground
│  ├─ API 调试
│  ├─ 图片 / 媒体 / 动效
│  └─ 杂项
└─ 09 面试与求职/
```

---

## 二、逐条归位

### 01 语言基础

#### JavaScript
- MDN Web 文档 — https://developer.mozilla.org/zh-CN/
- 现代 JavaScript 教程 — https://zh.javascript.info/
- web.dev — https://web.dev/
- 30 seconds of code — https://www.30secondsofcode.org/
- coderutil 程序员盒子 — https://www.coderutil.com/
- docschina(前端优质文档翻译) — https://docschina.org/
- trekhleb/javascript-algorithms → 归到「算法」

#### TypeScript
- TypeScript 官方文档 — https://www.typescriptlang.org/zh/docs/handbook/tsconfig-json.html
- TypeScript Playground — https://www.typescriptlang.org/zh/play
- DefinitelyTyped — https://github.com/DefinitelyTyped/DefinitelyTyped
- type-fest — https://github.com/sindresorhus/type-fest
- type-challenges — https://github.com/type-challenges/type-challenges
- React TypeScript 备忘录(在 React 文档区) — https://react-typescript-cheatsheet.netlify.app/

#### 常用 JS 库(原「开源项目」归集)
> 这些是写业务时常搜的工具库,归到语言基础下,需要时好找。
- immer(不可变数据) — https://github.com/immerjs/immer
- nanoid(唯一 ID) — https://github.com/ai/nanoid
- decimal.js(高精度数值,比 number-precision 全) — https://github.com/MikeMcl/decimal.js
- js-spark-md5(MD5) — https://github.com/satazor/js-spark-md5
- pinyin(汉字转拼音) — https://pinyin.js.org/
- zero-width-detection / zero-width-lib(零宽字符检测) — https://github.com/umpox/zero-width-detection
- howler.js(音频) — https://howlerjs.com/
- screenfull(全屏 API) — https://github.com/sindresorhus/screenfull
- umi-request(fetch 封装) — https://github.com/umijs/umi-request
- Mock.js — http://mockjs.com/
- node-html-parser(快速 HTML 解析) — https://github.com/taoqf/node-html-parser
- url-regex — https://github.com/kevva/url-regex
- Format.JS(i18n 国际化) — https://formatjs.io/
- JSDoc(文档注释) — https://jsdoc.app/ , https://www.jsdoc.com.cn/
- chroma.js(颜色处理) — https://vis4.net/chromajs/
- Color Thief(取色) — https://lokeshdhakar.com/projects/color-thief/
- you-dont-need(理性选库清单) — https://github.com/you-dont-need/You-Dont-Need

#### 算法与计算机基础
- trekhleb/javascript-algorithms — https://github.com/trekhleb/javascript-algorithms
- krahets/LeetCode-Book(剑指 Offer / 图解算法) — https://github.com/krahets/LeetCode-Book
- 小林 coding(图解操作系统/网络/Redis) — https://www.xiaolincoding.com/
- V8 源码 — https://github.com/v8/v8

---

### 02 框架与视图

#### React 核心
- React 官方文档(中文) — https://zh-hans.react.dev/
- facebook/react — https://github.com/facebook/react
- Redux 中文官网 — https://cn.redux.js.org/
- Recoil — https://recoiljs.org/
- awesome-react — https://github.com/enaqx/awesome-react
- React 周刊 — https://docschina.org/weekly/react/docs/
- dumi(组件文档工具) — https://d.umijs.org/zh-CN

#### React Hooks 与状态
- react-use — https://github.com/streamich/react-use
- ahooks — https://ahooks.gitee.io/zh-CN
- beautiful-react-hooks — https://antonioru.github.io/beautiful-react-hooks/
- awesome-react-hooks — https://github.com/rehooks/awesome-react-hooks
- Zustand(状态管理) — https://zustand-demo.pmnd.rs/
- React Virtual(虚拟滚动 hook) — https://react-virtual.tanstack.com/
- react-scroll-parallax — https://github.com/jscottsmith/react-scroll-parallax
- react-hotkeys-hook — https://github.com/JohannesKlauss/react-hotkeys-hook
- React Spectrum hooks — https://react-spectrum.adobe.com/react-aria/useSearchField.html

#### React 组件库(设计系统/后台框架)
- shadcn/ui — https://ui.shadcn.com/
- Mantine — https://mantine.dev/
- Semi Design — https://semi.design/zh-CN
- React Spectrum(Adobe) — https://react-spectrum.adobe.com/
- Headless UI — https://headlessui.com/
- Quark Design(跨框架原生组件) — https://quark-design.hellobike.com/
- UmiJS — https://umijs.org/
- Redwood(全栈框架) — https://github.com/redwoodjs/redwood
- react-admin(B2B 后台框架) — https://github.com/marmelab/react-admin
- Horizon UI Dashboard — https://horizon-ui.com/
- awesome-react-components — https://github.com/brillout/awesome-react-components
- React.js Examples — https://reactjsexample.com/
- Storybook — https://storybook.js.org/

#### React 功能组件(把原来 40 个微文件夹压成 6 组)

**A. 表单 / 编辑器 / 输入**
- Formik — https://formik.org/
- React Select — https://react-select.com/home
- react-pin-field(验证码) — https://github.com/soywod/react-pin-field
- react-ace(代码编辑器) — https://securingsincity.github.io/react-ace/
- MDX — https://mdxjs.com/
- Draft.js(富文本) — https://draftjs.org/
- react-filepond(上传) — https://github.com/pqina/filepond
- rc-slider(滑块) — https://slider-react-component.vercel.app/
- react-copy-to-clipboard — https://github.com/nkbt/react-copy-to-clipboard
- React Rating(评分) — https://react-rating.onrender.com/

**B. 列表 / 虚拟滚动 / 分页**
- react-window — https://react-window.vercel.app/
- React Virtuoso — https://virtuoso.dev/
- react-infinite-scroller — https://github.com/danbovey/react-infinite-scroller
- react-responsive-pagination — https://react-responsive-pagination.elantha.com/
- glide-data-grid(数据表格) — https://glideapps.github.io/glide-data-grid/

**C. 图表 / 多媒体**
- echarts-for-react — https://git.hust.cc/echarts-for-react/
- react-chartjs-2 — https://react-chartjs-2.js.org/
- react-player — https://cookpete.com/react-player/
- Vime — https://vimejs.com/
- React-PDF — https://projects.wojtekmaj.pl/react-pdf/
- react-archer(DOM 画箭头) — https://github.com/pierpo/react-archer
- react-terminal-ui(终端面板) — https://github.com/jonmbake/react-terminal-ui
- react-calendar-heatmap(日历热力图) — https://github.com/kevinsqi/react-calendar-heatmap

**D. 动画 / 过渡 / 反馈**
- react-spring — https://react-spring.dev/
- react-motion — https://github.com/chenglou/react-motion
- react-page-transition — https://github.com/Steveeeie/react-page-transition
- Scrollex(滚动) — https://scrollex-docs.vercel.app/
- react-spinners(loading) — https://www.davidhu.io/react-spinners/
- Skeleton React — https://skeletonreact.com/
- react-hot-toast — https://react-hot-toast.com/
- reapop(通知) — https://louisbarranqueiro.github.io/reapop/
- React Tooltip — https://react-tooltip.com/
- fireworks-js — https://github.com/crashmax-dev/fireworks-js
- react-text-transition — https://github.com/WinterCore/react-text-transition
- use-count-up / React CountUp(数字变化) — https://use-count-up.vercel.app/
- emoji-mart(表情) — https://github.com/missive/emoji-mart

**E. 图片 / 裁剪 / 缩放 / 头像**
- react-easy-crop — https://github.com/ValentinH/react-easy-crop
- react-image-crop — https://github.com/DominicTobias/react-image-crop
- react-medium-image-zoom — https://laurenashpole.github.io/react-inner-image-zoom/
- react-inner-image-zoom — (同上)
- img-comparison-slider — https://img-comparison-slider.sneas.io/
- react-lazy-load-image-component — https://github.com/Aljullu/react-lazy-load-image-component
- react-avatar-editor — https://react-avatar-editor.netlify.app/
- Boring Avatars — https://boringavatars.com/
- react-sketch-canvas(手绘) — https://github.com/vinothpandian/react-sketch-canvas

**F. 交互 / 导航 / 其他**
- React DnD — https://react-dnd.github.io/react-dnd/about
- react-beautiful-dnd — https://github.com/atlassian/react-beautiful-dnd
- any-touch(手势) — https://any86.github.io/any-touch/
- kbar(命令面板) — https://github.com/timc1/kbar
- react-cmdk — https://github.com/albingroen/react-cmdk
- React Datepicker / React Nice Dates — https://reactdatepicker.com/
- react-chrono / Planby(时间轴) — https://github.com/prabhuignoto/react-chrono
- egjs-flicking / Embla(轮播) — https://www.embla-carousel.com/
- react-intersection-observer — https://react-intersection-observer.vercel.app/
- why-did-you-render(重复渲染调试) — https://github.com/welldone-software/why-did-you-render
- click-to-component(调试) — https://github.com/ericclemmons/click-to-component
- React Desktop(桌面风组件) — http://reactdesktop.js.org/
- React Query(数据获取) — https://react-query.tanstack.com/
- react-tensorflow(ML) — https://react-tensorflow-example.vercel.app/ → 建议挪到 AI
- react-open-weather(天气) — https://github.com/farahat80/react-open-weather
- react-svg — https://github.com/tanem/react-svg
- 图标:Tabler Icons / Font Awesome / Octicons
  - https://tabler-icons-react.vercel.app/
  - https://fontawesome.com/
  - https://primer.style/octicons/

> 原文件里 React 组件有两个「管理后台组件」文件夹,已合并;
> 「React 组件 → 浏览器插件组件」移到 04/浏览器扩展。

#### Vue
- Vue.js — https://cn.vuejs.org/
- VueUse — https://vueuse.org/
- Vue 生态中文导航 — https://vitejs.cn/
- awesome-vue — https://github.com/rumengkai/awesome-vue
- Vue.js 挑战 — https://cn-vuejs-challenges.netlify.app/
- vue-echarts — https://github.com/ecomfe/vue-echarts
- vue-virtual-scroller — https://github.com/Akryum/vue-virtual-scroller
- vue-fluid-dnd / Fluid DnD — https://fluid-dnd.netlify.app/vue/
- unplugin-auto-import — https://github.com/unplugin/unplugin-auto-import
- vite-plugin-inspect — https://github.com/antfu/vite-plugin-inspect
- vue3-cloud-music(示例项目) — https://github.com/path-yu/vue3-cloud-music
- vue3-music(示例项目) — https://github.com/SmallRuralDog/vue3-music
- Vite TS Starter 模板 — https://likemashang.com/

#### 跨端与桌面
- React Native — https://github.com/react/react-native
- Pushy 热更新 — https://pushy.reactnative.cn/
- react-native-skia — https://github.com/shopify/react-native-skia
- Flutter 中文网 — https://flutterchina.club/get-started/test-drive/
- electron-vite — https://cn.electron-vite.org/
- qiankun(微前端) — https://qiankun.umijs.org/zh/guide
- Bangumi(RN 客户端,你的 fork) — https://github.com/R2h/Bangumi *(你自己的项目,也可放「我的」)*
- Bangumi API / bangumi-data — https://bangumi.github.io/api/ , https://github.com/bangumi-data/bangumi-data
- nutjs(桌面自动化) — https://nutjs.dev/
- HuLa(Rust+Vue3 跨平台 IM,参考) — https://github.com/HuLaSpark/HuLa

#### 微信小程序
> 原散落于 `开源项目/`,集中成一组。
- Vant Weapp(有赞组件库) — https://youzan.github.io/vant-weapp/
- iView Weapp — https://weapp.iviewui.com/
- mp-html(富文本组件) — https://jin-yufeng.gitee.io/mp-html/
- echarts-for-weixin — https://github.com/ecomfe/echarts-for-weixin
- CRMEB(多端开源商城) — https://github.com/crmeb/CRMEB
- wechat-app-mall(微信小程序商城) — https://github.com/EastWorld/wechat-app-mall
- 微慕(WordPress 小程序) — https://github.com/iamxjb/winxin-app-watch-life.net
- bee(餐饮点餐小程序) — https://github.com/woniudiancang/bee
- Gitter(GitHub 小程序客户端) — https://github.com/nslogx/Gitter

> 原 `Flutter/` 文件夹把 RN、qiankun 混在一起,已按主题归位。

---

### 03 样式与 UI 资源(合并原 `CSS/` + `工具/CSS/`)

#### 学习与技巧
- CSS-Tricks — https://css-tricks.com/
- 张鑫旭博客 — https://www.zhangxinxu.com/
- chokcoco/iCSS(不止于 CSS) — https://github.com/chokcoco/iCSS
- Uiverse(开源 UI 元素库) — https://uiverse.io/
- React Bits — https://reactbits.dev/
- Navnav(导航合集) — https://thuvien.org/navnav/

#### 动画
- Animate.css — https://animate.style/
- Animista — https://animista.net/
- 缓动函数速查 — https://easings.net/zh-cn
- cubic-bezier 生成器 — https://cubic-bezier.com/
- loading.io(loading 动画) — https://loading.io/
- LottieFiles — https://lottiefiles.com/
- GSAP(专业动画库) — https://greensock.com/
- particles.js / tsParticles(粒子背景) — https://vincentgarreton.com/particles.js/ , https://github.com/matteobruni/tsparticles
- p5.js(创意编程/生成艺术) — https://github.com/processing/p5.js
- Driver.js(新手引导) — https://driverjs.com/ *(注:开源项目里有两条,一条首页一条文档,合并)*

#### CSS 生成器
- Grabient / uiGradients(渐变) — https://grabient.com/ , https://uigradients.com/
- Adobe 好看的颜色 — https://assets.adobe.com/
- Box Shadow 生成器 — https://cssgenerator.org/box-shadow-css-generator.html
- CSS Transform 可视化 — https://css-transform.moro.es/
- Flexbox 生成器 — https://loading.io/flexbox/
- Grid 生成器 — https://grid.layoutit.com/
- 1-Line Layouts — https://1linelayouts.glitch.me/
- Shape Divider — https://www.shapedivider.app/
- SVG Path Visualizer — https://svg-path-visualizer.netlify.app/
- SVG Filters — https://yoksel.github.io/svg-filters/
- SVGator / SVG Artista — https://www.svgator.com/ , https://svgartista.net/
- css-doodle — https://css-doodle.com/
- Autoprefixer 在线版 — https://autoprefixer.github.io/

#### CSS 工程化
- UnoCSS — https://unocss.dev/
- PostCSS 中文网 — https://www.postcss.com.cn/
- PurgeCSS — https://github.com/FullHuman/purgecss
- cssnano(PostCSS 压缩) — https://github.com/cssnano/cssnano
- autoprefixer(自动前缀) — https://github.com/postcss/autoprefixer
- Normalize.css — http://necolas.github.io/normalize.css/
- W3C — https://www.w3.org/zh-hans/

#### 音视频播放器
- Artplayer.js — https://www.artplayer.org/
- DPlayer — https://dplayer.diygod.dev/

---

### 04 工程化与构建

#### 编译与打包
- Vite — https://github.com/vitejs/vite
- esbuild-loader — https://github.com/privatenumber/esbuild-loader
- Biome(一体化工具链) — https://biomejs.dev/zh-cn/
- Babel — https://babel.dev/ , https://babeljs.io/ *(原开源项目有两条重复,合并)*
- terser(ES6+ 压缩) — https://terser.org/
- AST explorer — https://astexplorer.net/
- Esprima Parser — https://esprima.org/demo/parse.html
- ESLint — https://eslint.org/
- depcheck(查未使用依赖) — https://github.com/depcheck/depcheck
- Docusaurus(文档站) — https://github.com/facebook/docusaurus
- HTMLrev(免费 HTML 模板) — https://htmlrev.com/
- Babel 博客(2021,偏旧,可留作历史)
- webpack-autoconf(已旧,引用 Snowpack,建议删)

#### Monorepo
- Nx — https://www.npmjs.com/package/nx
- Lerna — https://www.npmjs.com/package/lerna

#### 质量与测试
- Playwright(E2E) — https://playwright.dev/
- Mocha — https://www.npmjs.com/package/mocha
- Apifox — https://apifox.com/
- Postman — https://www.postman.com/

#### 浏览器扩展(⭐ 本项目就是扩展,重点保留)
- crxjs/chrome-extension-tools — https://github.com/crxjs/chrome-extension-tools
- create-chrome-ext — https://github.com/guocaoyi/create-chrome-ext
- Plasmo — https://www.plasmo.com/
- browser-extension 模板(React/TS/Preact) — https://github.com/Debdut/browser-extension
- Chrome MV3 插件开发实战(掘金) — https://juejin.cn/post/7229238405406294074
- chrome-extensions-learning(MV3 系统学习整理) — https://github.com/justinzm/chrome-extensions-learning
- VS Code 插件中文文档 — https://liiked.github.io/VS-Code-Extension-Doc-ZH/

#### 调试代理
- Whistle — https://wproxy.org/
- Can I use — https://caniuse.com/
- Browserhacks — http://browserhacks.com/

---

### 05 Node.js 与后端(⭐ 重点补强区)

> 原 `nodejs/工具/` 把框架、数据库、CLI 小工具全堆在一起,这里按职责拆开。
> 注意:**你目前后端栈只有 Express / Egg / Nest + MongoDB**,缺关系型数据库/ORM、缓存、容器化(见缺口分析)。

#### 运行时与规范
- Node.js 指南(官方) — https://nodejs.org/zh-cn/docs/guides/
- Node.js 中文网 — https://nodejs.cn/
- Node.js 源码剖析 — https://theanarkh.github.io/understand-nodejs/
- Node Best Practices — https://github.com/goldbergyoni/nodebestpractices
- CNode 社区 — https://cnodejs.org/
- nvm(Windows / *nix) — https://github.com/coreybutler/nvm-windows , https://github.com/nvm-sh/nvm
- nvm 使用教程 — https://www.runoob.com/w3cnote/nvm-manager-node-versions.html
- nodemon — https://www.npmjs.com/package/nodemon
- ts-node-dev — https://www.npmjs.com/package/ts-node-dev

#### Web 框架
- Nest.js 中文文档 — https://docs.nestjs.cn/
- Egg.js — https://www.eggjs.org/zh-CN
- Express 生态(通过 validator/cors/morgan 等)
- Strapi(Node 开源 Headless CMS) — https://strapi.io/
- Socket.IO(实时通信) — https://github.com/socketio/socket.io
- public-apis-cn(免费 API 大全) — https://github.com/llf007/public-apis-cn

#### 数据库
- mongodb 驱动 — https://www.npmjs.com/package/mongodb
- mongoose(ODM) — https://www.npmjs.com/package/mongoose
- ⚠️ 缺:PostgreSQL / MySQL / Prisma / Drizzle / Redis — 见缺口

#### 中间件 / 鉴权 / 工具
- express-validator — https://www.npmjs.com/package/express-validator
- egg-validate — https://www.npmjs.com/package/egg-validate
- joi(校验) — https://joi.dev/
- cors — https://www.npmjs.com/package/cors
- morgan(日志) — https://www.npmjs.com/package/morgan
- multer(文件上传) — https://www.npmjs.com/package/multer
- jsonwebtoken — https://github.com/auth0/node-jsonwebtoken
- axios — https://www.npmjs.com/package/axios
- cheerio(HTML 解析) — https://cheerio.js.org/
- mitt(事件总线) — https://www.npmjs.com/package/mitt
- rxjs — https://www.npmjs.com/package/rxjs
- semver — https://www.npmjs.com/package/semver
- simple-git — https://www.npmjs.com/package/simple-git
- glob / node-glob — https://www.npmjs.com/package/glob
- chokidar(文件监控) — https://www.npmjs.com/package/chokidar
- execa(进程执行) — https://www.npmjs.com/package/execa
- bl(buffer 工具) — https://www.npmjs.com/package/bl
- dedent — https://www.npmjs.com/package/dedent
- Shields.io(徽章) — https://shields.io/
- gitignore 模板 — https://github.com/github/gitignore
- 网易云音乐 NodeJS API(练手项目,可留可删)

#### CLI 与脚本工具链
> 这些是写 Node CLI 的"标配全家桶",归成一组,找的时候一眼能看到。
- yargs / inquirer / prompts(参数与交互)
- chalk / chalk-cli(着色)
- ora / cli-spinners / cli-cursor(loading)
- log-symbols / npmlog(日志)
- ansi-escapes / mute-stream
- import-local / resolve-cwd
- google/zx(写脚本) — https://github.com/google/zx
- Web 开发代码片段生成 — https://webcode.tools/

---

### 06 AI 与 Agent(🎯 你的核心目标)

> 原 `机器学习/` 文件夹是大杂烩:真·AI 资源和 TTS/数字人/PPT 插件/影视采集混在一起。
> 下面把有价值的按主题归位,删掉无关项。

#### 6.1 LLM 厂商 / 对话入口
- Anthropic — https://www.anthropic.com/
- DeepSeek 深度求索 — https://www.deepseek.com/
- MiniMax — https://chat.minimaxi.com/
- Forefront Chat — https://chat.forefront.ai/
- BAI Chat — https://chatbot.theb.ai/
- 莓用 AI — https://ai.usesless.com/

#### 6.2 Agent / 编排 / 自动化(⭐ 与目标最相关)
- **crawl4ai**(LLM 友好的爬虫,RAG 数据接入利器) — https://github.com/unclecode/crawl4ai
- **browser-use**(让 AI agent 操作浏览器) — https://github.com/browser-use/browser-use
- **UI-TARS-desktop**(字节 GUI Agent,自然语言控电脑) — https://github.com/bytedance/UI-TARS-desktop
- **Automa**(积木式浏览器自动化扩展) — https://github.com/AutomaApp/automa
- **n8n**(节点式工作流自动化,后端也常用) — https://github.com/n8n-io/n8n  *(原在开源项目)*
- **AirCode**(JS 快速建 bot/智能体) — https://aircode.io/
- 深入理解 AI Agent(在线书) — https://bojieli.github.io/ai-agent-book/
- ECC(Claude Code 等 agent harness 性能优化) — https://github.com/affaan-m/ECC

#### 6.3 AI 应用 / RAG / 文档
- ChatDOC(文档对话) — https://chatdoc.com/
- RuoYi AI(若依 AI 应用框架) — https://doc.pandarobot.chat/  *(原在开源项目)*

#### 6.4 AIGC 工具(视频/音频/图像/数字人)
- bark(Suno 文本生成音频模型) — https://github.com/suno-ai/bark
- Noiz AI(免费 TTS) — https://noiz.ai/landing
- Viggle AI(动作驱动视频) — https://viggle.ai/home
- EMO(阿里肖像动画) — https://humanaigc.github.io/emote-portrait-alive/
- 闪剪(AI 数字人视频) — https://app.shanjian.tv/
- MoneyPrinterTurbo(AI 一键生成短视频) — https://github.com/harry0703/MoneyPrinterTurbo  *(原在开源项目)*
- webnovel-writer(AI 长篇网文创作系统) — https://github.com/lingfengQAQ/webnovel-writer  *(原在开源项目)*

#### 6.5 AI 导航 / 资讯 / 学习
- AIHOT — https://aihot.virxact.com/
- AI 工具集导航(500+) — https://ai-bot.cn/
- ChatGPT 中文调教指南 — https://chatguide.plexpt.com/
- awesome-free-chatgpt(免费镜像列表) — https://github.com/LiLittleCat/awesome-free-chatgpt
- VibeVibe / cclog(AI coding 相关) — https://www.vibevibe.cn/ , https://cclog.vibeapi.cn/
- KunTab-AI(AI 书签管理新标签页扩展,可参考) — https://github.com/quin95/KunTab-AI
- Jack Cui(AI 个人站) — https://cuijiahua.com/

#### 6.6 量子计算(与 AI agent 无关,慎留)
> 这几条是"机器学习"文件夹里混进来的量子计算内容,和你当前目标完全不搭。
> 除非对量子感兴趣,否则建议删除。
- 量桨 Paddle Quantum(教程/API) — https://qml.baidu.com/
- QuTiP — https://qutip.org/
- QPanda-2 优化算法文档

#### 仍需补充(详见第四节缺口)
- TS/JS 的 LLM SDK、Agent 框架、向量库、Eval/可观测 —— 你收藏的多为"应用/产品",
  **缺的是"自己写 agent"要用的开发库**。

---

### 07 资讯·周刊·博客

#### 周刊 / 综合资讯
- JS 周刊 — https://docschina.org/news/weekly/js
- 前端精读周刊(ascoders) — https://github.com/ascoders/weekly
- InfoQ — https://www.infoq.cn/
- HelloGitHub(有趣入门级开源项目) — https://hellogithub.com/ , https://github.com/521xueweihan/HelloGitHub
- GitHub 中文排行榜 — https://github.com/GrowingGit/GitHub-Chinese-Top-Charts
- Awesome-GitHub — https://github.com/Wechat-ggGitHub
- GitHub520(解决 GitHub 访问慢) — https://github.com/521xueweihan/GitHub520
- build-your-own-x(亲手造轮子学技术) — https://github.com/codecrafters-io/build-your-own-x
- Datawhale(AI/数据开源学习社区) — https://github.com/datawhalechina *(偏 AI 学习,也可放 06)*
- awesome-free-apps(免费应用合集) — https://github.com/Axorax/awesome-free-apps
- freemediaheckyeah(免费媒体资源) — https://fmhy.net/
- npm — https://www.npmjs.com/

#### 个人博客
- Developer Way — https://www.developerway.com/
- 茂茂物语 — https://notes.fe-mm.com/
- 王先生笔记 — https://wxsnote.cn/
- 张洪 Heo — https://blog.zhheo.com/
- Lifeline — https://lifelinest.github.io/
- azhubaby — https://azhubaby.com/
- 随易科技(yicode) — https://yicode.tech/
- gogoday(GitHub) — https://github.com/gogoday
- Easy(easychen,《一人企业》作者) — https://github.com/easychen
- 咖喱君的资源库 — https://link3.cc/galijun

---

### 08 在线工具与效率

#### Playground / 在线编辑
- CodePen — https://codepen.io/
- JSRUN — https://jsrun.net/
- HTML to JSX(transform.tools) — https://transform.tools/html-to-jsx
- perf.link(JS 性能测速) — https://perf.link/
- Folo(AI Reader / RSS 阅读器) — https://github.com/RSSNext/Folo
- quick-rss — https://github.com/jaywcjlove/quick-rss

#### 隐私 / 安全 / 检测
- Browserleaks(浏览器隐私泄露检测) — https://browserleaks.com/
- Fingerprint Pro(浏览器指纹) — https://fingerprint.com/
- Mozilla Observatory(站点安全) — https://observatory.mozilla.org/ *(已在杂项)*

#### 图片 / 媒体 / 动效
- Squoosh(图片压缩) — https://squoosh.app/
- TinyPNG — https://tinypng.com/
- 图片转 DataURI — http://tool.c7sky.com/datauri/
- 位图转矢量(rast2vec) — http://www.tlhiv.org/rast2vec/
- Lorem Picsum(随机占位图) — https://picsum.photos/
- Video Compressor — https://tools.rotato.app/compress
- Miro Video Converter — http://www.mirovideoconverter.com/
- Audacity(音频编辑) — https://www.audacityteam.org/
- GIMP(图像编辑) — https://www.gimp.org/

#### 杂项
- 正则表达式备忘单 — https://ihateregex.io/
- HTML entity 编解码 — https://mothereff.in/html-entities
- pb2ts(Protocol Buffers 转 TS) — https://brandonxiang.github.io/pb-to-typescript/
- number-precision(精度计算) — https://github.com/nefe/number-precision
- Carbon(代码截图) — https://carbon.now.sh/
- ray.so(代码截图) — https://ray.so/
- WebAssembly Explorer — https://wasdk.github.io/wasmcodeexplorer/
- Let's Encrypt(免费 HTTPS) — https://letsencrypt.org/
- Mozilla Observatory(站点安全检测) — https://observatory.mozilla.org/
- REDbot — https://redbot.org/
- 网站 IP 查询 — https://www.nslookup.io/website-to-ip-lookup/
- BootCDN — https://www.bootcdn.cn/
- 地图数据 GeoJSON — https://geojson.cn/
- PDF24 Tools(在线 PDF 工具) — https://tools.pdf24.org/zh/
- ChartCube(在线图表制作,阿里) — https://chartcube.alipay.com/
- Z2H 字帖生成 — https://z2h.cn/
- 新概念英语导航 — https://nce.ichochy.com/
- reinstall(一键重装 VPS 系统脚本) — https://github.com/bin456789/reinstall
- BuildCores(3D 装机配置器) — https://www.buildcores.com/
- 大麦抢票脚本 — https://github.com/Guyungy/damaihelper *(灰色工具,慎留)*
- vue3-drag-directive — https://teernage.github.io/vue3-drag-directive/
- zTree(jQuery 树插件,老旧) — https://treejs.cn/
- Bangumi 番组计划 — https://bgm.tv/

> 以下是"开发无关或低频",建议**移出书签栏或删除**(见第三节)。

---

### 09 面试与求职

#### 面试题 / 基础
- 中级前端面试指南 — https://github.com/sl1673495/blogs/issues/52
- 大厂面试题每日一题(山月) — https://q.shanyue.tech/
- markyun 前端面试 QA — https://github.com/markyun/My-blog/
- 小林 coding — https://www.xiaolincoding.com/
- reverse-interview-zh(反问面试官) — https://github.com/perklet/reverse-interview-zh
- 中国独立开发者项目列表 — https://github.com/1c7/chinese-independent-developer
- 一人企业方法论 v2 — https://github.com/easychen/one-person-businesses-methodology-v2.0
- developer2gwy(程序员考公) — https://github.com/miss-mumu/developer2gwy
- SaDuck 公考知识库 — https://saduck.top/

#### 简历 / 平台
- 一纸简历(Markdown 简历) — https://cv.devtool.tech/
- 牛客社招 — https://www.nowcoder.com/jobs/fulltime/center

#### 远程 / 外企(相对长效)
- 电鸭社区 — https://eleduck.com/
- Thoughtworks — https://www.thoughtworks.cn/
- 之马工场 — https://www.zhimawork.com/
- Brix — https://brix-zh.webflow.io/
- 996.ICU — https://github.com/996icu/996.ICU

> 其余 2023 年的具体公司招聘链接(咪咕/腾讯音乐/豆瓣/OPPO/TCL/快手/字节/百度/拼多多/喜马拉雅)
> 均已过期,**建议整批删除**,需要时直接搜官网。

---

## 二·补、实用工具 & 其他书签(书签栏顶层)

> 这两个不在「前端」文件夹内,但你让我一并处理。
> **实用工具**基本是生活/创作工具,不属于前端技术体系,建议整体移到一个独立的
> 「生活实用」顶层文件夹(不要塞进「前端」),并做清理。
> **其他书签**(Chrome 默认的 Other Bookmarks)是大杂烩,其中 AI/开发相关的归进对应区,其余删。

### A. 实用工具 → 建议独立为「生活实用」(在前端体系之外)

按用途重新分组,并标出建议删除项:

**设计 / 图片处理**
- 稿定抠图 — https://koutu.gaoding.com/
- FocoClipping — https://www.fococlipping.com/
- remove.bg — https://www.remove.bg/zh
- 稿定在线 PS(Photopea) — https://ps.gaoding.com/
- waifu2x(图片放大降噪) — http://waifu2x.udp.jp/
- Pix Fix — https://pixfix.com/
- CodeFormer(AI 人脸修复) — https://huggingface.co/spaces/sczhou/CodeFormer  *(偏 AI,也可放 06)*
- U钙网 logo 设计 — https://www.uugai.com/
- 创客贴 — https://www.chuangkit.com/

**视频 / 剪辑 / 动图**
- 牛片网(短视频外包) — https://www.6pian.cn/
- BeeCut 视频转 GIF — https://beecut.cn/video-to-gif-online
- 光厂 VJ 师(视频/AE 素材) — https://www.vjshi.com/
- 抖音/B站视频去水印下载(dy114 / iiilab / TexhOcean / 996 四个同类)
- Runway(AI 视频) — https://app.runwayml.com/ *(偏 AI)*

**壁纸**
- wallhaven — https://wallhaven.cc/
- Wallpaper Engine Space — https://www.wallpaperengine.space/
- Wallpaper Abyss — https://wall.alphacoders.com/
- 哲风壁纸 — https://haowallpaper.com/

**思维导图 / 绘图 / 文档**
- ProcessOn — https://www.processon.com/diagrams
- Excalidraw — https://excalidraw.com/
- MD2Card(Markdown 转知识卡片) — https://md2card.com/zh
- 我来 wolai(笔记) — https://www.wolai.com/
- Google 文档 — https://docs.google.com/document/
- aconvert(在线转文档/图/音视频) — https://www.aconvert.com/

**效率 / 其他工具**
- ToDesk(远程控制) — https://www.todesk.com/
- CamScanner 扫描全能王 — https://texhocean.com/712.html
- 临时邮箱 — https://linshiyouxiang.net/
- 蓝奏云 — https://up.woozooo.com/
- Keep Screen On — https://www.keepscreenon.com/
- 优工具 / toolbon — https://www.toolbon.com/
- BURN.link(自毁消息) — https://burn.link/
- MaiPDF(PDF 安全分享/二维码) — https://maitube.com/
- Azure TTS(文本转语音) — https://azure.microsoft.com/zh-cn/services/cognitive-services/text-to-speech/
- 天行数据 / public-apis / Awesome_APIs(接口大全) → **归到 05 Node 后端「public-apis-cn」一组**
- How To Cook — https://cook.aiursoft.cn/ → **已在微信读书延伸阅读,去重**

**排行榜 / 选购**
- 盖得排行 — https://guiderank-app.com/
- 快科技天梯榜 — https://rank.kkj.cn/
- Versus(产品对比) — https://versus.com/cn

**建议从实用工具里删除的:**
- 「外网代理」整个子文件夹(8 个机场:一元机场/木瓜云/CokeCloud/龙猫云/新谷歌等)——这些是个人订阅后台,会过期、含邀请链接/账户信息,**不建议长期放书签**,要用时从密码管理器/收藏的单个稳定入口进。
- 「微信对话生成器」(伪造聊天截图)——用途灰、低频。
- MorphVOX 变声器——桌面软件,不是网页。
- 「发卡平台」两个(快发卡/云瞻)——与开发无关,生意相关的话自己留别处。
- 「新标签页 hirebrain」+「vscode.dev 工作区」+「wallhaven-573m83.jpg」三条散落在根目录的——是误拖的临时链接,删。
- 「2s0.cn VIP 视频解析」——解析接口易失效且灰色。
- 微信对话生成器、智能扫描那条指向的是第三方破解下载站(texhocean),有安全风险。
- 摸鱼岛 / 小霸王 FC 在线游戏 / Animeko / B站录播姬 / KikoPlay——属于娱乐,想留就单独建「娱乐」夹,别混在工具里。

### B. 其他书签(Other Bookmarks)逐条分流

**归到 06 AI 与 Agent(⭐ 高价值,和你目标直接相关):**
- Stagehand(给开发者+LLM 用的浏览器自动化 SDK) — https://www.stagehand.dev/ → 6.2 Agent
- WaytoAGI(通往 AGI 的 AI 知识库/工具站) — https://www.waytoagi.com/zh → 6.5 导航
- WaytoAGI AI 提示词 — https://www.waytoagi.com/zh/prompts → 6.5
- VoltAgent/awesome-design-md(丢给 coding agent 的设计系统 MD) — https://github.com/VoltAgent/awesome-design-md → 6.2/6.3
- Claude Code Templates(1000+ agents/skills/MCP) — https://www.aitmpl.com/ → 6.2
- Code Reviewer skill(Claude Code) — https://www.aitmpl.com/component/skill/development/code-reviewer
- DailyDawn(独立开发者 AI 趋势日报) — https://dailydawn.dev/ → 6.5
- AI 编程实战文章(掘金,归 6.5 或建「AI 实战文章」):
  - 复刻字节 AI 开发流(Node 脚手架) — https://juejin.cn/post/7626564822860070952
  - AI 全栈开发记账小程序 — https://aicoding.juejin.cn/post/7630857932326944803
  - Claude Code Spec Coding 实战(得物) — https://aicoding.juejin.cn/post/7615888039429160966

**归到 07 资讯·博客(职业思考类文章):**
- 卡颂:程序员转型(AI 助力转型) — https://juejin.cn/post/7496394458508984329
- 2025 年:一半无业游民一半外包牛马 — https://juejin.cn/post/7592996072705474610
- 写给年轻程序员的建议 — https://juejin.cn/post/7612479947865669675
- 我的开源项目帮独立开发者省时间 — https://juejin.cn/post/7632614384470704128

**归到 09 面试:**
- 前端面试常见 10 个场景题(双越) — https://juejin.cn/post/7612495518645174323
- 在线简历生成(dnd-resume) — https://dnd-resume.com/

**归到对应技术区:**
- Linux 命令搜索引擎 — https://wangchujiang.com/linux-command/ → 05 Node/后端(后端必会)
- 前端性能监控 SDK 手写 — https://juejin.cn/post/7586482860104613915 → 04 工程化
- Fantastic-admin 权限验证文档 — https://fantastic-admin.hurui.me/guide/auth.html → 02 React/Vue 后台
- vue 自定义布局+菜单+路由 — https://cloud.tencent.com/developer/article/2416449 → 02 Vue
- 化简(开源简历制作) — https://huajian.smallpig.site/ → 09 简历

**个人 / 兴趣(可留可删,与开发无关):**
- Jira Dashboard(公司内网) — http://jira.ruixin.net/ → 失效内网链接,删
- 名侦探柯南 各卷目录 / 各集列表(百度百科) — 兴趣,自己留别处
- 卢内尔 lunel.dev — 个人站,不知是什么
- 电脑开荒网(找工具) — https://www.cyhaoka.vip/
- 数字直觉排行榜 — https://numfeel.996.ninja/pages/leaderboard/

**建议直接删:**
- 上面这些掘金文章如果不打算重读,文章类书签极易堆积,建议读完即删或用稍后读(Pocket/Cubox)管理,不要长期占书签栏。

---

## 三、建议直接删除 / 取消关联

| 书签 | 原位置 | 原因 |
|---|---|---|
| HelloWindows.cn(Windows 激活) | 工具/windwos激活 | 盗版系统,与开发无关,有安全风险 |
| 100px.net 抽奖插件 | 工具/抽奖插件 | 一次性需求,无长期价值 |
| Disqus 评论插件 | 工具/评论插件 | 国外服务,国内基本用不上 |
| webpack-autoconf | 编译工具 | 已停更,引用了 Snowpack(已废弃) |
| Babel 2021 博客 | 编译工具 | 过时新闻,不是文档 |
| 2023 各公司招聘链接 ×11 | 面试/简历投递 | 全部过期 |
| Miro Video Converter | 工具 | 桌面软件,不是网页资源,且久未更新 |
| YouTube | 数据 | 误放,不是数据工具 |
| 网易云音乐 NodeJS API | nodejs | 第三方练手项目,文档站不稳定 |
| ethers.js(Web3) | Web3.0 | 若不做链上开发可删;要做则归 AI 之外单独留 |
| pdf2docx / pyscript / iswbm | Python | 三条都很弱,与 AI Python 栈无关,删 |
| Apifox 重复条目 | 工具/测试 + 数据 | 保留一条,放 04/质量与测试 |
| Normalize.css 重复 | CSS + 工具/样式标准化 | 保留一条,放 03/CSS 工程化 |
| 缓动函数速查 重复 | CSS + 工具/动画 | 保留 easings.net 一条 |
| perf.link 重复两条 | 工具/代码测速 | 完全相同 URL,删一条 |
| unplugin-auto-import 重复 | Vue + 工具/自动导入 | 保留在 Vue 区 |
| css-doodle 重复两条 | 工具/CSS绘制 | 保留一条 |
| gogoday(空 GitHub 主页) | Javascript | 无内容,可删 |
| **开源项目/开源项目(整个嵌套子文件夹)** | 开源项目 | 50 条与外层完全重复,整个删掉 |
| npm 首页 | 开源项目 | 不是收藏,直接搜即可 |
| 影速 yingsu(影视采集接口测速) | 机器学习 | 影视采集灰产工具,与学习/工作无关 |
| MotionGo(PPT 动画插件) | 机器学习 | 办公插件,非开发 |
| 量子计算三条(量桨/QuTiP/QPanda) | 机器学习 | 与 AI agent 目标无关,不感兴趣就删 |
| zTree(jQuery 树插件) | 开源项目 | jQuery 时代遗留,已过时 |
| Bangumi 相关(若不做该项目) | 开源项目 | 你的 fork 可留作个人项目,其余看情况 |

---

## 四、面向 AI 全栈(Agent)目标的缺口分析

你现有书签的**重心 95% 在前端**,后端只有最薄的一层(Express/Nest + Mongo),
AI 几乎为零。要成为 AI 全栈(agent)工程师,建议补充并新建对应书签夹:

### 4.1 LLM 与 AI 运行时
- **Vercel AI SDK**(TS 首选,和你前端背景最搭)— https://sdk.vercel.ai/
- **Anthropic SDK / 文档** — https://docs.anthropic.com/ , https://github.com/anthropics/anthropic-sdk-typescript
- **OpenAI SDK / Node** — https://github.com/openai/openai-node
- **AI SDK 模板 / create-ai-sdk**

### 4.2 Agent 编排框架
- **Mastra**(TS 原生 agent 框架)— https://mastra.ai/
- **LangChain.js / LangGraph.js** — https://js.langchain.com/
- **Inngest**(Agent 工作流/队列)— https://www.inngest.com/
- (了解) Mastra / LlamaIndex.TS / VoltAgent

### 4.3 数据 / RAG / 向量库
- **Pinecone / Chroma / Qdrant**(托管向量库)
- **pgvector + Prisma**(关系库 + 向量,比 Mongo 更适合 AI 后端)
- **LlamaIndex**(数据接入/RAG)
- **Embeddings 评测 / Ragas**

### 4.4 后端基础设施(你目前最缺)
- **Prisma / Drizzle ORM** — https://www.prisma.io/ , https://orm.drizzle.team/
- **PostgreSQL** 文档 / **Redis**
- **Docker / docker-compose**
- **tRPC**(端到端类型安全,前端友好)
- **Hono**(轻量 Web 框架,边缘/AI 场景常用)
- 鉴权:**Better Auth / Lucia / Auth.js**

### 4.5 Python AI 栈(后端/agent 生态主流)
- Python 官方教程 / **FastAPI**(AI 服务最常用后端框架)
- **uv / poetry / ruff**(现代 Python 工具链)
- **pydantic**
- **LangChain / LlamaIndex / LangGraph**(Python 版生态最全)
- **Jupyter / pandas**(数据处理)

### 4.6 可观测 / Eval(Agent 工程化关键)
- **LangSmith / Langfuse / Helicone**(LLM 调用追踪)
- **Braintrust / promptfoo**(Eval)

### 4.7 部署
- **Cloudflare Workers / Pages**、**Vercel**、**Fly.io**、**Railway**
- **Supabase / Neon**(Serverless Postgres)

---

## 五、卡片化建议(后续做 moyutab 卡片)

按你后续「同类/同领域做成卡片」的想法,以下几类**高频、链接固定、值得做成卡**:

1. **「前端速查」卡** — MDN / javascript.info / TS Playground / Can I Use / AST explorer / CSS-Tricks,做成图标网格(类似现有社区卡)。
2. **「CSS 生成器」卡** — 渐变/阴影/flex/grid/贝塞尔/easing 等一组,做成 chip 行或网格。
3. **「在线工具」卡** — Carbon / Squoosh / TinyPNN / CodePen / regex / perf.link。
4. **「浏览器扩展开发」卡** — crxjs / Plasmo / create-chrome-ext / MV3 文章 / VSCode 插件文档。
   你正在做扩展,这个最实用。
5. **「周刊·博客」卡** — JS周刊/前端精读/InfoQ + 个人博客 RSS 聚合(可考虑真的拉 RSS)。
6. **「AI 全栈导航」卡**(新) — 上面第四节的链接,按 SDK / Agent / RAG / 基建分组,chip 形式。
   这会是你每天打开新标签页都能看到的学习路线提示。

> React 组件库虽然数量多,但属于"写代码时搜 npm"的场景,**不建议做成卡片**——
> 保持在浏览器书签里、或归档到 GitHub awesome list 更合理。

---

## 六、执行建议

1. **先删**第三节里那些(20+ 条),立刻清爽一半。
2. **按第一节结构新建文件夹**,把保留项拖进去(Chrome 书签管理器支持批量拖)。
3. **新建 `06 AI 与 Agent` 文件夹**,先把第四节 4.1–4.2 的链接加入——这是方向标。
4. Node 后端那块把 CLI 全家桶单拎一组,以后写脚本不用翻。
5. 过期招聘整批删,只留远程/外企几条长效的。
