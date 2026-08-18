# 闲页 · Extensions Monorepo

两个 100% 本地的 Manifest V3 Chrome 扩展，基于 npm workspaces 管理。

## 包说明

| 包名 | 目录 | 描述 |
|------|------|------|
| `@extensions/moyu-tab` | [packages/moyu-tab](packages/moyu-tab/) | **闲页** — 新标签页摸鱼仪表盘 |
| `@extensions/reading-community` | [packages/reading-community](packages/reading-community/) | **书搭子** — 侧边栏阅读笔记 |

### 闲页（moyu-tab）

覆盖新标签页，提供行情、天气、台风、热搜、新闻、微信读书、书架统计、网站统计、番茄钟、喝水提醒、万年历、壁纸、音乐播放器等功能。所有计算/工具类功能由站外 [工具箱](https://conan.js.cn/) 承载，扩展本身不再内置计算器组件。

### 书搭子（reading-community）

Chrome 侧边栏扩展，用于在浏览网页时随手记录阅读笔记。

## 快速开始

```bash
npm install          # 安装所有依赖
npm run build:all    # 构建两个扩展
```

构建产物输出到各包的 `dist/` 目录。

### 在 Chrome 中加载

1. 打开 `chrome://extensions`
2. 开启右上角「开发者模式」
3. 点击「加载已解压的扩展程序」
4. 选择对应包的 `packages/<包名>/dist/` 目录

> 修改源码或静态资源（HTML / manifest.json）后，需重新构建并在扩展管理页刷新。

## 命令

| 命令 | 说明 |
|------|------|
| `npm run build:moyu` | 构建闲页（esbuild bundle + 资源拷贝） |
| `npm run build:community` | 构建书搭子 |
| `npm run build:all` | 构建所有包 |
| `npm run lint` | ESLint 检查 |
| `npm run lint:fix` | ESLint 自动修复 |
| `npm run typecheck` | TypeScript 类型检查（tsc --noEmit，两个包） |
| `npm run format:fix` | Prettier 格式化 |
| `npm run pack:moyu` | 打包闲页 zip 到 `releases/` |
| `npm run pack:community` | 打包书搭子 zip 到 `releases/` |
| `npm run icons` | 生成占位图标 |

## 技术栈

- **Manifest V3** — Service Worker + declarativeNetRequest
- **TypeScript** — 类型安全
- **esbuild** — 快速打包
- **npm Workspaces** — Monorepo 管理
- **100% 本地** — 无后端，不上传数据；数据仅存于 `chrome.storage.local`
