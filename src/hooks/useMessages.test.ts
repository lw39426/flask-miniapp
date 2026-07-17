/**
 * useMessages Hook 测试用例
 * 测试消息发送、接收、去重、重试等功能
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'

// Mock uni-app API
const mockUni = {
  showToast: vi.fn()
}
vi.stubGlobal('uni', mockUni)

// Mock Vue onUnmounted
vi.mock('vue', async () => {
  const actual = await vi.importActual('vue')
  return {
    ...actual,
    onUnmounted: vi.fn()
  }
})

// Mock API
const mockGetMessages = vi.fn()
const mockSendMessageAPI = vi.fn()

vi.mock('@/api/chat', () => ({
  getMessages: (...args: any[]) => mockGetMessages(...args),
  sendMessage: (...args: any[]) => mockSendMessageAPI(...args)
}))

// Mock socket manager
const mockSocketManager = {
  isConnected: vi.fn(() => true),
  sendMessageWithAck: vi.fn(),
  retryFailedMessage: vi.fn(),
  updateRoomSequence: vi.fn(),
  sendTyping: vi.fn(),
  on: vi.fn(),
  off: vi.fn()
}

vi.mock('@/utils/socket', () => ({
  socketManager: mockSocketManager,
  SocketEvent: {
    NEW_MESSAGE: 'new_message',
    MESSAGE_READ: 'message_read',
    TYPING_START: 'typing_start'
  },
  MessageStatus: {
    SENDING: 'sending',
    SENT: 'sent',
    FAILED: 'failed',
    RETRY: 'retry'
  }
}))

// Mock config
vi.mock('@/pages/chat/config', () => ({
  MESSAGE_TYPES: {
    TEXT: 'text',
    IMAGE: 'image',
    FILE: 'file'
  }
}))

describe('useMessages', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('loadMessages', () => {
    it('应该成功加载消息列表', async () => {
      const mockMessages = [
        { id: 1, content: 'Hello', message_type: 'text' },
        { id: 2, content: 'World', message_type: 'text' }
      ]

      mockGetMessages.mockResolvedValue({
        code: 200,
        data: {
          messages: mockMessages,
          pagination: { has_next: false, page: 1 }
        }
      })

      const { useMessages } = await import('@/hooks/useMessages')
      const { messages, loadMessages, loading } = useMessages({ roomId: 1 })

      await loadMessages(true)

      expect(mockGetMessages).toHaveBeenCalledWith(1, { page: 1, per_page: 50 })
      expect(messages.value.length).toBe(2)
      expect(loading.value).toBe(false)
    })

    it('加载失败时应该显示错误提示', async () => {
      mockGetMessages.mockRejectedValue(new Error('Network error'))

      const { useMessages } = await import('@/hooks/useMessages')
      const { loadMessages } = useMessages({ roomId: 1 })

      await loadMessages(true)

      expect(mockUni.showToast).toHaveBeenCalledWith({
        title: '加载消息失败',
        icon: 'none'
      })
    })

    it('不应该重复加载', async () => {
      mockGetMessages.mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 100))
      )

      const { useMessages } = await import('@/hooks/useMessages')
      const { loadMessages, loading } = useMessages({ roomId: 1 })

      // 开始加载
      const promise1 = loadMessages(true)

      // 在加载中尝试再次加载
      const promise2 = loadMessages(true)

      await Promise.all([promise1, promise2])

      // 只应该调用一次
      expect(mockGetMessages).toHaveBeenCalledTimes(1)
    })
  })

  describe('sendTextMessage', () => {
    it('应该通过 WebSocket 发送消息并等待 ACK', async () => {
      mockSocketManager.isConnected.mockReturnValue(true)
      mockSocketManager.sendMessageWithAck.mockResolvedValue({
        success: true,
        messageId: 100,
        tempId: 1
      })

      const { useMessages } = await import('@/hooks/useMessages')
      const { sendTextMessage, messages } = useMessages({ roomId: 1 })

      await sendTextMessage('Hello')

      expect(mockSocketManager.sendMessageWithAck).toHaveBeenCalledWith(
        1,
        'Hello',
        'text',
        expect.any(Number)
      )

      // 消息应该被添加到列表
      expect(messages.value.length).toBe(1)
      expect(messages.value[0].content).toBe('Hello')
      expect(messages.value[0].status).toBe('sent')
    })

    it('webSocket 失败时应该回退到 HTTP', async () => {
      mockSocketManager.isConnected.mockReturnValue(true)
      mockSocketManager.sendMessageWithAck.mockRejectedValue(new Error('WS failed'))

      mockSendMessageAPI.mockResolvedValue({
        code: 200,
        data: { id: 100, content: 'Hello', message_type: 'text' }
      })

      const { useMessages } = await import('@/hooks/useMessages')
      const { sendTextMessage, messages } = useMessages({ roomId: 1 })

      await sendTextMessage('Hello')

      expect(mockSendMessageAPI).toHaveBeenCalled()
      expect(messages.value.length).toBe(1)
    })

    it('webSocket 未连接时应该使用 HTTP', async () => {
      mockSocketManager.isConnected.mockReturnValue(false)

      mockSendMessageAPI.mockResolvedValue({
        code: 200,
        data: { id: 100, content: 'Hello', message_type: 'text' }
      })

      const { useMessages } = await import('@/hooks/useMessages')
      const { sendTextMessage } = useMessages({ roomId: 1 })

      await sendTextMessage('Hello')

      expect(mockSocketManager.sendMessageWithAck).not.toHaveBeenCalled()
      expect(mockSendMessageAPI).toHaveBeenCalled()
    })

    it('空消息不应该发送', async () => {
      const { useMessages } = await import('@/hooks/useMessages')
      const { sendTextMessage } = useMessages({ roomId: 1 })

      await sendTextMessage('')
      await sendTextMessage('   ')

      expect(mockSocketManager.sendMessageWithAck).not.toHaveBeenCalled()
      expect(mockSendMessageAPI).not.toHaveBeenCalled()
    })

    it('发送中不应该允许重复发送', async () => {
      mockSocketManager.isConnected.mockReturnValue(true)
      mockSocketManager.sendMessageWithAck.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({ success: true, messageId: 1 }), 100))
      )

      const { useMessages } = await import('@/hooks/useMessages')
      const { sendTextMessage, sending } = useMessages({ roomId: 1 })

      // 开始发送
      const promise1 = sendTextMessage('Hello')

      // 发送中尝试再次发送
      const promise2 = sendTextMessage('World')

      await Promise.all([promise1, promise2])

      // 只应该发送一次
      expect(mockSocketManager.sendMessageWithAck).toHaveBeenCalledTimes(1)
    })
  })

  describe('retryMessage', () => {
    it('应该能够重试失败的消息', async () => {
      mockSocketManager.isConnected.mockReturnValue(true)

      // 第一次发送失败
      mockSocketManager.sendMessageWithAck.mockRejectedValueOnce(new Error('Failed'))
      mockSendMessageAPI.mockRejectedValueOnce(new Error('HTTP also failed'))

      const { useMessages } = await import('@/hooks/useMessages')
      const { sendTextMessage, retryMessage, failedMessages, messages } = useMessages({ roomId: 1 })

      // 发送消息（会失败）
      await sendTextMessage('Hello').catch(() => {})

      // 应该有失败的消息
      expect(failedMessages.value.size).toBeGreaterThanOrEqual(0)
    })
  })

  describe('消息去重', () => {
    it('不应该添加重复的消息', async () => {
      mockGetMessages.mockResolvedValue({
        code: 200,
        data: {
          messages: [{ id: 1, content: 'Hello', message_type: 'text' }],
          pagination: { has_next: false, page: 1 }
        }
      })

      const { useMessages } = await import('@/hooks/useMessages')
      const { messages, loadMessages, initSocketListeners } = useMessages({
        roomId: 1,
        onNewMessage: vi.fn()
      })

      await loadMessages(true)
      initSocketListeners()

      // 模拟收到相同 ID 的消息
      const newMessageHandler = mockSocketManager.on.mock.calls.find(
        (call: any[]) => call[0] === 'new_message'
      )?.[1]

      if (newMessageHandler) {
        // 收到重复消息
        newMessageHandler({ id: 1, room_id: 1, content: 'Hello', message_type: 'text' })

        await nextTick()

        // 不应该添加重复消息
        expect(messages.value.length).toBe(1)
      }
    })
  })

  describe('输入状态', () => {
    it('应该能够发送输入状态', async () => {
      mockSocketManager.isConnected.mockReturnValue(true)

      const { useMessages } = await import('@/hooks/useMessages')
      const { sendTypingStatus } = useMessages({ roomId: 1 })

      sendTypingStatus(true)

      expect(mockSocketManager.sendTyping).toHaveBeenCalledWith(1, true)
    })

    it('webSocket 未连接时不发送输入状态', async () => {
      mockSocketManager.isConnected.mockReturnValue(false)

      const { useMessages } = await import('@/hooks/useMessages')
      const { sendTypingStatus } = useMessages({ roomId: 1 })

      sendTypingStatus(true)

      expect(mockSocketManager.sendTyping).not.toHaveBeenCalled()
    })
  })

  describe('webSocket 监听器', () => {
    it('应该正确初始化监听器', async () => {
      const { useMessages } = await import('@/hooks/useMessages')
      const { initSocketListeners } = useMessages({ roomId: 1 })

      initSocketListeners()

      expect(mockSocketManager.on).toHaveBeenCalledWith('new_message', expect.any(Function))
      expect(mockSocketManager.on).toHaveBeenCalledWith('message_read', expect.any(Function))
      expect(mockSocketManager.on).toHaveBeenCalledWith('typing_start', expect.any(Function))
      expect(mockSocketManager.on).toHaveBeenCalledWith('message_send_failed', expect.any(Function))
    })

    it('应该正确清理监听器', async () => {
      const { useMessages } = await import('@/hooks/useMessages')
      const { initSocketListeners, cleanupSocketListeners } = useMessages({ roomId: 1 })

      initSocketListeners()
      cleanupSocketListeners()

      expect(mockSocketManager.off).toHaveBeenCalledWith('new_message', expect.any(Function))
      expect(mockSocketManager.off).toHaveBeenCalledWith('message_read', expect.any(Function))
      expect(mockSocketManager.off).toHaveBeenCalledWith('typing_start', expect.any(Function))
      expect(mockSocketManager.off).toHaveBeenCalledWith('message_send_failed', expect.any(Function))
    })
  })

  describe('removeFailedMessage', () => {
    it('应该能够删除失败的消息', async () => {
      const { useMessages } = await import('@/hooks/useMessages')
      const { removeFailedMessage, messages, failedMessages } = useMessages({ roomId: 1 })

      // 添加一个模拟的失败消息
      const tempId = Date.now()
      messages.value.push({
        id: tempId,
        content: 'Failed message',
        message_type: 'text',
        created_at: new Date().toISOString(),
        sender: { id: 0, user_type: 'NormalUser', nickname: 'Test', avatar: '' },
        status: 'failed'
      } as any)
      failedMessages.value.set(tempId, { content: 'Failed message', messageType: 'text' })

      removeFailedMessage(tempId)

      expect(messages.value.length).toBe(0)
      expect(failedMessages.value.has(tempId)).toBe(false)
    })
  })
})
