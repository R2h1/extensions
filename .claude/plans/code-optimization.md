# 闲页 Monorepo 代码优化方案

> 目标：先恢复可回归的基线（lint 绿），再按风险从低到高消除死代码、拆解巨型文件、去手写分支、收敛重复样板，最后做构建与 CSS 瘦身。
> 原则：一次只动一个主题，每步以 `npm run lint` 绿 + `npm run build:moyu` 成功 + Chrome 重载手验为完成标准。

---

## 0. 现状基线（已核实，2026-08）

| 项 | 现状 |
|---|---|
| `npm run lint` | **失败**：193 problems（182 errors / 11 warnings），其中 157 个 prettier 可自动修复 |
| 死代码 1 | `newtab/lunar.ts`（127 行）：完整的农历算法副本，**无任何 import**；`newtab.ts` L693-993 内联了同一份（LUNAR_MONTH/LUNAR_DAY/LUNAR_INFO + lYearDays/lLeapMonth/lLeapDays/lMonthDays/getLunar） |
| 死代码 2 | `newtab/widgets/review.ts`（158 行）：`renderReviewCard`/`initReview` 导出后**无引用**（微信读书弹窗「书评」视图用的是 `weread-shared.openBookReviewIn`）；该文件还自带 2 个 lint error（no-empty + prettier） |
| 巨文件 | `newtab.ts` 1871 行（~10 个无关子系统）、`background/sw.ts` 1668 行（onMessage 巨型 if-else）、`newtab.html` 98KB（其中 `<style>` 内联块 80KB，占 82%） |
| 死文件 | `state.ts` 上一提交已删除 ✓；`packages/shared` 已删除 ✓ |
| 测试 | 无测试套件，靠 lint + build 验证 |

依赖图已核实：`market.ts→quotes/sectors/watchlist`（行情 tab）、`news.ts→aihot/zhihu/sina-flash`（资讯 tab）、`weread-overview.ts→readdata/weread/recommend`（缓存复用）——除 review.ts 外无其他孤儿。

---

## Phase 1 — 安全网 + 死代码（低风险，先做）

### 1.1 恢复 lint 绿色基线
- `npm run lint:fix` 自动修 157 个 prettier 项；剩余手工处理（社区扩展 `community.ts` 也有多处 prettier error）。
- 收益：建立可回归基线，后续每个 Phase 改完能立刻看到是否引入新问题。

### 1.2 删除死代码
- **删 `widgets/review.ts`**（158 行，顺带消掉 2 个 lint error）。删前确认无 import（已核实）。
- **`lunar.ts` 二选一**：
  - 方案 A（最小）：直接删 `lunar.ts`（127 行死文件，newtab.ts 内联副本继续用）。
  - 方案 B（推荐，省 ~300 行）：`newtab.ts` 删 L693-993 内联副本，改为 `import { getLunar } from './lunar'`，让 `lunar.ts` 成为真正单一来源。属纯机械替换，`getLunar(y,m,d)` 签名一致（时钟 L1002、日历 L1556 两个调用点不变）。

## Phase 2 — sw.ts onMessage 派发表（低风险）

现状：`sw.ts` L1480-1554 巨型 if-else（约 30 个分支，每个分支调一个已存在的 `handleXxx()`）；最后的 `else` 兜底进 pomodoro，属隐藏陷阱。

改法：
```ts
const HANDLERS: Record<string, (msg: any) => Promise<any>> = {
  FUND_FETCH: (m) => handleFundFetch(m.codes ?? []),
  STOCK_FETCH: (m) => handleStockFetch(m.codes ?? []),
  // ... 全部约 30 个分支平铺
  TRACKER_RANKINGS: (m) => getSiteRankings(m.period || 'day'),
  SCREENON_ON: () => screenOnEnable(),
  WATER_SET_REMINDER: (m) => setWaterReminder(m.interval ?? 0),
  POM_GET_STATE: (m) => handlePomodoroMessage(m),
  // ...
};
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  const h = HANDLERS[message?.type];
  (h ? Promise.resolve(h(message)) : Promise.resolve({ success: false, error: 'unknown' }))
    .then(sendResponse);
  return true;
});
```
- 纯机械平移，不改任何 handler 逻辑，行为等价。
- 收益：新增消息 = 加一行表项；未知消息显式失败；pomodoro 不再悄悄吞掉拼错的消息类型。

## Phase 3 — newtab.ts 子系统拆分（中风险，一次一个）

把 ~10 个无关子系统从 1871 行单文件里拆出去，每个独立成文件后立即 build + 手验：

| 子系统 | 行段 | 目标文件 |
|---|---|---|
| 摸鱼工资模拟 | L1009-1296（~350 行） | `newtab/widgets/salary.ts` |
| 壁纸（IndexedDB + 压缩） | L1303-1491（~200 行） | `newtab/widgets/wallpaper.ts` |
| 农历 | L693-993 | `lunar.ts`（见 Phase 1.2 方案 B） |
| Toast | L453-486（~35 行） | `newtab/ui/toast.ts` |
| 设置弹窗（时间/工资/微信读书/喝水） | L488-626（~140 行） | `newtab/ui/settings.ts` |
| 音乐/媒体/电视弹窗 | L1668-1785（~120 行） | `newtab/widgets/media.ts` |
| 搜索框多引擎 | L1786-1838（~55 行） | `newtab/widgets/searchbox.ts` |

- 做法：纯搬移 + `export` + 顶部 import，不改逻辑。共享的 `pad`/`esc` 已在 `utils.ts`，复用即可。
- 收益：每个文件职责单一；`init()`（L1847）变成一列 `initXxx()` 调用，可读性大增。

## Phase 4 — widget 注册表化（getCard/initW 去手写分支）

现状：加一个组件要改 4 处——`config.ts` 注册、`newtab.ts` import、`getCard()` if 分支、`initW()` switch 分支。

改法：给 `ALL_WIDGETS`（config.ts）增加可选 `render`/`init` 字段（或建独立的 `WIDGET_IMPL: Record<string,{render,init}>` map，避免 config 引入 DOM 依赖）：
```ts
// newtab.ts
const WIDGET_IMPL: Record<string, { render: () => string; init: () => void }> = {
  weread: { render: renderWereadOverviewCard, init: () => initWereadOverview(...) },
  hot: { render: renderHotCard, init: initHotCard },
  // ...
};
function getCard(w: WID) { return WIDGET_IMPL[w.id]?.render?.() ?? fallback(w); }
function initW(id: string) { if (!rendered[id]) { rendered[id] = true; WIDGET_IMPL[id]?.init?.(); } }
```
- 收益：新增组件 = 1 条注册 + 1 条表项，删掉 getCard if 链与 initW switch。与 Phase 3 的 `salary` 等非组件子系统无关，可独立做。

## Phase 5 — weread 六卡样板 DRY（高风险，最后）

`weread.ts` / `readdata.ts` / `recommend.ts` / `notes.ts` 各 ~150 行高度雷同：`const XX_CACHE / XX_TTL`、`loadCache/saveCache`、`renderX`（key 校验 → 缓存 → 失败态 → 空态）、`refreshX`（loading 锁 + spin + 错误归一）、`onXVis`（visibilitychange + TTL）、`initX`（`xxInited` 守卫）。

改法：抽 `widgets/weread-core.ts`，提供 `makeCachedWidget<T>({ cacheKey, ttl, fetchType, loadKey, render, mapData })` 工厂，把「缓存读/写/TTL/刷新/spin/失败态/visibility」收敛到一处；各卡只留数据映射与渲染模板。
- **风险**：这几个卡同时被 `weread-overview.ts` 和弹窗 pane 复用，行为必须逐项对照；且 `initXxx` 的 `xxInited` 全局守卫是既有行为，重构时不得顺手"修"（会改变弹窗重开行为）。
- 收益：~600 行重复样板 → ~200 行，后续给微信读书加新视图的成本大幅下降。

## Phase 6 — 构建与 CSS 瘦身（低风险）

### 6.1 esbuild minify
`packages/moyu-tab/scripts/build-bundle.cjs` 与 `reading-community/scripts/build-bundle.cjs` 的 esbuild 配置加 `minify: true`（保留现有 `sourcemap: true`）。esbuild 压缩极快，直接缩小 SW/newtab 产物体积。产物是 `dist/`，不影响源码可读性。

### 6.2 newtab.html 80KB 内联 CSS
- 低风险第一步：给 `<style>` 内按区块（面板/卡片/弹窗/时钟/日历/壁纸/音乐/锁屏…）补注释分节 + 合并重复规则。
- 中风险第二步（可选）：拆出 `newtab.css` 用 `<link rel="stylesheet" href="newtab.css">` 引入。MV3 扩展页面允许 link 本地 CSS；需在 `copy-assets.cjs` 里加入 `.css` 拷贝，且构建后重载验证无闪变（CSP 不拦本地样式表）。

## Phase 7 — 治理（长期）

- **补最小测试**：目前 0 测试。优先给纯函数加：农历 `getLunar`、工资模拟 `salRate/tickSalary`、tracker 聚合、`getWD` 迁移逻辑。可用 `node:test` + 编译后跑，或引入 vitest。
- **lint 纳入提交门槛**：`npm run lint` 进 pre-commit（目前 lint 一直失败，没人守）。
- **静态运行事实沉淀**：数据源端点/字段/API 坑（微信读书 Key、微博防盗链 referer 规则等）按 CLAUDE.md 建议写进 project memory。

---

## 建议执行顺序与依赖

```
Phase 1（基线绿 + 删死代码）  ← 必须先做，给后续当安全网
  → Phase 2（sw 派发表）       ← 独立，机械
  → Phase 3（newtab 拆分）     ← 每子系统独立提交
  → Phase 4（widget 注册表）   ← 依赖 Phase 3 的收敛
  → Phase 5（weread DRY）      ← 依赖 1.2 删 review 后，风险最高放最后
  → Phase 6（minify + CSS）    ← 独立，随时可做
  → Phase 7（测试/CI）         ← 长期
```

## 验证清单（每个 Phase 通用）
1. `npm run lint` 全绿（或零新增错误）。
2. `npm run build:moyu`（及 build:community 若动到）构建成功。
3. `chrome://extensions` 重载 `dist/`，手验：面板双列渲染、行情/热搜/资讯/微信读书概览卡、弹窗各 pane、设置、番茄钟、喝水、壁纸、锁屏。
4. 老用户组件状态不丢（`WV` 版本语义不变，本方案**不改 WV**）。

## 明确不做（防止范围蔓延）
- 不改 `WV=8` 存储结构、不引入数据迁移。
- 不重写业务逻辑（工资算法、农历算法、tracker 聚合数值保持原样）。
- 不往 moyu-tab 加任何工具组件（工具策略不变，工具箱仍在 conan.js.cn）。
- 不引入新框架 / 状态管理库（保持 esbuild + 原生 DOM 现状）。

---

## 执行状态（2026-08-17）

### ✅ 已完成
- **Phase 1**：`npm run lint` 从 193 problems → **0 errors / 12 warnings（全为既有且有意的类型）**。
  - eslint.config.mjs 加 `no-empty: {allowEmptyCatch: true}`（空 catch 吞错误是既有模式）。
  - 删死代码 `widgets/review.ts`（158 行，无引用）；修 `typhoon.ts` no-self-assign、`community.ts` 未用变量、`service-worker.ts` 未用接口。
  - lunar 单一来源：`lunar.ts` 已 `import { getLunar }`，newtab.ts 内联副本（303 行）删除。
- **Phase 2**：sw.ts `onMessage` 巨型 if-else（~30 分支）→ `HANDLERS` 派发表 + 3 行 listener；未知消息显式失败，pomodoro 不再吞掉拼错类型。
- **Phase 3**：newtab.ts **1871 → 705 行**，拆出：
  - `widgets/salary.ts`（工资引擎 + schedule/salStt 状态，导出供设置弹窗与 init 用）
  - `widgets/wallpaper.ts`（IndexedDB 壁纸，右键菜单用 setter 注入解耦）
  - `widgets/media.ts`（APlayer + 视频弹窗，APlayer import 随之移走）
  - `widgets/searchbox.ts`、`ui/toast.ts`、`ui/settings.ts`（设置弹窗壳）
- **Phase 6**：两个 `build-bundle.cjs` 加 `minify: true`（sw.js 压缩到 3 行）；newtab.html `<style>` 加 7 个分节横幅（基础/布局/卡片/弹窗/功能卡/组件库/浮层）。

### ⏳ 未做（按选择跳过）
- **Phase 4** widget 注册表化（getCard/initW 去手写分支）——新组件仍需改 2-3 处。
- **Phase 5** weread 四卡样板 DRY（`makeCachedWidget` 工厂）——风险最高，未动。
- **Phase 7** 测试 / lint 进 pre-commit / memory 沉淀。

### ✅ 顺手修复的既有 bug（2026-08-17 追加）
- **`tk` 未声明变量**：newtab.ts Escape 处理器引用已移除的 toolkit modal 的 `tk`，按 Escape 会抛 `ReferenceError`。已删除该行（widget/设置弹窗关闭行为不变，不再有报错）。
- **`sw.ts` `showNotification` 类型错误**：@types/chrome 只给 `notifications.create` 回调式签名（返回 `void`），原代码 `return await create(...)` 类型不符。改为 Promise 包装（走回调拿通知 id），类型安全且兼容所有环境。
- **`stats.ts` `loadCache` 类型错误**：catch 分支返回 `{ day: undefined, ... }` 但声明为 `Record<Period, StatsCache>`。返回类型改为 `Record<Period, StatsCache | undefined>`（消费端 `if (!c)` / `if (c)` 本就按可空处理，行为不变）。
- **新增类型检查门槛（已落地）**：根目录 `npm run typecheck`（= `tsc --noEmit` × 两个包）现已 0 errors，并写入 README 命令表与 CLAUDE.md 常规验证说明（此前存在 4 个类型错误 + `tk` 未声明变量，esbuild 不查类型故一直漏网）。建议再加 pre-commit / CI。

### 验证
- `npm run lint`：0 errors。
- `npm run build:all`：moyu-tab + reading-community 均构建成功（含 minify）。
- 待人工在 Chrome 重载 `dist/` 手验：面板渲染、设置保存（作息/发薪日）、微信读书 Key 设置、壁纸上传、锁屏 Escape、音乐/视频、右键菜单。**WV 未变，老用户组件状态不丢。**
