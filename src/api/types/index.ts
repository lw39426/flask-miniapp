// API 通用响应类型
export interface ApiResponse<T = any> {
  success: boolean
  message: string
  data: T
  code?: number
}

// 分页参数类型
export interface PaginationParams {
  page?: number
  per_page?: number
  limit?: number
}

// 分页响应类型
export interface PaginationResponse {
  page: number
  per_page: number
  total: number
  pages: number
  has_prev: boolean
  has_next: boolean
}

// 用户基础信息类型
export interface UserInfo {
  id: number
  nickname: string
  avatar: string
  role?: 'user' | 'author' | 'admin'
}

// 错误响应类型
export interface ErrorResponse {
  success: false
  message: string
  code: number
  errors?: Record<string, string[]>
}
