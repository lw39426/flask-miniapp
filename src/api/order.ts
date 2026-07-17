/**
 * 订单模块 API
 * 前缀: /api/v1
 * 需要鉴权
 * 基于 md/用户端接口对接文档.md
 */

import type { ApiResponse, Order, OrderStatus, PaginationParams } from './types/index'
import { http } from '@/http/http'

// 订单项参数（创建订单用）
export interface OrderItemParams {
  product_id: number
  quantity: number
}

// 创建订单参数
export interface CreateOrderParams {
  address_id: number
  items: OrderItemParams[]
  remark?: string
}

// 创建订单响应
export interface CreateOrderResponse {
  order_id: number
  order_no: string
  total_amount: number
}

// 订单列表参数
export interface OrderListParams extends PaginationParams {
  status?: OrderStatus
}

// 订单列表响应
export interface OrderListResponse {
  orders: Order[]
  pagination: {
    page: number
    pageSize: number
    total: number
    pages: number
  }
}

// 支付参数
export interface PayOrderParams {
  payment_method: string
  amount: number
}

/**
 * 创建订单
 * POST /api/v1/orders
 */
export function createOrder(data: CreateOrderParams): Promise<ApiResponse<CreateOrderResponse>> {
  return http.post<ApiResponse<CreateOrderResponse>>('/orders', data)
}

/**
 * 获取订单列表
 * GET /api/v1/orders
 */
export function getOrderList(params: OrderListParams = {}): Promise<ApiResponse<OrderListResponse>> {
  return http.get<ApiResponse<OrderListResponse>>('/orders', params)
}

/**
 * 获取订单详情
 * GET /api/v1/orders/<order_id>
 */
export function getOrderDetail(orderId: number): Promise<ApiResponse<Order>> {
  return http.get<ApiResponse<Order>>(`/orders/${orderId}`)
}

/**
 * 取消订单
 * POST /api/v1/orders/<order_id>/cancel
 */
export function cancelOrder(orderId: number): Promise<ApiResponse<any>> {
  return http.post<ApiResponse<any>>(`/orders/${orderId}/cancel`)
}

/**
 * 支付订单
 * POST /api/v1/orders/<order_id>/pay
 */
export function payOrder(orderId: number, data: PayOrderParams): Promise<ApiResponse<any>> {
  return http.post<ApiResponse<any>>(`/orders/${orderId}/pay`, data)
}

/**
 * 确认收货
 * POST /api/v1/orders/<order_id>/confirm
 */
export function confirmOrder(orderId: number): Promise<ApiResponse<any>> {
  return http.post<ApiResponse<any>>(`/orders/${orderId}/confirm`)
}
