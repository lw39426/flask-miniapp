<template>
  <view class="chat-room">
    <!-- 导航栏 -->
    <view v-if="false" :style="{ paddingTop: `${safeAreaTop + 30}rpx` }" class="search-header">
      <view class="nav-content">
        <view class="nav-left" @tap="goBack">
          <view class="i-carbon-arrow-left" size="24" color="#000" />
        </view>
        <text class="nav-title">{{ roomName }}</text>
        <view class="nav-right" @tap="showMenu">
          <view class="i-carbon-overflow-menu-horizontal" size="24" color="#000" />
        </view>
      </view>
    </view>

    <!-- 消息记录流 -->
    <scroll-view
      class="flex-1"
      scroll-y
      :scroll-into-view="scrollToView"
      :scroll-with-animation="true"
      @scrolltoupper="loadMoreMessages"
    >
      <view v-if="hasMoreMessages" class="loading-more">
        <sar-loading size="small" />
        <text class="loading-text">加载更多</text>
      </view>
      <!-- 遍历消息记录 -->
      <view v-for="message in messages" :id="`msg-${message.id}`" :key="message.id">
        <!-- 时间分割线 -->
        <view v-if="message.showTime" class="time-divider">
          <text class="time-text">{{ formatMessageTime(message.timestamp) }}</text>
        </view>

        <!-- 消息项-消息气泡 -->
        <view class="message-wrapper" :class="{ self: message.isSelf }">
          <sar-avatar
            v-if="!message.isSelf"
            :src="message.avatar || ''"
            size="110rpx"
            class="message-avatar"
            @tap="showMenu"
          />
          <!-- 消息内容 -->
          <view class="message-bubble h-[40rpx]" :class="[message.isSelf ? 'self-bubble' : 'other-bubble']">
            <!-- 文本消息 -->
            <view v-if="message.type === 'text'" class="text-[32rpx] color-[#000] line-height-[40rpx]">
              {{ message.content }}
            </view>

            <!-- 图片消息 -->
            <image
              v-if="message.type === 'image'"
              :src="message.content"
              class="message-image"
              mode="aspectFill"
              @tap="previewImage(message.content)"
            />

            <!-- 语音消息 -->
            <view v-if="message.type === 'voice'" class="message-voice" @tap="playVoice(message)">
              <sar-icon name="file" icon-size="48rpx" :color="message.isSelf ? '#f00' : '#000'" />
              <text class="voice-duration">{{ message.duration }}"</text>
            </view>
          </view>

          <sar-avatar v-if="message.isSelf" :src="message.avatar" size="110rpx" class="message-avatar" />
        </view>
      </view>

      <view id="bottom-anchor" class="bottom-anchor" />
    </scroll-view>

    <!-- 输入栏 -->
    <view class="input-bar">
      <view class="input-content">
        <!-- 语音/文字切换 -->
        <view class="input-btn" @tap="toggleVoiceMode">
          <sar-icon :name="isVoiceMode ? 'volume-up' : 'loading'" size="24" color="#333" />
        </view>

        <!-- 文本输入框 -->
        <view v-if="!isVoiceMode" class="input-wrapper">
          <textarea
            v-model="inputText"
            class="text-input"
            placeholder="请输入消息"
            :auto-height="true"
            :maxlength="500"
            :cursor-spacing="20"
            @focus="onInputFocus"
            @blur="onInputBlur"
          />
        </view>

        <!-- 语音按钮 -->
        <view v-else class="voice-btn" @touchstart="startRecord" @touchend="stopRecord">
          <text class="voice-btn-text">{{ isRecording ? '松开发送' : '按住说话' }}</text>
        </view>

        <!-- 表情按钮 -->
        <view v-if="!isVoiceMode" class="input-btn" @tap="toggleEmoji">
          <sar-icon name="smile" size="24" color="#333" />
        </view>

        <!-- 更多功能按钮 -->
        <view class="input-btn" @tap="toggleMorePanel">
          <view class="i-carbon-add-alt" size="24" color="#333" />
        </view>

        <!-- 发送按钮 -->
        <view v-if="inputText.trim() && !isVoiceMode" class="send-btn" @tap="sendMessage">
          <text class="send-btn-text">发送</text>
        </view>
      </view>

      <!-- 表情面板 -->
      <view v-if="showEmojiPanel" class="emoji-panel">
        <view class="emoji-grid">
          <view
            v-for="(emoji, index) in emojiList"
            :key="index"
            class="emoji-item"
            @tap="insertEmoji(emoji)"
          >
            <text class="emoji-text">{{ emoji }}</text>
          </view>
        </view>
      </view>

      <!-- 更多功能面板 -->
      <view v-if="showMorePanel" class="more-panel">
        <view class="more-grid">
          <view class="more-item" @tap="chooseImage">
            <view class="more-icon bg-blue">
              <sar-icon name="image" size="28" color="#fff" />
            </view>
            <text class="more-text">相册</text>
          </view>
          <view class="more-item" @tap="takePhoto">
            <view class="more-icon bg-green">
              <sar-icon name="camera" size="28" color="#fff" />
            </view>
            <text class="more-text">拍摄</text>
          </view>
          <view class="more-item" @tap="chooseLocation">
            <view class="more-icon bg-orange">
              <sar-icon name="map-pin" size="28" color="#fff" />
            </view>
            <text class="more-text">位置</text>
          </view>
          <view class="more-item" @tap="chooseFile">
            <view class="more-icon bg-purple">
              <sar-icon name="file-text" size="28" color="#fff" />
            </view>
            <text class="more-text">文件</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { nextTick, ref } from 'vue'
// 页面参数
const roomId = ref('')
const roomName = ref('')
// 页面配置
definePage({
  style: {
    navigationBarTitleText: '聊天',
    navigationStyle: 'default',
    backgroundColor: '#f7f7f7',
  }
})

// 类型定义
interface Message {
  id: string
  type: 'text' | 'image' | 'voice'
  content: string
  timestamp: number
  isSelf: boolean
  avatar: string
  showTime?: boolean
  duration?: number
}

// 状态管理
const messages = ref<Message[]>([])
const inputText = ref('')
const isVoiceMode = ref(false)
const isRecording = ref(false)
const showEmojiPanel = ref(false)
const showMorePanel = ref(false)
const hasMoreMessages = ref(true)
const scrollToView = ref('')

// 表情列表
const emojiList = [
  '😀',
  '😃',
  '😄',
  '😁',
  '😆',
  '😅',
  '😂',
  '🤣',
  '😊',
  '😇',
  '🙂',
  '🙃',
  '😉',
  '😌',
  '😍',
  '🥰',
  '😘',
  '😗',
  '😙',
  '😚',
  '😋',
  '😛',
  '😝',
  '😜',
  '🤪',
  '🤨',
  '🧐',
  '🤓',
  '😎',
  '🤩',
  '🥳',
  '😏'
]

// 滚动到底部
const scrollToBottom = () => {
  scrollToView.value = 'bottom-anchor'
}

// 初始化消息数据
const initMessages = () => {
  const now = Date.now()
  messages.value = [
    {
      id: '1',
      type: 'text',
      content: '您好，有什么可以帮您的？',
      timestamp: now - 600000,
      isSelf: false,
      avatar: 'https://cdn.pixabay.com/photo/2020/05/11/15/38/tom-5158824_1280.png',
      showTime: true
    },
    {
      id: '2',
      type: 'text',
      content: '我想咨询一下订单问题',
      timestamp: now - 300000,
      isSelf: true,
      avatar: 'https://cdn.pixabay.com/photo/2020/05/11/15/38/tom-5158824_1280.png',
      showTime: true
    },
    {
      id: '3',
      type: 'text',
      content: '好的，请提供您的订单号',
      timestamp: now - 120000,
      isSelf: false,
      avatar: 'https://cdn.pixabay.com/photo/2020/05/11/15/38/tom-5158824_1280.png'
    }
  ]

  nextTick(() => {
    scrollToBottom()
  })
}

// 格式化消息时间
const formatMessageTime = (timestamp: number) => {
  const date = new Date(timestamp)
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const messageDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())

  const hour = date.getHours().toString().padStart(2, '0')
  const minute = date.getMinutes().toString().padStart(2, '0')
  const timeStr = `${hour}:${minute}`

  if (messageDate.getTime() === today.getTime()) {
    return timeStr
  }
  else if (messageDate.getTime() === today.getTime() - 86400000) {
    return `昨天 ${timeStr}`
  }
  else {
    return `${date.getMonth() + 1}月${date.getDate()}日 ${timeStr}`
  }
}

// 加载更多消息
const loadMoreMessages = () => {
  if (!hasMoreMessages.value)
    return

  console.log('[v0] Loading more messages')
  // 模拟加载更多
  setTimeout(() => {
    hasMoreMessages.value = false
  }, 1000)
}

// 发送消息
const sendMessage = () => {
  if (!inputText.value.trim())
    return

  const newMessage: Message = {
    id: Date.now().toString(),
    type: 'text',
    content: inputText.value.trim(),
    timestamp: Date.now(),
    isSelf: true,
    avatar: '/static/images/my-avatar.png'
  }

  messages.value.push(newMessage)
  inputText.value = ''
  showEmojiPanel.value = false
  showMorePanel.value = false

  nextTick(() => {
    scrollToBottom()
  })

  // 模拟客服回复
  setTimeout(() => {
    const reply: Message = {
      id: (Date.now() + 1).toString(),
      type: 'text',
      content: '收到您的消息，正在为您处理...',
      timestamp: Date.now(),
      isSelf: false,
      avatar: '/static/images/customer-service.png'
    }
    messages.value.push(reply)
    nextTick(() => {
      scrollToBottom()
    })
  }, 1500)
}

// 切换语音模式
const toggleVoiceMode = () => {
  isVoiceMode.value = !isVoiceMode.value
  showEmojiPanel.value = false
  showMorePanel.value = false
}

// 开始录音
const startRecord = () => {
  isRecording.value = true
  console.log('[v0] Start recording')
  // TODO: 实现录音功能
}

// 停止录音
const stopRecord = () => {
  isRecording.value = false
  console.log('[v0] Stop recording')
  // TODO: 发送语音消息
}

// 切换表情面板
const toggleEmoji = () => {
  showEmojiPanel.value = !showEmojiPanel.value
  showMorePanel.value = false
}

// 插入表情
const insertEmoji = (emoji: string) => {
  inputText.value += emoji
}

// 切换更多面板
const toggleMorePanel = () => {
  showMorePanel.value = !showMorePanel.value
  showEmojiPanel.value = false
}

// 选择图片
const chooseImage = () => {
  uni.chooseImage({
    count: 1,
    success: (res) => {
      const newMessage: Message = {
        id: Date.now().toString(),
        type: 'image',
        content: res.tempFilePaths[0],
        timestamp: Date.now(),
        isSelf: true,
        avatar: '/static/images/my-avatar.png'
      }
      messages.value.push(newMessage)
      showMorePanel.value = false
      nextTick(() => {
        scrollToBottom()
      })
    }
  })
}

// 拍摄照片
const takePhoto = () => {
  uni.chooseImage({
    count: 1,
    sourceType: ['camera'],
    success: (res) => {
      const newMessage: Message = {
        id: Date.now().toString(),
        type: 'image',
        content: res.tempFilePaths[0],
        timestamp: Date.now(),
        isSelf: true,
        avatar: '/static/images/my-avatar.png'
      }
      messages.value.push(newMessage)
      showMorePanel.value = false
      nextTick(() => {
        scrollToBottom()
      })
    }
  })
}

// 选择位置
const chooseLocation = () => {
  uni.chooseLocation({
    success: (res) => {
      console.log('[v0] Location selected:', res)
      uni.showToast({ title: '位置已发送' })
      showMorePanel.value = false
    }
  })
}

// 选择文件
const chooseFile = () => {
  uni.showToast({ title: '文件功能开发中', icon: 'none' })
  showMorePanel.value = false
}

// 预览图片
const previewImage = (url: string) => {
  const imageUrls = messages.value
    .filter(msg => msg.type === 'image')
    .map(msg => msg.content)

  uni.previewImage({
    current: url,
    urls: imageUrls
  })
}

// 播放语音
const playVoice = (message: Message) => {
  console.log('[v0] Play voice:', message.id)
  uni.showToast({ title: '播放语音', icon: 'none' })
}

// 输入框聚焦
const onInputFocus = () => {
  showEmojiPanel.value = false
  showMorePanel.value = false
}

// 输入框失焦
const onInputBlur = () => {
  // 延迟处理，避免点击按钮时输入框立即失焦
}

// 显示菜单
const showMenu = () => {
  uni.showActionSheet({
    itemList: ['查看资料', '消息免打扰', '清空聊天记录'],
    success: (res) => {
      console.log('[v0] Menu action selected:', res.tapIndex)
    }
  })
}

// 返回
const goBack = () => {
  uni.navigateBack()
}

const safeAreaTop = ref(0)
// 页面加载
onLoad((options: any) => {
  const systemInfo = uni.getSystemInfoSync()
  console.log('系统信息：', systemInfo)
  safeAreaTop.value = systemInfo.safeAreaInsets.top // 获取安全区域顶部的内边距
  roomId.value = options.id || ''
  roomName.value = options.name || '聊天'
  uni.setNavigationBarTitle({
    title: options.name
  })

  initMessages()
})
</script>

<style lang="scss" scoped>
.chat-room {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: #ededed;
}

.search-header {
  background: #ffffff;
  padding: 0rpx;
  /* padding: 20rpx 32rpx; */
  box-shadow: 0 2rpx 10rpx rgba(0, 0, 0, 0.05);
}

.nav-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 88rpx;
  padding: 0 32rpx;
}

.nav-left,
.nav-right {
  width: 80rpx;
  display: flex;
  align-items: center;
}

.nav-title {
  font-size: 36rpx;
  font-weight: 600;
  color: #000;
}

.loading-more {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 24rpx 0;
}

.loading-text {
  margin-left: 16rpx;
  font-size: 28rpx;
  color: #999;
}

.time-divider {
  display: flex;
  justify-content: center;
  margin: 32rpx 0;
}

.time-text {
  padding: 8rpx 24rpx;
  background-color: rgba(0, 0, 0, 0.1);
  border-radius: 8rpx;
  font-size: 24rpx;
  color: #999;
}

.message-wrapper {
  display: flex;
  margin-bottom: 32rpx;

  &.self {
    display: flex;
    flex-direction: row;
    justify-content: flex-end;
  }
}

.message-avatar {
  flex-shrink: 0;
}

.message-bubble {
  max-width: 500rpx;
  padding: 20rpx 24rpx;
  margin: 0 16rpx;
  border-radius: 16rpx;
  word-wrap: break-word;

  &.other-bubble {
    background-color: #fff;
  }

  &.self-bubble {
    background-color: #95ec69;
  }
}

.message-text {
  font-size: 32rpx;
  line-height: 1.5;
  color: #000;
}

.message-image {
  width: 400rpx;
  height: 400rpx;
  border-radius: 8rpx;
}

.message-voice {
  display: flex;
  align-items: center;
  min-width: 120rpx;
}

.voice-duration {
  margin-left: 16rpx;
  font-size: 28rpx;
}

.bottom-anchor {
  height: 1rpx;
}

.input-bar {
  height: 12vh;
  background-color: #f7f7f7;
  border-top: 1px solid #e5e5e5;
}

.input-content {
  display: flex;
  align-items: flex-end;
  padding: 16rpx 32rpx;
}

.input-btn {
  width: 72rpx;
  height: 72rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.input-wrapper {
  flex: 1;
  margin: 0 16rpx;
  background-color: #fff;
  border-radius: 12rpx;
  padding: 16rpx 24rpx;
}

.text-input {
  width: 100%;
  font-size: 32rpx;
  line-height: 1.5;
  min-height: 40rpx;
  max-height: 200rpx;
}

.voice-btn {
  flex: 1;
  margin: 0 16rpx;
  height: 72rpx;
  background-color: #fff;
  border-radius: 12rpx;
  display: flex;
  align-items: center;
  justify-content: center;

  &:active {
    background-color: #e5e5e5;
  }
}

.voice-btn-text {
  font-size: 32rpx;
  color: #333;
}

.send-btn {
  width: 120rpx;
  height: 72rpx;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 12rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-left: 16rpx;
}

.send-btn-text {
  font-size: 32rpx;
  color: #fff;
  font-weight: 500;
}

.emoji-panel {
  padding: 32rpx;
  background-color: #fff;
  border-top: 1px solid #e5e5e5;
}

.emoji-grid {
  display: grid;
  grid-template-columns: repeat(8, 1fr);
  gap: 24rpx;
}

.emoji-item {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 80rpx;
}

.emoji-text {
  font-size: 48rpx;
}

.more-panel {
  padding: 32rpx;
  background-color: #fff;
  border-top: 1px solid #e5e5e5;
}

.more-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 32rpx;
}

.more-item {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.more-icon {
  width: 120rpx;
  height: 120rpx;
  border-radius: 24rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 16rpx;
}

.bg-blue {
  background-color: #576ff3;
}

.bg-green {
  background-color: #07c160;
}

.bg-orange {
  background-color: #ff9500;
}

.bg-purple {
  background-color: #9f7aea;
}

.more-text {
  font-size: 24rpx;
  color: #666;
}
</style>
