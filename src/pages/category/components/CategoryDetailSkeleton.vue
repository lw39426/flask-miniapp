<script setup lang="ts">
import ProductCardSkeleton from '@/components/skeleton/ProductCardSkeleton.vue'
</script>

<template>
  <view class="flex-1 animate-pulse overflow-hidden p-[20rpx]">
    <!-- Banner -->
    <view class="mb-[30rpx] h-[200rpx] w-full rounded-[16rpx] bg-gray-200" />

    <!-- Subcategory Title -->
    <view class="mb-[24rpx] h-[32rpx] w-[30%] rounded bg-gray-200" />

    <!-- Grid -->
    <view class="flex flex-wrap justify-between">
      <view
        v-for="i in 2"
        :key="i"
        class="mb-[32rpx] w-[39%] flex flex-col items-center rounded-[16rpx] bg-white p-[24rpx] shadow-sm"
      >
        <view class="mb-[16rpx] h-[80rpx] w-[80rpx] rounded-full bg-gray-200" />
        <view class="h-[24rpx] w-[80%] rounded bg-gray-200" />
      </view>
    </view>

    <!-- Waterfall Title -->
    <view class="mb-[24rpx] h-[32rpx] w-[30%] rounded bg-gray-200" />

    <!-- Waterfall -->
    <view class="flex gap-[16rpx]">
      <view class="flex flex-1 flex-col gap-[16rpx]">
        <ProductCardSkeleton image-height="300rpx" :show-info="false" />
        <ProductCardSkeleton image-height="400rpx" :show-info="false" />
      </view>
      <view class="flex flex-1 flex-col gap-[16rpx]">
        <ProductCardSkeleton image-height="360rpx" :show-info="false" />
        <ProductCardSkeleton image-height="340rpx" :show-info="false" />
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
</style>
