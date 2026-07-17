/**
 * 商品模块 API
 * 前缀: /api/v1/product
 * 无鉴权要求
 * 基于 md/用户端接口对接文档.md
 */

import type { ApiResponse, Category, PaginationParams, Product } from './types/index'
import { http } from '@/http/http'

// 向后兼容：重新导出类型
export type { Category, Product }

// 向后兼容：ProductDetail 即为 Product
export type ProductDetail = Product

// 商品搜索参数
export interface ProductSearchParams extends PaginationParams {
  keyword?: string
  category_id?: number
  min_price?: number
  max_price?: number
  sort_by?: 'create_time' | 'price' | 'sales'
  sort_order?: 'asc' | 'desc'
}

// 分类商品参数
export interface CategoryProductsParams extends PaginationParams {
  sort_by?: 'create_time' | 'sales' | 'price'
  sort_order?: 'asc' | 'desc'
}

// 分类商品响应
export interface CategoryProductsResponse {
  category_name: string
  products: Product[]
  pagination: {
    page: number
    pageSize: number
    total: number
    pages: number
  }
}

/**
 * 获取商品详情
 * GET /api/v1/product/<product_code>
 */
export function getProductDetail(productCode: string): Promise<ApiResponse<Product>> {
  return http.get<ApiResponse<Product>>(`/product/${productCode}`)
}

/**
 * 商品搜索
 * GET /api/v1/product/search
 */
export function searchProducts(params: ProductSearchParams): Promise<ApiResponse<{
  products: Product[]
  pagination: {
    page: number
    pageSize: number
    total: number
    pages: number
  }
}>> {
  return http.get<ApiResponse<{
    products: Product[]
    pagination: {
      page: number
      pageSize: number
      total: number
      pages: number
    }
  }>>('/product/search', params)
}

/**
 * 获取商品分类树
 * GET /api/v1/product/category/list
 */
export function getCategoryTree(): Promise<ApiResponse<Category[]>> {
  return http.get<ApiResponse<Category[]>>('/product/category/list')
}

/**
 * 向后兼容别名
 * @deprecated 使用 getCategoryTree
 */
export const getCategoryList = getCategoryTree

/**
 * 获取分类下的商品
 * GET /api/v1/product/category/<category_id>/products
 */
export function getCategoryProducts(
  categoryId: number,
  params: CategoryProductsParams = {}
): Promise<ApiResponse<CategoryProductsResponse>> {
  return http.get<ApiResponse<CategoryProductsResponse>>(`/product/category/${categoryId}/products`, params)
}
