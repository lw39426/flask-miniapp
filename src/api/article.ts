/**
 * 文章模块 API
 * 前缀: /api/v1/article
 * 无鉴权要求
 * 基于 md/用户端接口对接文档.md
 */

import type { ApiResponse, Article, ArticleCategory, PaginationParams, Tag } from './types/index'
import { http } from '@/http/http'

// 文章详情扩展类型
export interface ArticleDetail extends Article {
  comments?: number
}

// 文章列表参数
export interface ArticleListParams extends PaginationParams {
  category_id?: number
  keyword?: string
}

// 文章列表响应
export interface ArticleListResponse {
  articles: Article[]
  pagination: {
    page: number
    pageSize: number
    total: number
    pages: number
  }
}

/**
 * 获取文章列表
 * GET /api/v1/article/list
 */
export function getArticleList(params: ArticleListParams = {}): Promise<ApiResponse<ArticleListResponse>> {
  return http.get<ApiResponse<ArticleListResponse>>('/article/list', params)
}

/**
 * 获取文章详情
 * GET /api/v1/article/<article_code>
 */
export function getArticleDetail(articleCode: string): Promise<ApiResponse<ArticleDetail>> {
  return http.get<ApiResponse<ArticleDetail>>(`/article/${articleCode}`)
}

/**
 * 获取相关文章
 * GET /api/v1/article/<article_code>/related
 */
export function getRelatedArticles(articleCode: string, pageSize: number = 5): Promise<ApiResponse<Article[]>> {
  return http.get<ApiResponse<Article[]>>(`/article/${articleCode}/related`, { pageSize })
}

/**
 * 获取文章分类
 * GET /api/v1/article/categories
 */
export function getArticleCategories(): Promise<ApiResponse<ArticleCategory[]>> {
  return http.get<ApiResponse<ArticleCategory[]>>('/article/categories')
}

/**
 * 获取文章标签
 * GET /api/v1/article/tags
 */
export function getArticleTags(type?: number): Promise<ApiResponse<Tag[]>> {
  return http.get<ApiResponse<Tag[]>>('/article/tags', type ? { type } : {})
}

/**
 * 获取热门文章（按阅读量排序）
 * GET /api/v1/article/hot
 */
export function getHotArticles(pageSize: number = 10): Promise<ApiResponse<Article[]>> {
  return http.get<ApiResponse<Article[]>>('/article/hot', { pageSize })
}

/**
 * 获取最新文章（按发布时间排序）
 * GET /api/v1/article/latest
 */
export function getLatestArticles(pageSize: number = 10): Promise<ApiResponse<Article[]>> {
  return http.get<ApiResponse<Article[]>>('/article/latest', { pageSize })
}

/**
 * 文章搜索
 * GET /api/v1/article/search
 */
export function searchArticles(params: { keyword: string } & PaginationParams): Promise<ApiResponse<ArticleListResponse>> {
  return http.get<ApiResponse<ArticleListResponse>>('/article/search', params)
}

// ---- 向后兼容 ----

/**
 * 点赞文章
 * @deprecated 使用 likeComment 或自行实现
 */
export function likeArticle(id: number): Promise<{ likes: number }> {
  return http.post<{ likes: number }>(`/article/${id}/like`)
}

/**
 * 取消点赞文章
 * @deprecated
 */
export function unlikeArticle(id: number): Promise<{ likes: number }> {
  return http.delete<{ likes: number }>(`/article/${id}/like`)
}
