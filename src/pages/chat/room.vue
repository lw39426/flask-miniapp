<template>
  <!-- 主容器：Flexbox 垂直布局，高度 100vh -->
  <view
    class="h-100vh flex flex-col overflow-hidden bg-[#f5f5f5]"
    :style="{ paddingBottom: `${keyboardHeight}px` }"
  >
    <!-- 顶部自定义导航栏 - 固定高度 -->
    <view
      v-if="false"
      class="flex-shrink-0 border-b-1 border-[#e5e5e5] bg-white"
      :style="{ paddingTop: `${safeAreaTop}px` }"
    >
      <view class="h-[88rpx] flex items-center justify-between px-[24rpx]">
        <!-- 左侧返回按钮 -->
        <view class="w-[80rpx] flex cursor-pointer items-center transition-opacity active:opacity-60" @tap="goBack">
          <sar-icon name="chevron-left" size="20" color="#333" />
        </view>

        <!-- 中间对方信息 -->
        <view class="flex flex-1 items-center justify-center">
          <text class="text-[32rpx] color-[#333] font-600">{{ roomName }}</text>
        </view>

        <!-- 右侧更多操作 -->
        <view class="w-[80rpx] flex cursor-pointer items-center justify-end transition-opacity active:opacity-60" @tap="showMenu">
          <sar-icon name="more-horizontal" size="20" color="#333" />
        </view>
      </view>
    </view>

    <!-- 中间消息记录区域 - flex: 1 自动填充剩余空间 -->
    <scroll-view
      class="flex-1 overflow-y-auto pt-[20rpx]"
      scroll-y
      :scroll-into-view="scrollToView"
      :scroll-with-animation="true"
      @scrolltoupper="loadMoreMessages"
      @tap="handleMessageListTap"
    >
      <view v-if="hasMoreMessages" class="flex cursor-pointer items-center justify-center p-[24rpx_0]">
        <sar-loading size="small" />
        <text class="ml-[16rpx] text-[28rpx] color-[#999]">加载更多</text>
      </view>
      <!-- 遍历消息记录 -->
      <view v-for="message in messages" :id="`msg-${message.id}`" :key="message.id" class="px-[24rpx]">
        <!-- 时间分割线 / 系统提示 -->
        <view v-if="message.showTime" class="mt-0 flex justify-center">
          <view class="rounded-[8rpx] bg-black/8 p-[6rpx_20rpx]">
            <text class="text-[24rpx] color-[#999] leading-none">{{ formatMessageTime(message.created_at) }}</text>
          </view>
        </view>

        <!-- 消息项-消息气泡 -->
        <view class="mb-[40rpx]" :class="{ 'flex justify-end': message.is_own, 'flex': !message.is_own }">
          <sar-avatar
            v-if="!message.is_own"
            :src="message.sender?.avatar || ''"
            size="90rpx"
            class="h-[40rpx] w-[40rpx] flex-shrink-0 overflow-hidden rounded-[8rpx]"
            @tap="showMenu"
          />

          <!-- 消息内容容器 -->
          <view class="flex flex-row-reverse items-center" :class="{ 'items-end': message.is_own, 'items-start': !message.is_own }">
            <!-- 消息气泡 -->
            <view
              class="message-bubble m-[0_16rpx] max-w-[432rpx] break-words rounded-[8rpx] p-[20rpx_24rpx] transition-all"
              :class="[
                message.is_own ? 'self-bubble bg-[#95ec69]' : 'other-bubble bg-white',
                message.status === 'failed' ? 'failed-message' : '',
              ]"
              @longpress="showMessageMenu(message)"
            >
              <!-- 文本消息 -->
              <view v-if="message.message_type === 'text'" class="break-all text-[32rpx] color-[#333] leading-[44rpx]">
                {{ message.content }}
              </view>

              <!-- 图片消息 -->
              <image
                v-if="message.message_type === 'image'"
                :src="message.content"
                class="block max-h-[400rpx] max-w-[400rpx] rounded-[8rpx]"
                mode="aspectFill"
                @tap="previewImage(message.content)"
              />

              <!-- 消息状态 -->
              <view v-if="message.is_own && message.status" class="absolute left-[-48rpx] top-1/2 flex items-center justify-center -translate-y-1/2">
                <!-- 发送中 -->
                <sar-loading v-if="message.status === 'sending'" size="small" />
                <!-- 已发送 - 显示已读/未读状态 -->
                <view v-else-if="message.status === 'sent'" class="flex items-center justify-center">
                  <!-- 已读（双勾） -->
                  <view v-if="message.is_read" class="flex items-center justify-center">
                    <view class="i-carbon-checkmark-outline text-[#4fc08d]" />
                    <view class="i-carbon-checkmark-outline text-[#4fc08d]" style="margin-left: -8rpx;" />
                  </view>
                  <!-- 未读（单勾） -->
                  <view v-else class="flex items-center justify-center">
                    <view class="i-carbon-checkmark-outline text-[#999]" />
                  </view>
                </view>
              </view>
            </view>

            <!-- 失败提示文本 -->
            <view
              v-if="message.is_own && message.status === 'failed'"
              class="mx-[16rpx] mt-[8rpx] flex cursor-pointer items-center gap-[8rpx] text-[24rpx] color-[#ff4d4f]"
              @tap="resendMessage(message)"
            >
              <text>发送失败请检查网络，点击重试</text>
              <view class="i-carbon-rotate-360 text-red-6" />
            </view>
          </view>

          <sar-avatar
            v-if="message.is_own"
            :src="message.sender?.avatar"
            size="90rpx"
            class="h-[40rpx] w-[40rpx] flex-shrink-0 overflow-hidden rounded-[8rpx]"
          />
        </view>
      </view>

      <!-- 对方正在输入提示 -->
      <view v-if="isOtherTyping" class="mb-[16rpx] flex items-center px-[32rpx] py-[16rpx]">
        <text class="mr-[12rpx] text-[28rpx] color-[#999]">对方正在输入</text>
        <view class="flex items-center gap-[8rpx]">
          <view class="typing-dot" />
          <view class="typing-dot typing-dot-delay-1" />
          <view class="typing-dot typing-dot-delay-2" />
        </view>
      </view>

      <view id="bottom-anchor" class="h-[1rpx]" />
    </scroll-view>

    <!-- 底部输入栏 - 固定初始高度，自适应变化 -->
    <view
      class="flex-shrink-0 border-t-1 border-[#e5e5e5] bg-[#f7f7f7]"
      :style="{ paddingBottom: keyboardHeight > 0 ? '12rpx' : 'env(safe-area-inset-bottom)' }"
    >
      <view class="min-h-[78rpx] flex items-end gap-[12rpx] p-[4rpx_24rpx]">
        <!-- 语音/文字切换 -->
        <view class="h-[72rpx] w-[72rpx] flex flex-shrink-0 cursor-pointer items-center justify-center rounded-full transition-all active:scale-95 active:bg-black/5" @tap="toggleVoiceMode">
          <view :class="isVoiceMode ? 'i-carbon-keyboard text-gray-500' : 'i-carbon-microphone-filled text-gray-500'" />
        </view>

        <!-- 文本输入框 -->
        <view v-if="!isVoiceMode" class="input-container">
          <textarea
            v-model="inputText"
            class="max-h-[176rpx] min-h-[44rpx] w-full text-[32rpx] color-[#333] leading-[44rpx]"
            placeholder="请输入消息"
            :auto-height="true"
            :maxlength="820"
            :adjust-position="false"
            :cursor-spacing="10"
            :show-confirm-bar="false"
            @input="onInputChange"
            @focus="onInputFocus"
            @blur="onInputBlur"
            @linechange="onLineChange"
          />
        </view>

        <!-- 语音按钮 -->
        <view
          v-else
          class="h-[72rpx] flex flex-1 cursor-pointer items-center justify-center rounded-[12rpx] bg-white shadow-[0_2rpx_8rpx_rgba(0,0,0,0.05)] transition-all active:scale-98"
          :class="{ 'bg-[#e8f5e9]': isRecording }"
          @touchstart="startRecord"
          @touchend="stopRecord"
        >
          <text class="text-[32rpx] color-[#333] font-500">{{ isRecording ? '松开 结束' : '按住 说话' }}</text>
        </view>

        <!-- 表情按钮 -->
        <view v-if="!isVoiceMode" class="h-[72rpx] w-[72rpx] flex flex-shrink-0 cursor-pointer items-center justify-center rounded-full transition-all active:scale-95 active:bg-black/5" @tap="toggleEmoji">
          <view class="i-carbon-face-activated text-gray-500" />
        </view>

        <!-- 发送按钮 或 更多功能按钮 -->
        <view
          v-if="inputText.trim() && !isVoiceMode"
          class="h-[72rpx] w-[128rpx] flex flex-shrink-0 cursor-pointer items-center justify-center rounded-[12rpx] from-[#667eea] to-[#576ff3] bg-gradient-to-br shadow-[0_4rpx_12rpx_rgba(87,111,243,0.3)] transition-all active:scale-95 active:shadow-[0_2rpx_8rpx_rgba(87,111,243,0.4)]"
          @tap="sendMessage"
        >
          <text class="text-[32rpx] color-white font-600">发送</text>
        </view>
        <view
          v-else-if="!isVoiceMode"
          class="h-[72rpx] w-[72rpx] flex flex-shrink-0 cursor-pointer items-center justify-center rounded-full transition-all active:scale-95 active:bg-black/5"
          @tap="toggleMorePanel"
        >
          <view class="i-carbon-add-alt text-gray-500" />
        </view>
      </view>

      <!-- 表情面板 -->
      <view v-if="showEmojiPanel" class="max-h-[480rpx] overflow-y-auto border-t-1 border-[#e5e5e5] bg-[#f7f7f7] p-[32rpx]">
        <view class="grid grid-cols-8 gap-[16rpx]">
          <view
            v-for="(emoji, index) in emojiList"
            :key="index"
            class="h-[80rpx] flex cursor-pointer items-center justify-center rounded-[12rpx] bg-white transition-all active:scale-95 active:bg-[#f0f0f0]"
            @tap="insertEmoji(emoji)"
          >
            <text class="text-[48rpx] leading-none">{{ emoji }}</text>
          </view>
        </view>
      </view>

      <!-- 更多功能面板 -->
      <view v-if="showMorePanel" class="border-t-1 border-[#e5e5e5] bg-[#f7f7f7] p-[48rpx_32rpx]">
        <view class="grid grid-cols-4 gap-x-[16rpx] gap-y-[32rpx]">
          <view class="flex flex-col cursor-pointer items-center transition-all active:scale-95" @tap="chooseImage">
            <view class="mb-[16rpx] h-[120rpx] w-[120rpx] flex items-center justify-center rounded-[24rpx] from-[#667eea] to-[#576ff3] bg-gradient-to-br shadow-[0_4rpx_12rpx_rgba(0,0,0,0.1)]">
              <sar-icon name="image" size="28" color="#fff" />
            </view>
            <text class="text-[26rpx] color-[#666] font-500">相册</text>
          </view>
          <view class="flex flex-col cursor-pointer items-center transition-all active:scale-95" @tap="takePhoto">
            <view class="mb-[16rpx] h-[120rpx] w-[120rpx] flex items-center justify-center rounded-[24rpx] from-[#11c869] to-[#07c160] bg-gradient-to-br shadow-[0_4rpx_12rpx_rgba(0,0,0,0.1)]">
              <sar-icon name="camera" size="28" color="#fff" />
            </view>
            <text class="text-[26rpx] color-[#666] font-500">拍摄</text>
          </view>
          <view class="flex flex-col cursor-pointer items-center transition-all active:scale-95" @tap="chooseLocation">
            <view class="mb-[16rpx] h-[120rpx] w-[120rpx] flex items-center justify-center rounded-[24rpx] from-[#ffa940] to-[#ff9500] bg-gradient-to-br shadow-[0_4rpx_12rpx_rgba(0,0,0,0.1)]">
              <sar-icon name="map-pin" size="28" color="#fff" />
            </view>
            <text class="text-[26rpx] color-[#666] font-500">位置</text>
          </view>
          <view class="flex flex-col cursor-pointer items-center transition-all active:scale-95" @tap="chooseFile">
            <view class="mb-[16rpx] h-[120rpx] w-[120rpx] flex items-center justify-center rounded-[24rpx] from-[#b794f4] to-[#9f7aea] bg-gradient-to-br shadow-[0_4rpx_12rpx_rgba(0,0,0,0.1)]">
              <sar-icon name="file-text" size="28" color="#fff" />
            </view>
            <text class="text-[26rpx] color-[#666] font-500">文件</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import type { ChatMessage } from '@/api/types/chat'

import { onHide, onLoad, onShow } from '@dcloudio/uni-app'
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue'

import { getMessages, markRoomAsRead, sendMessage as sendMessageApi } from '@/api/chat'
import { useNavbar } from '@/hooks/useNavbar'
import { PAGINATION } from '@/pages/chat/config'
import { useChatStore } from '@/store/chat'
import { SocketEvent, socketManager } from '@/utils/socket'

// 页面参数
const roomId = ref<number>(0)
const roomName = ref('')

// 页面配置
definePage({
  style: {
    navigationStyle: 'default', // 使用系统导航栏
    navigationBarTitleText: '聊天',
    backgroundColor: '#f5f5f5',
  }
})

// 扩展消息类型
interface Message extends ChatMessage {
  showTime?: boolean
  status?: 'sending' | 'sent' | 'failed'
  localId?: number
  duration?: number
  is_read?: boolean // 已读状态
}

// 状态管理
const { safeAreaTop, safeAreaBottom } = useNavbar()
const messages = ref<Message[]>([])
const inputText = ref('')
const isVoiceMode = ref(false)
const isRecording = ref(false)
const showEmojiPanel = ref(false)
const showMorePanel = ref(false)
const scrollToView = ref('')
const loading = ref(false)
const isOtherTyping = ref(false) // 对方是否正在输入
let otherTypingTimer: number | null = null // 对方输入状态自动隐藏定时器
let inputTypingTimer: number | null = null // 输入防抖定时器（发送typing事件）
const typingStopTimer = ref<number | null>(null) // 停止输入定时器
const keyboardHeight = ref(0) // 键盘高度（用于动态 padding-bottom）

// 消息超时处理 (localId -> timeoutId)
const messageTimeouts = new Map<number, any>()

/**
 * 定义事件类型，避免 any
 */
interface InputFocusEvent {
  detail: {
    height?: number
  }
}

interface LineChangeEvent {
  detail: {
    lineCount?: number
    height?: number
  }
}

// 分页状态
const pagination = ref({
  page: 1,
  per_page: PAGINATION.MESSAGES_PER_PAGE,
  total: 0,
  has_next: false,
  has_prev: false
})

// 当前用户信息（从 store 获取）
const currentUser = ref({
  id: 0,
  type: 'NormalUser' as const,
  nickname: '',
  avatar: ''
})

// 计算是否还有更多消息
const hasMoreMessages = computed(() => pagination.value.has_next)

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
  nextTick(() => {
    scrollToView.value = ``
  })
}

onMounted(() => {
  // 【核心】监听键盘高度变化，参考 CommentSystem.vue
  uni.onKeyboardHeightChange((res) => {
    console.log('[Room] Keyboard height changed:', res.height)
    keyboardHeight.value = res.height
    if (res.height > 0) {
      // 键盘弹起，确保看到最新消息
      nextTick(() => {
        scrollToBottom()
      })
    }
  })
})

/**
 * 处理消息时间分割线
 */
const processMessageTime = () => {
  messages.value.forEach((msg, index) => {
    if (index === 0) {
      msg.showTime = true
    }
    else {
      const prevMsg = messages.value[index - 1]
      const currentTime = new Date(msg.created_at).getTime()
      const prevTime = new Date(prevMsg.created_at).getTime()

      // 相隔超过 5 分钟显示时间
      msg.showTime = (currentTime - prevTime) > 5 * 60 * 1000
    }
  })
}

/**
 * 加载历史消息
 */
const loadMessages = async (isLoadMore = false) => {
  if (loading.value)
    return

  try {
    loading.value = true

    if (isLoadMore) {
      pagination.value.page++
    }
    else {
      pagination.value.page = 1
      messages.value = []
    }

    const response = await getMessages(roomId.value, {
      page: pagination.value.page,
      per_page: pagination.value.per_page
    })

    if (response.code === 200 && response.data) {
      const newMessages = response.data.messages.map(msg => ({
        ...msg,
        status: 'sent' as const
      }))
      // const newMessages = Array.from({ length: 20 }, (_, i) => ({
      //   ...response.data.messages[0],
      //   id: i, // 避免 key 重复
      //   content: `消息${i + 1}`,
      //   status: 'sent' as const
      // }))

      // 加载更多时追加到顶部
      if (isLoadMore) {
        messages.value = [...newMessages, ...messages.value].sort(
          (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        )
      }
      else {
        messages.value = newMessages.sort(
          (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        )
        // 首次加载滚动到底部
        nextTick(() => scrollToBottom())
      }

      // 更新分页信息
      pagination.value = {
        ...response.data.pagination,
        per_page: pagination.value.per_page
      }

      // 处理时间分割线
      processMessageTime()
    }
  }
  catch (error) {
    console.error('[Room] 加载消息失败:', error)
    uni.showToast({ title: '加载失败', icon: 'none' })
  }
  finally {
    loading.value = false
  }
}

/**
 * 发送文本消息
 * 优先使用 WebSocket,断网时降级为 HTTP API
 */
const sendTextMessage = async (content: string) => {
  if (!content.trim())
    return

  const tempId = Date.now()

  // 创建临时消息对象（立即显示在 UI）
  const tempMessage: Message = {
    id: tempId,
    localId: tempId,
    room_id: roomId.value,
    content: content.trim(),
    message_type: 'text',
    created_at: new Date().toISOString(),
    sender: {
      id: currentUser.value.id,
      user_type: currentUser.value.type,
      nickname: currentUser.value.nickname,
      avatar: currentUser.value.avatar
    },
    is_own: true,
    status: 'sending'
  }

  messages.value.push(tempMessage)
  inputText.value = ''
  showEmojiPanel.value = false
  showMorePanel.value = false
  // 确保消息发送成功后滚动到底部
  nextTick(() => {
    scrollToBottom()
  })

  // 设置 30 秒超时
  const timeoutId = setTimeout(() => {
    const index = messages.value.findIndex(m => m.localId === tempId)
    if (index !== -1 && messages.value[index].status === 'sending') {
      messages.value[index].status = 'failed'
      console.warn('[Room] 消息发送超时')
      uni.showToast({ title: '发送超时，请重试', icon: 'none' })
    }
    messageTimeouts.delete(tempId)
  }, 30000)
  messageTimeouts.set(tempId, timeoutId)

  try {
    // 【修改】优先使用 WebSocket 发送
    const wsSuccess = await socketManager.sendMessage(roomId.value, content.trim(), 'text', tempId)

    if (wsSuccess) {
      console.log('[Room] 📤 Message sent via WebSocket, waiting for server response...')
      // WebSocket 发送成功,等待服务器通过 new_message 事件返回完整消息
      // handleRoomMessage 会处理服务器返回的消息并更新 UI
    }
    else {
      // WebSocket 未连接,降级使用 HTTP API
      console.log('[Room] ⚠️ WebSocket not available, falling back to HTTP API')

      const response = await sendMessageApi(roomId.value, {
        content: content.trim(),
        type: 'text'
      })

      // HTTP 发送成功，清除超时
      if (messageTimeouts.has(tempId)) {
        clearTimeout(messageTimeouts.get(tempId))
        messageTimeouts.delete(tempId)
      }

      if (response.code === 200 && response.data) {
        // 替换临时消息为服务器返回的消息
        const index = messages.value.findIndex(m => m.localId === tempId)
        if (index !== -1) {
          messages.value[index] = {
            ...response.data,
            status: 'sent'
          }
          processMessageTime()

          // 确保消息发送成功后滚动到底部
          nextTick(() => {
            scrollToBottom()
          })
        }
      }
    }
  }
  catch (error) {
    clearTimeout(timeoutId)

    // 标记为发送失败
    const index = messages.value.findIndex(m => m.localId === tempId)
    if (index !== -1) {
      messages.value[index].status = 'failed'
    }
    console.error('[Room] 发送消息失败:', error)
    uni.showToast({ title: '发送失败，点击消息重试', icon: 'none' })
  }
}

/**
 * 发送图片消息
 */
const sendImageMessage = async (imagePath: string) => {
  // TODO: 先上传图片到服务器，获取 URL
  // 这里需要实现图片上传功能
  uni.showToast({ title: '图片上传功能开发中', icon: 'none' })

  // 示例代码：
  // const uploadRes = await uploadImage(imagePath)
  // await sendMessageApi(roomId.value, {
  //   content: uploadRes.url,
  //   type: 'image'
  // })
}

/**
 * 重试发送失败的消息
 * 优先使用 WebSocket,断网时降级为 HTTP API
 */
const resendMessage = async (message: Message) => {
  if (message.status !== 'failed')
    return
  if (!message.localId) {
    console.warn('[Room] 无法重试：缺少 localId')
    return
  }

  // 更新状态为发送中
  const index = messages.value.findIndex(m => m.localId === message.localId)
  if (index === -1)
    return

  messages.value[index].status = 'sending'

  // 设置 30 秒超时
  const timeoutId = setTimeout(() => {
    const currentIndex = messages.value.findIndex(m => m.localId === message.localId)
    if (currentIndex !== -1 && messages.value[currentIndex].status === 'sending') {
      messages.value[currentIndex].status = 'failed'
      console.warn('[Room] 消息重试超时')
      uni.showToast({ title: '发送超时，请重试', icon: 'none' })
    }
    messageTimeouts.delete(message.localId!)
  }, 30000)
  messageTimeouts.set(message.localId, timeoutId)

  try {
    // 【修改】优先使用 WebSocket 发送
    const wsSuccess = await socketManager.sendMessage(roomId.value, message.content, message.message_type, message.localId)

    if (wsSuccess) {
      console.log('[Room] 📤 Retry message sent via WebSocket, waiting for server response...')
      // WebSocket 发送成功,等待服务器通过 new_message 事件返回完整消息
    }
    else {
      // WebSocket 未连接,降级使用 HTTP API
      console.log('[Room] ⚠️ WebSocket not available, falling back to HTTP API for retry')

      const response = await sendMessageApi(roomId.value, {
        content: message.content,
        type: message.message_type
      })

      // HTTP 发送成功，清除超时
      if (messageTimeouts.has(message.localId)) {
        clearTimeout(messageTimeouts.get(message.localId))
        messageTimeouts.delete(message.localId)
      }

      if (response.code === 200 && response.data) {
        const currentIndex = messages.value.findIndex(m => m.localId === message.localId)
        if (currentIndex !== -1) {
          messages.value[currentIndex] = {
            ...response.data,
            status: 'sent'
          }
          processMessageTime()

          // 重试成功后滚动到底部
          nextTick(() => {
            scrollToBottom()
          })
        }
        uni.showToast({ title: '发送成功', icon: 'success' })
      }
    }
  }
  catch (error) {
    clearTimeout(timeoutId)
    const currentIndex = messages.value.findIndex(m => m.localId === message.localId)
    if (currentIndex !== -1) {
      messages.value[currentIndex].status = 'failed'
    }
    console.error('[Room] 重试发送失败:', error)
    uni.showToast({ title: '发送失败', icon: 'none' })
  }
}

// 初始化消息数据 (移除模拟数据)
const initMessages = () => {
  // 不再使用模拟数据，直接加载真实数据
  loadMessages()
}

// 格式化消息时间
const formatMessageTime = (timestamp: string) => {
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

// 滚动到顶部加载更多消息
const loadMoreMessages = () => {
  if (loading.value || !hasMoreMessages.value)
    return

  console.log('[Room] Loading more messages')
  loadMessages(true)
}

// 发送消息（主入口）
const sendMessage = () => {
  console.log('[Room] sendMessage called, inputText:', inputText.value)

  if (!inputText.value.trim()) {
    console.warn('[Room] Empty message, skipping')
    return
  }

  // 保存内容后立即发送
  const content = inputText.value.trim()
  console.log('[Room] Sending message:', content)

  // 发送消息
  sendTextMessage(content)

  // 关闭所有面板
  showEmojiPanel.value = false
  showMorePanel.value = false
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
  // 如果表情面板已打开，关闭它
  if (showEmojiPanel.value) {
    showEmojiPanel.value = false
    return
  }

  // 打开表情面板，关闭更多面板
  showEmojiPanel.value = true
  showMorePanel.value = false

  // 收起键盘
  uni.hideKeyboard()
}

// 插入表情
const insertEmoji = (emoji: string) => {
  inputText.value += emoji
  // 插入表情后保持面板打开
}

// 切换更多面板
const toggleMorePanel = () => {
  // 如果更多面板已打开，关闭它
  if (showMorePanel.value) {
    showMorePanel.value = false
    return
  }

  // 打开更多面板，关闭表情面板
  showMorePanel.value = true
  showEmojiPanel.value = false

  // 收起键盘
  uni.hideKeyboard()
}

// 选择图片
const chooseImage = () => {
  uni.chooseImage({
    count: 1,
    success: async (res) => {
      showMorePanel.value = false
      await sendImageMessage(res.tempFilePaths[0])
    }
  })
}

// 拍摄照片
const takePhoto = () => {
  uni.chooseImage({
    count: 1,
    sourceType: ['camera'],
    success: async (res) => {
      showMorePanel.value = false
      await sendImageMessage(res.tempFilePaths[0])
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
    .filter(msg => msg.message_type === 'image')
    .map(msg => msg.content)

  uni.previewImage({
    current: url,
    urls: imageUrls
  })
}

// 播放语音
const playVoice = (message: Message) => {
  console.log('[Room] Play voice:', message.id)
  uni.showToast({ title: '播放语音', icon: 'none' })
}

/**
 * 停止输入状态
 */
const stopTyping = () => {
  console.log('[Room] Stop typing')

  if (inputTypingTimer) {
    clearTimeout(inputTypingTimer)
    inputTypingTimer = null
  }

  if (typingStopTimer.value) {
    clearTimeout(typingStopTimer.value)
    typingStopTimer.value = null
  }

  socketManager.sendTyping(roomId.value, false)
}

/**
 * 开始输入状态
 */
const startTyping = () => {
  console.log('[Room] Start typing')
  socketManager.sendTyping(roomId.value, true)

  // 3 秒后自动停止输入状态
  if (typingStopTimer.value) {
    clearTimeout(typingStopTimer.value)
  }

  typingStopTimer.value = setTimeout(() => {
    stopTyping()
  }, 3000) as unknown as number
}

/**
 * 监听输入内容变化（用于输入状态提示）
 */
const onInputChange = () => {
  // 如果输入框为空，停止输入状态
  if (!inputText.value.trim()) {
    stopTyping()
    return
  }

  // 防抖：500ms 内没有新的输入，才发送 typing_start
  if (inputTypingTimer) {
    clearTimeout(inputTypingTimer)
  }

  inputTypingTimer = setTimeout(() => {
    startTyping()
  }, 500) as unknown as number
}

// 输入框聚焦
const onInputFocus = (e: InputFocusEvent) => {
  console.log('[Room] Input focus event:', e)

  // 聚焦时关闭所有面板
  showEmojiPanel.value = false
  showMorePanel.value = false
}

// 输入框失焦
const onInputBlur = () => {
  console.log('[Room] Input blur')
  // 失焦时停止输入状态
  stopTyping()

  // 重置键盘高度（延迟处理，防止点击表情面板时闪烁）
  setTimeout(() => {
    keyboardHeight.value = 0
  }, 100)
}

// 监听文本框行数变化
const onLineChange = (e: LineChangeEvent) => {
  console.log('[Room] Line change:', e.detail)
  // 当输入内容增多导致行数变化时，确保滚动到底部
  nextTick(() => {
    scrollToBottom()
  })
}

/**
 * 点击消息列表空白处
 */
const handleMessageListTap = () => {
  // 关闭所有面板
  showEmojiPanel.value = false
  showMorePanel.value = false
  // 收起键盘
  uni.hideKeyboard()
}

// 显示房间菜单
const showMenu = () => {
  uni.showActionSheet({
    itemList: ['查看资料', '消息免打扰', '清空聊天记录'],
    success: (res) => {
      console.log('[Room] Menu action selected:', res.tapIndex)
    }
  })
}

/**
 * 复制消息内容
 */
const copyMessage = (message: Message) => {
  if (message.message_type === 'text') {
    uni.setClipboardData({
      data: message.content,
      success: () => {
        uni.showToast({ title: '复制成功', icon: 'success' })
      }
    })
  }
}

/**
 * 删除消息
 */
const deleteMessage = (message: Message) => {
  uni.showModal({
    title: '提示',
    content: '确定要删除这条消息吗？',
    success: (res) => {
      if (res.confirm) {
        const index = messages.value.findIndex(m => m.id === message.id)
        if (index !== -1) {
          messages.value.splice(index, 1)
          uni.showToast({ title: '删除成功', icon: 'success' })
          // TODO: 调用后端删除 API
        }
      }
    }
  })
}

/**
 * 转发消息
 */
const forwardMessage = (message: Message) => {
  uni.showToast({ title: '转发功能开发中', icon: 'none' })
  // TODO: 实现转发功能
}

/**
 * 显示消息操作菜单
 */
const showMessageMenu = (message: Message) => {
  const itemList: string[] = []

  // 根据消息类型添加不同的操作
  if (message.message_type === 'text') {
    itemList.push('复制')
  }

  if (message.is_own) {
    // 自己的消息可以删除
    itemList.push('删除')
  }
  else {
    // 别人的消息可以转发
    itemList.push('转发')
  }

  uni.showActionSheet({
    itemList,
    success: (res) => {
      const action = itemList[res.tapIndex]
      console.log('[Room] Message action:', action, message)

      switch (action) {
        case '复制':
          copyMessage(message)
          break
        case '删除':
          deleteMessage(message)
          break
        case '转发':
          forwardMessage(message)
          break
      }
    }
  })
}

// 返回
const goBack = () => {
  uni.navigateBack()
}

/**
 * 播放消息提示音
 */
const playMessageSound = () => {
  // #ifdef MP-WEIXIN
  try {
    const innerAudioContext = uni.createInnerAudioContext()
    innerAudioContext.src = '/static/audio/message.mp3'
    innerAudioContext.play()
  }
  catch (error) {
    console.error('[Room] 播放提示音失败:', error)
  }
  // #endif
}

/**
 * WebSocket 消息处理器
 */
const handleRoomMessage = (data: any) => {
  console.log('[Room] Received new message:', data)

  // ✅ 注意：WebSocket 返回的字段是 message_id，需要映射为 id
  const { room_id, message_id, content, message_type, created_at, sender, is_own, temp_id } = data

  // 只处理当前房间的消息
  if (room_id !== roomId.value) {
    console.log('[Room] Message from different room, ignoring')
    return
  }

  // 【优化】如果是自己发送的消息,查找并替换临时消息
  if (is_own) {
    // 优先通过 temp_id (localId) 匹配
    let tempIndex = -1
    if (temp_id) {
      tempIndex = messages.value.findIndex(m => m.localId === temp_id)
    }

    // 如果没匹配到，尝试通过内容和状态匹配 (兜底逻辑)
    if (tempIndex === -1) {
      tempIndex = messages.value.findIndex(
        m => m.status === 'sending' && m.content === content && m.message_type === message_type
      )
    }

    if (tempIndex !== -1) {
      console.log('[Room] ✅ Replacing temp message with server message, temp_id:', temp_id)

      // 清除该消息的发送超时定时器
      const localId = messages.value[tempIndex].localId
      if (localId && messageTimeouts.has(localId)) {
        clearTimeout(messageTimeouts.get(localId))
        messageTimeouts.delete(localId)
      }

      // 替换临时消息为服务器返回的真实消息
      messages.value[tempIndex] = {
        id: message_id,
        room_id,
        content,
        message_type,
        created_at,
        sender,
        is_own,
        status: 'sent'
      }

      // 处理时间分割线
      processMessageTime()

      // 滚动到底部
      nextTick(() => {
        scrollToBottom()
      })

      return
    }
  }

  // 检查是否已存在（避免重复）
  const exists = messages.value.some(m => m.id === message_id)
  if (exists) {
    console.log('[Room] Message already exists, ignoring')
    return
  }

  // 构造消息对象
  const newMessage: Message = {
    id: message_id,
    room_id,
    content,
    message_type,
    created_at,
    sender,
    is_own,
    status: 'sent'
  }

  // 添加到消息列表
  messages.value.push(newMessage)

  // 处理时间分割线
  processMessageTime()

  // 滚动到底部
  nextTick(() => {
    scrollToBottom()
  })

  // 播放提示音（非自己发送的消息）
  if (!is_own) {
    playMessageSound()
  }

  // 标记已读
  if (!is_own && roomId.value) {
    markRoomAsRead(roomId.value).catch((err) => {
      console.error('[Room] 标记已读失败:', err)
    })
  }
}

/**
 * 处理消息已读事件
 */
const handleMessageRead = (data: any) => {
  console.log('[Room] Message read event:', data)

  const { room_id, message_ids } = data

  // 只处理当前房间的消息
  if (room_id !== roomId.value) {
    console.log('[Room] Read event from different room, ignoring')
    return
  }

  // 更新消息已读状态
  if (Array.isArray(message_ids)) {
    message_ids.forEach((msgId: number) => {
      const index = messages.value.findIndex(m => m.id === msgId)
      if (index !== -1 && messages.value[index].is_own) {
        messages.value[index].is_read = true
        console.log('[Room] Updated message', msgId, 'as read')
      }
    })
  }
}

/**
 * 处理对方开始输入（添加防抖）
 */
const handleTypingStart = (data: any) => {
  console.log('[Room] Typing start:', data)

  const { room_id, user } = data

  // 只处理当前房间且不是自己的输入状态
  if (room_id !== roomId.value || user?.id === currentUser.value?.id) {
    return
  }

  // 清除之前的定时器
  if (otherTypingTimer) {
    clearTimeout(otherTypingTimer)
  }

  // 显示输入状态
  isOtherTyping.value = true
  uni.setNavigationBarTitle({
    title: '对方正在输入...'
  })

  // 3秒后自动隐藏（防止对方未发送 typing_stop）
  otherTypingTimer = setTimeout(() => {
    isOtherTyping.value = false
    otherTypingTimer = null
    uni.setNavigationBarTitle({
      title: roomName.value
    })
  }, 3000) as unknown as number
}

/**
 * 处理对方停止输入
 */
const handleTypingStop = (data: any) => {
  console.log('[Room] Typing stop:', data)

  const { room_id, user } = data

  // 只处理当前房间且不是自己的输入状态
  if (room_id !== roomId.value || user?.id === currentUser.value?.id) {
    return
  }

  // 清除定时器
  if (otherTypingTimer) {
    clearTimeout(otherTypingTimer)
    otherTypingTimer = null
  }

  // 隐藏输入状态
  isOtherTyping.value = false
  uni.setNavigationBarTitle({
    title: roomName.value
  })
}

/**
 * 【新增】处理用户状态变化（从会话房间接收）
 */
const handleUserStatusChange = (data: any) => {
  console.log('[Room] 👤 User status changed:', data)

  if (data.room_id === roomId.value) {
    // 更新聊天室顶部的用户在线状态
    // TODO: 如果需要在聊天室显示对方在线状态，可以在这里更新
  }
}

/**
 * 【新增】注册页面级监听器
 * 只监听与当前聊天室相关的事件
 */
const registerPageListeners = () => {
  console.log('[Room] 👂 Registering page listeners...')

  // 监听新消息（从个人房间接收）
  socketManager.on(SocketEvent.NEW_MESSAGE, handleRoomMessage)

  // 监听消息已读（从会话房间接收）
  socketManager.on(SocketEvent.MESSAGE_READ, handleMessageRead)

  // 监听对方输入状态（从会话房间接收）
  socketManager.on(SocketEvent.TYPING_START, handleTypingStart)
  socketManager.on(SocketEvent.TYPING_STOP, handleTypingStop)

  // 监听用户状态变化（从会话房间接收）
  socketManager.on(SocketEvent.USER_STATUS_CHANGE, handleUserStatusChange)

  console.log('[Room] ✅ Page listeners registered')
}

/**
 * 【新增】移除页面级监听器
 * 必须在 onHide 时移除，防止重复监听
 */
const unregisterPageListeners = () => {
  console.log('[Room] 🔇 Unregistering page listeners...')

  socketManager.off(SocketEvent.NEW_MESSAGE, handleRoomMessage)
  socketManager.off(SocketEvent.MESSAGE_READ, handleMessageRead)
  socketManager.off(SocketEvent.TYPING_START, handleTypingStart)
  socketManager.off(SocketEvent.TYPING_STOP, handleTypingStop)
  socketManager.off(SocketEvent.USER_STATUS_CHANGE, handleUserStatusChange)

  console.log('[Room] ✅ Page listeners unregistered')
}

/**
 * 初始化 WebSocket 监听
 * @deprecated 使用 registerPageListeners 替代
 */
const initRoomWebSocket = () => {
  console.log('[Room] Initializing WebSocket listeners (deprecated)')
  registerPageListeners()
}

/**
 * 清理 WebSocket 监听
 * @deprecated 使用 unregisterPageListeners 替代
 */
const cleanupRoomWebSocket = () => {
  console.log('[Room] Cleaning up WebSocket listeners (deprecated)')
  unregisterPageListeners()
}

// 页面加载
onLoad((options: any) => {
  roomId.value = Number.parseInt(options.id) || 0
  roomName.value = options.name || '聊天'

  if (!roomId.value) {
    uni.showToast({ title: '房间ID无效', icon: 'none' })
    setTimeout(() => {
      uni.navigateBack()
    }, 1500)
    return
  }

  uni.setNavigationBarTitle({
    title: roomName.value
  })

  // 【修改】只在 onLoad 加载历史消息
  initMessages()
})

// 【关键】页面显示时 - 加入会话房间 + 注册监听器
onShow(() => {
  console.log('[Room] 👀 Page shown')

  if (!roomId.value)
    return

  // 【新增】加入会话房间（使用新方法）
  socketManager.joinConversationRoom(roomId.value)

  // 【新增】注册页面级监听器
  registerPageListeners()

  // 【新增】标记会话为已读（前端 + 后端）
  const chatStore = useChatStore()
  chatStore.markConversationAsRead(roomId.value)

  // 调用后端 API 标记已读
  markRoomAsRead(roomId.value).catch((err) => {
    console.error('[Room] 标记已读失败:', err)
  })
})

// 【关键】页面隐藏时 - 离开会话房间 + 移除监听器
onHide(() => {
  console.log('[Room] 😴 Page hidden')

  if (!roomId.value)
    return

  // 离开会话房间
  socketManager.leaveConversationRoom(roomId.value)

  // 移除页面级监听器
  unregisterPageListeners()

  // 停止输入状态
  stopTyping()
})

// 页面卸载
onUnmounted(() => {
  console.log('[Room] 👋 Page unmounted')
  // 核心清理逻辑已在 onHide 中处理，这里只处理组件特有的清理

  // 【新增】移除键盘监听
  // #ifdef MP-WEIXIN
  uni.offKeyboardHeightChange()
  // #endif
})
</script>

<style lang="scss" scoped>
/* ========== 消息气泡样式（CSS 伪元素不能用 UnoCSS） ========== */
/* 消息气泡 */
.message-bubble {
  position: relative;

  /* 对方消息气泡 - 左侧小三角 */
  &.other-bubble::before {
    content: '';
    position: absolute;
    left: -12rpx;
    top: 20rpx;
    width: 0;
    height: 0;
    border-style: solid;
    border-width: 12rpx 12rpx 12rpx 0;
    border-color: transparent #fff transparent transparent;
  }

  /* 我方消息气泡 - 右侧小三角 */
  &.self-bubble::after {
    content: '';
    position: absolute;
    right: -12rpx;
    top: 20rpx;
    width: 0;
    height: 0;
    border-style: solid;
    border-width: 12rpx 0 12rpx 12rpx;
    border-color: transparent transparent transparent #95ec69;
  }

  /* 发送失败的消息样式 */
  &.failed-message {
    opacity: 0.7;
    background-color: #ffe7e7 !important; /* 浅红色背景 */
    border: 2rpx solid #ff4d4f; /* 红色边框 */

    /* 轻微的抖动动画提示用户注意 */
    animation: shake 0.5s ease-in-out;

    /* 失败消息的小三角也要改色 */
    &.self-bubble::after {
      border-color: transparent transparent transparent #ffe7e7;
    }
  }
}

/* 抖动动画 */
@keyframes shake {
  0%,
  100% {
    transform: translateX(0);
  }
  10%,
  30%,
  50%,
  70%,
  90% {
    transform: translateX(-4rpx);
  }
  20%,
  40%,
  60%,
  80% {
    transform: translateX(4rpx);
  }
}

/* ========== 输入框容器样式 ========== */
.input-container {
  flex: 1;
  background-color: #fff;
  border-radius: 12rpx;
  padding: 12rpx 20rpx;
  border: 2rpx solid transparent;
  transition: all 0.3s;
  max-height: 240rpx;
  overflow-y: auto;

  &:focus-within {
    border-color: #576ff3;
    box-shadow: 0 0 0 4rpx rgba(87, 111, 243, 0.1);
  }

  textarea::placeholder {
    color: #999;
  }
}

/* ========== 正在输入动画 ========== */
.typing-dot {
  width: 8rpx;
  height: 8rpx;
  background-color: #999;
  border-radius: 50%;
  animation: typing 1.4s infinite;

  &.typing-dot-delay-1 {
    animation-delay: 0.2s;
  }

  &.typing-dot-delay-2 {
    animation-delay: 0.4s;
  }
}

@keyframes typing {
  0%,
  60%,
  100% {
    opacity: 0.3;
    transform: scale(0.8);
  }
  30% {
    opacity: 1;
    transform: scale(1);
  }
}
</style>
