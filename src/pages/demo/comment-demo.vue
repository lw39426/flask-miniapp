<template>
  <view class="demo-page">
    <!-- 模拟文章内容 -->
    <view class="article-mock">
      <text class="article-title">评论功能演示文章</text>
      <text class="article-content">
        这是一篇用于演示评论功能的文章。你可以在下方发表评论、回复其他用户、点赞评论等。
        评论系统支持多级回复、实时点赞、用户身份标识等功能。
      </text>
    </view>

    <!-- 评论系统 -->
    <CommentSystem
      :article-id="1"
      :current-user="currentUser"
      @update-stats="handleStatsUpdate"
    />
  </view>
</template>

<script lang="ts" setup>
import type { CommentStatistics } from '@/api/comment'
import { ref } from 'vue'
import CommentSystem from '@/components/CommentSystem.vue'

definePage({
  style: {
    navigationBarTitleText: '评论功能演示',
  },
})

// 模拟当前用户
const currentUser = ref({
  id: 1,
  nickname: '演示用户',
  avatar: '/static/images/default-avatar.svg'
})

// 处理统计更新
const handleStatsUpdate = (stats: CommentStatistics) => {
  console.log('评论统计更新:', stats)
}
</script>

<style scoped>
.demo-page {
  background: #f8f9fa;
  min-height: 100vh;
}

.article-mock {
  background: #ffffff;
  padding: 32rpx;
  margin-bottom: 20rpx;
}

.article-title {
  display: block;
  font-size: 36rpx;
  font-weight: 700;
  color: #2c2c2c;
  margin-bottom: 24rpx;
}

.article-content {
  display: block;
  font-size: 28rpx;
  color: #666666;
  line-height: 1.6;
}
</style>
