<template>
  <view class="favorite-page">
    <!-- 导航栏 -->
    <view class="nav-bar">
      <view class="nav-back" @tap="goBack">
        <text class="back-icon">←</text>
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
          v-for="(item, index) in articleList"
          :key="item.id + index"
          class="article-item"
          @tap="goToArticle(item)"
        >
          <image class="article-image" :src="item.item_detail?.image || item.item_image" mode="aspectFill" />
          <view class="article-content">
            <text class="article-title">{{ item.item_detail?.title || item.item_title }}</text>
            <view class="article-meta">
              <text class="article-author">{{ item.item_detail?.author?.nickname || '匿名' }}</text>
              <text class="article-date">{{ formatDate(item.created_at) }}</text>
            </view>
            <view class="article-stats">
              <text class="stats-item">{{ item.item_detail?.views || 0 }}人阅读</text>
            </view>
          </view>
          <view class="article-action" @tap.stop="removeFavoriteItem(item)">
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
          v-for="(item, index) in productList"
          :key="item.id + index"
          class="article-item"
          @tap="goToProduct(item)"
        >
          <image class="article-image" :src="item.item_detail?.main_image || item.item_image" mode="aspectFill" />
          <view class="article-content">
            <text class="article-title">{{ item.item_detail?.name || item.item_title }}</text>
            <view class="article-meta">
              <text class="product-price-text">¥{{ formatPrice(item.item_detail?.price || item.item_detail?.sale_price) }}</text>
              <text class="article-date">{{ formatDate(item.created_at) }}</text>
            </view>
            <view class="article-stats">
              <text class="stats-item">{{ item.item_detail?.sales || 0 }}人购买</text>
              <text v-if="item.item_detail?.stock" class="stats-item">库存: {{ item.item_detail.stock }}</text>
            </view>
          </view>
          <view class="article-action" @tap.stop="removeFavoriteItem(item)">
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

// 列表数据
const articleList = ref<FavoriteItem[]>([])
const productList = ref<FavoriteItem[]>([])

// 统计数据
const stats = reactive({
  total: 0,
  article: 0,
  product: 0
})

// 格式化日期
const formatDate = (dateString: string) => {
  if (!dateString)
    return ''
  const date = new Date(dateString)
  const now = new Date()
  const diff = now.getTime() - date.getTime()

  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  if (days === 0)
    return '今天收藏'
  if (days === 1)
    return '昨天收藏'
  if (days < 7)
    return `${days}天前收藏`

  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day} 收藏`
}

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
  page.value = 1
  hasMore.value = true

  if (tab === 'article' && articleList.value.length === 0) {
    // eslint-disable-next-line ts/no-use-before-define
    loadFavoriteList()
  }
  else if (tab === 'product' && productList.value.length === 0) {
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
      type: activeTab.value === 'article' ? FavoriteType.ARTICLE : FavoriteType.PRODUCT,
      page: page.value,
      per_page: limit
    })

    const newItems = res.data.favorites

    if (activeTab.value === 'article') {
      if (isRefresh) {
        articleList.value = newItems
      }
      else {
        articleList.value.push(...newItems)
      }
    }
    else {
      if (isRefresh) {
        productList.value = newItems
      }
      else {
        productList.value.push(...newItems)
      }
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
    uni.showModal({
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

// 跳转到文章详情
const goToArticle = (item: FavoriteItem) => {
  uni.navigateTo({
    url: `/pages/article/detail?id=${item.item_id}`
  })
}

// 跳转到商品详情
const goToProduct = (item: FavoriteItem) => {
  uni.navigateTo({
    url: `/pages/product/detail?id=${item.item_id}`
  })
}

// 页面加载
onMounted(() => {
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

/* 文章列表 */
.article-list {
  padding: 0 20rpx;
}

.article-item {
  display: flex;
  background: #ffffff;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 20rpx;
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.05);
}

.article-image {
  width: 160rpx;
  height: 120rpx;
  border-radius: 12rpx;
  margin-right: 20rpx;
}

.article-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.article-title {
  font-size: 28rpx;
  font-weight: 500;
  color: #2c2c2c;
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  margin-bottom: 16rpx;
}

.article-meta {
  display: flex;
  align-items: center;
  margin-bottom: 12rpx;
}

.article-author {
  font-size: 24rpx;
  color: #666666;
  margin-right: 20rpx;
}

.article-date {
  font-size: 22rpx;
  color: #999999;
}

.article-stats {
  display: flex;
  align-items: center;
}

.stats-item {
  font-size: 22rpx;
  color: #999999;
  margin-right: 20rpx;
}

.article-action {
  width: 60rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.action-icon {
  font-size: 32rpx;
  opacity: 0.6;
}

/* 商品列表 - 使用与文章相同的样式 */
.product-list {
  padding: 0 20rpx;
}

/* 商品价格特殊样式 */
.product-price-text {
  font-size: 26rpx;
  color: #e74c3c;
  font-weight: 600;
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
