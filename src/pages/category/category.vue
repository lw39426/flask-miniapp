<template>
  <view class="h-full">
    <view class="category-page">
      <!-- 搜索栏 -->
      <view class="search-header">
        <NavBarSearch :fixed="false" bg-color="#f5f5f5" @click="goToSearch" />
      </view>

      <!-- 错误状态：分类列表加载失败，整个页面展示 -->
      <view v-if="navError" class="page-error-container">
        <view class="error-illustration">
          <text class="i-carbon-warning-filled rgb(106 105 103) text-120rpx" />
        </view>
        <text class="error-title">加载失败</text>
        <text class="error-desc">网络开小差了，请检查网络后重试</text>
        <view class="retry-btn retry-btn-primary" @tap="retryLoadCategories">
          <text class="i-carbon-renew text-28rpx" />
          <text class="retry-text">重新加载</text>
        </view>
      </view>

      <!-- 正常状态：分类内容区域 -->
      <view v-else class="category-content">
        <!-- 左侧分类导航 -->
        <view class="category-nav">
          <!-- 骨架屏：首次加载 -->
          <CategoryNavSkeleton v-if="navLoading && categories.length === 0" />

          <!-- 正常状态：分类列表 -->
          <scroll-view v-else class="nav-scroll" :scroll-y="true">
            <view
              v-for="(category, index) in categories"
              :key="index"
              class="nav-item"
              :class="{ active: currentCategory === index }"
              @tap="switchCategory(index)"
            >
              <view class="nav-indicator" />
              <text class="nav-text">{{ category.name }}</text>
            </view>
          </scroll-view>
        </view>

        <!-- 右侧子分类内容 -->
        <view class="category-detail">
          <!-- 骨架屏：详情加载中 -->
          <CategoryDetailSkeleton v-if="detailLoading && !hotProductsError" />

          <!-- 错误状态：热门商品加载失败 -->
          <view v-else-if="hotProductsError" class="detail-error-container">
            <view class="error-illustration">
              <text class="i-carbon-shopping-cart text-100rpx text-gray-300" />
            </view>
            <text class="error-title">商品加载失败</text>
            <text class="error-desc">无法获取热门商品，请检查网络</text>
            <view class="retry-btn retry-btn-primary" @tap="retryLoadHotProducts">
              <text class="i-carbon-renew text-28rpx" />
              <text class="retry-text">重新加载</text>
            </view>
          </view>

          <!-- 正常状态：详情内容 -->
          <scroll-view v-else class="detail-scroll" :scroll-y="true">
            <!-- 空状态：无分类数据 -->
            <view v-if="!currentCategoryData.id && categories.length === 0" class="empty-container">
              <view class="empty-illustration">
                <text class="i-carbon-folder-open text-100rpx text-gray-300" />
              </view>
              <text class="empty-title">暂无分类数据</text>
              <text class="empty-desc">请联系管理员添加分类</text>
              <view class="retry-btn" @tap="retryLoadCategories">
                <text class="i-carbon-renew text-28rpx" />
                <text class="retry-text">刷新试试</text>
              </view>
            </view>

            <template v-else>
              <!-- 分类横幅 -->
              <view v-if="currentCategoryData.id" class="category-banner">
                <!-- 骨架屏 -->
                <view
                  v-if="currentCategoryData.imageUrl && !bannerLoaded && !bannerError"
                  class="banner-skeleton"
                />

                <!-- 加载失败占位或无图片占位 -->
                <view
                  v-if="bannerError || !currentCategoryData.imageUrl"
                  class="banner-error"
                  @tap="currentCategoryData.imageUrl ? retryBannerImage() : null"
                >
                  <text class="i-carbon-image-search text-64rpx text-gray-400" />
                  <text class="mt-10rpx text-24rpx text-gray-400">
                    {{ bannerError ? '图片加载失败，点击重试' : '暂无分类图片' }}
                  </text>
                </view>

                <!-- 横幅图片 -->
                <image
                  v-if="currentCategoryData.imageUrl"
                  class="banner-image"
                  :class="{ 'opacity-0': !bannerLoaded }"
                  :src="currentCategoryData.imageUrl"
                  mode="aspectFill"
                  @load="onBannerLoad"
                  @error="onBannerError"
                  @tap="onBannerTap"
                />
                <!-- 横幅渐变遮罩 -->
                <view v-if="currentCategoryData.imageUrl && bannerLoaded" class="banner-overlay" />
              </view>

              <!-- 子分类网格 -->
              <view v-if="currentCategoryData.children.length > 0" class="subcategory-section">
                <view class="section-header">
                  <text class="section-title">全部分类</text>
                  <text class="section-subtitle">{{ currentCategoryData.children.length }}个子分类</text>
                </view>
                <view class="subcategory-grid">
                  <view
                    v-for="(sub, index) in currentCategoryData.children"
                    :key="sub.id + index"
                    class="subcategory-item"
                    @tap="goToSubCategory(sub)"
                  >
                    <view class="subcategory-image-wrapper">
                      <image class="subcategory-image" :src="sub.imageUrl" mode="aspectFill" />
                    </view>
                    <text class="subcategory-name">{{ sub.name }}</text>
                  </view>
                </view>
              </view>

              <!-- 热门商品为空 -->
              <view v-else-if="currentCategoryData.id && !hotProducts[currentCategoryData.id]?.length" class="empty-products-container">
                <view class="empty-illustration">
                  <text class="i-carbon-shopping-bag text-80rpx text-gray-300" />
                </view>
                <text class="empty-title">暂无热门商品</text>
                <text class="empty-desc">该分类下还没有商品</text>
              </view>

              <!-- 热门商品瀑布流 -->
              <view v-if="currentCategoryData.id && hotProducts[currentCategoryData.id]?.length" class="hot-products-section">
                <view class="section-header">
                  <text class="section-title">热门商品</text>
                  <text class="section-subtitle">为你推荐</text>
                </view>

                <!-- 瀑布流容器 -->
                <view class="waterfall-container">
                  <view v-for="(column, colIndex) in waterfallColumns" :key="colIndex" class="waterfall-column">
                    <view
                      v-for="product in column"
                      :key="product.id"
                      class="waterfall-item"
                      @tap="goToProduct(product)"
                    >
                      <view class="waterfall-image-wrapper">
                        <image
                          class="waterfall-image"
                          :src="product.main_image"
                          mode="widthFix"
                          @load="onImageLoad"
                          @error="onImageError"
                        />
                      </view>
                      <view class="waterfall-info">
                        <text class="waterfall-title">{{ product.name }}</text>
                        <view class="waterfall-price-row">
                          <text class="waterfall-price">
                            <text class="price-symbol">¥</text>{{ product.price }}
                          </text>
                          <text v-if="product.sales" class="waterfall-sales">已售{{ product.sales }}</text>
                        </view>
                      </view>
                    </view>
                  </view>
                </view>
              </view>
            </template>
          </scroll-view>
        </view>
      </view>
    </view>
  </view>
</template>

<script lang="ts" setup>
import type { Category, Product } from '@/api/category'
import { computed, onMounted, ref } from 'vue'
import { getCategoryList, getCategoryProducts } from '@/api/category'
import NavBarSearch from '@/components/NavBarSearch.vue'
import CategoryDetailSkeleton from './components/CategoryDetailSkeleton.vue'
import CategoryNavSkeleton from './components/CategoryNavSkeleton.vue'

definePage({
  style: {
    navigationStyle: 'custom',
    navigationBarTitleText: '分类',
  },
})

// 响应式数据
const currentCategory = ref(0)
const categories = ref<Category[]>([])
const navLoading = ref(true)
const detailLoading = ref(true)
const navError = ref(false)
const hotProductsError = ref(false)
const hotProducts = ref<Record<number, Product[]>>({})
const waterfallColumns = ref<Product[][]>([[], []]) // 瀑布流数据
const columnHeights = ref<number[]>([0, 0])
const imageLoadCount = ref(0)
const totalImages = ref(0)
const bannerLoaded = ref(false)
const bannerError = ref(false)

// 计算属性
const currentCategoryData = computed(() => {
  const category = categories.value[currentCategory.value]
  return category || { id: 0, name: '', imageUrl: '', children: [] }
})

// 横幅加载成功
const onBannerLoad = () => {
  bannerLoaded.value = true
  bannerError.value = false
}

// 横幅加载失败
const onBannerError = () => {
  bannerLoaded.value = false
  bannerError.value = true
}

// 重试加载横幅图片
const retryBannerImage = () => {
  bannerError.value = false
  bannerLoaded.value = false
}

// 商品高度估算
const estimateItemHeight = (product: Product): number => {
  // 基础信息区域高度 (padding + title + price + sales)
  const baseInfoHeight = 20 + 26 * 2 + 12 + 28 + 8 + 22 + 20

  // 图片高度估算 (基于宽高比，假设图片宽度为 (750-48-16)/2 = 343rpx)
  const imageWidth = 343

  // 使用商品ID生成相对固定的宽高比
  const seed = product.id || Math.random()
  const normalizedSeed = (seed % 100) / 100
  const aspectRatio = 1.1 + normalizedSeed * 0.9

  const imageHeight = imageWidth * aspectRatio

  // 根据商品名称长度调整标题区域高度
  const titleLength = product.name?.length || 10
  const titleLines = Math.ceil(titleLength / 12)
  const adjustedTitleHeight = Math.max(26 * titleLines, 52)

  return imageHeight + baseInfoHeight + (adjustedTitleHeight - 52) + 16
}
// 瀑布流布局
const layoutWaterfall = (productList: Product[]) => {
  if (!productList.length) {
    waterfallColumns.value = [[], []]
    columnHeights.value = [0, 0]
    return
  }

  const columns: Product[][] = [[], []]
  const heights = [0, 0]

  productList.forEach((product) => {
    const itemHeight = estimateItemHeight(product)
    const shortestColumnIndex = heights[0] <= heights[1] ? 0 : 1
    columns[shortestColumnIndex].push(product)
    heights[shortestColumnIndex] += itemHeight
  })

  waterfallColumns.value = columns
  columnHeights.value = heights
  totalImages.value = productList.length
  imageLoadCount.value = 0
}
// 获取热门商品
const loadHotProducts = async (categoryId: number) => {
  try {
    detailLoading.value = true
    hotProductsError.value = false
    const res = await getCategoryProducts(categoryId, { page: 1, pageSize: 6 })
    hotProducts.value[categoryId] = res.data.products
    layoutWaterfall(res.data.products)
  }
  catch (error) {
    console.error('获取热门商品失败:', error)
    hotProductsError.value = true
    detailLoading.value = false
  }
  finally {
    detailLoading.value = false
  }
}

// 获取分类列表
const loadCategories = async () => {
  try {
    navLoading.value = true
    navError.value = false
    detailLoading.value = true
    hotProductsError.value = false
    const res = await getCategoryList()
    categories.value = res.data
    navLoading.value = false

    // 加载第一个分类的热门商品
    if (res.data.length > 0) {
      await loadHotProducts(res.data[0].id)
    }
    else {
      detailLoading.value = false
    }
  }
  catch (error) {
    console.error('获取分类列表失败:', error)
    navLoading.value = false
    navError.value = true
    detailLoading.value = false
  }
}

// 重试加载分类列表
const retryLoadCategories = async () => {
  await loadCategories()
}

// 重试加载热门商品
const retryLoadHotProducts = async () => {
  const categoryId = currentCategoryData.value?.id
  if (categoryId) {
    await loadHotProducts(categoryId)
  }
}

// 图片加载完成事件
const onImageLoad = () => {
  imageLoadCount.value++
}

// 图片加载错误处理
const onImageError = () => {
  imageLoadCount.value++
}

// 切换分类
const switchCategory = async (index: number) => {
  currentCategory.value = index
  const category = categories.value[index]

  // 重置横幅加载状态
  bannerLoaded.value = false
  bannerError.value = false

  // 如果该分类还没有加载热门商品，则加载
  if (category && !hotProducts.value[category.id]) {
    await loadHotProducts(category.id)
  }
  else if (category?.id && hotProducts.value[category.id]) {
    layoutWaterfall(hotProducts.value[category.id])
  }
}

// 跳转到搜索页面
const goToSearch = () => {
  uni.navigateTo({
    url: '/pages/search/index'
  })
}

// 点击横幅
const onBannerTap = () => {
  const category = currentCategoryData.value
  if (category?.id) {
    uni.navigateTo({
      url: `/pages/product/list?categoryId=${category.id}`
    })
  }
}

// 跳转到子分类
const goToSubCategory = (sub: Category) => {
  uni.navigateTo({
    url: `/pages/product/list?categoryId=${sub.id}`
  })
}

const goToProduct = (product: Product) => {
  uni.navigateTo({
    url: `/pages/product/detail?code=${product.code}`
  })
}

// 页面加载时获取数据
onMounted(() => {
  // Initial load logic if needed
})
onShow(() => {
  loadCategories()
})
</script>

<style scoped>
.category-page {
  background-color: #fafafa;
  height: 92vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* 搜索头部 */
.search-header {
  background: #ffffff;
  padding: 0 24rpx;
  padding-bottom: 16rpx;
  box-shadow: 0 2rpx 16rpx rgba(0, 0, 0, 0.04);
}

/* ==================== 页面级错误状态 ==================== */
.page-error-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60rpx 60rpx;
  background: #fafafa;
}

.error-illustration {
  margin-bottom: 32rpx;
}

.error-title {
  font-size: 32rpx;
  color: #333333;
  font-weight: 600;
  margin-bottom: 12rpx;
}

.error-desc {
  font-size: 24rpx;
  color: #999999;
  margin-bottom: 40rpx;
  text-align: center;
  line-height: 1.6;
}

/* ==================== 重试按钮 ==================== */
.retry-btn {
  display: flex;
  align-items: center;
  gap: 8rpx;
  padding: 18rpx 40rpx;
  background: #ffffff;
  border: 1rpx solid #e5e5e5;
  border-radius: 999rpx;
  transition: all 0.3s ease;
}

.retry-btn:active {
  transform: scale(0.96);
  background: #f5f5f5;
}

.retry-btn-primary {
  background: #3a3a39;
}

.retry-btn-primary:active {
  transform: scale(0.96);
}

.retry-text {
  font-size: 26rpx;
  color: #666666;
  font-weight: 500;
}

.retry-btn-primary .retry-text {
  color: #ffffff;
}

/* 分类内容 */
.category-content {
  flex: 1;
  display: flex;
  overflow: hidden;
  min-height: 0;
}

/* ==================== 左侧导航 ==================== */
.category-nav {
  width: 200rpx;
  background: #ffffff;
  border-right: 1rpx solid #f0f0f0;
  flex-shrink: 0;
  height: 100%;
}

.nav-scroll {
  height: 100%;
}

.nav-item {
  padding: 32rpx 16rpx;
  text-align: center;
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  transition: all 0.3s ease;
}

.nav-indicator {
  width: 0;
  height: 0;
  border-radius: 0 4rpx 4rpx 0;
  background: transparent;
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.nav-item.active {
  background: linear-gradient(135deg, #fef9f0 0%, #fff5e6 100%);
}

.nav-item.active .nav-indicator {
  width: 6rpx;
  height: 36rpx;
  background: linear-gradient(180deg, #f59e0b 0%, #d97706 100%);
}

.nav-text {
  font-size: 26rpx;
  color: #666666;
  font-weight: 400;
  transition: all 0.3s ease;
  line-height: 1.4;
}

.nav-item.active .nav-text {
  color: #92400e;
  font-weight: 600;
}

/* ==================== 右侧详情 ==================== */
.category-detail {
  flex: 1;
  background: #fafafa;
}

.detail-scroll {
  height: 100%;
}

/* 详情错误状态 */
.detail-error-container {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60rpx 40rpx;
  background: #fafafa;
}

/* ==================== 空状态 ==================== */
.empty-container {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60rpx 40rpx;
}

.empty-illustration {
  margin-bottom: 24rpx;
}

.empty-products-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80rpx 40rpx;
}

.empty-title {
  font-size: 28rpx;
  color: #333333;
  font-weight: 600;
  margin-bottom: 8rpx;
}

.empty-desc {
  font-size: 22rpx;
  color: #999999;
  text-align: center;
}

/* ==================== 分类横幅 ==================== */
.category-banner {
  margin: 20rpx;
  height: 220rpx;
  border-radius: 20rpx;
  overflow: hidden;
  position: relative;
  background-color: #f2f2f2;
  box-shadow: 0 8rpx 32rpx rgba(0, 0, 0, 0.08);
}

.banner-skeleton {
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}

@keyframes shimmer {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}

.banner-error {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #f5f5f5 0%, #e8e8e8 100%);
}

.banner-image {
  width: 100%;
  height: 100%;
  transition:
    opacity 0.4s ease,
    transform 0.6s ease;
}

.banner-image:hover {
  transform: scale(1.02);
}

.banner-overlay {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 80rpx;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.15) 0%, transparent 100%);
  pointer-events: none;
}

/* ==================== 子分类区块 ==================== */
.subcategory-section {
  padding: 0 24rpx;
  margin-top: 8rpx;
}

.section-header {
  display: flex;
  align-items: baseline;
  gap: 12rpx;
  margin: 32rpx 0 24rpx;
}

.section-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #1a1a1a;
  letter-spacing: 0.5rpx;
}

.section-subtitle {
  font-size: 22rpx;
  color: #999999;
  font-weight: 400;
}

.subcategory-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
}

.subcategory-item {
  width: calc(33.33% - 11rpx);
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 24rpx 16rpx;
  background: #ffffff;
  border-radius: 16rpx;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.04);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  border: 1rpx solid transparent;
}

.subcategory-item:active {
  transform: scale(0.96);
  box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.08);
  border-color: #f59e0b;
}

.subcategory-image-wrapper {
  width: 80rpx;
  height: 80rpx;
  border-radius: 50%;
  overflow: hidden;
  margin-bottom: 16rpx;
  background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
  padding: 4rpx;
  box-shadow: 0 4rpx 12rpx rgba(245, 158, 11, 0.2);
}

.subcategory-image {
  width: 100%;
  height: 100%;
  border-radius: 50%;
}

.subcategory-name {
  font-size: 22rpx;
  color: #333333;
  font-weight: 500;
  text-align: center;
  line-height: 1.3;
}

/* ==================== 热门商品瀑布流 ==================== */
.hot-products-section {
  padding: 0 24rpx 98rpx;
  margin-top: 8rpx;
}

.waterfall-container {
  display: flex;
  gap: 16rpx;
  align-items: flex-start;
  min-height: 400rpx;
}

.waterfall-column {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 200rpx;
}

.waterfall-item {
  background: #ffffff;
  border-radius: 16rpx;
  overflow: hidden;
  margin-bottom: 16rpx;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.04);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  border: 1rpx solid #f5f5f5;
}

.waterfall-item:active {
  transform: translateY(-4rpx);
  box-shadow: 0 12rpx 36rpx rgba(0, 0, 0, 0.12);
}

.waterfall-image-wrapper {
  overflow: hidden;
  background-color: #f8f8f8;
}

.waterfall-image {
  width: 100%;
  display: block;
  min-height: 200rpx;
  transition: transform 0.5s ease;
}

.waterfall-item:active .waterfall-image {
  transform: scale(1.03);
}

.waterfall-info {
  padding: 20rpx 16rpx;
}

.waterfall-title {
  font-size: 24rpx;
  color: #1a1a1a;
  font-weight: 500;
  display: block;
  margin-bottom: 12rpx;
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.waterfall-price-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.waterfall-price {
  font-size: 28rpx;
  color: #dc2626;
  font-weight: 700;
  display: flex;
  align-items: baseline;
}

.price-symbol {
  font-size: 20rpx;
  font-weight: 600;
  margin-right: 2rpx;
}

.waterfall-sales {
  font-size: 20rpx;
  color: #999999;
  background: #f5f5f5;
  padding: 4rpx 10rpx;
  border-radius: 8rpx;
}
</style>
