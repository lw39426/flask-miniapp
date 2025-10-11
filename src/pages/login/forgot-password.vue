<template>
  <view class="forgot-password-page">
    <!-- 顶部导航 -->
    <view class="nav-bar">
      <view class="nav-left" @tap="goBack">
        <text class="nav-icon">←</text>
      </view>
      <view class="nav-center">
        <text class="nav-title">忘记密码</text>
      </view>
      <view class="nav-right" />
    </view>

    <!-- 背景装饰 -->
    <view class="bg-wrap">
      <image class="logo" src="/static/images/logo-icon.svg" mode="aspectFit" />
    </view>

    <!-- 步骤指示器 -->
    <view class="step-indicator">
      <view class="step-item" :class="{ active: currentStep >= 1, completed: currentStep > 1 }">
        <view class="step-circle">
          1
        </view>
        <text class="step-text">验证手机</text>
      </view>
      <view class="step-line" :class="{ active: currentStep > 1 }" />
      <view class="step-item" :class="{ active: currentStep >= 2, completed: currentStep > 2 }">
        <view class="step-circle">
          2
        </view>
        <text class="step-text">重置密码</text>
      </view>
      <view class="step-line" :class="{ active: currentStep > 2 }" />
      <view class="step-item" :class="{ active: currentStep >= 3 }">
        <view class="step-circle">
          3
        </view>
        <text class="step-text">完成</text>
      </view>
    </view>

    <!-- 内容区域 -->
    <view class="content-container">
      <!-- 步骤1：验证手机号 -->
      <view v-if="currentStep === 1" class="step-content">
        <view class="step-header">
          <text class="step-title">验证手机号</text>
          <text class="step-desc">请输入您注册时使用的手机号</text>
        </view>

        <view class="form-wrap">
          <!-- 手机号 -->
          <view class="form-item">
            <text class="label">手机号</text>
            <input
              v-model="form.phone"
              class="input"
              type="tel"
              placeholder="请输入手机号"
              placeholder-class="placeholder"
              :maxlength="11"
            >
          </view>

          <!-- 验证码 -->
          <view class="form-item">
            <text class="label">验证码</text>
            <input
              v-model="form.code"
              class="input"
              type="number"
              placeholder="请输入验证码"
              placeholder-class="placeholder"
              :maxlength="6"
            >
            <button
              class="code-btn"
              :disabled="isCountingDown"
              @tap="sendResetCode"
            >
              {{ countdownText }}
            </button>
          </view>

          <button class="next-btn" @tap="verifyPhone">
            下一步
          </button>
        </view>
      </view>

      <!-- 步骤2：重置密码 -->
      <view v-if="currentStep === 2" class="step-content">
        <view class="step-header">
          <text class="step-title">重置密码</text>
          <text class="step-desc">请设置您的新密码</text>
        </view>

        <view class="form-wrap">
          <!-- 新密码 -->
          <view class="form-item">
            <text class="label">新密码</text>
            <input
              v-model="form.newPassword"
              class="input"
              :type="(newPasswordVisible ? 'text' : 'password') as any"
              placeholder="请输入新密码(6-16位)"
              placeholder-class="placeholder"
              :maxlength="16"
            >
            <image
              class="eye-icon"
              :src="newPasswordVisible ? '/static/images/eye-open.svg' : '/static/images/eye-close.svg'"
              @tap="toggleNewPasswordVisibility"
            />
          </view>

          <!-- 确认密码 -->
          <view class="form-item">
            <text class="label">确认密码</text>
            <input
              v-model="form.confirmPassword"
              class="input"
              :type="(confirmPasswordVisible ? 'text' : 'password') as any"
              placeholder="请再次输入新密码"
              placeholder-class="placeholder"
              :maxlength="16"
            >
            <image
              class="eye-icon"
              :src="confirmPasswordVisible ? '/static/images/eye-open.svg' : '/static/images/eye-close.svg'"
              @tap="toggleConfirmPasswordVisibility"
            />
          </view>

          <button class="next-btn" @tap="resetPassword">
            重置密码
          </button>
        </view>
      </view>

      <!-- 步骤3：完成 -->
      <view v-if="currentStep === 3" class="step-content success-content">
        <view class="success-icon">
          ✓
        </view>
        <view class="success-title">
          密码重置成功
        </view>
        <view class="success-desc">
          您的密码已成功重置，请使用新密码登录
        </view>
        <button class="success-btn" @tap="goToLogin">
          立即登录
        </button>
      </view>
    </view>
  </view>
</template>

<script lang="ts" setup>
import { computed, reactive, ref } from 'vue'
import { resetPasswordApi, sendResetPasswordCode, verifyResetCode } from '@/api/login'

definePage({
  style: {
    navigationStyle: 'custom',
    navigationBarTitleText: '忘记密码',
    backgroundColor: '#f8f9fa',
  },
})

// 当前步骤
const currentStep = ref(1)

// 表单数据
const form = reactive({
  phone: '',
  code: '',
  newPassword: '',
  confirmPassword: '',
  resetToken: '', // 验证手机号后获得的重置令牌
})

// 密码可见性
const newPasswordVisible = ref(false)
const confirmPasswordVisible = ref(false)

// 验证码倒计时
const countdown = ref(0)
const isCountingDown = computed(() => countdown.value > 0)
const countdownText = computed(() => {
  return isCountingDown.value ? `${countdown.value}s 后重发` : '发送验证码'
})

// 返回上一页
const goBack = () => {
  if (currentStep.value > 1) {
    currentStep.value--
  }
  else {
    uni.navigateBack()
  }
}

// 切换新密码可见性
const toggleNewPasswordVisibility = () => {
  newPasswordVisible.value = !newPasswordVisible.value
}

// 切换确认密码可见性
const toggleConfirmPasswordVisibility = () => {
  confirmPasswordVisible.value = !confirmPasswordVisible.value
}

// 发送重置密码验证码
const sendResetCode = async () => {
  if (isCountingDown.value)
    return

  // 校验手机号
  if (!/^1[3-9]\d{9}$/.test(form.phone)) {
    uni.showToast({
      title: '请输入正确的手机号',
      icon: 'none',
    })
    return
  }

  try {
    uni.showLoading({ title: '发送中...' })
    await sendResetPasswordCode({ phone: form.phone })

    // 开始倒计时
    countdown.value = 60
    const timer = setInterval(() => {
      countdown.value--
      if (countdown.value <= 0) {
        clearInterval(timer)
      }
    }, 1000)

    uni.hideLoading()
    uni.showToast({
      title: '验证码已发送',
      icon: 'success',
    })
  }
  catch (error) {
    uni.hideLoading()
    uni.showToast({
      title: error?.message || '发送失败，请重试',
      icon: 'none',
    })
  }
}

// 验证手机号
const verifyPhone = async () => {
  // 表单验证
  if (!/^1[3-9]\d{9}$/.test(form.phone)) {
    uni.showToast({
      title: '请输入正确的手机号',
      icon: 'none',
    })
    return
  }

  if (!form.code) {
    uni.showToast({
      title: '请输入验证码',
      icon: 'none',
    })
    return
  }

  try {
    uni.showLoading({ title: '验证中...' })
    const result = await verifyResetCode({
      phone: form.phone,
      code: form.code,
    })

    // 保存重置令牌
    form.resetToken = result.data.resetToken

    uni.hideLoading()
    currentStep.value = 2
  }
  catch (error) {
    uni.hideLoading()
    uni.showToast({
      title: error?.message || '验证失败，请重试',
      icon: 'none',
    })
  }
}

// 重置密码
const resetPassword = async () => {
  // 表单验证
  if (!form.newPassword) {
    uni.showToast({
      title: '请输入新密码',
      icon: 'none',
    })
    return
  }

  if (form.newPassword.length < 6) {
    uni.showToast({
      title: '密码长度不能少于6位',
      icon: 'none',
    })
    return
  }

  if (!form.confirmPassword) {
    uni.showToast({
      title: '请确认新密码',
      icon: 'none',
    })
    return
  }

  if (form.newPassword !== form.confirmPassword) {
    uni.showToast({
      title: '两次密码输入不一致',
      icon: 'none',
    })
    return
  }

  try {
    uni.showLoading({ title: '重置中...' })
    await resetPasswordApi({
      resetToken: form.resetToken,
      newPassword: form.newPassword,
    })

    uni.hideLoading()
    currentStep.value = 3
  }
  catch (error) {
    uni.hideLoading()
    uni.showToast({
      title: error?.message || '重置失败，请重试',
      icon: 'none',
    })
  }
}

// 跳转到登录页面
const goToLogin = () => {
  uni.navigateBack()
}
</script>

<style scoped>
.forgot-password-page {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background-color: #f8f9fa;
}

/* 导航栏 */
.nav-bar {
  display: flex;
  align-items: center;
  height: 88rpx;
  padding: 0 32rpx;
  padding-top: var(--status-bar-height, 0);
  background-color: transparent;
  position: relative;
  z-index: 10;
}

.nav-left,
.nav-right {
  width: 120rpx;
}

.nav-center {
  flex: 1;
  text-align: center;
}

.nav-icon {
  font-size: 36rpx;
  color: #333;
  font-weight: bold;
}

.nav-title {
  font-size: 36rpx;
  font-weight: 600;
  color: #333;
}

/* 背景 */
.bg-wrap {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 400rpx;
  background: linear-gradient(180deg, #e0f8f0 0%, #f0f8ff 100%);
  z-index: 0;
}

.logo {
  position: absolute;
  top: 100rpx;
  right: 40rpx;
  width: 120rpx;
  height: 120rpx;
  opacity: 0.5;
}

/* 步骤指示器 */
.step-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40rpx;
  position: relative;
  z-index: 1;
}

.step-item {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.step-circle {
  width: 60rpx;
  height: 60rpx;
  border-radius: 50%;
  background-color: #e0e0e0;
  color: #999;
  font-size: 24rpx;
  font-weight: bold;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 16rpx;
}

.step-item.active .step-circle {
  background-color: #2dcca7;
  color: white;
}

.step-item.completed .step-circle {
  background-color: #2dcca7;
  color: white;
}

.step-text {
  font-size: 24rpx;
  color: #999;
}

.step-item.active .step-text {
  color: #2dcca7;
  font-weight: 500;
}

.step-line {
  width: 80rpx;
  height: 2rpx;
  background-color: #e0e0e0;
  margin: 0 20rpx;
  margin-bottom: 40rpx;
}

.step-line.active {
  background-color: #2dcca7;
}

/* 内容区域 */
.content-container {
  flex: 1;
  padding: 20rpx 40rpx;
  position: relative;
  z-index: 1;
}

.step-content {
  background-color: #ffffff;
  border-radius: 24rpx;
  padding: 40rpx;
  box-shadow: 0 8rpx 24rpx rgba(0, 0, 0, 0.06);
}

.step-header {
  text-align: center;
  margin-bottom: 40rpx;
}

.step-title {
  display: block;
  font-size: 40rpx;
  font-weight: 600;
  color: #333;
  margin-bottom: 16rpx;
}

.step-desc {
  display: block;
  font-size: 28rpx;
  color: #666;
}

/* 表单 */
.form-wrap {
  margin-top: 20rpx;
}

.form-item {
  display: flex;
  align-items: center;
  padding: 20rpx 0;
  border-bottom: 1rpx solid #f0f0f0;
  margin-bottom: 30rpx;
}

.label {
  font-size: 30rpx;
  color: #333;
  width: 120rpx;
}

.input {
  flex: 1;
  font-size: 30rpx;
  color: #333;
}

.placeholder {
  color: #cccccc;
}

.code-btn {
  font-size: 28rpx;
  color: #2dcca7;
  background-color: transparent;
  border: none;
  padding: 0;
  margin: 0;
  white-space: nowrap;
}

.code-btn[disabled] {
  color: #999999;
}

.eye-icon {
  width: 40rpx;
  height: 40rpx;
}

/* 按钮 */
.next-btn {
  width: 100%;
  height: 88rpx;
  line-height: 88rpx;
  margin-top: 40rpx;
  font-size: 32rpx;
  color: #ffffff;
  background: #2dcca7;
  border-radius: 44rpx;
  border: none;
  box-shadow: 0 8rpx 20rpx rgba(45, 204, 167, 0.3);
}

/* 成功页面 */
.success-content {
  text-align: center;
  padding: 60rpx 40rpx;
}

.success-icon {
  width: 120rpx;
  height: 120rpx;
  border-radius: 50%;
  background-color: #2dcca7;
  color: white;
  font-size: 60rpx;
  font-weight: bold;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 40rpx;
}

.success-title {
  font-size: 36rpx;
  font-weight: 600;
  color: #333;
  margin-bottom: 16rpx;
}

.success-desc {
  font-size: 28rpx;
  color: #666;
  margin-bottom: 60rpx;
}

.success-btn {
  width: 100%;
  height: 88rpx;
  line-height: 88rpx;
  font-size: 32rpx;
  color: #ffffff;
  background: #2dcca7;
  border-radius: 44rpx;
  border: none;
  box-shadow: 0 8rpx 20rpx rgba(45, 204, 167, 0.3);
}
</style>
