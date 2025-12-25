import { ref } from 'vue'

/**
 * 自定义导航栏适配 Hook
 * 用于获取小程序胶囊按钮位置及各平台状态栏高度，实现沉浸式导航栏适配
 */
export function useNavbar() {
  // 状态栏高度 (文字/图标开始的位置)
  const safeAreaTop = ref(0)
  // 内容区域的顶部偏移量 (整个导航栏占据的总高度)
  const navbarHeight = ref(0)
  // 获取系统信息
  const systemInfo = uni.getSystemInfoSync()
  // 胶囊按钮信息 (仅小程序)
  const menuButtonInfo = ref<UniApp.GetMenuButtonBoundingClientRectRes | null>(null)
  // 底部安全区域高度
  const safeAreaBottom = ref(0)

  const initNavbar = (systemInfo1: any) => {
    // 计算底部安全区域
    if (systemInfo1.safeArea) {
      safeAreaBottom.value = systemInfo1.screenHeight - systemInfo1.safeArea.bottom
    }
    else {
      safeAreaBottom.value = 0
    }

    // #ifdef MP-WEIXIN
    try {
      const menuInfo = uni.getMenuButtonBoundingClientRect()
      menuButtonInfo.value = menuInfo
      // 这里的 top 通常作为标题文字的起始高度
      safeAreaTop.value = menuInfo.top
      // 整个导航栏高度 = 胶囊底部 + 8px 呼吸间距
      navbarHeight.value = menuInfo.bottom
    }
    catch (e) {
      // 兜底方案
      const systemInfo = uni.getSystemInfoSync()
      safeAreaTop.value = systemInfo.statusBarHeight || 0
      navbarHeight.value = (systemInfo.statusBarHeight || 0) + 44
    }
    // #endif

    // #ifndef MP-WEIXIN
    const systemInfo = uni.getSystemInfoSync()
    safeAreaTop.value = systemInfo.statusBarHeight || 0
    navbarHeight.value = (systemInfo.statusBarHeight || 0) + 44
    // #endif
    console.log('systemInfo', systemInfo)
    console.log('safeAreaTop', safeAreaTop.value)
    console.log('navbarHeight', navbarHeight.value)
    console.log('safeAreaBottom', safeAreaBottom.value)
  }

  // 初始化调用
  initNavbar(systemInfo)

  return {
    safeAreaTop,
    navbarHeight,
    safeAreaBottom,
    systemInfo,
    menuButtonInfo,
    initNavbar,
  }
}
