<template>
  <view class="comment-item" :class="`level-${comment.level}`">
    <view class="comment-main">
      <!-- 用户头像 -->
      <image class="user-avatar" :src="comment.user_avatar" mode="aspectFill" />

      <view class="comment-content">
        <!-- 用户信息 -->
        <view class="user-info">
          <view class="user-info-left">
            <text class="user-nickname">{{ comment.user_nickname }}</text>
            <text v-if="isMine" class="self-badge">(我)</text>
            <text v-if="comment.is_author" class="author-badge">(作者)</text>
          </view>
          <view class="user-info-right" />
        </view>

        <!-- 评论内容 -->
        <view class="comment-body" @tap="handleReply">
          <text v-if="comment.reply_to_nickname" class="reply-to">
            回复 @{{ comment.reply_to_nickname }}：
          </text>
          <text class="comment-text">{{ comment.content }}</text>
        </view>

        <!-- 操作按钮 -->
        <view class="comment-meta">
          <text class="comment-time">{{ formatTime(comment.created_at) }}</text>
          <text class="comment-time">回复</text>
          <!-- <text class="like-icon" :class="{ liked: comment.is_liked }">点赞❤️</text> -->
          <view class="like-inline" @tap="handleLike">
            <!-- 选项A：纯文本（默认启用） -->
            <text class="like-icon" :class="{ liked: comment.is_liked }">{{ comment.is_liked ? '已赞❤️' : '点赞🤍' }}</text>
            <text class="like-count">{{ comment.like_count }}</text>
            <!-- 选项B：Wot-UI 图标（解注启用，需要 wot-design-uni） -->
            <!--
            <sar-icon :name="comment.is_liked ? 'like-fill' : 'like'"
                     :color="comment.is_liked ? '#ff4757' : '#409eff'"
                     size="20px" />
            <text class="like-count">{{ comment.like_count }}</text>
            -->
            <!-- 选项C：uni-icons（解注启用，需要 @dcloudio/uni-ui 或内置 uni-icons 可用） -->
            <!--
            <uni-icons :type="comment.is_liked ? 'hand-up-filled' : 'hand-up'"
                       :color="comment.is_liked ? '#ff4757' : '#409eff'"
                       size="20" />
            <text class="like-count">{{ comment.like_count }}</text>
            -->
          </view>
          <text v-if="canDelete" class="delete-link" @tap="handleDelete">删除</text>
        </view>
      </view>
    </view>

    <!-- 子评论 -->
    <view v-if="comment.children && comment.children.length > 0" class="children-comments">
      <CommentItem
        v-for="child in comment.children"
        :key="child.id"
        :comment="child"
        :current-user="currentUser"
        @reply="$emit('reply', $event)"
        @like="$emit('like', $event)"
        @delete="$emit('delete', $event)"
      />
    </view>
  </view>
</template>

<script lang="ts" setup>
import type { Comment } from '@/api/comment'
import { computed } from 'vue'

interface Props {
  comment: Comment
  currentUser?: {
    id: number
    nickname: string
    avatar: string
  } | null
}

interface Emits {
  (e: 'reply', comment: Comment): void
  (e: 'like', comment: Comment): void
  (e: 'delete', comment: Comment): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// 计算属性
const canDelete = computed(() => {
  console.log('reply', props.currentUser)
  if (!props.currentUser)
    return false
  return props.currentUser.id === props.comment.user_id
})

const isMine = computed(() => {
  return !!props.currentUser && props.currentUser.id === props.comment.user_id
})

// 格式化时间
const formatTime = (timeString: string) => {
  const now = new Date()
  const time = new Date(timeString)
  const diff = now.getTime() - time.getTime()

  const minute = 60 * 1000
  const hour = 60 * minute
  const day = 24 * hour
  const week = 7 * day
  const month = 30 * day

  if (diff < minute) {
    return '刚刚'
  }
  else if (diff < hour) {
    return `${Math.floor(diff / minute)}分钟前`
  }
  else if (diff < day) {
    return `${Math.floor(diff / hour)}小时前`
  }
  else if (diff < week) {
    return `${Math.floor(diff / day)}天前`
  }
  else if (diff < month) {
    return `${Math.floor(diff / week)}周前`
  }
  else {
    return time.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }
}

// 处理点赞
const handleLike = () => {
  emit('like', props.comment)
}

// 处理回复
const handleReply = () => {
  emit('reply', props.comment)
}

// 处理删除
const handleDelete = () => {
  emit('delete', props.comment)
}
</script>

<style scoped>
.comment-item {
  margin-bottom: 24rpx;
}

.comment-item.level-1 {
  border-left: none;
}

.comment-item.level-2 {
  margin-left: 80rpx;
  padding-left: 16rpx;
  border-left: 2rpx solid #e6f7ff;
}

.comment-item.level-3 {
  margin-left: 80rpx;
  padding-left: 16rpx;
  border-left: 2rpx solid #f6ffed;
}

.comment-main {
  display: flex;
  align-items: flex-start;
}

.user-avatar {
  width: 64rpx;
  height: 64rpx;
  border-radius: 50%;
  margin-right: 16rpx;
  flex-shrink: 0;
}

.comment-content {
  flex: 1;
  min-width: 0;
  margin-bottom: 16rpx;
}

.user-info {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8rpx;
  flex-wrap: wrap;
  gap: 12rpx;
}

.user-nickname {
  font-size: 26rpx;
  font-weight: 500;
  color: #939393;
}

.author-badge {
  background: #1890ff;
  color: #ffffff;
  padding: 4rpx 12rpx;
  border-radius: 12rpx;
  font-size: 20rpx;
  font-weight: 500;
}

.self-badge {
  background: #f0f0f0;
  color: #666666;
  padding: 2rpx 10rpx;
  border-radius: 12rpx;
  font-size: 20rpx;
  font-weight: 500;
}

.comment-time {
  width: 160rpx;
  font-size: 22rpx;
  color: #999999;
}

.comment-body {
  /* margin-bottom: 16rpx; */
  line-height: 1.6;
}

.reply-to {
  color: #1890ff;
  font-weight: 500;
  font-size: 26rpx;
}

.comment-text {
  font-size: 28rpx;
  color: #1f1f1f;
  word-break: break-word;
}

.comment-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.action-left {
  display: flex;
  gap: 32rpx;
}

.action-right {
  display: flex;
  gap: 16rpx;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 8rpx;
  padding: 8rpx 12rpx;
  border-radius: 20rpx;
  background: #f8f9fa;
  transition: background-color 0.2s;
}

.action-btn:active {
  background: #e9ecef;
}

.delete-btn {
  background: #fff5f5;
  color: #ff4757;
}

.delete-btn:active {
  background: #ffe0e0;
}

.action-icon {
  font-size: 24rpx;
}

.action-icon.liked {
  color: #ff4757;
}

.action-text {
  font-size: 22rpx;
  color: #666666;
}

.delete-btn .action-text {
  color: #ff4757;
}

.children-comments {
  margin-top: 16rpx;
}

/* 移动端适配 */
@media (max-width: 768px) {
  .comment-item.level-2,
  .comment-item.level-3 {
    margin-left: 40rpx;
  }

  .user-info {
    /* flex-direction: ; */
    align-items: flex-start;
    gap: 8rpx;
  }

  .action-left {
    gap: 24rpx;
  }
}
/* 新增：标题行左右布局与内联点赞样式 */
.user-info-left {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.user-info-right {
  display: flex;
  align-items: center;
}

.like-inline {
  display: flex;
  align-items: center;
  gap: 8rpx;
  padding: 0rpx 12rpx;
  border-radius: 20rpx;
  background: #f0f7ff;
}

.like-icon {
  font-size: 24rpx;
  color: #409eff;
}

.like-icon.liked {
  color: #ff4757;
}

.like-count {
  font-size: 24rpx;
  color: #409eff;
}

/* 新增：评论时间与删除在次行右侧展示 */
.comment-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 8rpx;
}

.delete-link {
  font-size: 22rpx;
  color: #999999;
}

.delete-link:active {
  color: #ff4757;
}
</style>
