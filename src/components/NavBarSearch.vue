<template>
  <view class="navbar-search" :style="containerStyle">
    <!-- 搜索框容器 -->
    <view class="search-box" :class="{ 'has-back': showBack }" :style="boxStyle" @tap="onClick">
      <!-- 返回按钮 -->
      <view v-if="showBack" class="back-icon-wrapper" @tap.stop="onBack">
        <text class="back-icon">←</text>
      </view>

      <!-- 搜索图标 (仅非输入模式或输入模式但显示图标时) -->
      <text v-if="!isInput" class="search-icon">🔍</text>

      <!-- 输入框模式 -->
      <input
        v-if="isInput"
        class="search-input"
        :value="modelValue"
        :placeholder="placeholder"
        :focus="autoFocus"
        confirm-type="search"
        placeholder-class="input-placeholder"
        @input="onInput"
        @confirm="onSearch"
      >

      <!-- 占位文本模式 -->
      <text v-else class="search-placeholder">{{ placeholder }}</text>

      <!-- 搜索按钮 (仅输入模式且有内容时) -->
      <view v-if="isInput && modelValue" class="search-action-btn" @tap.stop="onSearch">
        <text>搜索</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'

const props = defineProps({
  // 是否为输入框模式
  isInput: {
    type: Boolean,
    default: false
  },
  // 双向绑定的值
  modelValue: {
    type: String,
    default: ''
  },
  // 占位符
  placeholder: {
    type: String,
    default: '搜商品/品牌/活动'
  },
  // 是否显示返回按钮
  showBack: {
    type: Boolean,
    default: false
  },
  // 自动聚焦
  autoFocus: {
    type: Boolean,
    default: false
  },
  // 背景颜色
  bgColor: {
    type: String,
    default: 'rgba(255, 255, 255, 0.9)'
  },
  // 是否固定定位
  fixed: {
    type: Boolean,
    default: true
  }
})

const emit = defineEmits(['update:modelValue', 'search', 'click', 'back'])

// 样式状态
const containerStyle = ref({})
const boxStyle = ref({})

onMounted(() => {
  const systemInfo = uni.getSystemInfoSync()
  let top = 0
  let height = 32
  let rightSpace = 0

  // #ifdef MP
  const menuButton = uni.getMenuButtonBoundingClientRect()
  top = menuButton.top
  height = menuButton.height
  // 计算右侧留白：屏幕宽度 - 胶囊左侧位置 + 额外一点间距
  rightSpace = systemInfo.screenWidth - menuButton.left + 8
  // #endif

  // #ifndef MP
  top = (systemInfo.safeAreaInsets?.top || 0) + 15
  height = 32
  rightSpace = 16
  // #endif

  const commonStyle = {
    paddingTop: `${top}px`,
    paddingLeft: '12px',
    paddingRight: `${rightSpace}px`,
    paddingBottom: '10px', // 底部留白
    boxSizing: 'border-box',
    zIndex: 999,
  }

  if (props.fixed) {
    containerStyle.value = {
      ...commonStyle,
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100%',
      pointerEvents: 'none', // 透传点击
    }
  }
  else {
    containerStyle.value = {
      ...commonStyle,
      position: 'relative',
      width: '100%',
    }
  }

  boxStyle.value = {
    height: `${height}px`,
    backgroundColor: props.bgColor,
    borderRadius: '999px',
    display: 'flex',
    alignItems: 'center',
    padding: '0 12px',
    pointerEvents: 'auto', // 恢复点击
    backdropFilter: 'blur(10px)',
    width: '100%', // 撑满容器剩余空间
    boxSizing: 'border-box'
  }
})

const onInput = (e: any) => {
  emit('update:modelValue', e.detail.value)
}

const onSearch = () => {
  emit('search', props.modelValue)
}

const onClick = () => {
  if (!props.isInput) {
    emit('click')
  }
}

const onBack = () => {
  emit('back')
}
</script>

<style scoped>
.navbar-search {
  /* 容器样式在 script 中动态计算 */
}

.search-box {
  /* 基础样式 */
  display: flex;
  align-items: center;
  transition: all 0.3s;
}

.search-icon {
  font-size: 16px;
  margin-right: 8px;
  color: #666;
}

.search-placeholder {
  font-size: 14px;
  color: #999;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.search-input {
  flex: 1;
  font-size: 14px;
  color: #333;
  height: 100%;
}

.input-placeholder {
  color: #999;
}

.back-icon-wrapper {
  padding: 0 8px 0 0;
  display: flex;
  align-items: center;
  height: 100%;
}

.back-icon {
  font-size: 18px;
  color: #333;
  font-weight: bold;
}

.search-action-btn {
  margin-left: 8px;
  padding: 0 8px;
  border-left: 1px solid #eee;
  font-size: 14px;
  color: #333;
  font-weight: 500;
}
</style>
