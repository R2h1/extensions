# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm install                # Install all deps (npm workspaces)
npm run lint               # ESLint over packages/
npm run lint:fix           # ESLint with autofix
npm run typecheck          # tsc --noEmit for both packages
npm run format:fix         # Prettier write over packages/**/*.ts

# Build one package (each builds to its own packages/<pkg>/dist/)
npm run build:moyu         # 闲页 esbuild bundle + asset copy
npm run build:community    # 书搭子 esbuild bundle + asset copy
npm run build:all          # moyu + community

npm run pack:moyu          # Zip packages/moyu-tab/dist/ → releases/
npm run pack:community     # Zip packages/reading-community/dist/
npm run icons              # Generate placeholder icons
```

There is no test suite. Verify changes with `npm run typecheck` (tsc --noEmit — the esbuild bundles are not type-checked), `npm run lint`, and the build.

## Architecture

**Monorepo** ([npm workspaces](package.json)) with two packages under `packages/`. All are Manifest V3 Chrome extensions, 100% local (no backend, no uploads).

### `@extensions/moyu-tab` (packages/moyu-tab/) — 闲页, the main project

A new-tab dashboard (`chrome_url_overrides.newtab`) with a large collection of widgets. This is where almost all active development happens.

**Build** ([scripts/build-bundle.cjs](packages/moyu-tab/scripts/build-bundle.cjs)): esbuild bundles three `src/` entry points to `dist/`; [copy-assets.cjs](packages/moyu-tab/scripts/copy-assets.cjs) then copies non-`.ts` files (HTML, JSON — including `manifest.json`) into `dist/`. The extension loads from `dist/`, so **any edit to newtab.html / static assets / manifest requires `npm run build:moyu` before reloading** in `chrome://extensions`.

Three entry points:
- **Background** [sw.ts](packages/moyu-tab/src/background/sw.ts) — single MV3 module service worker. Handles pomodoro timer state (persisted to `chrome.storage.local` key `moyu_pomodoro`), `chrome.alarms` ticks, water-reminder notifications, and delegates site tracking to site-tracker.ts.
- **Site tracker** [site-tracker.ts](packages/moyu-tab/src/background/site-tracker.ts) — tab/page-time accumulation feeding the 网站统计 widget (same domain-grouping idea as the old tracker).
- **New tab** [newtab/newtab.ts](packages/moyu-tab/src/newtab/) — the page runtime (~700 lines). Imports every widget's `init*`/`render*Card` and wires them into the DOM. This is the **single source of truth for widget registration**.
  - [boot.ts](packages/moyu-tab/src/newtab/boot.ts) — micro-script loaded in `<head>` before body render; toggles the `locked` class so the lockscreen doesn't flash the sidebar on refresh. MV3 CSP forbids inline scripts, hence the external file.
  - [config.ts](packages/moyu-tab/src/newtab/config.ts) — static metadata: category tree (`CAT_TREE`), widget registry (`ALL_WIDGETS`), and linear SVG icon strings.
  - [utils.ts](packages/moyu-tab/src/newtab/utils.ts) — small shared helpers.
  - [newtab.html](packages/moyu-tab/src/newtab/newtab.html) — **all CSS is inline here** (no separate stylesheet). Add/change styles in this file.

**Widgets** (`src/newtab/widgets/*.ts`) — one file per widget/card. Each conventionally exports `init*` (attach listeners / set up state) and `render*Card` (return an HTML string or mutate the DOM). Other widgets are wired by direct `init*`/`render*Card` imports in newtab.ts (weather, typhoon, weread, news, stats, …). The top dock (`#topDock`, driven by `DOCK_ITEMS` + `renderTopDock()`) hosts external links (工具箱 / 行情 / 热搜) opened on conan.js.cn.

> **工具策略（重要）**：所有计算/工具类功能一律在网站 **https://conan.js.cn/** 实现（Vue SPA，含工具箱：JSON/时间戳/Base64/URL/HTML/哈希/UUID、颜色/二维码/WiFi 二维码/两步验证/汇率、房贷/房贷提前还款/个税/BMI、今天吃什么、除夕/红包模拟器等）。**moyu-tab 不再内置工具**（「今天吃什么」「行情」「热搜」等卡片已移除，由网站承接）。闲页在顶部搜索框下方保留一行低调的快捷入口（`#topDock`，由 `DOCK_ITEMS` 配置数组驱动、`renderTopDock()` 渲染，chip 用 `mkt-link-chip` 胶囊样式；当前含「工具箱 / 行情 / 热搜」入口，均 `target="_blank"` 新标签页打开，分别指向 conan.js.cn 根路径、`/market`、`/hot`；锁屏态隐藏）。**新增入口只需往 `DOCK_ITEMS` 加一条配置；工具本体在网站侧实现，不要往 moyu-tab 里加计算器/工具组件**。

Data widgets pull from public JSON APIs (open-meteo, weread, typhoon.slt.zj.gov.cn, etc.) — host permissions are declared per-widget in [manifest.json](packages/moyu-tab/src/manifest.json).

**Styling conventions** (see project memory): card-title icons are linear SVG (`stroke="currentColor"`, no emoji); buttons use flat backgrounds, never inset shadows (`box-shadow: var(--nm-in)`); `:active` press feedback is fine but not inset-default. Market cards use red-up/green-down (Chinese convention).

### `@extensions/reading-community` (packages/reading-community/) — 书搭子

A lightweight note-taking extension (background SW + a `community` page). Same esbuild build pattern as moyu-tab. Much smaller scope.

## Data Flow

```
moyu background sw.ts (alarms/pomodoro) ──┐
                                         ├─ chrome.storage.local
newtab widgets (fetch public APIs) ───────┘
```

- `moyu_pomodoro` — pomodoro state (`chrome.storage.local`)
- `moyu_water` — water-reminder state
- site-tracker writes its own keys for the 网站统计 widget

## Development Tips

- **Editing moyu-tab**: always run `npm run build:moyu` and reload the extension after changing source, HTML, or manifest.
- **Adding a new widget**: create `newtab/widgets/<name>.ts`, import its `init`/`render` into newtab.ts, register it via a direct import, and add the card styles to inline CSS in newtab.html. Add any new API host to `manifest.json` `host_permissions`. **For calculator/utility tools: implement them on `conan.js.cn` instead — do not add tool widgets to moyu-tab.**
- Static runtime facts that change (data-source endpoints, field names, API quirks) are worth persisting to the project memory directory, not just the code.