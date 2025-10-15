<template>
  <view class="category-products-wrapper">
    <!-- 产品分类导航 -->
    <scroll-view
      :scroll-x="true"
      class="category-scroll-wrapper"
      :show-scrollbar="false"
      :enhanced="true"
      :bounces="false"
    >
      <view class="category-nav">
        <view
          v-for="(category, index) in categories"
          :key="category.id || index"
          class="category-item" :class="[{ active: activeCategory === category.id }]"
          @tap="handleCategorySwitch(category, index)"
        >
          <text>{{ category.name }}</text>
        </view>
      </view>
    </scroll-view>

    <!-- 分类商品瀑布流展示 -->
    <view class="category-products-section">
      <view class="section-header">
        <text class="section-title">{{ currentCategoryName }}分类</text>
        <text class="section-more" @tap="handleViewMore">查看更多</text>
      </view>
      <!-- 加载状态 -->
      <view v-if="loading" class="loading-state">
        <text class="loading-text">加载中...</text>
      </view>

      <!-- 瀑布流容器 -->
      <view v-else-if="waterfallColumns.length > 0 && waterfallColumns.some(col => col.length > 0)" class="waterfall-container">
        <view v-for="(column, colIndex) in waterfallColumns" :key="colIndex" class="waterfall-column">
          <view
            v-for="(item, index) in column"
            :key="item.id + index"
            class="waterfall-item"
            @tap="handleProductClick(item)"
          >
            <image
              class="waterfall-image"
              :src="item.image"
              mode="widthFix"
              :data-product-id="item.id"
              :data-column-index="colIndex"
              @load="onImageLoad"
              @error="onImageError"
            />
            <!-- 文字角标 -->
            <view
              class="corner-text-flag"
              :style="item.tags && item.tags.length ? { backgroundColor: item.tags[0].color } : {}"
            >
              {{ item.tags && item.tags.length ? (item.tags[0]?.name || '') : '' }}
            </view>
            <!-- 图片角标 -->
            <image
              v-if="false"
              class="corner-flag"
              src="/static/images/flag-new.png"
              mode="aspectFit"
            />
            <view class="waterfall-info">
              <text class="waterfall-title">{{ item?.name || '' }}</text>
              <view class="waterfall-price-row">
                <text class="waterfall-price">¥{{ item.sale_price || item.price }}</text>
                <text v-if="item.sale_price && item.price !== item.sale_price" class="waterfall-original-price">¥{{ item.price }}</text>
              </view>
              <text v-if="item.sales" class="waterfall-sales">已售{{ item.sales }}件</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 查看更多按钮 - 放在瀑布流底部 -->
      <!-- <view class="view-more-section" v-if="waterfallColumns.length > 0 && waterfallColumns.some(col => col.length > 0)">
        <view class="view-more-button" @tap="handleViewMore">
          <text class="view-more-text">查看更多</text>
          <text class="view-more-icon">→</text>
        </view>
      </view> -->

      <!-- 空状态 -->
      <view v-else class="empty-state">
        <text class="empty-text">暂无商品</text>
      </view>
    </view>
  </view>
</template>

<script lang="ts" setup>
import type { Product } from '@/api/home'
import { nextTick, onMounted, ref, watch } from 'vue'
import { getCategoryProducts } from '@/api/home'

// Props 定义
interface CategoryItem {
  id: number
  name: string
  icon?: string
  url?: string
}

interface Props {
  categories: CategoryItem[]
  defaultCategoryId?: number | null
}

const props = withDefaults(defineProps<Props>(), {
  defaultCategoryId: null
})

// Emits 定义
const emit = defineEmits<{
  categoryChange: [categoryId: number, categoryName: string]
  productClick: [product: Product]
  viewMore: [categoryId: number | null]
}>()

// 扩展Product接口，添加高度信息
interface ProductWithHeight extends Product {
  estimatedHeight?: number
  actualHeight?: number
}

// 状态定义
const activeCategory = ref<number | null>(props.defaultCategoryId)
const currentCategoryName = ref<string>('商品分类')
// 商品瀑布流数据
const waterfallColumns = ref<ProductWithHeight[][]>([[], []])
// 列高度
const columnHeights = ref<number[]>([0, 0])
const loading = ref<boolean>(false)
const imageLoadCount = ref<number>(0)
const totalImages = ref<number>(0)
const products = ref<ProductWithHeight[]>([])

/** 优化的商品卡片高度估算方法 */
const estimateItemHeight = (product: ProductWithHeight): number => {
  // 基础信息区域高度 (padding + title + price + sales)
  const baseInfoHeight = 20 + 26 * 2 + 12 + 28 + 8 + 22 + 20 // rpx

  // 图片高度估算 (基于宽高比，假设图片宽度为 (750-48-16)/2 = 343rpx)
  const imageWidth = 343

  // 使用商品ID生成相对固定的宽高比，避免每次随机导致的布局不稳定
  const seed = product.id || Math.random()
  const normalizedSeed = (seed % 100) / 100 // 转换为0-1之间的值
  const aspectRatio = 1.1 + normalizedSeed * 0.9 // 宽高比范围 1.1-2.0

  const imageHeight = imageWidth * aspectRatio

  // 根据商品名称长度调整标题区域高度
  const titleLength = product.name?.length || 10
  const titleLines = Math.ceil(titleLength / 12) // 估算标题行数
  const adjustedTitleHeight = Math.max(26 * titleLines, 52) // 至少2行高度

  // 总高度 = 图片估算高度 + 调整后的信息区域高度 + 边距
  const totalHeight = imageHeight + baseInfoHeight + (adjustedTitleHeight - 52) + 16

  product.estimatedHeight = totalHeight
  return totalHeight
}

/**
 * 优化的智能瀑布流布局算法
 * 通过更精确的高度估算和平衡策略，减少列间高度差异
 */
const layoutWaterfall = (productList: ProductWithHeight[]) => {
  // 如果没有数据，清空列数据和高度，并返回
  if (!productList.length) {
    waterfallColumns.value = [[], []]
    columnHeights.value = [0, 0]
    return
  }

  // 重置列数据和高度
  const columns: ProductWithHeight[][] = [[], []]
  const heights = [0, 0]

  // 先为所有商品预估高度，然后按高度排序优化分配
  const productsWithHeight = productList.map((product) => {
    const height = estimateItemHeight(product)
    return { ...product, estimatedHeight: height }
  })

  // 使用贪心算法：每次选择当前最短的列
  productsWithHeight.forEach((product) => {
    const itemHeight = product.estimatedHeight || 300

    // 找到当前高度最小的列
    const shortestColumnIndex = heights[0] <= heights[1] ? 0 : 1

    // 将商品添加到最短的列
    columns[shortestColumnIndex].push(product)
    heights[shortestColumnIndex] += itemHeight
  })

  // 设置瀑布流数据
  waterfallColumns.value = columns
  columnHeights.value = heights

  // 设置图片加载计数,用于计算是否全部加载完成
  totalImages.value = productList.length
  imageLoadCount.value = 0
}

// 重新布局瀑布流（当图片实际加载完成后）
const relayoutWaterfall = () => {
  if (!products.value.length)
    return

  // 使用实际高度重新布局，采用更智能的平衡算法
  const columns: ProductWithHeight[][] = [[], []]
  const heights = [0, 0]

  // 按实际高度排序，优先分配较高的商品以减少最终高度差
  const sortedProducts = [...products.value].sort((a, b) => {
    const heightA = a.actualHeight || a.estimatedHeight || 300
    const heightB = b.actualHeight || b.estimatedHeight || 300
    return heightB - heightA // 降序排列
  })

  sortedProducts.forEach((product) => {
    // 使用实际高度或估算高度
    const itemHeight = product.actualHeight || product.estimatedHeight || estimateItemHeight(product)

    // 找到当前高度最小的列
    const shortestColumnIndex = heights[0] <= heights[1] ? 0 : 1

    columns[shortestColumnIndex].push(product)
    heights[shortestColumnIndex] += itemHeight
  })

  // 重新按原始顺序排列每列中的商品（保持视觉连续性）
  const originalOrder = products.value.map(p => p.id)
  columns.forEach((column) => {
    column.sort((a, b) => {
      const indexA = originalOrder.indexOf(a.id)
      const indexB = originalOrder.indexOf(b.id)
      return indexA - indexB
    })
  })

  waterfallColumns.value = columns
  columnHeights.value = heights
}

// 图片加载完成事件
const onImageLoad = (event: any) => {
  imageLoadCount.value++

  // 获取图片实际尺寸并更新商品高度信息
  const { detail } = event
  if (detail && detail.height && detail.width) {
    const productId = event.target?.dataset?.productId
    const product = products.value.find(p => p.id === productId)

    if (product) {
      // 计算实际图片高度 (基于widthFix模式)
      const containerWidth = 343 // rpx，容器宽度
      const actualImageHeight = (detail.height / detail.width) * containerWidth
      const infoHeight = 20 + 26 * 2 + 12 + 28 + 8 + 22 + 20 // 信息区域高度

      product.actualHeight = actualImageHeight + infoHeight + 16
    }
  }

  // 当所有图片加载完成后，重新布局
  if (imageLoadCount.value >= totalImages.value) {
    nextTick(() => {
      relayoutWaterfall()
    })
  }
}

// 图片加载错误处理
const onImageError = (event: any) => {
  console.warn('图片加载失败:', event)
  imageLoadCount.value++

  // 即使图片加载失败，也要检查是否所有图片都处理完了
  if (imageLoadCount.value >= totalImages.value) {
    nextTick(() => {
      relayoutWaterfall()
    })
  }
}

// 模拟加载分类商品数据
const loadCategoryProducts = async (categoryId: number) => {
  loading.value = true

  try {
    // 这里应该调用真实的API
    const res = await getCategoryProducts(categoryId, { page: 1, limit: 6 })
    console.log('获取分类商品成功:', res)
    if (res.code !== 200) {
      throw new Error('获取分类商品成功')
    }
    // 没有缓存的image: `https://picsum.photos/300/${200 + Math.floor(Math.random() * 200)}?random=${categoryId * 100 + index}`,
    products.value = (res?.data?.products || [])
    layoutWaterfall(products.value)
  }
  catch (e: any) {
    console.error(e)
    uni.showToast({ title: e?.message || '加载分类商品失败', icon: 'none' })
    waterfallColumns.value = [[], []]
    columnHeights.value = [0, 0]
    products.value = []
    // 加载失败时，演示使用---
    // 临时模拟数据，增加更多样化的商品
    const mockProducts: ProductWithHeight[] = Array.from({ length: 6 }, (_, index) => ({
      id: categoryId * 100 + index,
      name: `${currentCategoryName.value}商品 ${index + 1} - ${['精选', '热销', '新品', '限时', '特价', '推荐'][index] || '优质'}`,
      price: Math.floor(Math.random() * 200) + 50,
      sale_price: Math.floor(Math.random() * 150) + 30,
      image: `https://picsum.photos/300/${200 + Math.floor(Math.random() * 200)}`,
      sales: Math.floor(Math.random() * 1000) + 10,
      stock: Math.floor(Math.random() * 100) + 1,
    }))
    products.value = mockProducts
    layoutWaterfall(mockProducts)
    // 加载失败时，演示使用----
  }
  finally {
    loading.value = false
  }
}

// 分类切换处理
const handleCategorySwitch = (category: CategoryItem, index: number) => {
  if (activeCategory.value === category.id)
    return // 避免重复切换

  activeCategory.value = category.id
  currentCategoryName.value = category.name
  loadCategoryProducts(category.id)
  emit('categoryChange', category.id, category.name)
}

// 商品点击处理
const handleProductClick = (product: Product) => {
  emit('productClick', product)
}

// 查看更多处理
const handleViewMore = () => {
  emit('viewMore', activeCategory.value)
}

// 监听分类变化
watch(() => props.categories, (newCategories) => {
  if (newCategories && newCategories.length > 0 && !activeCategory.value) {
    const firstCategory = newCategories[0]
    activeCategory.value = firstCategory.id
    currentCategoryName.value = firstCategory.name
    loadCategoryProducts(firstCategory.id)
  }
  else {
    // 演示时使用
    loadCategoryProducts(1)
  }
}, { immediate: true })

// 监听默认分类ID变化
watch(() => props.defaultCategoryId, (newId) => {
  if (newId && newId !== activeCategory.value) {
    const category = props.categories.find(c => c.id === newId)
    if (category) {
      handleCategorySwitch(category, 0)
    }
  }
})

// 组件挂载时初始化
onMounted(() => {
  if (props.categories.length > 0) {
    const defaultCategory = props.defaultCategoryId
      ? props.categories.find(c => c.id === props.defaultCategoryId)
      : props.categories[0]

    if (defaultCategory) {
      handleCategorySwitch(defaultCategory, 0)
    }
  }
})
</script>

<style scoped>
.category-products-wrapper {
  margin-top: 24rpx;
}

/* 产品分类导航样式 */
.category-scroll-wrapper {
  margin-bottom: 24rpx;
  white-space: nowrap;
}

.category-nav {
  display: flex;
  padding: 0 32rpx;
}

.category-item {
  flex-shrink: 0;
  padding: 16rpx 32rpx;
  margin-right: 24rpx;
  background: #f5f5f5;
  border-radius: 999rpx;
  font-size: 28rpx;
  color: #666;
  transition: all 0.3s ease;
  cursor: pointer;
}

.category-item.active {
  background: #2d63ff;
  color: #fff;
  transform: scale(1.05);
}

.category-item:last-child {
  margin-right: 0;
}

/* 分类商品瀑布流 */
.category-products-section {
  margin-top: 0;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 32rpx;
  margin-bottom: 24rpx;
}

.section-title {
  font-size: 36rpx;
  font-weight: 600;
  color: #2c2c2c;
}

.section-more {
  font-size: 24rpx;
  color: #666666;
  cursor: pointer;
}

/* 加载状态 */
.loading-state {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 200rpx;
}

.loading-text {
  font-size: 28rpx;
  color: #999999;
}

/* 瀑布流容器 */
.waterfall-container {
  display: flex;
  padding: 0 24rpx;
  gap: 16rpx;
  align-items: flex-start;
  min-height: 400rpx; /* 确保最小高度 */
}

.waterfall-column {
  flex: 1;
  display: flex;
  flex-direction: column;
  /* 添加最小高度平衡 */
  min-height: 200rpx;
}

/* 瀑布流底部平衡优化 */
.waterfall-container::after {
  content: '';
  flex: 0;
  width: 0;
  height: 0;
}

.waterfall-item {
  background: #ffffff;
  position: relative;
  border-radius: 16rpx;
  overflow: hidden;
  margin-bottom: 16rpx;
  box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.08);
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease;
  cursor: pointer;
}

.waterfall-item:hover {
  transform: translateY(-4rpx);
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
  margin-bottom: 8rpx;
}

.waterfall-price {
  font-size: 28rpx;
  color: #e74c3c;
  font-weight: 600;
  margin-right: 12rpx;
}

.waterfall-original-price {
  font-size: 22rpx;
  color: #999999;
  text-decoration: line-through;
}

.waterfall-sales {
  font-size: 22rpx;
  color: #666666;
}

/* 查看更多按钮 */
.view-more-section {
  padding: 16rpx 24rpx;
  display: flex;
  justify-content: center;
}

.view-more-button {
  background: linear-gradient(135deg, #2d63ff 0%, #1e4bd1 100%);
  color: #fff;
  padding: 24rpx 48rpx;
  border-radius: 999rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8rpx 24rpx rgba(45, 99, 255, 0.3);
  transition: all 0.3s ease;
  cursor: pointer;
  min-width: 200rpx;
}

.view-more-button:hover {
  transform: translateY(-2rpx);
  box-shadow: 0 12rpx 32rpx rgba(45, 99, 255, 0.4);
}

.view-more-text {
  font-size: 28rpx;
  font-weight: 500;
  margin-right: 12rpx;
}

.view-more-icon {
  font-size: 24rpx;
  transition: transform 0.3s ease;
}

.view-more-button:hover .view-more-icon {
  transform: translateX(4rpx);
}

/* 空状态 */
.empty-state {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 200rpx;
}

.empty-text {
  font-size: 28rpx;
  color: #999999;
}
/* 角标 */
/* 图片角标 */
.corner-flag {
  position: absolute;
  top: 10rpx;
  right: 10rpx;
  width: 60rpx; /* 想大就调 */
  height: 60rpx;
}
/* 文字角标 */
.corner-text-flag {
  position: absolute;
  top: 20rpx;
  left: 0;
  background: #ff4141;
  color: #fff;
  font-size: 20rpx;
  padding: 6rpx 8rpx;
  border-radius: 0 0 12rpx 0;
}

/* 响应式优化 */
@media (max-width: 750rpx) {
  .waterfall-container {
    padding: 0 16rpx;
    gap: 12rpx;
  }

  .waterfall-item {
    margin-bottom: 12rpx;
  }

  .waterfall-info {
    padding: 16rpx;
  }
}
</style>
