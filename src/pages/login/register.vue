<script lang="ts" setup>
import { computed, reactive, ref } from 'vue'
import { LOGIN_PAGE } from '@/router/config'
import { useTokenStore } from '@/store/token'

const tokenStore = useTokenStore()

definePage({
  style: {
    navigationStyle: 'custom',
    navigationBarTitleText: '注册',
    backgroundColor: '#f8f9fa',
  },
})

// 表单数据
const form = reactive({
  phone: '',
  code: '',
  password: '',
  confirmPassword: '',
})

// 密码可见性
const passwordVisible = ref(false)
const confirmPasswordVisible = ref(false)

// 验证码倒计时
const countdown = ref(0)
const isCountingDown = computed(() => countdown.value > 0)
const countdownText = computed(() => {
  return isCountingDown.value ? `${countdown.value}s 后重发` : '发送验证码'
})

// 切换密码可见性
const togglePasswordVisibility = () => {
  passwordVisible.value = !passwordVisible.value
}

// 切换确认密码可见性
const toggleConfirmPasswordVisibility = () => {
  confirmPasswordVisible.value = !confirmPasswordVisible.value
}

// 发送验证码
const sendCode = () => {
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

  // 开始倒计时
  countdown.value = 60
  const timer = setInterval(() => {
    countdown.value--
    if (countdown.value <= 0) {
      clearInterval(timer)
    }
  }, 1000)

  // TODO: 调用发送验证码 API
  uni.showToast({
    title: '验证码已发送',
    icon: 'success',
  })
}

// 提交注册
const handleRegister = () => {
  // 表单验证
  if (!form.phone) {
    uni.showToast({ title: '请输入手机号', icon: 'none' })
    return
  }
  console.log(form.phone, /^1[3-9]\d{9}$/.test(form.phone))
  if (!/^1[3-9]\d{9}$/.test(form.phone)) {
    uni.showToast({ title: '手机号格式不正确', icon: 'none' })
    return
  }
  if (!form.code) {
    uni.showToast({ title: '请输入验证码', icon: 'none' })
    return
  }
  if (!form.password) {
    uni.showToast({ title: '请输入密码', icon: 'none' })
    return
  }
  if (form.password.length < 6) {
    uni.showToast({ title: '密码长度不能少于6位', icon: 'none' })
    return
  }
  if (form.password !== form.confirmPassword) {
    uni.showToast({ title: '两次输入的密码不一致', icon: 'none' })
    return
  }

  // 执行注册逻辑
  console.log('执行注册:', form)
  // TODO: 调用注册 API
  tokenStore.register(form).then((res) => {
    console.log('注册', res)
  })

  uni.showToast({
    title: '注册成功',
    icon: 'success',
  })

  // 注册成功后跳转到登录页
  setTimeout(() => {
    uni.redirectTo({
      url: LOGIN_PAGE,
    })
  }, 1500)
}

// 返回登录页
const goToLogin = () => {
  uni.navigateBack()
}
</script>

<template>
  <view class="register-page">
    <!-- 背景装饰 -->
    <view class="bg-wrap">
      <image class="logo" src="/static/images/logo-icon.svg" mode="aspectFit" />
    </view>

    <!-- 头部欢迎语 -->
    <view class="header-wrap">
      <text class="title">欢迎注册</text>
      <text class="subtitle">创建您的账号</text>
    </view>

    <!-- 表单容器 -->
    <view class="form-container">
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
            @tap="sendCode"
          >
            {{ countdownText }}
          </button>
        </view>

        <!-- 密码 -->
        <view class="form-item">
          <text class="label">密码</text>
          <input
            v-model="form.password"
            class="input"
            :type="((passwordVisible ? 'text' : 'password') as any)"
            placeholder="请输入密码"
            placeholder-class="placeholder"
          >
          <image
            class="eye-icon"
            :src="passwordVisible ? '/static/images/eye-open.svg' : '/static/images/eye-close.svg'"
            @tap="togglePasswordVisibility"
          />
        </view>

        <!-- 确认密码 -->
        <view class="form-item">
          <text class="label">确认密码</text>
          <input
            v-model="form.confirmPassword"
            class="input"
            :type="((confirmPasswordVisible ? 'text' : 'password') as any)"
            placeholder="请再次输入密码"
            placeholder-class="placeholder"
          >
          <image
            class="eye-icon"
            :src="confirmPasswordVisible ? '/static/images/eye-open.svg' : '/static/images/eye-close.svg'"
            @tap="toggleConfirmPasswordVisibility"
          />
        </view>

        <!-- 主操作按钮 -->
        <button class="submit-btn" @tap="handleRegister">
          注册
        </button>

        <!-- 返回登录 -->
        <view class="switch-mode">
          <text class="switch-text">
            已有账号?
          </text>
          <text class="switch-link" @tap="goToLogin">
            立即登录
          </text>
        </view>
      </view>
    </view>

    <!-- 用户协议提示 -->
    <view class="agreement-tip">
      注册即表示您同意
      <text class="agreement-link">《用户协议》</text>
      和
      <text class="agreement-link">《隐私政策》</text>
    </view>
  </view>
</template>

<style scoped>
.register-page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background-color: #f8f9fa;
  overflow: hidden;
}

/* 背景 */
.bg-wrap {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 500rpx;
  background: linear-gradient(180deg, #e0f8f0 0%, #f0f8ff 100%);
  z-index: 0;
}

.logo {
  position: absolute;
  top: 100rpx;
  right: 40rpx;
  width: 180rpx;
  height: 180rpx;
  opacity: 0.7;
}

/* 欢迎语 */
.header-wrap {
  position: relative;
  padding: 154rpx 60rpx 60rpx;
  z-index: 1;
}

.title {
  display: block;
  font-size: 52rpx;
  font-weight: 600;
  color: #333;
}

.subtitle {
  display: block;
  font-size: 40rpx;
  color: #555;
}

/* 表单 */
.form-container {
  position: relative;
  padding: 30rpx 40rpx;
  z-index: 1;
}

.form-wrap {
  background-color: #ffffff;
  padding: 60rpx 40rpx;
  border-radius: 32rpx;
  box-shadow: 0 10rpx 40rpx rgba(0, 0, 0, 0.05);
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
  padding: 0 20rpx;
  width: 40rpx;
  height: 40rpx;
}

/* 提交按钮 */
.submit-btn {
  width: 100%;
  height: 96rpx;
  line-height: 96rpx;
  margin-top: 40rpx;
  font-size: 32rpx;
  color: #ffffff;
  background: #2dcca7;
  border-radius: 48rpx;
  border: none;
  box-shadow: 0 8rpx 20rpx rgba(45, 204, 167, 0.3);
}

/* 切换模式 */
.switch-mode {
  display: flex;
  justify-content: center;
  align-items: center;
  margin-top: 40rpx;
  font-size: 26rpx;
}

.switch-text {
  color: #999999;
}

.switch-link {
  color: #2dcca7;
  margin-left: 16rpx;
}

/* 用户协议提示 */
.agreement-tip {
  text-align: center;
  font-size: 24rpx;
  color: #999;
  margin-top: 40rpx;
}

.agreement-link {
  color: #2dcca7;
}
</style>
