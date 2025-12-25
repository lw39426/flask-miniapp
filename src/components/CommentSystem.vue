<template>
  <view class="comment-system">
    <!-- 评论统计 -->
    <view v-if="statistics" class="comment-stats">
      <text class="stats-title">评论: {{ statistics.total_comments }}条新评论</text>
    </view>
    <!-- 排序筛选 -->
    <sar-dropdown v-if="!isProduct">
      <sar-dropdown-item :options="options1" model-value="1" />
      <sar-dropdown-item :options="options2" model-value="1" />
    </sar-dropdown>
    <!-- 评论列表 -->
    <view v-if="comments.length > 0" class="comment-list">
      <CommentItem
        v-for="comment in comments" :key="comment.id" :comment="comment" :current-user="currentUser"
        @reply="handleReply" @like="handleLike" @delete="handleDelete"
      />
    </view>

    <!-- 空状态 -->
    <view v-else-if="!loading" class="empty-comments">
      <text class="empty-text">{{ isProduct ? '商品评论暂未开通，敬请期待 ^_^' : '暂无评论，快来发表第一条评论吧~' }}</text>
    </view>
    <!-- 未登录提示 -->
    <view v-if="!currentUser && !currentUser?.id" class="login-prompt">
      <text class="prompt-text">登录后可以发表评论...</text>
      <button class="login-btn" @tap="goToLogin">
        去登录
      </button>
    </view>
    <!-- 加载更多 -->
    <view v-if="pagination && pagination.has_next" class="load-more">
      <button class="load-more-btn" :disabled="loadingMore" @tap="loadMoreComments">
        {{ loadingMore ? '加载中...' : '加载更多' }}
      </button>
    </view>

    <!-- 加载状态 -->
    <view v-if="loading" class="loading">
      <text class="loading-text">加载中...</text>
    </view>

    <!-- 底部评论工具栏 -->
    <view v-if="!isProduct" class="comment-box" :style="{ bottom: `${keyboardHeight}px` }">
      <!-- 回复提示栏 -->
      <view v-if="replyTarget" class="reply-bar">
        <text class="reply-to">回复 @{{ replyTarget.user_nickname }}</text>
        <text class="cancel-reply-btn" @tap="cancelReply">取消</text>
      </view>

      <view class="toolbar-content">
        <!-- 左侧输入框 -->
        <view class="input-wrapper">
          <textarea
            v-model="commentContent"
            class="input-field"
            :maxlength="500"
            :placeholder="replyTarget ? `回复 @${replyTarget.user_nickname}...` : '爱评论的人运气都不差'"
            :adjust-position="false"
            :show-confirm-bar="false"
            :disable-default-padding="true"
            auto-height
            :focus="replyFocus"
            confirm-type="send"
            @focus="onFocus"
            @blur="onBlur"
            @confirm="submitComment"
          />
        </view>

        <!-- 图标栏 -->
        <view v-if="!commentContent.trim()" class="icon-bar">
          <view class="icon-item">
            <text class="icon-num">💬</text>
            <text class="icon-text">{{ statistics?.total_comments || 0 }}</text>
          </view>
          <view class="icon-item" @tap="emit('toggle-like')">
            <text class="icon-num">{{ isLiked ? '❤️' : '🤍' }}</text>
            <text class="icon-text">{{ likes || 0 }}</text>
          </view>
          <view class="icon-item" @tap="emit('share')">
            <text class="icon-num">📤</text>
          </view>
        </view>

        <!-- 发送按钮 -->
        <button v-else class="send-btn" :disabled="submitting" @click="submitComment">
          {{ submitting ? '...' : '发送' }}
        </button>
      </view>
    </view>
  </view>
</template>

<script lang="ts" setup>
import type { Comment, CommentListResponse, CommentStatistics } from '@/api/comment'
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { commentAPI } from '@/api/comment'
import { useNavbar } from '@/hooks/useNavbar'
import { useTokenStore } from '@/store/token'
import CommentItem from './CommentItem.vue'

interface Props {
  articleId?: number
  productId?: number
  currentUser?: {
    id: number
    nickname: string
    avatar: string
  } | null
  likes?: number
  isLiked?: boolean
}

interface Emits {
  (e: 'update-stats', stats: CommentStatistics): void
  (e: 'toggle-like'): void
  (e: 'share'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const tokenStore = useTokenStore()

// 导航栏适配
const { safeAreaBottom: hookSafeAreaBottom } = useNavbar()

// 响应式数据
const comments = ref<Comment[]>([])
const statistics = ref<CommentStatistics>()
const pagination = ref<CommentListResponse['pagination']>()
const loading = ref(false)
const loadingMore = ref(false)
const submitting = ref(false)
const commentContent = ref('')
const replyTarget = ref<Comment | null>(null)

const keyboardHeight = ref(0)
const replyFocus = ref(false)
const safeAreaBottom = ref(0)

const options1 = [
  {
    label: '按时间(新→旧)',
    value: '1',
  },
  {
    label: '按时间(旧→新)',
    value: '2',
  },
]
const options2 = [
  {
    label: '按点赞数(多→少)',
    value: '1',
  },
  {
    label: '按点赞数(少→多)',
    value: '2',
  },
]
// 点赞节流（前沿触发）：250ms 内忽略重复点击
const likeCooldown = new Map<number, number>()

// 计算属性
const currentPage = computed(() => pagination.value?.page || 1)
const isProduct = computed(() => props.productId != null && props.articleId == null)

// 加载评论列表，默认从第一页开始，append是否加载更多
const loadComments = async (page = 1, append = false) => {
  try {
    if (page === 1) {
      loading.value = true
    }
    else {
      loadingMore.value = true
    }

    if (isProduct.value) {
      // 商品评论暂未开通：直接降级，不发起请求
      if (page === 1) {
        loading.value = false
      }
      else {
        loadingMore.value = false
      }
      comments.value = []
      pagination.value = undefined
      return
    }
    const data = await commentAPI.getArticleComments(props.articleId, {
      page,
      per_page: 20,
      sort_by: 'created_at',
      order: 'desc'
    })

    if (append) {
      comments.value.push(...data.comments)
    }
    else {
      comments.value = data.comments
    }

    pagination.value = data.pagination
    // 应用筛选排序
    // sortComments()
  }
  catch (error) {
    console.error('加载评论失败:', error)
    // comments.value = [
    //   {
    //     "article_id": 23,
    //     "children": [
    //       {
    //         "article_id": 23,
    //         "children": [],
    //         "content": "222",
    //         "created_at": "2025-10-23 10:58:19",
    //         "id": 35,
    //         "is_author": false,
    //         "is_deleted": false,
    //         "is_liked": false,
    //         "level": 2,
    //         "like_count": 0,
    //         "parent_id": 32,
    //         "reply_count": 0,
    //         "reply_to_nickname": "\u54c8\u54c8",
    //         "reply_to_user_id": 8,
    //         "status": "approved",
    //         "updated_at": "2025-10-23 10:58:19",
    //         "user_avatar": "http://127.0.0.1:5050/static/temp/gZohYXBqXJbEc04947e63a4ad0db9601fe3b0c31a7cd.png",
    //         "user_id": 8,
    //         "user_nickname": "\u54c8\u54c8",
    //         "user_role": "user"
    //       },
    //       {
    //         "article_id": 23,
    //         "children": [],
    //         "content": "121",
    //         "created_at": "2025-10-23 17:43:07",
    //         "id": 36,
    //         "is_author": false,
    //         "is_deleted": false,
    //         "is_liked": false,
    //         "level": 2,
    //         "like_count": 0,
    //         "parent_id": 32,
    //         "reply_count": 0,
    //         "reply_to_nickname": "\u54c8\u54c8",
    //         "reply_to_user_id": 8,
    //         "status": "approved",
    //         "updated_at": "2025-10-23 17:43:07",
    //         "user_avatar": "http://127.0.0.1:5050/static/temp/gZohYXBqXJbEc04947e63a4ad0db9601fe3b0c31a7cd.png",
    //         "user_id": 8,
    //         "user_nickname": "\u54c8\u54c8",
    //         "user_role": "user"
    //       }
    //     ],
    //     "content": "11",
    //     "created_at": "2025-10-23 09:46:18",
    //     "id": 32,
    //     "is_author": false,
    //     "is_deleted": false,
    //     "is_liked": true,
    //     "level": 1,
    //     "like_count": 1,
    //     "parent_id": null,
    //     "reply_count": 2,
    //     "reply_to_nickname": null,
    //     "reply_to_user_id": null,
    //     "status": "approved",
    //     "updated_at": "2025-10-23 09:50:28",
    //     "user_avatar": "http://127.0.0.1:5050/static/temp/gZohYXBqXJbEc04947e63a4ad0db9601fe3b0c31a7cd.png",
    //     "user_id": 8,
    //     "user_nickname": "\u54c8\u54c8",
    //     "user_role": "user"
    //   },
    //   {
    //     "article_id": 23,
    //     "children": [
    //       {
    //         "article_id": 23,
    //         "children": [],
    //         "content": "\u4f60\u597d\u5440\uff0c\u8bf7\u5927\u5bb6\u591a\u591a\u5173\u7167",
    //         "created_at": "2025-10-10 22:39:47",
    //         "id": 26,
    //         "is_author": false,
    //         "is_deleted": false,
    //         "is_liked": false,
    //         "level": 2,
    //         "like_count": 0,
    //         "parent_id": 24,
    //         "reply_count": 0,
    //         "reply_to_nickname": "\u5468\u5bb6\u8005111",
    //         "reply_to_user_id": 6,
    //         "status": "approved",
    //         "updated_at": "2025-10-10 22:39:47",
    //         "user_avatar": "http://127.0.0.1:5050/static/temp/gZohYXBqXJbEc04947e63a4ad0db9601fe3b0c31a7cd.png",
    //         "user_id": 8,
    //         "user_nickname": "\u54c8\u54c8",
    //         "user_role": "user"
    //       },
    //       {
    //         "article_id": 23,
    //         "children": [],
    //         "content": "\u54c8\u54c8\u54c8\u6b22\u8fce\u6b22\u8fce",
    //         "created_at": "2025-10-10 23:20:53",
    //         "id": 28,
    //         "is_author": false,
    //         "is_deleted": false,
    //         "is_liked": false,
    //         "level": 2,
    //         "like_count": 0,
    //         "parent_id": 24,
    //         "reply_count": 0,
    //         "reply_to_nickname": "\u54c8\u54c8",
    //         "reply_to_user_id": 8,
    //         "status": "approved",
    //         "updated_at": "2025-10-10 23:20:53",
    //         "user_avatar": "http://127.0.0.1:5050/static/temp/20201103140533_a8258.png",
    //         "user_id": 6,
    //         "user_nickname": "\u5468\u5bb6\u8005111",
    //         "user_role": "user"
    //       }
    //     ],
    //     "content": "\u4f60\u597d\u5440",
    //     "created_at": "2025-10-10 22:17:28",
    //     "id": 24,
    //     "is_author": false,
    //     "is_deleted": false,
    //     "is_liked": true,
    //     "level": 1,
    //     "like_count": 1,
    //     "parent_id": null,
    //     "reply_count": 2,
    //     "reply_to_nickname": null,
    //     "reply_to_user_id": null,
    //     "status": "approved",
    //     "updated_at": "2025-10-10 23:15:47",
    //     "user_avatar": "http://127.0.0.1:5050/static/temp/20201103140533_a8258.png",
    //     "user_id": 6,
    //     "user_nickname": "\u5468\u5bb6\u8005111",
    //     "user_role": "user"
    //   },
    //   {
    //     "article_id": 23,
    //     "children": [],
    //     "content": "11",
    //     "created_at": "2025-10-10 21:55:45",
    //     "id": 22,
    //     "is_author": false,
    //     "is_deleted": false,
    //     "is_liked": true,
    //     "level": 1,
    //     "like_count": 1,
    //     "parent_id": null,
    //     "reply_count": 0,
    //     "reply_to_nickname": null,
    //     "reply_to_user_id": null,
    //     "status": "approved",
    //     "updated_at": "2025-10-10 22:41:36",
    //     "user_avatar": "http://127.0.0.1:5050/static/temp/20201103140533_a8258.png",
    //     "user_id": 6,
    //     "user_nickname": "\u5468\u5bb6\u8005111",
    //     "user_role": "user"
    //   }
    // ]
    // pagination.value = {
    //   "has_next": false,
    //   "has_prev": false,
    //   "page": 1,
    //   "pages": 1,
    //   "per_page": 20,
    //   "total": 3
    // }
    uni.showToast({
      title: error.msg || error.message || '加载评论失败',
      icon: 'error'
    })
  }
  finally {
    loading.value = false
    loadingMore.value = false
  }
}

// 加载评论统计
const loadStatistics = async () => {
  try {
    if (isProduct.value) {
      statistics.value = undefined
      return
    }
    const stats = await commentAPI.getCommentStatistics(props.articleId)
    statistics.value = stats
    emit('update-stats', stats)
  }
  catch (error) {
    console.error('加载统计数据失败:', error)
  }
}

// 加载更多评论
const loadMoreComments = () => {
  if (isProduct.value)
    return
  if (pagination.value?.has_next) {
    loadComments(currentPage.value + 1, true)
  }
}

// 提交评论
const submitComment = async () => {
  if (!commentContent.value.trim() || submitting.value)
    return
  if (isProduct.value) {
    uni.showToast({ title: '商品评论暂未开通', icon: 'none' })
    return
  }

  if (!props.currentUser) {
    uni.showModal({
      title: '提示',
      content: '您需要先登录才能回复评论',
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
    submitting.value = true

    const commentData = {
      article_id: props.articleId,
      content: commentContent.value.trim(),
      parent_id: replyTarget.value?.parent_id || replyTarget.value?.id || null,
      reply_to_user_id: replyTarget.value?.user_id || null
    }

    const newComment = await commentAPI.createComment(commentData)
    console.log('发表的评论:', newComment)
    // 重新加载评论列表和统计
    await Promise.all([
      loadComments(1),
      loadStatistics()
    ])

    // 清空表单
    commentContent.value = ''
    replyTarget.value = null

    uni.showToast({
      title: '评论发表成功',
      icon: 'success'
    })
  }
  catch (error) {
    console.error('发表评论失败:', error)
    uni.showToast({
      title: error.msg || error.message || '发表评论失败',
      icon: 'error'
    })
  }
  finally {
    submitting.value = false
  }
}

// 处理回复
const handleReply = (comment: Comment) => {
  // 未登录先去登录
  if (!props.currentUser) {
    uni.showModal({
      title: '提示',
      content: '您需要先登录才能回复评论',
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
  replyTarget.value = comment
  // 聚焦输入框
  nextTick(() => {
    replyFocus.value = false
    setTimeout(() => {
      replyFocus.value = true
    }, 50)
  })
}

// 取消回复
const cancelReply = () => {
  replyTarget.value = null
  replyFocus.value = false
  uni.hideKeyboard()
}
// 输入框聚焦
const onFocus = (e) => {
  // 这里的 e.detail.height 也可以拿到键盘高度，
  // 但 onKeyboardHeightChange 更通用
  keyboardHeight.value = e.detail.height
  replyFocus.value = true
}
// 输入框失焦
const onBlur = () => {
  keyboardHeight.value = 0
  // 延时清除聚焦状态，防止点击发送按钮失效
  setTimeout(() => {
    replyFocus.value = false
  }, 100)
}

// 处理点赞
const handleLike = async (comment: Comment) => {
  if (!props.currentUser) {
    uni.showToast({ title: '请先登录', icon: 'none' })
    return
  }

  const id = comment.id
  const now = Date.now()
  const last = likeCooldown.get(id) || 0
  // 前沿节流：250ms 内重复点击无效
  if (now - last < 850)
    return
  likeCooldown.set(id, now)

  // 乐观更新
  const prev = { is_liked: comment.is_liked, like_count: comment.like_count }
  const optimistic = {
    is_liked: !comment.is_liked,
    like_count: Math.max(0, (comment.like_count || 0) + (!comment.is_liked ? 1 : -1))
  }
  // eslint-disable-next-line ts/no-use-before-define
  updateCommentLike(id, optimistic)

  try {
    const result = await commentAPI.toggleLike(id)
    // 服务端为准
    // eslint-disable-next-line ts/no-use-before-define
    updateCommentLike(id, { is_liked: result.is_liked, like_count: result.like_count })
    uni.showToast({
      title: (result as any)?.message || (result.is_liked ? '点赞成功' : '取消点赞'),
      icon: 'success'
    })
  }
  catch (error) {
    // 回滚
    // eslint-disable-next-line ts/no-use-before-define
    updateCommentLike(id, prev)
    console.error('点赞操作失败:', error)
    uni.showToast({
      title: (error as any).msg || (error as any).message || '操作失败',
      icon: 'error'
    })
  }
}

// 更新评论点赞状态
const updateCommentLike = (commentId: number, { is_liked, like_count }: { is_liked: boolean, like_count: number }) => {
  const updateComment = (commentList: Comment[]) => {
    commentList.forEach((comment) => {
      if (comment.id === commentId) {
        comment.is_liked = is_liked
        comment.like_count = like_count
      }
      if (comment.children && comment.children.length > 0) {
        updateComment(comment.children)
      }
    })
  }
  updateComment(comments.value)
}

// 处理删除评论
const handleDelete = async (comment: Comment) => {
  if (!props.currentUser)
    return
  if (props.currentUser.id !== comment.user_id) {
    uni.showToast({ title: '只能删除自己的评论', icon: 'none' })
    return
  }

  try {
    const resDelete = await uni.showModal({
      title: '确认删除',
      content: '确定要删除这条评论吗？',
      confirmText: '删除',
      confirmColor: '#ff4757'
    })
    console.log('删除评论确认：', resDelete)
    if (resDelete.cancel) {
      return
    }
    await commentAPI.deleteComment(comment.id)

    // 重新加载评论列表和统计
    await Promise.all([
      loadComments(1),
      loadStatistics()
    ])

    uni.showToast({
      title: '删除成功',
      icon: 'success'
    })
  }
  catch (error) {
    if (error.errMsg !== 'showModal:fail cancel') {
      console.error('删除评论失败:', error)
      uni.showToast({
        title: error.msg || error.message || '删除失败',
        icon: 'error'
      })
    }
  }
}

// 跳转到登录页
const goToLogin = () => {
  uni.navigateTo({
    url: '/pages/login/login'
  })
}

// 刷新评论列表
const refresh = () => {
  loadComments(1)
  loadStatistics()
}

// 监听 ID 变化，确保拿到数据后再加载
watch(() => props.articleId, (newId) => {
  if (newId && !isProduct.value) {
    refresh()
  }
}, { immediate: true })

watch(() => props.productId, (newId) => {
  if (newId && isProduct.value) {
    refresh()
  }
}, { immediate: true })

// 初始化
onMounted(() => {
  // 1. 仅非商品页需要初始化工具栏逻辑
  if (!isProduct.value) {
    // 设置底部安全区域高度
    safeAreaBottom.value = hookSafeAreaBottom.value

    // 【核心】监听键盘高度变化
    uni.onKeyboardHeightChange((res) => {
      console.log('键盘高度变化:', res.height)
      keyboardHeight.value = res.height
    })
  }

  // 2. 如果挂载时已经有 ID 了，就加载一次（如果 watch 没有触发）
  if ((props.articleId || props.productId) && comments.value.length === 0) {
    refresh()
  }
})

// 页面卸载记得移除监听
onUnmounted(() => {
  // #ifdef MP-WEIXIN
  uni.offKeyboardHeightChange()
  // #endif
})

// 打开评论输入框（父组件调用）
const openInput = () => {
  if (!props.currentUser) {
    uni.showToast({ title: '请先登录', icon: 'none' })
    goToLogin()
    return
  }
  replyTarget.value = null
  nextTick(() => {
    replyFocus.value = false
    setTimeout(() => {
      replyFocus.value = true
    }, 50)
  })
}

// 暴露方法给父组件
defineExpose({
  refresh: () => {
    loadComments()
    loadStatistics()
  },
  openInput
})
</script>

<style scoped>
.comment-system {
  background: #ffffff;
  padding: 32rpx;
}

/* 评论统计 */
.comment-stats {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 16rpx;
  border-bottom: 1rpx solid #f0f0f0;
}

.stats-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #2c2c2c;
}

/* 评论表单 */
.comment-form {
  margin-bottom: 32rpx;
  padding: 24rpx;
  background: #f8f9fa;
  border-radius: 12rpx;
}

.form-header {
  display: flex;
  align-items: center;
  margin-bottom: 16rpx;
}

.user-avatar {
  width: 60rpx;
  height: 60rpx;
  border-radius: 50%;
  margin-right: 16rpx;
}

.form-title {
  flex: 1;
  font-size: 28rpx;
  color: #2c2c2c;
  font-weight: 500;
}

.cancel-reply {
  font-size: 24rpx;
  color: #007bff;
  padding: 8rpx 16rpx;
  background: #ffffff;
  border-radius: 20rpx;
}

.comment-input {
  min-height: 120rpx;
  padding: 16rpx;
  background: #ffffff;
  border-radius: 8rpx;
  font-size: 28rpx;
  color: #2c2c2c;
  border: 1rpx solid #e9ecef;
  margin-bottom: 16rpx;
}

.form-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.char-count {
  font-size: 24rpx;
  color: #999999;
}

.submit-btn {
  padding: 0rpx 32rpx;
  margin: 0;
  background: #007bff;
  color: #ffffff;
  border: none;
  border-radius: 20rpx;
  font-size: 26rpx;
}

.submit-btn.disabled {
  background: #cccccc;
  color: #999999;
}

/* 未登录提示 */
.login-prompt {
  display: flex;
  justify-content: center;
  gap: 32rpx;
  align-items: center;
  padding: 32rpx;
  background: #f8f9fa;
  border-radius: 12rpx;
  margin-bottom: 32rpx;
}

.prompt-text {
  font-size: 28rpx;
  color: #666666;
}

.login-btn {
  padding: 0 24rpx;
  margin: 0;
  display: inline-block;
  background: #007bff;
  color: #ffffff;
  border: none;
  border-radius: 20rpx;
  font-size: 26rpx;
}

/* 评论列表 */
.comment-list {
  margin: 32rpx 0;
}

/* 空状态 */
.empty-comments {
  text-align: center;
  padding: 80rpx 32rpx;
}

.empty-text {
  font-size: 28rpx;
  color: #999999;
}

/* 加载更多 */
.load-more {
  text-align: center;
  margin: 32rpx 0;
}

.load-more-btn {
  padding: 16rpx 32rpx;
  background: #f8f9fa;
  color: #666666;
  border: 1rpx solid #e9ecef;
  border-radius: 24rpx;
  font-size: 26rpx;
}

/* 加载状态 */
.loading {
  text-align: center;
  padding: 32rpx;
}

.loading-text {
  font-size: 28rpx;
  color: #999999;
}

.reply-popup {
  padding: 24rpx 24rpx calc(24rpx + env(safe-area-inset-bottom));
  background: #ffffff;
}

.reply-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16rpx;
}

.reply-title {
  font-size: 28rpx;
  color: #2c2c2c;
  font-weight: 500;
}

.reply-cancel {
  font-size: 26rpx;
  color: #007bff;
  padding: 8rpx 12rpx;
}

/* 底部工具栏容器 */
.comment-box {
  position: fixed;
  left: 0;
  width: 100%;
  bottom: 0;
  z-index: 99;
  background-color: #ffffff;
  box-shadow: 0 -2rpx 10rpx rgba(0, 0, 0, 0.05);
  transition: bottom 0.1s ease-out;
  padding-bottom: env(safe-area-inset-bottom);
}

.reply-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12rpx 30rpx;
  background: #f8f9fa;
  border-bottom: 1rpx solid #eee;
}

.reply-to {
  font-size: 24rpx;
  color: #666;
}

.cancel-reply-btn {
  font-size: 24rpx;
  color: #007bff;
}

.toolbar-content {
  display: flex;
  align-items: center;
  padding: 20rpx 30rpx;
  box-sizing: border-box;
}

.input-wrapper {
  flex: 1;
  background-color: #f5f5f5;
  border-radius: 40rpx;
  padding: 16rpx 24rpx;
  min-height: 40rpx;
  display: flex;
  overflow: hidden;
  align-items: center;
}

.input-field {
  width: 100%;
  font-size: 28rpx;
  color: #333;
  min-height: 40rpx;
  line-height: 40rpx;
  max-height: 200rpx;
}

/* 图标栏布局 */
.icon-bar {
  display: flex;
  align-items: center;
  gap: 30rpx;
  margin-left: 30rpx;
}

.icon-item {
  display: flex;
  align-items: center;
  gap: 4rpx;
}

.icon-num {
  font-size: 36rpx;
}

.icon-text {
  font-size: 24rpx;
  color: #666;
}

.send-btn {
  margin-left: 20rpx;
  background-color: #ff6b81;
  color: white;
  border-radius: 40rpx;
  font-size: 26rpx;
  padding: 0 40rpx;
  height: 64rpx;
  line-height: 64rpx;
  border: none;
}

.send-btn[disabled] {
  background-color: #ffb5c1;
  opacity: 0.8;
}

.comment-list {
  padding-bottom: 120rpx; /* 为底部工具栏留出空间 */
}
</style>
