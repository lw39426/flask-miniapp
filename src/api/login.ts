/**
 * 认证模块 API
 * 前缀: /api/v1/auth
 * 无鉴权要求（logout 除外）
 * 基于 md/用户端接口对接文档.md
 *
 * 注意：登录相关接口返回数据时会自动解包（res.data），
 * 与 store/token.ts 中的使用方式保持一致。
 */

import type { ApiResponse } from './types/index'
import type { ICaptcha, IUserInfoRes } from './types/login'
import { http } from '@/http/http'

// 登录表单（向后兼容）
export interface ILoginForm {
  username?: string
  phone?: string
  password: string
  captcha?: string
  captcha_key?: string
}

// 登录返回类型
export interface AuthLoginRes {
  access_token: string
  refresh_token: string
  user: IUserInfoRes
}

// 微信登录参数
export interface WxLoginParams {
  code: string
  nickname?: string
  avatar?: string
}

// 手机号登录参数
export interface PhoneLoginParams {
  phone: string
  code: string
}

// 用户名登录参数
export interface UsernameLoginParams {
  username: string
  password: string
}

// 注册参数
export interface RegisterParams {
  username: string
  password: string
  phone: string
  code: string
}

/**
 * 微信登录
 * POST /api/v1/auth/wxLogin
 */
export function wxLogin(data: WxLoginParams): Promise<AuthLoginRes> {
  return http.post<ApiResponse<AuthLoginRes>>('/auth/wxLogin', data).then(res => res.data)
}

/**
 * 手机号登录
 * POST /api/v1/auth/loginByPhone
 */
export function loginByPhone(data: PhoneLoginParams | ILoginForm): Promise<AuthLoginRes> {
  return http.post<ApiResponse<AuthLoginRes>>('/auth/loginByPhone', data as any).then(res => res.data)
}

/**
 * 用户名登录
 * POST /api/v1/auth/loginByUsername
 */
export function loginByUsername(data: UsernameLoginParams): Promise<AuthLoginRes> {
  return http.post<ApiResponse<AuthLoginRes>>('/auth/loginByUsername', data).then(res => res.data)
}

/**
 * 通用登录（自动识别登录方式）
 * POST /api/v1/auth/login
 */
export function login(data: WxLoginParams | PhoneLoginParams | UsernameLoginParams | ILoginForm): Promise<AuthLoginRes> {
  return http.post<ApiResponse<AuthLoginRes>>('/auth/login', data as any).then(res => res.data)
}

/**
 * 注册
 * POST /api/v1/auth/register
 */
export function register(data: RegisterParams | ILoginForm): Promise<AuthLoginRes> {
  return http.post<ApiResponse<AuthLoginRes>>('/auth/register', data as any).then(res => res.data)
}

/**
 * 刷新 Token
 * POST /api/v1/auth/refreshToken
 */
export function refreshToken(data: { refresh_token: string }): Promise<{ access_token: string }> {
  return http.post<ApiResponse<{ access_token: string }>>('/auth/refreshToken', data).then(res => res.data)
}

/**
 * 登出
 * GET /api/v1/auth/logout
 * 需要鉴权
 */
export function logout(): Promise<void> {
  return http.get<ApiResponse<void>>('/auth/logout').then(res => res.data)
}

/**
 * 获取验证码
 * GET /api/v1/auth/getCode?phone=xxx
 */
export function getCode(phone?: string): Promise<ICaptcha> {
  return http.get<ApiResponse<ICaptcha>>('/auth/getCode', phone ? { phone } : {}).then(res => res.data)
}

// ---- 以下为扩展功能（文档外），供特殊页面使用 ----

/**
 * 支付宝登录（向后兼容）
 */
export function alipayLogin(data: { code: string }): Promise<AuthLoginRes> {
  return http.post<ApiResponse<AuthLoginRes>>('/auth/alipayLogin', data).then(res => res.data)
}

/**
 * 发送重置密码验证码
 * POST /auth/sendResetCode
 */
export function sendResetPasswordCode(data: { phone: string }): Promise<void> {
  return http.post<ApiResponse<void>>('/auth/sendResetCode', data).then(res => res.data)
}

/**
 * 验证重置密码验证码
 * POST /auth/verifyResetCode
 */
export function verifyResetCode(data: { phone: string, code: string }): Promise<{ resetToken: string }> {
  return http.post<ApiResponse<{ resetToken: string }>>('/auth/verifyResetCode', data).then(res => res.data)
}

/**
 * 重置密码
 * POST /auth/resetPassword
 */
export function resetPasswordApi(data: { resetToken: string, newPassword: string }): Promise<void> {
  return http.post<ApiResponse<void>>('/auth/resetPassword', data).then(res => res.data)
}

/**
 * 获取用户信息（向后兼容）
 */
export function getUserInfo(): Promise<IUserInfoRes> {
  return http.get<ApiResponse<IUserInfoRes>>('/user/info').then(res => res.data)
}

/**
 * 更新用户信息（向后兼容）
 */
export function updateInfo(data: { nickname?: string, gender?: number, birthday?: string, description?: string }): Promise<any> {
  return http.post<ApiResponse<any>>('/user/updateInfo', data).then(res => res.data)
}

/**
 * 修改用户密码（向后兼容）
 */
export function updateUserPassword(data: { old_password: string, new_password: string }): Promise<any> {
  return http.post<ApiResponse<any>>('/user/updatePassword', data).then(res => res.data)
}
