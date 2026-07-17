/**
 * 收藏模块 API
 * 前缀: /api/v1
 * 需要鉴权
 * 基于 md/用户端接口对接文档.md
 */

import type { ApiResponse, PaginationParams } from './types/index'
import { http } from '@/http/http'

// 收藏类型
export type FavoriteItemType = 'product' | 'article'

// 收藏类型常量（向后兼容）
export const FavoriteType: Record<'ARTICLE' | 'PRODUCT', FavoriteItemType> = {
  ARTICLE: 'article',
  PRODUCT: 'product',
}

// 收藏项
export interface FavoriteItem {
  id: number
  item_type: FavoriteItemType
  item_id: number
  item_title: string
  item_image: string
  item_description: string
  created_at: string
  item_detail?: {
    id: number
    title?: string
    image?: string
    author?: { nickname: string }
    published_date?: string
    views?: number
    name?: string
    price?: number
    sale_price?: number
    stock?: number
    main_image?: string
    status?: number
    sales?: number
    brand?: string
    category_name?: string
  }
}

// 收藏列表响应
export interface FavoriteListResponse {
  favorites: FavoriteItem[]
  pagination: {
    page: number
    pageSize: number
    total: number
    pages: number
    has_prev?: boolean
    has_next?: boolean
  }
}

// 收藏操作参数
export interface FavoriteActionParams {
  item_type: FavoriteItemType
  item_id: number
}

// 收藏列表查询参数
export interface FavoriteListParams extends PaginationParams {
  item_type?: FavoriteItemType
}

// 收藏数量响应
export interface FavoriteCountResponse {
  total: number
  product?: number
  article?: number
}

/**
 * 收藏 / 取消收藏（切换）
 * POST /api/v1/favorite/toggle
 */
export function toggleFavorite(data: FavoriteActionParams): Promise<ApiResponse<{ is_favorited: boolean }>> {
  return http.post<ApiResponse<{ is_favorited: boolean }>>('/favorite/toggle', data)
}

/**
 * 检查是否已收藏
 * POST /api/v1/favorite/check
 */
export function checkFavorite(data: FavoriteActionParams): Promise<ApiResponse<{ is_favorited: boolean }>> {
  return http.post<ApiResponse<{ is_favorited: boolean }>>('/favorite/check', data)
}

/**
 * 获取收藏列表
 * GET /api/v1/favorite/list
 * 支持旧版参数：type -> item_type, per_page -> pageSize
 */
export function getFavoriteList(params: FavoriteListParams & { type?: FavoriteItemType, per_page?: number } = {}): Promise<ApiResponse<FavoriteListResponse>> {
  const { type, per_page, ...rest } = params
  return http.get<ApiResponse<FavoriteListResponse>>('/favorite/list', {
    ...rest,
    ...(type ? { item_type: type } : {}),
    ...(per_page ? { pageSize: per_page } : {}),
  })
}

/**
 * 获取收藏数量
 * GET /api/v1/favorite/count
 */
export function getFavoriteCount(item_type?: FavoriteItemType): Promise<ApiResponse<FavoriteCountResponse>> {
  return http.get<ApiResponse<FavoriteCountResponse>>('/favorite/count', item_type ? { item_type } : {})
}

/**
 * 移除收藏
 * POST /api/v1/favorite/remove
 */
export function removeFavorite(data: FavoriteActionParams): Promise<ApiResponse<any>> {
  return http.post<ApiResponse<any>>('/favorite/remove', data)
}

/**
 * 清空收藏
 * POST /api/v1/favorite/clear
 */
export function clearFavorites(item_type?: FavoriteItemType): Promise<ApiResponse<any>> {
  return http.post<ApiResponse<any>>('/favorite/clear', item_type ? { item_type } : {})
}

/**
 * 向后兼容别名
 * @deprecated 使用 getFavoriteCount
 */
export const getFavoriteStats = getFavoriteCount

/**
 * 批量取消收藏
 * POST /api/v1/favorite/remove (批量)
 */
export function batchRemoveFavorite(favoriteIds: number[]): Promise<ApiResponse<{ removed_count: number }>> {
  return http.post<ApiResponse<{ removed_count: number }>>('/favorite/remove', {
    favorite_ids: favoriteIds,
  })
}
