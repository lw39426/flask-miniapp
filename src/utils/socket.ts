/**
 * WebSocket (Socket.IO) 客户端管理器
 * 基于 uni-app 的 WebSocket API 实现
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

  // 【新增】全局事件（从个人房间接收）
  NEW_MESSAGE_NOTIFY = 'new_message_notify'
}

// 事件处理器类型
type EventHandler = (data: any) => void

class SocketIOManager {
  private socket: any = null // socket.io-client 实例
  private status: SocketStatus = SocketStatus.DISCONNECTED
  private url: string = WEBSOCKET_CONFIG.URL
  private token: string = ''
  private reconnectAttempts: number = 0
  private maxReconnectAttempts: number = WEBSOCKET_CONFIG.MAX_RECONNECT_ATTEMPTS
  private reconnectInterval: number = WEBSOCKET_CONFIG.RECONNECT_INTERVAL
  private reconnectTimer: number | null = null
  private heartbeatTimer: number | null = null
  private eventHandlers: Map<string, Set<EventHandler>> = new Map() // 事件处理器集合
  private messageQueue: any[] = [] // 离线消息队列
  private conversationRooms: Set<number> = new Set() // 【新增】记录前端主动加入的会话房间
  private globalListenersRegistered: boolean = false // 【新增】防止全局监听器重复注册
  private isDestroyed: boolean = false // 【新增】标记是否已销毁，防止登出后重连

  /**
   * 【新增】应用级初始化（替代直接 connect）
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
        this.startHeartbeat()
        this.flushMessageQueue()
        this.emit(SocketEvent.CONNECT, {})

        // 【新增】重连后，重新加入之前的会话房间
        this.rejoinConversationRooms()
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
    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
    }
    this.status = SocketStatus.DISCONNECTED
    this.reconnectAttempts = 0
  }

  /**
   * 【新增】应用级销毁（登出时调用）
   */
  destroy() {
    console.log('[SocketManager] 🔌 Destroying...')

    // 【新增】在断开连接前,通知服务器用户下线
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

    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
    }

    this.status = SocketStatus.DISCONNECTED
    this.reconnectAttempts = 0
    this.conversationRooms.clear()
    this.messageQueue = []

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
      console.log('[Socket] Received123456:', event, data)
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
    }, this.reconnectInterval) as unknown as number
  }

  /**
   * 刷新离线消息队列
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

  /**
   * 开始心跳
   * 如果是连接中状态，则每隔30秒发送ping包，开始心跳
   */
  private startHeartbeat() {
    this.stopHeartbeat()

    this.heartbeatTimer = setInterval(() => {
      if (this.status === SocketStatus.CONNECTED) {
        this.send('ping', { timestamp: Date.now() })
      }
    }, 30000) as unknown as number // 每 30 秒发送一次心跳
  }

  /**
   * 停止心跳
   * 清除心跳定时器
   */
  private stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer)
      this.heartbeatTimer = null
    }
  }

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
   * 【新增】注册全局监听器（与具体页面无关的事件）
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

    // 【修改】监听 new_message 事件（后端发送的实际事件名）
    this.on(SocketEvent.NEW_MESSAGE, (data: any) => {
      console.log('[SocketManager] 📬 New message (global):', data)

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
   * 【新增】通过 WebSocket 发送消息
   * @param roomId 房间ID
   * @param content 消息内容
   * @param messageType 消息类型 (text, image, voice 等)
   * @returns Promise<boolean> 是否成功发送
   */
  sendMessage(roomId: number, content: string, messageType: string = 'text'): Promise<boolean> {
    return new Promise((resolve) => {
      if (this.status !== SocketStatus.CONNECTED) {
        console.warn('[SocketManager] Not connected, cannot send message via WebSocket')
        resolve(false)
        return
      }

      // 生成唯一 ID 用于追踪消息
      const tempId = Date.now()

      // 发送消息
      this.send('send_message', {
        room_id: roomId,
        content,
        type: messageType,
        temp_id: tempId
      })

      console.log(`[SocketManager] 📤 Message sent via WebSocket: ${content.substring(0, 50)}...`)
      resolve(true)
    })
  }
}

// 导出单例
export const socketManager = new SocketIOManager()

// 导出类型
export type { EventHandler }
