# TimeRank Monorepo

TimeRank — 一个基于 **Manifest V3** 的浏览器扩展 Monorepo。
核心产品是 **网站使用排行榜**，让你看看自己的时间都去哪了。

## 目录结构

```
extensions/
├── packages/
│   ├── shared/                    # 公共库（类型、工具函数、存储封装）
│   │   ├── src/
│   │   │   ├── types.ts           # 共享类型定义
│   │   │   ├── utils.ts           # 工具函数
│   │   │   ├── storage.ts         # 存储封装
│   │   │   └── index.ts           # 统一导出
│   │   └── package.json           # @extensions/shared
│   │
│   └── website-tracker/           # TimeRank 网站排行榜
│       ├── src/
│       │   ├── manifest.json      # Manifest V3 清单
│       │   ├── background/
│       │   │   ├── service-worker.ts  # 消息路由
│       │   │   └── tracker.ts         # 追踪核心逻辑
│       │   ├── content/
│       │   │   └── content-script.ts  # 页面信息采集
│       │   ├── popup/
│       │   │   ├── popup.html
│       │   │   ├── popup.ts
│       │   │   └── popup.css
│       │   ├── options/
│       │   │   ├── options.html
│       │   │   ├── options.ts
│       │   │   └── options.css
│       │   ├── _locales/          # 多语言
│       │   └── icons/
│       └── package.json
│
├── package.json                   # npm workspaces 根配置
├── tsconfig.base.json             # 基础 TS 配置
└── README.md
```

## 快速开始

### 安装依赖

```bash
npm install
```

### 构建

```bash
# 构建所有
npm run build:all

# 或只构建 TimeRank
npm run build:tracker
```

### 在 Chrome 中加载

1. 打开 `chrome://extensions`
2. 开启"开发者模式"
3. 点击"加载已解压的扩展"
4. 选择 `packages/website-tracker/dist/`

## 开发命令

| 命令 | 说明 |
|------|------|
| `npm run build:shared` | 构建公共库 |
| `npm run build:tracker` | 构建 TimeRank |
| `npm run build:all` | 构建所有包 |
| `npm run icons` | 生成占位图标 |

## TimeRank · 网站排行榜

**看看你的时间都去哪了。**

自动记录你今天/本周/本月在哪些网站上花了多少时间，生成一个排行榜。

### 功能

- ⏱ 自动追踪活跃标签页的停留时间
- 📅 今日 / 本周 / 本月排行切换
- 🥇 前三名奖牌标识
- 🎨 自动深色模式
- 📊 统计仪表盘（汇总卡片 + 详细表格）
- 📥 CSV 导出
- 🗑 数据重置

### 隐私

所有数据存在本地浏览器，不上传任何服务器。
只记录域名，不记录具体 URL。

## 添加新插件

1. 在 `packages/` 下创建新目录
2. 添加 `package.json`（引用 `@extensions/shared`）
3. 添加 `tsconfig.json`（extends `../../tsconfig.base.json`）
4. 构建：`npm run build -w packages/your-plugin`

## 技术栈

- **Manifest V3** — 最新扩展规范
- **TypeScript** — 类型安全
- **npm Workspaces** — Monorepo 管理
- **Chrome Extension API** — `storage`, `tabs`, `alarms`, `runtime`
- **100% 本地** — 无后端，不上传数据