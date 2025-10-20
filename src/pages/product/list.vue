<template>
  <view class="product-list-page">
    <!-- 导航栏 -->
    <view class="nav-bar">
      <view class="nav-back" @tap="goBack">
        <text class="back-icon">←</text>
      </view>
      <text class="nav-title">{{ categoryName || '商品列表' }}</text>
      <view class="nav-right" />
    </view>

    <!-- 筛选栏 -->
    <view class="filter-bar">
      <view class="filter-item" :class="{ active: sortBy === 'create_time' }" @tap="setSortBy('create_time')">
        <text>综合</text>
      </view>
      <view class="filter-item" :class="{ active: sortBy === 'sales' }" @tap="setSortBy('sales')">
        <text>销量</text>
      </view>
      <view class="filter-item" :class="{ active: sortBy === 'price' }" @tap="togglePriceSort">
        <text>价格</text>
        <text v-if="sortBy === 'price'" class="sort-arrow">{{ sortOrder === 'asc' ? '↑' : '↓' }}</text>
      </view>
    </view>

    <!-- 商品列表 -->
    <scroll-view class="product-scroll" :scroll-y="true" @scrolltolower="loadMore">
      <view class="product-grid">
        <view
          v-for="product in products"
          :key="product.id"
          class="product-item"
          @tap="goToDetail(product.id)"
        >
          <image class="product-image" :src="product.main_image" mode="aspectFill" />
          <view class="product-info">
            <text class="product-name">{{ product.name }}</text>
            <view class="product-price-row">
              <text class="product-price">¥{{ product.price }}</text>
              <text class="product-sales">已售{{ product.sales || 0 }}</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 加载更多 -->
      <view v-if="hasMore" class="load-more">
        <text class="load-text">{{ loading ? '加载中...' : '上拉加载更多' }}</text>
      </view>

      <!-- 没有更多 -->
      <view v-if="!hasMore && products.length > 0" class="no-more">
        <text class="no-more-text">没有更多商品了</text>
      </view>

      <!-- 空状态 -->
      <view v-if="!loading && products.length === 0" class="empty-state">
        <text class="empty-text">暂无商品</text>
      </view>
    </scroll-view>
  </view>
</template>

<script lang="ts" setup>
import type { Product } from '@/api/category'
import { onMounted, ref } from 'vue'
import { getCategoryProducts, searchProducts } from '@/api/category'

definePage({
  style: {
    navigationStyle: 'custom',
    navigationBarTitleText: '商品列表',
  },
})

// 响应式数据
const products = ref<Product[]>([])
const loading = ref(false)
const hasMore = ref(true)
const page = ref(1)
const categoryId = ref<number>()
const categoryName = ref('')
const sortBy = ref<'create_time' | 'price' | 'sales'>('create_time')
const sortOrder = ref<'asc' | 'desc'>('desc')

// 获取页面参数
const getPageParams = () => {
  const pages = getCurrentPages()
  const currentPage = pages[pages.length - 1]
  const options = (currentPage as any).options || {}

  if (options.categoryId) {
    categoryId.value = Number.parseInt(options.categoryId)
  }
}

// 加载商品列表
const loadProducts = async (isRefresh = false) => {
  if (loading.value)
    return

  try {
    loading.value = true

    if (isRefresh) {
      page.value = 1
      products.value = []
      hasMore.value = true
    }

    let data
    // 根据分类Id判断，根据分类Id还是关键字搜索请求数据
    if (categoryId.value) {
      const res = await getCategoryProducts(categoryId.value, page.value, 10)
      data = res.data || []
      categoryName.value = res.data.category_name
    }
    else {
      const res = await searchProducts({
        page: page.value,
        per_page: 10,
        sort_by: sortBy.value,
        sort_order: sortOrder.value
      })
      data = res.data
    }

    if (isRefresh) {
      products.value = data.data || data.products || []
    }
    else {
      products.value.push(...(data.data || data.products || []))
    }

    hasMore.value = page.value < (data.pages || 1)
  }
  catch (error) {
    console.error('加载商品失败:', error)
    uni.showToast({
      title: '加载失败',
      icon: 'error'
    })
  }
  finally {
    loading.value = false
  }
}

// 加载更多
const loadMore = () => {
  if (hasMore.value && !loading.value) {
    page.value++
    loadProducts()
  }
}

// 设置排序方式
const setSortBy = (sort: 'create_time' | 'price' | 'sales') => {
  sortBy.value = sort
  if (sort !== 'price') {
    sortOrder.value = 'desc'
  }
  loadProducts(true)
}

// 切换价格排序
const togglePriceSort = () => {
  if (sortBy.value === 'price') {
    sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc'
  }
  else {
    sortBy.value = 'price'
    sortOrder.value = 'asc'
  }
  loadProducts(true)
}

// 返回上一页
const goBack = () => {
  uni.navigateBack()
}

// 跳转到商品详情
const goToDetail = (productId: number) => {
  uni.navigateTo({
    url: `/pages/product/detail?id=${productId}`
  })
}

// 页面加载
onMounted(() => {
  getPageParams()
  loadProducts(true)
})
</script>

<style scoped>
.product-list-page {
  background-color: #f8f6f0;
  height: 100vh;
  display: flex;
  flex-direction: column;
}

/* 导航栏 */
.nav-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20rpx 32rpx;
  background: #ffffff;
  box-shadow: 0 2rpx 10rpx rgba(0, 0, 0, 0.05);
}

.nav-back {
  width: 60rpx;
  height: 60rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.back-icon {
  font-size: 36rpx;
  color: #2c2c2c;
}

.nav-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #2c2c2c;
}

.nav-right {
  width: 60rpx;
}

/* 筛选栏 */
.filter-bar {
  display: flex;
  background: #ffffff;
  border-bottom: 1rpx solid #f0f0f0;
}

.filter-item {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24rpx 0;
  font-size: 28rpx;
  color: #666666;
  position: relative;
}

.filter-item.active {
  color: #2c2c2c;
  font-weight: 600;
}

.sort-arrow {
  margin-left: 8rpx;
  font-size: 24rpx;
}

/* 商品列表 */
.product-scroll {
  flex: 1;
}

.product-grid {
  display: flex;
  flex-wrap: wrap;
  padding: 24rpx;
  justify-content: space-between;
}

.product-item {
  width: calc(50% - 12rpx);
  background: #ffffff;
  border-radius: 16rpx;
  overflow: hidden;
  margin-bottom: 24rpx;
  box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.08);
}

.product-image {
  width: 100%;
  height: 240rpx;
}

.product-info {
  padding: 20rpx;
}

.product-name {
  font-size: 26rpx;
  color: #2c2c2c;
  font-weight: 500;
  margin-bottom: 16rpx;
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.product-price-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.product-price {
  font-size: 28rpx;
  color: #e74c3c;
  font-weight: 600;
}

.product-sales {
  font-size: 22rpx;
  color: #999999;
}

/* 加载状态 */
.load-more,
.no-more,
.empty-state {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 40rpx 0;
}

.load-text,
.no-more-text,
.empty-text {
  font-size: 26rpx;
  color: #999999;
}
</style>
