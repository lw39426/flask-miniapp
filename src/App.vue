<script setup lang="ts">
import { onHide, onLaunch, onShow } from '@dcloudio/uni-app'

import AppModalAgent from '@/components/AppModalAgent.vue'
import { navigateToInterceptor } from '@/router/interceptor'
import { useChatStore } from '@/store/chat'
import { useTokenStore } from '@/store/token'
import { socketManager } from '@/utils/socket'

/**
 * 初始化 WebSocket 连接
 * 遵循"连接与 App 生命周期绑定"原则
 */
const initWebSocket = () => {
  const tokenStore = useTokenStore()
  const chatStore = useChatStore()

  // 监听用户登录/登出
  tokenStore.$subscribe((mutation, state) => {
    console.log('[App] Token store changed:', state.tokenInfo)

    // 获取有效的 token
    const token = tokenStore.validToken

    if (token && !socketManager.isConnected()) {
      // 用户登录，初始化 WebSocket
      console.log('[App] ✅ User logged in, initializing WebSocket...')
      socketManager.init(token)

      // 加载会话列表
      chatStore.fetchConversations()
    }
    else if (!token && socketManager.isConnected()) {
      // 用户登出，销毁 WebSocket
      console.log('[App] ❌ User logged out, destroying WebSocket...')
      socketManager.destroy()

      // 清空会话列表
      chatStore.$reset()
    }
  })

  // 如果已登录，立即初始化
  console.log('isTokenExpired:', tokenStore?.isTokenExpired)
  console.log('tokenInfo:', tokenStore.tokenInfo)
  console.log('validToken:', tokenStore.validToken)
  const token = tokenStore.validToken
  console.log('validToken', token)
  if (token) {
    console.log('[App] ✅ User already logged in, initializing WebSocket...')
    socketManager.init(token)

    // 加载会话列表
    chatStore.fetchConversations()
  }
}

onLaunch((options) => {
  console.log('App Launch111', options)

  // 初始化 WebSocket 连接
  initWebSocket()
})

onShow((options) => {
  // console.log('App Show', options)

  // 处理直接进入页面路由的情况：如h5直接输入路由、微信小程序分享后进入等
  // https://github.com/unibest-tech/unibest/issues/192
  if (options?.path) {
    navigateToInterceptor.invoke({ url: `/${options.path}`, query: options.query })
  }
  else {
    navigateToInterceptor.invoke({ url: '/' })
  }
  console.log('App Show handled navigation')
  // 从后台回到前台，检查 WebSocket 连接
  const tokenStore = useTokenStore()
  if (tokenStore.validToken && !socketManager.isConnected()) {
    console.log('[App] 🔄 Reconnecting WebSocket after resume...')
    socketManager.init(tokenStore.validToken)
  }
})

onHide(() => {
  // console.log('App Hide')
  // 不断开连接，保持后台接收消息
})
</script>

<template>
  <AppModalAgent />
</template>

<style lang="scss">
@import 'sard-uniapp/index.scss';
swiper,
scroll-view {
  flex: 1;
  height: 100%;
  overflow: hidden;
}

image {
  width: 100%;
  height: 100%;
  vertical-align: middle;
}
</style>
