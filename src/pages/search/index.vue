<template>
  <view class="search-page">
    <!-- 搜索栏 -->
    <view class="search-header">
      <view class="search-input-box">
        <view class="search-back" :class="{ mounted: showBackMounted, visible: showBack }" @tap="goBack">
          <text class="back-icon">←</text>
        </view>
        <input
          v-model="keyword"
          class="search-input"
          placeholder="搜商品/品牌/活动"
          focus
          @confirm="onSearch"
          @input="onInput"
        >
        <view v-if="keyword" class="search-btn" @tap="onSearch">
          <text class="search-text">搜索</text>
        </view>
      </view>
    </view>

    <!-- 搜索建议 -->
    <view v-if="showSuggestions && suggestions.length > 0" class="search-suggestions">
      <view
        v-for="(item, index) in suggestions"
        :key="index"
        class="suggestion-item"
        @tap="selectSuggestion(item)"
      >
        <text class="suggestion-icon">🔍</text>
        <text class="suggestion-text">{{ item }}</text>
      </view>
    </view>

    <!-- 搜索历史 -->
    <view v-if="!keyword && searchHistory.length > 0" class="search-history">
      <view class="history-header">
        <text class="history-title">搜索历史</text>
        <text class="clear-history" @tap="clearHistory">清空</text>
      </view>
      <view class="history-tags">
        <view
          v-for="(item, index) in searchHistory"
          :key="index"
          class="history-tag"
          @tap="selectHistory(item)"
        >
          <text class="tag-text">{{ item }}</text>
        </view>
      </view>
    </view>

    <!-- 热门搜索 -->
    <view v-if="!keyword" class="hot-search">
      <view class="hot-header">
        <text class="hot-title">热门搜索</text>
      </view>
      <view class="hot-tags">
        <view
          v-for="(item, index) in hotKeywords"
          :key="index"
          class="hot-tag"
          @tap="selectHotKeyword(item)"
        >
          <text class="tag-text">{{ item }}</text>
        </view>
      </view>
    </view>

    <!-- 搜索结果 -->
    <view v-if="showResults" class="search-results">
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
      <scroll-view class="result-scroll" scroll-y="true" @scrolltolower="loadMore">
        <view class="product-grid">
          <view
            v-for="product in searchResults"
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
          <text class="load-text">{{ loading ? '搜索中...' : '上拉加载更多' }}</text>
        </view>

        <!-- 没有更多 -->
        <view v-if="!hasMore && searchResults.length > 0" class="no-more">
          <text class="no-more-text">没有更多商品了</text>
        </view>

        <!-- 空状态 -->
        <view v-if="!loading && searchResults.length === 0 && hasSearched" class="empty-state">
          <text class="empty-text">没有找到相关商品</text>
        </view>
      </scroll-view>
    </view>
  </view>
</template>

<script lang="ts" setup>
import type { Product } from '@/api/category'
import { computed, nextTick, ref } from 'vue'
import { searchProducts } from '@/api/category'

definePage({
  style: {
    navigationStyle: 'custom',
    navigationBarTitleText: '搜索',
  },
})

// 响应式数据
const keyword = ref('')
const searchResults = ref<Product[]>([])
const searchHistory = ref<string[]>([])
const suggestions = ref<string[]>([])
const hotKeywords = ref(['T恤', '牛仔裤', '运动鞋', '连衣裙', '手机', '耳机'])
const loading = ref(false)
const hasMore = ref(true)
const page = ref(1)
const sortBy = ref<'create_time' | 'price' | 'sales'>('create_time')
const sortOrder = ref<'asc' | 'desc'>('desc')
const hasSearched = ref(false)

const showBack = ref(false)
const showBackMounted = ref(false)

// 计算属性
const showSuggestions = computed(() => keyword.value.length > 0 && !hasSearched.value)
const showResults = computed(() => hasSearched.value)

// 初始化搜索历史
const initSearchHistory = () => {
  try {
    const history = uni.getStorageSync('searchHistory')
    if (history) {
      searchHistory.value = JSON.parse(history)
    }
  }
  catch (error) {
    console.error('获取搜索历史失败:', error)
  }
}

// 保存搜索历史
const saveSearchHistory = (keyword: string) => {
  if (!keyword.trim())
    return

  const history = [...searchHistory.value]
  const index = history.indexOf(keyword)

  if (index > -1) {
    history.splice(index, 1)
  }

  history.unshift(keyword)

  // 最多保存10条历史记录
  if (history.length > 10) {
    history.splice(10)
  }

  searchHistory.value = history

  try {
    uni.setStorageSync('searchHistory', JSON.stringify(history))
  }
  catch (error) {
    console.error('保存搜索历史失败:', error)
  }
}

// 输入事件
const onInput = () => {
  if (keyword.value.trim()) {
    // 模拟搜索建议
    suggestions.value = hotKeywords.value.filter(item =>
      item.includes(keyword.value.trim())
    ).slice(0, 5)
  }
  else {
    suggestions.value = []
  }
  hasSearched.value = false
}

// 执行搜索
const onSearch = async (isRefresh = false) => {
  const searchKeyword = keyword.value.trim()
  if (!searchKeyword)
    return

  try {
    loading.value = true
    hasSearched.value = true

    if (isRefresh) {
      page.value = 1
      searchResults.value = []
      hasMore.value = true
    }

    const data = await searchProducts({
      keyword: searchKeyword,
      page: page.value,
      per_page: 10,
      sort_by: sortBy.value,
      sort_order: sortOrder.value
    })

    if (isRefresh) {
      searchResults.value = data.products
      saveSearchHistory(searchKeyword)
    }
    else {
      searchResults.value.push(...data.products)
    }

    hasMore.value = page.value < data.pages
  }
  catch (error) {
    console.error('搜索失败:', error)
    uni.showToast({
      title: '搜索失败',
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
    onSearch()
  }
}

// 选择搜索建议
const selectSuggestion = (item: string) => {
  keyword.value = item
  onSearch(true)
}

// 选择搜索历史
const selectHistory = (item: string) => {
  keyword.value = item
  onSearch(true)
}

// 选择热门关键词
const selectHotKeyword = (item: string) => {
  keyword.value = item
  onSearch(true)
}

// 清空搜索历史
const clearHistory = () => {
  uni.showModal({
    title: '提示',
    content: '确定要清空搜索历史吗？',
    success: (res) => {
      if (res.confirm) {
        searchHistory.value = []
        try {
          uni.removeStorageSync('searchHistory')
        }
        catch (error) {
          console.error('清空搜索历史失败:', error)
        }
      }
    }
  })
}

// 设置排序方式
const setSortBy = (sort: 'create_time' | 'price' | 'sales') => {
  sortBy.value = sort
  if (sort !== 'price') {
    sortOrder.value = 'desc'
  }
  onSearch(true)
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
  onSearch(true)
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
initSearchHistory()
nextTick(() => {
  // 第一步：进入时不占位；500ms 后开始占位（布局收缩），但保持透明
  setTimeout(() => {
    showBackMounted.value = true
    // 第二步：占位后短延迟触发淡入动画
    setTimeout(() => {
      showBack.value = true
    }, 50)
  }, 110)
})
</script>

<style scoped>
.search-page {
  background-color: #f8f6f0;
  height: 100vh;
  display: flex;
  flex-direction: column;
}

/* 搜索头部 */
.search-header {
  background: #ffffff;
  padding: 20rpx 32rpx;
  box-shadow: 0 2rpx 10rpx rgba(0, 0, 0, 0.05);
}

.search-input-box {
  display: flex;
  align-items: center;
  background: rgba(255, 255, 255, 0.9);
  border-radius: 999rpx;
  padding: 16rpx 0rpx;
  backdrop-filter: blur(6rpx);
}

.search-back {
  width: 0;
  height: 60rpx;
  display: none;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition:
    width 500ms ease-out,
    opacity 500ms ease;
}
.search-back.mounted {
  display: flex;
  width: 60rpx;
  opacity: 0;
}
.search-back.mounted.visible {
  opacity: 1;
}

.back-icon {
  font-size: 36rpx;
  color: #2c2c2c;
}

.search-input {
  flex: 1;
  height: 60rpx;
  font-size: 26rpx;
  background-color: #f4f4f4;
  padding: 0 20rpx;
}

.search-btn {
  padding: 0 20rpx;
}

.search-text {
  font-size: 28rpx;
  color: #2c2c2c;
  font-weight: 600;
}

/* 搜索建议 */
.search-suggestions {
  background: #ffffff;
  border-top: 1rpx solid #f0f0f0;
}

.suggestion-item {
  display: flex;
  align-items: center;
  padding: 24rpx 32rpx;
  border-bottom: 1rpx solid #f8f8f8;
}

.suggestion-icon {
  margin-right: 20rpx;
  font-size: 28rpx;
}

.suggestion-text {
  font-size: 28rpx;
  color: #2c2c2c;
}

/* 搜索历史 */
.search-history {
  background: #ffffff;
  margin: 20rpx 0;
  padding: 32rpx;
}

.history-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24rpx;
}

.history-title {
  font-size: 28rpx;
  font-weight: 600;
  color: #2c2c2c;
}

.clear-history {
  font-size: 26rpx;
  color: #999999;
}

.history-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
}

.history-tag {
  background: #f8f6f0;
  border-radius: 30rpx;
  padding: 12rpx 24rpx;
}

.tag-text {
  font-size: 26rpx;
  color: #2c2c2c;
}

/* 热门搜索 */
.hot-search {
  background: #ffffff;
  padding: 32rpx;
}

.hot-header {
  margin-bottom: 24rpx;
}

.hot-title {
  font-size: 28rpx;
  font-weight: 600;
  color: #2c2c2c;
}

.hot-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
}

.hot-tag {
  background: #f8f6f0;
  border-radius: 30rpx;
  padding: 12rpx 24rpx;
}

/* 搜索结果 */
.search-results {
  flex: 1;
  display: flex;
  flex-direction: column;
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

/* 结果滚动区域 */
.result-scroll {
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
