<template>
  <z-paging
    ref="paging"
    v-model="cartItems"
    :paging-style="{ height: 'calc(100vh - 44px - 50px - env(safe-area-inset-bottom))' }"
    :auto-show-back-to-top="true"
    bg-color="#f5f5f5"
    @query="queryList"
  >
    <!-- 空数据/未登录状态插槽 -->
    <template #empty>
      <!-- 未登录状态 -->
      <view v-if="!hasLogin" class="empty-cart">
        <text class="empty-icon">🔒</text>
        <text class="empty-text">您还未登录</text>
        <text class="empty-desc">登录后查看购物车内容</text>
        <view class="login-btn" @tap="goToLogin">
          去登录
        </view>
      </view>

      <!-- 空购物车状态 -->
      <view v-else class="empty-cart">
        <text class="empty-icon">🛒</text>
        <text class="empty-text">购物车是空的</text>
        <text class="empty-desc">快去添加喜欢的商品吧~</text>
        <view class="go-shop-btn" @tap="navigateTo('/pages/index/index')">
          去购物
        </view>
      </view>
    </template>

    <!-- 商品列表 -->
    <view class="cart-items" @click="handleSwipeClick($event)">
      <view
        v-for="(item, index) in cartItems"
        :key="item.id"
        class="cart-item-container"
      >
        <!-- 滑动卡片 -->
        <sar-swipe-action
          :options="swipeOptions"
          :threshold="0.3"
          :auto-close="true"
          :visible="(activeSwipeIndex === index) as any"
          class="flex-1"
          @update:visible="(val) => handleVisibleChange(val, index)"
          @click="handleSwipeClick($event, index)"
        >
          <view class="cart-item" @tap.stop="closeOtherSwipes(index)">
            <!-- 复选框（在卡片外部） -->
            <view class="checkbox-container" @tap.stop="toggleCheck(index)">
              <view
                class="checkbox-icon"
                :class="{ checked: item.checked }"
              />
            </view>
            <image class="item-image" :src="getFullImageUrl(item.product_image)" mode="aspectFill" />
            <view class="item-content">
              <view class="item-top">
                <text class="item-name">{{ item.product_name }}</text>
                <image class="h-[40rpx] w-[40rpx]" src="@/static/delete.svg" mode="aspectFill" @click="removeItem(item.id)" />
              </view>

              <view class="item-info">
                <text class="stock-text">库存: {{ item.stock }}</text>
              </view>

              <view class="item-bottom">
                <text class="item-price">¥{{ CartUtils.formatPrice(item.price) }}</text>
                <view class="quantity-control">
                  <view class="quantity-btn minus" @tap.stop="decreaseQuantity(index)">
                    -
                  </view>
                  <text class="quantity-value">{{ item.quantity }}</text>
                  <view class="quantity-btn plus" @tap.stop="increaseQuantity(index)">
                    +
                  </view>
                </view>
              </view>
            </view>
          </view>
          <template #right="{ hide }">
            <view style="margin-bottom: 20rpx;">
              <sar-button
                theme="danger"
                square
                inline
                style="height: 100%"
                @click="onClick('删除', hide)"
              >
                删除
              </sar-button>
            </view>
          </template>
        </sar-swipe-action>
      </view>
    </view>

    <!-- 底部结算栏插槽 -->
    <template #bottom>
      <view v-if="hasLogin && !isEmpty" class="cart-footer">
        <view class="total-info">
          <view class="select-all-container" @tap="toggleSelectAll">
            <view
              class="checkbox-icon"
              :class="{ checked: isAllSelected }"
            />
            <text class="select-all-text">全选</text>
          </view>
          <view class="total-price-container">
            <text class="total-label">总计</text>
            <text class="total-price">¥{{ totalPrice }}</text>
            <text class="total-count">({{ totalItems }}件)</text>
          </view>
        </view>
        <view v-if="!isEmpty" class="clear-btn" @tap="clearAllItems">
          <text>清空</text>
        </view>
        <view class="checkout-btn" @tap="checkout">
          结算
        </view>
      </view>
    </template>
  </z-paging>
</template>

<script lang="ts" setup>
import type { CartItem } from '@/api/cart'
import { onShow } from '@dcloudio/uni-app'
import { computed, onMounted, onUnmounted, ref } from 'vue'
import {
  CartUtils,
  clearCart,
  deleteCartItem,
  getCartItems,
  updateCartItem,
} from '@/api/cart'
import { useTokenStore } from '@/store/token'

interface CartItemWithStatus extends CartItem {
  checked: boolean
}

definePage({
  style: {
    navigationStyle: 'default',
    navigationBarTitleText: '购物车',
  },
})

// Store
const tokenStore = useTokenStore()

// 状态管理
const paging = ref<any>(null)
const cartItems = ref<CartItemWithStatus[]>([])
const isEmpty = computed(() => cartItems.value.length === 0)
const activeSwipeIndex = ref<number | null>(null)

// 检查登录状态
const hasLogin = computed(() => tokenStore.hasLogin)

// 获取完整图片URL
const getFullImageUrl = (imagePath: string) => {
  if (!imagePath)
    return '/static/empty.svg'
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
      height: '100%',
    },
  },
])

// 选中的商品列表
const checkedItems = computed(() => cartItems.value.filter(item => item.checked))

// 是否全选
const isAllSelected = computed(() => {
  return cartItems.value.length > 0 && cartItems.value.every(item => item.checked)
})

// 计算总价（元）
const totalPrice = computed(() => {
  return CartUtils.calculateTotal(checkedItems.value).toFixed(2)
})

// 计算选中商品总数
const totalItems = computed(() => {
  return CartUtils.calculateTotalQuantity(checkedItems.value)
})

// z-paging 数据加载
const queryList = async (pageNo: number, _pageSize: number) => {
  if (!hasLogin.value) {
    paging.value?.complete([])
    return
  }

  // 这里的接口 getCartItems 似乎是一次性返回所有数据
  // 如果是第2页及以上，直接返回空数组，告诉 z-paging 没有更多数据了
  if (pageNo > 1) {
    paging.value?.complete([])
    return
  }

  try {
    const response = await getCartItems()
    if (response.code === 200) {
      // 假设接口一次性返回所有数据
      // 转换为带状态的列表，默认全选
      const items = Array.from({ length: 10 }, (_, i) => ({
        id: i + 1,
        product_name: `商品${i + 1}`,
        productId: i + 1,
        quantity: i + 1,
        price: (i + 1) * 10,
        stock: 100,
        // 这里只是模拟数据，实际应该使用 response.data
        // ...response.data[i]
      })) as any

      // 实际开发中应该使用真实数据
      // const items = response.data

      cartItems.value = items.map(item => ({
        ...item,
        checked: true,
      }))
      paging.value?.complete(cartItems.value)
    }
    else {
      paging.value?.complete(false)
      uni.showToast({
        title: response.message || '获取购物车失败',
        icon: 'none',
      })
    }
  }
  catch (error: any) {
    console.error('获取购物车失败:', error)
    paging.value?.complete(false)
    uni.showToast({
      title: error.message || '获取购物车失败',
      icon: 'none',
    })
  }
}

// 切换单个商品选中状态
const toggleCheck = (index: number) => {
  cartItems.value[index].checked = !cartItems.value[index].checked
}

// 切换全选状态
const toggleSelectAll = () => {
  const newValue = !isAllSelected.value
  cartItems.value.forEach((item) => {
    item.checked = newValue
  })
}

// 增加商品数量
const increaseQuantity = async (index: number) => {
  const item = cartItems.value[index]

  // 检查库存
  if (item.quantity >= item.stock) {
    uni.showToast({
      title: '库存不足',
      icon: 'none',
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
        icon: 'success',
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
      icon: 'none',
    })
  }
}

// 处理滑动按钮点击事件
const handleSwipeClick = (event: any, index?: number) => {
  // 点击 scroll-view 空白处，关闭所有滑块
  if (typeof index === 'undefined') {
    activeSwipeIndex.value = null
    return
  }

  if (event && event.index === 0) { // 删除按钮
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
              icon: 'success',
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
            icon: 'none',
          })
        }
      }
    },
  })
}

const handleVisibleChange = (visible: boolean | string, index: number) => {
  if (visible) {
    activeSwipeIndex.value = index
  }
  else if (activeSwipeIndex.value === index) {
    activeSwipeIndex.value = null
  }
}

const closeOtherSwipes = (index: number) => {
  if (activeSwipeIndex.value !== null && activeSwipeIndex.value !== index) {
    activeSwipeIndex.value = null
  }
}

const onClick = (action: string, hide?: () => void) => {
  if (action === '删除') {
    const index = activeSwipeIndex.value
    if (index !== null) {
      removeItem(index)
    }
  }
  if (hide) {
    hide()
  }
}

// 结算
const checkout = () => {
  if (isEmpty.value) {
    uni.showToast({
      title: '购物车为空',
      icon: 'none',
    })
    return
  }

  if (checkedItems.value.length === 0) {
    uni.showToast({
      title: '请选择要结算的商品',
      icon: 'none',
    })
    return
  }

  // 检查库存
  const outOfStockItems = checkedItems.value.filter(item => item.quantity > item.stock)
  if (outOfStockItems.length > 0) {
    uni.showToast({
      title: '部分商品库存不足',
      icon: 'none',
    })
    return
  }

  uni.showToast({
    title: '结算功能开发中',
    icon: 'none',
  })
}

// 清空购物车
const clearAllItems = () => {
  if (isEmpty.value) {
    uni.showToast({
      title: '购物车已经是空的',
      icon: 'none',
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
              icon: 'success',
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
            icon: 'none',
          })
        }
      }
    },
  })
}

// 页面导航
const navigateTo = (url: string) => {
  uni.switchTab({
    url,
  })
}

// 跳转登录页面
const goToLogin = () => {
  uni.navigateTo({
    url: '/pages/login/login',
  })
}

const safeAreaTop = ref(0)
// 页面加载时获取数据
onMounted(() => {
  const systemInfo = uni.getSystemInfoSync()
  console.log('系统信息：', systemInfo)
  safeAreaTop.value = systemInfo.safeAreaInsets.top // 获取安全区域顶部的内边距
  // 监听购物车变化事件
  uni.$on('cartChanged', () => {
    paging.value?.reload()
  })
})

onShow(() => {
  // 每次显示页面时都重新加载购物车数据
  paging.value?.reload()
})

onUnmounted(() => {
  // 清理事件监听
  uni.$off('cartChanged')
})
</script>

<style lang="scss" scoped>
/* 商品列表 */
.cart-items {
  padding-top: 20rpx;
}

.cart-item-container {
  display: flex;
  align-items: center;
  padding: 0 30rpx;
  margin-bottom: 20rpx;
}

.checkbox-container {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 20rpx;
  flex-shrink: 0;
}

.checkbox-icon {
  width: 44rpx;
  height: 44rpx;
  border-radius: 50%;
  border: 2rpx solid #ccc;
  position: relative;
  transition: all 0.2s;
  background-color: #fff;

  &.checked {
    background-color: #ffcc00; /* 黄色风格 */
    border-color: #ffcc00;
  }
}

.cart-item {
  display: flex;
  align-items: center;
  background-color: #ffffff;
  border-radius: 30rpx; /* 加大圆角 */
  padding: 30rpx;
  position: relative;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.04);
  margin-bottom: 0; /* 这里的margin交给container处理 */

  .item-image {
    width: 160rpx;
    height: 160rpx;
    border-radius: 20rpx;
    margin-right: 24rpx;
    background-color: #f8f8f8;
  }

  .item-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    height: 160rpx;
  }

  .item-top {
    display: flex;
    justify-content: space-between;

    .item-name {
      font-size: 30rpx;
      font-weight: 600;
      color: #333;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 300rpx;
    }
  }

  .item-info {
    margin: 6rpx 0;

    .stock-text {
      font-size: 24rpx;
      color: #999;
      background-color: #f8f8f8;
      padding: 4rpx 12rpx;
      border-radius: 8rpx;
    }
  }

  .item-bottom {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: auto;

    .item-price {
      font-size: 34rpx;
      font-weight: 700;
      color: #333;
    }

    .quantity-control {
      display: flex;
      align-items: center;

      .quantity-btn {
        width: 44rpx;
        height: 44rpx;
        background-color: #ffcc00; /* 黄色按钮 */
        border: none;
        border-radius: 8rpx;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 28rpx;
        font-weight: 600;
        color: #333;

        &:active {
          opacity: 0.8;
        }
      }

      .quantity-value {
        margin: 0 20rpx;
        font-size: 28rpx;
        font-weight: 600;
        min-width: 30rpx;
        text-align: center;
      }
    }
  }
}

/* 底部结算栏 */
.select-all-container {
  display: flex;
  align-items: center;
  // padding: 10rpx 30rpx;

  .select-all-text {
    font-size: 28rpx;
    color: #333;
    margin-left: 10rpx;
  }
}
.cart-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 30rpx;
  background-color: #ffffff;
  border-top: 1rpx solid #eee;
  box-shadow: 0 -2rpx 10rpx rgba(0, 0, 0, 0.05);

  .total-info {
    flex: 1;
    margin-right: 20rpx;

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
  }

  .checkout-btn {
    background-color: #4ccca6;
    color: #fff;
    padding: 20rpx 60rpx;
    border-radius: 40rpx;
    font-size: 30rpx;
  }
}

.clear-btn {
  background-color: #e64554;
  color: #fff;
  padding: 20rpx 60rpx;
  border-radius: 40rpx;
  font-size: 30rpx;
}

.empty-cart {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 40rpx;

  .empty-icon {
    font-size: 180rpx;
    margin-bottom: 40rpx;
    opacity: 0.3;
  }

  .empty-text {
    font-size: 34rpx;
    color: #333;
    font-weight: 500;
    margin-bottom: 16rpx;
  }

  .empty-desc {
    font-size: 26rpx;
    color: #999;
    margin-bottom: 60rpx;
  }

  .login-btn,
  .go-shop-btn {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: #ffffff;
    padding: 24rpx 80rpx;
    border-radius: 50rpx;
    font-size: 28rpx;
    box-shadow: 0 8rpx 20rpx rgba(102, 126, 234, 0.3);
    transition: all 0.3s ease;

    &:active {
      transform: scale(0.95);
      box-shadow: 0 4rpx 12rpx rgba(102, 126, 234, 0.2);
    }
  }
}
</style>
