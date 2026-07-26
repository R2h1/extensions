# 微信读书卡片重构：6 卡 → 1 概览卡 + 弹窗

## 目标
把 `study/read` 下的 6 张微信读书卡（weread/readdata/recommend/notes/review/search）收拢为 **1 张概览卡 + 1 个弹窗**。概览卡常驻面板，展示统计三宫格 + 在读 + 五个入口；弹窗用 tab 承载书架/统计/笔记/书评/推荐/搜书六视图。复用现有 SW fetch 通道与各 widget 的 render/init，不改 SW。

## 现状关键事实（已核实）
- 6 个 widget 共用 `weread-shared.ts` 的 API Key，各自独立 loadCache/refresh/render + visibility 刷新，结构高度雷同。
- SW（sw.ts:1254-1274）已处理全部 6 条 `WEREAD_*_FETCH` 消息 → **无需改 SW**。
- newtab.ts:19 从 `./config` 导入 `ALL_WIDGETS`/`CAT_TREE`（非旧 memory 说的"自带副本"）→ config.ts 是唯一源。
- 弹窗模式有现成范例：`toolkitModal`（单 pane，`#tkContent .widget-card` 剥外壳）、`widgetModal`（`.wm-tabs` 顶 tab）。均可照搬。
- 组件存储：`getWD()` 存 `{subs:{'cat.sub':[ids]}, v:WV}`，`WV=8`。版本不匹配即按 `ALL_WIDGETS` 重组迁移。
- 概览卡数据来源：readdata（3 统计）+ shelf（在读书）。Shelf 的 `WRShelfBook` 无 progress 字段 → 在读行**不显示进度%**，只显示书名/作者/读完标签。

## 改动清单

### 1. config.ts
- 将 6 条 read 条目合并为 1 条：
  `{ id:'weread', name:'微信读书', desc:'书架/统计/笔记/书评/推荐/搜书', cat:'study', sub:'read' }`
- 移除 readdata/recommend/notes/review/search 五条。

### 2. newtab.ts — 迁移版本号
- `WV` 8 → 9（注释：合并读书卡片）。
- `getWD()` 迁移逻辑加一条映射：遇到旧 id `readdata|recommend|notes|review|search` 时，等价于 `weread`（确保曾开过任意读书卡的用户不丢卡片）。实现：在 `feed()` 内加 `if (['readdata','recommend','notes','review','search'].includes(id)) id='weread';` 前置。

### 3. newtab.ts — dispatch 收敛
- `getCard()`：`weread` 分支改为 `renderWereadOverviewCard()`；删 readdata/recommend/notes/review/search 五分支。
- `initW()`：`weread` 分支改为 `initWereadOverview()`；删五分支。
- 保留对 6 个 widget 模块的 import（弹窗 pane 仍要用 `renderXxxCard/initXxx`）。

### 4. 新增 widgets/weread-overview.ts（概览卡）
导出 `renderWereadOverviewCard()` + `initWereadOverview()`。
- 结构：`.hot-head`（📚 微信读书 + 更新时间 + ↻）+ `.readdata-stats` 三宫格（复用）+ `.wr-ov-hero`（在读书，链向 deepLink）+ `.wr-ov-chips`（5 个入口按钮：书架/笔记/书评/推荐/搜书）。
- 数据：复用 readdata.ts / weread.ts 的缓存。把两文件的 `loadCache` 改为 `export`（`loadReaddataCache`/`loadShelfCache`）并 export `RDStat`/`WRShelfBook` 类型。概览卡读这两个缓存即时渲染；任一缺失/过期则发 `WEREAD_READDATA_FETCH`/`WEREAD_SHELF_FETCH` 拉取并写回同一缓存（与弹窗统计/书架 tab 共享）。
- Key 未设置 → `renderWereadKeySetup()`（复用）。
- ↻ 刷新：同时拉 readdata + shelf，spin 反馈。
- 入口 chip 点击 → `openWereadModal(tab)`。
- visibilitychange：TTL 过期自动刷新（同各 widget 既有模式）。
- 在读书选取：shelf 中按 isTop→readUpdateTime 排序，取第一本未 `finished` 的；全读完则取最新一本。

### 5. newtab.html — 弹窗 markup（仿 toolkitModal）
在 `#toolkitModal` 后加：
```
<div class="mo" id="wereadModal"><div class="ms" style="max-width:560px">
  <div class="mh"><span class="mt">微信读书</span><button class="mc" id="wrModalClose">✕</button></div>
  <div class="wm-tabs" id="wrModalTabs"></div>
  <div class="modal-content" id="wrModalContent" style="max-height:70vh"></div>
</div></div>
```

### 6. newtab.ts — 弹窗逻辑（仿 toolkitModal 单 pane 模式）
- `WR_TABS`：`[{id:'shelf',name:'书架',render:renderWereadCard,init:initWeread},{id:'readdata',name:'统计',render:renderReaddataCard,init:initReaddata},{id:'notes',name:'笔记',render:renderNotesCard,init:initNotes},{id:'review',name:'书评',render:renderReviewCard,init:initReview},{id:'recommend',name:'推荐',render:renderRecommendCard,init:initRecommend},{id:'search',name:'搜书',render:renderSearchCard,init:initSearch}]`
- `openWereadModal(tab='shelf')`：渲染 tab bar（`.wm-tab`，active=tab）→ `renderWrPane(tab)` → open。
- `renderWrPane(id)`：`wrModalContent.innerHTML = render()`; `init()`。**同一时刻只挂载一个 pane**（避免固定 id 冲突，照 toolkitModal）。
- tab 切换 → `renderWrPane(newId)`。
- 关闭：`#wrModalClose` + 背景点击。
- 既有 `initXxx()` 的 `xxInited` 守卫 + visibility 监听保持不变；pane 未挂载时 `refreshXxx` 因 `getElementById` 为空自动 return，安全。

### 7. newtab.html — CSS（inline `<style>`）
- `.wr-ov-hero`（书名+作者+读完 tag，一行省略，hover 变 accent）、`.wr-ov-chips`（flex wrap）、`.wr-ov-chip`（小按钮，扁平背景，遵守 [[no-inset-buttons] 不用内阴影）。
- 弹窗剥外壳：`#wereadModal .widget-card{background:transparent;box-shadow:none;padding:0}`、`#wereadModal .hot-title{display:none}`、`#wereadModal .hot-head{justify-content:flex-end;margin-bottom:6px}`（保留各 pane 自己的 ↻ 刷新）。
- `#wrModalContent` 滚动条样式（同 `.news-pane`）。

## 不改的部分
- SW / manifest：fetch 通道已就绪。
- 6 个 widget 文件内部逻辑：仅 readdata.ts、weread.ts 各加一个 `export`（loadCache + 类型），其余不动；全部被弹窗 pane 复用。
- state.ts：死代码，不动。

## 验证
1. `cd packages/moyu-tab && npm run build`（esbuild 打包 + copy-assets）。
2. 重载 `dist/` 为未打包扩展。
3. 面板：仅一张"微信读书"概览卡，三宫格 + 在读 + 5 chip 正常；↻ 刷新；未设 Key 时显示输入 UI。
4. 点 chip / 各 tab：弹窗打开，切换 tab 各 pane 正常渲染、各自 ↻ 刷新可用；搜书 tab 输入可搜。
5. 老用户迁移：曾启用任一读书卡的，刷新后概览卡仍在（WV 8→9 触发重组映射）。
6. 组件库弹窗：study/read 下只剩"微信读书"一个条目。

## 风险
- 既有 `initXxx()` 的 `xxInited` 全局守卫：同一会话内首次 init 后不再做"过期自动拉取"分支，pane 重开只从缓存渲染。表现为偶尔需手动点 ↻——属既有行为，非本次回归。可接受。
- 概览卡与统计 tab 共享 readdata 缓存：一方刷新，另一方下次渲染即同步；无实时事件，可接受。
