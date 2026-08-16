# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm install                # Install all deps (npm workspaces)
npm run lint               # ESLint over packages/
npm run lint:fix           # ESLint with autofix
npm run format:fix         # Prettier write over packages/**/*.ts

# Build one package (each builds to its own packages/<pkg>/dist/)
npm run build:moyu         # 闲页 esbuild bundle + asset copy
npm run build:community    # 书搭子 esbuild bundle + asset copy
npm run build:all          # moyu + community

npm run pack:moyu          # Zip packages/moyu-tab/dist/ → releases/
npm run pack:community     # Zip packages/reading-community/dist/
npm run icons              # Generate placeholder icons
```

There is no test suite. Type errors surface via `npm run lint` (the esbuild bundles fail on syntax errors but are not type-checked), so rely on lint plus the build for verification.

## Architecture

**Monorepo** ([npm workspaces](package.json)) with two packages under `packages/`. All are Manifest V3 Chrome extensions, 100% local (no backend, no uploads).

### `@extensions/moyu-tab` (packages/moyu-tab/) — 闲页, the main project

A new-tab dashboard (`chrome_url_overrides.newtab`) with a large collection of widgets. This is where almost all active development happens.

**Build** ([scripts/build-bundle.cjs](packages/moyu-tab/scripts/build-bundle.cjs)): esbuild bundles three `src/` entry points to `dist/`; [copy-assets.cjs](packages/moyu-tab/scripts/copy-assets.cjs) then copies non-`.ts` files (HTML, JSON — including `manifest.json` and `rules.json`) into `dist/`. The extension loads from `dist/`, so **any edit to newtab.html / static assets / manifest requires `npm run build:moyu` before reloading** in `chrome://extensions`.

Three entry points:
- **Background** [sw.ts](packages/moyu-tab/src/background/sw.ts) — single MV3 module service worker. Handles pomodoro timer state (persisted to `chrome.storage.local` key `moyu_pomodoro`), `chrome.alarms` ticks, water-reminder notifications, and delegates site tracking to site-tracker.ts.
- **Site tracker** [site-tracker.ts](packages/moyu-tab/src/background/site-tracker.ts) — tab/page-time accumulation feeding the 网站统计 widget (same domain-grouping idea as the old tracker).
- **New tab** [newtab/newtab.ts](packages/moyu-tab/src/newtab/) — the page runtime (~1900 lines). Imports every widget's `init*`/`render*Card` and wires them into the DOM. This is the **single source of truth for widget registration**.
  - [boot.ts](packages/moyu-tab/src/newtab/boot.ts) — micro-script loaded in `<head>` before body render; toggles the `locked` class so the lockscreen doesn't flash the sidebar on refresh. MV3 CSP forbids inline scripts, hence the external file.
  - [config.ts](packages/moyu-tab/src/newtab/config.ts) — static metadata: category tree (`CAT_TREE`), widget registry (`ALL_WIDGETS`), and linear SVG icon strings.
  - [utils.ts](packages/moyu-tab/src/newtab/utils.ts) — small shared helpers.
  - [newtab.html](packages/moyu-tab/src/newtab/newtab.html) — **all CSS is inline here** (no separate stylesheet). Add/change styles in this file.

**Widgets** (`src/newtab/widgets/*.ts`) — one file per widget/card. Each conventionally exports `init*` (attach listeners / set up state) and `render*Card` (return an HTML string or mutate the DOM). The always-on top row (`#toolkitRow`, rendered in `renderPanel`) hosts `renderMarketCard()` (行情); other widgets are wired by direct `init*`/`render*Card` imports in newtab.ts (market, weather, typhoon, weread, hot, news, food, stats, …).

> **工具策略（重要）**：所有计算/工具类功能一律在网站 **http://app.conan.js.cn/tools** 实现（Vue SPA，目前 18 个工具：JSON/时间戳/Base64/URL/HTML/哈希/UUID、颜色/二维码/WiFi 二维码/两步验证/汇率、房贷/房贷提前还款/个税/BMI、除夕/红包模拟器）。**moyu-tab 不再内置工具**。闲页在顶部搜索框下方保留一行低调的快捷入口（`#topDock`，由 `DOCK_ITEMS` 配置数组驱动、`renderTopDock()` 渲染；当前含「工具箱」入口，`target="_blank"` 新标签页打开；锁屏态隐藏）。**新增入口只需往 `DOCK_ITEMS` 加一条配置；工具本体在网站侧实现，不要往 moyu-tab 里加计算器/工具组件**。

Data widgets pull from public JSON APIs (Eastmoney, open-meteo, weread, typhoon.slt.zj.gov.cn, etc.) — host permissions are declared per-widget in [manifest.json](packages/moyu-tab/src/manifest.json). `declarative_net_request` sets a Weibo referer rewrite via `rules.json` to bypass hotlink protection.

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
- **Adding a new widget**: create `newtab/widgets/<name>.ts`, import its `init`/`render` into newtab.ts, register it via a direct import, and add the card styles to inline CSS in newtab.html. Add any new API host to `manifest.json` `host_permissions`. **For calculator/utility tools: implement them on `app.conan.js.cn/tools` instead — do not add tool widgets to moyu-tab.**
- Static runtime facts that change (data-source endpoints, field names, API quirks) are worth persisting to the project memory directory, not just the code.