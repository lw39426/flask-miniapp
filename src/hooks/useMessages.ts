/**
 * 聊天消息管理 Composable
 * 封装消息相关的状态和操作
 */

import type { ChatMessage } from '@/api/types'

import { onUnmounted, ref } from 'vue'

import { getMessages, sendMessage as sendMessageAPI } from '@/api/chat'
import { MESSAGE_TYPES } from '@/pages/chat/config'
import { SocketEvent, socketManager } from '@/utils/socket'

export interface UseMessagesOptions {
  roomId: number
  onNewMessage?: (message: ChatMessage) => void
  onMessageRead?: (data: any) => void
  onTyping?: (data: any) => void
}

export function useMessages(options: UseMessagesOptions) {
  const { roomId, onNewMessage, onMessageRead, onTyping } = options

  // 消息列表
  const messages = ref<ChatMessage[]>([])
  const loading = ref(false)
  const sending = ref(false)
  const hasMore = ref(true)

  // 分页
  const currentPage = ref(1)
  const pageSize = ref(50)

  // 对方输入状态
  const otherUserTyping = ref(false)
  let typingTimer: number | null = null

  /**
   * 加载消息历史
   * @param refresh 是否刷新（重置到第一页）
   */
  const loadMessages = async (refresh = false) => {
    if (loading.value)
      return

    try {
      loading.value = true

      if (refresh) {
        currentPage.value = 1
      }

      const response = await getMessages(roomId, {
        page: currentPage.value,
        per_page: pageSize.value
      })

      if (response.code === 200 && response.data) {
        const { messages: newMessages, pagination } = response.data

        if (refresh) {
          // 刷新：替换所有消息（倒序，最新的在最后）
          messages.value = newMessages.reverse()
        }
        else {
          // 加载更多：添加到列表开头（历史消息）
          messages.value = [...newMessages.reverse(), ...messages.value]
        }

        hasMore.value = pagination.has_next
        currentPage.value = pagination.page
      }
    }
    catch (error) {
      console.error('[Chat] Failed to load messages:', error)
      uni.showToast({
        title: '加载消息失败',
        icon: 'none'
      })
    }
    finally {
      loading.value = false
    }
  }

  /**
   * 加载更多消息（历史消息）
   */
  const loadMore = async () => {
    if (!hasMore.value || loading.value)
      return

    currentPage.value++
    await loadMessages(false)
  }

  /**
   * 发送文本消息
   */
  const sendTextMessage = async (content: string) => {
    if (!content.trim() || sending.value)
      return

    try {
      sending.value = true

      // 创建临时消息（乐观更新）
      const tempMessage: ChatMessage = {
        id: Date.now(), // 临时 ID
        room_id: roomId,
        content: content.trim(),
        message_type: MESSAGE_TYPES.TEXT,
        created_at: new Date().toISOString(),
        sender: {
          id: 0, // 将由后端填充
          user_type: 'NormalUser',
          nickname: '我',
          avatar: ''
        },
        is_own: true
      }

      // 添加到消息列表
      messages.value.push(tempMessage)

      // 发送到服务器
      const response = await sendMessageAPI(roomId, {
        content: content.trim(),
        type: MESSAGE_TYPES.TEXT
      })

      if (response.code === 200 && response.data) {
        // 替换临时消息
        const index = messages.value.findIndex(m => m.id === tempMessage.id)
        if (index > -1) {
          messages.value[index] = response.data
        }

        // 通过 WebSocket 通知（如果已连接）
        // 服务器会自动推送给其他参与者
      }
      else {
        // 发送失败，移除临时消息
        const index = messages.value.findIndex(m => m.id === tempMessage.id)
        if (index > -1) {
          messages.value.splice(index, 1)
        }
        throw new Error('发送失败')
      }
    }
    catch (error) {
      console.error('[Chat] Failed to send message:', error)
      uni.showToast({
        title: '发送失败',
        icon: 'none'
      })
    }
    finally {
      sending.value = false
    }
  }

  /**
   * 发送图片消息
   */
  const sendImageMessage = async (imagePath: string) => {
    try {
      sending.value = true

      // TODO: 上传图片到服务器
      // const uploadedUrl = await uploadImage(imagePath)

      // 发送图片消息
      // await sendMessageAPI(roomId, {
      //   content: uploadedUrl,
      //   type: MESSAGE_TYPES.IMAGE
      // })

      uni.showToast({
        title: '图片发送功能开发中',
        icon: 'none'
      })
    }
    catch (error) {
      console.error('[Chat] Failed to send image:', error)
      uni.showToast({
        title: '发送失败',
        icon: 'none'
      })
    }
    finally {
      sending.value = false
    }
  }

  /**
   * 发送文件消息
   */
  const sendFileMessage = async (filePath: string) => {
    try {
      sending.value = true

      // TODO: 上传文件到服务器
      // const uploadedUrl = await uploadFile(filePath)

      // 发送文件消息
      // await sendMessageAPI(roomId, {
      //   content: uploadedUrl,
      //   type: MESSAGE_TYPES.FILE
      // })

      uni.showToast({
        title: '文件发送功能开发中',
        icon: 'none'
      })
    }
    catch (error) {
      console.error('[Chat] Failed to send file:', error)
      uni.showToast({
        title: '发送失败',
        icon: 'none'
      })
    }
    finally {
      sending.value = false
    }
  }

  /**
   * 处理新消息（WebSocket）
   */
  const handleNewMessage = (message: ChatMessage) => {
    console.log('[Chat] New message received:', message)

    // 检查是否是当前房间的消息
    if (message.room_id !== roomId)
      return

    // 检查是否已存在（避免重复）
    const exists = messages.value.some(m => m.id === message.id)
    if (exists)
      return

    // 添加到消息列表
    messages.value.push(message)

    // 触发回调
    onNewMessage?.(message)

    // 自动滚动到底部（由调用方处理）
  }

  /**
   * 处理消息已读（WebSocket）
   */
  const handleMessageRead = (data: any) => {
    console.log('[Chat] Message read:', data)
    onMessageRead?.(data)

    // 更新消息已读状态
    // TODO: 实现已读状态更新逻辑
  }

  /**
   * 处理输入状态（WebSocket）
   */
  const handleTyping = (data: any) => {
    console.log('[Chat] User typing:', data)

    // 显示输入状态
    otherUserTyping.value = true

    // 清除之前的定时器
    if (typingTimer) {
      clearTimeout(typingTimer)
    }

    // 3 秒后自动隐藏
    typingTimer = setTimeout(() => {
      otherUserTyping.value = false
    }, 3000) as unknown as number

    onTyping?.(data)
  }

  /**
   * 发送输入状态
   */
  const sendTypingStatus = (isTyping: boolean) => {
    if (socketManager.isConnected()) {
      socketManager.sendTyping(roomId, isTyping)
    }
  }

  /**
   * 初始化 WebSocket 监听
   */
  const initSocketListeners = () => {
    // 监听新消息
    socketManager.on(SocketEvent.NEW_MESSAGE, handleNewMessage)

    // 监听消息已读
    socketManager.on(SocketEvent.MESSAGE_READ, handleMessageRead)

    // 监听输入状态
    socketManager.on(SocketEvent.TYPING_START, handleTyping)
  }

  /**
   * 清理 WebSocket 监听
   */
  const cleanupSocketListeners = () => {
    socketManager.off(SocketEvent.NEW_MESSAGE, handleNewMessage)
    socketManager.off(SocketEvent.MESSAGE_READ, handleMessageRead)
    socketManager.off(SocketEvent.TYPING_START, handleTyping)

    if (typingTimer) {
      clearTimeout(typingTimer)
    }
  }

  // 组件卸载时清理
  onUnmounted(() => {
    cleanupSocketListeners()
  })

  return {
    // 状态
    messages,
    loading,
    sending,
    hasMore,
    otherUserTyping,

    // 方法
    loadMessages,
    loadMore,
    sendTextMessage,
    sendImageMessage,
    sendFileMessage,
    sendTypingStatus,
    initSocketListeners,
    cleanupSocketListeners
  }
}
