import type {
  ILoginForm,
} from '@/api/login'
import type { IAuthLoginRes } from '@/api/types/login'
import { defineStore } from 'pinia'
import { computed, ref } from 'vue' // 修复：导入 computed
import {
  login as _login,
  loginByPhone as _loginByPhone,
  logout as _logout,
  refreshToken as _refreshToken,
  register as _register,
  wxLogin as _wxLogin,
  getWxCode,
} from '@/api/login'
import { isDoubleTokenRes, isSingleTokenRes } from '@/api/types/login'
import { isDoubleTokenMode } from '@/utils'
import { useUserStore } from './user'

// 初始化状态
const tokenInfoState = isDoubleTokenMode
  ? {
      access_token: '',
      accessExpiresIn: 0,
      refresh_token: '',
      refreshExpiresIn: 0,
    }
  : {
      token: '',
      expiresIn: 0,
    }

export const useTokenStore = defineStore(
  'token',
  () => {
    // 定义用户信息
    const tokenInfo = ref<IAuthLoginRes>({ ...tokenInfoState })
    // 设置用户信息
    const setTokenInfo = (val: IAuthLoginRes) => {
      tokenInfo.value = val

      // 计算并存储过期时间
      const now = Date.now()
      if (isSingleTokenRes(val)) {
        // 单token模式
        const expireTime = now + val.expiresIn * 1000
        uni.setStorageSync('accessTokenExpireTime', expireTime)
      }
      else if (isDoubleTokenRes(val)) {
        // 双token模式
        const accessExpireTime = now + val.accessExpiresIn * 1000
        const refreshExpireTime = now + val.refreshExpiresIn * 1000
        uni.setStorageSync('accessTokenExpireTime', accessExpireTime)
        uni.setStorageSync('refreshTokenExpireTime', refreshExpireTime)
      }
    }

    /**
     * 判断token是否过期
     */
    const isTokenExpired = computed(() => {
      if (!tokenInfo.value) {
        return true
      }

      const now = Date.now()
      const expireTime = uni.getStorageSync('accessTokenExpireTime')

      if (!expireTime)
        return true
      return now >= expireTime
    })

    /**
     * 判断refreshToken是否过期
     */
    const isRefreshTokenExpired = computed(() => {
      if (!isDoubleTokenMode)
        return true

      const now = Date.now()
      const refreshExpireTime = uni.getStorageSync('refreshTokenExpireTime')

      if (!refreshExpireTime)
        return true
      return now >= refreshExpireTime
    })

    /**
     * 登录成功后处理逻辑
     * @param tokenInfo 登录返回的token信息
     */
    async function _toGetUserInfo(tokenInfo: IAuthLoginRes) {
      setTokenInfo(tokenInfo)
      // 调用userStore获取用户信息
      const userStore = useUserStore()
      await userStore.fetchUserInfo()
    }

    // 用户注册
    const register = async (registerForm: ILoginForm) => {
      try {
        // 获取token
        const res = await _register(registerForm)
        console.log('注册-res: ', res)
      }
      catch (error) {
        uni.showToast({
          title: error.message || '注册失败，请重试',
          icon: 'error',
          duration: 2500
        })
        throw error
      }
    }

    /**
     * 用户登录
     * 有的时候后端会用一个接口返回token和用户信息，有的时候会分开2个接口，一个获取token，一个获取用户信息
     * （各有利弊，看业务场景和系统复杂度），这里使用2个接口返回的来模拟
     * @param loginForm 登录参数
     * @returns 登录结果
     */
    const login = async (loginForm: ILoginForm) => {
      try {
        // 获取token
        const res = await _login(loginForm)
        console.log('普通登录-res: ', res)
        if (res) {
          // 获取用户信息
          await _toGetUserInfo(res)
          // 登录成功的提示由调用方处理，避免重复提示
        }

        return res
      }
      catch (error) {
        console.error('普通登录失败:', error)
        // 错误由调用方处理，避免重复提示
        throw error
      }
    }

    const loginByPhone = async (loginForm: ILoginForm) => {
      try {
        // 获取token
        const res = await _loginByPhone(loginForm)
        console.log('普通登录-res: ', res)
        if (res) {
          // 获取用户信息
          await _toGetUserInfo(res)
          // 登录成功的提示由调用方处理，避免重复提示
        }

        return res
      }
      catch (error) {
        console.error('普通登录失败:', error)
        // 错误由调用方处理，避免重复提示
        throw error
      }
    }

    /**
     * 微信登录
     * 有的时候后端会用一个接口返回token和用户信息，有的时候会分开2个接口，一个获取token，一个获取用户信息
     * （各有利弊，看业务场景和系统复杂度），这里使用2个接口返回的来模拟
     * @returns 登录结果
     */
    const wxLogin = async () => {
      try {
        // 获取微信小程序登录的code
        const code = await getWxCode()
        console.log('微信登录-code: ', code)
        const res = await _wxLogin(code)
        console.log('微信登录-res: ', res)
        await _toGetUserInfo(res)
        uni.showToast({
          title: '登录成功',
          icon: 'success',
        })
        return res
      }
      catch (error) {
        console.error('微信登录失败:', error)
        uni.showToast({
          title: '微信登录失败，请重试',
          icon: 'error',
        })
        throw error
      }
    }

    /**
     * 退出登录 并 删除用户信息
     */
    const logout = async () => {
      try {
        // 注意：http请求已经会自动添加Authorization头，不需要手动添加
        await _logout()
      }
      catch (error) {
        console.error('退出登录失败:', error)
      }
      finally {
        // 无论成功失败，都需要清除本地token信息
        // 清除存储的过期时间
        uni.removeStorageSync('accessTokenExpireTime')
        uni.removeStorageSync('refreshTokenExpireTime')
        console.log('退出登录-清除用户信息')
        tokenInfo.value = { ...tokenInfoState }
        uni.removeStorageSync('token')
        const userStore = useUserStore()
        userStore.clearUserInfo()
      }
    }

    /**
     * 刷新token
     * @returns 刷新结果
     */
    const refreshToken = async () => {
      if (!isDoubleTokenMode) {
        console.error('单token模式不支持刷新token')
        throw new Error('单token模式不支持刷新token')
      }

      try {
        // 安全检查，确保refreshToken存在
        if (!isDoubleTokenRes(tokenInfo.value) || !tokenInfo.value.refresh_token) {
          throw new Error('无效的refreshToken')
        }

        const refreshToken = tokenInfo.value.refresh_token
        // 注意：http请求已经会自动添加Authorization头，不需要手动添加
        const res = await _refreshToken(refreshToken)
        console.log('刷新token-res: ', res)
        setTokenInfo(res)
        return res
      }
      catch (error) {
        console.error('刷新token失败:', error)
        throw error
      }
    }

    /**
     * 获取有效的token
     * 注意：在computed中不直接调用异步函数，只做状态判断
     * 实际的刷新操作应由调用方处理
     */
    const getValidToken = computed(() => {
      // token已过期，返回空
      if (isTokenExpired.value) {
        return ''
      }

      if (!isDoubleTokenMode) {
        return isSingleTokenRes(tokenInfo.value) ? tokenInfo.value.token : ''
      }
      else {
        return isDoubleTokenRes(tokenInfo.value) ? tokenInfo.value.access_token : ''
      }
    })

    /**
     * 检查是否有登录信息（不考虑token是否过期）
     */
    const hasLoginInfo = computed(() => {
      if (!tokenInfo.value) {
        return false
      }
      if (isDoubleTokenMode) {
        // 变成布尔值 的语法糖
        console.log('是否为双Token响应', isDoubleTokenRes(tokenInfo.value), !!tokenInfo.value)
        return isDoubleTokenRes(tokenInfo.value) && !!tokenInfo.value.access_token
      }
      else {
        console.log('是否为单Token响应', isSingleTokenRes(tokenInfo.value), !!tokenInfo.value)
        return isSingleTokenRes(tokenInfo.value) && !!tokenInfo.value.token
      }
    })

    /**
     * 检查是否已登录且token有效
     */
    const hasValidLogin = computed(() => {
      console.log('hasValidLogin', hasLoginInfo.value, !isTokenExpired.value)
      return hasLoginInfo.value && !isTokenExpired.value
    })

    /**
     * 尝试获取有效的token，如果过期且可刷新，则刷新token
     * @returns 有效的token或空字符串
     */
    const tryGetValidToken = async (): Promise<string> => {
      if (!getValidToken.value && isDoubleTokenMode && !isRefreshTokenExpired.value) {
        try {
          await refreshToken()
          return getValidToken.value
        }
        catch (error) {
          console.error('尝试刷新token失败:', error)
          return ''
        }
      }
      return getValidToken.value
    }

    return {
      // 核心API方法
      login,
      loginByPhone,
      register,
      wxLogin,
      logout,

      // 认证状态判断（最常用的）
      hasLogin: hasValidLogin,

      // 内部系统使用的方法
      refreshToken,
      tryGetValidToken,
      validToken: getValidToken,

      // 调试或特殊场景可能需要直接访问的信息
      tokenInfo,
      setTokenInfo,
    }
  },
  {
    // 添加持久化配置，确保刷新页面后token信息不丢失
    persist: true,
  },
)
