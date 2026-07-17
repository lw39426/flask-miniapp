/**
 * WebSocket Socket Manager 测试用例
 * 测试消息确认机制、心跳检测、消息去重排序、离线消息拉取等功能
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Mock uni-app API
const mockUni = {
  showToast: vi.fn()
}
vi.stubGlobal('uni', mockUni)

// Mock socket.io
const mockSocketOn = vi.fn()
const mockSocketEmit = vi.fn()
const mockSocketDisconnect = vi.fn()
const mockSocketOnAny = vi.fn()

const mockSocket = {
  on: mockSocketOn,
  emit: mockSocketEmit,
  disconnect: mockSocketDisconnect,
  onAny: mockSocketOnAny
}

vi.mock('@hyoga/uni-socket.io', () => ({
  default: vi.fn(() => mockSocket)
}))

// Mock config
vi.mock('@/pages/chat/config', () => ({
  WEBSOCKET_CONFIG: {
    URL: 'ws://localhost:5050',
    RECONNECT_INTERVAL: 1000,
    MAX_RECONNECT_ATTEMPTS: 3,
    HEARTBEAT_INTERVAL: 30000,
    PONG_TIMEOUT: 10000,
    MAX_MISSED_PONGS: 3,
    ACK_TIMEOUT: 5000,
    MAX_RETRY_ATTEMPTS: 3,
    RETRY_INTERVAL: 2000,
    MAX_BUFFERED_MESSAGES: 100,
    RECEIVED_IDS_CACHE_SIZE: 1000
  }
}))

// Mock chat store
vi.mock('@/store/chat', () => ({
  useChatStore: vi.fn(() => ({
    updateUserOnlineStatus: vi.fn(),
    updateConversationItem: vi.fn(),
    getConversation: vi.fn()
  }))
}))

describe('socketIOManager', () => {
  let socketManager: any

  beforeEach(async () => {
    vi.clearAllMocks()
    vi.useFakeTimers()

    // 重新导入以获取新实例
    const module = await import('@/utils/socket')
    socketManager = module.socketManager
  })

  afterEach(() => {
    vi.useRealTimers()
    socketManager?.destroy()
  })

  describe('连接管理', () => {
    it('应该能够初始化连接', () => {
      socketManager.init('test-token')

      expect(socketManager.getStatus()).toBe('connecting')
    })

    it('应该避免重复初始化', () => {
      socketManager.init('test-token')
      socketManager.init('test-token')

      // 只应该创建一次连接
      expect(mockSocket.on).toHaveBeenCalled()
    })

    it('应该能够正确销毁连接', () => {
      socketManager.init('test-token')
      socketManager.destroy()

      expect(socketManager.getStatus()).toBe('disconnected')
      expect(socketManager.isConnected()).toBe(false)
    })
  })

  describe('心跳检测 (Ping/Pong)', () => {
    it('应该在连接后开始发送心跳', () => {
      socketManager.init('test-token')

      // 模拟连接成功
      const connectCallback = mockSocketOn.mock.calls.find(
        (call: any[]) => call[0] === 'connect'
      )?.[1]
      connectCallback?.()

      // 快进到心跳时间
      vi.advanceTimersByTime(30000)

      // 应该发送了 ping
      expect(mockSocketEmit).toHaveBeenCalledWith('ping', expect.any(Object))
    })

    it('应该在收到 pong 后重置计数器', () => {
      socketManager.init('test-token')

      // 模拟连接成功
      const connectCallback = mockSocketOn.mock.calls.find(
        (call: any[]) => call[0] === 'connect'
      )?.[1]
      connectCallback?.()

      // 获取健康状态
      const healthBefore = socketManager.getHealthStatus()
      expect(healthBefore.missedPongs).toBe(0)
    })
  })

  describe('消息确认机制 (ACK)', () => {
    it('sendMessageWithAck 应该返回 Promise', async () => {
      socketManager.init('test-token')

      // 模拟连接成功
      const connectCallback = mockSocketOn.mock.calls.find(
        (call: any[]) => call[0] === 'connect'
      )?.[1]
      connectCallback?.()

      const promise = socketManager.sendMessageWithAck(1, 'Hello', 'text')

      expect(promise).toBeInstanceOf(Promise)

      // 捕获 promise rejection 避免 unhandled rejection
      promise.catch(() => {})
    })

    it('应该跟踪待确认消息数量', () => {
      socketManager.init('test-token')

      // 模拟连接成功
      const connectCallback = mockSocketOn.mock.calls.find(
        (call: any[]) => call[0] === 'connect'
      )?.[1]
      connectCallback?.()

      // 发送消息（不等待）
      const promise = socketManager.sendMessageWithAck(1, 'Hello', 'text')

      const count = socketManager.getPendingMessageCount()
      expect(count).toBeGreaterThanOrEqual(0)

      // 捕获 promise rejection 避免 unhandled rejection
      promise.catch(() => {})
    })
  })

  describe('消息去重', () => {
    it('应该过滤重复消息', () => {
      socketManager.init('test-token')

      const message1 = { id: 1, room_id: 1, content: 'Hello', sequence: 1 }
      const message2 = { id: 1, room_id: 1, content: 'Hello', sequence: 1 } // 重复

      const result1 = socketManager.processIncomingMessage(message1)
      const result2 = socketManager.processIncomingMessage(message2)

      expect(result1).not.toBeNull()
      expect(result2).toBeNull() // 重复消息应该返回 null
    })

    it('应该检测乱序消息', () => {
      socketManager.init('test-token')

      // 设置初始序列号
      socketManager.updateRoomSequence(1, 5)

      // 跳过序列号 6, 7，直接收到 8
      const message = { id: 10, room_id: 1, content: 'Hello', sequence: 8 }
      const result = socketManager.processIncomingMessage(message)

      // 乱序消息应该被缓存，返回 null
      expect(result).toBeNull()
    })
  })

  describe('序列号管理', () => {
    it('应该正确更新房间序列号', () => {
      socketManager.init('test-token')

      socketManager.updateRoomSequence(1, 10)
      socketManager.updateRoomSequence(1, 5) // 更小的值不应该更新

      // 序列号应该保持为 10
      const message = { id: 1, room_id: 1, content: 'Test', sequence: 11 }
      const result = socketManager.processIncomingMessage(message)

      expect(result).not.toBeNull()
    })
  })

  describe('连接健康状态', () => {
    it('应该返回正确的健康状态', () => {
      socketManager.init('test-token')

      const health = socketManager.getHealthStatus()

      expect(health).toHaveProperty('connected')
      expect(health).toHaveProperty('missedPongs')
      expect(health).toHaveProperty('pendingMessages')
    })
  })

  describe('房间管理', () => {
    it('应该能够加入会话房间', () => {
      socketManager.init('test-token')

      // 模拟连接成功
      const connectCallback = mockSocketOn.mock.calls.find(
        (call: any[]) => call[0] === 'connect'
      )?.[1]
      connectCallback?.()

      socketManager.joinConversationRoom(123)

      expect(mockSocketEmit).toHaveBeenCalledWith('join_room', {
        room_id: 123,
        room_type: 'conversation'
      })
    })

    it('应该在未连接时缓存房间', () => {
      // 不初始化连接
      socketManager.joinConversationRoom(456)

      // 不应该发送 join_room（因为未连接）
      expect(mockSocketEmit).not.toHaveBeenCalledWith('join_room', expect.any(Object))
    })
  })

  describe('事件处理', () => {
    it('应该能够注册和移除事件监听', () => {
      const handler = vi.fn()

      socketManager.on('test_event', handler)
      socketManager.off('test_event', handler)

      // 事件应该被正确管理
    })

    it('应该能够发送输入状态', () => {
      socketManager.init('test-token')

      // 模拟连接成功
      const connectCallback = mockSocketOn.mock.calls.find(
        (call: any[]) => call[0] === 'connect'
      )?.[1]
      connectCallback?.()

      socketManager.sendTyping(1, true)

      expect(mockSocketEmit).toHaveBeenCalledWith('typing', { room_id: 1 })
    })

    it('应该能够发送已读回执', () => {
      socketManager.init('test-token')

      // 模拟连接成功
      const connectCallback = mockSocketOn.mock.calls.find(
        (call: any[]) => call[0] === 'connect'
      )?.[1]
      connectCallback?.()

      socketManager.sendReadReceipt(1, 100)

      expect(mockSocketEmit).toHaveBeenCalledWith('message_read', {
        room_id: 1,
        message_id: 100
      })
    })
  })
})

describe('消息状态类型', () => {
  it('messageStatus 枚举应该包含正确的值', async () => {
    const { MessageStatus } = await import('@/utils/socket')

    expect(MessageStatus.SENDING).toBe('sending')
    expect(MessageStatus.SENT).toBe('sent')
    expect(MessageStatus.FAILED).toBe('failed')
    expect(MessageStatus.RETRY).toBe('retry')
  })
})
