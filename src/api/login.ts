import type { ApiResponse } from './home'
import type { IAuthLoginRes, ICaptcha, IDoubleTokenRes, IUpdateInfo, IUpdatePassword, IUserInfoRes } from './types/login'
import { http } from '@/http/http'

/**
 * 登录表单
 */
export interface ILoginForm {
  username?: string
  phone?: string
  password: string
  captcha?: string
  captcha_key?: string
}

/**
 * 获取验证码
 * @returns ICaptcha 验证码
 */
export function getCode(): Promise<ICaptcha> {
  return http.get<ICaptcha>('/miniapp/auth/getCode').then((res) => {
    if (res.code === 200) {
      return res
    }
    throw new Error(res.message || '获取验证码失败')
  })
}

/**
 * 用户登录
 * @param loginForm 登录表单
 */
export function login(loginForm: ILoginForm): Promise<IAuthLoginRes> {
  return http.post<ApiResponse<IAuthLoginRes>>('/miniapp/auth/login', loginForm).then((res) => {
    console.log('登录-res: ', res)
    if (res.code === 200) {
      return res.data
    }
    throw new Error(res.message || '登录失败')
  })
}

/**
 * 用户注册
 * @param registerForm 注册表单
 */
export function register(registerForm: ILoginForm) {
  return http.post<IAuthLoginRes>('/miniapp/auth/register', registerForm)
}
/**
 * 刷新token
 * @param refreshToken 刷新token
 */
export function refreshToken(refreshToken: string) {
  return http.post<IDoubleTokenRes>('/auth/refreshToken', { refreshToken })
}

/**
 * 获取用户信息
 */
export function getUserInfo() {
  return http.get<IUserInfoRes>('/miniapp/user/info')
}

/**
 * 退出登录
 */
export function logout() {
  return http.get<void>('/miniapp/auth/logout')
}

/**
 * 修改用户信息
 */
export function updateInfo(data: IUpdateInfo) {
  return http.post('/miniapp/user/updateInfo', data)
}

/**
 * 修改用户密码
 */
export function updateUserPassword(data: IUpdatePassword) {
  return http.post('/user/updatePassword', data)
}

/**
 * 微信登录
 * @param params 微信登录参数，包含code
 * @returns Promise 包含登录结果
 */
export function wxLogin(data: { code: string }) {
  return http.post<IAuthLoginRes>('/auth/wxLogin', data)
}

/**
 * 获取微信登录凭证
 * @returns Promise 包含微信登录凭证(code)
 */
export function getWxCode() {
  return new Promise<UniApp.LoginRes>((resolve, reject) => {
    uni.login({
      provider: 'weixin',
      success: res => resolve(res),
      fail: err => reject(new Error(err)),
    })
  })
}

/**
 * 发送重置密码验证码
 * @param data 包含手机号的数据
 */
export function sendResetPasswordCode(data: { phone: string }) {
  return http.post<ApiResponse<void>>('/miniapp/auth/sendResetCode', data).then((res) => {
    if (res.code === 200) {
      return res
    }
    throw new Error(res.message || '发送验证码失败')
  })
}

/**
 * 验证重置密码验证码
 * @param data 包含手机号和验证码的数据
 */
export function verifyResetCode(data: { phone: string, code: string }) {
  return http.post<ApiResponse<{ resetToken: string }>>('/miniapp/auth/verifyResetCode', data).then((res) => {
    if (res.code === 200) {
      return res
    }
    throw new Error(res.message || '验证码无效')
  })
}

/**
 * 重置密码
 * @param data 包含重置令牌和新密码的数据
 */
export function resetPasswordApi(data: { resetToken: string, newPassword: string }) {
  return http.post<ApiResponse<void>>('/miniapp/auth/resetPassword', data).then((res) => {
    if (res.code === 200) {
      return res
    }
    throw new Error(res.message || '重置密码失败')
  })
}
