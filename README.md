# 项目架构与功能设计文档

## 一、项目概述

### 1.1 项目简介
这是一个基于 **uni-app** 框架开发的跨平台电商小程序项目，采用现代化的前端技术栈构建。项目定位为一个功能完善的电商应用，支持商品浏览、购物车、收藏、评论、聊天客服等核心电商功能。

### 1.2 技术栈
- **框架**: uni-app 3.x (支持 H5、小程序、APP 多端)
- **前端框架**: Vue 3.4+ (Composition API)
- **开发语言**: TypeScript 5.8+
- **构建工具**: Vite 5.2+
- **样式方案**: UnoCSS + SCSS
- **UI 组件库**: sard-uniapp + 自定义组件
- **状态管理**: Pinia 2.0+ (支持持久化)
- **HTTP 请求**: 
  - 自封装 http 模块 (基于 uni.request)
  - Alova (可选的请求库)
- **WebSocket**: Socket.IO Client (@hyoga/uni-socket.io)
- **路由管理**: @uni-helper/vite-plugin-uni-pages (约定式路由)
- **代码规范**: ESLint + Husky + Commitlint

### 1.3 支持平台
| 平台 | 支持状态 | 说明 |
|------|---------|------|
| H5 | ✅ | 完全支持 |
| 微信小程序 | ✅ | 完全支持 |
| APP (iOS/Android) | ✅ | 完全支持 |
| 支付宝小程序 | ✅ | 完全支持 |
| 其他小程序 | ✅ | 字节、快手、百度等 |

---

## 二、目录结构解析

### 2.1 整体目录结构

```
项目根目录/
├── .cursor/              # Cursor AI 编辑器配置
│   └── rules/           # 项目开发规则文档
├── .husky/              # Git Hooks 配置
├── .vscode/             # VSCode 编辑器配置
├── dist/                # 构建输出目录
├── env/                 # 环境变量配置文件
├── md/                  # 项目文档
├── scripts/             # 构建脚本
├── src/                 # 源代码目录 ⭐核心
│   ├── api/            # API 接口定义
│   ├── components/     # 全局组件
│   ├── hooks/          # 组合式函数
│   ├── http/           # HTTP 请求封装
│   ├── pages/          # 页面文件
│   ├── pages-sub/      # 分包页面
│   ├── router/         # 路由配置
│   ├── service/        # 业务服务层
│   ├── static/         # 静态资源
│   ├── store/          # 状态管理
│   ├── style/          # 全局样式
│   ├── tabbar/         # 底部导航栏
│   ├── types/          # TypeScript 类型定义
│   ├── utils/          # 工具函数
│   ├── App.vue         # 应用入口组件
│   ├── main.ts         # 应用入口文件
│   ├── pages.json      # 页面配置
│   └── manifest.json   # 应用配置清单
├── package.json         # 项目依赖配置
├── vite.config.ts      # Vite 构建配置
├── tsconfig.json       # TypeScript 配置
├── uno.config.ts       # UnoCSS 配置
└── README.md           # 项目说明文档
```

## &#x1F4C2; 快速开始

执行 `pnpm create unibest` 创建项目
执行 `pnpm i` 安装依赖
执行 `pnpm dev` 运行 `H5`
执行 `pnpm dev:mp` 运行 `微信小程序`
# 安装依赖
pnpm install

# 运行测试
pnpm test

# 运行测试并生成覆盖率报告
pnpm test:coverage

# 使用 UI 界面运行测试
pnpm test:ui

## 📦 运行（支持热更新）

- web平台： `pnpm dev:h5`, 然后打开 [http://localhost:9000/](http://localhost:9000/)。
- weixin平台：`pnpm dev:mp` 然后打开微信开发者工具，导入本地文件夹，选择本项目的`dist/dev/mp-weixin` 文件。
- APP平台：`pnpm dev:app`, 然后打开 `HBuilderX`，导入刚刚生成的`dist/dev/app` 文件夹，选择运行到模拟器(开发时优先使用)，或者运行的安卓/ios基座。(如果是 `安卓` 和 `鸿蒙` 平台，则不用这个方式，可以把整个unibest项目导入到hbx，通过hbx的菜单来运行到对应的平台。)

## 🔗 发布

- web平台： `pnpm build:h5`，打包后的文件在 `dist/build/h5`，可以放到web服务器，如nginx运行。如果最终不是放在根目录，可以在 `manifest.config.ts` 文件的 `h5.router.base` 属性进行修改。
- weixin平台：`pnpm build:mp`, 打包后的文件在 `dist/build/mp-weixin`，然后通过微信开发者工具导入，并点击右上角的“上传”按钮进行上传。
- APP平台：`pnpm build:app`, 然后打开 `HBuilderX`，导入刚刚生成的`dist/build/app` 文件夹，选择发行 - APP云打包。(如果是 `安卓` 和 `鸿蒙` 平台，则不用这个方式，可以把整个项目导入到hbx，通过hbx的菜单来发行到对应的平台。)

## 提交规范

提交信息应该清晰地描述更改的内容和原因。建议使用以下格式：

```
feat: 添加新功能
fix: 修复 bug
docs: 更新文档
style: 代码样式更改
refactor: 代码重构
perf : 性能优化
test : 增加测试
build : 改变了build工具 如 grunt换成了 npm
revert : 撤销上一次的 commit
chore: 更新构建流程或工具
```
