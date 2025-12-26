<script setup lang="ts">
import ProductCardSkeleton from '@/components/skeleton/ProductCardSkeleton.vue'
</script>

<template>
  <view class="home-skeleton animate-pulse">
    <!-- Banner Skeleton -->
    <view class="skeleton-banner mb-4 h-[320rpx] w-full rounded-[20rpx] bg-gray-200" />

    <!-- Greet Skeleton -->
    <view class="skeleton-greet mx-[32rpx] mb-4 h-[120rpx] w-auto rounded-[16rpx] bg-gray-200" />

    <!-- Promo Skeleton -->
    <view class="promo-skeleton mx-[32rpx] mb-4 flex justify-between gap-[20rpx]">
      <view class="h-[240rpx] flex-1 rounded-[16rpx] bg-gray-200" />
      <view class="flex flex-1 flex-col gap-[16rpx]">
        <view class="h-full w-full rounded-[16rpx] bg-gray-200" />
        <view class="h-full w-full rounded-[16rpx] bg-gray-200" />
      </view>
    </view>

    <!-- Banner Skeleton -->
    <view class="skeleton-banner mx-[32rpx] mb-4 h-[280rpx] w-auto rounded-[16rpx] bg-gray-200" />

    <!-- Category Tabs Skeleton -->
    <view class="mx-[32rpx] mb-4 flex gap-4 flex-justify-between overflow-hidden">
      <view v-for="i in 5" :key="i" class="h-[60rpx] w-[110rpx] shrink-0 rounded-[30rpx] bg-gray-200" />
    </view>

    <!-- Product Skeleton -->
    <view class="product-skeleton mx-[32rpx] mb-4 flex gap-[24rpx] overflow-hidden">
      <view v-for="i in 2" :key="i" class="w-full">
        <ProductCardSkeleton image-height="300rpx" />
      </view>
    </view>

    <!-- Articles Skeleton -->
    <view class="articles-skeleton mx-[32rpx] rounded-[16rpx] bg-white p-[32rpx]">
      <view class="mb-4 flex items-center justify-between">
        <view class="h-[40rpx] w-[150rpx] rounded bg-gray-200" />
        <view class="h-[30rpx] w-[100rpx] rounded bg-gray-200" />
      </view>
      <view v-for="i in 5" :key="i" class="mb-[32rpx] flex last:mb-0">
        <view class="mr-[24rpx] h-[140rpx] w-[200rpx] shrink-0 rounded-[12rpx] bg-gray-200" />
        <view class="h-[140rpx] flex flex-1 flex-col justify-between py-1">
          <view class="h-[32rpx] w-[80%] rounded bg-gray-200" />
          <view class="mt-2 h-[24rpx] w-full rounded bg-gray-200" />
          <view class="mt-auto flex justify-between">
            <view class="h-[24rpx] w-[30%] rounded bg-gray-200" />
            <view class="h-[24rpx] w-[20%] rounded bg-gray-200" />
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped>
.animate-pulse {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

.home-skeleton {
  padding-top: 0;
  background-color: #f8f6f0;
  min-height: 100vh;
}
</style>
