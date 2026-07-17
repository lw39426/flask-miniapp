/**
 * 地址管理模块 API
 * 前缀: /api/v1/user/addresses
 * 需要鉴权
 * 基于 md/用户端接口对接文档.md
 */

import type { Address, ApiResponse } from './types/index'
import { http } from '@/http/http'

// 地址参数（新增/编辑共用）
export interface AddressParams {
  recipient_name: string
  phone: string
  address_line: string
  is_default?: boolean
}

/**
 * 获取地址列表
 * GET /api/v1/user/addresses
 */
export function getAddressList(): Promise<ApiResponse<Address[]>> {
  return http.get<ApiResponse<Address[]>>('/user/addresses')
}

/**
 * 新增地址
 * POST /api/v1/user/addresses
 */
export function addAddress(data: AddressParams): Promise<ApiResponse<Address>> {
  return http.post<ApiResponse<Address>>('/user/addresses', data)
}

/**
 * 编辑地址
 * PUT /api/v1/user/addresses/<address_id>
 */
export function updateAddress(addressId: number, data: Partial<AddressParams>): Promise<ApiResponse<Address>> {
  return http.put<ApiResponse<Address>>(`/user/addresses/${addressId}`, data)
}

/**
 * 删除地址
 * DELETE /api/v1/user/addresses/<address_id>
 */
export function deleteAddress(addressId: number): Promise<ApiResponse<any>> {
  return http.delete<ApiResponse<any>>(`/user/addresses/${addressId}`)
}

/**
 * 设置默认地址
 * PUT /api/v1/user/addresses/<address_id>/setDefault
 */
export function setDefaultAddress(addressId: number): Promise<ApiResponse<any>> {
  return http.put<ApiResponse<any>>(`/user/addresses/${addressId}/setDefault`)
}

/**
 * 获取默认地址
 * GET /api/v1/user/addresses/default
 */
export function getDefaultAddress(): Promise<ApiResponse<Address | null>> {
  return http.get<ApiResponse<Address | null>>('/user/addresses/default')
}
