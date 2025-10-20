<template>
  <view class="comment-system">
    <!-- 评论统计 -->
    <view v-if="statistics" class="comment-stats">
      <text class="stats-title">评论 {{ statistics.total_comments }}</text>
      <text class="stats-detail">{{ statistics.today_comments }}条新评论</text>
    </view>

    <!-- 发表评论表单 -->
    <view v-if="currentUser && !isProduct" class="comment-form">
      <view class="form-header">
        <image class="user-avatar" :src="currentUser.avatar" mode="aspectFill" />
        <text class="form-title">{{ replyTarget ? `回复 @${replyTarget.user_nickname}` : '发表评论' }}</text>
        <text v-if="replyTarget" class="cancel-reply" @tap="cancelReply">取消</text>
      </view>

      <textarea
        v-model="commentContent"
        class="comment-input"
        :placeholder="replyTarget ? `回复 @${replyTarget.user_nickname}` : '写下你的评论...'"
        :maxlength="500"
        auto-height
      />

      <view class="form-actions">
        <text class="char-count">{{ commentContent.length }}/500</text>
        <button
          class="submit-btn"
          :class="{ disabled: !commentContent.trim() || submitting }"
          :disabled="!commentContent.trim() || submitting"
          @tap="submitComment"
        >
          {{ submitting ? '发布中...' : '发布' }}
        </button>
      </view>
    </view>

    <!-- 未登录提示 -->
    <view v-else-if="!isProduct" class="login-prompt">
      <text class="prompt-text">登录后可以发表评论...</text>
      <button class="login-btn" @tap="goToLogin">
        去登录
      </button>
    </view>

    <!-- 评论列表 -->
    <view v-if="comments.length > 0" class="comment-list">
      <CommentItem
        v-for="comment in comments"
        :key="comment.id"
        :comment="comment"
        :current-user="currentUser"
        @reply="handleReply"
        @like="handleLike"
        @delete="handleDelete"
      />
    </view>

    <!-- 空状态 -->
    <view v-else-if="!loading" class="empty-comments">
      <text class="empty-text">{{ isProduct ? '商品评论暂未开通，敬请期待' : '暂无评论，快来发表第一条评论吧~' }}</text>
    </view>

    <!-- 回复弹窗（Wot-UI） -->
    <sar-popup
      v-model="showReplyPopup"
      position="bottom"
      :safe-area-inset-bottom="true"
      :close-on-click-modal="true"
    >
      <view class="reply-popup">
        <view class="reply-header">
          <text class="reply-title">{{ replyTarget ? `回复 @${replyTarget.user_nickname}` : '发表评论' }}</text>
          <text class="reply-cancel" @tap="closeReplyPopup">取消</text>
        </view>
        <textarea
          v-model="commentContent"
          class="reply-textarea"
          :placeholder="replyTarget ? `回复 @${replyTarget.user_nickname}` : '写下你的评论...'"
          :maxlength="500"
          auto-height
        />
        <view class="reply-actions">
          <text class="char-count">{{ commentContent.length }}/500</text>
          <button
            class="submit-btn"
            :class="{ disabled: !commentContent.trim() || submitting }"
            :disabled="!commentContent.trim() || submitting"
            @tap="submitComment"
          >
            {{ submitting ? '发布中...' : '发布' }}
          </button>
        </view>
      </view>
    </sar-popup>

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
  </view>
</template>

<script lang="ts" setup>
import type { Comment, CommentListResponse, CommentStatistics } from '@/api/comment'
import { computed, onMounted, ref } from 'vue'
import { commentAPI } from '@/api/comment'
import CommentItem from './CommentItem.vue'

interface Props {
  articleId?: number
  productId?: number
  currentUser?: {
    id: number
    nickname: string
    avatar: string
  } | null
}

interface Emits {
  (e: 'update-stats', stats: CommentStatistics): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// 响应式数据
const comments = ref<Comment[]>([])
const statistics = ref<CommentStatistics>()
const pagination = ref<CommentListResponse['pagination']>()
const loading = ref(false)
const loadingMore = ref(false)
const submitting = ref(false)
const commentContent = ref('')
const replyTarget = ref<Comment | null>(null)
const showReplyPopup = ref(false)

// 点赞节流（前沿触发）：250ms 内忽略重复点击
const likeCooldown = new Map<number, number>()

// 计算属性
const currentPage = computed(() => pagination.value?.page || 1)
const isProduct = computed(() => props.productId != null && props.articleId == null)

// 加载评论列表
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
  }
  catch (error) {
    console.error('加载评论失败:', error)
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
    uni.showToast({
      title: '请先登录',
      icon: 'none'
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
    showReplyPopup.value = false

    uni.showToast({
      title: '评论发表成功',
      icon: 'success'
    })
  }
  catch (error) {
    console.error('发表评论失败:', error)
    uni.showToast({
      title: error.msg || error.message || '发表评论失败2',
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
    uni.showToast({ title: '请先登录', icon: 'none' })
    uni.navigateTo({ url: '/pages/login/index' })
    return
  }
  replyTarget.value = comment
  // 打开底部弹窗输入
  showReplyPopup.value = true
}

// 取消回复
const cancelReply = () => {
  replyTarget.value = null
  commentContent.value = ''
}
const closeReplyPopup = () => {
  showReplyPopup.value = false
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
    await uni.showModal({
      title: '确认删除',
      content: '确定要删除这条评论吗？',
      confirmText: '删除',
      confirmColor: '#ff4757'
    })

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

// 初始化
onMounted(() => {
  if (isProduct.value) {
    loading.value = false
    return
  }
  loadComments()
  loadStatistics()
})

// 暴露方法给父组件
defineExpose({
  refresh: () => {
    loadComments()
    loadStatistics()
  }
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
  margin-bottom: 32rpx;
}

.stats-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #2c2c2c;
}

.stats-detail {
  font-size: 24rpx;
  color: #999999;
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
  margin-bottom: 32rpx;
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

.reply-textarea {
  min-height: 160rpx;
  padding: 16rpx;
  background: #ffffff;
  border-radius: 8rpx;
  font-size: 28rpx;
  color: #2c2c2c;
  border: 1rpx solid #e9ecef;
  margin-bottom: 16rpx;
}

.reply-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
</style>
