<script setup lang="ts">
</script>

<template>
  <view class="h-full w-[200rpx] flex flex-shrink-0 flex-col animate-pulse border-r border-gray-100 bg-[#f3f4f6]">
    <view v-for="i in 12" :key="i" class="h-[110rpx] flex items-center justify-center border-b border-gray-50 bg-white">
      <view class="h-[28rpx] w-[60%] rounded bg-gray-200" />
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
