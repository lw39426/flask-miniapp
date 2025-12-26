<script setup lang="ts">
// Skeleton component for Cart page
</script>

<template>
  <view class="cart-skeleton h-[calc(100vh-60px-env(safe-area-inset-bottom))] w-screen animate-pulse bg-[#f5f5f5] pt-[20rpx]">
    <!-- List Items -->
    <view v-for="i in 5" :key="i" class="cart-item-skeleton mx-[30rpx] mb-[20rpx] flex items-center rounded-[30rpx] bg-white p-[30rpx] shadow-sm">
      <!-- Checkbox -->
      <view class="mr-[20rpx] h-[44rpx] w-[44rpx] flex-shrink-0 rounded-full bg-gray-200" />
      <!-- Image -->
      <view class="mr-[24rpx] h-[160rpx] w-[160rpx] flex-shrink-0 rounded-[20rpx] bg-gray-200" />
      <!-- Content -->
      <view class="h-[160rpx] flex flex-1 flex-col justify-between">
        <view class="flex justify-between">
          <view class="h-[30rpx] w-[40%] rounded bg-gray-200" />
          <view class="h-[40rpx] w-[40rpx] rounded bg-gray-200" />
        </view>
        <view class="mt-2 h-[24rpx] w-[20%] rounded bg-gray-200" />
        <view class="mt-auto flex items-center justify-between">
          <view class="h-[34rpx] w-[30%] rounded bg-gray-200" />
          <view class="flex items-center gap-2">
            <view class="h-[44rpx] w-[44rpx] rounded bg-gray-200" />
            <view class="h-[30rpx] w-[30rpx] rounded bg-gray-200" />
            <view class="h-[44rpx] w-[44rpx] rounded bg-gray-200" />
          </view>
        </view>
      </view>
    </view>

    <!-- Footer -->
    <view class="fixed bottom-[60px] left-0 right-0 flex items-center justify-between border-t border-gray-100 bg-white p-[30rpx] pb-[env(safe-area-inset-bottom)]">
      <view class="flex items-center gap-2">
        <view class="h-[44rpx] w-[44rpx] rounded-full bg-gray-200" />
        <view class="h-[30rpx] w-[60rpx] rounded bg-gray-200" />
      </view>
      <view class="flex items-center gap-4">
        <view class="h-[40rpx] w-[150rpx] rounded bg-gray-200" />
        <view class="h-[80rpx] w-[180rpx] rounded-[40rpx] bg-gray-200" />
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
