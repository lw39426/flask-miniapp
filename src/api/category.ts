import type { ApiResponse } from './home'
import { http } from '@/http/http'

// 分类相关类型定义
export interface Category {
  id: number
  name: string
  imageUrl: string
  children: Category[]
}

export interface Product {
  id: number
  name: string
  price: number
  stock: number
  sales: number
  main_image: string
  category_id?: number
  category_name?: string
}
// 分类商品响应
export interface CategoryProductsResponse {
  category_name: string
  data: Product[]
  total: number
  pages: number
  page: number
  per_page: number
}

export interface SearchProductsResponse {
  code: number
  message: string
  data?: {
    products: Product[]
    total: number
    pages: number
    page: number
    per_page: number
  }
}

export interface ProductDetail {
  id: number
  name: string
  description: string
  price: number
  stock: number
  sales: number
  main_image: string
  images: string[]
  detail_html: string
  category_id: number
  category_name: string
  brand: string
}

const BASE_URL = '/miniapp' // API基础路径

// API 接口函数
/**
 * 获取分类列表（树形结构）
 */
export const getCategoryList = async (): Promise<ApiResponse<Category[]>> => {
  return await http.get<ApiResponse<Category[]>>(`${BASE_URL}/category/list`)
}

/**
 * 获取分类下的商品
 */
export const getCategoryProducts = async (categoryId: number, page = 1, limit = 10): Promise<ApiResponse<CategoryProductsResponse>> => {
  return await http.get<ApiResponse<CategoryProductsResponse>>(`${BASE_URL}/category/${categoryId}/products`, {
    params: { page, limit }
  })
}

/**
 * 获取商品详情
 */
export const getProductDetail = async (productId: number): Promise<ApiResponse<ProductDetail>> => {
  return await http.get<ApiResponse<ProductDetail>>(`${BASE_URL}/product/${productId}`)
}

/**
 * 商品搜索
 */
export const searchProducts = async (params: {
  page?: number
  per_page?: number
  keyword?: string
  category_id?: number
  min_price?: number
  max_price?: number
  sort_by?: 'create_time' | 'price' | 'sales'
  sort_order?: 'asc' | 'desc'
}): Promise<SearchProductsResponse> => {
  return await http.get<SearchProductsResponse>(`${BASE_URL}/product/search`, { params })
}
