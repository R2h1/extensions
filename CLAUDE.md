# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm install                # Install all deps (npm workspaces)
npm run lint               # ESLint over packages/
npm run lint:fix           # ESLint with autofix
npm run format:fix         # Prettier write over packages/**/*.ts

# Build one package (each builds to its own packages/<pkg>/dist/)
npm run build:shared       # shared lib (tsc → dist/)
npm run build:moyu         # 闲页 esbuild bundle + asset copy
npm run build:community    # 书搭子 esbuild bundle + asset copy
npm run build:all          # shared + moyu + community

npm run pack:moyu          # Zip packages/moyu-tab/dist/ → releases/
npm run pack:community     # Zip packages/reading-community/dist/
npm run icons              # Generate placeholder icons
```

There is no test suite. Type errors surface via `tsc` (shared) and esbuild (moyu/community bundles fail on syntax errors but are not type-checked), so rely on `npm run lint` plus the build for verification.

## Architecture

**Monorepo** ([npm workspaces](package.json)) with three packages under `packages/`. All are Manifest V3 Chrome extensions, 100% local (no backend, no uploads). `shared` is a workspace dependency consumed after `build:shared`.

### `@extensions/shared` (packages/shared/)

TypeScript library, compiled by `tsc` to `dist/`. Re-exports from [index.ts](packages/shared/src/index.ts):
- [types.ts](packages/shared/src/types.ts) — shared types (`TrackerData`, `SiteRecord`, `RankingItem`, `AppSettings`, message protocol).
- [storage.ts](packages/shared/src/storage.ts) — `chrome.storage.sync` wrapper for settings.
- [utils.ts](packages/shared/src/utils.ts) — `sendMessage()`, `formatDuration()`, `getActiveTabInfo()`, `safeJsonParse()`.

The `website-tracker` package that previously consumed this was removed — the remaining packages (moyu-tab, reading-community) are largely self-contained and may not import much from here.

### `@extensions/moyu-tab` (packages/moyu-tab/) — 闲页, the main project

A new-tab dashboard (`chrome_url_overrides.newtab`) with a large collection of widgets. This is where almost all active development happens.

**Build** ([scripts/build-bundle.cjs](packages/moyu-tab/scripts/build-bundle.cjs)): esbuild bundles three `src/` entry points to `dist/`; [copy-assets.cjs](packages/moyu-tab/scripts/copy-assets.cjs) then copies non-`.ts` files (HTML, JSON — including `manifest.json` and `rules.json`) into `dist/`. The extension loads from `dist/`, so **any edit to newtab.html / static assets / manifest requires `npm run build:moyu` before reloading** in `chrome://extensions`.

Three entry points:
- **Background** [sw.ts](packages/moyu-tab/src/background/sw.ts) — single MV3 module service worker. Handles pomodoro timer state (persisted to `chrome.storage.local` key `moyu_pomodoro`), `chrome.alarms` ticks, water-reminder notifications, and delegates site tracking to site-tracker.ts.
- **Site tracker** [site-tracker.ts](packages/moyu-tab/src/background/site-tracker.ts) — tab/page-time accumulation feeding the 网站统计 widget (same domain-grouping idea as the old tracker).
- **New tab** [newtab/newtab.ts](packages/moyu-tab/src/newtab/) — the page runtime (~1900 lines). Imports every widget's `init*`/`render*Card` and wires them into the DOM. This is the **single source of truth for widget registration**.
  - [boot.ts](packages/moyu-tab/src/newtab/boot.ts) — micro-script loaded in `<head>` before body render; toggles the `locked` class so the lockscreen doesn't flash the sidebar on refresh. MV3 CSP forbids inline scripts, hence the external file.
  - [config.ts](packages/moyu-tab/src/newtab/config.ts) — static metadata: category tree (`CAT_TREE`), widget registry (`ALL_WIDGETS`), and linear SVG icon strings.
  - [state.ts](packages/moyu-tab/src/newtab/state.ts) — **dead code**; do not extend. Runtime state lives in newtab.ts.
  - [utils.ts](packages/moyu-tab/src/newtab/utils.ts) — small shared helpers.
  - [newtab.html](packages/moyu-tab/src/newtab/newtab.html) — **all CSS is inline here** (no separate stylesheet). Add/change styles in this file.

**Widgets** (`src/newtab/widgets/*.ts`) — one file per widget/card. Each conventionally exports `init*` (attach listeners / set up state) and `render*Card` (return an HTML string or mutate the DOM). Widgets are registered in two places inside newtab.ts:
1. The `TOOLKIT` array — calculators/utilities (tax, mortgage, mortgage-prepay, color, BMI, currency, QR, WiFi).
2. Direct `init*`/`render*Card` imports — specialty cards (market, weather, typhoon, weread, hot, news, food, stats, …).

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
- **Adding a new widget**: create `newtab/widgets/<name>.ts`, import its `init`/`render` into newtab.ts, register it in the `TOOLKIT` array or via a direct import, and add the card styles to inline CSS in newtab.html. Add any new API host to `manifest.json` `host_permissions`.
- Static runtime facts that change (data-source endpoints, field names, API quirks) are worth persisting to the project memory directory, not just the code.