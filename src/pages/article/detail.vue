<template>
  <view class="article-detail-page">
    <!-- 自定义导航栏 -->
    <view class="nav-bar" :style="{ paddingTop: `${safeAreaTop}px` }">
      <view class="nav-back" @tap="goBack">
        <view class="i-carbon-arrow-left text-[40rpx] text-[#2c2c2c]" />
      </view>
      <text class="nav-title">{{ navTitle }}</text>
      <view class="nav-actions">
        <!-- <text class="nav-action" @tap="shareArticle">分享</text> -->
      </view>
    </view>

    <scroll-view v-if="article" :style="{ paddingTop: `${navbarHeight}px` }" class="detail-scroll" :scroll-y="true" @scroll="scroll">
      <!-- 文章头部信息 -->
      <view id="article-header" class="article-header">
        <!-- 文章标题 -->
        <view class="mb-[20rpx] flex flex-row items-start justify-between gap-[20rpx]">
          <text id="article-title" class="article-title">{{ article.title }}</text>
          <view class="favorite-btn" @tap="toggleFavorite">
            <view :class="isFavorited ? 'i-carbon-star-filled text-[#f59e0b]' : 'i-carbon-star text-[#999]'" class="text-[44rpx]" />
          </view>
        </view>

        <!-- 文章元信息 -->
        <view class="article-meta">
          <view class="meta-left">
            <view class="author-avatar">
              <view class="i-carbon-user-avatar text-[32rpx] text-[#666]" />
            </view>
            <text class="article-author">{{ (article.author as any)?.nickname || '匿名' }}</text>
            <text class="meta-dot">·</text>
            <text class="article-date">{{ formatDate(article.published_date) }}</text>
          </view>
          <view class="meta-right">
            <view class="i-carbon-view text-[28rpx] text-[#999]" />
            <text class="article-stats">{{ article.views || Math.floor(Math.random() * 5000) + 1000 }}人已阅读</text>
          </view>
        </view>
      </view>

      <!-- 文章内容 -->
      <view class="article-content">
        <rich-text
          class="content-text"
          :nodes="processedContent"
        />
      </view>

      <!-- 文章标签 -->
      <view v-if="article.tags && article.tags.length > 0" class="article-tags">
        <view class="tags-header">
          <view class="i-carbon-tag text-[28rpx] text-[#666]" />
          <text class="tags-title">标签</text>
        </view>
        <view class="tags-list">
          <text
            v-for="(tag, index) in article.tags"
            :key="index"
            class="tag-item"
          >
            #{{ tag.name }}
          </text>
        </view>
      </view>

      <!-- 相关文章推荐 -->
      <view v-if="relatedArticles.length > 0" class="related-articles">
        <view class="related-header">
          <view class="i-carbon-list-boxes text-[32rpx] text-[#455293]" />
          <text class="section-title">相关推荐</text>
        </view>
        <view class="related-list">
          <view
            v-for="(relatedArticle, index) in relatedArticles"
            :key="index"
            class="related-item"
            @tap="goToArticle(relatedArticle)"
          >
            <image
              class="related-cover"
              :src="relatedArticle.image"
              mode="aspectFill"
            />
            <view class="related-content">
              <text class="related-title">{{ relatedArticle.title }}</text>
              <text class="related-date">{{ formatDate(relatedArticle.published_date) }}</text>
            </view>
            <view class="i-carbon-chevron-right text-[32rpx] text-[#ccc]" />
          </view>
        </view>
      </view>

      <!-- 评论区域 -->
      <view class="comment-section">
        <CommentSystem
          ref="commentRef"
          :article-id="articleId!"
          :current-user="currentUser"
          :likes="article?.likes"
          :is-liked="isLiked"
          @update-stats="updateCommentStats"
          @toggle-like="toggleLike"
          @share="shareArticle"
        />
      </view>
    </scroll-view>

    <!-- 加载状态 -->
    <view v-if="loading" class="loading-container">
      <text class="loading-text">加载中...</text>
    </view>
  </view>
</template>

<script lang="ts" setup>
import type { CommentStatistics } from '@/api/comment'
import type { Article } from '@/api/home'
import { onLoad, onShow } from '@dcloudio/uni-app'
import { computed, ref } from 'vue'
import { getArticleDetail } from '@/api/article'
import { checkFavorite, FavoriteType, toggleFavorite as toggleFavoriteApi } from '@/api/favorite'
import { showAppModal } from '@/components/AppModal'
import CommentSystem from '@/components/CommentSystem.vue'
import { useNavbar } from '@/hooks/useNavbar'
import { mockArticleDetail } from '@/mock/article'
import { useTokenStore } from '@/store/token'
import { useUserStore } from '@/store/user'

// 扩展 Article 类型以包含点赞数
interface ExtendedArticle extends Article {
  nickname?: string
  comment_statistics?: any
  category?: any
}

definePage({
  style: {
    navigationStyle: 'custom',
  },
})

// 导航栏适配
const { safeAreaTop, navbarHeight, menuButtonInfo, systemInfo } = useNavbar()

// 响应式数据
const article = ref<ExtendedArticle>() // 文章详情数据
const relatedArticles = ref<Article[]>([]) // 相关推荐文章列表
const loading = ref(false)
const isLiked = ref(false)
const isFavorited = ref(false) // 收藏状态
const articleId = ref<number>()
const commentStats = ref<CommentStatistics>()
const commentRef = ref<any>()
const navTitle = ref('文章详情') // 导航栏标题
const titleVisible = ref(true) // 文章标题是否可见

// 获取token store
const tokenStore = useTokenStore()
const lastLogin = ref(tokenStore.hasLogin)

const userStore = useUserStore()
// 从用户状态管理中获取当前用户（未登录则为 null）
const currentUser = computed(() => {
  const u = userStore.userInfo
  console.log('userInfo:', u)
  if (!u || !u.id)
    return null
  return {
    id: u.id as number,
    nickname: u.nickname || u.username || '用户',
    avatar: u.avatar
  }
})

// 计算属性
const processedContent = computed(() => {
  if (!article.value?.content)
    return ''
  return article.value.content
})

/**
 * 格式化日期（iOS 兼容）
 * 兼容 "yyyy-MM-dd HH:mm:ss" -> "yyyy/MM/dd HH:mm:ss"
 * 若仍不支持，退化为 ISO "yyyy-MM-ddTHH:mm:ss"
 */
const formatDate = (dateString: string | number) => {
  console.log('【formatDate】原始入参:', dateString, '类型:', typeof dateString)
  if (!dateString)
    return ''
  let date: Date

  if (typeof dateString === 'number') {
    // 时间戳（毫秒/秒）兼容
    const ts = dateString > 1e12 ? dateString : dateString * 1000
    console.log('【formatDate】识别为时间戳，转换后毫秒:', ts)
    date = new Date(ts)
  }
  else {
    let ds = String(dateString).trim()

    // 情况1：常见 "yyyy-MM-dd HH:mm:ss" 改为 "yyyy/MM/dd HH:mm:ss"（iOS支持）
    if (/^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}(?::\d{2})?$/.test(ds)) {
      ds = ds.replace(/-/g, '/')
      console.log('【formatDate】正则匹配 "-" 格式，替换后:', ds)
    }

    let d = new Date(ds)

    // 情况2：如果替换后仍解析失败，尝试 ISO 格式 "yyyy-MM-ddTHH:mm:ss"
    if (Number.isNaN(d.getTime())) {
      if (ds.includes(' ')) {
        ds = ds.replace(' ', 'T')
      }
      d = new Date(ds)
      console.log('【formatDate】第二次 new Date("', ds, '") 结果:', d, 'getTime:', d.getTime())
    }

    date = d
  }
  console.log('iOS 支持的时间格式:', date)
  if (Number.isNaN(date.getTime())) {
    console.warn('【formatDate】❌ 依旧无效，返回空串')
    return dateString || ''
  }
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}年${month}月${day}日`
}

// 滚动事件处理
const scroll = (e: any) => {
  const scrollTop = e.detail.scrollTop

  // 获取文章标题元素的位置信息
  uni.createSelectorQuery().select('#article-title').boundingClientRect((rect) => {
    if (rect && !Array.isArray(rect)) {
      // 当文章标题滑出视窗顶部时（考虑导航栏高度）
      const currentNavBarHeight = navbarHeight.value
      const titleIsVisible = rect.bottom > currentNavBarHeight

      if (titleIsVisible !== titleVisible.value) {
        titleVisible.value = titleIsVisible
        // eslint-disable-next-line ts/no-use-before-define
        updateNavTitle()
      }
    }
  }).exec()
}

// 更新导航栏标题
const updateNavTitle = () => {
  if (titleVisible.value) {
    navTitle.value = '文章详情'
  }
  else {
    navTitle.value = article.value?.title || '文章详情'
  }
}
// 加载相关文章
const loadRelatedArticles = async () => {
  try {
    // 先注释该方法
    // const res = await getRelatedArticles(articleId.value!, 3)
    relatedArticles.value = []
  }
  catch (error) {
    console.error('获取相关文章失败:', error)
  }
}
// 加载文章详情
const loadArticleDetail = async () => {
  if (!articleId.value)
    return

  try {
    loading.value = true
    const res = await getArticleDetail(articleId.value)
    // 扩展文章数据，添加点赞数
    article.value = {
      ...res.data,
      likes: res.data.likes || Math.floor(Math.random() * 100) + 10 // 模拟点赞数
    }

    // 检查收藏状态
    if (tokenStore.hasLogin) {
      // eslint-disable-next-line ts/no-use-before-define
      await checkFavoriteStatus()
    }

    // 初始化导航栏标题
    navTitle.value = '文章详情'
    // 加载相关文章
    await loadRelatedArticles()
    // commentRef.value?.refresh?.()
  }
  catch (error) {
    console.error('获取文章详情失败:', error)
    loading.value = false
    article.value = mockArticleDetail as any
    uni.showToast({
      title: '获取文章详情失败',
      icon: 'error'
    })
  }
  finally {
    loading.value = false
  }
}

// 返回上一页
const goBack = () => {
  uni.navigateBack()
}

// 跳转指定文章详情
const goToArticle = (targetArticle: Article) => {
  uni.navigateTo({
    url: `/pages/article/detail?id=${targetArticle.id}`
  })
}

// 切换点赞状态
const toggleLike = () => {
  isLiked.value = !isLiked.value
  if (article.value) {
    article.value.likes = (article.value.likes || 0) + (isLiked.value ? 1 : -1)
  }

  uni.showToast({
    title: isLiked.value ? '点赞成功' : '取消点赞',
    icon: 'success'
  })
}

// 分享文章
const shareArticle = () => {
  uni.showActionSheet({
    itemList: ['分享到微信', '分享到朋友圈', '复制链接'],
    success: (res) => {
      const actions = ['微信', '朋友圈', '复制链接']
      uni.showToast({
        title: `分享到${actions[res.tapIndex]}`,
        icon: 'success'
      })
    }
  })
}

// 检查收藏状态
const checkFavoriteStatus = async () => {
  if (!articleId.value || !tokenStore.hasLogin)
    return

  try {
    const res = await checkFavorite({
      item_type: FavoriteType.ARTICLE,
      item_id: articleId.value
    })
    isFavorited.value = res.data.is_favorited
  }
  catch (error) {
    console.error('检查收藏状态失败:', error)
  }
}

// 切换收藏状态
const toggleFavorite = async () => {
  if (!articleId.value)
    return

  // 检查登录状态
  if (!tokenStore.hasLogin) {
    showAppModal({
      title: '提示',
      content: '请先登录后再收藏文章',
      confirmText: '去登录',
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

  try {
    const res = await toggleFavoriteApi({
      item_type: FavoriteType.ARTICLE,
      item_id: articleId.value
    })

    isFavorited.value = res.data.is_favorited

    uni.showToast({
      title: res.data.is_favorited ? '收藏成功' : '已取消收藏',
      icon: 'success'
    })

    // 触发全局收藏状态变化事件
    uni.$emit('favoriteChanged', {
      type: 'article',
      id: articleId.value,
      is_favorited: res.data.is_favorited
    })
  }
  catch (error) {
    console.error('收藏操作失败:', error)
    uni.showToast({
      title: '操作失败，请重试',
      icon: 'error'
    })
  }
}

// 更新评论统计
const updateCommentStats = (stats: CommentStatistics) => {
  commentStats.value = stats
}
// 页面参数获取文章Id
const getPageParams = (options: any) => {
  if (options && options.id) {
    articleId.value = Number.parseInt(options.id)
  }
}

// 页面加载
onLoad((options) => {
  getPageParams(options)
  loadArticleDetail()
})

onShow(async () => {
  console.log('1234', systemInfo, menuButtonInfo.value, navbarHeight.value, safeAreaTop.value)
  // 从未登录返回后变为已登录，刷新页面数据
  if (!lastLogin.value && tokenStore.hasLogin) {
    await loadArticleDetail()
    await checkFavoriteStatus()
    await loadRelatedArticles()
  }
  lastLogin.value = tokenStore.hasLogin
})
</script>

<style scoped>
.article-detail-page {
  background-color: #ffffff;
  height: 100vh;
  display: flex;
  flex-direction: column;
}

/* 导航栏 */
.nav-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 32rpx 10rpx;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  box-shadow: 0 2rpx 10rpx rgba(0, 0, 0, 0.03);
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
}

.nav-back {
  width: 60rpx;
  height: 60rpx;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  border-radius: 50%;
  transition: background-color 0.2s ease;
}

.nav-back:active {
  background-color: rgba(0, 0, 0, 0.05);
}

.nav-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #2c2c2c;
  max-width: 360rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  transition: all 0.3s ease;
}

.nav-actions {
  width: 60rpx;
  display: flex;
  justify-content: flex-end;
}

.nav-share {
  width: 60rpx;
  height: 60rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: background-color 0.2s ease;
}

.nav-share:active {
  background-color: rgba(0, 0, 0, 0.05);
}

/* 详情滚动区域 */
.detail-scroll {
  flex: 1;
  /* padding-top: 166rpx; 为固定导航栏留出空间 */
  padding-bottom: 156rpx;
}

/* 文章头部 */
.article-header {
  padding: 32rpx;
  background: #ffffff;
}

.article-title {
  font-size: 44rpx;
  font-weight: 700;
  color: #1a1a1a;
  line-height: 1.4;
  display: block;
  letter-spacing: -0.5rpx;
}

.favorite-btn {
  flex-shrink: 0;
  width: 60rpx;
  height: 60rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: all 0.2s ease;
}

.favorite-btn:active {
  background-color: rgba(0, 0, 0, 0.05);
  transform: scale(0.95);
}

.article-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 20rpx;
  border-top: 1rpx solid #f5f5f5;
  margin-top: 20rpx;
}

.meta-left {
  display: flex;
  align-items: center;
  gap: 8rpx;
}

.author-avatar {
  width: 36rpx;
  height: 36rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f0f0f0;
  border-radius: 50%;
  margin-right: 4rpx;
}

.meta-dot {
  font-size: 24rpx;
  color: #ccc;
  margin: 0 4rpx;
}

.article-date {
  font-size: 24rpx;
  color: #999999;
}

.article-author {
  font-size: 26rpx;
  color: #455293;
  font-weight: 500;
}

.meta-right {
  display: flex;
  align-items: center;
  gap: 6rpx;
}

.article-stats {
  font-size: 22rpx;
  color: #999999;
}

/* 文章内容 */
.article-content {
  padding: 0 32rpx 40rpx;
  background: #ffffff;
}

.content-text {
  line-height: 1.8;
  font-size: 30rpx;
  color: #333333;
  word-break: break-word;
  letter-spacing: 0.3rpx;
}

/* 文章标签 */
.article-tags {
  padding: 24rpx 32rpx 32rpx;
  background: #ffffff;
  border-top: 1rpx solid #f5f5f5;
}

.tags-header {
  display: flex;
  align-items: center;
  gap: 8rpx;
  margin-bottom: 16rpx;
}

.tags-title {
  font-size: 26rpx;
  color: #666666;
  font-weight: 500;
}

.tags-list {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
}

.tag-item {
  padding: 10rpx 20rpx;
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
  color: #455293;
  font-size: 24rpx;
  border-radius: 24rpx;
  border: none;
  transition: all 0.2s ease;
}

.tag-item:active {
  transform: scale(0.95);
  background: linear-gradient(135deg, #e9ecef 0%, #dee2e6 100%);
}

/* 评论区域 */
.comment-section {
  background: #f8f9fa;
  border-top: 1rpx solid #e5e7eb;
}

/* 相关文章 */
.related-articles {
  padding: 32rpx;
  background: #f8f9fa;
  border-top: 1rpx solid #e5e7eb;
}

.related-header {
  display: flex;
  align-items: center;
  gap: 10rpx;
  margin-bottom: 24rpx;
}

.section-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #2c2c2c;
}

.related-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.related-item {
  display: flex;
  align-items: center;
  background: #ffffff;
  border-radius: 16rpx;
  padding: 20rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.04);
  transition: all 0.2s ease;
}

.related-item:active {
  transform: scale(0.98);
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.08);
}

.related-cover {
  width: 160rpx;
  height: 100rpx;
  border-radius: 12rpx;
  margin-right: 20rpx;
  flex-shrink: 0;
}

.related-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  min-width: 0;
}

.related-title {
  font-size: 28rpx;
  color: #2c2c2c;
  font-weight: 500;
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.related-date {
  font-size: 22rpx;
  color: #999999;
  margin-top: 8rpx;
}

/* 加载状态 */
.loading-container {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
}

.loading-text {
  font-size: 28rpx;
  color: #999999;
}

/* 底部操作栏 */
.bottom-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: #ffffff;
  padding: 16rpx 32rpx;
  padding-bottom: calc(16rpx + env(safe-area-inset-bottom));
  box-shadow: 0 -2rpx 10rpx rgba(0, 0, 0, 0.05);
  z-index: 100;
}

.bottom-bar-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.input-box {
  flex: 1;
  background: #f5f5f5;
  height: 72rpx;
  border-radius: 36rpx;
  padding: 0 32rpx;
  display: flex;
  align-items: center;
  margin-right: 32rpx;
}

.placeholder {
  font-size: 28rpx;
  color: #999;
}

.action-icons {
  display: flex;
  align-items: center;
  gap: 32rpx;
}

.icon-item {
  display: flex;
  align-items: center;
  gap: 4rpx;
}

.icon-num {
  font-size: 38rpx;
  color: #666;
  font-weight: 500;
}
.icon-text {
  font-size: 26rpx;
  color: #666;
  font-weight: 500;
}

/* rich-text 内容样式优化 */
:deep(.content-text img) {
  max-width: 100% !important;
  height: auto !important;
  display: block;
  margin: 24rpx auto;
  border-radius: 16rpx;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.08);
}

:deep(.content-text p) {
  margin: 20rpx 0 !important;
  line-height: 1.8 !important;
  color: #333 !important;
}

:deep(.content-text h1),
:deep(.content-text h2),
:deep(.content-text h3) {
  margin: 40rpx 0 20rpx 0 !important;
  font-weight: 700 !important;
  color: #1a1a1a !important;
  line-height: 1.4 !important;
}

:deep(.content-text h1) {
  font-size: 40rpx !important;
}

:deep(.content-text h2) {
  font-size: 36rpx !important;
}

:deep(.content-text h3) {
  font-size: 32rpx !important;
}

:deep(.content-text blockquote) {
  margin: 24rpx 0 !important;
  padding: 24rpx 28rpx !important;
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%) !important;
  border-left: 6rpx solid #455293 !important;
  border-radius: 0 12rpx 12rpx 0 !important;
  color: #555 !important;
  font-style: italic !important;
}

:deep(.content-text pre) {
  overflow-x: auto !important;
  white-space: pre-wrap !important;
  word-break: break-all !important;
  margin: 24rpx 0 !important;
  padding: 24rpx !important;
  background: #1a1a1a !important;
  border-radius: 12rpx !important;
  color: #e8e0ff !important;
  font-size: 26rpx !important;
  line-height: 1.6 !important;
}

:deep(.content-text code) {
  background: #f0f0f0 !important;
  padding: 4rpx 10rpx !important;
  border-radius: 6rpx !important;
  font-size: 26rpx !important;
  color: #e74c3c !important;
}

:deep(.content-text a) {
  color: #455293 !important;
  text-decoration: underline !important;
  text-underline-offset: 4rpx !important;
}

:deep(.content-text ul),
:deep(.content-text ol) {
  margin: 20rpx 0 !important;
  padding-left: 40rpx !important;
}

:deep(.content-text li) {
  margin: 12rpx 0 !important;
  line-height: 1.7 !important;
}
</style>
