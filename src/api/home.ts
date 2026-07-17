/**
 * 首页模块 API
 * 前缀: /api/v1
 * 无鉴权要求
 * 基于 md/用户端接口对接文档.md
 */

import type { Announcement, ApiResponse, Article, Banner, Category, PaginationParams, Product, Tag } from './types/index'
import { http } from '@/http/http'

// 向后兼容：重新导出类型
export type { Article, Banner, Category, Product }

// 首页聚合数据类型
export interface HomeData {
  banners: Banner[]
  categories: Category[]
  featured: {
    tag_name: string
    tag_color?: string
    products: Product[]
  }
  hot_products: Product[]
  articles: Article[]
  new_products: Product[]
}

// 首页数据响应（含缓存信息）
export interface HomeDataResponse extends ApiResponse<HomeData> {
  source?: string
  cache_key?: string
}

// Banner 查询参数
export interface BannerParams {
  placement_key: string
  client_type?: 'all' | 'web' | 'miniapp' | 'app'
}

// Banner 响应
export interface BannerResponse {
  banners: Banner[]
  source: string
  cache_key: string
  cached: boolean
}

// 精选商品响应
export interface FeaturedProductsResponse {
  tag_name: string
  tag_color: string
  products: Product[]
  pagination: {
    page: number
    pageSize: number
    total: number
    pages: number
  }
}

// 商品列表响应（带分页）
export interface ProductListResponse {
  products: Product[]
  pagination: {
    page: number
    pageSize: number
    total: number
    pages: number
  }
}

// 文章列表响应（带分页）
export interface ArticleListResponse {
  articles: Article[]
  pagination: {
    page: number
    pageSize: number
    total: number
    pages: number
  }
}

// 公告查询参数
export interface AnnouncementParams {
  position?: 'homepage' | 'user_center' | 'product_page'
  terminal?: string
  announcement_type?: string
  force_only?: boolean
}

// 标签查询参数
export interface TagParams {
  type?: 1 | 2 | 3
}

/**
 * 获取首页聚合数据
 * GET /api/v1/home/data
 */
export function getHomeData(): Promise<HomeDataResponse> {
  return http.get<HomeDataResponse>('/home/data')
}

/**
 * 获取 Banner 轮播图
 * GET /api/v1/banners
 */
export function getBanners(params: BannerParams): Promise<ApiResponse<BannerResponse>> {
  return http.get<ApiResponse<BannerResponse>>('/banners', params)
}

/**
 * 获取公告列表
 * GET /api/v1/announcements
 */
export function getAnnouncements(params?: AnnouncementParams): Promise<ApiResponse<Announcement[]>> {
  return http.get<ApiResponse<Announcement[]>>('/announcements', params || {})
}

/**
 * 获取首页商品分类（含 product_count）
 * GET /api/v1/home/categories
 */
export function getHomeCategories(): Promise<ApiResponse<Category[]>> {
  return http.get<ApiResponse<Category[]>>('/home/categories')
}

/**
 * 获取精选商品
 * GET /api/v1/home/featured-products
 */
export function getFeaturedProducts(params: PaginationParams = {}): Promise<ApiResponse<FeaturedProductsResponse>> {
  return http.get<ApiResponse<FeaturedProductsResponse>>('/home/featured-products', params)
}

/**
 * 获取热门商品（按销量降序）
 * GET /api/v1/home/hot-products
 */
export function getHotProducts(params: PaginationParams = {}): Promise<ApiResponse<ProductListResponse>> {
  return http.get<ApiResponse<ProductListResponse>>('/home/hot-products', params)
}

/**
 * 获取推荐文章
 * GET /api/v1/home/articles
 */
export function getHomeArticles(params: PaginationParams & { category_id?: number } = {}): Promise<ApiResponse<ArticleListResponse>> {
  return http.get<ApiResponse<ArticleListResponse>>('/home/articles', params)
}

/**
 * 获取新品推荐
 * GET /api/v1/new-products
 */
export function getNewProducts(params: PaginationParams = {}): Promise<ApiResponse<ProductListResponse>> {
  return http.get<ApiResponse<ProductListResponse>>('/new-products', params)
}

/**
 * 获取标签列表
 * GET /api/v1/tags
 */
export function getTags(params: TagParams = { type: 1 }): Promise<ApiResponse<Tag[]>> {
  return http.get<ApiResponse<Tag[]>>('/tags', params)
}

// ---- 向后兼容 ----

/**
 * 获取指定分类下的商品（旧版，现转发到 category 模块）
 * @deprecated 使用 @/api/category 中的 getCategoryProducts
 */
export function getCategoryProducts(categoryId: number, params: PaginationParams = {}): Promise<ApiResponse<any>> {
  return http.get<ApiResponse<any>>(`/product/category/${categoryId}/products`, params)
}
