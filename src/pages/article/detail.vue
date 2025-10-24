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
            <text class="article-author">{{ (article.author as any)?.nickname || '匿名' }}</text>
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
          ref="commentRef"
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
import { onShow } from '@dcloudio/uni-app'
import { computed, onMounted, ref } from 'vue'
import { getArticleDetail } from '@/api/article'
import { checkFavorite, FavoriteType, toggleFavorite as toggleFavoriteApi } from '@/api/favorite'
import CommentSystem from '@/components/CommentSystem.vue'
import { useTokenStore } from '@/store/token'
import { useUserStore } from '@/store/user'

// 扩展 Article 类型以包含点赞数
interface ExtendedArticle extends Article {
  likes?: number
  nickname?: string
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
  if (!dateString)
    return ''
  let date: Date

  if (typeof dateString === 'number') {
    // 时间戳（毫秒/秒）兼容
    const ts = dateString > 1e12 ? dateString : dateString * 1000
    date = new Date(ts)
  }
  else {
    let ds = String(dateString).trim()

    // 情况1：常见 "yyyy-MM-dd HH:mm:ss" 改为 "yyyy/MM/dd HH:mm:ss"（iOS支持）
    if (/^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}(?::\d{2})?$/.test(ds)) {
      ds = ds.replace(/-/g, '/')
    }

    let d = new Date(ds)

    // 情况2：如果替换后仍解析失败，尝试 ISO 格式 "yyyy-MM-ddTHH:mm:ss"
    if (Number.isNaN(d.getTime())) {
      if (ds.includes(' ')) {
        ds = ds.replace(' ', 'T')
      }
      d = new Date(ds)
    }

    date = d
  }
  console.log('iOS 支持的时间格式:', date)
  if (Number.isNaN(date.getTime()))
    return ''

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
    commentRef.value?.refresh?.()
  }
  catch (error) {
    console.error('获取文章详情失败:', error)
    loading.value = false
    //   article.value = {
    //   "author": {
    //     "avatar": "http://127.0.0.1:5050/static/temp/JOSggVOxfWlNd5J.thumb.1000_0.jpg",
    //     "description": "ctO98WvOUD",
    //     "id": 1,
    //     "nickname": "\u54f2\u5f1f"
    //   },
    //   "category": {
    //     "id": 12,
    //     "name": "\u52a8\u6f2b\u5c0f\u8bf4"
    //   },
    //   "comment_count": null,
    //   "comment_statistics": {
    //     "reply_comments": 6,
    //     "root_comments": 3,
    //     "total_comments": 9,
    //     "total_likes": "3"
    //   },
    //   "content": "<p><span style=\"color: rgb(51, 51, 51); background-color: rgb(255, 255, 255); font-size: 14px;\">\u52a8\u753b\u300a\u72d0\u5996\u5c0f\u7ea2\u5a18\u300b\u6539\u7f16\u81ea\u5c0f\u65b0\u521b\u4f5c\u7684\u540c\u540d\u6f2b\u753b\u4f5c\u54c1</span><span style=\"color: rgb(51, 51, 51); background-color: rgb(255, 255, 255); font-size: 14px;\"><sup><em> [1]</em></sup></span><span style=\"color: rgb(51, 51, 51); background-color: rgb(255, 255, 255); font-size: 14px;\">\u3002\u4f5c\u54c1\u4e3b\u8981\u8bb2\u8ff0\u4e86\u4ee5\u7ea2\u5a18\u4e3a\u804c\u4e1a\u7684\u72d0\u5996\u5728\u4e3a\u524d\u4e16\u604b\u4eba\u7275\u7ea2\u7ebf\u8fc7\u7a0b\u5f53\u4e2d\u53d1\u751f\u7684\u4e00\u7cfb\u5217\u6709\u8da3\u3001\u795e\u79d8\u7684\u6545\u4e8b</span><span style=\"color: rgb(51, 51, 51); background-color: rgb(255, 255, 255); font-size: 14px;\"><sup><em> [2]</em></sup></span><span style=\"color: rgb(51, 51, 51); background-color: rgb(255, 255, 255); font-size: 14px;\">\u3002</span></p><p><img src=\"https://pic.kts.g.mi.com/0b6f8c016b82e699588fe5a61f8685f99080080050210315033.png\" alt=\"\u72d0\u5996\u5c0f\u7ea2\u5a18\" data-href=\"\" style=\"\"/></p><p><strong>\u5386\u53f2</strong></p><p>\u300a\u72d0\u5996\u5c0f\u7ea2\u5a18\u300b\u662f\u4e2a\u5b8c\u5168\u67b6\u7a7a\u7684\u4e16\u754c\u3002</p><p>\u5f88\u4e45\u4ee5\u524d\uff0c\u4eba\u548c\u5996\u662f\u540c\u65f6\u671f\u8bde\u751f\u7684\u3002</p><p>\u4eba\u81ea\u8ba4\u4e3a\u662f\u4e07\u7269\u4e4b\u7075\uff0c\u800c\u5996\u4e5f\u8ba4\u4e3a\u81ea\u5df1\u662f\u5929\u751f\u7075\u7269\u3002</p><p>\u4eba\u7c7b\u5c06\u5996\u602a\u770b\u4f5c\u91ce\u517d\uff0c\u5996\u602a\u4e5f\u628a\u4eba\u7c7b\u770b\u4f5c\u52a8\u7269\uff0c\u6240\u4ee5\u96be\u514d\u53d1\u751f\u4e89\u7aef\u3002\u968f\u540e\uff0c\u4eba\u7c7b\u53d1\u73b0\u81ea\u5df1\u6253\u4e0d\u8fc7\u5996\u602a\uff0c\u5168\u529b\u4ee5\u8d74\u7684\u5996\u53d1\u73b0\u81ea\u5df1\u8eab\u4e0a\u6709\u4e00\u79cd\u795e\u79d8\u529b\u91cf\u3002\u4eba\u4eec\u79f0\u4e4b\u4e3a\u5996\u529b\u3002\u8fd9\u65f6\u5019\u9047\u89c1\u5996\u602a\uff0c\u4eba\u7c7b\u53ea\u80fd\u843d\u8352\u800c\u9003\u3002</p><p>\u4e0d\u8fc7\uff0c\u4eba\u4eec\u53d1\u73b0\u4e86\u80fd\u591f\u6297\u51fb\u5996\u602a\u7684\u4e1c\u897f\u2014\u2014\u6cd5\u5b9d\u3002</p><p>\u4eba\u7c7b\u53ef\u4ee5\u6b64\u6297\u51fb\u5996\u602a\u3002\u800c\u4e3a\u4e86\u5404\u81ea\u7684\u5229\u76ca\uff0c\u4eba\u548c\u5996\u8fdb\u5165\u4e86\u5168\u9762\u7684\u4ea4\u6218\u65f6\u4ee3\uff0c\u5929\u4e0b\u4e00\u7247\u8165\u98ce\u8840\u96e8\u3002</p><p>\u540e\u6765\uff0c\u5996\u754c\u548c\u4eba\u754c\u5404\u51fa\u73b0\u4e86\u4e00\u4f4d\u9886\u8896\uff0c\u4ed6\u4eec\u8ba4\u8bc6\u5230\u4e24\u754c\u65e9\u5df2\u538c\u5026\u8fd9\u79cd\u6beb\u65e0\u610f\u4e49\u7684\u6218\u6597\u3002\u4e8e\u662f\u6392\u9664\u4e07\u96be\uff0c\u4fc3\u4f7f\u4eba\u3001\u5996\u4e24\u754c\u7ed3\u6210\u4e86\u4e00\u4e2a\u548c\u5e73\u8054\u76df\uff0c\u4eba\u7c7b\u548c\u5996\u602a\u7ec8\u4e8e\u548c\u5e73\u5171\u5904\u3002<sup> [16]</sup></p><p><span style=\"color: rgb(44, 62, 80); background-color: rgba(255, 255, 255, 0.9); font-size: 14px;\">\u8fd9\u662f\u4e00\u4e2a\u4eba\u4e0e\u5996\u5171\u540c\u751f\u6d3b\uff0c\u53ef\u4ee5\u76f8\u604b\u3001\u76f8\u5b88\u7684\u4e16\u754c\u3002\u4f46\u4eba\u7684\u5bff\u547d\u767e\u5341\u5e74\uff0c\u5996\u7684\u5bff\u547d\u5343\u4e07\u5e74\uff0c\u5bff\u9650\u7684\u5dee\u8ddd\u8ba9\u5996\u53ea\u80fd\u770b\u7740\u81ea\u5df1\u7684\u604b\u4eba\u8001\u6b7b\u800c\u81ea\u5df1\u72ec\u6d3b\uff0c\u7a7a\u4f59\u60b2\u5207\u3002</span></p><p><span style=\"color: rgb(44, 62, 80); background-color: rgba(255, 255, 255, 0.9); font-size: 14px;\">\u4e3a\u4e86\u5f25\u8865\u8fd9\u4e00\u7f3a\u61be\uff0c\u5b9e\u529b\u5f3a\u5927\u7684\u6d82\u5c71\u72d0\u5996\u4e00\u65cf\u53d1\u660e\u4e86\u8f6c\u4e16\u7eed\u7f18\u7684\u6cd5\u672f\u2014\u2014\u53ea\u8981\u4eba\u4e0e\u5996\u5728\u82e6\u60c5\u5de8\u6811\u4e0b\u5171\u540c\u8bb8\u613f\uff0c\u5c31\u53ef\u4ee5\u7528\u5996\u7684\u529b\u91cf\u8ba9\u6b7b\u540e\u8f6c\u4e16\u7684\u4eba\u7c7b\u56de\u5fc6\u8d77\u81ea\u5df1\u7684\u90a3\u6bb5\u604b\u60c5\uff0c\u5bfb\u56de\u81ea\u5df1\u7684\u5f52\u5bbf\u3002\u4f5c\u4e3a\u604b\u60c5\u7684\u51ed\u8bc1\uff0c\u5de8\u6811\u4f1a\u5c06\u4eba\u5996\u5171\u540c\u6301\u6709\u7684\u201c\u6cd5\u5b9d\u201d\u4e00\u5206\u4e3a\u4e8c\uff0c\u5206\u522b\u5e26\u5728\u5996\u548c\u8f6c\u4e16\u4e4b\u540e\u7684\u4eba\u8eab\u4e0a\u3002\u800c\u8fd9\u6cd5\u5b9d\u6b63\u662f\u5f00\u542f\u4eba\u7c7b\u524d\u4e16\u8bb0\u5fc6\u7684\u94a5\u5319\u2014\u2014\u7eed\u7f18\u4e4b\u5319\u3002</span></p>",
    //   "description": "\u52a8\u753b\u300a\u72d0\u5996\u5c0f\u7ea2\u5a18\u300b\u6539\u7f16\u81ea\u5c0f\u65b0\u521b\u4f5c\u7684\u540c\u540d\u6f2b\u753b\u4f5c\u54c1 [1]\u3002\u4f5c\u54c1\u4e3b\u8981\u8bb2\u8ff0\u4e86\u4ee5\u7ea2\u5a18\u4e3a\u804c\u4e1a\u7684\u72d0\u5996\u5728\u4e3a\u524d\u4e16\u604b\u4eba\u7275\u7ea2\u7ebf\u8fc7\u7a0b\u5f53\u4e2d\u53d1\u751f\u7684\u4e00\u7cfb\u5217\u6709\u8da3\u3001\u795e\u79d8\u7684\u6545\u4e8b",
    //   "id": 23,
    //   "image": "https://pic.kts.g.mi.com/0b6f8c016b82e699588fe5a61f8685f99080080050210315033.png",
    //   "likes": null,
    //   "published_date": "2025-09-15 22:26:16",
    //   "tags": [
    //     {
    //       "color": "#ff4141",
    //       "description": "",
    //       "id": 7,
    //       "name": "\u70ed\u95e8\u63a8\u8350"
    //     }
    //   ],
    //   "title": "\u300a\u72d0\u5996\u5c0f\u7ea2\u5a18\u300b",
    //   "update_date": "2025-10-23 18:40:56",
    //   "views": 1604
    // }
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

onShow(async () => {
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
  padding: var(--status-bar-height) 32rpx 10rpx;
  /* padding: 30rpx 32rpx 10rpx; */
  background: #ffffff;
  box-shadow: 0 2rpx 10rpx rgba(0, 0, 0, 0.05);
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  height: 90rpx;
}

.nav-back {
  width: 60rpx;
  height: 60rpx;
  display: flex;
  align-items: center;
  justify-content: flex-start;
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
  padding-top: 140rpx; /* 为固定导航栏留出空间 */
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
