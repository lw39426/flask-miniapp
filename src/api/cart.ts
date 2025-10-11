/**
 * 购物车相关API接口
 */

import { http } from '@/http/http'

// 购物车项数据类型
export interface CartItem {
  id: number
  product_id: number
  product_name: string
  product_image: string
  price: number
  quantity: number
  stock: number
}

// API响应类型
export interface CartResponse {
  code: number
  message: string
  data: CartItem[]
}

export interface CartActionResponse {
  code: number
  message: string
}

/**
 * 获取购物车商品列表
 */
export const getCartItems = () => {
  return http<CartResponse>({
    url: '/miniapp/api/cart',
    method: 'GET'
  })
}

/**
 * 添加商品到购物车
 */
export const addToCart = (productId: number, quantity: number = 1) => {
  return http<CartActionResponse>({
    url: '/miniapp/api/cart',
    method: 'POST',
    data: {
      product_id: productId,
      quantity
    }
  })
}

/**
 * 更新购物车商品数量
 */
export const updateCartItem = (cartItemId: number, quantity: number) => {
  return http<CartActionResponse>({
    url: `/miniapp/api/cart/${cartItemId}`,
    method: 'PUT',
    data: {
      quantity
    }
  })
}

/**
 * 删除购物车商品
 */
export const deleteCartItem = (cartItemId: number) => {
  return http<CartActionResponse>({
    url: `/miniapp/api/cart/${cartItemId}`,
    method: 'DELETE'
  })
}

/**
 * 清空购物车
 */
export const clearCart = () => {
  return http<CartActionResponse>({
    url: '/miniapp/api/cart/clear',
    method: 'DELETE'
  })
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
      return total + (item.price * item.quantity / 100)
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
    return item.price * item.quantity / 100
  }
}
