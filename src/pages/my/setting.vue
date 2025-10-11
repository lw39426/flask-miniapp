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
        <view class="setting-item" @tap="goToProfile">
          <view class="item-label">
            修改个人资料
          </view>
          <view class="item-content">
            <text class="item-arrow">></text>
          </view>
        </view>
      </view>
    </view>

    <!-- 功能设置 -->
    <view class="setting-section">
      <view class="section-title">
        功能设置
      </view>
      <view class="setting-list">
        <!-- 收货地址 -->
        <view class="setting-item" @tap="goToAddress">
          <view class="item-label">
            收货地址管理
          </view>
          <view class="item-content">
            <text class="item-arrow">></text>
          </view>
        </view>
        <!-- 账号管理 -->
        <view class="setting-item" @tap="goToAccountManagement">
          <view class="item-label">
            账号管理
          </view>
          <view class="item-content">
            <text class="item-arrow">></text>
          </view>
        </view>
        <!-- 隐私设置 -->
        <view class="setting-item" @tap="goToPrivacy">
          <view class="item-label">
            隐私设置
          </view>
          <view class="item-content">
            <text class="item-arrow">></text>
          </view>
        </view>
        <!-- 通知设置 -->
        <view class="setting-item" @tap="goToNotification">
          <view class="item-label">
            通知设置
          </view>
          <view class="item-content">
            <text class="item-arrow">></text>
          </view>
        </view>
      </view>
    </view>

    <!-- 其他设置 -->
    <view class="setting-section">
      <view class="section-title">
        其他
      </view>
      <view class="setting-list">
        <!-- 关于我们 -->
        <view class="setting-item" @tap="goToAbout">
          <view class="item-label">
            关于我们
          </view>
          <view class="item-content">
            <text class="item-arrow">></text>
          </view>
        </view>
        <!-- 意见反馈 -->
        <view class="setting-item" @tap="goToFeedback">
          <view class="item-label">
            意见反馈
          </view>
          <view class="item-content">
            <text class="item-arrow">></text>
          </view>
        </view>
        <!-- 检查更新 -->
        <view class="setting-item" @tap="checkUpdate">
          <view class="item-label">
            检查更新
          </view>
          <view class="item-content">
            <text class="item-value">v1.0.0</text>
            <text class="item-arrow">></text>
          </view>
        </view>
      </view>
    </view>

    <!-- 退出登录按钮 -->
    <view class="logout-button-container">
      <wd-button type="error" block @click="confirmLogout">
        退出登录
      </wd-button>
    </view>
  </view>
</template>

<script lang="ts" setup>
import { useToast } from 'wot-design-uni'
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
const toast = useToast()

// 导航
const goBack = () => uni.navigateBack()

// 跳转到个人资料页面
const goToProfile = () => {
  uni.navigateTo({
    url: '/pages/my/profile'
  })
}

// 功能跳转
const goToAddress = () => toast.show({ msg: '收货地址管理功能开发中' })
const goToAccountManagement = () => toast.show({ msg: '账号管理功能开发中' })
const goToPrivacy = () => toast.show({ msg: '隐私设置功能开发中' })
const goToNotification = () => toast.show({ msg: '通知设置功能开发中' })
const goToAbout = () => toast.show({ msg: '关于我们功能开发中' })
const goToFeedback = () => toast.show({ msg: '意见反馈功能开发中' })

const checkUpdate = () => {
  uni.showLoading({ title: '检查中...' })
  setTimeout(() => {
    uni.hideLoading()
    toast.success({ msg: '当前已是最新版本' })
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
}

.setting-section {
  margin-top: 20rpx;

  .section-title {
    padding: 20rpx 30rpx 10rpx;
    font-size: 24rpx;
    color: #999;
    background-color: transparent;
  }
}

.setting-list {
  background-color: #fff;
}

.setting-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 30rpx;
  border-bottom: 1rpx solid #f0f0f0;
  font-size: 28rpx;

  &:last-child {
    border-bottom: none;
  }

  .item-label {
    color: #333;
  }

  .item-content {
    display: flex;
    align-items: center;
    color: #666;
  }

  .item-value {
    margin-right: 20rpx;
    font-size: 24rpx;
    color: #999;
  }

  .item-arrow {
    font-size: 24rpx;
    color: #999;
  }
}

.logout-button-container {
  margin: 40rpx 30rpx;
}
</style>
