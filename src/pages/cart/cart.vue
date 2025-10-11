<template>
  <view class="cart-page">
    <!-- 顶部导航栏 -->
    <view class="cart-header">
      <text class="cart-title">购物车</text>
      <view v-if="!isEmpty" class="cart-actions">
        <text class="clear-btn" @tap="clearAllItems">清空</text>
      </view>
    </view>

    <!-- 加载状态 -->
    <view v-if="loading" class="loading-container">
      <text class="loading-text">加载中...</text>
    </view>

    <!-- 空购物车状态 -->
    <view v-else-if="!hasLogin" class="empty-cart">
      <text class="empty-text">请先登录</text>
      <view class="login-btn" @tap="goToLogin">
        去登录
      </view>
    </view>

    <view v-else-if="isEmpty" class="empty-cart">
      <text class="empty-text">购物车是空的</text>
      <text class="empty-desc">快去添加喜欢的商品吧~</text>
      <view class="go-shop-btn" @tap="navigateTo('/pages/index/index')">
        去购物
      </view>
    </view>

    <!-- 商品列表 -->
    <scroll-view v-else scroll-y class="cart-items">
      <wd-swipe-action
        v-for="(item, index) in cartItems" :key="item.id"
        :options="swipeOptions"
        :disabled="false"
        :threshold="0.3"
        :auto-close="true"
        @click="handleSwipeClick($event, index)"
      >
        <view class="cart-item">
          <image class="item-image" :src="getFullImageUrl(item.product_image)" mode="aspectFill" />
          <view class="item-content">
            <view class="item-top">
              <text class="item-name">{{ item.product_name }}</text>
            </view>

            <view class="item-info">
              <text class="stock-text">库存: {{ item.stock }}</text>
            </view>

            <view class="item-bottom">
              <view class="quantity-control">
                <view class="quantity-btn minus" @tap.stop="decreaseQuantity(index)">
                  -
                </view>
                <text class="quantity-value">{{ item.quantity }}</text>
                <view class="quantity-btn plus" @tap.stop="increaseQuantity(index)">
                  +
                </view>
              </view>
              <text class="item-price">¥{{ CartUtils.formatPrice(item.price) }}</text>
            </view>
          </view>
        </view>
      </wd-swipe-action>
    </scroll-view>

    <!-- 底部结算栏 - 固定在底部 -->
    <view v-if="hasLogin && !isEmpty && !loading" class="cart-footer">
      <view class="total-info">
        <view class="total-price-container">
          <text class="total-label">总计</text>
          <text class="total-price">¥{{ totalPrice }}</text>
          <text class="total-count">({{ totalItems }}件)</text>
        </view>
        <text class="shipping-note">不含运费</text>
      </view>
      <view class="checkout-btn" @tap="checkout">
        结算
      </view>
    </view>
  </view>
</template>

<script lang="ts" setup>
import type {
  CartItem
} from '@/api/cart'
import { onShow } from '@dcloudio/uni-app'
import { computed, onMounted, onUnmounted, ref } from 'vue'
// 引入组件
import WdSwipeAction from 'wot-design-uni/components/wd-swipe-action/wd-swipe-action.vue'
import {
  CartUtils,
  clearCart,
  deleteCartItem,
  getCartItems,
  updateCartItem
} from '@/api/cart'

import { useTokenStore } from '@/store/token'

definePage({
  style: {
    navigationStyle: 'custom',
    navigationBarTitleText: '购物车',
  },
})

// Store
const tokenStore = useTokenStore()

// 状态管理
const cartItems = ref<CartItem[]>([])
const loading = ref(false)
const isEmpty = computed(() => cartItems.value.length === 0)

// 检查登录状态
const hasLogin = computed(() => tokenStore.hasLogin)

// 获取完整图片URL
const getFullImageUrl = (imagePath: string) => {
  if (!imagePath)
    return '/static/images/default-avatar.png'
  if (imagePath.startsWith('http'))
    return imagePath
  return import.meta.env.VITE_SERVER_BASEURL + imagePath
}

// 滑动选项
const swipeOptions = ref([
  {
    text: '删除',
    style: {
      backgroundColor: '#ff4f4f',
      color: '#ffffff',
      width: '120rpx',
      height: '100%'
    }
  }
])

// 计算总价（元）
const totalPrice = computed(() => {
  return CartUtils.calculateTotal(cartItems.value).toFixed(2)
})

// 计算商品总数
const totalItems = computed(() => {
  return CartUtils.calculateTotalQuantity(cartItems.value)
})

// 加载购物车数据
const loadCartItems = async () => {
  if (!hasLogin.value) {
    uni.showToast({
      title: '请先登录',
      icon: 'none'
    })
    return
  }

  loading.value = true
  try {
    const response = await getCartItems()
    if (response.code === 200) {
      cartItems.value = response.data
    }
    else {
      throw new Error(response.message)
    }
  }
  catch (error: any) {
    console.error('获取购物车失败:', error)
    uni.showToast({
      title: error.message || '获取购物车失败',
      icon: 'none'
    })
  }
  finally {
    loading.value = false
  }
}

// 增加商品数量
const increaseQuantity = async (index: number) => {
  const item = cartItems.value[index]

  // 检查库存
  if (item.quantity >= item.stock) {
    uni.showToast({
      title: '库存不足',
      icon: 'none'
    })
    return
  }

  const newQuantity = item.quantity + 1
  // eslint-disable-next-line ts/no-use-before-define
  await updateQuantity(item.id, newQuantity, index)
}

// 减少商品数量
const decreaseQuantity = async (index: number) => {
  const item = cartItems.value[index]
  if (item.quantity > 1) {
    const newQuantity = item.quantity - 1
    // eslint-disable-next-line ts/no-use-before-define
    await updateQuantity(item.id, newQuantity, index)
  }
}

// 更新商品数量
const updateQuantity = async (cartItemId: number, quantity: number, index: number) => {
  try {
    const response = await updateCartItem(cartItemId, quantity)
    if (response.code === 200) {
      // 如果数量为0，从列表中移除
      if (quantity === 0) {
        cartItems.value.splice(index, 1)
      }
      else {
        cartItems.value[index].quantity = quantity
      }
      uni.showToast({
        title: '更新成功',
        icon: 'success'
      })
    }
    else {
      throw new Error(response.message)
    }
  }
  catch (error: any) {
    console.error('更新购物车失败:', error)
    uni.showToast({
      title: error.message || '更新失败',
      icon: 'none'
    })
  }
}

// 处理滑动按钮点击事件
const handleSwipeClick = (event: { index: number }, index: number) => {
  if (event.index === 0) { // 删除按钮
    // eslint-disable-next-line ts/no-use-before-define
    removeItem(index)
  }
}

// 删除商品
const removeItem = async (index: number) => {
  const item = cartItems.value[index]

  uni.showModal({
    title: '提示',
    content: '确定要删除该商品吗？',
    success: async (res) => {
      if (res.confirm) {
        try {
          const response = await deleteCartItem(item.id)
          if (response.code === 200) {
            cartItems.value.splice(index, 1)
            uni.showToast({
              title: '删除成功',
              icon: 'success'
            })
            // 发送购物车更新事件
            uni.$emit('cartChanged')
          }
          else {
            throw new Error(response.message)
          }
        }
        catch (error: any) {
          console.error('删除商品失败:', error)
          uni.showToast({
            title: error.message || '删除失败',
            icon: 'none'
          })
        }
      }
    }
  })
}

// 结算
const checkout = () => {
  if (isEmpty.value) {
    uni.showToast({
      title: '购物车为空',
      icon: 'none'
    })
    return
  }

  // 检查库存
  const outOfStockItems = cartItems.value.filter(item => item.quantity > item.stock)
  if (outOfStockItems.length > 0) {
    uni.showToast({
      title: '部分商品库存不足',
      icon: 'none'
    })
    return
  }

  uni.showToast({
    title: '结算功能开发中',
    icon: 'none'
  })
  // 这里可以添加跳转到结算页面的逻辑
  // uni.navigateTo({
  //   url: '/pages/order/checkout'
  // })
}

// 清空购物车
const clearAllItems = () => {
  if (isEmpty.value) {
    uni.showToast({
      title: '购物车已经是空的',
      icon: 'none'
    })
    return
  }

  uni.showModal({
    title: '提示',
    content: '确定要清空购物车吗？',
    success: async (res) => {
      if (res.confirm) {
        try {
          const response = await clearCart()
          if (response.code === 200) {
            cartItems.value = []
            uni.showToast({
              title: '清空成功',
              icon: 'success'
            })
            // 发送购物车更新事件
            uni.$emit('cartChanged')
          }
          else {
            throw new Error(response.message)
          }
        }
        catch (error: any) {
          console.error('清空购物车失败:', error)
          uni.showToast({
            title: error.message || '清空失败',
            icon: 'none'
          })
        }
      }
    }
  })
}

// 页面导航
const navigateTo = (url: string) => {
  uni.switchTab({
    url
  })
}

// 跳转登录页面
const goToLogin = () => {
  uni.navigateTo({
    url: '/pages/login/login'
  })
}

// 生命周期
onMounted(() => {
  // 监听购物车变化事件
  uni.$on('cartChanged', loadCartItems)
})

onShow(() => {
  // 每次显示页面时都重新加载购物车数据
  loadCartItems()
})

onUnmounted(() => {
  // 清理事件监听
  uni.$off('cartChanged', loadCartItems)
})
</script>

<style lang="scss" scoped>
.cart-page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background-color: #f5f5f5;
}

/* 顶部导航栏 - 固定在顶部 */
.cart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20rpx 30rpx;
  background-color: #5bcba9;
  color: #ffffff;
  height: 90rpx;
  position: fixed;
  // top: 88rpx;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;

  .cart-title {
    font-size: 36rpx;
    font-weight: 500;
  }

  .cart-settings {
    display: flex;
    background-color: rgba(255, 255, 255, 0.3);
    border-radius: 30rpx;
    padding: 10rpx 20rpx;

    .dot {
      width: 8rpx;
      height: 8rpx;
      background-color: #ffffff;
      border-radius: 50%;
      margin: 0 5rpx;
    }
  }
}

/* 商品列表 - 可滚动区域 */
.cart-items {
  flex: 1;
  padding-top: 140rpx;
  overflow-y: auto;
}

.cart-item {
  display: flex;
  background-color: #ffffff;
  border-radius: 16rpx;
  padding: 20rpx;
  margin-bottom: 20rpx;
  position: relative;

  .item-image {
    width: 160rpx;
    height: 160rpx;
    border-radius: 12rpx;
    margin-right: 20rpx;
  }

  .item-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }

  .item-top {
    display: flex;
    justify-content: space-between;

    .item-name {
      font-size: 28rpx;
      font-weight: 500;
      color: #333;
      width: 70%;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .delete-btn {
      color: #999;
      font-size: 40rpx;
    }
  }

  .item-rating {
    display: flex;
    align-items: center;
    margin: 10rpx 0;

    .icon-star {
      color: #ffcc00;
      font-size: 28rpx;
      margin-right: 8rpx;
    }

    .rating-text {
      color: #ffcc00;
      font-size: 24rpx;
    }
  }

  .item-bottom {
    display: flex;
    justify-content: space-between;
    align-items: center;

    .quantity-control {
      display: flex;
      align-items: center;

      .quantity-btn {
        width: 50rpx;
        height: 50rpx;
        border: 1px solid #ddd;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 28rpx;
      }

      .quantity-value {
        margin: 0 20rpx;
        font-size: 28rpx;
      }
    }

    .item-price {
      font-size: 32rpx;
      font-weight: 600;
      color: #333;
    }
  }
}

/* 底部结算栏 */
.cart-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20rpx 30rpx;
  background-color: #ffffff;
  border-top: 1rpx solid #eee;
  position: fixed;
  bottom: 100rpx;
  left: 0;
  right: 0;
  z-index: 100;
  box-shadow: 0 -2rpx 10rpx rgba(0, 0, 0, 0.05);

  .total-info {
    .total-price-container {
      display: flex;
      align-items: baseline;

      .total-label {
        font-size: 28rpx;
        color: #333;
        margin-right: 10rpx;
      }

      .total-price {
        font-size: 36rpx;
        font-weight: 600;
        color: #333;
      }

      .total-count {
        font-size: 24rpx;
        color: #666;
        margin-left: 10rpx;
      }
    }

    .shipping-note {
      font-size: 22rpx;
      color: #999;
    }
  }

  .checkout-btn {
    background-color: #6b5cd6;
    color: #ffffff;
    padding: 20rpx 60rpx;
    border-radius: 40rpx;
    font-size: 30rpx;
  }
}

/* 新增样式 */
.cart-actions {
  display: flex;
  align-items: center;

  .clear-btn {
    font-size: 28rpx;
    color: #ff4757;
    padding: 10rpx 20rpx;
  }
}

.loading-container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 400rpx;

  .loading-text {
    font-size: 28rpx;
    color: #999;
  }
}

.empty-cart {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 400rpx;
  padding: 40rpx;
  margin-top: 130rpx;

  .empty-text {
    font-size: 32rpx;
    color: #333;
    margin-bottom: 20rpx;
  }

  .empty-desc {
    font-size: 26rpx;
    color: #999;
    margin-bottom: 40rpx;
  }

  .login-btn,
  .go-shop-btn {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: #ffffff;
    padding: 20rpx 60rpx;
    border-radius: 40rpx;
    font-size: 28rpx;
  }
}

.item-info {
  margin: 10rpx 0;

  .stock-text {
    font-size: 24rpx;
    color: #999;
  }
}

/* 图标字体 */
@font-face {
  font-family: 'iconfont';
  /* 这里需要引入您的图标字体文件 */
}

.iconfont {
  font-family: 'iconfont';
}

.icon-delete:before {
  content: '\e645'; /* 使用您的图标编码 */
}

.icon-star:before {
  content: '\e611'; /* 使用您的图标编码 */
}

.icon-home:before {
  content: '\e7a7'; /* 使用您的图标编码 */
}

.icon-category:before {
  content: '\e62f'; /* 使用您的图标编码 */
}

.icon-cart:before {
  content: '\e698'; /* 使用您的图标编码 */
}

.icon-user:before {
  content: '\e682'; /* 使用您的图标编码 */
}
</style>
