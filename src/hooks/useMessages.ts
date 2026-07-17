/**
 * 聊天消息管理 Composable
 * 封装消息相关的状态和操作
 *
 * 功能特性：
 * - ✅ 乐观更新 - 消息立即显示
 * - ✅ ACK 确认 - 等待服务器确认
 * - ✅ 失败重试 - 支持手动重试
 * - ✅ 消息去重 - 防止重复消息
 * - ✅ 序列号更新 - 支持离线消息拉取
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

  // 【新增】失败消息列表（用于重试）
  const failedMessages = ref<Map<number, { content: string, messageType: string }>>(new Map())

  // 【新增】本地消息ID集合（用于去重）
  const localMessageIds = new Set<number>()

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
   * 通过 HTTP 发送消息（备用方案）
   */
  const sendViaHttp = async (tempMessage: ChatMessage, tempId: number, content: string) => {
    try {
      const response = await sendMessageAPI(roomId, {
        content: content.trim(),
        type: MESSAGE_TYPES.TEXT
      })

      if (response.code === 200 && response.data) {
        // 替换临时消息
        const index = messages.value.findIndex(m => m.id === tempId)
        if (index > -1) {
          messages.value[index] = {
            ...response.data,
            status: 'sent'
          }
          localMessageIds.delete(tempId)
          localMessageIds.add(response.data.id)
        }
        console.log('[Chat] ✅ Message sent via HTTP')
      }
      else {
        throw new Error('HTTP send failed')
      }
    }
    catch (httpError) {
      // 发送失败，标记消息状态
      const index = messages.value.findIndex(m => m.id === tempId)
      if (index > -1) {
        messages.value[index] = {
          ...messages.value[index],
          status: 'failed'
        }
      }

      // 保存失败消息用于重试
      failedMessages.value.set(tempId, {
        content: content.trim(),
        messageType: MESSAGE_TYPES.TEXT
      })

      throw httpError
    }
  }

  /**
   * 发送文本消息
   * 使用乐观更新 + ACK 确认机制
   */
  const sendTextMessage = async (content: string) => {
    if (!content.trim() || sending.value)
      return

    try {
      sending.value = true

      const tempId = Date.now()

      // 创建临时消息（乐观更新）- 立即显示
      const tempMessage: ChatMessage = {
        id: tempId, // 临时 ID
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
        is_own: true,
        // 消息状态
        status: 'sending'
      }

      // 添加到消息列表（乐观更新）
      messages.value.push(tempMessage)
      localMessageIds.add(tempId)

      // 优先使用 WebSocket 发送（带 ACK 确认）
      if (socketManager.isConnected()) {
        try {
          const result = await socketManager.sendMessageWithAck(
            roomId,
            content.trim(),
            MESSAGE_TYPES.TEXT,
            tempId
          )

          if (result.success && result.messageId) {
            // 更新消息状态和真实 ID
            const index = messages.value.findIndex(m => m.id === tempId)
            if (index > -1) {
              messages.value[index] = {
                ...messages.value[index],
                id: result.messageId,
                status: 'sent'
              }
              // 更新本地ID集合
              localMessageIds.delete(tempId)
              localMessageIds.add(result.messageId)
            }
            console.log('[Chat] ✅ Message sent via WebSocket with ACK')
          }
          else {
            throw new Error('ACK failed')
          }
        }
        catch (wsError) {
          console.warn('[Chat] WebSocket send failed, falling back to HTTP:', wsError)
          // WebSocket 发送失败，回退到 HTTP
          await sendViaHttp(tempMessage, tempId, content)
        }
      }
      else {
        // WebSocket 未连接，使用 HTTP 发送
        await sendViaHttp(tempMessage, tempId, content)
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
   * 【新增】重试发送失败的消息
   */
  const retryMessage = async (tempId: number) => {
    const failedMsg = failedMessages.value.get(tempId)
    if (!failedMsg) {
      console.warn('[Chat] No failed message found for retry:', tempId)
      return
    }

    // 更新消息状态为发送中
    const index = messages.value.findIndex(m => m.id === tempId)
    if (index > -1) {
      messages.value[index] = {
        ...messages.value[index],
        status: 'sending'
      }
    }

    try {
      if (socketManager.isConnected()) {
        const result = await socketManager.retryFailedMessage(
          tempId,
          roomId,
          failedMsg.content,
          failedMsg.messageType
        )

        if (result.success && result.messageId) {
          // 更新消息状态和真实 ID
          if (index > -1) {
            messages.value[index] = {
              ...messages.value[index],
              id: result.messageId,
              status: 'sent'
            }
            localMessageIds.delete(tempId)
            localMessageIds.add(result.messageId)
          }
          // 从失败列表移除
          failedMessages.value.delete(tempId)
          console.log('[Chat] ✅ Message retry successful')

          uni.showToast({
            title: '发送成功',
            icon: 'success'
          })
        }
      }
      else {
        // 尝试 HTTP 重发
        const tempMessage = messages.value[index]
        if (tempMessage) {
          await sendViaHttp(tempMessage, tempId, failedMsg.content)
          failedMessages.value.delete(tempId)
        }
      }
    }
    catch (error) {
      console.error('[Chat] Retry failed:', error)
      // 恢复失败状态
      if (index > -1) {
        messages.value[index] = {
          ...messages.value[index],
          status: 'failed'
        }
      }
      uni.showToast({
        title: '重试失败',
        icon: 'none'
      })
    }
  }

  /**
   * 【新增】删除失败的消息
   */
  const removeFailedMessage = (tempId: number) => {
    const index = messages.value.findIndex(m => m.id === tempId)
    if (index > -1) {
      messages.value.splice(index, 1)
      localMessageIds.delete(tempId)
    }
    failedMessages.value.delete(tempId)
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
   * 增强版：支持去重、序列号更新
   */
  const handleNewMessage = (message: ChatMessage) => {
    console.log('[Chat] New message received:', message)

    // 检查是否是当前房间的消息
    if (message.room_id !== roomId)
      return

    // 【增强】多层去重检查
    // 1. 检查消息ID是否在本地集合中
    if (localMessageIds.has(message.id)) {
      console.log('[Chat] ⚠️ Duplicate message (local cache):', message.id)
      return
    }

    // 2. 检查消息列表中是否已存在
    const exists = messages.value.some(m => m.id === message.id)
    if (exists) {
      console.log('[Chat] ⚠️ Duplicate message (list):', message.id)
      return
    }

    // 3. 检查是否是自己发送的消息（可能已通过乐观更新添加）
    if (message.is_own) {
      // 检查是否有对应的临时消息
      const tempIndex = messages.value.findIndex(
        m => m.is_own && m.content === message.content && m.id !== message.id
      )
      if (tempIndex > -1) {
        // 可能是重复的确认消息，跳过
        console.log('[Chat] ⚠️ Possible duplicate own message, skipping')
        return
      }
    }

    // 添加到本地ID集合
    localMessageIds.add(message.id)

    // 添加到消息列表
    messages.value.push(message)

    // 【新增】更新房间序列号（如果消息包含序列号）
    if ((message as any).sequence) {
      socketManager.updateRoomSequence(roomId, (message as any).sequence)
    }

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
   * 【新增】处理消息发送失败事件
   */
  const handleMessageSendFailed = (data: { tempId: number, roomId: number, content: string }) => {
    if (data.roomId !== roomId)
      return

    console.log('[Chat] Message send failed event:', data)

    // 更新消息状态
    const index = messages.value.findIndex(m => m.id === data.tempId)
    if (index > -1) {
      messages.value[index] = {
        ...messages.value[index],
        status: 'failed'
      }
    }

    // 保存到失败列表
    failedMessages.value.set(data.tempId, {
      content: data.content,
      messageType: MESSAGE_TYPES.TEXT
    })

    uni.showToast({
      title: '消息发送失败，点击重试',
      icon: 'none'
    })
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

    // 监听消息发送失败事件
    socketManager.on('message_send_failed', handleMessageSendFailed)
  }

  /**
   * 清理 WebSocket 监听
   */
  const cleanupSocketListeners = () => {
    socketManager.off(SocketEvent.NEW_MESSAGE, handleNewMessage)
    socketManager.off(SocketEvent.MESSAGE_READ, handleMessageRead)
    socketManager.off(SocketEvent.TYPING_START, handleTyping)
    socketManager.off('message_send_failed', handleMessageSendFailed)

    if (typingTimer) {
      clearTimeout(typingTimer)
    }

    // 清理本地ID缓存
    localMessageIds.clear()
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
    failedMessages, // 【新增】失败消息列表

    // 方法
    loadMessages,
    loadMore,
    sendTextMessage,
    sendImageMessage,
    sendFileMessage,
    sendTypingStatus,
    initSocketListeners,
    cleanupSocketListeners,
    retryMessage, // 【新增】重试发送
    removeFailedMessage // 【新增】删除失败消息
  }
}
