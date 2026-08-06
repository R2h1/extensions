# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Install all dependencies (npm workspaces)
npm install

# Build shared library (TypeScript compilation via tsc)
npm run build:shared

# Build a package (esbuild bundling + asset copy), e.g.
npm run build:moyu

# Build everything
npm run build:all

# Watch mode for shared library
npm run build:shared -- --watch

# Generate placeholder icons (for development)
npm run icons
```

## Architecture

**Monorepo** using npm workspaces (`packages/*`). Packages:

### `@extensions/shared` (packages/shared/)

TypeScript library compiled by `tsc` to `dist/`. Published as a workspace dependency.

- [types.ts](packages/shared/src/types.ts) — Shared types: `TrackerData`, `SiteRecord`, `RankingItem`, `AppSettings`, message protocol (`ExtensionMessage`/`ExtensionResponse`, `MSG` constants)
- [storage.ts](packages/shared/src/storage.ts) — `chrome.storage.sync` wrapper for settings (get/save/subscribe with defaults)
- [utils.ts](packages/shared/src/utils.ts) — Utilities: `sendMessage()`, `formatDuration()`, `getActiveTabInfo()`, `safeJsonParse()`
- [index.ts](packages/shared/src/index.ts) — Re-exports everything

### `@extensions/moyu-tab` (packages/moyu-tab/)

闲页 — a Manifest V3 new-tab dashboard, the main active package. Built with **esbuild** and copied static assets. See [packages/moyu-tab/CLAUDE.md](packages/moyu-tab/CLAUDE.md) (if present) for widget-architecture details.

Other packages: `reading-community`.