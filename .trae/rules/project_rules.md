# unibest 项目概览
请使用中文回答问题
这是一个基于 uniapp + Vue3 + TypeScript + Vite5 + UnoCSS 的跨平台开发框架。

## 项目特点
- 支持 H5、小程序、APP 多平台开发
- 使用最新的前端技术栈
- 内置约定式路由、layout布局、请求封装等功能
- 无需依赖 HBuilderX，支持命令行开发

## 核心配置文件
- [package.json](mdc:package.json) - 项目依赖和脚本配置
- [vite.config.ts](mdc:vite.config.ts) - Vite 构建配置
- [pages.config.ts](mdc:pages.config.ts) - 页面路由配置
- [manifest.config.ts](mdc:manifest.config.ts) - 应用清单配置
- [uno.config.ts](mdc:uno.config.ts) - UnoCSS 配置

## 主要目录结构
- `src/pages/` - 页面文件
- `src/components/` - 组件文件
- `src/layouts/` - 布局文件
- `src/api/` - API 接口
- `src/http/` - HTTP 请求封装
- `src/store/` - 状态管理
- `src/tabbar/` - 底部导航栏

## 开发命令
- `pnpm dev` - 开发 H5 版本
- `pnpm dev:mp` - 开发微信小程序
- `pnpm dev:app` - 开发 APP 版本
- `pnpm build` - 构建生产版本

## Vue 组件规范
- 使用 Composition API 和 `<script setup>` 语法
- 组件文件使用 PascalCase 命名
- 页面文件放在 `src/pages/` 目录下
- 组件文件放在 `src/components/` 目录下

## TypeScript 规范
- 严格使用 TypeScript，避免使用 `any` 类型
- 为 API 响应数据定义接口类型
- 使用 `interface` 定义对象类型，`type` 定义联合类型
- 导入类型时使用 `import type` 语法

## 状态管理
- 使用 Pinia 进行状态管理
- Store 文件放在 `src/store/` 目录下
- 使用 `defineStore` 定义 store
- 支持持久化存储

## UnoCSS 原子化 CSS
- 项目使用 UnoCSS 作为原子化 CSS 框架
- 配置在 [uno.config.ts](mdc:uno.config.ts)
- 支持预设和自定义规则
- 优先使用原子化类名，减少自定义 CSS

## Vue SFC 组件规范
- `<script setup>` 标签必须是第一个子元素
- `<template>` 标签必须是第二个子元素
- `<style scoped>` 标签必须是最后一个子元素（因为推荐使用原子化类名，所以很可能没有）

## 页面开发
- 页面文件放在 [src/pages/](mdc:src/pages/) 目录下
- 使用约定式路由，文件名即路由路径
- 页面配置在仅需要在 `route-block` 中配置标题等内容即可，会自动生成到 `pages.json` 中

## 组件开发
- 组件文件放在 [src/components/](mdc:src/components/) 目录下
- 使用 uni-app 内置组件和第三方组件库
- 支持 wot-design-uni\uv-ui\uview-plus 等多种第三方组件库 和 z-paging 组件
- 自定义组件遵循 uni-app 组件规范

## 平台适配
- 使用条件编译处理平台差异
- 支持 H5、小程序、APP 多平台
- 注意各平台的 API 差异
- 使用 uni.xxx API 替代原生 API

## 示例代码结构
```vue
<script setup lang="ts">
// #ifdef H5
import { h5Api } from '@/utils/h5'
// #endif

// #ifdef MP-WEIXIN
import { mpApi } from '@/utils/mp'
// #endif

const handleClick = () => {
  // #ifdef H5
  h5Api.showToast('H5 平台')
  // #endif
  
  // #ifdef MP-WEIXIN
  mpApi.showToast('微信小程序')
  // #endif
}
</script>

<template>
  <view class="page">
    <!-- uni-app 组件 -->
    <button @click="handleClick">点击</button>
    
    <!-- 条件渲染 -->
    <!-- #ifdef H5 -->
    <view>H5 特有内容</view>
    <!-- #endif -->
  </view>
</template>
```

## 生命周期
- 使用 uni-app 页面生命周期
- onLoad、onShow、onReady、onHide、onUnload
- 组件生命周期遵循 Vue3 规范
- 注意页面栈和导航管理

## 架构职责分离规范 (Architecture Responsibility Separation)
为了保持代码的整洁和可维护性，项目遵循以下职责分离原则：

### 1. HTTP 拦截器层 (`src/http/`)
- **职责**：统一处理请求/响应拦截。
- **功能**：
  - 自动注入 `Authorization` Token。
  - **统一状态码校验**：校验 `code === 200` 或 `code === 0`，非成功状态直接 `throw Error`。
  - **通用错误提示**：根据业务码弹出 Toast 提示（如 429 频繁请求）,同时根据不同环境做提示处理，避免正式环境透出后端业务提示。
  - **Token 刷新**：实现无感刷新 Token 逻辑。

### 2. API 接口层 (`src/api/`)
- **职责**：定义后端接口映射，充当“数据翻译官”。
- **规范**：
  - **数据解包**：使用 `.then(res => res.data)` 将后端包装结构拆解，只返回核心业务数据。
  - **禁止重复校验**：不要在 API 层重复写 `if (res.code === 200)`，拦截器已处理。
  - **纯净性**：不包含 UI 交互逻辑（如 Loading、Toast）。
  - **类型安全** ：在 API 层定义 Promise<xxx> 而不是 Promise<ApiResponse<xxx>> ，可以让后续的 TypeScript 类型推导变得非常直观。

### 3. Store 状态层 (`src/store/`)
- **职责**：管理全局/模块化状态及核心业务逻辑。
- **规范**：
  - **状态持久化**：如用户信息、Token、购物车数据。
  - **逻辑封装**：封装复杂的业务流程（如登录后获取用户信息、清除本地缓存等）。
  - **数据源**：从 API 层获取“干净”的数据，不关心 HTTP 响应结构。

### 4. 页面/组件层 (`src/pages/`, `src/components/`)
- **职责**：负责 UI 渲染和用户交互。
- **规范**：
  - **调用链**：优先调用 Store actions，简单场景可直接调用 API。
  - **交互反馈**：负责页面级的 Loading 状态控制（如下拉刷新）和特定的用户提示。
  - **数据展示**：将 Store 或 API 返回的数据映射到模板。

## UI/UX 交互与开发规范
为了提升用户体验并减少 UI 逻辑冲突，需遵循以下开发规范：

### 1. Loading 与 Toast 冲突处理
- **原则**：**先关闭 Loading，再显示 Toast**。
- **原因**：在 UniApp 中，`uni.hideLoading()` 会意外关闭正在显示的 `uni.showToast()`。
- **代码示例**：
  ```typescript
  // 错误做法：finally 中 hideLoading 会关闭 catch 中的 toast
  try { ... } catch { uni.showToast(...) } finally { uni.hideLoading() }

  // 正确做法：
  try {
    uni.showLoading()
    await action()
    uni.hideLoading()
    uni.showToast({ title: '成功' })
  } catch (e) {
    uni.hideLoading()
    uni.showToast({ title: '失败', icon: 'error' })
  }
  ```

### 2. 骨架图 (Skeleton) 使用规范
- **加载时机**：使用 `isFirstLoad` 或 `loading && data.length === 0` 作为显示条件。
- **显示策略**：骨架图仅在页面**首次加载**或**重置刷新**且无旧数据时显示；分页加载更多时应使用 `load-more` 组件而非骨架图。
- **复用建议**：复杂的商品卡片等小单元应抽离为 `components/skeleton/` 下的独立组件。

### 3. 平台适配规范
- **条件编译**：严格使用 `#ifdef` 处理跨平台差异，尤其是第三方登录（微信 vs 支付宝）和特定 API（如 `getPhoneNumber`）。
- **OAuth 登录**：登录页面应显式区分登录方式（如“微信登录”按钮、“支付宝登录”按钮），并根据 `uni.getProvider` 动态显示。

### 4. 性能优化
- **图片加载**：优先使用 `mode="aspectFill"` 并开启 `lazy-load`。
- **页面栈**：登录成功后，根据页面栈深度决定使用 `uni.navigateBack()` 还是 `uni.switchTab()`。

---
遵循以上规范，确保“底层处理协议，中层处理数据，顶层处理展示”，避免代码冗余和逻辑混乱。