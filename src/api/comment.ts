/**
 * 评论模块 API
 * 前缀: /api/v1/comments
 * 部分需要鉴权
 * 基于 md/用户端接口对接文档.md
 */

import type { ApiResponse, PaginationParams } from './types/index'
import { http } from '@/http/http'

// 评论对象
export interface Comment {
  id: number
  article_id: number
  user_id: number
  user_nickname: string
  user_avatar: string
  content: string
  parent_id: number | null
  level: number
  like_count: number
  reply_count: number
  created_at: string
  updated_at?: string
  children: Comment[]
  // 扩展字段（向后兼容）
  is_author?: boolean
  reply_to_nickname?: string | null
  is_liked?: boolean
  reply_to_user_id?: number | null
  user_role?: 'author' | 'user' | 'admin'
  is_deleted?: boolean
  status?: 'approved' | 'pending' | 'rejected'
}

// 评论列表响应
export interface CommentListResponse {
  comments: Comment[]
  total: number
  pagination?: {
    page: number
    pageSize: number
    total: number
    pages: number
    has_prev?: boolean
    has_next?: boolean
  }
}

// 创建评论参数
export interface CreateCommentParams {
  article_id: number
  content: string
  parent_id?: number
}

// 评论列表分页参数
export interface CommentListParams extends PaginationParams {
  sort_by?: 'created_at' | 'like_count'
  order?: 'desc' | 'asc'
  per_page?: number
}

// 评论统计
export interface CommentStatistics {
  total_comments?: number
  root_comments?: number
  reply_comments?: number
  total_likes?: number
  today_comments?: number
  total?: number
}

/**
 * 获取文章评论列表
 * GET /api/v1/comments/article/<article_id>
 */
export function getArticleComments(articleId: number, params: CommentListParams = {}): Promise<ApiResponse<CommentListResponse>> {
  const { per_page, ...rest } = params
  return http.get<ApiResponse<CommentListResponse>>(`/comments/article/${articleId}`, {
    ...rest,
    ...(per_page ? { pageSize: per_page } : {}),
  })
}

/**
 * 发表评论
 * POST /api/v1/comments/create
 * 需要鉴权
 */
export function createComment(data: CreateCommentParams): Promise<ApiResponse<Comment>> {
  return http.post<ApiResponse<Comment>>('/comments/create', data)
}

/**
 * 评论点赞
 * POST /api/v1/comments/<comment_id>/like
 * 需要鉴权
 */
export function likeComment(commentId: number): Promise<ApiResponse<{ is_liked: boolean, like_count: number }>> {
  return http.post<ApiResponse<{ is_liked: boolean, like_count: number }>>(`/comments/${commentId}/like`)
}

/**
 * 删除评论
 * DELETE /api/v1/comments/<comment_id>/delete
 * 需要鉴权（仅评论作者或管理员可删除）
 */
export function deleteComment(commentId: number): Promise<ApiResponse<any>> {
  return http.delete<ApiResponse<any>>(`/comments/${commentId}/delete`)
}

/**
 * 获取用户评论列表
 * GET /api/v1/comments/user/<user_id>
 */
export function getUserComments(userId: number, params: PaginationParams = {}): Promise<ApiResponse<CommentListResponse>> {
  return http.get<ApiResponse<CommentListResponse>>(`/comments/user/${userId}`, params)
}

/**
 * 获取文章评论统计
 * GET /api/v1/comments/statistics/<article_id>
 */
export function getCommentStatistics(articleId: number): Promise<ApiResponse<CommentStatistics>> {
  return http.get<ApiResponse<CommentStatistics>>(`/comments/statistics/${articleId}`)
}

// ---- 向后兼容：类形式导出（自动解包） ----

export class CommentAPI {
  static async getArticleComments(articleId: number, params: CommentListParams = {}): Promise<CommentListResponse> {
    const res = await getArticleComments(articleId, params)
    if (res && res.code === 200) {
      return res.data
    }
    throw new Error(res?.message || '获取评论失败')
  }

  static async createComment(data: CreateCommentParams): Promise<Comment> {
    const res = await createComment(data)
    if (res && res.code === 200) {
      return res.data
    }
    throw new Error(res?.message || '发表评论失败')
  }

  static async likeComment(commentId: number): Promise<{ is_liked: boolean, like_count: number }> {
    const res = await likeComment(commentId)
    if (res && res.code === 200) {
      return res.data
    }
    throw new Error(res?.message || '操作失败')
  }

  static async deleteComment(commentId: number): Promise<void> {
    const res = await deleteComment(commentId)
    if (res && res.code === 200) {
      return
    }
    throw new Error(res?.message || '删除评论失败')
  }

  static async getUserComments(userId: number, params: PaginationParams = {}): Promise<CommentListResponse> {
    const res = await getUserComments(userId, params)
    if (res && res.code === 200) {
      return res.data
    }
    throw new Error(res?.message || '获取用户评论失败')
  }

  static async getCommentStatistics(articleId: number): Promise<CommentStatistics> {
    const res = await getCommentStatistics(articleId)
    if (res && res.code === 200) {
      return res.data
    }
    throw new Error(res?.message || '获取统计数据失败')
  }

  static async toggleLike(commentId: number): Promise<{ is_liked: boolean, like_count: number }> {
    const res = await likeComment(commentId)
    if (res && res.code === 200) {
      return res.data
    }
    throw new Error(res?.message || '操作失败')
  }
}

export const commentAPI = CommentAPI
