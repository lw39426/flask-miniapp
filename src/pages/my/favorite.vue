<template>
  <view class="favorite-page">
    <!-- 导航栏 -->
    <view class="nav-bar" :style="{ paddingTop: `${statusBarHeight}px` }">
      <view class="nav-back" @tap="goBack">
        <text class="back-icon i-carbon-arrow-left" />
      </view>
      <text class="nav-title">我的收藏</text>
      <view class="nav-right" />
    </view>

    <!-- Tab切换 -->
    <view class="tab-container">
      <view
        class="tab-item"
        :class="{ active: activeTab === 'article' }"
        @tap="switchTab('article')"
      >
        <text class="tab-text">文章收藏</text>
        <text v-if="stats.article > 0" class="tab-count">({{ stats.article }})</text>
      </view>
      <view
        class="tab-item"
        :class="{ active: activeTab === 'product' }"
        @tap="switchTab('product')"
      >
        <text class="tab-text">商品收藏</text>
        <text v-if="stats.product > 0" class="tab-count">({{ stats.product }})</text>
      </view>
    </view>

    <!-- 内容区域 -->
    <scroll-view class="content-scroll" :scroll-y="true" @scrolltolower="loadMore">
      <!-- 文章收藏列表 -->
      <view v-if="activeTab === 'article'" class="article-list">
        <view v-if="articleList.length === 0 && !loading" class="empty-state">
          <image class="empty-icon" src="/static/images/default-avatar.svg" mode="aspectFit" />
          <text class="empty-text">暂无文章收藏</text>
          <text class="empty-desc">去发现一些有趣的文章吧～</text>
        </view>

        <view
          v-for="item in articleList"
          :key="item.id"
          class="favorite-item article-card"
          @tap="goToArticle(item)"
        >
          <image class="favorite-image" :src="item.item_detail?.image || item.item_image" mode="aspectFill" />
          <view class="favorite-content">
            <text class="favorite-title">{{ item.item_detail?.title || item.item_title }}</text>
            <text v-if="item.item_description" class="favorite-desc">{{ item.item_description }}</text>
            <view class="favorite-meta">
              <text class="meta-author">{{ item.item_detail?.author?.nickname || '匿名' }}</text>
              <text class="meta-views">{{ item.item_detail?.views || 0 }}人阅读</text>
            </view>
            <text class="favorite-time">{{ formatRelativeTime(item.created_at) }}</text>
          </view>
          <view class="favorite-action" @tap.stop="removeFavoriteItem(item)">
            <text class="action-icon">🗑️</text>
          </view>
        </view>
      </view>

      <!-- 商品收藏列表 -->
      <view v-if="activeTab === 'product'" class="product-list">
        <view v-if="productList.length === 0 && !loading" class="empty-state">
          <image class="empty-icon" src="/static/images/default-avatar.svg" mode="aspectFit" />
          <text class="empty-text">暂无商品收藏</text>
          <text class="empty-desc">去挑选一些心仪的商品吧～</text>
        </view>

        <view
          v-for="item in productList"
          :key="item.id"
          class="favorite-item product-card"
          @tap="goToProduct(item)"
        >
          <image class="favorite-image" :src="item.item_detail?.main_image || item.item_image" mode="aspectFill" />
          <view class="favorite-content">
            <text class="favorite-title">{{ item.item_detail?.name || item.item_title }}</text>
            <view class="favorite-meta">
              <text class="product-price">¥{{ formatPrice(item.item_detail?.price || item.item_detail?.sale_price) }}</text>
              <text class="meta-sales">已售 {{ item.item_detail?.sales || 0 }}</text>
            </view>
            <view v-if="item.item_detail?.brand || item.item_detail?.category_name" class="product-tags">
              <text v-if="item.item_detail?.brand" class="tag">{{ item.item_detail.brand }}</text>
              <text v-if="item.item_detail?.category_name" class="tag">{{ item.item_detail.category_name }}</text>
            </view>
            <text class="favorite-time">{{ formatRelativeTime(item.created_at) }}</text>
          </view>
          <view class="favorite-action" @tap.stop="removeFavoriteItem(item)">
            <text class="action-icon">🗑️</text>
          </view>
        </view>
      </view>

      <!-- 加载更多 -->
      <view v-if="loading" class="loading-more">
        <text class="loading-text">加载中...</text>
      </view>

      <view v-if="!hasMore && (articleList.length > 0 || productList.length > 0)" class="no-more">
        <text class="no-more-text">没有更多了</text>
      </view>
    </scroll-view>
  </view>
</template>

<script lang="ts" setup>
import type { FavoriteItem } from '@/api/favorite'
import { onMounted, reactive, ref } from 'vue'
import { FavoriteType, getFavoriteList, getFavoriteStats, toggleFavorite } from '@/api/favorite'
import { showAppModal } from '@/components/AppModal'
import { formatRelativeTime } from '@/utils'

definePage({
  style: {
    navigationStyle: 'custom',
    navigationBarTitleText: '我的收藏',
  },
})

// 响应式数据
const activeTab = ref<'article' | 'product'>('article')
const loading = ref(false)
const hasMore = ref(true)
const page = ref(1)
const limit = 10
const statusBarHeight = ref(0)

// 列表数据
const articleList = ref<FavoriteItem[]>([])
const productList = ref<FavoriteItem[]>([])

// 统计数据
const stats = reactive({
  total: 0,
  article: 0,
  product: 0
})

// 格式化价格（分转元）
const formatPrice = (priceInCents?: number) => {
  if (!priceInCents || priceInCents === 0)
    return '0.00'
  return (priceInCents / 100).toFixed(2)
}

// 返回上一页
const goBack = () => {
  uni.navigateBack()
}

// 切换Tab
const switchTab = (tab: 'article' | 'product') => {
  if (activeTab.value === tab)
    return

  activeTab.value = tab
  // 两个列表已同时填充，仅当都为空时才重新加载
  if (articleList.value.length === 0 && productList.value.length === 0) {
    page.value = 1
    hasMore.value = true
    // eslint-disable-next-line ts/no-use-before-define
    loadFavoriteList()
  }
}

// 加载收藏列表
const loadFavoriteList = async (isRefresh = false) => {
  if (loading.value)
    return

  try {
    loading.value = true

    if (isRefresh) {
      page.value = 1
      hasMore.value = true
    }

    const res = await getFavoriteList({
      page: page.value,
      per_page: limit
    })

    const newItems = res.data.favorites

    // 按 item_type 分类，而非按当前 tab
    const articles = newItems.filter(i => i.item_type === 'article')
    const products = newItems.filter(i => i.item_type === 'product')

    if (isRefresh) {
      articleList.value = articles
      productList.value = products
    }
    else {
      articleList.value.push(...articles)
      productList.value.push(...products)
    }

    hasMore.value = res.data.pagination.has_next
    page.value++
  }
  catch (error) {
    console.error('加载收藏列表失败:', error)
    uni.showToast({
      title: '加载失败',
      icon: 'error'
    })
  }
  finally {
    loading.value = false
  }
}

// 加载统计数据
const loadStats = async () => {
  try {
    const res = await getFavoriteStats()
    Object.assign(stats, res.data)
  }
  catch (error) {
    console.error('加载统计数据失败:', error)
  }
}

// 加载更多
const loadMore = () => {
  if (!hasMore.value || loading.value)
    return
  loadFavoriteList()
}

// 取消收藏
const removeFavoriteItem = async (item: FavoriteItem) => {
  try {
    showAppModal({
      title: '提示',
      content: '确定要取消收藏吗？',
      success: async (res) => {
        if (res.confirm) {
          await toggleFavorite({
            item_type: item.item_type,
            item_id: item.item_id
          })

          // 从列表中移除
          if (item.item_type === FavoriteType.ARTICLE) {
            const index = articleList.value.findIndex(i => i.id === item.id)
            if (index > -1) {
              articleList.value.splice(index, 1)
              stats.article--
            }
          }
          else {
            const index = productList.value.findIndex(i => i.id === item.id)
            if (index > -1) {
              productList.value.splice(index, 1)
              stats.product--
            }
          }

          stats.total--

          uni.showToast({
            title: '已取消收藏',
            icon: 'success'
          })
        }
      }
    })
  }
  catch (error) {
    console.error('取消收藏失败:', error)
    uni.showToast({
      title: '操作失败',
      icon: 'error'
    })
  }
}

// 跳转到文章详情（优先使用 item_detail 中的 article_code）
const goToArticle = (item: FavoriteItem) => {
  const code = item.item_detail?.article_code || String(item.item_id)
  uni.navigateTo({
    url: `/pages/article/detail?article_code=${code}`
  })
}

// 跳转到商品详情（优先使用 item_detail 中的 code）
const goToProduct = (item: FavoriteItem) => {
  const code = item.item_detail?.code || String(item.item_id)
  uni.navigateTo({
    url: `/pages/product/detail?code=${code}`
  })
}

// 页面加载
onMounted(() => {
  // 获取状态栏高度
  const sysInfo = uni.getSystemInfoSync()
  statusBarHeight.value = sysInfo.statusBarHeight || 0

  loadStats()
  loadFavoriteList(true)
})
</script>

<style scoped>
.favorite-page {
  background-color: #f8f9fa;
  height: 100vh;
  display: flex;
  flex-direction: column;
}

/* 导航栏 */
.nav-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 88rpx;
  padding: 0 20rpx;
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
  font-weight: 500;
  color: #2c2c2c;
}

.nav-right {
  width: 60rpx;
}

/* Tab切换 */
.tab-container {
  display: flex;
  background: #ffffff;
  border-bottom: 1rpx solid #f0f0f0;
}

.tab-item {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24rpx 0;
  position: relative;
}

.tab-item.active {
  color: #2dcca7;
}

.tab-item.active::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 60rpx;
  height: 4rpx;
  background-color: #2dcca7;
  border-radius: 2rpx;
}

.tab-text {
  font-size: 28rpx;
  font-weight: 500;
}

.tab-count {
  font-size: 22rpx;
  margin-left: 8rpx;
  opacity: 0.7;
}

/* 内容区域 */
.content-scroll {
  flex: 1;
  padding: 0 0 20rpx;
}

/* 空状态 */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 120rpx 60rpx;
}

.empty-icon {
  width: 160rpx;
  height: 160rpx;
  opacity: 0.3;
  margin-bottom: 32rpx;
}

.empty-text {
  font-size: 32rpx;
  color: #666666;
  margin-bottom: 16rpx;
}

.empty-desc {
  font-size: 26rpx;
  color: #999999;
}

/* 收藏列表通用 */
.article-list,
.product-list {
  padding: 0 20rpx;
}

.favorite-item {
  display: flex;
  background: #ffffff;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 20rpx;
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.05);
}

.favorite-image {
  width: 160rpx;
  height: 160rpx;
  border-radius: 12rpx;
  margin-right: 20rpx;
  flex-shrink: 0;
}

.favorite-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.favorite-title {
  font-size: 28rpx;
  font-weight: 500;
  color: #2c2c2c;
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  margin-bottom: 8rpx;
}

.favorite-desc {
  font-size: 24rpx;
  color: #999;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-bottom: 8rpx;
}

.favorite-meta {
  display: flex;
  align-items: center;
  gap: 16rpx;
  margin-bottom: 8rpx;
}

.meta-author,
.meta-views,
.meta-sales {
  font-size: 22rpx;
  color: #999999;
}

.favorite-time {
  font-size: 22rpx;
  color: #bbb;
  margin-top: auto;
}

.favorite-action {
  width: 60rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.action-icon {
  font-size: 32rpx;
  opacity: 0.6;
}

/* 文章卡片 */
.article-card {
  border-left: 4rpx solid #1890ff;
}

/* 商品卡片 */
.product-card {
  border-left: 4rpx solid #e74c3c;
}

.product-price {
  font-size: 28rpx;
  color: #e74c3c;
  font-weight: 600;
}

.product-tags {
  display: flex;
  gap: 8rpx;
  margin-top: 8rpx;
}

.tag {
  font-size: 20rpx;
  color: #666;
  background: #f5f5f5;
  padding: 2rpx 12rpx;
  border-radius: 8rpx;
}

/* 加载状态 */
.loading-more {
  display: flex;
  justify-content: center;
  padding: 40rpx 0;
}

.loading-text {
  font-size: 26rpx;
  color: #999999;
}

.no-more {
  display: flex;
  justify-content: center;
  padding: 40rpx 0;
}

.no-more-text {
  font-size: 26rpx;
  color: #cccccc;
}
</style>
