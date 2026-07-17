/**
 * WebSocket (Socket.IO) 客户端管理器
 * 基于 uni-app 的 WebSocket API 实现
 *
 * 功能特性：
 * - ✅ 消息确认机制 (ACK) - 解决黑洞期丢消息
 * - ✅ Ping/Pong 心跳检测 - 解决僵尸连接问题
 * - ✅ 消息去重与排序 - 解决消息乱序问题
 * - ✅ 离线消息拉取 - 解决离线消息缺失问题
 * - ✅ 消息重试队列 - 确保消息送达
 * - ✅ 乐观更新支持 - 提升用户体验
 */

// import io from 'socket.io-client'
import io from '@hyoga/uni-socket.io'

import { WEBSOCKET_CONFIG } from '@/pages/chat/config'
import { useChatStore } from '@/store/chat'

// 连接状态
export enum SocketStatus {
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  DISCONNECTED = 'disconnected',
  RECONNECTING = 'reconnecting',
  ERROR = 'error'
}

// 事件类型
export enum SocketEvent {
  // 连接事件
  CONNECT = 'connect',
  DISCONNECT = 'disconnect',
  ERROR = 'error',

  // 消息事件
  NEW_MESSAGE = 'new_message',
  MESSAGE_READ = 'message_read',
  MESSAGE_DELETED = 'message_deleted',
  MESSAGE_ACK = 'message_ack', // 【新增】消息确认事件

  // 房间事件
  ROOM_UPDATED = 'room_online_users_update',
  USER_JOINED = 'user_joined',
  USER_LEFT = 'user_left',

  // 输入状态
  TYPING_START = 'typing_start',
  TYPING_STOP = 'typing_stop',

  // 在线状态
  USER_STATUS_CHANGE = 'user_status_change',
  USER_ONLINE = 'user_online',
  USER_OFFLINE = 'user_offline',

  // 心跳事件
  PONG = 'pong', // 【新增】心跳响应

  // 离线消息
  OFFLINE_MESSAGES = 'offline_messages', // 【新增】离线消息响应
  MISSING_MESSAGES = 'missing_messages', // 【新增】缺失消息响应

  // 全局事件（从个人房间接收）
  NEW_MESSAGE_NOTIFY = 'new_message_notify'
}

// 消息状态
export enum MessageStatus {
  SENDING = 'sending',
  SENT = 'sent',
  FAILED = 'failed',
  RETRY = 'retry'
}

// 事件处理器类型
type EventHandler = (data: any) => void

// 待确认消息接口
interface PendingMessage {
  tempId: number
  roomId: number
  content: string
  messageType: string
  status: MessageStatus
  retryCount: number
  timestamp: number
  timeoutTimer?: ReturnType<typeof setTimeout>
  resolve?: (result: { success: boolean, messageId?: number }) => void
  reject?: (error: Error) => void
}

// 消息缓冲区接口（用于处理乱序消息）
interface BufferedMessage {
  data: any
  sequence: number
  timestamp: number
}

class SocketIOManager {
  private socket: any = null // socket.io-client 实例
  private status: SocketStatus = SocketStatus.DISCONNECTED
  private url: string = WEBSOCKET_CONFIG.URL
  private token: string = ''
  private reconnectAttempts: number = 0
  private maxReconnectAttempts: number = WEBSOCKET_CONFIG.MAX_RECONNECT_ATTEMPTS
  private reconnectInterval: number = WEBSOCKET_CONFIG.RECONNECT_INTERVAL
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null
  private eventHandlers: Map<string, Set<EventHandler>> = new Map() // 事件处理器集合
  private messageQueue: any[] = [] // 离线消息队列
  private conversationRooms: Set<number> = new Set() // 记录前端主动加入的会话房间
  private globalListenersRegistered: boolean = false // 防止全局监听器重复注册
  private isDestroyed: boolean = false // 标记是否已销毁，防止登出后重连

  // 【新增】心跳检测相关
  private lastPingId: number = 0 // 最后发送的 ping ID
  private pongReceived: boolean = true // 是否收到 pong 响应
  private missedPongs: number = 0 // 连续丢失的 pong 次数
  private pongTimeoutTimer: ReturnType<typeof setTimeout> | null = null // pong 超时定时器

  // 【新增】消息确认相关
  private pendingMessages: Map<number, PendingMessage> = new Map() // 待确认消息队列
  private retryQueue: PendingMessage[] = [] // 重试队列
  private retryTimer: ReturnType<typeof setInterval> | null = null // 重试定时器

  // 【新增】消息去重与排序相关
  private receivedMessageIds: Set<number> = new Set() // 已接收消息ID集合
  private lastSequence: Map<number, number> = new Map() // 每个房间的最后序列号 Map<roomId, sequence>
  private messageBuffer: Map<number, BufferedMessage[]> = new Map() // 乱序消息缓冲区 Map<roomId, messages[]>

  /**
   * 应用级初始化（替代直接 connect）
   * @param token JWT token
   */
  init(token: string) {
    if (this.status === SocketStatus.CONNECTED || this.status === SocketStatus.CONNECTING) {
      console.log('[SocketManager] Already initialized, skipping')
      return
    }

    console.log('[SocketManager] 🚀 Initializing...')
    this.token = token
    this.isDestroyed = false // 重置销毁标志
    this.connect(token)
    this.registerGlobalListeners()
    this.startRetryProcessor() // 【新增】启动重试处理器
  }

  /**
   * 连接 WebSocket
   * @param token JWT token
   */
  async connect(token: string) {
    // 已连接或者连接中则跳过连接
    if (this.status === SocketStatus.CONNECTED || this.status === SocketStatus.CONNECTING) {
      console.log('[Socket] Already connected or connecting')
      return
    }

    this.token = token
    this.status = SocketStatus.CONNECTING
    console.log('[Socket] Connecting to:', this.url)

    try {
      // 动态引入 socket.io-client
      // const { io } = await import('socket.io-client')
      // socket = io('http://localhost:5050', {
      //   query: {
      //     token: token || ''
      //   },
      //   transports: ['websocket'],
      //   path: '/socket.io/', // 默认路径，如果后端改了需同步
      // })
      this.socket = io(this.url, {
        transports: ['websocket'],
        query: { token },
        path: '/socket.io/', // 默认路径，如果后端改了需同步
        autoConnect: true,
        reconnection: false, // 由我们自己控制重连
      })

      // 监听连接成功
      this.socket.on('connect', () => {
        console.log('[Socket] Connected')
        console.log('[Socket] 🔔 后端自动加入个人房间: NormalUser_{userId}')
        this.status = SocketStatus.CONNECTED
        this.reconnectAttempts = 0
        this.missedPongs = 0 // 【新增】重置丢失计数
        this.pongReceived = true // 【新增】重置 pong 状态
        this.startHeartbeat()
        this.flushMessageQueue()
        this.emit(SocketEvent.CONNECT, {})

        // 重连后，重新加入之前的会话房间
        this.rejoinConversationRooms()

        // 【新增】重连后，拉取离线消息
        this.fetchOfflineMessages()

        // 【新增】重发待确认消息
        this.resendPendingMessages()
      })

      // 监听事件（所有事件）
      this.socket.onAny((event: string, data: any) => {
        this.handleMessage({ event, data })
      })

      // 监听断开
      this.socket.on('disconnect', () => {
        console.log('[Socket] Connection closed')
        this.status = SocketStatus.DISCONNECTED
        this.stopHeartbeat()
        this.emit(SocketEvent.DISCONNECT, {})
        this.tryReconnect()
      })

      // 监听错误
      this.socket.on('error', (err: any) => {
        console.error('[Socket] Error:', err)
        this.handleError(err)
      })
      // 连接错误监听
      this.socket.on('connect_error', (error: any) => {
        console.error('❌ 连接错误:', error)
        // 如果服务器返回 Error 对象，这里可以打印出 message
      })
    }
    catch (error) {
      console.error('[Socket] Connection error:', error)
      this.handleError(error)
    }
  }

  /**
   * 断开连接
   */
  disconnect() {
    console.log('[Socket] Disconnecting...')
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
    this.stopHeartbeat()
    this.stopRetryProcessor() // 【新增】停止重试处理器
    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
    }
    this.status = SocketStatus.DISCONNECTED
    this.reconnectAttempts = 0
  }

  /**
   * 应用级销毁（登出时调用）
   */
  destroy() {
    console.log('[SocketManager] 🔌 Destroying...')

    // 在断开连接前,通知服务器用户下线
    if (this.socket && this.status === SocketStatus.CONNECTED) {
      try {
        this.socket.emit('user_logout', {
          timestamp: new Date().toISOString()
        })
        console.log('[SocketManager] 📤 Sent user_logout event')
      }
      catch (error) {
        console.warn('[SocketManager] Failed to send user_logout:', error)
      }
    }

    // 设置销毁标志，防止重连
    this.isDestroyed = true

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }

    this.stopHeartbeat()
    this.stopRetryProcessor() // 【新增】停止重试处理器

    // 【新增】清理待确认消息，标记为失败
    this.pendingMessages.forEach((pending) => {
      if (pending.timeoutTimer) {
        clearTimeout(pending.timeoutTimer)
      }
      if (pending.reject) {
        pending.reject(new Error('Socket destroyed'))
      }
    })
    this.pendingMessages.clear()
    this.retryQueue = []

    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
    }

    this.status = SocketStatus.DISCONNECTED
    this.reconnectAttempts = 0
    this.conversationRooms.clear()
    this.messageQueue = []

    // 【新增】清理消息相关缓存
    this.receivedMessageIds.clear()
    this.lastSequence.clear()
    this.messageBuffer.clear()

    // 清除全局监听器
    this.eventHandlers.clear()
    this.globalListenersRegistered = false

    console.log('[SocketManager] ✅ Destroyed')
  }

  /**
   * 发送消息
   * @param event 事件名称
   * @param data 数据
   */
  send(event: string, data: any) {
    if (this.status === SocketStatus.CONNECTED && this.socket) {
      this.socket.emit(event, data)
      console.log('[Socket] Message sent:', event)
    }
    else {
      console.warn('[Socket] Not connected, adding to queue')
      this.messageQueue.push({ event, data })
    }
  }

  /**
   * 监听事件
   * @param event 事件名称
   * @param handler 处理函数
   */
  on(event: string, handler: EventHandler) {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set())
    }
    this.eventHandlers.get(event)!.add(handler)
  }

  /**
   * 移除事件监听
   * @param event 事件名称
   * @param handler 处理函数
   */
  off(event: string, handler: EventHandler) {
    const handlers = this.eventHandlers.get(event)
    if (handlers) {
      handlers.delete(handler)
    }
  }

  /**
   * 触发事件
   * @param event 事件名称
   * @param data 数据
   * 如果有多个处理函数，会依次调用它们
   */
  private emit(event: string, data: any) {
    const handlers = this.eventHandlers.get(event)
    if (handlers) {
      handlers.forEach(handler => handler(data))
    }
  }

  /**
   * 处理接收到的消息
   */
  private handleMessage(message: { event: string, data: any }) {
    try {
      const { event, data } = message
      console.log('[Socket] Received:', event, data)

      // 【新增】处理 pong 响应
      if (event === SocketEvent.PONG || event === 'pong') {
        this.handlePong(data)
        return
      }

      // 【新增】处理消息确认
      if (event === SocketEvent.MESSAGE_ACK || event === 'message_ack') {
        this.handleMessageAck(data)
        return
      }

      // 【新增】处理离线消息
      if (event === SocketEvent.OFFLINE_MESSAGES || event === 'offline_messages') {
        this.handleOfflineMessages(data)
        return
      }

      // 【新增】处理缺失消息
      if (event === SocketEvent.MISSING_MESSAGES || event === 'missing_messages') {
        this.handleMissingMessages(data)
        return
      }

      this.emit(event, data)
    }
    catch (error) {
      console.error('[Socket] Failed to handle message:', error)
    }
  }

  /**
   * 处理错误
   */
  private handleError(error: any) {
    this.status = SocketStatus.ERROR
    this.emit(SocketEvent.ERROR, error)
    this.tryReconnect()
  }

  /**
   * 尝试重连
   */
  private tryReconnect() {
    // 如果已销毁，不进行重连
    if (this.isDestroyed) {
      console.log('[Socket] ⛔ Destroyed, skipping reconnect')
      return
    }

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('[Socket] Max reconnect attempts reached')
      uni.showToast({
        title: '连接已断开，请检查网络',
        icon: 'none'
      })
      return
    }

    if (this.reconnectTimer) {
      return
    }

    this.status = SocketStatus.RECONNECTING
    this.reconnectAttempts++

    console.log(`[Socket] Reconnecting... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`)

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null
      if (this.token && !this.isDestroyed) {
        this.connect(this.token)
      }
    }, this.reconnectInterval)
  }

  /**
   * 刷新离线消息队列
   * @description 当连接恢复时，将离线队列中的消息重新发送到服务器
   */
  private flushMessageQueue() {
    if (this.messageQueue.length === 0) {
      return
    }

    console.log(`[Socket] Flushing ${this.messageQueue.length} queued messages`)

    const queue = [...this.messageQueue]
    this.messageQueue = []

    queue.forEach(({ event, data }) => {
      this.send(event, data)
    })
  }

  // ============================================================
  // 【修复 #2】Ping/Pong 心跳检测 - 解决僵尸连接问题
  // ============================================================

  /**
   * 开始心跳
   * 发送 ping 后检测 pong 响应，3次未响应则强制断线重连
   */
  private startHeartbeat() {
    this.stopHeartbeat()
    this.missedPongs = 0
    this.pongReceived = true

    this.heartbeatTimer = setInterval(() => {
      if (this.status === SocketStatus.CONNECTED) {
        this.sendPing()
      }
    }, WEBSOCKET_CONFIG.HEARTBEAT_INTERVAL)

    console.log('[Socket] 💓 Heartbeat started')
  }

  /**
   * 发送 ping 并等待 pong 响应
   * @description 发送 ping 消息到服务器，等待服务器返回 pong 确认，3次未收到则判定为死连接
   */
  private sendPing() {
    // 检查上一次的 pong 是否收到
    if (!this.pongReceived) {
      this.missedPongs++
      console.warn(`[Socket] ⚠️ Missed pong #${this.missedPongs}`)

      // 连续3次未收到 pong，判定为死连接
      if (this.missedPongs >= WEBSOCKET_CONFIG.MAX_MISSED_PONGS) {
        console.error('[Socket] ❌ Dead connection detected, forcing reconnect')
        this.handleDeadConnection()
        return
      }
    }

    // 重置状态
    this.pongReceived = false
    this.lastPingId = Date.now()

    // 设置 pong 超时检测
    if (this.pongTimeoutTimer) {
      clearTimeout(this.pongTimeoutTimer)
    }

    this.pongTimeoutTimer = setTimeout(() => {
      if (!this.pongReceived) {
        console.warn('[Socket] ⏰ Pong timeout')
      }
    }, WEBSOCKET_CONFIG.PONG_TIMEOUT)

    // 发送 ping
    this.send('ping', {
      ping_id: this.lastPingId,
      timestamp: this.lastPingId
    })

    console.log('[Socket] 📤 Ping sent:', this.lastPingId)
  }

  /**
   * 处理 pong 响应
   * @param data 包含 pong 数据的对象
   * @description 当服务器收到客户端发送的 ping 消息后，会返回一个确认消息（pong），此方法用于处理该确认消息
   */
  private handlePong(data: any) {
    const pingId = data?.ping_id

    console.log('[Socket] 📥 Pong received:', pingId)

    // 验证 ping_id（可选，防止旧的 pong 干扰）
    if (pingId && pingId !== this.lastPingId) {
      console.warn('[Socket] ⚠️ Stale pong, ignoring')
      return
    }

    this.pongReceived = true
    this.missedPongs = 0

    if (this.pongTimeoutTimer) {
      clearTimeout(this.pongTimeoutTimer)
      this.pongTimeoutTimer = null
    }

    console.log('[Socket] ✅ Connection healthy')
  }

  /**
   * 处理死连接
   * @description 当检测到连续3次未收到 pong 响应时，触发此方法，强制断开连接并尝试重连
   */
  private handleDeadConnection() {
    console.log('[Socket] 🔄 Handling dead connection...')

    // 停止心跳
    this.stopHeartbeat()

    // 强制断开
    if (this.socket) {
      try {
        this.socket.disconnect()
      }
      catch (e) {
        console.warn('[Socket] Error disconnecting:', e)
      }
      this.socket = null
    }

    this.status = SocketStatus.DISCONNECTED
    this.missedPongs = 0
    this.pongReceived = true

    // 触发重连
    this.tryReconnect()
  }

  /**
   * 停止心跳
   * @description 停止心跳定时器，防止继续发送 ping 消息
   */
  private stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer)
      this.heartbeatTimer = null
    }

    if (this.pongTimeoutTimer) {
      clearTimeout(this.pongTimeoutTimer)
      this.pongTimeoutTimer = null
    }

    console.log('[Socket] 💔 Heartbeat stopped')
  }

  // ============================================================
  // 【修复 #1】消息确认机制 (ACK) - 解决黑洞期丢消息
  // ============================================================

  /**
   * 【增强】发送消息并等待 ACK 确认
   * @param roomId 房间ID
   * @param content 消息内容
   * @param messageType 消息类型
   * @param tempId 可选的临时ID
   * @returns Promise 包含发送结果，成功时包含消息ID和临时ID
   * @description 发送消息并等待服务器确认，确保消息可靠传输
   */
  sendMessageWithAck(
    roomId: number,
    content: string,
    messageType: string = 'text',
    tempId?: number
  ): Promise<{ success: boolean, messageId?: number, tempId: number }> {
    return new Promise((resolve, reject) => {
      const finalTempId = tempId || Date.now()

      // 创建待确认消息记录
      const pending: PendingMessage = {
        tempId: finalTempId,
        roomId,
        content,
        messageType,
        status: MessageStatus.SENDING,
        retryCount: 0,
        timestamp: Date.now(),
        resolve: result => resolve({ ...result, tempId: finalTempId }),
        reject
      }

      // 存入待确认队列
      this.pendingMessages.set(finalTempId, pending)

      // 设置 ACK 超时
      pending.timeoutTimer = setTimeout(() => {
        this.handleAckTimeout(finalTempId)
      }, WEBSOCKET_CONFIG.ACK_TIMEOUT)

      // 发送消息
      if (this.status === SocketStatus.CONNECTED) {
        this.send('send_message', {
          room_id: roomId,
          content,
          type: messageType,
          temp_id: finalTempId
        })

        console.log(`[Socket] 📤 Message sent, waiting ACK (temp_id: ${finalTempId})`)
      }
      else {
        // 未连接，加入重试队列
        console.warn('[Socket] Not connected, adding to retry queue')
        pending.status = MessageStatus.RETRY
        this.retryQueue.push(pending)
      }
    })
  }

  /**
   * 处理 ACK 响应
   * @param data 包含 ACK 数据的对象
   * @description 当服务器收到客户端发送的消息后，会返回一个确认消息（ACK），此方法用于处理该确认消息
   */
  private handleMessageAck(data: any) {
    const { temp_id, message_id, success, error } = data

    console.log('[Socket] 📥 ACK received:', { temp_id, message_id, success })

    const pending = this.pendingMessages.get(temp_id)
    if (!pending) {
      console.warn('[Socket] ⚠️ ACK for unknown message:', temp_id)
      return
    }

    // 清除超时定时器
    if (pending.timeoutTimer) {
      clearTimeout(pending.timeoutTimer)
    }

    // 从队列移除
    this.pendingMessages.delete(temp_id)

    if (success) {
      pending.status = MessageStatus.SENT
      pending.resolve?.({ success: true, messageId: message_id })
      console.log('[Socket] ✅ Message confirmed:', temp_id, '->', message_id)
    }
    else {
      pending.status = MessageStatus.FAILED
      pending.reject?.(new Error(error || 'Message send failed'))
      console.error('[Socket] ❌ Message failed:', temp_id, error)
    }
  }

  /**
   * 处理 ACK 超时
   * @param tempId 临时消息ID
   * @description 当发送的消息在指定时间内未收到确认时，触发此方法，增加重试次数并加入重试队列
   */
  private handleAckTimeout(tempId: number) {
    const pending = this.pendingMessages.get(tempId)
    if (!pending)
      return

    console.warn(`[Socket] ⏰ ACK timeout for message: ${tempId}`)

    // 检查重试次数
    if (pending.retryCount < WEBSOCKET_CONFIG.MAX_RETRY_ATTEMPTS) {
      pending.retryCount++
      pending.status = MessageStatus.RETRY

      console.log(`[Socket] 🔄 Scheduling retry #${pending.retryCount} for: ${tempId}`)

      // 加入重试队列
      this.retryQueue.push(pending)
    }
    else {
      // 超过最大重试次数
      this.pendingMessages.delete(tempId)
      pending.status = MessageStatus.FAILED
      pending.reject?.(new Error('Max retry attempts exceeded'))

      console.error('[Socket] ❌ Message failed after max retries:', tempId)

      // 触发失败事件，让 UI 可以显示重试按钮
      this.emit('message_send_failed', {
        tempId,
        roomId: pending.roomId,
        content: pending.content
      })
    }
  }

  /**
   * 启动重试处理器
   * @description 启动一个定时器，定期处理重试队列中的消息
   */
  private startRetryProcessor() {
    if (this.retryTimer)
      return

    this.retryTimer = setInterval(() => {
      this.processRetryQueue()
    }, WEBSOCKET_CONFIG.RETRY_INTERVAL)

    console.log('[Socket] 🔄 Retry processor started')
  }

  /**
   * 停止重试处理器
   * @description 停止重试定时器，防止继续处理重试队列中的消息
   */
  private stopRetryProcessor() {
    if (this.retryTimer) {
      clearInterval(this.retryTimer)
      this.retryTimer = null
    }
  }

  /**
   * 处理重试队列
   * @description 从重试队列中取出所有待重试的消息，重新发送并更新重试次数
   */
  private processRetryQueue() {
    if (this.retryQueue.length === 0 || this.status !== SocketStatus.CONNECTED) {
      return
    }

    console.log(`[Socket] 🔄 Processing retry queue: ${this.retryQueue.length} messages`)

    // 取出所有待重试的消息
    const queue = [...this.retryQueue]
    this.retryQueue = []

    queue.forEach((pending) => {
      // 重新设置超时
      pending.timeoutTimer = setTimeout(() => {
        this.handleAckTimeout(pending.tempId)
      }, WEBSOCKET_CONFIG.ACK_TIMEOUT)

      // 重新发送
      this.send('send_message', {
        room_id: pending.roomId,
        content: pending.content,
        type: pending.messageType,
        temp_id: pending.tempId
      })

      console.log(`[Socket] 📤 Retry #${pending.retryCount} sent: ${pending.tempId}`)
    })
  }

  /**
   * 重发待确认消息（重连后调用）
   * @description 当 WebSocket 连接重新建立时，调用此方法重发所有待确认的消息，确保消息不丢失
   */
  private resendPendingMessages() {
    if (this.pendingMessages.size === 0)
      return

    console.log(`[Socket] 🔄 Resending ${this.pendingMessages.size} pending messages`)

    this.pendingMessages.forEach((pending, tempId) => {
      // 清除旧的超时定时器
      if (pending.timeoutTimer) {
        clearTimeout(pending.timeoutTimer)
      }

      // 重新设置超时
      pending.timeoutTimer = setTimeout(() => {
        this.handleAckTimeout(tempId)
      }, WEBSOCKET_CONFIG.ACK_TIMEOUT)

      // 重新发送
      this.send('send_message', {
        room_id: pending.roomId,
        content: pending.content,
        type: pending.messageType,
        temp_id: tempId
      })

      console.log(`[Socket] 📤 Resent pending message: ${tempId}`)
    })
  }

  /**
   * 手动重试发送失败的消息
   * @param tempId 临时消息ID
   * @param roomId 房间ID
   * @param content 消息内容
   * @param messageType 消息类型（默认：text）
   * @returns 包含成功状态和消息ID（如果成功）的 Promise
   * @description 手动触发消息重试，用于处理发送失败的情况
   */
  retryFailedMessage(
    tempId: number,
    roomId: number,
    content: string,
    messageType: string = 'text'
  ): Promise<{ success: boolean, messageId?: number, tempId: number }> {
    console.log(`[Socket] 🔄 Manual retry for message: ${tempId}`)
    return this.sendMessageWithAck(roomId, content, messageType, tempId)
  }

  // ============================================================
  // 【修复 #3】消息去重与排序 - 解决消息乱序问题
  // ============================================================

  /**
   * 【增强】处理新消息（带去重和排序）
   * @param data 消息数据
   * @returns 处理后的消息，如果重复则返回 null
   */
  processIncomingMessage(data: any): any | null {
    const { id, room_id, sequence } = data

    // 1. 去重检查
    if (id && this.receivedMessageIds.has(id)) {
      console.log('[Socket] ⚠️ Duplicate message ignored:', id)
      return null
    }

    // 添加到已接收集合
    if (id) {
      this.receivedMessageIds.add(id)

      // 定期清理，防止内存泄漏
      if (this.receivedMessageIds.size > WEBSOCKET_CONFIG.RECEIVED_IDS_CACHE_SIZE) {
        this.cleanupReceivedIds()
      }
    }

    // 2. 序列号检查（如果后端支持）
    if (sequence !== undefined && room_id !== undefined) {
      const lastSeq = this.lastSequence.get(room_id) || 0

      // 检查是否乱序
      if (sequence > lastSeq + 1) {
        console.warn(`[Socket] ⚠️ Out of order message: expected ${lastSeq + 1}, got ${sequence}`)

        // 缓存乱序消息
        this.bufferMessage(room_id, data)

        // 请求缺失的消息
        this.requestMissingMessages(room_id, lastSeq + 1, sequence - 1)

        return null // 暂不处理，等缺失消息到达后再处理
      }

      // 更新最后序列号
      this.lastSequence.set(room_id, sequence)

      // 处理缓冲区中的后续消息
      this.processBufferedMessages(room_id)
    }

    return data
  }

  /**
   * 缓存乱序消息
   * @param roomId 房间ID
   * @param data 消息数据
   * @description 缓存乱序消息，等待后续消息到达后按顺序处理
   */
  private bufferMessage(roomId: number, data: any) {
    if (!this.messageBuffer.has(roomId)) {
      this.messageBuffer.set(roomId, [])
    }

    const buffer = this.messageBuffer.get(roomId)!

    // 检查是否已缓存
    if (buffer.some(m => m.data.id === data.id)) {
      return
    }

    buffer.push({
      data,
      sequence: data.sequence,
      timestamp: Date.now()
    })

    // 按序列号排序
    buffer.sort((a, b) => a.sequence - b.sequence)

    // 限制缓冲区大小
    if (buffer.length > WEBSOCKET_CONFIG.MAX_BUFFERED_MESSAGES) {
      buffer.shift()
    }

    console.log(`[Socket] 📦 Buffered message for room ${roomId}: seq=${data.sequence}`)
  }

  /**
   * 处理缓冲区中的消息
   * @param roomId 房间ID
   * @returns 处理后的消息数组
   * @description 从缓冲区中提取连续的消息，按序列号排序并触发事件
   */
  private processBufferedMessages(roomId: number) {
    const buffer = this.messageBuffer.get(roomId)
    if (!buffer || buffer.length === 0)
      return

    const lastSeq = this.lastSequence.get(roomId) || 0
    const toProcess: any[] = []

    // 找出可以处理的消息
    while (buffer.length > 0) {
      const first = buffer[0]
      if (first.sequence === lastSeq + 1) {
        buffer.shift()
        this.lastSequence.set(roomId, first.sequence)
        toProcess.push(first.data)
      }
      else {
        break
      }
    }

    // 触发消息事件
    if (toProcess.length > 0) {
      console.log(`[Socket] 📤 Processing ${toProcess.length} buffered messages for room ${roomId}`)
      toProcess.forEach((messageData) => {
        this.emit(SocketEvent.NEW_MESSAGE, messageData)
      })
    }
  }

  /**
   * 请求缺失的消息
   * @param roomId 房间ID
   * @param fromSeq 起始序列号
   * @param toSeq 结束序列号
   * @description 请求服务器缺失的消息范围，用于修复乱序问题
   */
  private requestMissingMessages(roomId: number, fromSeq: number, toSeq: number) {
    console.log(`[Socket] 📥 Requesting missing messages: room=${roomId}, ${fromSeq}-${toSeq}`)

    this.send('request_missing_messages', {
      room_id: roomId,
      from_sequence: fromSeq,
      to_sequence: toSeq
    })
  }

  /**
   * 处理缺失消息响应
   * @param data 缺失消息数据
   * @param room_id 房间ID
   * @param start_sequence 起始序列号
   * @param end_sequence 结束序列号
   * @param messages 缺失消息数组
   * @param total 缺失消息总数
   * @description 处理服务器返回的缺失消息，按序列号排序并触发事件
   */
  private handleMissingMessages(data: any) {
    const { room_id, start_sequence, end_sequence, messages, total } = data

    if (!messages || messages.length === 0)
      return

    console.log(`[Socket] 📥 Received ${messages.length} missing messages for room ${room_id}`)
    console.log(`[Socket] 📥 Missing messages range: ${start_sequence}-${end_sequence}, total: ${total}`)

    // 按序列号排序
    messages.sort((a: any, b: any) => a.sequence - b.sequence)

    // 依次处理
    messages.forEach((msg: any) => {
      // 去重
      if (this.receivedMessageIds.has(msg.id))
        return

      this.receivedMessageIds.add(msg.id)

      const lastSeq = this.lastSequence.get(room_id) || 0
      if (msg.sequence === lastSeq + 1) {
        this.lastSequence.set(room_id, msg.sequence)
        this.emit(SocketEvent.NEW_MESSAGE, msg)
      }
    })

    // 处理缓冲区
    this.processBufferedMessages(room_id)
  }

  /**
   * 清理已接收消息ID集合（保留最新的一半）
   * @description 定期清理已接收消息ID集合，防止内存泄漏
   */
  private cleanupReceivedIds() {
    const arr = Array.from(this.receivedMessageIds)
    const keepCount = Math.floor(arr.length / 2)
    this.receivedMessageIds = new Set(arr.slice(arr.length - keepCount))
    console.log(`[Socket] 🧹 Cleaned up received IDs, kept ${keepCount}`)
  }

  // ============================================================
  // 【修复 #4】离线消息拉取 - 解决离线消息缺失问题
  // ============================================================

  /**
   * 拉取离线消息
   * 连接成功后自动调用
   * @description 拉取所有房间的离线消息，用于修复乱序问题
   */
  private fetchOfflineMessages() {
    if (this.lastSequence.size === 0) {
      console.log('[Socket] 📭 No room sequences cached, skipping offline fetch')
      return
    }

    // 收集每个房间的最后序列号
    const roomSequences: Record<number, number> = {}
    this.lastSequence.forEach((seq, roomId) => {
      roomSequences[roomId] = seq
    })

    console.log('[Socket] 📥 Fetching offline messages:', roomSequences)
    // 发送拉取请求
    this.send('fetch_offline_messages', {
      room_sequences: roomSequences
    })
  }

  /**
   * 处理离线消息响应
   * @param data 离线消息数据
   * @param messages 离线消息数组
   * @param total 总消息数量
   * @description 处理服务器返回的离线消息，按房间和序列号排序并触发事件
   */
  private handleOfflineMessages(data: any) {
    const { messages, total } = data

    if (!messages || messages.length === 0) {
      console.log('[Socket] 📭 No offline messages')
      return
    }

    console.log(`[Socket] 📥 Received ${total} offline messages`)

    // 按房间和序列号分组排序
    const grouped: Record<number, any[]> = {}
    messages.forEach((msg: any) => {
      if (!grouped[msg.room_id]) {
        grouped[msg.room_id] = []
      }
      grouped[msg.room_id].push(msg)
    })

    // 处理每个房间的消息
    Object.entries(grouped).forEach(([roomId, msgs]) => {
      // 按序列号排序
      msgs.sort((a: any, b: any) => a.sequence - b.sequence)

      msgs.forEach((msg: any) => {
        // 去重
        if (this.receivedMessageIds.has(msg.id))
          return

        this.receivedMessageIds.add(msg.id)
        this.lastSequence.set(Number(roomId), msg.sequence)

        // 触发新消息事件
        this.emit(SocketEvent.NEW_MESSAGE, msg)
      })
    })

    console.log('[Socket] ✅ Offline messages processed')
  }

  /**
   * 更新房间的最后序列号
   * 在加载历史消息后调用
   * @param roomId 房间ID
   * @param sequence 最新序列号
   * @description 更新房间的最后序列号，用于修复乱序问题
   */
  updateRoomSequence(roomId: number, sequence: number) {
    const current = this.lastSequence.get(roomId) || 0
    if (sequence > current) {
      this.lastSequence.set(roomId, sequence)
      console.log(`[Socket] 📊 Updated room ${roomId} sequence: ${sequence}`)
    }
  }

  // ============================================================
  // 原有方法保持不变
  // ============================================================

  /**
   * 获取当前连接状态
   */
  getStatus(): SocketStatus {
    return this.status
  }

  /**
   * 判断是否已连接
   */
  isConnected(): boolean {
    return this.status === SocketStatus.CONNECTED
  }

  /**
   * 注册全局监听器（与具体页面无关的事件）
   * @description 注册全局监听器，用于处理用户状态变化和新消息事件
   */
  private registerGlobalListeners() {
    if (this.globalListenersRegistered) {
      console.warn('[SocketManager] 全局监听器已注册，跳过重复注册')
      return
    }

    console.log('[SocketManager] 👂 注册全局监听器中...')

    // 监听全局用户状态变化
    this.on(SocketEvent.USER_STATUS_CHANGE, (data: { event_type: string, user: { id: number, name: string }, is_online: boolean }) => {
      console.log('[SocketManager] 🌐 Global user status update:', data)
      try {
        const chatStore = useChatStore()
        chatStore.updateUserOnlineStatus(data.user.id, data.is_online)
      }
      catch (error) {
        console.error('[SocketManager] Failed to update user status:', error)
      }
    })

    // 监听 new_message 事件（后端发送的实际事件名）
    this.on(SocketEvent.NEW_MESSAGE, (data: any) => {
      console.log('[SocketManager] 📬 New message (global):', data)

      // 【新增】去重检查
      const processed = this.processIncomingMessage(data)
      if (!processed)
        return // 重复消息或乱序消息，已处理

      // 如果当前不在对应的聊天室页面，则更新会话列表
      // 通过检查 conversationRooms 来判断用户是否在该房间
      const isInRoom = this.conversationRooms.has(data.room_id)

      if (!isInRoom) {
        try {
          // 用户不在该房间，需要更新会话列表
          console.log('[SocketManager] 📬 User not in room, updating conversation list')

          const chatStore = useChatStore()
          const currentConversation = chatStore.getConversation(data.room_id)

          chatStore.updateConversationItem({
            roomId: data.room_id,
            latestMessage: data.content,
            senderId: data.sender?.id || data.sender_id,
            // 使用后端返回的未读数，如果没有则在当前基础上 +1
            unreadCount: data.unread_count ?? ((currentConversation?.unread_count || 0) + 1),
            timestamp: data.created_at
          })

          // updateConversationItem 内部已经调用了 updateTotalUnreadCount，会自动更新 TabBar 徽标
          console.log('[SocketManager] 📊 TabBar badge will be updated by chatStore')
        }
        catch (error) {
          console.error('[SocketManager] Failed to update conversation:', error)
        }
      }
      else {
        // 用户在房间内，room.vue 会处理该消息
        console.log('[SocketManager] 📬 User in room, room.vue will handle')
      }
    })

    this.globalListenersRegistered = true
    console.log('[SocketManager] ✅ 全局监听器注册完成')
  }

  /**
   * 【新增】加入会话房间（页面级调用）
   * 【优化】无条件写入 Set，连接成功后自动补发
   */
  joinConversationRoom(roomId: number) {
    // 无论是否连接，都先记录到 Set 中
    this.conversationRooms.add(roomId)

    // 如果已连接，立即发送加入指令
    if (this.status === SocketStatus.CONNECTED) {
      this.send('join_room', {
        room_id: roomId,
        room_type: 'conversation'
      })
      console.log(`[SocketManager] 🚪 Joined conversation room: conversation_${roomId}`)
    }
    else {
      // 未连接时只缓存，连接成功后会自动补发
      console.log(`[SocketManager] 💾 Cached room ${roomId}, will join on connect`)
    }
  }

  /**
   * 【新增】离开会话房间
   */
  leaveConversationRoom(roomId: number) {
    if (this.status !== SocketStatus.CONNECTED) {
      console.warn('[SocketManager] Not connected, cannot leave room')
      return
    }

    this.conversationRooms.delete(roomId)

    this.send('leave_room', {
      room_id: roomId,
      room_type: 'conversation'
    })

    console.log(`[SocketManager] 🚪 Left conversation room: conversation_${roomId}`)
  }

  /**
   * 【优化】连接/重连后，自动加入所有缓存的会话房间
   * 解决时序竞争：即使 HTTP 先于 WebSocket 完成，也能正确加入
   */
  private rejoinConversationRooms() {
    console.log('[SocketManager] 🔄 会话房间数有多少...', this.conversationRooms.size)
    if (this.conversationRooms.size === 0) {
      console.log('[SocketManager] 📭 No cached rooms to join')
      return
    }

    console.log(`[SocketManager] 🔄 Auto-joining ${this.conversationRooms.size} cached rooms:`, Array.from(this.conversationRooms))

    this.conversationRooms.forEach((roomId) => {
      this.send('join_room', {
        room_id: roomId,
        room_type: 'conversation'
      })
    })

    console.log('[SocketManager] ✅ All cached rooms joined')
  }

  /**
   * 加入聊天室
   * @deprecated 使用 joinConversationRoom 替代
   */
  joinRoom(roomId: number) {
    console.warn('[SocketManager] joinRoom is deprecated, use joinConversationRoom instead')
    this.joinConversationRoom(roomId)
  }

  /**
   * 离开聊天室
   * @deprecated 使用 leaveConversationRoom 替代
   */
  leaveRoom(roomId: number) {
    console.warn('[SocketManager] leaveRoom is deprecated, use leaveConversationRoom instead')
    this.leaveConversationRoom(roomId)
  }

  /**
   * 发送输入状态
   */
  sendTyping(roomId: number, isTyping: boolean) {
    this.send(isTyping ? 'typing' : 'typing_stop', { room_id: roomId })
  }

  /**
   * 发送消息已读回执
   */
  sendReadReceipt(roomId: number, messageId: number) {
    this.send('message_read', { room_id: roomId, message_id: messageId })
  }

  /**
   * 通过 WebSocket 发送消息（简化版，不等待 ACK）
   * @deprecated 推荐使用 sendMessageWithAck
   * @param roomId 房间ID
   * @param content 消息内容
   * @param messageType 消息类型 (text, image, voice 等)
   * @param tempId 可选的临时ID，用于追踪消息
   * @returns Promise<boolean> 是否成功发送
   */
  sendMessage(roomId: number, content: string, messageType: string = 'text', tempId?: number): Promise<boolean> {
    return new Promise((resolve) => {
      if (this.status !== SocketStatus.CONNECTED) {
        console.warn('[SocketManager] Not connected, cannot send message via WebSocket')
        resolve(false)
        return
      }

      // 使用传入的 tempId 或生成新的唯一 ID
      const finalTempId = tempId || Date.now()

      // 发送消息
      this.send('send_message', {
        room_id: roomId,
        content,
        type: messageType,
        temp_id: finalTempId
      })

      console.log(`[SocketManager] 📤 Message sent via WebSocket (temp_id: ${finalTempId}): ${content.substring(0, 50)}...`)
      resolve(true)
    })
  }

  /**
   * 获取待确认消息数量
   */
  getPendingMessageCount(): number {
    return this.pendingMessages.size + this.retryQueue.length
  }

  /**
   * 获取连接健康状态
   */
  getHealthStatus(): { connected: boolean, missedPongs: number, pendingMessages: number } {
    return {
      connected: this.status === SocketStatus.CONNECTED,
      missedPongs: this.missedPongs,
      pendingMessages: this.getPendingMessageCount()
    }
  }
}

// 导出单例
export const socketManager = new SocketIOManager()

// 导出类型
export type { EventHandler, PendingMessage }
