<template>
  <view class="profile-page">
    <!-- 顶部背景封面图 -->
    <view class="top-show">
      <image mode="widthFix" class="top-show-img" :src="coverSrc" @tap="changeBgCover" @error="onCoverError" />
      <view v-if="hasLogin" class="cover-edit-btn" @tap="changeBgCover">
        更换封面
      </view>
    </view>
    <!-- 登录面板——用户信息头部 -->
    <view class="profile-header">
      <!-- 用户信息区域 -->
      <view class="user-info">
        <view class="avatar">
          <AvatarUpload
            :default-avatar="displayAvatar"
            @image-selected="handleNewImage"
          />
        </view>
        <view class="user-details">
          <text
            class="user-name"
            @tap="handleUserInfoClick()"
          >
            {{ hasLogin ? (userInfo.nickname || userInfo.username || '用户') : '点击登录' }}
          </text>
          <text class="user-desc">{{ hasLogin ? (userLevel || '普通会员') : '登录后享受更多服务' }}</text>
        </view>
        <view v-if="hasLogin" class="user-stats">
          <view class="stat-item">
            <text class="stat-number">{{ userPoints }}</text>
            <text class="stat-label">积分</text>
          </view>
          <view class="stat-item">
            <text class="stat-number">{{ userCoupons }}</text>
            <text class="stat-label">优惠券</text>
          </view>
        </view>
        <text v-else class="i-carbon-chevron-right" />
      </view>

      <!-- 功能面板 -->
      <view class="order-section">
        <view class="order-nav">
          <view
            v-for="(order, index) in orderTypes" :key="index" class="order-item"
            @tap="handleOrderClick(order.type)"
          >
            <view class="order-icon">
              {{ order.icon }}
            </view>
            <text class="order-text">{{ order.name }}</text>
            <view v-if="hasLogin && order.count > 0" class="order-badge">
              {{ order.count }}
            </view>
          </view>
        </view>
      </view>
      <!-- 订单管理 -->
      <view v-if="false" class="section-header" @tap="handleOrderClick()">
        <text class="section-title">我的订单</text>
        <view class="header-right">
          <text class="section-more">查看全部</text>
          <text class="arrow">></text>
        </view>
      </view>

      <!-- 功能菜单 -->
      <view class="menu-section">
        <view v-for="(group, groupIndex) in menuGroups" :key="groupIndex" class="menu-group">
          <view v-for="(item, index) in group" :key="index" class="menu-item" @tap="handleMenuClick(item)">
            <view class="menu-left">
              <text class="menu-icon" :class="[item.icon]" />
              <text class="menu-text">{{ item.name }}</text>
            </view>
            <view class="menu-right">
              <text v-if="hasLogin && item.badge" class="menu-badge">{{ item.badge }}</text>
              <text class="i-carbon:chevron-right text-gray" />
            </view>
          </view>
        </view>
      </view>

      <!-- 关于售前售后服务面板 -->
      <!-- <view class="after-scale section">
        <view class="order-title-wrap">
          <text class="title">关于服务</text>
        </view>
      </view> -->
      <!-- 底部面板 -->
      <view class="info-footer">
        <!-- 期待和你的每一次相遇 ^_^ -->
        本项目仅适用于学习交流，并且不提供无偿的、 不提供无偿的、 不提供无偿的 维护修改服务（但可提issue）
      </view>
    </view>
  </view>
  <sar-crop-image-agent />
</template>

<script lang="ts" setup>
import { onShow } from '@dcloudio/uni-app'
import { storeToRefs } from 'pinia'
import { cropImage } from 'sard-uniapp'
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { getFavoriteStats } from '@/api/favorite'
import AvatarUpload from '@/components/CustomPreview.vue' // 确保路径正确

import { LOGIN_PAGE } from '@/router/config'
import { useTokenStore } from '@/store/token'
import { useUserStore } from '@/store/user'

definePage({
  style: {
    // 'custom' 表示开启自定义导航栏，默认 'default'
    navigationStyle: 'custom',
    navigationBarTitleText: '个人中心',
  },
})

// 获取store
const tokenStore = useTokenStore()
const userStore = useUserStore()

// 计算属性：是否已登录（页面级兜底：有 token 也视为已登录）
const { hasLogin: hasLoginStore } = storeToRefs(tokenStore)
const hasLogin = computed(() => {
  const ti = tokenStore.tokenInfo as any
  const hasToken = !!(ti?.access_token || ti?.token)
  return hasLoginStore.value || hasToken
})

// 处理来自CustomPreview组件的头像更新事件
const handleNewImage = (newPath: string) => {
  // CustomPreview组件已经处理了上传并更新了userStore，这里只需要记录日志
  console.log('父组件收到头像更新通知:', newPath)
}

// 用户信息
const userInfo = computed(() => userStore.userInfo)

const DEFAULT_COVER = '/static/images/boy.jpg'
const coverUrl = ref<string>('')

// 顶部封面图显示：优先本地更新的 coverUrl，其次用户信息中的 bg_cover，最后默认图
const coverSrc = computed(() => {
  return userInfo.value?.bg_cover || coverUrl.value || DEFAULT_COVER
})

// 图片加载失败时回退默认图
const onCoverError = () => {
  coverUrl.value = DEFAULT_COVER
}

// 更换封面：选择图片并上传到后端
const changeBgCover = () => {
  if (!hasLogin.value) {
    uni.showModal({
      title: '提示',
      content: '请先登录后再更换封面',
      confirmText: '去登录',
      success: (res) => {
        if (res.confirm) {
          uni.navigateTo({ url: LOGIN_PAGE })
        }
      }
    })
    return
  }
  console.log('更换封面')
  uni.chooseImage({
    count: 1,
    sizeType: ['compressed'],
    sourceType: ['album', 'camera'],
    success: (res) => {
      const selectedPath = res.tempFilePaths[0]
      console.log('进入chooseImage,选择的图片路径:', selectedPath)

      // 定义上传函数
      const uploadImage = (filePath: string) => {
        console.log('开始上传图片:', filePath)
        if (!filePath) {
          uni.showToast({ title: '图片路径无效', icon: 'none' })
          return
        }

        uni.showLoading({ title: '上传中...' })
        const baseURL = import.meta.env.VITE_SERVER_BASEURL
        const uploadUrl = `${baseURL}/miniapp/user/bgCover`
        console.log('准备上传图片到:', uploadUrl)

        uni.uploadFile({
          url: uploadUrl,
          filePath,
          name: 'file',
          header: {
            Authorization: `Bearer ${(tokenStore.tokenInfo as any).access_token
            || (tokenStore.tokenInfo as any).token}`
          },
          success: (uploadRes) => {
            console.log('上传成功,服务器响应:', uploadRes)
            try {
              const parsed = JSON.parse(uploadRes.data || '{}')
              console.log('解析后的响应数据:', parsed)

              if (parsed.code === 200 && parsed.data?.bg_cover) {
                const fullUrl = parsed.data.bg_cover.startsWith('http')
                  ? parsed.data.bg_cover
                  : `${baseURL}${parsed.data.bg_cover}`
                coverUrl.value = fullUrl
                // 更新用户信息
                if (userStore.userInfo) {
                  userStore.userInfo.bg_cover = fullUrl
                  userStore.updateUserInfo({ ...userStore.userInfo, bg_cover: fullUrl })
                }
                uni.showToast({ title: '封面已更新', icon: 'success' })
              }
              else {
                uni.showToast({ title: parsed.message || '上传失败', icon: 'none' })
              }
            }
            catch (error) {
              console.error('解析响应失败:', error)
              uni.showToast({ title: '解析响应失败', icon: 'none' })
            }
          },
          fail: (error) => {
            console.error('上传失败:', error)
            uni.showToast({ title: '上传失败', icon: 'none' })
          },
          complete: () => {
            uni.hideLoading()
          }
        })
      }

      // 尝试裁剪图片
      console.log('开始裁剪图片...')
      try {
        cropImage({
          src: selectedPath,
          cropScale: '16:9',
          success(croppedFilePath) {
            console.log('裁切成功,裁切后的图片路径:', croppedFilePath)
            // 使用裁剪后的图片上传
            uploadImage(croppedFilePath)
          },
          fail: (error) => {
            console.error('图片裁切失败,使用原图:', error)
            // 裁剪失败,直接上传原图
            uploadImage(selectedPath)
          }
        })
      }
      catch (error) {
        console.error('cropImage调用异常,使用原图:', error)
        // cropImage调用异常,直接上传原图
        uploadImage(selectedPath)
      }
    },
    fail: (error) => {
      console.error('chooseImage错误:', error)
      uni.showToast({ title: '选择图片失败', icon: 'none' })
    }
  })
}

// 统一的头像显示逻辑
const displayAvatar = computed(() => {
  // 直接使用用户信息中的头像，如果没有则使用默认头像
  return userInfo.value?.avatar || '/static/images/default-avatar.png'
})

// 用户等级、积分、优惠券（可以根据实际业务逻辑调整）
const userLevel = ref('普通会员')
const userPoints = ref(0)
const userCoupons = ref(0)

// 订单类型
const orderTypes = ref([
  { name: '我的订单', icon: '💳', type: 'order', count: 0 },
  { name: '我的收藏', icon: '❤️', type: 'favorite', count: 0 },
  { name: '积分商城', icon: '🎁', type: 'points', count: 0 },
  { name: '浏览历史', icon: '�️', type: 'history', count: 0 },
  { name: '待评价', icon: '⭐', type: 'comment', count: 0 }
])

// 功能菜单
const menuGroups = ref<any[]>([
  [
    { name: '意见反馈', icon: 'i-carbon-chat-bot', url: '/pages/feedback/index' },
    { name: '客服中心', icon: 'i-carbon-customer-service text-fuchsia', url: '/pages/service/index', badge: '' },
    { name: '关于我们', icon: 'i-carbon-information-filled text-blue', url: '/pages/about/index' },
    { name: '设置', icon: 'i-carbon-settings', url: '/pages/my/setting', badge: '' }
  ]
])

// 跳转到登录页
const goToLogin = () => {
  console.log('跳转登录')
  if (!hasLogin.value) {
    uni.navigateTo({
      url: LOGIN_PAGE
    })
  }
}

// 检查登录状态并执行操作
const checkLoginAndExecute = (callback) => {
  if (hasLogin.value) {
    callback()
  }
  else {
    uni.showModal({
      title: '提示',
      content: '该功能需要登录后才能使用，是否前往登录？',
      success: (res) => {
        if (res.confirm) {
          goToLogin()
        }
      }
    })
  }
}

// 处理用户信息区域点击
const handleUserInfoClick = () => {
  if (hasLogin.value) {
    // 已登录，跳转到个人资料页面
    uni.navigateTo({
      url: '/pages/my/profile'
    })
  }
  else {
    // 未登录，使用智能登录检查
    checkLoginAndExecute(() => {
      // 登录成功后跳转到个人资料页面
      uni.navigateTo({
        url: '/pages/my/profile'
      })
    })
  }
}

// 处理订单点击
const handleOrderClick = (type = '') => {
  checkLoginAndExecute(() => {
    let url = ''
    switch (type) {
      case 'favorite':
        url = '/pages/my/favorite'
        break
      case 'order':
      default:
        url = type ? `/pages/order/list?type=${type}` : '/pages/order/list'
        break
    }

    if (type === 'favorite') {
      uni.navigateTo({ url })
    }
    else {
      // 其他功能暂时显示开发中
      uni.showToast({
        title: '功能开发中',
        icon: 'none'
      })
    }
  })
}

// 处理菜单点击，可配置菜单项的跳转或操作
const handleMenuClick = (item: { url?: string, name: string, action?: any }) => {
  // 如果是退出登录
  if (item.name === '退出登录') {
    // eslint-disable-next-line ts/no-use-before-define
    logout()
    return
  }

  // 特殊菜单项可能不需要登录
  const noLoginRequired = ['关于我们', '意见反馈', '设置']

  if (noLoginRequired.includes(item.name)) {
    // 这些功能不需要登录就可以访问
    if (item.url) {
      uni.navigateTo({
        url: item.url
      })
    }
    else if (item.action) {
      item.action()
    }
    else {
      uni.showToast({
        title: '功能开发中',
        icon: 'none'
      })
    }
  }
  else {
    // 其他功能需要登录
    checkLoginAndExecute(() => {
      if (item.url) {
        uni.navigateTo({
          url: item.url
        })
      }
      else if (item.action) {
        item.action()
      }
      else {
        uni.showToast({
          title: '功能开发中',
          icon: 'none'
        })
      }
    })
  }
}

// 退出登录
const logout = () => {
  uni.showModal({
    title: '确认退出',
    content: '确定要退出登录吗？',
    success: (res) => {
      if (res.confirm) {
        tokenStore.logout().then(() => {
          uni.showToast({
            title: '已退出登录',
            icon: 'success'
          })
        }).catch((error) => {
          console.error('退出登录失败:', error)
          uni.showToast({
            title: '退出失败，请重试',
            icon: 'none'
          })
        })
      }
    }
  })
}

// 防抖变量
let fetchDataTimer: any = null
let isFetching = false

// 获取用户信息和订单数据
const fetchUserData = async () => {
  // 防抖处理：如果正在获取数据，直接返回
  if (isFetching) {
    // console.log('正在获取用户数据，跳过重复请求')
    return
  }

  // 清除之前的定时器
  if (fetchDataTimer) {
    clearTimeout(fetchDataTimer)
  }

  // 设置新的防抖定时器
  fetchDataTimer = setTimeout(async () => {
    isFetching = true
    try {
      // 只有在已登录状态下才获取用户数据
      if (hasLogin.value) {
        console.log('开始获取用户数据...')

        // 获取用户信息
        await userStore.fetchUserInfo()

        // 获取收藏统计数据
        try {
          const favoriteStats = await getFavoriteStats()
          // 更新收藏数量
          const favoriteItem = orderTypes.value.find(item => item.type === 'favorite')
          if (favoriteItem) {
            favoriteItem.count = favoriteStats.data.total
          }
        }
        catch (error) {
          console.error('获取收藏统计失败:', error)
          // 如果获取失败，设置为0
          const favoriteItem = orderTypes.value.find(item => item.type === 'favorite')
          if (favoriteItem) {
            favoriteItem.count = 0
          }
        }

        // 这里可以添加获取其他订单数量、积分、优惠券等信息的API调用
        // 示例：
        // const orderCountsRes = await getOrderCounts()
        // orderTypes.value = orderTypes.value.map(item => {
        //     return {
        //         ...item,
        //         count: orderCountsRes[item.type] || 0
        //     }
        // })

        // 模拟数据，实际项目中应该从API获取
        userPoints.value = 1280
        userCoupons.value = 5

        // 根据用户信息设置用户等级
        if (userPoints.value > 1000) {
          userLevel.value = 'VIP会员'
        }
        else if (userPoints.value > 500) {
          userLevel.value = '黄金会员'
        }
        else {
          userLevel.value = '普通会员'
        }

        // 模拟其他订单数量
        orderTypes.value[0].count = 2 // 我的订单
        orderTypes.value[4].count = 3 // 待评价

        console.log('用户数据获取完成')
      }
      else {
        // 未登录状态下，重置用户相关数据
        userPoints.value = 0
        userCoupons.value = 0
        userLevel.value = '普通会员'

        // 重置订单数量
        orderTypes.value.forEach((item) => {
          item.count = 0
        })

        console.log('未登录状态，重置用户数据')
      }
    }
    catch (error) {
      console.error('获取用户数据失败:', error)
    }
    finally {
      isFetching = false
    }
  }, 300) // 300ms防抖延迟
}

// 添加设置菜单中的退出登录选项
const addLogoutMenuItem = () => {
  if (hasLogin.value && menuGroups.value[0]) {
    // 检查是否已经有退出登录菜单项
    const hasLogoutItem = menuGroups.value[0].some(item => item.name === '退出登录')

    if (!hasLogoutItem) {
      menuGroups.value[0].push({
        name: '退出登录',
        icon: 'i-carbon-logout',
        url: '',
        action: logout
      })
    }
  }
}

const removeLogoutMenuItem = () => {
  if (menuGroups.value[0]) {
    const index = menuGroups.value[0].findIndex(item => item.name === '退出登录')
    if (index !== -1) {
      menuGroups.value[0].splice(index, 1)
    }
  }
}
// 监听登录状态变化，动态增删“退出登录”菜单项
watch(hasLogin, (val) => {
  if (val) {
    addLogoutMenuItem()
  }
  else {
    removeLogoutMenuItem()
  }
})

// 监听收藏状态变化的全局事件
const handleFavoriteChange = () => {
  console.log('收到收藏状态变化通知，刷新用户数据')
  fetchUserData()
}

// 页面焦点处理 - 简单的方式
let lastFetchTime = 0
const handlePageFocus = () => {
  const now = Date.now()
  // 如果距离上次获取数据超过2秒，则重新获取
  if (now - lastFetchTime > 2000) {
    console.log('页面获得焦点，刷新用户数据')
    fetchUserData()
    lastFetchTime = now
  }
}
// let socket = null
// 页面加载时执行 - 只执行一次初始化
onMounted(() => {
  // 初始化封面为当前用户的 bg_cover
  coverUrl.value = userInfo.value?.bg_cover || ''
  // 根据登录状态同步“退出登录”菜单项
  if (hasLogin.value) {
    addLogoutMenuItem()
  }
  else {
    removeLogoutMenuItem()
  }

  // 注册全局事件监听（先移除再注册，避免重复）
  uni.$off('favoriteChanged', handleFavoriteChange)
  uni.$on('favoriteChanged', handleFavoriteChange)
})

// 页面显示时执行 - 每次页面显示都会执行，包括第一次进入
onShow(() => {
  console.log('页面显示，获取tokeninfo数据', tokenStore.tokenInfo)
  fetchUserData()
  // console.log('页面显示，获取用户数据', userInfo.value)
})

// 页面卸载时清理
onUnmounted(() => {
  // 移除全局事件监听
  uni.$off('favoriteChanged', handleFavoriteChange)
})
</script>

<style lang="scss" scoped>
.profile-page {
  padding: 0rpx !important;
  background-color: #f5f5f4;
  // background-color: #ffffff;
  min-height: 90vh;
  overflow: scroll;
}

/* 顶部展示图片 */
.top-show {
  // background: linear-gradient(164deg, #a7ffec 0%, #ff558a 100%);
  background: #949191;
  width: 100%;
  height: 340rpx !important;
  overflow: hidden;
  position: relative;
}

.top-show-img {
  width: 100%;
  height: 100%;
}

.cover-edit-btn {
  position: absolute;
  right: 24rpx;
  top: 48rpx;
  padding: 8rpx 16rpx;
  background: rgba(0, 0, 0, 0.4);
  color: #fff;
  border-radius: 20rpx;
  font-size: 24rpx;
}

/* 用户信息头部 */
.profile-header {
  position: relative;
  // margin: 0 16rpx;
  // background-color: #ffffff;
}

/* 个人信息头像 */
.user-info {
  display: flex;
  align-items: center;
  color: #000000;
  background-color: #fdfdfd;
  border-radius: 20rpx;
  margin: -72rpx 30rpx 0;
  // -72rpx
  padding: 20rpx;
}

.avatar {
  width: 120rpx;
  height: 120rpx;
  border-radius: 50%;
  margin-right: 32rpx;
  border: 2rpx solid #a2d5e0dc;
}

.user-details {
  flex: 1;
}

.user-name {
  font-size: 36rpx;
  font-weight: 600;
  color: #000000;
  display: block;
  margin-bottom: 8rpx;
}

.user-desc {
  font-size: 24rpx;
  color: rgba(0, 0, 0, 0.8);
}

.login-arrow {
  font-size: 32rpx;
  color: rgba(0, 0, 0, 0.6);
}

.user-stats {
  display: flex;
  gap: 32rpx;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.stat-number {
  font-size: 32rpx;
  font-weight: 600;
  color: #000000;
  margin-bottom: 4rpx;
}

.stat-label {
  font-size: 20rpx;
  color: rgba(0, 0, 0, 0.8);
}

/* 订单管理 */
.order-section {
  background: #ffffff;
  margin: 24rpx 0rpx;
  border-radius: 14rpx 14rpx 0 0;
  padding: 32rpx 38rpx;
  box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.08);
}

.order-nav {
  display: flex;
  justify-content: space-between;
}

.order-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
}

.order-icon {
  font-size: 48rpx;
  margin-bottom: 16rpx;
}

.order-text {
  font-size: 24rpx;
  color: #2c2c2c;
  font-weight: 500;
}

.order-badge {
  position: absolute;
  top: -8rpx;
  right: -8rpx;
  background: #e74c3c;
  color: #ffffff;
  font-size: 20rpx;
  padding: 4rpx 8rpx;
  border-radius: 20rpx;
  min-width: 32rpx;
  text-align: center;
}

/* 查看全部 */
.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 0 20rpx 32rpx;
}

.section-title {
  font-size: 28rpx;
  font-weight: 600;
  color: #2c2c2c;
}

.header-right {
  display: flex;
  align-items: center;
}

.section-more {
  font-size: 24rpx;
  color: #666666;
  margin-right: 8rpx;
}

.arrow {
  font-size: 24rpx;
  color: #666666;
}

/* 功能菜单 */
.menu-section {
  margin: 24rpx 0rpx;
  padding: 0;
}

.menu-group {
  background: #ffffff;
  border-radius: 16rpx;
  margin-bottom: 24rpx;
  overflow: hidden;
  box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.08);
}

.menu-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 32rpx;
  border-bottom: 1rpx solid #f8f8f8;
}

.menu-item:last-child {
  border-bottom: none;
}

.menu-left {
  display: flex;
  align-items: center;
  flex: 1;
}

.menu-icon {
  font-size: 26rpx;
  margin-top: 6rpx;
  margin-right: 14rpx;
}

.menu-text {
  font-size: 28rpx;
  color: #2c2c2c;
  font-weight: 500;
}

.menu-right {
  display: flex;
  align-items: center;
}

.menu-badge {
  font-size: 24rpx;
  color: #e74c3c;
  margin-right: 16rpx;
}

.menu-arrow {
  font-size: 24rpx;
  color: #666666;
}

/* 关于售前售后 */
.after-scale {
  padding: 20rpx;
  margin-top: 30rpx;
}

.order-title-wrap {
  line-height: 50rpx;
}

.after-scale-item {
  display: flex;
  margin: 25rpx 15rpx;
  color: #999;
  line-height: 50rpx;
}

.info-footer {
  height: 100rpx;
  line-height: 100rpx;
  text-align: center;
  color: #aaa;
  font-size: 25rpx;
}
// SVGA动画容器样式
.svga-box {
  display: flex;
  align-items: center;
  color: var(--el-color-primary);
  margin-right: 28px;
  cursor: pointer;
}
.svga-player {
  width: 36px;
  height: 36px;
  margin-bottom: 6px;
  margin-right: 4px;
}
</style>
