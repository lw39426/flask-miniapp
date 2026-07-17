/**
 * 用户信息模块 API（补充）
 * 前缀: /api/v1/user
 * 需要鉴权
 * 基于 md/用户端接口对接文档.md
 */

import type { ApiResponse, UserInfo } from './types/index'
import { http } from '@/http/http'

// 更新用户信息参数
export interface UpdateUserInfoParams {
  nickname?: string
  gender?: number
  birthday?: string
  description?: string
}

// 修改密码参数
export interface UpdatePasswordParams {
  old_password: string
  new_password: string
}

// 绑定手机号参数
export interface BindPhoneParams {
  phone: string
  code: string
}

/**
 * 获取用户信息
 * GET /api/v1/user/info
 */
export function getUserInfo(): Promise<ApiResponse<UserInfo>> {
  return http.get<ApiResponse<UserInfo>>('/user/info')
}

/**
 * 更新用户信息
 * POST 或 PUT /api/v1/user/updateInfo
 */
export function updateUserInfo(data: UpdateUserInfoParams): Promise<ApiResponse<UserInfo>> {
  return http.post<ApiResponse<UserInfo>>('/user/updateInfo', data)
}

/**
 * 修改密码
 * POST /api/v1/user/updatePassword
 */
export function updatePassword(data: UpdatePasswordParams): Promise<ApiResponse<any>> {
  return http.post<ApiResponse<any>>('/user/updatePassword', data)
}

/**
 * 获取个人资料（更完整的资料信息）
 * GET /api/v1/user/profile
 */
export function getUserProfile(): Promise<ApiResponse<UserInfo>> {
  return http.get<ApiResponse<UserInfo>>('/user/profile')
}

/**
 * 绑定手机号
 * POST /api/v1/user/bindPhone
 */
export function bindPhone(data: BindPhoneParams): Promise<ApiResponse<any>> {
  return http.post<ApiResponse<any>>('/user/bindPhone', data)
}

/**
 * 更新背景封面
 * POST /api/v1/user/bgCover
 */
export function updateBgCover(data: { bg_cover: string }): Promise<ApiResponse<any>> {
  return http.post<ApiResponse<any>>('/user/bgCover', data)
}
