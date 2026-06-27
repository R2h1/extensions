# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Install all dependencies (npm workspaces)
npm install

# Build shared library (TypeScript compilation via tsc)
npm run build:shared

# Build extension (esbuild bundling + asset copy)
npm run build:tracker

# Build everything
npm run build:all

# Watch mode for shared library
npm run build:shared -- --watch

# Generate placeholder icons (for development)
npm run icons
```

## Architecture

**Monorepo** using npm workspaces (`packages/*`). Two packages:

### `@extensions/shared` (packages/shared/)

TypeScript library compiled by `tsc` to `dist/`. Published as a workspace dependency.

- [types.ts](packages/shared/src/types.ts) — Shared types: `TrackerData`, `SiteRecord`, `RankingItem`, `AppSettings`, message protocol (`ExtensionMessage`/`ExtensionResponse`, `MSG` constants)
- [storage.ts](packages/shared/src/storage.ts) — `chrome.storage.sync` wrapper for settings (get/save/subscribe with defaults)
- [utils.ts](packages/shared/src/utils.ts) — Utilities: `sendMessage()`, `formatDuration()`, `getActiveTabInfo()`, `safeJsonParse()`
- [index.ts](packages/shared/src/index.ts) — Re-exports everything

### `@extensions/website-tracker` (packages/website-tracker/)

Chrome Manifest V3 extension. Built with **esbuild** (bundles each entry point + copies static assets).

#### Layers

| Layer | File | Role |
|---|---|---|
| **Background** | [service-worker.ts](packages/website-tracker/src/background/service-worker.ts) | Lifecycle (onInstalled/onSuspend), message router (switch on `MSG.*`), bootstraps tracker |
| **Tracker Core** | [tracker.ts](packages/website-tracker/src/background/tracker.ts) | Tab/window event listeners, domain extraction (with subdomain grouping & known site names for Chinese services), time accumulation, data save/load via `chrome.storage.local`, periodic tick (5s interval + 1min alarm backup), gap recovery on SW restart |
| **Content Script** | [content-script.ts](packages/website-tracker/src/content/content-script.ts) | Provides page title/URL/selection on request |
| **Popup** | [popup.ts](packages/website-tracker/src/popup/popup.ts) | Ranking list UI (day/week/month tabs), retry logic for cold SW start |
| **Options** | [options.ts](packages/website-tracker/src/options/options.ts) | Full analytics dashboard (summary cards, detail table, CSV export, data reset with confirmation modal) |

#### Key Design Decisions

- **Manifest V3** with a single service worker (not persistent background page)
- **Alarm backup**: 1-min `chrome.alarms` guarantees data persistence even when the SW is terminated by the browser
- **Gap recovery**: on SW restart, reads session meta from storage and recovers time lost during suspension (up to 5 min)
- **Chinese-first**: default locale is `zh_CN`, known-site names map includes major Chinese platforms
- **Subdomain grouping**: `normalizeDomain()` collapses subdomains under known parent domains (e.g., `v.qq.com` → `qq.com`)
- **Icon generated programmatically** in the service worker (three ascending bars drawn on canvas `ImageData`, no external icon file needed)

## Data Flow

```
Tab Switch / Navigation / Focus Change
    ↓
tracker.ts: onTabActivated / onTabUpdated / onWindowFocusChanged
    ↓  (accumulates time in memory)
tick() every 5s → flushData() → chrome.storage.local
    ↓  (alarm backup wakes SW if terminated)
chrome.alarms 1min → doTickAndSave()
    ↓
popup/options: sendMessage({type: MSG.GET_RANKINGS}) → service-worker.ts handleMessage() → getRankings()
```

Storage keys:
- `tracker` — full data: `{records: {[date: string]: {[domain: string]: SiteRecord}}}`
- `tracker_session` — SW recovery metadata: `{domain, lastTick}`
- `settings` — app settings via `chrome.storage.sync`