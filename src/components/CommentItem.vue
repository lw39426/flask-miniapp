<template>
  <view class="comment-item" :class="`level-${comment.level}`">
    <view class="comment-main">
      <!-- 用户头像 -->
      <image class="user-avatar" :src="comment.user_avatar" mode="aspectFill" />

      <view class="comment-content">
        <!-- 用户信息行 -->
        <view class="user-info">
          <text class="user-nickname">{{ comment.user_nickname }}</text>
          <text v-if="isMine" class="badge self-badge">我</text>
          <text v-if="comment.is_author" class="badge author-badge">作者</text>
        </view>

        <!-- 评论内容 -->
        <view class="comment-body" @tap="handleReply">
          <text v-if="comment.reply_to_nickname" class="reply-to">
            回复 @{{ comment.reply_to_nickname }}：
          </text>
          <text class="comment-text">{{ comment.content }}</text>
        </view>

        <!-- 操作栏：时间、回复、点赞、删除 -->
        <view class="comment-meta">
          <text class="comment-time">{{ formatRelativeTime(comment.created_at) }}</text>
          <text class="comment-reply" @tap="handleReply">回复</text>
          <view class="like-inline">
            <text class="like-icon" :class="{ liked: comment.is_liked }" @tap="handleLike">
              {{ comment.is_liked ? '❤️' : '🤍' }}{{ comment.like_count || '' }}
            </text>
            <text v-if="canDelete" class="delete-link" @tap="handleDelete">删除</text>
          </view>
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
import { formatRelativeTime } from '@/utils'
import CommentItem from './CommentItem.vue'

defineOptions({ name: 'CommentItem' })

const props = defineProps<Props>()

const emit = defineEmits<Emits>()

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

// 计算属性
const canDelete = computed(() => {
  if (!props.currentUser)
    return false
  return props.currentUser.id === props.comment.user_id
})

const isMine = computed(() => {
  return !!props.currentUser && props.currentUser.id === props.comment.user_id
})

// 事件处理
const handleLike = () => emit('like', props.comment)
const handleReply = () => emit('reply', props.comment)
const handleDelete = () => emit('delete', props.comment)
</script>

<style scoped>
.comment-item {
  margin-bottom: 24rpx;
}

/* 子评论缩进 */
.comment-item.level-2,
.comment-item.level-3 {
  margin-left: 80rpx;
  padding-left: 16rpx;
  border-left: 2rpx solid #e6f7ff;
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
}

/* 用户信息行 */
.user-info {
  display: flex;
  align-items: center;
  gap: 8rpx;
  margin-bottom: 8rpx;
}

.user-nickname {
  font-size: 26rpx;
  font-weight: 500;
  color: #555;
}

.badge {
  padding: 2rpx 10rpx;
  border-radius: 8rpx;
  font-size: 20rpx;
  font-weight: 500;
}

.author-badge {
  background: #1890ff;
  color: #ffffff;
}

.self-badge {
  background: #f0f0f0;
  color: #666666;
}

/* 评论内容 */
.comment-body {
  line-height: 1.6;
  margin-bottom: 8rpx;
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

/* 操作栏 */
.comment-meta {
  display: flex;
  align-items: center;
  gap: 24rpx;
}

.comment-time {
  font-size: 22rpx;
  color: #999999;
}

.comment-reply {
  font-size: 22rpx;
  color: #666;
}

.comment-reply:active {
  color: #1890ff;
}

/* 点赞区域 */
.like-inline {
  display: flex;
  align-items: center;
  gap: 16rpx;
  margin-left: auto;
}

.like-icon {
  font-size: 24rpx;
  color: #999;
  padding: 4rpx 12rpx;
  border-radius: 16rpx;
  background: #f5f5f5;
}

.like-icon.liked {
  color: #ff4757;
}

.delete-link {
  font-size: 22rpx;
  color: #ff4757;
}

/* 子评论 */
.children-comments {
  margin-top: 16rpx;
}
</style>
