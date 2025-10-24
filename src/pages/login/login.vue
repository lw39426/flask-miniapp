<template>
  <view class="login-page">
    <!-- 背景装饰 -->
    <view class="bg-wrap">
      <image class="logo" src="/static/images/logo-icon.svg" mode="aspectFit" />
    </view>

    <!-- 头部欢迎语 -->
    <view class="header-wrap">
      <text class="title">您好，</text>
      <text class="subtitle">欢迎回来</text>
    </view>

    <!-- 表单容器 -->
    <view class="form-container">
      <!-- 登录方式切换 -->
      <view class="login-tabs">
        <view
          class="login-tab"
          :class="{ active: loginType === 'password' }"
          @tap="loginType = 'password'"
        >
          账号密码登录
        </view>
        <view
          class="login-tab"
          :class="{ active: loginType === 'phone' }"
          @tap="loginType = 'phone'"
        >
          手机号登录
        </view>
      </view>

      <view class="form-wrap">
        <!-- 账号密码登录表单 -->
        <block v-if="loginType === 'password'">
          <!-- 账号 -->
          <view class="form-item">
            <text class="label">账号</text>
            <input
              v-model="form.username"
              class="input"
              type="text"
              placeholder="请输入账号"
              placeholder-class="placeholder"
            >
          </view>
          <!-- 图形验证码 -->
          <view class="form-item">
            <text class="label">验证码</text>
            <input
              v-model="form.captcha"
              class="input"
              type="text"
              placeholder="请输入图形验证码"
              placeholder-class="placeholder"
            >
            <image
              class="captcha-img"
              :src="captchaImage"
              mode="widthFix"
              @tap="getCaptcha"
            />
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

          <!-- 账号密码操作按钮 -->
          <button class="submit-btn" @tap="handleSubmit">
            登录
          </button>
        </block>

        <!-- 手机号登录表单 -->
        <block v-if="loginType === 'phone'">
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

          <!-- 手机号操作按钮 -->
          <button class="submit-btn" @tap="handlePhoneSubmit">
            登录
          </button>
        </block>

        <!-- 切换模式 -->
        <view class="switch-mode">
          <text class="extra-link" @tap="forgotPassword">忘记密码?</text>
          <view class="mode-switch-wrap">
            <text class="switch-text">
              还没有账号?
            </text>
            <text class="switch-link" @tap="goToRegister">
              立即注册
            </text>
          </view>
        </view>
      </view>
    </view>

    <!-- 快捷登录 -->
    <view class="extra-links">
      <!-- <view class="i-carbon-logo-wechat text-4xl text-green" /> -->
      <sar-button
        inline
        root-style="margin-left: 10rpx"
        background="#2dcca7"
        @tap="quickLogin"
      >
        快捷登录
      </sar-button>
      <!-- #ifdef MP-WEIXIN -->
      <sar-button
        inline
        root-style="margin-left: 70rpx"
        background="#45d6a7"
        color="#fff"
        open-type="getPhoneNumber"
        @getphonenumber="handleWechatPhoneLogin"
      >
        手机号登录
      </sar-button>
    <!-- #endif -->
    </view>
  </view>
</template>

<script lang="ts" setup>
import { toast } from 'sard-uniapp'
import { computed, reactive, ref } from 'vue'
import { getCode } from '@/api/login'
import { FORGOT_PASSWORD_PAGE, REGISTER_PAGE } from '@/router/config'
import { useTokenStore } from '@/store/token'

const tokenStore = useTokenStore()

definePage({
  style: {
    navigationStyle: 'custom',
    navigationBarTitleText: '登录',
    backgroundColor: '#f8f9fa',
  },
})

// 登录类型：'password' 或 'phone'
const loginType = ref('password')

// 表单数据
const form = reactive({
  username: 'liwanwan',
  phone: '13111111111',
  phonePwd: '111111',
  code: '1',
  password: '123123',
  captcha: '1', // 用户输入的文本
  captcha_key: '' // 后端给的 key
})

const captchaImage = ref('') // 图片 base64
// 密码可见性
const passwordVisible = ref(false)

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

// 提交账密登录表单
const handleSubmit = async () => {
  try {
    // 账号密码登录验证
    if (!form.username) {
      uni.showToast({ title: '请输入账号', icon: 'none' })
      return
    }
    if (!form.password) {
      uni.showToast({ title: '请输入密码', icon: 'none' })
      return
    }
    if (!form.captcha) {
      uni.showToast({ title: '请输入验证码', icon: 'none' })
      return
    }

    console.log('执行账号密码登录:', { username: form.username, password: form.password })
    const res = await tokenStore.login(
      {
        username: form.username,
        password: form.password,
        captcha: form.captcha,
        captcha_key: form.captcha_key
      }
    )
    if (res) {
      uni.showToast({
        title: '登录成功',
        icon: 'success',
      })

      // 登录成功后返回上一页或跳转到首页
      setTimeout(() => {
        const pages = getCurrentPages()
        if (pages.length > 1) {
          uni.navigateBack()
        }
        else {
          uni.switchTab({ url: '/pages/index/index' })
        }
      }, 1000)
    }
  }
  catch (error) {
    // 统一处理登录失败
    uni.showToast({
      title: error?.message || '登录失败，请重试',
      icon: 'error',
      duration: 2500
    })
  }
}

// 提交手机号登录表单
const handlePhoneSubmit = async () => {
  try {
    // 表单验证
    // 手机号验证码登录验证
    if (!form.phone) {
      uni.showToast({ title: '请输入手机号', icon: 'none' })
      return
    }
    if (!/^1[3-9]\d{9}$/.test(form.phone)) {
      uni.showToast({ title: '请输入正确的手机号', icon: 'none' })
      return
    }
    if (!form.code) {
      uni.showToast({ title: '请输入验证码', icon: 'none' })
      return
    }

    console.log('执行手机号登录:', { phone: form.phone, code: form.code })
    // 构建手机号登录的表单
    const phoneLoginForm = {
      phone: form.phone,
      code: form.code,
      password: form.phonePwd,
      type: 'phone' // 标识这是手机号登录
    }

    const res = await tokenStore.loginByPhone(phoneLoginForm)
    if (res) {
      uni.showToast({
        title: '登录成功',
        icon: 'success',
      })

      // 登录成功后返回上一页或跳转到首页
      setTimeout(() => {
        const pages = getCurrentPages()
        if (pages.length > 1) {
          uni.navigateBack()
        }
        else {
          uni.switchTab({ url: '/pages/index/index' })
        }
      }, 1500)
    }
  }
  catch (error) {
    // 统一处理登录失败
    uni.showToast({
      title: error?.message || '登录失败，请重试',
      icon: 'error',
      duration: 2500
    })
  }
}

// 跳转到注册页面
const goToRegister = () => {
  uni.navigateTo({
    url: REGISTER_PAGE
  })
}

// 跳转到服务协议
const goToAgreement = () => {
  uni.showToast({ title: '跳转服务协议', icon: 'none' })
}

// 跳转到隐私政策
const goToPrivacy = () => {
  uni.showToast({ title: '跳转隐私政策', icon: 'none' })
}

// 忘记密码
const forgotPassword = () => {
  uni.navigateTo({
    url: FORGOT_PASSWORD_PAGE
  })
}

/**
 * 获取可用原生 OAuth 提供方，优先微信，其次支付宝
 */
const getAvailableOAuthProviders = () => new Promise<string[]>((resolve) => {
  uni.getProvider({
    service: 'oauth',
    success: res => resolve(res.provider || []),
    fail: () => resolve([])
  })
})

/**
 * 调用原生 OAuth 登录并通过后端换取 token
 * 注意：当前通过 tokenStore.login 统一入口传递 { type: 'oauth', provider, code, iv, encryptedData }
 * 如果后端/Store需要改为专门接口，可在此函数中替换为你的 API 调用。
 */
const doNativeOAuth = async (provider: 'weixin' | 'alipay' | any) => {
  // 1. 原生登录，获取临时 code
  const loginRes = await new Promise<any>((resolve, reject) => {
    uni.login({
      provider,
      success: resolve,
      fail: reject
    })
  })
  console.log('wx原生登录结果:', loginRes)
  const code = loginRes?.code
  if (!code)
    throw new Error('未获取到登录凭证 code')

  // 2.（可选）获取用户信息（部分后端需要 iv、encryptedData）
  let iv: string | undefined
  let encryptedData: string | undefined
  try {
    const userInfoRes = await new Promise<any>((resolve, reject) => {
      uni.getUserProfile({
        provider,
        desc: '用于完善会员资料',
        success: resolve,
        fail: reject
      })
    })
    console.log('wx原生获取用户信息结果:', userInfoRes)
    iv = userInfoRes?.iv
    encryptedData = userInfoRes?.encryptedData
  }
  catch {
    // 未授权用户信息不影响登录换取 token（依后端要求）
  }

  // 3. 调用 tokenStore 统一登录入口（假定支持 type='oauth'）
  const ok = await (tokenStore as any).login({
    type: 'oauth',
    provider,
    code,
    iv,
    encryptedData
  })
  if (!ok)
    throw new Error('登录失败，后端未返回有效凭证')
  return true
}

/**
 * 快捷登录（原生微信/支付宝）
 */
const quickLogin = async () => {
  try {
    uni.showLoading({ title: '登录中...' })
    const providers = await getAvailableOAuthProviders()
    const provider = providers.includes('weixin')
      ? 'weixin'
      : (providers.includes('alipay') ? 'alipay' : '')
    if (!provider) {
      uni.hideLoading()
      uni.showToast({ title: '当前环境不支持原生快捷登录', icon: 'none' })
      return
    }
    console.log('调用原生 OAuth 登录:', providers)

    await doNativeOAuth(provider as any)
    uni.hideLoading()
    uni.showToast({ title: '登录成功', icon: 'success' })
    // setTimeout(() => {
    //   const pages = getCurrentPages()
    //   if (pages.length > 1) {
    //     uni.navigateBack()
    //   } else {
    //     uni.switchTab({ url: '/pages/index/index' })
    //   }
    // }, 1000)
  }
  catch (error: any) {
    uni.hideLoading()
    uni.showToast({
      title: error?.message || '登录失败，请重试',
      icon: 'error',
      duration: 2500
    })
  }
}

/**
 * 处理微信手机号授权登录
 * @param {object} e - 事件对象
 */
const handleWechatPhoneLogin = async (e) => {
  // e.detail.errMsg === 'getPhoneNumber:ok' 表示用户同意授权
  // e.detail.errMsg === 'getPhoneNumber:fail user deny' 表示用户拒绝授权
  console.log(e)
  if (e.detail.errMsg !== 'getPhoneNumber:ok') {
    toast(e.detail.errMsg || '获取授权失败', {
      timeout: 2000
    })
    return
  }

  // 用户同意授权，e.detail.code 就是后端需要的凭证
  const { code } = e.detail
  if (!code) {
    uni.showToast({
      title: '授权失败，请重试',
      icon: 'error'
    })
    return
  }

  try {
    uni.showLoading({ title: '登录中...' })

    // 调用一个新的、专门用于微信手机号登录的API
    // 这个API只需要传递从微信获取的 code
    const res = {}

    uni.hideLoading()

    if (res) {
      // ---- 这里完全复用您原来优秀的成功处理逻辑 ----
      uni.showToast({ title: '登录成功', icon: 'success' })
      setTimeout(() => {
        const pages = getCurrentPages()
        if (pages.length > 1) {
          uni.navigateBack()
        }
        else {
          uni.switchTab({ url: '/pages/index/index' })
        }
      }, 1500)
    }
  }
  catch (error) {
    // ---- 这里也完全复用您原来的错误处理逻辑 ----
    uni.hideLoading()
    uni.showToast({
      title: (error as any)?.message || '登录失败，请重试',
      icon: 'error',
      duration: 2500
    })
  }
}

// 获取验证码
const getCaptcha = async () => {
  const { data } = await getCode()
  captchaImage.value = data.image // base64 字符串
  form.captcha_key = data.captcha_key // 隐藏字段，随表单回传
}
onLoad(() => {
  getCaptcha()
})
</script>

<style scoped>
.login-page {
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

/* 登录方式切换 */
.login-tabs {
  display: flex;
  justify-content: center;
  margin-bottom: 30rpx;
}

.login-tab {
  padding: 20rpx 30rpx;
  font-size: 28rpx;
  color: #666;
  position: relative;
  margin: 0 20rpx;
}

.login-tab.active {
  color: #2dcca7;
  font-weight: 500;
}

.login-tab.active::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 40rpx;
  height: 4rpx;
  background-color: #2dcca7;
  border-radius: 2rpx;
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

/* 验证码 */
.captcha-img {
  width: 160rpx;
  height: 70rpx;
  cursor: pointer;
}

/* 切换模式 */
.switch-mode {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 40rpx;
  font-size: 26rpx;
}

.mode-switch-wrap {
  display: flex;
  align-items: center;
}

.switch-text {
  color: #999999;
}

.switch-link {
  color: #2dcca7;
  margin-left: 16rpx;
}

/* 额外链接 */
.extra-links {
  display: flex;
  justify-content: center;
  padding: 0rpx 60rpx;
  font-size: 26rpx;
  color: #999999;
  /* position: absolute;
  bottom: 40rpx;
  left: 0;
  right: 0; */
}

.extra-link {
  color: #666;
}
</style>
