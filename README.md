# TimeRank Monorepo

TimeRank — 一个基于 **Manifest V3** 的浏览器扩展 Monorepo。

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
│   ├── moyu-tab/                  # 闲页 — 新标签页摸鱼面板
│   └── reading-community/         # 阅读社区
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
```

### 在 Chrome 中加载

1. 打开 `chrome://extensions`
2. 开启"开发者模式"
3. 点击"加载已解压的扩展"
4. 选择对应包的 `packages/<包名>/dist/`

## 开发命令

| 命令 | 说明 |
|------|------|
| `npm run build:shared` | 构建公共库 |
| `npm run build:all` | 构建所有包 |
| `npm run icons` | 生成占位图标 |

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