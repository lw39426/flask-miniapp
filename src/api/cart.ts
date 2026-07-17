/**
 * 购物车模块 API
 * 前缀: /api/v1/cart
 * 需要鉴权
 * 基于 md/用户端接口对接文档.md
 */

import type { ApiResponse, Product } from './types/index'
import { http } from '@/http/http'

// 购物车项（含商品对象）
export interface CartItem {
  id: number
  product_id: number
  quantity: number
  product: Product
  created_at: string
  updated_at: string
}

// 购物车列表响应
export interface CartListResponse {
  items: CartItem[]
  total_price: number
}

/**
 * 获取购物车列表
 * GET /api/v1/cart/list
 */
export function getCartList(): Promise<ApiResponse<CartListResponse>> {
  return http.get<ApiResponse<CartListResponse>>('/cart/list')
}

/**
 * 向后兼容别名
 * @deprecated 使用 getCartList
 */
export const getCartItems = getCartList

/**
 * 加入购物车
 * POST /api/v1/cart/add
 */
export function addToCart(data: { product_id: number, quantity: number }): Promise<ApiResponse<any>> {
  return http.post<ApiResponse<any>>('/cart/add', data)
}

/**
 * 更新购物车项数量
 * PUT /api/v1/cart/update/<cart_item_id>
 */
export function updateCartItem(cartItemId: number, data: { quantity: number }): Promise<ApiResponse<any>> {
  return http.put<ApiResponse<any>>(`/cart/update/${cartItemId}`, data)
}

/**
 * 删除购物车项
 * DELETE /api/v1/cart/del/<cart_item_id>
 */
export function deleteCartItem(cartItemId: number): Promise<ApiResponse<any>> {
  return http.delete<ApiResponse<any>>(`/cart/del/${cartItemId}`)
}

/**
 * 清空购物车
 * DELETE /api/v1/cart/clear
 */
export function clearCart(): Promise<ApiResponse<any>> {
  return http.delete<ApiResponse<any>>('/cart/clear')
}

/**
 * 购物车工具类
 */
export class CartUtils {
  /**
   * 计算购物车总价（元）
   */
  static calculateTotal(cartItems: CartItem[]): number {
    return cartItems.reduce((total, item) => {
      return total + (item.product.sale_price * item.quantity / 100)
    }, 0)
  }

  /**
   * 计算购物车总数量
   */
  static calculateTotalQuantity(cartItems: CartItem[]): number {
    return cartItems.reduce((total, item) => total + item.quantity, 0)
  }

  /**
   * 格式化价格显示（分转元）
   */
  static formatPrice(priceInCents: number): string {
    return (priceInCents / 100).toFixed(2)
  }

  /**
   * 计算单项商品总价（元）
   */
  static calculateItemTotal(item: CartItem): number {
    return item.product.sale_price * item.quantity / 100
  }
}
