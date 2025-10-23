<template>
  <view class="setting-page">
    <!-- 自定义导航栏 -->
    <view class="custom-nav">
      <view class="nav-left" @tap="goBack">
        <text class="nav-icon">←</text>
      </view>
      <view class="nav-title">
        设置
      </view>
      <view class="nav-right" />
    </view>

    <!-- 个人信息设置 -->
    <view class="setting-section">
      <view class="section-title">
        个人信息
      </view>
      <view class="setting-list">
        <sar-list-item hover arrow title="修改个人资料" @tap="goToProfile" />
      </view>
    </view>

    <!-- 功能设置 -->
    <view class="setting-section">
      <view class="section-title">
        功能设置
      </view>
      <view class="setting-list">
        <!-- 收货地址 -->
        <sar-list-item hover arrow title="收货地址管理" @tap="goToAddress" />
        <!-- 账号管理 -->
        <sar-list-item hover arrow title="账号管理" @tap="goToAccountManagement" />
        <!-- 隐私设置 -->
        <sar-list-item hover arrow title="隐私设置" @tap="goToPrivacy" />
        <!-- 通知设置 -->
        <sar-list-item hover arrow title="通知设置" @tap="goToNotification" />
      </view>
    </view>

    <!-- 其他设置 -->
    <view class="setting-section">
      <view class="section-title">
        其他
      </view>
      <view class="setting-list">
        <!-- 关于我们 -->
        <sar-list-item hover arrow title="关于我们" @tap="goToAbout" />
        <!-- 意见反馈 -->
        <sar-list-item hover arrow title="意见反馈" @tap="goToFeedback" />
        <!-- 检查更新 -->
        <sar-list-item hover arrow title="检查更新" value="v1.0.0" @tap="checkUpdate" />
      </view>
    </view>

    <!-- 退出登录按钮 -->
    <view class="logout-button-container">
      <sar-button block @click="confirmLogout">
        退出登录
      </sar-button>
    </view>
  </view>
</template>

<script lang="ts" setup>
// import { useToast } from 'wot-design-uni'
import { toast } from 'sard-uniapp'
import { useTokenStore } from '@/store/token'

// 定义页面配置
definePage({
  style: {
    navigationStyle: 'custom',
    navigationBarTitleText: '设置',
  },
})

// 获取store
const tokenStore = useTokenStore()
// const toast = useToast()

// 导航
const goBack = () => uni.navigateBack()

// 跳转到个人资料页面
const goToProfile = () => {
  uni.navigateTo({
    url: '/pages/my/profile'
  })
}

// 功能跳转
const goToAddress = () => toast.success('收货地址管理功能开发中')
const goToAccountManagement = () => toast.success('账号管理功能开发中')
const goToPrivacy = () => toast.success('隐私设置功能开发中')
const goToNotification = () => toast.success('通知设置功能开发中')
const goToAbout = () => toast.success('关于我们功能开发中')
const goToFeedback = () => toast.success('意见反馈功能开发中')

const checkUpdate = () => {
  uni.showLoading({ title: '检查中...' })
  setTimeout(() => {
    uni.hideLoading()
    toast.success('当前已是最新版本')
  }, 1500)
}

// 退出登录
const confirmLogout = () => {
  uni.showModal({
    title: '确认退出',
    content: '确定要退出登录吗？',
    success: (res) => {
      if (res.confirm) {
        tokenStore.logout().then(() => {
          uni.showToast({ title: '已退出登录', icon: 'success' })
          setTimeout(() => {
            uni.reLaunch({ url: '/pages/index/index' })
          }, 1500)
        })
      }
    }
  })
}
</script>

<style lang="scss" scoped>
.setting-page {
  background-color: #f8f8f8;
  min-height: 100vh;
  padding-bottom: 200rpx;
}

.custom-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 88rpx;
  padding: var(--status-bar-height) 30rpx 0;
  background-color: #fff;
  position: sticky;
  top: 0;
  z-index: 100;
}

.nav-left,
.nav-right {
  width: 60rpx;
  height: 60rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.nav-title {
  font-size: 32rpx;
  font-weight: 500;
}

.nav-icon {
  font-size: 36rpx;
}

.setting-section {
  margin-top: 20rpx;
}

.section-title {
  padding: 20rpx 30rpx 10rpx;
  font-size: 24rpx;
  color: #999;
  background-color: transparent;
}

.setting-list {
  background-color: #fff;
}

.logout-button-container {
  margin: 40rpx 30rpx;
}
</style>
