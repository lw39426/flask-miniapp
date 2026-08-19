// ========================================
// 用户端接口对接文档 - 公共类型定义
// 基于 md/用户端接口对接文档.md
// ========================================

// API 通用响应类型
export interface ApiResponse<T = any> {
  code: number
  message: string
  data: T
}

// 分页参数类型（文档统一约定：page / pageSize）
export interface PaginationParams {
  page?: number
  pageSize?: number
}

// 分页响应结构（文档统一约定）
export interface PaginationResponse {
  page: number
  pageSize: number
  total: number
  pages: number
}

// 标签类型
export interface Tag {
  id: number
  name: string
  color: string
  weight?: number
  type?: number
  description?: string
}

// 商品对象（文档统一 Product 模型）
export interface Product {
  id: number
  code: string
  name: string
  description: string
  price: number
  sale_price: number
  stock: number
  category_id: number
  status: number
  main_image: string
  /** @deprecated 向后兼容别名，请使用 main_image */
  image?: string
  images: string[]
  detail_html: string
  sales: number
  sort: number
  brand: string
  favorite_count: number
  category_name: string
  tags: Tag[]
  create_time: string
  update_time: string
}

// 商品分类
export interface Category {
  id: number
  name: string
  image: string
  imageUrl?: string
  product_count?: number
  children?: Category[]
  parent_id?: number | null
  is_displayed?: number
  sort_order?: number
}

// 文章对象（文档 Article.to_dict()）
export interface Article {
  id: number
  article_code: string
  title: string
  content: string
  image: string
  description: string
  status: number
  category_id: number
  category_name: string
  author: string
  views: number
  likes: number
  comment_count: number
  favorite_count: number
  tags: Tag[]
  published_date: string
  update_date: string
}

// 文章分类
export interface ArticleCategory {
  id: number
  name: string
  parent_id: number | null
  is_displayed: number
  sort_order: number
  children: ArticleCategory[]
}

// 用户信息
export interface UserInfo {
  id: number
  username: string
  nickname: string
  phone: string
  gender: number
  avatar: string
  description: string
  enable: number
  birthday: string
  create_at: string
}

// 地址信息
export interface Address {
  id: number
  recipient_name: string
  phone: string
  address_line: string
  is_default: boolean
}

// 订单状态枚举
export enum OrderStatus {
  PENDING_PAYMENT = 0,
  PAID = 1,
  SHIPPED = 2,
  COMPLETED = 3,
  CANCELLED = 4,
}

// 订单项
export interface OrderItem {
  id: number
  product_id: number
  product_name: string
  product_image: string
  price: number
  quantity: number
  total_amount: number
}

// 订单对象
export interface Order {
  id: number
  order_no: string
  user_id: number
  address_id: number
  address_info?: Address
  total_amount: number
  status: OrderStatus
  remark: string
  items: OrderItem[]
  payment_method?: string
  payment_time?: string
  ship_time?: string
  complete_time?: string
  created_at: string
  updated_at: string
}

// Banner 轮播图
export interface Banner {
  id: number
  title: string
  image_url: string
  /** @deprecated 向后兼容别名，请使用 image_url */
  image?: string
  placement_key: string
  link_type: string
  link_target: string
  /** @deprecated 向后兼容别名，请使用 link_target */
  link_value?: string
  client_type: string
  sort_order: number
  status: boolean
}

// 公告
export interface Announcement {
  id: number
  title: string
  announcement_type: string
  content: string
  display_positions: string[]
  force_reminder: boolean
  terminals: string[]
  effective_time: string
  end_time: string
  created_at: string
}

// 地区
export interface Region {
  id: number
  code: string
  name: string
  parent_id: number | null
  children?: Region[]
}

// 角色
export interface Character {
  id: number
  code: string
  name: string
  region_code: string
  description?: string
  image?: string
}

// 导出聊天相关类型
export * from './chat'
