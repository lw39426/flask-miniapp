<template>
  <view class="h-full">
    <CategorySkeleton v-if="loading && categories.length === 0" />
    <!-- <CategorySkeleton v-if="true" /> -->
    <view v-else class="category-page">
      <!-- 搜索栏 -->
      <view style="background: #ffffff; width: 100%; box-shadow: 0 2rpx 10rpx rgba(0, 0, 0, 0.05);">
        <NavBarSearch :fixed="false" bg-color="#e5e5e5" @click="goToSearch" />
      </view>

      <view class="category-content">
        <!-- 左侧分类导航 -->
        <view class="category-nav">
          <scroll-view class="nav-scroll" :scroll-y="true">
            <view
              v-for="(category, index) in categories"
              :key="index"
              class="nav-item"
              :class="{ active: currentCategory === index }"
              @tap="switchCategory(index)"
            >
              <text class="nav-text">{{ category.name }}</text>
            </view>
          </scroll-view>
        </view>

        <!-- 右侧子分类内容 -->
        <view class="category-detail">
          <scroll-view class="detail-scroll" :scroll-y="true">
            <!-- 加载状态 -->
            <view v-if="loading" class="loading-container">
              <text class="loading-text">加载中...</text>
            </view>
            <!-- 分类横幅 -->
            <view v-if="currentCategoryData.id && currentCategoryData.imageUrl" class="category-banner">
              <image
                class="banner-image"
                :src="currentCategoryData.imageUrl"
                mode="aspectFill"
                @tap="onBannerTap"
              />
            </view>

            <!-- 子分类网格 -->
            <view v-if="currentCategoryData.children.length > 0" class="subcategory-section">
              <text class="section-title">全部分类</text>
              <view class="subcategory-grid">
                <view
                  v-for="(sub, index) in currentCategoryData.children"
                  :key="sub.id + index"
                  class="subcategory-item"
                  @tap="goToSubCategory(sub)"
                >
                  <image class="subcategory-image" :src="sub.imageUrl" mode="aspectFill" />
                  <text class="subcategory-name">{{ sub.name }}</text>
                </view>
              </view>
            </view>

            <!-- 热门商品瀑布流 -->
            <view v-if="currentCategoryData.id && hotProducts[currentCategoryData.id]?.length" class="hot-products-section">
              <text class="section-title">热门商品</text>

              <!-- 瀑布流容器 -->
              <view class="waterfall-container">
                <view v-for="(column, colIndex) in waterfallColumns" :key="colIndex" class="waterfall-column">
                  <view
                    v-for="product in column"
                    :key="product.id"
                    class="waterfall-item"
                    @tap="goToProduct(product)"
                  >
                    <image
                      class="waterfall-image"
                      :src="product.main_image"
                      mode="widthFix"
                      @load="onImageLoad"
                      @error="onImageError"
                    />
                    <view class="waterfall-info">
                      <text class="waterfall-title">{{ product.name }}</text>
                      <view class="waterfall-price-row">
                        <text class="waterfall-price">¥{{ product.price }}</text>
                        <text v-if="product.sales" class="waterfall-sales">已售{{ product.sales }}</text>
                      </view>
                    </view>
                  </view>
                </view>
              </view>
            </view>
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
import CategorySkeleton from './components/CategorySkeleton.vue'

definePage({
  style: {
    navigationStyle: 'custom',
    navigationBarTitleText: '分类',
  },
})

// 响应式数据
const currentCategory = ref(0)
const categories = ref<Category[]>([])
const loading = ref(true)
const hotProducts = ref<Record<number, Product[]>>({})
const waterfallColumns = ref<Product[][]>([[], []]) // 瀑布流数据
const columnHeights = ref<number[]>([0, 0])
const imageLoadCount = ref(0)
const totalImages = ref(0)

// 计算属性
const currentCategoryData = computed(() => {
  const category = categories.value[currentCategory.value]
  return category || { id: 0, name: '', imageUrl: '', children: [] }
})

// 获取分类列表
const loadCategories = async () => {
  try {
    loading.value = true
    const res = await getCategoryList()
    console.log('分类列表:', res.data)
    categories.value = res.data

    // 加载第一个分类的热门商品
    if (res.data.length > 0) {
      // eslint-disable-next-line ts/no-use-before-define
      await loadHotProducts(res.data[0].id)
    }
  }
  catch (error) {
    console.error('获取分类列表失败:', error)
    uni.showToast({
      title: '获取分类失败',
      icon: 'error'
    })
  }
  finally {
    loading.value = false
  }
}

// 获取热门商品
const loadHotProducts = async (categoryId: number) => {
  try {
    const res = await getCategoryProducts(categoryId, 1, 6)
    hotProducts.value[categoryId] = res.data.data
    // 布局瀑布流
    // eslint-disable-next-line ts/no-use-before-define
    layoutWaterfall(res.data.data)
  }
  catch (error) {
    console.error('获取热门商品失败:', error)
  }
}

// 商品高度估算
const estimateItemHeight = (product: Product): number => {
  // 基础信息区域高度 (padding + title + price + sales)
  const baseInfoHeight = 20 + 26 * 2 + 12 + 28 + 8 + 22 + 20 // rpx

  // 图片高度估算 (基于宽高比，假设图片宽度为 (750-48-16)/2 = 343rpx)
  const imageWidth = 343

  // 使用商品ID生成相对固定的宽高比
  const seed = product.id || Math.random()
  const normalizedSeed = (seed % 100) / 100
  const aspectRatio = 1.1 + normalizedSeed * 0.9 // 宽高比范围 1.1-2.0

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

    // 找到当前高度最小的列
    const shortestColumnIndex = heights[0] <= heights[1] ? 0 : 1

    columns[shortestColumnIndex].push(product)
    heights[shortestColumnIndex] += itemHeight
  })

  waterfallColumns.value = columns
  columnHeights.value = heights
  totalImages.value = productList.length
  imageLoadCount.value = 0
}

// 图片加载完成事件
const onImageLoad = () => {
  imageLoadCount.value++
}

// 图片加载错误处理
const onImageError = () => {
  imageLoadCount.value++
}

// 查看更多商品
const viewMoreProducts = () => {
  const category = currentCategoryData.value
  if (category && category.id) {
    uni.navigateTo({
      url: `/pages/product/list?categoryId=${category.id}`
    })
  }
}

// 切换分类
const switchCategory = async (index: number) => {
  currentCategory.value = index
  const category = categories.value[index]

  // 如果该分类还没有加载热门商品，则加载
  if (category && !hotProducts.value[category.id]) {
    await loadHotProducts(category.id)
  }
  else if (category && hotProducts.value[category.id]) {
    // 如果已有数据，重新布局瀑布流
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
  if (category && category.id) {
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

// 跳转到商品详情
const goToProduct = (product: Product) => {
  uni.navigateTo({
    url: `/pages/product/detail?id=${product.id}`
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
  background-color: #f8f6f0;
  height: 92vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* 搜索头部 */
/* .search-header {
  background: #ffffff;
  padding: 0 32rpx;
  box-shadow: 0 2rpx 10rpx rgba(0, 0, 0, 0.05);
}

.search-input-box {
  display: flex;
  align-items: center;
  background: #e5e5e5;
  border-radius: 999rpx;
  padding: 20rpx 24rpx;
  backdrop-filter: blur(6rpx);
}

.search-icon {
  margin-right: 12rpx;
  font-size: 28rpx;
}

.search-placeholder {
  color: #666;
  font-size: 26rpx;
} */

/* 分类内容 */
.category-content {
  flex: 1;
  display: flex;
  overflow: hidden;
  min-height: 0;
}

/* 左侧导航 */
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
  padding: 32rpx 24rpx;
  text-align: center;
  border-bottom: 1rpx solid #f8f8f8;
  position: relative;
}

.nav-item.active {
  background: #f8f6f0;
  color: #2c2c2c;
}

.nav-item.active::before {
  content: '';
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 6rpx;
  height: 40rpx;
  background: #2c2c2c;
  border-radius: 0 6rpx 6rpx 0;
}

.nav-text {
  font-size: 28rpx;
  color: #666666;
  font-weight: 500;
}

.nav-item.active .nav-text {
  color: #2c2c2c;
  font-weight: 600;
}

/* 右侧详情 */
.category-detail {
  flex: 1;
  background: #f8f6f0;
}

.detail-scroll {
  height: 100%;
}

/* 分类横幅 */
.category-banner {
  margin: 24rpx;
  border-radius: 16rpx;
  overflow: hidden;
}

.banner-image {
  width: 100%;
  height: 240rpx;
}

/* 子分类区块 */
.subcategory-section {
  padding: 0 24rpx;
}

.section-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #2c2c2c;
  margin: 32rpx 0 24rpx;
  display: block;
}

.subcategory-grid {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
}

.subcategory-item {
  width: calc(33.33% - 16rpx);
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 32rpx;
  background: #ffffff;
  border-radius: 16rpx;
  padding: 24rpx;
  box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.08);
}

.subcategory-image {
  width: 80rpx;
  height: 80rpx;
  border-radius: 40rpx;
  margin-bottom: 16rpx;
}

.subcategory-name {
  font-size: 24rpx;
  color: #2c2c2c;
  font-weight: 500;
  text-align: center;
}

/* 热门商品瀑布流 */
.hot-products-section {
  padding: 0 24rpx 98rpx;
}

/* 瀑布流容器 */
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
  box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.08);
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease;
}

.waterfall-item:active {
  transform: translateY(-2rpx);
  box-shadow: 0 8rpx 30rpx rgba(0, 0, 0, 0.12);
}

.waterfall-image {
  width: 100%;
  display: block;
  background-color: #f5f5f5;
  min-height: 200rpx;
}

.waterfall-info {
  padding: 20rpx;
}

.waterfall-title {
  font-size: 26rpx;
  color: #2c2c2c;
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
  color: #e74c3c;
  font-weight: 600;
}

.waterfall-sales {
  font-size: 22rpx;
  color: #666666;
}

/* 加载状态 */
.loading-container {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 100rpx 0;
}

.loading-text {
  font-size: 28rpx;
  color: #999999;
}
</style>
