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
  return http.get<ApiResponse<ICaptcha>>('/miniapp/auth/getCode').then(res => res.data)
}

/**
 * 用户登录-账密登录
 * @param loginForm 登录表单
 */
export function login(loginForm: ILoginForm): Promise<IAuthLoginRes> {
  return http.post<ApiResponse<IAuthLoginRes>>('/miniapp/auth/loginByUsername', loginForm).then(res => res.data)
}

/**
 * 用户登录-手机号登录
 * @param loginForm 登录表单
 */
export function loginByPhone(loginForm: ILoginForm): Promise<IAuthLoginRes> {
  return http.post<ApiResponse<IAuthLoginRes>>('/miniapp/auth/loginByPhone', loginForm).then(res => res.data)
}

/**
 * 用户注册
 * @param registerForm 注册表单
 */
export function register(registerForm: ILoginForm): Promise<IAuthLoginRes> {
  return http.post<ApiResponse<IAuthLoginRes>>('/miniapp/auth/register', registerForm).then(res => res.data)
}
/**
 * 刷新token
 * @param refreshToken 刷新token
 */
export function refreshToken(refreshToken: string): Promise<IDoubleTokenRes> {
  return http.post<ApiResponse<IDoubleTokenRes>>('/auth/refreshToken', { refreshToken }).then(res => res.data)
}

/**
 * 获取用户信息
 */
export function getUserInfo(): Promise<IUserInfoRes> {
  return http.get<ApiResponse<IUserInfoRes>>('/miniapp/user/info').then(res => res.data)
}

/**
 * 退出登录
 */
export function logout(): Promise<void> {
  return http.get<ApiResponse<void>>('/miniapp/auth/logout').then(res => res.data)
}

/**
 * 修改用户信息
 */
export function updateInfo(data: IUpdateInfo): Promise<any> {
  return http.post<ApiResponse<any>>('/miniapp/user/updateInfo', data).then(res => res.data)
}

/**
 * 修改用户密码
 */
export function updateUserPassword(data: IUpdatePassword): Promise<any> {
  return http.post<ApiResponse<any>>('/user/updatePassword', data).then(res => res.data)
}

/**
 * 微信登录
 * @param data 微信登录参数，包含code
 * @param data.code  微信授权码
 * @returns Promise 包含登录结果
 */
export function wxLogin(data: { code: string }): Promise<IAuthLoginRes> {
  return http.post<ApiResponse<IAuthLoginRes>>('/miniapp/auth/wxLogin', data).then(res => res.data)
}

/**
 * 支付宝登录
 * @param data 支付宝登录参数，包含code
 * @param data.code  支付宝授权码
 * @returns Promise 包含登录结果
 */
export function alipayLogin(data: { code: string }): Promise<IAuthLoginRes> {
  return http.post<ApiResponse<IAuthLoginRes>>('/auth/alipayLogin', data).then(res => res.data)
}

/**
 * 发送重置密码验证码
 * @param data 包含手机号的数据
 */
export function sendResetPasswordCode(data: { phone: string }): Promise<void> {
  return http.post<ApiResponse<void>>('/miniapp/auth/sendResetCode', data).then(res => res.data)
}

/**
 * 验证重置密码验证码
 * @param data 包含手机号和验证码的数据
 */
export function verifyResetCode(data: { phone: string, code: string }): Promise<{ resetToken: string }> {
  return http.post<ApiResponse<{ resetToken: string }>>('/miniapp/auth/verifyResetCode', data).then(res => res.data)
}

/**
 * 重置密码
 * @param data 包含重置令牌和新密码的数据
 */
export function resetPasswordApi(data: { resetToken: string, newPassword: string }): Promise<void> {
  return http.post<ApiResponse<void>>('/miniapp/auth/resetPassword', data).then(res => res.data)
}
