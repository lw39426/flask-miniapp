import type { ApiResponse } from './types/index'
import { http } from '@/http/http'

/**
 * 评论数据类型定义
 */
export interface Comment {
  id: number
  article_id: number
  user_id: number
  content: string
  created_at: string
  updated_at: string
  parent_id: number | null
  level: number
  like_count: number
  reply_count: number
  is_deleted: boolean
  status: 'approved' | 'pending' | 'rejected'
  user_nickname: string
  user_avatar: string
  user_role: 'author' | 'user' | 'admin'
  is_author: boolean
  reply_to_user_id: number | null
  reply_to_nickname: string | null
  is_liked: boolean
  children: Comment[]
}

export interface CommentListResponse {
  comments: Comment[]
  pagination: {
    page: number
    per_page: number
    total: number
    pages: number
    has_prev: boolean
    has_next: boolean
  }
}

export interface CommentStatistics {
  total_comments: number
  root_comments: number
  reply_comments: number
  total_likes: number
  today_comments: number
}

export interface CreateCommentData {
  article_id: number
  content: string
  parent_id?: number | null
  reply_to_user_id?: number | null
}

export interface CommentListParams {
  page?: number
  per_page?: number
  sort_by?: 'created_at' | 'like_count'
  order?: 'desc' | 'asc'
}

/**
 * 将对象序列化为查询字符串（兼容小程序，无 URLSearchParams）
 */
const serializeQuery = (obj: Record<string, any>): string => {
  const parts: string[] = []
  Object.keys(obj).forEach((key) => {
    const val = obj[key]
    if (val === undefined || val === null || val === '')
      return
    parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(val))}`)
  })
  return parts.join('&')
}

/**
 * 评论 API 服务（复用 http/http.ts）
 */
export class CommentAPI {
  /**
   * 获取文章评论列表
   * GET /api/comments/article/{id}
   */
  static async getArticleComments(
    articleId: number,
    params: CommentListParams = {}
  ): Promise<CommentListResponse> {
    const url = `/api/comments/article/${articleId}`
    const res = await http.get<ApiResponse<CommentListResponse>>(url, params)
    if (res && res.code === 200) {
      return (res as ApiResponse<CommentListResponse>).data
    }
    throw new Error(res?.message || '获取评论失败')
  }

  /**
   * 创建评论
   * POST /api/comments/create
   */
  static async createComment(data: CreateCommentData): Promise<any> {
    const res = await http.post<ApiResponse<{ comment: Comment }>>('/api/comments/create', data)
    console.log('22创建评论', res)
    if (res && (res as any).code === 200) {
      return res
    }
    throw new Error((res as any)?.message || '发表评论失败1')
  }

  /**
   * 点赞/取消点赞评论
   * POST /api/comments/{id}/like
   */
  static async toggleLike(commentId: number): Promise<{ is_liked: boolean, like_count: number, message?: string }> {
    const res = await http.post<ApiResponse<{ is_liked: boolean, like_count: number }>>(`/api/comments/${commentId}/like`)
    const ok = (res as any)?.code === 200 || (res as any)?.success === true
    if (res && ok) {
      // 兼容 success/message/data 与 code/data 两种返回
      const data = (res as any)?.data || {}
      return { ...data, message: (res as any)?.message }
    }
    throw new Error((res as any)?.message || '操作失败')
  }

  /**
   * 删除评论
   * DELETE /api/comments/{id}/delete
   */
  static async deleteComment(commentId: number): Promise<void> {
    const res = await http.delete<ApiResponse<unknown>>(`/api/comments/${commentId}/delete`)
    if (res && (res as any).code === 200) {
      return
    }
    throw new Error((res as any)?.message || '删除评论失败')
  }

  /**
   * 获取评论统计
   * GET /api/comments/statistics/{id}
   */
  static async getCommentStatistics(articleId: number): Promise<CommentStatistics> {
    const res = await http.get<ApiResponse<CommentStatistics>>(`/api/comments/statistics/${articleId}`)
    if (res && (res as any).code === 200) {
      return (res as ApiResponse<CommentStatistics>).data
    }
    throw new Error((res as any)?.message || '获取统计数据失败')
  }

  /**
   * 获取用户评论列表
   * GET /api/comments/user/{user_id}
   */
  static async getUserComments(
    userId: number,
    params: { page?: number, per_page?: number } = {}
  ): Promise<CommentListResponse> {
    const url = `/api/comments/user/${userId}`
    const res = await http.get<ApiResponse<CommentListResponse>>(url, params)
    if (res && (res as any).code === 200) {
      return (res as ApiResponse<CommentListResponse>).data
    }
    throw new Error((res as any)?.message || '获取用户评论失败')
  }
}

// 导出默认实例
export const commentAPI = CommentAPI
