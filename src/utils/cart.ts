/**
 * 购物车操作工具函数
 * 用于在商品详情页等地方快速添加商品到购物车
 */

import { addToCart } from '@/api/cart'
import { useTokenStore } from '@/store/token'

/**
 * 添加商品到购物车的通用方法
 * @param productId 商品ID
 * @param quantity 数量，默认1
 * @param showSuccess 是否显示成功提示，默认true
 * @returns Promise<boolean> 是否成功
 */
export const addProductToCart = async (
  productId: number,
  quantity: number = 1,
  showSuccess: boolean = true
): Promise<boolean> => {
  try {
    console.log('addProductToCart 开始执行')
    console.log('参数:', { productId, quantity, showSuccess })

    const tokenStore = useTokenStore()
    console.log('登录状态:', tokenStore.hasLogin)

    // 检查登录状态
    if (!tokenStore.hasLogin) {
      console.log('用户未登录')
      uni.showModal({
        title: '提示',
        content: '请先登录后再添加到购物车',
        confirmText: '去登录',
        cancelText: '取消',
        success: (res) => {
          if (res.confirm) {
            uni.navigateTo({
              url: '/pages/login/login'
            })
          }
        }
      })
      return false
    }

    // 显示加载提示
    uni.showLoading({
      title: '添加中...'
    })

    console.log('调用API addToCart')
    const response = await addToCart(productId, quantity)
    console.log('API响应:', response)

    uni.hideLoading()

    if (response.code === 200) {
      if (showSuccess) {
        uni.showToast({
          title: '添加成功',
          icon: 'success'
        })
      }

      // 发送购物车更新事件
      uni.$emit('cartChanged')

      return true
    }
    else {
      throw new Error(response.message)
    }
  }
  catch (error: any) {
    uni.hideLoading()

    console.error('添加到购物车失败:', error)

    let errorMessage = '添加失败'
    if (error.message) {
      if (error.message.includes('库存不足')) {
        errorMessage = '商品库存不足'
      }
      else if (error.message.includes('不存在')) {
        errorMessage = '商品不存在或已下架'
      }
      else {
        errorMessage = error.message
      }
    }

    uni.showToast({
      title: errorMessage,
      icon: 'none'
    })

    return false
  }
}

/**
 * 快速添加到购物车（带确认弹窗）
 * @param productId 商品ID
 * @param productName 商品名称
 * @param quantity 数量，默认1
 */
export const quickAddToCart = (
  productId: number,
  productName: string,
  quantity: number = 1
) => {
  uni.showModal({
    title: '添加到购物车',
    content: `确定将"${productName}"添加到购物车吗？`,
    confirmText: '确定',
    cancelText: '取消',
    success: (res) => {
      if (res.confirm) {
        addProductToCart(productId, quantity)
      }
    }
  })
}

/**
 * 立即购买（跳转到结算页面）
 * @param productId 商品ID
 * @param quantity 数量，默认1
 */
export const buyNow = async (
  productId: number,
  quantity: number = 1
) => {
  try {
    const tokenStore = useTokenStore()

    // 检查登录状态
    if (!tokenStore.hasLogin) {
      uni.showModal({
        title: '提示',
        content: '请先登录后再购买',
        confirmText: '去登录',
        cancelText: '取消',
        success: (res) => {
          if (res.confirm) {
            uni.navigateTo({
              url: '/pages/login/login'
            })
          }
        }
      })
      return
    }

    // 先添加到购物车（不显示成功提示）
    const success = await addProductToCart(productId, quantity, false)

    if (success) {
      // 跳转到购物车页面
      uni.switchTab({
        url: '/pages/cart/cart'
      })

      // 或者直接跳转到结算页面
      // uni.navigateTo({
      //   url: `/pages/order/checkout?productId=${productId}&quantity=${quantity}`
      // })
    }
  }
  catch (error) {
    console.error('立即购买失败:', error)
  }
}
