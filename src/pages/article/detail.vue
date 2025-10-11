<template>
  <view class="article-detail-page">
    <!-- 自定义导航栏 -->
    <view class="nav-bar">
      <view class="nav-back" @tap="goBack">
        <text class="back-icon">←</text>
      </view>
      <text class="nav-title">{{ navTitle }}</text>
      <view class="nav-actions">
        <text class="nav-action" @tap="shareArticle">分享</text>
      </view>
    </view>

    <scroll-view v-if="article" class="detail-scroll" :scroll-y="true" @scroll="scroll">
      <!-- 文章头部信息 -->
      <view id="article-header" class="article-header">
        <!-- 文章标题 -->
        <text id="article-title" class="article-title">{{ article.title }}</text>

        <!-- 文章元信息 -->
        <view class="article-meta">
          <view class="meta-left">
            <text class="article-author">{{ article.author?.nickname || 'Mrmao' }}</text>
            <text class="article-date">{{ formatDate(article.published_date) }}</text>
          </view>
          <view class="meta-right">
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
        <text class="tags-title">标签：</text>
        <view class="tags-list">
          <text
            v-for="(tag, index) in article.tags"
            :key="index"
            class="tag-item"
          >
            {{ tag.name }}
          </text>
        </view>
      </view>

      <!-- 相关文章推荐 -->
      <view v-if="relatedArticles.length > 0" class="related-articles">
        <text class="section-title">相关推荐</text>
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
          </view>
        </view>
      </view>

      <!-- 评论区域 -->
      <view class="comment-section">
        <CommentSystem
          :article-id="articleId!"
          :current-user="currentUser"
          @update-stats="updateCommentStats"
        />
      </view>
    </scroll-view>

    <!-- 加载状态 -->
    <view v-if="loading" class="loading-container">
      <text class="loading-text">加载中...</text>
    </view>

    <!-- 底部操作栏 -->
    <view v-if="article" class="bottom-bar">
      <view class="action-buttons">
        <button class="btn-like" @tap="toggleLike">
          <text class="btn-icon">{{ isLiked ? '❤️' : '🤍' }}</text>
          <text class="btn-text">{{ article.likes || 0 }}</text>
        </button>
        <button class="btn-favorite" @tap="toggleFavorite">
          <text class="btn-icon">{{ isFavorited ? '⭐' : '☆' }}</text>
          <text class="btn-text">收藏</text>
        </button>
        <button class="btn-comment" @tap="showComments">
          <text class="btn-icon">💬</text>
          <text class="btn-text">{{ commentStats?.total_comments || '评论' }}</text>
        </button>
        <button class="btn-share" @tap="shareArticle">
          <text class="btn-icon">📤</text>
          <text class="btn-text">分享</text>
        </button>
      </view>
    </view>
  </view>
</template>

<script lang="ts" setup>
import type { CommentStatistics } from '@/api/comment'
import type { Article } from '@/api/home'
import { computed, onMounted, ref } from 'vue'
import { getArticleDetail } from '@/api/article'
import { checkFavorite, FavoriteType, toggleFavorite as toggleFavoriteApi } from '@/api/favorite'
import CommentSystem from '@/components/CommentSystem.vue'
import { useTokenStore } from '@/store/token'
import { useUserStore } from '@/store/user'
import { processContent } from '@/utils/simpleMarkdown'

// 扩展 Article 类型以包含点赞数
interface ExtendedArticle extends Article {
  likes?: number
}

definePage({
  style: {
    navigationStyle: 'custom',
  },
})

// 响应式数据
const article = ref<ExtendedArticle>() // 文章详情数据
const relatedArticles = ref<Article[]>([]) // 相关推荐文章列表
const loading = ref(false)
const isLiked = ref(false)
const isFavorited = ref(false) // 收藏状态
const articleId = ref<number>()
const commentStats = ref<CommentStatistics>()
const navTitle = ref('文章详情') // 导航栏标题
const titleVisible = ref(true) // 文章标题是否可见

// 获取token store
const tokenStore = useTokenStore()

const userStore = useUserStore()
// 从用户状态管理中获取当前用户（未登录则为 null）
const currentUser = computed(() => {
  const u = userStore.userInfo
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
  return processContent(article.value.content)
})

// 格式化日期
const formatDate = (dateString: string) => {
  if (!dateString)
    return ''
  const date = new Date(dateString)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}年${month}月${day}日`
}

// 获取页面参数，向后端请求文章详情
const getPageParams = () => {
  const pages = getCurrentPages()
  const currentPage = pages[pages.length - 1]
  const options = (currentPage as any).options || {}

  if (options.id) {
    articleId.value = Number.parseInt(options.id)
  }
}

// 滚动事件处理
const scroll = (e: any) => {
  const scrollTop = e.detail.scrollTop

  // 获取文章标题元素的位置信息
  uni.createSelectorQuery().select('#article-title').boundingClientRect((rect) => {
    if (rect && !Array.isArray(rect)) {
      // 当文章标题滑出视窗顶部时（考虑导航栏高度）
      const navBarHeight = 88 // 导航栏高度（rpx转px大约44px * 2）
      const titleIsVisible = rect.bottom > navBarHeight

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
  }
  catch (error) {
    console.error('获取文章详情失败:', error)
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

// 跳转到文章详情
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

// 显示评论
const showComments = () => {
  // 滚动到评论区域
  uni.pageScrollTo({
    selector: '.comment-section',
    duration: 300
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
    uni.showModal({
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

// 页面加载
onMounted(() => {
  getPageParams()
  loadArticleDetail()
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
  padding: 20rpx 32rpx;
  background: #ffffff;
  box-shadow: 0 2rpx 10rpx rgba(0, 0, 0, 0.05);
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  height: 88rpx;
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
  max-width: 400rpx;
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

.nav-action {
  font-size: 28rpx;
  color: #007bff;
}

/* 详情滚动区域 */
.detail-scroll {
  flex: 1;
  padding-top: 120rpx; /* 为固定导航栏留出空间 */
  padding-bottom: 120rpx;
}

/* 文章头部 */
.article-header {
  padding: 24rpx 32rpx 16rpx;
  background: #ffffff;
}

.article-title {
  font-size: 40rpx;
  font-weight: 700;
  color: #2c2c2c;
  line-height: 1.4;
  margin-bottom: 14rpx;
  display: block;
}

.article-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.meta-left {
  display: flex;
  /* flex-direction: column; */
  align-items: center;
  gap: 10rpx;
}

.article-date {
  font-size: 24rpx;
  color: #999999;
}

.article-author {
  font-size: 26rpx;
  color: #666666;
  font-weight: 500;
}

.meta-right {
  display: flex;
  align-items: center;
}

.article-stats {
  font-size: 24rpx;
  color: #999999;
}

/* 文章内容 */
.article-content {
  padding: 0 32rpx 32rpx;
  border-top: 2rpx solid #f0f0f0;
  background: #ffffff;
}

.content-text {
  line-height: 1.8;
  font-size: 28rpx;
  color: #333333;
  word-break: break-word;
}

/* 文章标签 */
.article-tags {
  padding: 32rpx;
  background: #ffffff;
  border-top: 1rpx solid #f0f0f0;
}

.tags-title {
  font-size: 26rpx;
  color: #666666;
  margin-bottom: 16rpx;
  display: block;
}

.tags-list {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
}

.tag-item {
  padding: 8rpx 16rpx;
  background: #f8f9fa;
  color: #007bff;
  font-size: 24rpx;
  border-radius: 20rpx;
  border: 1rpx solid #e9ecef;
}

/* 评论区域 */
.comment-section {
  background: #f8f9fa;
}

/* 相关文章 */
.related-articles {
  padding: 32rpx;
  background: #f8f9fa;
}

.section-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #2c2c2c;
  margin-bottom: 24rpx;
  display: block;
}

.related-list {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.related-item {
  display: flex;
  background: #ffffff;
  border-radius: 12rpx;
  padding: 20rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.05);
}

.related-cover {
  width: 120rpx;
  height: 80rpx;
  border-radius: 8rpx;
  margin-right: 20rpx;
}

.related-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.related-title {
  font-size: 26rpx;
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
  padding: 0rpx 32rpx;
  box-shadow: 0 -2rpx 10rpx rgba(0, 0, 0, 0.1);
}

.action-buttons {
  display: flex;
  justify-content: space-around;
  align-items: center;
}

.btn-like,
.btn-favorite,
.btn-comment,
.btn-share {
  display: flex;
  /* flex-direction: column; */
  align-items: center;
  background: transparent;
  border: none;
  padding: 16rpx;
  border-radius: 12rpx;
  min-width: 100rpx;
}

.btn-like:active,
.btn-favorite:active,
.btn-comment:active,
.btn-share:active {
  background: #f8f9fa;
}

.btn-icon {
  font-size: 32rpx;
  margin-bottom: 8rpx;
}

.btn-text {
  font-size: 22rpx;
  color: #666666;
}

/* rich-text 内容样式优化 */
:deep(.content-text img) {
  max-width: 100% !important;
  height: auto !important;
  display: block;
  margin: 20rpx auto;
  border-radius: 12rpx;
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.1);
}

:deep(.content-text p) {
  margin: 16rpx 0 !important;
  line-height: 1.8 !important;
}

:deep(.content-text h1),
:deep(.content-text h2),
:deep(.content-text h3) {
  margin: 32rpx 0 16rpx 0 !important;
  font-weight: bold !important;
}

:deep(.content-text blockquote) {
  margin: 20rpx 0 !important;
  padding: 20rpx !important;
  background: #f8f9fa !important;
  border-left: 8rpx solid #007bff !important;
  border-radius: 0 12rpx 12rpx 0 !important;
}

:deep(.content-text pre) {
  overflow-x: auto !important;
  white-space: pre-wrap !important;
  word-break: break-all !important;
  margin: 20rpx 0 !important;
}
</style>
