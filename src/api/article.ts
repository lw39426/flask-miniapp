import type { ApiResponse, Article } from './home'
import { http } from '@/http/http'

// 文章详情接口
export interface ArticleDetail extends Article {
  content?: string // 文章正文内容
  likes?: number // 点赞数
  views?: number // 阅读数
  comments?: number // 评论数
}

/**
 * 获取文章详情
 */
export function getArticleDetail(id: number): Promise<ApiResponse<ArticleDetail>> {
  return http.get<ApiResponse<ArticleDetail>>(`/miniapp/article/${id}`)
}

/**
 * 获取相关文章
 */
export function getRelatedArticles(articleId: number, limit: number = 5): Promise<ApiResponse<Article[]>> {
  return http.get<ApiResponse<Article[]>>(`/article/${articleId}/related`, {
    params: { limit }
  })
}

/**
 * 获取文章列表
 */
export function getArticleList(params: {
  page?: number
  limit?: number
  category?: string
  keyword?: string
}): Promise<{
  articles: Article[]
  total: number
  pages: number
  page: number
  per_page: number
}> {
  return http.get<any>('/article/list', { params })
}

/**
 * 点赞文章
 */
export function likeArticle(id: number): Promise<{ likes: number }> {
  return http.post<{ likes: number }>(`/article/${id}/like`)
}

/**
 * 取消点赞文章
 */
export function unlikeArticle(id: number): Promise<{ likes: number }> {
  return http.delete<{ likes: number }>(`/article/${id}/like`)
}
