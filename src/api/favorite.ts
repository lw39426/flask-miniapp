import type { ApiResponse } from './home'
import { http } from '@/http/http'

/**
 * 收藏类型枚举
 */
export enum FavoriteType {
  ARTICLE = 'article',
  PRODUCT = 'product'
}

/**
 * 收藏项接口
 */
export interface FavoriteItem {
  id: number
  user_id: number
  item_type: FavoriteType
  item_id: number
  created_at: string
  item_title: string
  item_image: string
  item_description: string
  item_detail?: {
    // 文章详情（当item_type为article时）
    id: number
    title?: string
    image?: string
    author?: {
      nickname: string
    }
    published_date?: string
    views?: number
    // 商品详情（当item_type为product时）
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

/**
 * 收藏列表响应
 */
export interface FavoriteListResponse {
  favorites: FavoriteItem[]
  pagination: {
    page: number
    per_page: number
    total: number
    pages: number
    has_next: boolean
    has_prev: boolean
  }
}

/**
 * 收藏统计响应
 */
export interface FavoriteStatsResponse {
  total: number
  article: number
  product: number
}

/**
 * 切换收藏状态（添加/取消收藏）
 */
export function toggleFavorite(data: { item_type: FavoriteType, item_id: number }) {
  return http.post<ApiResponse<{ is_favorited: boolean, item_type: FavoriteType, item_id: number }>>('/miniapp/api/favorite/toggle', data).then((res) => {
    if (res.code === 200) {
      return res
    }
    throw new Error(res.message || '操作失败')
  })
}

/**
 * 检查是否已收藏
 */
export function checkFavorite(data: { item_type: FavoriteType, item_id: number }) {
  return http.post<ApiResponse<{ is_favorited: boolean, item_type: FavoriteType, item_id: number }>>('/miniapp/api/favorite/check', data).then((res) => {
    if (res.code === 200) {
      return res
    }
    throw new Error(res.message || '检查收藏状态失败')
  })
}

/**
 * 获取收藏列表
 */
export function getFavoriteList(params: {
  type?: FavoriteType
  page?: number
  per_page?: number
}) {
  const queryParams = new URLSearchParams()
  if (params.type)
    queryParams.append('type', params.type)
  if (params.page)
    queryParams.append('page', params.page.toString())
  if (params.per_page)
    queryParams.append('per_page', params.per_page.toString())

  const url = `/miniapp/api/favorite/list${queryParams.toString() ? `?${queryParams.toString()}` : ''}`

  return http.get<ApiResponse<FavoriteListResponse>>(url).then((res) => {
    if (res.code === 200) {
      return res
    }
    throw new Error(res.message || '获取收藏列表失败')
  })
}

/**
 * 获取收藏统计
 */
export function getFavoriteStats() {
  return http.get<ApiResponse<FavoriteStatsResponse>>('/miniapp/api/favorite/count').then((res) => {
    if (res.code === 200) {
      return res
    }
    throw new Error(res.message || '获取收藏统计失败')
  })
}

/**
 * 批量取消收藏
 */
export function batchRemoveFavorite(favoriteIds: number[]) {
  return http.post<ApiResponse<{ removed_count: number }>>('/miniapp/api/favorite/remove', {
    favorite_ids: favoriteIds
  }).then((res) => {
    if (res.code === 200) {
      return res
    }
    throw new Error(res.message || '批量取消收藏失败')
  })
}

/**
 * 清空收藏
 */
export function clearFavorites(itemType?: FavoriteType) {
  const data = itemType ? { item_type: itemType } : {}
  return http.post<ApiResponse<{ removed_count: number, item_type?: FavoriteType }>>('/miniapp/api/favorite/clear', data).then((res) => {
    if (res.code === 200) {
      return res
    }
    throw new Error(res.message || '清空收藏失败')
  })
}
