import type { CustomTabBarItem, CustomTabBarItemBadge } from './config'
import { reactive } from 'vue'

import { isNeedLoginMode } from '@/router/config'
import { FG_LOG_ENABLE, judgeIsExcludePath } from '@/router/interceptor'
import { useTokenStore } from '@/store/token'
import { tabbarList as _tabbarList } from './config'

// TODO 1/2: 中间的鼓包tabbarItem的开关
const BULGE_ENABLE = true

/** tabbarList 里面的 path 从 pages.config.ts 得到 */
const tabbarList = reactive<CustomTabBarItem[]>(_tabbarList.map(item => ({
  ...item,
  pagePath: item.pagePath.startsWith('/') ? item.pagePath : `/${item.pagePath}`,
})))

export function isPageTabbar(path: string) {
  const _path = path.split('?')[0]
  return tabbarList.some(item => item.pagePath === _path)
}

/**
 * 自定义 tabbar 的状态管理，原生 tabbar 无需关注本文件
 * tabbar 状态，增加 storageSync 保证刷新浏览器时在正确的 tabbar 页面
 * 使用reactive简单状态，而不是 pinia 全局状态
 */
const tabbarStore = reactive({
  curIdx: uni.getStorageSync('app-tabbar-index') || 0,
  prevIdx: uni.getStorageSync('app-tabbar-index') || 0,
  setCurIdx(idx: number) {
    const tokenStore = useTokenStore()
    // 已登录 或 (url 需要登录 && 在白名单 || 不需要登录 && 不在黑名单) （关于 白名单|黑名单 逻辑： src/router/interceptor.ts）
    if (tokenStore.hasLogin || (isNeedLoginMode && judgeIsExcludePath(tabbarList[idx].pagePath)) || (!isNeedLoginMode && !judgeIsExcludePath(tabbarList[idx].pagePath))) {
      this.curIdx = idx
      uni.setStorageSync('app-tabbar-index', idx)
    }
  },
  // 设置 tabbar item 的 badge
  setTabbarItemBadge(idx: number, badge: CustomTabBarItemBadge) {
    if (tabbarList[idx]) {
      tabbarList[idx].badge = badge
    }
  },
  // 根据 path 自动设置 curIdx
  setAutoCurIdx(path: string) {
    // '/' 当做首页
    if (path === '/') {
      this.setCurIdx(0)
      return
    }
    const index = tabbarList.findIndex(item => item.pagePath === path)
    FG_LOG_ENABLE && console.log('index:', index, path)
    // console.log('tabbarList:', tabbarList)
    if (index === -1) {
      const pagesPathList = getCurrentPages().map(item => item.route.startsWith('/') ? item.route : `/${item.route}`)
      // console.log(pagesPathList)
      const flag = tabbarList.some(item => pagesPathList.includes(item.pagePath))
      if (!flag) {
        this.setCurIdx(0)
        return
      }
    }
    else {
      this.setCurIdx(index)
    }
  },
  // 恢复到上一个 tabbar index
  restorePrevIdx() {
    if (this.prevIdx === this.curIdx)
      return
    this.setCurIdx(this.prevIdx)
    this.prevIdx = uni.getStorageSync('app-tabbar-index') || 0
  },
})

export { tabbarList, tabbarStore }
