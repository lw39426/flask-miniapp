import { http } from '@/http/http'

// #region 后端接口返回的类型定义

/** API通用分页参数 */
export interface PaginationParams {
  page?: number
  limit?: number
}

/** API通用返回结构 */
export interface ApiResponse<T> {
  code: number
  message: string
  data: T
}

/** 分页数据结构 */
export interface PaginatedData<T> {
  items: T[]
  pagination: {
    page: number
    limit: number
    total: number
    pages: number
  }
}

/** 标签类型 */
export interface Tag {
  id: number
  name: string
  color?: string
  description?: string
}

/** Banner轮播图 */
export interface Banner {
  id: number
  title: string
  image: string
  link_type: 'product' | 'page' | 'webview'
  link_value: number | string
  description?: string | null
}

/** 商品分类 */
export interface Category {
  id: number
  name: string
  image: string
  product_count?: number
  children?: Category[]
}

/** 商品信息 */
export interface Product {
  id: number
  name: string
  price: number
  sale_price?: number
  image: string
  sales?: number
  stock?: number
  brand?: string
  category_name?: string
  is_new?: boolean
  desc?: string
  originalPrice?: string | number
  tags?: Tag[]
}

/** 文章信息 */
export interface Article {
  id: number
  title: string
  content?: string
  image: string
  author?: string | {
    id: number
    nickname?: string
    avatar?: string
    description?: string
  }
  category_name?: string
  published_date?: string
  views?: number
  description?: string
  tags?: Tag[]
}

/** 首页聚合数据类型 */
export interface HomeData {
  banners: Banner[]
  categories: Category[]
  featured: {
    tag_name: string
    products: Product[]
  }
  hot_products: Product[]
  articles: Article[]
  new_products: Product[]
}

// #endregion

const BASE_URL = '/miniapp' // API基础路径

/**
 * @description 获取小程序首页所有数据
 * @summary 一次性返回首页所需的所有数据，减少请求次数
 */
export function getHomeData(): Promise<ApiResponse<HomeData>> {
  return http.get<ApiResponse<HomeData>>(`${BASE_URL}/home/data`)
}

/**
 * @description 获取轮播图数据
 */
export function getBanners(): Promise<Banner[]> {
  return http.get<Banner[]>(`${BASE_URL}/banners`)
}

/**
 * @description 获取商品分类数据
 */
export function getCategories(): Promise<Category[]> {
  return http.get<Category[]>(`${BASE_URL}/categories`)
}

/**
 * @description 获取指定分类下的商品
 * @param {number} categoryId - 分类ID
 * @param {PaginationParams} params - 分页参数
 */
export function getCategoryProducts(categoryId: number, params: PaginationParams): Promise<PaginatedData<Product>> {
  return http.get<PaginatedData<Product>>(`${BASE_URL}/category/${categoryId}/products`, { params })
}

/**
 * @description 获取热门商品
 * @param {PaginationParams} params - 分页参数
 */
export function getHotProducts(params: PaginationParams): Promise<PaginatedData<Product>> {
  return http.get<PaginatedData<Product>>(`${BASE_URL}/hot-products`, { params })
}

/**
 * @description 获取推荐文章
 * @param {PaginationParams & { category_id?: number }} params
 */
export function getArticles(params: PaginationParams & { category_id?: number }): Promise<PaginatedData<Article>> {
  return http.get<PaginatedData<Article>>(`${BASE_URL}/articles`, { params })
}
