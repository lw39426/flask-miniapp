<template>
  <view class="avatar-container">
    <!-- 1. 头像显示区域 -->
    <image class="avatar" :src="avatarUrl" mode="aspectFill" @click="openCustomPreview" />

    <!-- 2. 自定义图片预览/操作层 -->
    <view v-if="isPreviewing" class="custom-preview-wrapper">
      <!-- 顶部操作栏：标题和关闭按钮 -->
      <view class="preview-header">
        <text class="header-title">头像</text>
        <!-- 自定义关闭按钮 -->
        <text class="close-icon" @click="closePreview">×</text>
      </view>

      <!-- 图片主体 -->
      <image class="preview-image" :src="previewUrl" mode="aspectFit" />

      <!-- 底部操作按钮 -->
      <view class="preview-footer">
        <!-- 更换图片按钮 -->
        <button class="action-btn change-btn" @click="handleChooseImage">
          更换图片
        </button>
      </view>
    </view>
  </view>
</template>

<script lang="ts" setup>
// 引入 sard-uniapp 的 cropImage 函数
import { cropImage } from 'sard-uniapp'
import { defineEmits, defineProps, ref, watch, withDefaults } from 'vue'
// 引入上传API和Store
import { uploadFile } from '@/api/foo'
import { useTokenStore } from '@/store/token'
import { useUserStore } from '@/store/user'

// --- Props ---
interface Props {
  defaultAvatar: string
}
const props = withDefaults(defineProps<Props>(), {
  defaultAvatar: '/static/images/default-avatar.svg',
})

// --- Emits ---
const emit = defineEmits(['update:defaultAvatar', 'image-selected'])

// --- Stores ---
const userStore = useUserStore()
const tokenStore = useTokenStore()

// --- State ---
const avatarUrl = ref(props.defaultAvatar)
const isPreviewing = ref(false)
const previewUrl = ref('')
const originalFileName = ref<string>('') // 用于存储文件名

watch(() => props.defaultAvatar, (newVal) => {
  avatarUrl.value = newVal
}, { immediate: true })

// --- Methods ---

/**
 * 打开自定义预览弹窗
 */
const openCustomPreview = () => {
  if (!avatarUrl.value)
    return
  previewUrl.value = avatarUrl.value
  isPreviewing.value = true
}

/**
 * 关闭自定义预览弹窗
 */
const closePreview = () => {
  isPreviewing.value = false
  previewUrl.value = ''
}

/**
 * 真实的图片上传和更新逻辑（从my.vue移植过来）
 * @param filePath 裁剪后的图片路径
 */
const updateAvatar = async (filePath: string) => {
  try {
    await uni.showLoading({ title: '上传中...' })

    // 使用统一的兼容上传方法
    const uploadResult = await uploadFile(filePath, originalFileName.value || 'avatar')
    console.log('裁剪上传成功，URL:', uploadResult.data)

    const fullAvatarUrl = import.meta.env.VITE_SERVER_BASEURL + uploadResult.data.url
    console.log('裁剪上传成功，完整URL:', fullAvatarUrl)

    // 更新本地头像显示
    avatarUrl.value = fullAvatarUrl

    // 更新用户信息存储
    if (userStore.userInfo) {
      userStore.userInfo.avatar = fullAvatarUrl
      await userStore.updateUserInfo({
        ...userStore.userInfo,
        avatar: fullAvatarUrl
      })
    }

    // 触发事件通知父组件
    emit('image-selected', fullAvatarUrl)

    uni.hideLoading()
    uni.showToast({ title: '头像上传成功', icon: 'success' })
  }
  catch (err: any) {
    uni.hideLoading()
    console.error('裁剪上传失败:', err)

    const errorMessage = err instanceof Error ? err.message : '上传失败'
    uni.showToast({
      title: errorMessage,
      icon: 'none',
      duration: 3000
    })

    // 上传失败时，仍然显示裁剪后的图片作为预览
    avatarUrl.value = filePath

    // 通知父组件，即使失败也要传递临时路径
    emit('image-selected', filePath)
  }
}

/**
 * 处理“更换图片”按钮点击：唤起选择图片组件，并调用 Sard 的 cropImage
 */
const handleChooseImage = () => {
  uni.chooseImage({
    count: 1,
    sizeType: ['original', 'compressed'], // 支持原图和压缩图
    sourceType: ['album', 'camera'],
    success: (res) => {
      uni.getImageInfo({
        src: res.tempFilePaths[0],
        success: (infoRes) => {
          console.log('选择图片信息:', infoRes)
        },
        fail: (err) => {
          console.error('获取图片信息失败:', err)
        }
      })
      const tempFilePath = res.tempFilePaths[0]

      if (!tempFilePath) {
        uni.showToast({ title: '请选择图片', icon: 'none' })
        return
      }

      // 提取原始文件名（去掉扩展名）
      if (res.tempFiles[0]?.name) {
        originalFileName.value = res.tempFiles[0].name.split('.').slice(0, -1).join('.')
      }
      else {
        originalFileName.value = 'avatar'
      }

      // 调用 Sard-Uniapp 的 cropImage
      cropImage({
        src: tempFilePath,
        cropScale: '1:1', // 1:1 正方形裁剪
        quality: 1,
        beforeCrop() {
          return 1
        },
        success(filePath) {
          console.log('Sard cropImage 成功:', filePath)

          // 关闭预览弹窗
          closePreview()

          // 执行真实的上传逻辑
          updateAvatar(filePath)
        },
        fail(err) {
          console.error('Sard cropImage 失败:', err)
          closePreview() // 裁剪取消或失败时，也关闭预览
          uni.showToast({ title: '图片裁剪操作已取消或失败', icon: 'none' })
        }
      })
    },
    fail: () => {
      uni.showToast({ title: '选择图片失败', icon: 'none' })
    }
  })
}
</script>

<style scoped>
/* 基础头像样式 */
.avatar {
  width: 120rpx;
  height: 120rpx;
  border-radius: 50%;
  border: 1px solid #eee;
  cursor: pointer;
}

/* --- 自定义预览层样式 --- */
.custom-preview-wrapper {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #000; /* 黑色背景模拟原生预览 */
  z-index: 999;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: var(--status-bar-height, 44px); /* 适配安全区，或直接设置固定高度 */
}

/* 顶部操作栏 */
.preview-header {
  width: 100%;
  height: 88rpx; /* 根据设计调整 */
  display: flex;
  justify-content: center;
  align-items: center;
  color: white;
  position: relative;
  box-sizing: border-box;
}

.header-title {
  font-size: 34rpx;
}

.close-icon {
  position: absolute;
  left: 30rpx;
  font-size: 48rpx;
  line-height: 1;
  color: white;
}

/* 图片主体 */
.preview-image {
  flex-grow: 1; /* 占据剩余空间 */
  width: 100%;
  height: 0;
  /* 确保图片居中显示 */
  display: flex;
  justify-content: center;
  align-items: center;
}

/* 底部操作区域 */
.preview-footer {
  width: 100%;
  padding: 30rpx;
  box-sizing: border-box;
}

.action-btn {
  width: 100%;
  /* 您的按钮样式 */
  background-color: #ffffff;
  color: #000000;
  border-radius: 8rpx;
}
</style>
