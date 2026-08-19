<template>
  <view class="login-container">
    <!-- 1. 顶部 Logo 区域 -->
    <view class="logo-box">
      <!-- 替换为你自己的 Logo 图片 -->
      <view class="logo-placeholder">
        得物
      </view>
      <text class="slogan">得到美好事物</text>
    </view>

    <!-- 2. 按钮区域 (核心逻辑) -->
    <view class="btn-group">
      <!--
         【一键登录按钮】
         逻辑：如果已勾选协议(isAgreed)，渲染为原生授权按钮；
              如果未勾选，渲染为普通按钮，点击触发抖动提示。
      -->

      <!-- #ifdef MP-WEIXIN -->
      <!-- 微信小程序端：授权手机号 -->
      <button
        v-if="isAgreed"
        class="btn btn-primary"
        open-type="getPhoneNumber"
        @getphonenumber="onWechatLogin"
      >
        一键登录
      </button>
      <button
        v-else
        class="btn btn-primary"
        @click="checkAgreement"
      >
        一键登录
      </button>
      <!-- #endif -->

      <!-- #ifdef APP-PLUS -->
      <!-- App端：调用一键登录 SDK -->
      <button class="btn btn-primary" @click="onAppOneClickLogin">
        一键登录
      </button>
      <!-- #endif -->

      <!-- 手机号验证码登录/注册 -->
      <button class="btn btn-secondary" @click="toPhoneLogin">
        手机号登录/注册
      </button>

      <!-- 暂不登录 -->
      <view class="guest-link" @click="onGuestLogin">
        暂不登录 <text class="icon-help">?</text>
      </view>
    </view>

    <!-- 3. 底部协议区域 -->
    <!-- 动态绑定 shake-anim 类名实现抖动 -->
    <view class="privacy-box" :class="{ 'shake-anim': isShaking }">
      <view
        class="checkbox"
        :class="{ checked: isAgreed }"
        @click="toggleAgree"
      >
        <view v-if="isAgreed" class="checkmark">
          ✓
        </view>
      </view>
      <view class="privacy-text">
        已阅读并同意
        <text class="link" @click="openWeb('用户协议')">《用户协议》</text>
        <text class="link" @click="openWeb('隐私政策')">《隐私政策》</text>
        <text class="link" @click="openWeb('买家须知')">《买家须知》</text>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue'

// 状态管理
const isAgreed = ref(false) // 是否勾选协议
const isShaking = ref(false) // 控制抖动动画

// 切换勾选状态
const toggleAgree = () => {
  isAgreed.value = !isAgreed.value
  if (isAgreed.value)
    isShaking.value = false
}

// 触发抖动动画
const triggerShake = () => {
  isShaking.value = true
  // 500ms 后移除动画类，保证下次还能触发
  setTimeout(() => {
    isShaking.value = false
  }, 500)
}

// 检查协议（未勾选时触发抖动）
const checkAgreement = () => {
  if (!isAgreed.value) {
    triggerShake()
    uni.showToast({ title: '请先阅读并同意协议', icon: 'none' })
    return false
  }
  return true
}

// --- 业务逻辑 ---

// 1. 微信小程序一键登录
const onWechatLogin = (e) => {
  // 注意：进入这里说明 isAgreed 已经是 true 了
  if (e.detail.code) {
    console.log('获取到微信Code:', e.detail.code)
    // TODO: 调用后端接口: POST /api/login/wechat { code }
  }
  else {
    console.log('用户拒绝授权')
  }
}

// 2. App 一键登录 (Flutter/UniApp原生的逻辑)
const onAppOneClickLogin = () => {
  if (!checkAgreement())
    return

  // 调用封装好的 SDK 方法
  // uni.login({ provider: 'univerify' ... })
  console.log('调用App本机号码一键登录')
}

// 3. 普通手机号登录
const toPhoneLogin = () => {
  // 通常跳转到输入手机号验证码的页面
  uni.navigateTo({ url: '/pages/login/login-phone-better' })
}

// 4. 游客模式
const onGuestLogin = () => {
  console.log('暂不登录')
  uni.switchTab({ url: '/pages/index/index' })
}

// 5. 打开协议网页
const openWeb = (title) => {
  console.log('打开协议:', title)
  // uni.navigateTo({ url: `/pages/webview/index?title=${title}` })
}
</script>

<style lang="scss" scoped>
.login-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
  height: 100vh;
  padding: 100rpx 60rpx 60rpx; // 上 左右 下
  background-color: #fff;
  box-sizing: border-box;
}

/* Logo 区域 */
.logo-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-top: 10vh;

  .logo-placeholder {
    width: 140rpx;
    height: 140rpx;
    background-color: #000;
    color: #fff;
    font-size: 40rpx;
    font-weight: bold;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 20rpx;
    margin-bottom: 30rpx;
  }

  .slogan {
    font-size: 36rpx;
    font-weight: bold;
    letter-spacing: 4rpx;
  }
}

/* 按钮区域 */
.btn-group {
  width: 100%;
  margin-bottom: 100rpx; // 给底部协议留位置

  .btn {
    width: 100%;
    height: 100rpx;
    line-height: 100rpx;
    border-radius: 8rpx; // 得物风格是小圆角，不是半圆
    font-size: 32rpx;
    margin-bottom: 30rpx;
    border: none;

    &::after {
      border: none;
    } // 去除小程序原生边框
  }

  .btn-primary {
    background-color: #00c2b3; // 得物绿/青色
    color: #fff;
    font-weight: bold;
  }

  .btn-secondary {
    background-color: #fff;
    color: #333;
    border: 1px solid #e0e0e0;
    font-weight: bold;
  }

  .guest-link {
    text-align: center;
    color: #999;
    font-size: 28rpx;
    display: flex;
    align-items: center;
    justify-content: center;

    .icon-help {
      display: inline-block;
      width: 30rpx;
      height: 30rpx;
      line-height: 30rpx;
      border: 1px solid #ccc;
      border-radius: 50%;
      font-size: 20rpx;
      margin-left: 8rpx;
    }
  }
}

/* 协议区域 */
.privacy-box {
  display: flex;
  align-items: flex-start;
  font-size: 24rpx;
  color: #999;
  line-height: 1.5;
  width: 100%;

  // 复选框样式
  .checkbox {
    width: 32rpx;
    height: 32rpx;
    border: 2rpx solid #ccc;
    border-radius: 50%; // 圆形复选框
    margin-right: 12rpx;
    margin-top: 4rpx; // 对齐文字
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;

    &.checked {
      background-color: #00c2b3;
      border-color: #00c2b3;
    }

    .checkmark {
      color: #fff;
      font-size: 24rpx;
    }
  }

  .privacy-text {
    flex: 1;
    .link {
      color: #333; // 协议颜色加深
    }
  }
}

/* --- 抖动动画 (CSS Keyframes) --- */
.shake-anim {
  animation: shake 0.5s cubic-bezier(0.36, 0.07, 0.19, 0.97) both;
}

@keyframes shake {
  10%,
  90% {
    transform: translate3d(-2px, 0, 0);
  }
  20%,
  80% {
    transform: translate3d(4px, 0, 0);
  }
  30%,
  50%,
  70% {
    transform: translate3d(-8px, 0, 0);
  }
  40%,
  60% {
    transform: translate3d(8px, 0, 0);
  }
}
</style>
