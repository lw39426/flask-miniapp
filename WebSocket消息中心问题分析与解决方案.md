# WebSocket 消息中心问题分析与解决方案

## 一、问题诊断

### 1.1 当前代码存在的问题

经过代码审查，发现以下 **4 个严重问题**：

#### ❌ 问题 1: "黑洞期"丢消息

**现象**: 
- 用户在 **断线重连期间** 发送的消息会丢失
- 用户在 **登录到连接建立之间** 的消息会丢失

**当前代码问题**:
```typescript
// src/utils/socket.ts - sendMessage 方法
sendMessage(roomId: number, content: string, ...): Promise<boolean> {
  if (this.status !== SocketStatus.CONNECTED) {
    console.warn('[SocketManager] Not connected, cannot send message')
    resolve(false)  // ❌ 直接返回失败，消息丢失
    return
  }
  // 发送消息
  this.send('send_message', { ... })
  resolve(true)  // ❌ 没有等待服务器确认，可能丢失
}
```

**问题分析**:
1. ❌ 未连接时直接返回 false，消息丢失
2. ❌ 发送后立即返回 true，没有等待服务器 ACK
3. ❌ 网络抖动时消息可能丢失
4. ❌ 没有消息重发机制

---

#### ❌ 问题 2: "僵尸连接"与假在线

**现象**:
- 用户实际已断线，但服务器仍认为在线
- 其他用户看到错误的在线状态

**当前代码问题**:
```typescript
// src/utils/socket.ts - 心跳机制
private startHeartbeat() {
  this.heartbeatTimer = setInterval(() => {
    if (this.status === SocketStatus.CONNECTED) {
      this.send('ping', { timestamp: Date.now() })  // ❌ 只发送，不检查响应
    }
  }, 30000)
}
```

**问题分析**:
1. ❌ 只发送 ping，不检查 pong 响应
2. ❌ 没有超时检测机制
3. ❌ 无法识别僵尸连接
4. ❌ 后端可能没有清理超时连接

---

#### ❌ 问题 3: 消息乱序与时序问题

**现象**:
- 消息显示顺序错乱
- 后发的消息先到达

**当前代码问题**:
```typescript
// src/utils/socket.ts - handleMessage
private handleMessage(message: { event: string, data: any }) {
  const { event, data } = message
  console.log('[Socket] Received:', event, data)
  this.emit(event, data)  // ❌ 直接触发，没有排序
}
```

**问题分析**:
1. ❌ 没有消息序列号 (sequence number)
2. ❌ 没有消息排序机制
3. ❌ 没有消息去重机制
4. ❌ 重连后可能收到重复消息

---

#### ❌ 问题 4: 离线消息队列不完善

**现象**:
- 离线期间的消息无法获取
- 重连后消息不同步

**当前代码问题**:
```typescript
// src/utils/socket.ts - messageQueue
private messageQueue: any[] = []  // ❌ 只存储待发送消息

private flushMessageQueue() {
  const queue = [...this.messageQueue]
  this.messageQueue = []
  queue.forEach(({ event, data }) => {
    this.send(event, data)  // ❌ 没有确认机制
  })
}
```

**问题分析**:
1. ❌ 只缓存待发送消息，不缓存接收消息
2. ❌ 没有离线消息拉取机制
3. ❌ 重连后不同步历史消息
4. ❌ 消息队列没有持久化

---

## 二、解决方案设计

### 2.1 架构设计原则

**前后端职责划分**:
- **后端负责**: 消息持久化、消息确认、离线消息存储、消息排序
- **前端负责**: 消息缓存、UI 更新、重试机制、乐观更新

**设计原则**:
1. **可靠性优先**: 消息不能丢失
2. **最终一致性**: 允许短暂不一致，但最终要一致
3. **用户体验**: 乐观更新 + 后台同步
4. **性能优化**: 批量操作 + 增量同步

---

### 2.2 解决方案总览

```
┌─────────────────────────────────────────────────────────────┐
│                    前端 (Client)                             │
├─────────────────────────────────────────────────────────────┤
│ 1. 消息发送层                                                │
│    - 乐观更新 (立即显示)                                     │
│    - 消息队列 (待确认)                                       │
│    - 重试机制 (失败重发)                                     │
│    - 超时检测 (5s 超时)                                      │
├─────────────────────────────────────────────────────────────┤
│ 2. 消息接收层                                                │
│    - 消息去重 (messageId)                                    │
│    - 消息排序 (sequence)                                     │
│    - 消息缓存 (本地存储)                                     │
├─────────────────────────────────────────────────────────────┤
│ 3. 连接管理层                                                │
│    - 心跳检测 (ping/pong)                                    │
│    - 超时断线 (3次未响应)                                    │
│    - 自动重连 (指数退避)                                     │
│    - 离线消息拉取                                            │
└─────────────────────────────────────────────────────────────┘
                            ↕ WebSocket
┌─────────────────────────────────────────────────────────────┐
│                    后端 (Server)                             │
├─────────────────────────────────────────────────────────────┤
│ 1. 消息持久化                                                │
│    - 消息存储 (数据库)                                       │
│    - 消息确认 (ACK)                                          │
│    - 消息序列号 (sequence)                                   │
├─────────────────────────────────────────────────────────────┤
│ 2. 离线消息                                                  │
│    - 离线消息队列                                            │
│    - 消息推送 (重连后)                                       │
│    - 增量同步 (lastSeq)                                      │
├─────────────────────────────────────────────────────────────┤
│ 3. 连接管理                                                  │
│    - 心跳响应 (pong)                                         │
│    - 超时清理 (60s)                                          │
│    - 在线状态管理                                            │
└─────────────────────────────────────────────────────────────┘
```

---

## 三、具体实现方案

### 3.1 解决"黑洞期"丢消息

#### 前端实现 (主要)

**方案**: 消息确认机制 + 重试队列 + 乐观更新


**步骤 1: 定义消息状态**

```typescript
// src/types/message.ts
export enum MessageStatus {
  SENDING = 'sending',      // 发送中
  SENT = 'sent',           // 已发送 (等待确认)
  DELIVERED = 'delivered', // 已送达 (服务器确认)
  FAILED = 'failed',       // 发送失败
  READ = 'read'            // 已读
}

export interface PendingMessage {
  tempId: string           // 临时 ID (客户端生成)
  roomId: number
  content: string
  type: string
  status: MessageStatus
  timestamp: number
  retryCount: number       // 重试次数
  maxRetries: number       // 最大重试次数
}
```

**步骤 2: 改造 socketManager**

```typescript
// src/utils/socket.ts
class SocketIOManager {
  // 新增属性
  private pendingMessages: Map<string, PendingMessage> = new Map()
  private messageAckTimeout: number = 5000 // 5秒超时
  private maxRetries: number = 3

  /**
   * 发送消息 (改进版)
   */
  async sendMessage(
    roomId: number, 
    content: string, 
    messageType: string = 'text'
  ): Promise<{ success: boolean, tempId: string, messageId?: number }> {
    // 1. 生成临时 ID
    const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    // 2. 创建待确认消息
    const pendingMsg: PendingMessage = {
      tempId,
      roomId,
      content,
      type: messageType,
      status: MessageStatus.SENDING,
      timestamp: Date.now(),
      retryCount: 0,
      maxRetries: this.maxRetries
    }
    
    // 3. 乐观更新 - 立即显示消息
    this.emit('message_optimistic', {
      tempId,
      roomId,
      content,
      type: messageType,
      status: MessageStatus.SENDING,
      created_at: new Date().toISOString()
    })
    
    // 4. 如果未连接，加入队列
    if (this.status !== SocketStatus.CONNECTED) {
      console.warn('[SocketManager] Not connected, queuing message')
      this.pendingMessages.set(tempId, pendingMsg)
      return { success: false, tempId }
    }
    
    // 5. 发送消息并等待确认
    return this.sendWithAck(pendingMsg)
  }

  /**
   * 发送消息并等待确认
   */
  private sendWithAck(pendingMsg: PendingMessage): Promise<{ success: boolean, tempId: string, messageId?: number }> {
    return new Promise((resolve) => {
      const { tempId, roomId, content, type } = pendingMsg
      
      // 1. 设置超时定时器
      const timeoutTimer = setTimeout(() => {
        console.error(`[SocketManager] Message ACK timeout: ${tempId}`)
        this.handleMessageTimeout(pendingMsg)
        resolve({ success: false, tempId })
      }, this.messageAckTimeout)
      
      // 2. 注册 ACK 监听器 (一次性)
      const ackHandler = (data: { temp_id: string, message_id: number, success: boolean }) => {
        if (data.temp_id === tempId) {
          clearTimeout(timeoutTimer)
          this.off('message_ack', ackHandler)
          
          if (data.success) {
            // 消息确认成功
            console.log(`[SocketManager] ✅ Message ACK received: ${tempId} -> ${data.message_id}`)
            this.pendingMessages.delete(tempId)
            
            // 更新消息状态
            this.emit('message_confirmed', {
              tempId,
              messageId: data.message_id,
              status: MessageStatus.DELIVERED
            })
            
            resolve({ success: true, tempId, messageId: data.message_id })
          } else {
            // 服务器拒绝消息
            this.handleMessageFailed(pendingMsg)
            resolve({ success: false, tempId })
          }
        }
      }
      
      this.on('message_ack', ackHandler)
      
      // 3. 发送消息
      this.send('send_message', {
        temp_id: tempId,
        room_id: roomId,
        content,
        type,
        timestamp: Date.now()
      })
      
      // 4. 加入待确认队列
      this.pendingMessages.set(tempId, pendingMsg)
      
      console.log(`[SocketManager] 📤 Message sent, waiting for ACK: ${tempId}`)
    })
  }

  /**
   * 处理消息超时
   */
  private handleMessageTimeout(pendingMsg: PendingMessage) {
    pendingMsg.retryCount++
    
    if (pendingMsg.retryCount < pendingMsg.maxRetries) {
      // 重试
      console.log(`[SocketManager] 🔄 Retrying message (${pendingMsg.retryCount}/${pendingMsg.maxRetries}): ${pendingMsg.tempId}`)
      
      // 更新状态为重试中
      this.emit('message_retrying', {
        tempId: pendingMsg.tempId,
        retryCount: pendingMsg.retryCount
      })
      
      // 延迟重试 (指数退避)
      setTimeout(() => {
        if (this.status === SocketStatus.CONNECTED) {
          this.sendWithAck(pendingMsg)
        }
      }, 1000 * Math.pow(2, pendingMsg.retryCount - 1)) // 1s, 2s, 4s
    } else {
      // 重试次数用尽，标记为失败
      this.handleMessageFailed(pendingMsg)
    }
  }

  /**
   * 处理消息发送失败
   */
  private handleMessageFailed(pendingMsg: PendingMessage) {
    console.error(`[SocketManager] ❌ Message failed: ${pendingMsg.tempId}`)
    
    pendingMsg.status = MessageStatus.FAILED
    
    // 通知 UI 更新
    this.emit('message_failed', {
      tempId: pendingMsg.tempId,
      status: MessageStatus.FAILED
    })
    
    // 保留在队列中，允许用户手动重试
    // this.pendingMessages.delete(pendingMsg.tempId)
  }

  /**
   * 手动重试失败消息
   */
  retryMessage(tempId: string): Promise<{ success: boolean, tempId: string, messageId?: number }> {
    const pendingMsg = this.pendingMessages.get(tempId)
    
    if (!pendingMsg) {
      console.error(`[SocketManager] Message not found: ${tempId}`)
      return Promise.resolve({ success: false, tempId })
    }
    
    // 重置重试次数
    pendingMsg.retryCount = 0
    pendingMsg.status = MessageStatus.SENDING
    
    return this.sendWithAck(pendingMsg)
  }

  /**
   * 重连后重发所有待确认消息
   */
  private resendPendingMessages() {
    if (this.pendingMessages.size === 0) {
      return
    }
    
    console.log(`[SocketManager] 🔄 Resending ${this.pendingMessages.size} pending messages`)
    
    this.pendingMessages.forEach((pendingMsg) => {
      // 重置重试次数
      pendingMsg.retryCount = 0
      this.sendWithAck(pendingMsg)
    })
  }

  /**
   * 连接成功后的处理 (改进)
   */
  private onConnected() {
    console.log('[Socket] Connected')
    this.status = SocketStatus.CONNECTED
    this.reconnectAttempts = 0
    this.startHeartbeat()
    
    // 1. 刷新普通消息队列
    this.flushMessageQueue()
    
    // 2. 重发待确认消息
    this.resendPendingMessages()
    
    // 3. 重新加入会话房间
    this.rejoinConversationRooms()
    
    // 4. 拉取离线消息 (见 3.4 节)
    this.fetchOfflineMessages()
    
    this.emit(SocketEvent.CONNECT, {})
  }
}
```

**步骤 3: 页面层使用**

```vue
<!-- src/pages/chat/room.vue -->
<script setup>
import { socketManager } from '@/utils/socket'

// 消息列表
const messages = ref([])

// 发送消息
const sendMessage = async () => {
  const content = inputText.value.trim()
  if (!content) return
  
  // 1. 乐观更新 - 立即显示
  const tempMessage = {
    tempId: `temp_${Date.now()}`,
    content,
    status: 'sending',
    created_at: new Date().toISOString(),
    sender: { id: currentUserId }
  }
  messages.value.push(tempMessage)
  inputText.value = ''
  
  // 2. 发送消息
  const result = await socketManager.sendMessage(roomId, content)
  
  // 3. 更新消息状态
  if (result.success) {
    // 成功 - 等待服务器确认
    const msg = messages.value.find(m => m.tempId === result.tempId)
    if (msg) {
      msg.status = 'sent'
    }
  } else {
    // 失败 - 标记为失败
    const msg = messages.value.find(m => m.tempId === result.tempId)
    if (msg) {
      msg.status = 'failed'
    }
  }
}

// 监听消息确认
socketManager.on('message_confirmed', (data) => {
  const msg = messages.value.find(m => m.tempId === data.tempId)
  if (msg) {
    msg.id = data.messageId
    msg.status = 'delivered'
    msg.tempId = undefined
  }
})

// 监听消息失败
socketManager.on('message_failed', (data) => {
  const msg = messages.value.find(m => m.tempId === data.tempId)
  if (msg) {
    msg.status = 'failed'
  }
})

// 重试失败消息
const retryMessage = async (tempId) => {
  const msg = messages.value.find(m => m.tempId === tempId)
  if (msg) {
    msg.status = 'sending'
  }
  
  const result = await socketManager.retryMessage(tempId)
  
  if (!result.success) {
    msg.status = 'failed'
  }
}
</script>

<template>
  <view class="message-list">
    <view v-for="msg in messages" :key="msg.id || msg.tempId" class="message-item">
      <text>{{ msg.content }}</text>
      
      <!-- 状态指示器 -->
      <view v-if="msg.status === 'sending'" class="status">发送中...</view>
      <view v-else-if="msg.status === 'sent'" class="status">已发送</view>
      <view v-else-if="msg.status === 'delivered'" class="status">✓</view>
      <view v-else-if="msg.status === 'failed'" class="status error" @tap="retryMessage(msg.tempId)">
        发送失败，点击重试
      </view>
    </view>
  </view>
</template>
```

#### 后端实现 (必需)

```python
# backend/socket_handlers.py
from flask_socketio import emit

@socketio.on('send_message')
def handle_send_message(data):
    temp_id = data.get('temp_id')
    room_id = data.get('room_id')
    content = data.get('content')
    message_type = data.get('type', 'text')
    
    try:
        # 1. 保存消息到数据库
        message = Message.create(
            room_id=room_id,
            sender_id=current_user.id,
            content=content,
            type=message_type,
            created_at=datetime.now()
        )
        
        # 2. 立即发送 ACK 确认
        emit('message_ack', {
            'temp_id': temp_id,
            'message_id': message.id,
            'success': True,
            'timestamp': message.created_at.isoformat()
        })
        
        # 3. 广播消息到房间
        emit('new_message', {
            'id': message.id,
            'room_id': room_id,
            'content': content,
            'type': message_type,
            'sender': {
                'id': current_user.id,
                'nickname': current_user.nickname
            },
            'created_at': message.created_at.isoformat()
        }, room=f'conversation_{room_id}')
        
        # 4. 如果接收方离线，存储到离线消息队列
        save_offline_message_if_needed(message)
        
    except Exception as e:
        # 发送失败 ACK
        emit('message_ack', {
            'temp_id': temp_id,
            'success': False,
            'error': str(e)
        })
```


---

### 3.2 解决"僵尸连接"与假在线

#### 前端实现 (主要)

**方案**: Ping/Pong 心跳检测 + 超时断线

```typescript
// src/utils/socket.ts
class SocketIOManager {
  private heartbeatTimer: number | null = null
  private heartbeatInterval: number = 30000 // 30秒
  private pongTimeout: number = 10000 // 10秒超时
  private missedPongs: number = 0
  private maxMissedPongs: number = 3 // 3次未响应则断线

  /**
   * 开始心跳 (改进版)
   */
  private startHeartbeat() {
    this.stopHeartbeat()
    this.missedPongs = 0

    this.heartbeatTimer = setInterval(() => {
      if (this.status === SocketStatus.CONNECTED) {
        this.sendPing()
      }
    }, this.heartbeatInterval) as unknown as number
  }

  /**
   * 发送 Ping 并等待 Pong
   */
  private sendPing() {
    const pingId = Date.now()
    let pongReceived = false

    // 1. 设置超时检测
    const pongTimer = setTimeout(() => {
      if (!pongReceived) {
        this.missedPongs++
        console.warn(`[SocketManager] ⚠️ Pong timeout (${this.missedPongs}/${this.maxMissedPongs})`)

        if (this.missedPongs >= this.maxMissedPongs) {
          // 超过最大次数，认为连接已死
          console.error('[SocketManager] 💀 Connection is dead, forcing disconnect')
          this.handleDeadConnection()
        }
      }
    }, this.pongTimeout)

    // 2. 注册 Pong 监听器 (一次性)
    const pongHandler = (data: { ping_id: number, timestamp: number }) => {
      if (data.ping_id === pingId) {
        pongReceived = true
        clearTimeout(pongTimer)
        this.off('pong', pongHandler)

        // 重置计数器
        this.missedPongs = 0

        // 计算延迟
        const latency = Date.now() - pingId
        console.log(`[SocketManager] 🏓 Pong received, latency: ${latency}ms`)

        // 触发延迟事件 (可用于 UI 显示)
        this.emit('latency_update', { latency })
      }
    }

    this.on('pong', pongHandler)

    // 3. 发送 Ping
    this.send('ping', { ping_id: pingId, timestamp: Date.now() })
  }

  /**
   * 处理死连接
   */
  private handleDeadConnection() {
    console.error('[SocketManager] 💀 Handling dead connection')

    // 1. 停止心跳
    this.stopHeartbeat()

    // 2. 断开连接
    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
    }

    // 3. 更新状态
    this.status = SocketStatus.DISCONNECTED

    // 4. 触发断线事件
    this.emit(SocketEvent.DISCONNECT, { reason: 'dead_connection' })

    // 5. 尝试重连
    this.tryReconnect()
  }

  /**
   * 停止心跳
   */
  private stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer)
      this.heartbeatTimer = null
    }
    this.missedPongs = 0
  }
}
```

#### 后端实现 (必需)

```python
# backend/socket_handlers.py
from flask_socketio import emit
from datetime import datetime, timedelta

# 存储用户最后活跃时间
user_last_active = {}

@socketio.on('ping')
def handle_ping(data):
    ping_id = data.get('ping_id')
    user_id = current_user.id
    
    # 1. 更新用户最后活跃时间
    user_last_active[user_id] = datetime.now()
    
    # 2. 立即响应 Pong
    emit('pong', {
        'ping_id': ping_id,
        'timestamp': datetime.now().timestamp()
    })

@socketio.on('connect')
def handle_connect():
    user_id = current_user.id
    
    # 1. 记录用户上线
    user_last_active[user_id] = datetime.now()
    
    # 2. 更新在线状态
    update_user_online_status(user_id, True)
    
    # 3. 广播上线事件
    emit('user_status_change', {
        'user': {'id': user_id, 'name': current_user.nickname},
        'is_online': True,
        'event_type': 'online'
    }, broadcast=True)

@socketio.on('disconnect')
def handle_disconnect():
    user_id = current_user.id
    
    # 1. 更新在线状态
    update_user_online_status(user_id, False)
    
    # 2. 清理活跃时间
    user_last_active.pop(user_id, None)
    
    # 3. 广播下线事件
    emit('user_status_change', {
        'user': {'id': user_id, 'name': current_user.nickname},
        'is_online': False,
        'event_type': 'offline'
    }, broadcast=True)

# 定时任务：清理僵尸连接
def cleanup_zombie_connections():
    """每分钟执行一次"""
    now = datetime.now()
    timeout = timedelta(seconds=60)  # 60秒无活动视为僵尸
    
    for user_id, last_active in list(user_last_active.items()):
        if now - last_active > timeout:
            print(f'[Cleanup] Zombie connection detected: user {user_id}')
            
            # 强制断开连接
            disconnect_user(user_id)
            
            # 更新在线状态
            update_user_online_status(user_id, False)
            
            # 清理记录
            user_last_active.pop(user_id, None)
```

---

### 3.3 解决消息乱序与时序问题

#### 前端实现 (主要)

**方案**: 消息序列号 + 排序 + 去重

```typescript
// src/utils/socket.ts
class SocketIOManager {
  private receivedMessageIds: Set<number> = new Set() // 已接收消息 ID
  private messageBuffer: Map<number, any[]> = new Map() // 消息缓冲区 (按房间)
  private lastSequence: Map<number, number> = new Map() // 每个房间的最后序列号

  /**
   * 处理接收到的消息 (改进版)
   */
  private handleMessage(message: { event: string, data: any }) {
    const { event, data } = message

    // 特殊处理 new_message 事件
    if (event === SocketEvent.NEW_MESSAGE) {
      this.handleNewMessage(data)
    } else {
      this.emit(event, data)
    }
  }

  /**
   * 处理新消息 (带去重和排序)
   */
  private handleNewMessage(data: any) {
    const messageId = data.id
    const roomId = data.room_id
    const sequence = data.sequence // 后端提供的序列号

    // 1. 去重检查
    if (this.receivedMessageIds.has(messageId)) {
      console.warn(`[SocketManager] ⚠️ Duplicate message ignored: ${messageId}`)
      return
    }

    // 2. 记录已接收
    this.receivedMessageIds.add(messageId)

    // 3. 检查序列号
    const lastSeq = this.lastSequence.get(roomId) || 0

    if (sequence && sequence <= lastSeq) {
      // 旧消息，可能是重连后的重复消息
      console.warn(`[SocketManager] ⚠️ Old message ignored: seq ${sequence} <= ${lastSeq}`)
      return
    }

    // 4. 检查是否有序
    if (sequence && sequence > lastSeq + 1) {
      // 消息乱序，缓存起来
      console.warn(`[SocketManager] ⚠️ Out of order message: seq ${sequence}, expected ${lastSeq + 1}`)
      this.bufferMessage(roomId, data)
      
      // 请求缺失的消息
      this.requestMissingMessages(roomId, lastSeq + 1, sequence - 1)
      return
    }

    // 5. 正常处理消息
    this.processMessage(data)
    this.lastSequence.set(roomId, sequence)

    // 6. 检查缓冲区是否有后续消息
    this.processBufferedMessages(roomId)
  }

  /**
   * 缓存乱序消息
   */
  private bufferMessage(roomId: number, message: any) {
    if (!this.messageBuffer.has(roomId)) {
      this.messageBuffer.set(roomId, [])
    }
    this.messageBuffer.get(roomId)!.push(message)
  }

  /**
   * 处理缓冲区消息
   */
  private processBufferedMessages(roomId: number) {
    const buffer = this.messageBuffer.get(roomId)
    if (!buffer || buffer.length === 0) return

    const lastSeq = this.lastSequence.get(roomId) || 0

    // 按序列号排序
    buffer.sort((a, b) => a.sequence - b.sequence)

    // 处理连续的消息
    let processed = 0
    for (const msg of buffer) {
      if (msg.sequence === lastSeq + 1) {
        this.processMessage(msg)
        this.lastSequence.set(roomId, msg.sequence)
        processed++
      } else {
        break
      }
    }

    // 移除已处理的消息
    if (processed > 0) {
      buffer.splice(0, processed)
    }
  }

  /**
   * 请求缺失的消息
   */
  private requestMissingMessages(roomId: number, startSeq: number, endSeq: number) {
    console.log(`[SocketManager] 📥 Requesting missing messages: ${startSeq} - ${endSeq}`)

    this.send('request_messages', {
      room_id: roomId,
      start_sequence: startSeq,
      end_sequence: endSeq
    })
  }

  /**
   * 处理消息 (最终处理)
   */
  private processMessage(data: any) {
    console.log('[SocketManager] ✅ Processing message:', data.id)
    this.emit(SocketEvent.NEW_MESSAGE, data)
  }

  /**
   * 清理已接收消息 ID (定期清理，防止内存泄漏)
   */
  private cleanupReceivedMessageIds() {
    // 只保留最近 1000 条消息的 ID
    if (this.receivedMessageIds.size > 1000) {
      const idsArray = Array.from(this.receivedMessageIds)
      const toKeep = idsArray.slice(-1000)
      this.receivedMessageIds = new Set(toKeep)
    }
  }
}
```

#### 后端实现 (必需)

```python
# backend/models.py
class Message(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    room_id = db.Column(db.Integer, nullable=False)
    sender_id = db.Column(db.Integer, nullable=False)
    content = db.Column(db.Text, nullable=False)
    type = db.Column(db.String(20), default='text')
    sequence = db.Column(db.Integer, nullable=False)  # 新增：序列号
    created_at = db.Column(db.DateTime, default=datetime.now)

# backend/socket_handlers.py
# 每个房间的序列号计数器
room_sequence_counters = {}

@socketio.on('send_message')
def handle_send_message(data):
    room_id = data.get('room_id')
    
    # 1. 获取并递增序列号
    if room_id not in room_sequence_counters:
        # 从数据库获取最大序列号
        max_seq = db.session.query(func.max(Message.sequence))\
            .filter_by(room_id=room_id).scalar() or 0
        room_sequence_counters[room_id] = max_seq
    
    room_sequence_counters[room_id] += 1
    sequence = room_sequence_counters[room_id]
    
    # 2. 保存消息 (带序列号)
    message = Message.create(
        room_id=room_id,
        sender_id=current_user.id,
        content=data.get('content'),
        type=data.get('type', 'text'),
        sequence=sequence,  # 保存序列号
        created_at=datetime.now()
    )
    
    # 3. 广播消息 (带序列号)
    emit('new_message', {
        'id': message.id,
        'room_id': room_id,
        'content': message.content,
        'type': message.type,
        'sequence': sequence,  # 返回序列号
        'sender': {
            'id': current_user.id,
            'nickname': current_user.nickname
        },
        'created_at': message.created_at.isoformat()
    }, room=f'conversation_{room_id}')

@socketio.on('request_messages')
def handle_request_messages(data):
    """处理缺失消息请求"""
    room_id = data.get('room_id')
    start_seq = data.get('start_sequence')
    end_seq = data.get('end_sequence')
    
    # 查询缺失的消息
    messages = Message.query.filter(
        Message.room_id == room_id,
        Message.sequence >= start_seq,
        Message.sequence <= end_seq
    ).order_by(Message.sequence).all()
    
    # 发送缺失的消息
    for msg in messages:
        emit('new_message', {
            'id': msg.id,
            'room_id': msg.room_id,
            'content': msg.content,
            'type': msg.type,
            'sequence': msg.sequence,
            'sender': {
                'id': msg.sender_id,
                'nickname': msg.sender.nickname
            },
            'created_at': msg.created_at.isoformat()
        })
```

### 3.4 解决离线消息队列问题

#### 前端实现 (主要)

**方案**: 重连后拉取离线消息 + 增量同步

```typescript
// src/utils/socket.ts
class SocketIOManager {
  /**
   * 拉取离线消息
   */
  private async fetchOfflineMessages() {
    console.log('[SocketManager] 📥 Fetching offline messages...')

    // 获取每个房间的最后序列号
    const roomSequences: Record<number, number> = {}
    this.lastSequence.forEach((seq, roomId) => {
      roomSequences[roomId] = seq
    })

    // 发送拉取请求
    this.send('fetch_offline_messages', {
      room_sequences: roomSequences,
      timestamp: Date.now()
    })
  }

  /**
   * 注册全局监听器 (改进版)
   */
  private registerGlobalListeners() {
    if (this.globalListenersRegistered) return

    // ... 其他监听器 ...

    // 监听离线消息响应
    this.on('offline_messages', (data: { messages: any[], total: number }) => {
      console.log(`[SocketManager] 📬 Received ${data.messages.length} offline messages`)

      // 按房间分组
      const messagesByRoom = new Map<number, any[]>()
      data.messages.forEach(msg => {
        if (!messagesByRoom.has(msg.room_id)) {
          messagesByRoom.set(msg.room_id, [])
        }
        messagesByRoom.get(msg.room_id)!.push(msg)
      })

      // 逐个处理
      messagesByRoom.forEach((messages, roomId) => {
        // 按序列号排序
        messages.sort((a, b) => a.sequence - b.sequence)

        // 处理每条消息
        messages.forEach(msg => {
          this.handleNewMessage(msg)
        })

        // 更新会话列表
        const chatStore = useChatStore()
        const lastMsg = messages[messages.length - 1]
        chatStore.updateConversationItem({
          roomId,
          latestMessage: lastMsg.content,
          senderId: lastMsg.sender.id,
          unreadCount: messages.length,
          timestamp: lastMsg.created_at
        })
      })

      // 触发离线消息同步完成事件
      this.emit('offline_messages_synced', {
        total: data.total,
        rooms: messagesByRoom.size
      })
    })

    this.globalListenersRegistered = true
  }
}
```

#### 后端实现 (必需)

```python
# backend/socket_handlers.py
@socketio.on('fetch_offline_messages')
def handle_fetch_offline_messages(data):
    """处理离线消息拉取请求"""
    user_id = current_user.id
    room_sequences = data.get('room_sequences', {})
    
    # 1. 获取用户的所有会话房间
    user_rooms = get_user_conversation_rooms(user_id)
    
    offline_messages = []
    
    for room in user_rooms:
        room_id = room.id
        last_seq = room_sequences.get(str(room_id), 0)
        
        # 2. 查询该房间中序列号大于 last_seq 的消息
        messages = Message.query.filter(
            Message.room_id == room_id,
            Message.sequence > last_seq,
            Message.sender_id != user_id  # 排除自己发送的消息
        ).order_by(Message.sequence).all()
        
        # 3. 转换为字典
        for msg in messages:
            offline_messages.append({
                'id': msg.id,
                'room_id': msg.room_id,
                'content': msg.content,
                'type': msg.type,
                'sequence': msg.sequence,
                'sender': {
                    'id': msg.sender_id,
                    'nickname': msg.sender.nickname,
                    'avatar': msg.sender.avatar
                },
                'created_at': msg.created_at.isoformat()
            })
    
    # 4. 发送离线消息
    emit('offline_messages', {
        'messages': offline_messages,
        'total': len(offline_messages)
    })
    
    print(f'[OfflineMessages] Sent {len(offline_messages)} messages to user {user_id}')
```

---

## 四、完整实现代码

### 4.1 前端完整代码

```typescript
// src/utils/socket-enhanced.ts
/**
 * 增强版 WebSocket 管理器
 * 解决: 黑洞期丢消息、僵尸连接、消息乱序、离线消息
 */

import io from '@hyoga/uni-socket.io'
import { WEBSOCKET_CONFIG } from '@/pages/chat/config'
import { useChatStore } from '@/store/chat'

// 消息状态
export enum MessageStatus {
  SENDING = 'sending',
  SENT = 'sent',
  DELIVERED = 'delivered',
  FAILED = 'failed',
  READ = 'read'
}

// 待确认消息
interface PendingMessage {
  tempId: string
  roomId: number
  content: string
  type: string
  status: MessageStatus
  timestamp: number
  retryCount: number
  maxRetries: number
}

class EnhancedSocketManager {
  // 基础属性
  private socket: any = null
  private status: string = 'disconnected'
  private token: string = ''
  private isDestroyed: boolean = false

  // 连接管理
  private reconnectAttempts: number = 0
  private maxReconnectAttempts: number = 5
  private reconnectInterval: number = 3000
  private reconnectTimer: number | null = null

  // 心跳管理
  private heartbeatTimer: number | null = null
  private heartbeatInterval: number = 30000
  private pongTimeout: number = 10000
  private missedPongs: number = 0
  private maxMissedPongs: number = 3

  // 消息管理
  private pendingMessages: Map<string, PendingMessage> = new Map()
  private messageAckTimeout: number = 5000
  private maxRetries: number = 3
  private receivedMessageIds: Set<number> = new Set()
  private messageBuffer: Map<number, any[]> = new Map()
  private lastSequence: Map<number, number> = new Map()

  // 事件管理
  private eventHandlers: Map<string, Set<Function>> = new Map()
  private conversationRooms: Set<number> = new Set()

  /**
   * 初始化
   */
  init(token: string) {
    if (this.status === 'connected' || this.status === 'connecting') {
      console.log('[EnhancedSocket] Already initialized')
      return
    }

    this.token = token
    this.isDestroyed = false
    this.connect(token)
  }

  /**
   * 连接
   */
  private async connect(token: string) {
    this.status = 'connecting'
    console.log('[EnhancedSocket] Connecting...')

    try {
      this.socket = io(WEBSOCKET_CONFIG.URL, {
        transports: ['websocket'],
        query: { token },
        path: '/socket.io/',
        autoConnect: true,
        reconnection: false
      })

      // 连接成功
      this.socket.on('connect', () => {
        this.onConnected()
      })

      // 接收消息
      this.socket.onAny((event: string, data: any) => {
        this.handleMessage({ event, data })
      })

      // 断开连接
      this.socket.on('disconnect', () => {
        this.onDisconnected()
      })

      // 连接错误
      this.socket.on('connect_error', (error: any) => {
        console.error('[EnhancedSocket] Connect error:', error)
      })
    } catch (error) {
      console.error('[EnhancedSocket] Connection failed:', error)
      this.tryReconnect()
    }
  }

  /**
   * 连接成功处理
   */
  private onConnected() {
    console.log('[EnhancedSocket] ✅ Connected')
    this.status = 'connected'
    this.reconnectAttempts = 0

    // 1. 启动心跳
    this.startHeartbeat()

    // 2. 重发待确认消息
    this.resendPendingMessages()

    // 3. 重新加入房间
    this.rejoinConversationRooms()

    // 4. 拉取离线消息
    this.fetchOfflineMessages()

    // 5. 触发连接事件
    this.emit('connect', {})
  }

  /**
   * 断开连接处理
   */
  private onDisconnected() {
    console.log('[EnhancedSocket] ❌ Disconnected')
    this.status = 'disconnected'
    this.stopHeartbeat()
    this.emit('disconnect', {})
    this.tryReconnect()
  }

  /**
   * 发送消息 (带确认)
   */
  async sendMessage(
    roomId: number,
    content: string,
    messageType: string = 'text'
  ): Promise<{ success: boolean, tempId: string, messageId?: number }> {
    const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    const pendingMsg: PendingMessage = {
      tempId,
      roomId,
      content,
      type: messageType,
      status: MessageStatus.SENDING,
      timestamp: Date.now(),
      retryCount: 0,
      maxRetries: this.maxRetries
    }

    // 乐观更新
    this.emit('message_optimistic', {
      tempId,
      roomId,
      content,
      type: messageType,
      status: MessageStatus.SENDING,
      created_at: new Date().toISOString()
    })

    // 如果未连接，加入队列
    if (this.status !== 'connected') {
      this.pendingMessages.set(tempId, pendingMsg)
      return { success: false, tempId }
    }

    return this.sendWithAck(pendingMsg)
  }

  /**
   * 发送消息并等待确认
   */
  private sendWithAck(pendingMsg: PendingMessage): Promise<any> {
    return new Promise((resolve) => {
      const { tempId, roomId, content, type } = pendingMsg

      const timeoutTimer = setTimeout(() => {
        this.handleMessageTimeout(pendingMsg)
        resolve({ success: false, tempId })
      }, this.messageAckTimeout)

      const ackHandler = (data: any) => {
        if (data.temp_id === tempId) {
          clearTimeout(timeoutTimer)
          this.off('message_ack', ackHandler)

          if (data.success) {
            this.pendingMessages.delete(tempId)
            this.emit('message_confirmed', {
              tempId,
              messageId: data.message_id,
              status: MessageStatus.DELIVERED
            })
            resolve({ success: true, tempId, messageId: data.message_id })
          } else {
            this.handleMessageFailed(pendingMsg)
            resolve({ success: false, tempId })
          }
        }
      }

      this.on('message_ack', ackHandler)

      this.send('send_message', {
        temp_id: tempId,
        room_id: roomId,
        content,
        type,
        timestamp: Date.now()
      })

      this.pendingMessages.set(tempId, pendingMsg)
    })
  }

  /**
   * 处理消息超时
   */
  private handleMessageTimeout(pendingMsg: PendingMessage) {
    pendingMsg.retryCount++

    if (pendingMsg.retryCount < pendingMsg.maxRetries) {
      console.log(`[EnhancedSocket] 🔄 Retrying (${pendingMsg.retryCount}/${pendingMsg.maxRetries})`)
      
      this.emit('message_retrying', {
        tempId: pendingMsg.tempId,
        retryCount: pendingMsg.retryCount
      })

      setTimeout(() => {
        if (this.status === 'connected') {
          this.sendWithAck(pendingMsg)
        }
      }, 1000 * Math.pow(2, pendingMsg.retryCount - 1))
    } else {
      this.handleMessageFailed(pendingMsg)
    }
  }

  /**
   * 处理消息失败
   */
  private handleMessageFailed(pendingMsg: PendingMessage) {
    console.error(`[EnhancedSocket] ❌ Message failed: ${pendingMsg.tempId}`)
    pendingMsg.status = MessageStatus.FAILED
    this.emit('message_failed', {
      tempId: pendingMsg.tempId,
      status: MessageStatus.FAILED
    })
  }

  /**
   * 重发待确认消息
   */
  private resendPendingMessages() {
    if (this.pendingMessages.size === 0) return

    console.log(`[EnhancedSocket] 🔄 Resending ${this.pendingMessages.size} pending messages`)

    this.pendingMessages.forEach((pendingMsg) => {
      pendingMsg.retryCount = 0
      this.sendWithAck(pendingMsg)
    })
  }

  /**
   * 心跳检测
   */
  private startHeartbeat() {
    this.stopHeartbeat()
    this.missedPongs = 0

    this.heartbeatTimer = setInterval(() => {
      if (this.status === 'connected') {
        this.sendPing()
      }
    }, this.heartbeatInterval) as unknown as number
  }

  /**
   * 发送 Ping
   */
  private sendPing() {
    const pingId = Date.now()
    let pongReceived = false

    const pongTimer = setTimeout(() => {
      if (!pongReceived) {
        this.missedPongs++
        console.warn(`[EnhancedSocket] ⚠️ Pong timeout (${this.missedPongs}/${this.maxMissedPongs})`)

        if (this.missedPongs >= this.maxMissedPongs) {
          this.handleDeadConnection()
        }
      }
    }, this.pongTimeout)

    const pongHandler = (data: any) => {
      if (data.ping_id === pingId) {
        pongReceived = true
        clearTimeout(pongTimer)
        this.off('pong', pongHandler)
        this.missedPongs = 0

        const latency = Date.now() - pingId
        this.emit('latency_update', { latency })
      }
    }

    this.on('pong', pongHandler)
    this.send('ping', { ping_id: pingId, timestamp: Date.now() })
  }

  /**
   * 处理死连接
   */
  private handleDeadConnection() {
    console.error('[EnhancedSocket] 💀 Dead connection detected')
    this.stopHeartbeat()

    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
    }

    this.status = 'disconnected'
    this.emit('disconnect', { reason: 'dead_connection' })
    this.tryReconnect()
  }

  /**
   * 停止心跳
   */
  private stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer)
      this.heartbeatTimer = null
    }
    this.missedPongs = 0
  }

  /**
   * 处理接收消息
   */
  private handleMessage(message: { event: string, data: any }) {
    const { event, data } = message

    if (event === 'new_message') {
      this.handleNewMessage(data)
    } else {
      this.emit(event, data)
    }
  }

  /**
   * 处理新消息 (带去重和排序)
   */
  private handleNewMessage(data: any) {
    const messageId = data.id
    const roomId = data.room_id
    const sequence = data.sequence

    // 去重
    if (this.receivedMessageIds.has(messageId)) {
      return
    }

    this.receivedMessageIds.add(messageId)

    // 检查序列号
    const lastSeq = this.lastSequence.get(roomId) || 0

    if (sequence && sequence <= lastSeq) {
      return
    }

    // 检查乱序
    if (sequence && sequence > lastSeq + 1) {
      this.bufferMessage(roomId, data)
      this.requestMissingMessages(roomId, lastSeq + 1, sequence - 1)
      return
    }

    // 正常处理
    this.processMessage(data)
    this.lastSequence.set(roomId, sequence)
    this.processBufferedMessages(roomId)
  }

  /**
   * 缓存乱序消息
   */
  private bufferMessage(roomId: number, message: any) {
    if (!this.messageBuffer.has(roomId)) {
      this.messageBuffer.set(roomId, [])
    }
    this.messageBuffer.get(roomId)!.push(message)
  }

  /**
   * 处理缓冲区消息
   */
  private processBufferedMessages(roomId: number) {
    const buffer = this.messageBuffer.get(roomId)
    if (!buffer || buffer.length === 0) return

    const lastSeq = this.lastSequence.get(roomId) || 0
    buffer.sort((a, b) => a.sequence - b.sequence)

    let processed = 0
    for (const msg of buffer) {
      if (msg.sequence === lastSeq + 1) {
        this.processMessage(msg)
        this.lastSequence.set(roomId, msg.sequence)
        processed++
      } else {
        break
      }
    }

    if (processed > 0) {
      buffer.splice(0, processed)
    }
  }

  /**
   * 请求缺失消息
   */
  private requestMissingMessages(roomId: number, startSeq: number, endSeq: number) {
    this.send('request_messages', {
      room_id: roomId,
      start_sequence: startSeq,
      end_sequence: endSeq
    })
  }

  /**
   * 处理消息
   */
  private processMessage(data: any) {
    this.emit('new_message', data)
  }

  /**
   * 拉取离线消息
   */
  private fetchOfflineMessages() {
    const roomSequences: Record<number, number> = {}
    this.lastSequence.forEach((seq, roomId) => {
      roomSequences[roomId] = seq
    })

    this.send('fetch_offline_messages', {
      room_sequences: roomSequences,
      timestamp: Date.now()
    })
  }

  /**
   * 重新加入房间
   */
  private rejoinConversationRooms() {
    this.conversationRooms.forEach((roomId) => {
      this.send('join_room', {
        room_id: roomId,
        room_type: 'conversation'
      })
    })
  }

  /**
   * 尝试重连
   */
  private tryReconnect() {
    if (this.isDestroyed) return

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      uni.showToast({ title: '连接已断开，请检查网络', icon: 'none' })
      return
    }

    if (this.reconnectTimer) return

    this.status = 'reconnecting'
    this.reconnectAttempts++

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null
      if (this.token && !this.isDestroyed) {
        this.connect(this.token)
      }
    }, this.reconnectInterval) as unknown as number
  }

  /**
   * 发送数据
   */
  private send(event: string, data: any) {
    if (this.socket && this.status === 'connected') {
      this.socket.emit(event, data)
    }
  }

  /**
   * 监听事件
   */
  on(event: string, handler: Function) {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set())
    }
    this.eventHandlers.get(event)!.add(handler)
  }

  /**
   * 移除监听
   */
  off(event: string, handler: Function) {
    const handlers = this.eventHandlers.get(event)
    if (handlers) {
      handlers.delete(handler)
    }
  }

  /**
   * 触发事件
   */
  private emit(event: string, data: any) {
    const handlers = this.eventHandlers.get(event)
    if (handlers) {
      handlers.forEach(handler => handler(data))
    }
  }

  /**
   * 销毁
   */
  destroy() {
    this.isDestroyed = true

    if (this.socket && this.status === 'connected') {
      this.socket.emit('user_logout', { timestamp: new Date().toISOString() })
    }

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }

    this.stopHeartbeat()

    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
    }

    this.status = 'disconnected'
    this.pendingMessages.clear()
    this.receivedMessageIds.clear()
    this.messageBuffer.clear()
    this.lastSequence.clear()
    this.conversationRooms.clear()
    this.eventHandlers.clear()
  }
}

// 导出单例
export const enhancedSocketManager = new EnhancedSocketManager()
```

---

## 五、总结

### 5.1 问题解决对照表

| 问题 | 前端解决方案 | 后端解决方案 | 责任划分 |
|------|------------|------------|---------|
| **黑洞期丢消息** | ✅ 消息确认机制<br>✅ 重试队列<br>✅ 乐观更新 | ✅ ACK 确认<br>✅ 消息持久化 | 前端主导 |
| **僵尸连接** | ✅ Ping/Pong 检测<br>✅ 超时断线<br>✅ 自动重连 | ✅ Pong 响应<br>✅ 超时清理<br>✅ 在线状态管理 | 前后端协同 |
| **消息乱序** | ✅ 序列号排序<br>✅ 消息缓冲<br>✅ 缺失消息请求 | ✅ 序列号生成<br>✅ 缺失消息补发 | 后端主导 |
| **离线消息** | ✅ 重连后拉取<br>✅ 增量同步 | ✅ 离线消息存储<br>✅ 消息推送 | 后端主导 |

### 5.2 实施建议

**阶段 1: 核心功能 (必须)**
1. ✅ 消息确认机制 (ACK)
2. ✅ Ping/Pong 心跳检测
3. ✅ 消息序列号

**阶段 2: 增强功能 (推荐)**
4. ✅ 消息重试机制
5. ✅ 离线消息拉取
6. ✅ 消息去重和排序

**阶段 3: 优化功能 (可选)**
7. ✅ 乐观更新
8. ✅ 消息缓冲
9. ✅ 性能监控

### 5.3 注意事项

1. **前后端协议一致性**: 确保事件名称、数据格式一致
2. **序列号连续性**: 后端必须保证序列号连续递增
3. **消息持久化**: 后端必须持久化所有消息
4. **性能优化**: 定期清理已接收消息 ID 集合
5. **错误处理**: 完善的错误提示和重试机制

---

**文档版本**: v1.0.0  
**更新日期**: 2025-01-20  
**作者**: Kiro AI Assistant
