<script setup lang="ts">
interface Props {
  imageHeight?: string
  showInfo?: boolean
  infoHeight?: string
}

withDefaults(defineProps<Props>(), {
  imageHeight: '300rpx',
  showInfo: false,
  infoHeight: '60rpx',
})
</script>

<template>
  <view class="w-full">
    <view class="w-full shrink-0 rounded-[16rpx] bg-gray-200" :style="{ height: imageHeight }" />
    <view v-if="showInfo" class="mt-[20rpx] rounded-[30rpx] bg-gray-200" :style="{ height: infoHeight }" />
  </view>
</template>
