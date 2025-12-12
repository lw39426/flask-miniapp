# 聊天系统模块

## 概述

基于 Flask + Socket.IO 实现的实时聊天系统前端模块，支持私聊、群聊、实时消息推送等功能。

## 文件结构

```
chat/
├── chat.vue          # 聊天列表主页（消息列表 + 联系人）
├── room.vue          # 聊天窗口页面
├── room-new.vue      # 新版聊天窗口（开发中）
├── config.ts         # 聊天系统配置文件
└── README.md         # 本文档
```

## 核心功能逻辑

### 1. 页面生命周期管理

#### chat.vue - 聊天列表页

**生命周期设计原理：**
- **`onMounted`** - 首次加载时执行（仅一次）
  - 请求微信小程序消息订阅权限
  
- **`onShow`** - 每次页面显示时执行（包括从其他页面返回）
  - 重新加载聊天室列表（刷新最新数据）
  - 初始化 WebSocket 连接和事件监听
  - **解决了登录后/切换页面返回时的数据同步问题**
  
- **`onHide`** - 页面隐藏时执行
  - 清理 WebSocket 事件监听器（避免重复监听）
  - **保持 WebSocket 连接**（后台继续接收消息）
  
- **`onUnmounted`** - 页面卸载时执行
  - 完全清理 WebSocket 监听
  - 可选：完全断开 WebSocket 连接

**为什么这样设计？**
- 使用 `onShow` 确保从其他页面返回时数据是最新的
- 隐藏时保持连接，确保实时接收消息通知
- 避免重复监听导致的多次触发问题

### 2. WebSocket 实时通信

#### SocketIOManager 核心功能

**连接管理：**
- 自动连接/断开
- 智能重连机制（最多 5 次，间隔 3 秒）
- 离线消息队列（断线期间的消息自动重发）
- 心跳保活（每 30 秒）

**事件系统：**
```typescript
// 监听新消息
socketManager.on(SocketEvent.NEW_MESSAGE, handleNewMessage)

// 监听房间更新
socketManager.on(SocketEvent.ROOM_UPDATED, handleRoomUpdated)

// 监听用户在线状态
socketManager.on(SocketEvent.USER_ONLINE, handleUserOnline)
```

**支持的事件：**
- `NEW_MESSAGE` - 新消息到达
- `MESSAGE_READ` - 消息已读
- `MESSAGE_DELETED` - 消息被删除
- `ROOM_UPDATED` - 房间信息更新
- `USER_JOINED` - 用户加入
- `USER_LEFT` - 用户离开
- `TYPING_START/STOP` - 输入状态
- `USER_ONLINE/OFFLINE` - 在线状态

**实时消息处理逻辑：**
```typescript
function handleNewMessage(data: any) {
  const { room_id, message } = data
  const room = rooms.value.find(r => r.id === room_id)
  
  if (room) {
    // 更新最后一条消息
    room.last_message = message
    room.updated_at = message.created_at
    
    // 非自己发送的消息增加未读数
    if (!message.is_own) {
      room.unread_count = (room.unread_count || 0) + 1
    }
    
    // 按最新消息时间排序
    rooms.value.sort((a, b) => 
      new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    )
  } else {
    // 新房间，重新加载列表
    loadRooms(true)
  }
}
```

### 3. 聊天室列表管理

#### 数据加载策略

**下拉刷新：**
- 重置页码为 1
- 清空现有列表
- 加载最新数据

**上拉加载更多：**
- 检查是否有下一页（`pagination.has_next`）
- 页码递增
- 追加新数据到现有列表

**搜索过滤：**
```typescript
const filteredRooms = computed(() => {
  if (!searchText.value) return rooms.value
  
  const keyword = searchText.value.toLowerCase()
  return rooms.value.filter(room => {
    // 搜索房间名称
    const matchName = room.name?.toLowerCase().includes(keyword)
    // 搜索最后一条消息内容
    const matchMessage = room.last_message?.content.toLowerCase().includes(keyword)
    // 搜索参与者昵称
    const matchParticipant = room.participants?.some(p =>
      p.nickname?.toLowerCase().includes(keyword)
    )
    return matchName || matchMessage || matchParticipant
  })
})
```

#### 房间显示逻辑

**私聊（private）：**
- 显示对方的昵称和头像
- 从参与者列表中排除当前用户
- 显示对方的在线状态（待实现）

**群聊（group）：**
- 显示群名称和群头像
- 显示参与者数量
- 支持 @ 功能（待实现）

**未读数统计：**
```typescript
const totalUnread = computed(() => {
  return rooms.value.reduce((sum, room) => 
    sum + (room.unread_count || 0), 0
  )
})
```

### 4. 侧滑操作详解

#### 三种操作模式

**1. 标记已读（绿色）**
```typescript
await markRoomAsRead(room.id)
room.unread_count = 0
```
- 清除未读数
- 更新 `last_read_at` 时间戳
- 不影响房间列表显示

**2. 隐藏会话（橙色）**
```typescript
const response = await hideRoom(room.id)
if (response.data?.room_deleted) {
  // 所有参与者都隐藏，房间已删除
} else {
  // 仅当前用户隐藏
}
```
- 软删除机制
- 从列表中移除但不删除数据
- 可在设置中恢复
- **特殊逻辑**：当所有参与者都隐藏时，房间自动删除

**3. 删除会话（红色）**
```typescript
await deleteRoom(room.id, false) // 普通删除
await deleteRoom(room.id, true)  // 强制删除（仅超管）
```
- 清空所有聊天记录
- 无法恢复
- 需要二次确认
- 超级管理员可强制硬删除

### 5. 智能时间格式化

```typescript
const formatTime = (timestamp: string) => {
  const diff = Date.now() - new Date(timestamp).getTime()
  
  if (diff < 1分钟)  return '刚刚'
  if (diff < 1小时)  return 'X分钟前'
  if (diff < 1天)    return 'X小时前'
  if (diff < 7天)    return 'X天前'
  else              return '月/日'
}
```

### 6. 权限与会话恢复

#### 私聊自动恢复机制

当创建私聊时：
```typescript
const response = await createChatRoom({
  type: 'private',
  participants: [{ user_id: targetUserId, user_type: 'NormalUser' }]
})

if (response.data?.was_hidden) {
  // 检测到之前隐藏的会话，自动恢复
  uni.showToast({ title: '会话已恢复', icon: 'success' })
}
```

#### 权限控制

- 添加参与者：仅群聊支持
- 删除房间：需要是参与者
- 强制删除：仅超级管理员
- 清空消息：参与者可操作

### 7. 联系人管理（待完善）

**当前状态：**
- 使用模拟数据
- 按拼音首字母分组
- 支持索引快速跳转

**待对接：**
- 好友系统 API
- 新的朋友申请
- 群聊列表
- 黑名单管理

---

## room.vue - 聊天窗口（待完善）

### 已实现功能

**UI 组件：**
- ✅ 消息气泡（文本/图片/语音）
- ✅ 表情面板（32 个常用表情）
- ✅ 更多功能面板（相册/拍摄/位置/文件）
- ✅ 语音输入切换
- ✅ 智能时间分割线
- ✅ 消息历史滚动加载

**消息类型：**
- ✅ 文本消息
- ✅ 图片消息（支持预览）
- 🚧 语音消息（UI 已完成，功能待实现）
- 📌 文件消息（待实现）
- 📌 位置消息（待实现）

### 待实现功能

- [ ] 对接后端消息 API
- [ ] WebSocket 实时消息接收
- [ ] 消息发送状态（发送中/已发送/失败）
- [ ] 消息已读回执
- [ ] 输入状态提示（正在输入...）
- [ ] 消息撤回（2分钟内）
- [ ] 消息转发
- [ ] 长按消息菜单（复制/删除/引用）
- [ ] 图片视频发送
- [ ] 语音录制和播放
- [ ] 文件上传下载
- [ ] 位置分享

---

## API 接口文档

所有聊天相关的 API 都封装在 `@/api/chat.ts` 中：

### 核心接口

#### 1. 创建聊天室
```typescript
createChatRoom(data: CreateRoomRequest)
```
**参数：**
```typescript
{
  type: 'private' | 'group',  // 房间类型
  name?: string,              // 群名（仅群聊需要）
  participants: Array<{       // 参与者列表
    user_id: number,
    user_type: 'NormalUser' | 'AdminUser'
  }>
}
```
**返回：**
```typescript
{
  room_id: number,      // 房间 ID
  was_hidden: boolean,  // 是否恢复的隐藏会话
  is_new: boolean       // 是否新创建
}
```

#### 2. 获取聊天室列表
```typescript
getChatRooms(params?: {
  page?: number,           // 页码，默认 1
  per_page?: number,       // 每页数量，默认 20，最大 20
  include_hidden?: boolean // 是否包含隐藏会话，默认 false
})
```
**返回：**
```typescript
{
  rooms: ChatRoom[],
  pagination: {
    page: number,
    per_page: number,
    total: number,
    has_next: boolean
  }
}
```

#### 3. 发送消息
```typescript
sendMessage(roomId: number, data: {
  content: string,               // 消息内容
  type: 'text' | 'image' | 'file' // 消息类型
})
```

#### 4. 获取消息历史
```typescript
getMessages(roomId: number, params?: {
  page?: number,      // 页码，默认 1
  per_page?: number   // 每页数量，默认 50，最大 100
})
```

#### 5. 会话管理
```typescript
markRoomAsRead(roomId)     // 标记已读
hideRoom(roomId)           // 隐藏会话
restoreRoom(roomId)        // 恢复会话
deleteRoom(roomId, force)  // 删除会话
clearRoomMessages(roomId)  // 清空消息
leaveRoom(roomId)          // 退出房间
```

#### 6. 参与者管理
```typescript
getRoomParticipants(roomId)              // 获取参与者
addRoomParticipants(roomId, participants) // 添加参与者（仅群聊）
```

---

## 数据类型定义

所有类型定义在 `@/api/types/chat.ts`：

### 核心类型

#### ChatRoom - 聊天室
```typescript
interface ChatRoom {
  id: number
  type: 'private' | 'group'       // 私聊/群聊
  name?: string                    // 房间名称（群聊必填）
  created_at: string
  updated_at: string
  participants: Participant[]      // 参与者列表
  participant_count: number        // 参与者数量
  unread_count: number            // 未读消息数
  last_message?: ChatMessage      // 最后一条消息
  is_hidden?: boolean             // 是否被当前用户隐藏
}
```

#### ChatMessage - 消息
```typescript
interface ChatMessage {
  id: number
  room_id: number
  content: string                           // 消息内容
  message_type: 'text' | 'image' | 'file'  // 消息类型
  created_at: string
  sender: Sender                            // 发送者信息
  is_own?: boolean                          // 是否是自己发送的
  is_read?: boolean                         // 是否已读
}
```

#### Participant - 参与者
```typescript
interface Participant {
  id: number
  user_id: number
  user_type: 'NormalUser' | 'AdminUser'
  nickname?: string
  avatar?: string
  joined_at?: string
  last_read_at?: string  // 最后已读时间
  is_hidden?: boolean    // 是否隐藏该会话
}
```

#### Sender - 发送者
```typescript
interface Sender {
  id: number
  type: 'NormalUser' | 'AdminUser'
  nickname: string
  avatar?: string
}
```

---

## 配置文件说明

### config.ts 配置项

#### 消息模板 ID
```typescript
export const MESSAGE_TEMPLATE_IDS = {
  SERVICE_REPLY: 'YOUR_TEMPLATE_ID_HERE',  // 客服回复通知
  NEW_MESSAGE: 'YOUR_TEMPLATE_ID_HERE',    // 新消息通知
  GROUP_MENTION: 'YOUR_TEMPLATE_ID_HERE'   // 群聊 @ 提醒
}
```
> ⚠️ 需要在微信小程序后台配置对应的消息模板

#### 分页配置
```typescript
export const PAGINATION = {
  ROOMS_PER_PAGE: 20,        // 聊天室列表每页数量
  MESSAGES_PER_PAGE: 50,     // 消息列表每页数量
  MAX_ROOMS_PER_PAGE: 20,    // 聊天室列表最大每页数量
  MAX_MESSAGES_PER_PAGE: 100 // 消息列表最大每页数量
}
```

#### WebSocket 配置
```typescript
export const WEBSOCKET_CONFIG = {
  URL: 'wss://your-domain.com/socket.io',
  RECONNECT_INTERVAL: 3000,   // 重连间隔（毫秒）
  MAX_RECONNECT_ATTEMPTS: 5   // 最大重连次数
}
```

#### 功能开关
```typescript
export const FEATURE_FLAGS = {
  ENABLE_VOICE_MESSAGE: false,   // 语音消息
  ENABLE_VIDEO_MESSAGE: false,   // 视频消息
  ENABLE_MESSAGE_RECALL: false,  // 消息撤回
  ENABLE_MESSAGE_FORWARD: false, // 消息转发
  ENABLE_GROUP_AT: false,        // 群聊 @ 功能
  ENABLE_READ_RECEIPT: false     // 已读回执
}
```

---

## 使用示例

### 1. 创建私聊

```typescript
import { createChatRoom } from '@/api/chat'

const createPrivateChat = async (targetUserId: number) => {
  try {
    const response = await createChatRoom({
      type: 'private',
      participants: [
        { user_id: targetUserId, user_type: 'NormalUser' }
      ]
    })
    
    if (response.code === 200) {
      const { room_id, was_hidden } = response.data
      
      if (was_hidden) {
        uni.showToast({ title: '会话已恢复', icon: 'success' })
      }
      
      // 跳转到聊天窗口
      uni.navigateTo({ 
        url: `/pages/chat/room?id=${room_id}` 
      })
    }
  } catch (error) {
    console.error('创建私聊失败:', error)
  }
}
```

### 2. 创建群聊

```typescript
const createGroupChat = async (name: string, memberIds: number[]) => {
  const response = await createChatRoom({
    type: 'group',
    name: name,
    participants: memberIds.map(id => ({
      user_id: id,
      user_type: 'NormalUser'
    }))
  })
  
  if (response.code === 200) {
    uni.navigateTo({ 
      url: `/pages/chat/room?id=${response.data.room_id}` 
    })
  }
}
```

### 3. 发送消息

```typescript
import { sendMessage } from '@/api/chat'

const send = async (roomId: number, content: string) => {
  try {
    const response = await sendMessage(roomId, {
      content,
      type: 'text'
    })
    
    if (response.code === 200) {
      const message = response.data
      // 添加到消息列表...
    }
  } catch (error) {
    uni.showToast({ title: '发送失败', icon: 'none' })
  }
}
```

### 4. 监听 WebSocket 消息

```typescript
import { socketManager, SocketEvent } from '@/utils/socket'

// 监听新消息
socketManager.on(SocketEvent.NEW_MESSAGE, (data) => {
  console.log('收到新消息:', data)
  const { room_id, message } = data
  // 更新 UI...
})

// 监听用户输入状态
socketManager.on(SocketEvent.TYPING_START, (data) => {
  console.log('用户正在输入:', data)
  // 显示 "正在输入..." 提示
})

// 发送输入状态
socketManager.sendTyping(roomId, true)  // 开始输入
socketManager.sendTyping(roomId, false) // 停止输入
```

### 5. 房间操作

```typescript
import { 
  markRoomAsRead, 
  hideRoom, 
  deleteRoom 
} from '@/api/chat'

// 标记已读
await markRoomAsRead(roomId)

// 隐藏会话
const hideRes = await hideRoom(roomId)
if (hideRes.data?.room_deleted) {
  console.log('所有人都隐藏，房间已删除')
}

// 删除会话
uni.showModal({
  title: '确认删除',
  content: '删除后将清空所有聊天记录，且无法恢复',
  success: async (res) => {
    if (res.confirm) {
      await deleteRoom(roomId, false)
    }
  }
})
```

---

## 技术架构

### 前端技术栈
- **框架**: Vue 3 + TypeScript
- **UI 组件**: Sard-uniapp
- **HTTP 请求**: uni.request 封装
- **实时通信**: WebSocket (Socket.IO)
- **状态管理**: Composition API + Pinia (token)
- **平台**: uni-app (微信小程序)

### 后端技术栈
- **框架**: Flask + Flask-SocketIO
- **数据库**: PostgreSQL / MySQL
- **认证**: JWT
- **实时通信**: Socket.IO

### 数据流架构

```
┌─────────────┐
│  chat.vue   │ 聊天列表页
└──────┬──────┘
       │
       ├─ onShow → loadRooms() ────────┐
       │                                │
       ├─ onShow → initWebSocket() ────┤
       │                                │
       └─ 侧滑操作 → API 调用 ────────┤
                                        ↓
                                 ┌──────────┐
                                 │ API Layer│
                                 └─────┬────┘
                                       │
                    ┌──────────────────┼──────────────────┐
                    ↓                  ↓                   ↓
            ┌───────────────┐  ┌──────────────┐  ┌───────────────┐
            │   HTTP API    │  │  WebSocket   │  │  Socket.IO    │
            │  /chat-system │  │   Manager    │  │   Backend     │
            └───────────────┘  └──────────────┘  └───────────────┘
                    │                  │                   │
                    └──────────────────┴───────────────────┘
                                       │
                                 ┌─────┴─────┐
                                 │  Database │
                                 └───────────┘
```

---

---

## 待办事项与开发计划

### 🔥 高优先级（P0 - 核心功能）

#### 1. 完善 room.vue 聊天窗口 - 对接后端消息 API

**任务描述**：实现完整的消息收发功能，对接后端 REST API

**实现步骤**：

1. **加载历史消息**
```typescript
// room.vue 中实现
const loadMessages = async (isLoadMore = false) => {
  try {
    if (isLoadMore) {
      pagination.value.page++
    } else {
      pagination.value.page = 1
      messages.value = []
    }
    
    const response = await getMessages(roomId, {
      page: pagination.value.page,
      per_page: PAGINATION.MESSAGES_PER_PAGE
    })
    
    if (response.code === 200) {
      const newMessages = response.data.messages
      
      // 加载更多时追加到顶部
      if (isLoadMore) {
        messages.value = [...newMessages, ...messages.value]
      } else {
        messages.value = newMessages
        // 滚动到底部
        nextTick(() => scrollToBottom())
      }
      
      pagination.value = response.data.pagination
    }
  } catch (error) {
    console.error('[Room] 加载消息失败:', error)
    uni.showToast({ title: '加载失败', icon: 'none' })
  }
}

// 页面加载时调用
onShow(() => {
  loadMessages()
})
```

2. **发送文本消息**
```typescript
const sendTextMessage = async (content: string) => {
  if (!content.trim()) return
  
  // 创建临时消息对象（立即显示在 UI）注意：聊天记录的时间竞态问题本地消息时间未同步服务器响应时间，导致消息记录的排序错乱问题
  const tempMessage = {
    id: Date.now(), // 临时 ID
    content,
    message_type: 'text',
    created_at: new Date().toISOString(),
    sender: {
      id: currentUser.value.id,
      type: currentUser.value.type,
      nickname: currentUser.value.nickname,
      avatar: currentUser.value.avatar
    },
    is_own: true,
    status: 'sending' // 发送中状态
  }
  
  messages.value.push(tempMessage)
  inputText.value = ''
  scrollToBottom()
  
  try {
    const response = await sendMessage(roomId, {
      content,
      type: 'text'
    })
    
    if (response.code === 200) {
      // 替换临时消息为服务器返回的消息
      const index = messages.value.findIndex(m => m.id === tempMessage.id)
      if (index !== -1) {
        messages.value[index] = {
          ...response.data,
          status: 'sent'
        }
      }
    }
  } catch (error) {
    // 标记为发送失败
    const index = messages.value.findIndex(m => m.id === tempMessage.id)
    if (index !== -1) {
      messages.value[index].status = 'failed'
    }
    uni.showToast({ title: '发送失败', icon: 'none' })
  }
}
```

3. **支持不同消息类型**
```typescript
// 发送图片
const sendImageMessage = async (imagePath: string) => {
  // 先上传图片到服务器
  const uploadRes = await uploadImage(imagePath)
  
  // 发送图片消息
  await sendMessage(roomId, {
    content: uploadRes.url,
    type: 'image'
  })
}

// 发送文件
const sendFileMessage = async (filePath: string) => {
  const uploadRes = await uploadFile(filePath)
  
  await sendMessage(roomId, {
    content: JSON.stringify({
      url: uploadRes.url,
      name: uploadRes.name,
      size: uploadRes.size
    }),
    type: 'file'
  })
}
```

4. **滚动加载更多**
```typescript
const onScrollToUpper = () => {
  if (loading.value || !pagination.value.has_next) return
  
  // 记录当前滚动位置
  const oldScrollTop = scrollTop.value
  const oldScrollHeight = scrollHeight.value
  
  loadMessages(true).then(() => {
    // 保持滚动位置
    nextTick(() => {
      const newScrollHeight = scrollHeight.value
      scrollTop.value = oldScrollTop + (newScrollHeight - oldScrollHeight)
    })
  })
}
```

**预估工时**: 2-3 天

---

#### 2. WebSocket 实时消息接收

**任务描述**：集成 WebSocket，实现消息实时推送和显示

**实现步骤**：

1. **在 room.vue 中注册消息监听**
```typescript
// 消息处理函数
const handleRoomMessage = (data: any) => {
  const { room_id, id, content, message_type, created_at, sender, is_own } = data
  
  // 只处理当前房间的消息
  if (room_id !== currentRoomId.value) return
  
  // 构造消息对象
  const newMessage = {
    id,
    content,
    message_type,
    created_at,
    sender,
    is_own,
    status: 'sent'
  }
  
  // 添加到消息列表
  messages.value.push(newMessage)
  
  // 滚动到底部
  nextTick(() => {
    scrollToBottom()
  })
  
  // 播放提示音（非自己发送的消息）
  if (!is_own) {
    playMessageSound()
  }
  
  // 标记已读
  if (!is_own) {
    markRoomAsRead(room_id)
  }
}

// 初始化 WebSocket 监听
const initRoomWebSocket = () => {
  socketManager.on(SocketEvent.NEW_MESSAGE, handleRoomMessage)
  
  // 加入房间（确保能收到该房间的消息）
  socketManager.joinRoom(currentRoomId.value)
}

// 页面显示时初始化
onShow(() => {
  loadMessages()
  initRoomWebSocket()
})

// 页面隐藏时清理监听
onHide(() => {
  socketManager.off(SocketEvent.NEW_MESSAGE, handleRoomMessage)
})
```

2. **区分自己和他人的消息**
```vue
<template>
  <view 
    v-for="message in messages" 
    :key="message.id"
    :class="['message-item', message.is_own ? 'own' : 'other']"
  >
    <!-- 他人消息显示头像在左边 -->
    <image v-if="!message.is_own" :src="message.sender.avatar" class="avatar" />
    
    <view class="message-bubble">
      <text>{{ message.content }}</text>
    </view>
    
    <!-- 自己的消息显示头像在右边 -->
    <image v-if="message.is_own" :src="message.sender.avatar" class="avatar" />
  </view>
</template>
```

3. **消息提示音**
```typescript
const playMessageSound = () => {
  // #ifdef MP-WEIXIN
  const innerAudioContext = uni.createInnerAudioContext()
  innerAudioContext.src = '/static/audio/message.mp3'
  innerAudioContext.play()
  // #endif
}
```

4. **自动滚动到底部**
```typescript
const scrollToBottom = () => {
  nextTick(() => {
    const query = uni.createSelectorQuery()
    query.select('.message-list').boundingClientRect()
    query.selectViewport().scrollOffset()
    query.exec((res) => {
      if (res[0]) {
        scrollTop.value = res[0].height
      }
    })
  })
}
```

**预估工时**: 1-2 天

---

#### 3. 消息发送状态管理

**任务描述**：显示消息发送状态（发送中/已发送/失败），支持失败重发

**实现步骤**：

1. **扩展消息数据结构**
```typescript
interface Message extends ChatMessage {
  status: 'sending' | 'sent' | 'failed' // 发送状态
  localId?: number                      // 本地临时 ID
  timestamp?: number                    // 发送时间戳
}
```

2. **显示发送状态图标**
```vue
<template>
  <view class="message-status">
    <!-- 发送中 - 加载动画 -->
    <sar-loading v-if="message.status === 'sending'" size="small" />
    
    <!-- 已发送 - 对勾 -->
    <sar-icon 
      v-else-if="message.status === 'sent'" 
      name="check" 
      size="16" 
      color="#999" 
    />
    
    <!-- 发送失败 - 感叹号（可点击重发） -->
    <sar-icon 
      v-else-if="message.status === 'failed'"
      name="warning"
      size="16"
      color="#ff4d4f"
      @click="resendMessage(message)"
    />
  </view>
</template>
```

3. **重发失败消息**
```typescript
const resendMessage = async (message: Message) => {
  uni.showModal({
    title: '重新发送',
    content: '确定要重新发送这条消息吗？',
    success: async (res) => {
      if (res.confirm) {
        // 更新状态为发送中
        message.status = 'sending'
        
        try {
          const response = await sendMessage(roomId, {
            content: message.content,
            type: message.message_type
          })
          
          if (response.code === 200) {
            // 替换为服务器返回的消息
            const index = messages.value.findIndex(m => m.localId === message.localId)
            if (index !== -1) {
              messages.value[index] = {
                ...response.data,
                status: 'sent'
              }
            }
          }
        } catch (error) {
          message.status = 'failed'
          uni.showToast({ title: '发送失败', icon: 'none' })
        }
      }
    }
  })
}
```

4. **发送超时检测**
```typescript
const sendWithTimeout = async (message: Message) => {
  const TIMEOUT = 30000 // 30秒超时
  
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error('发送超时')), TIMEOUT)
  })
  
  try {
    const response = await Promise.race([
      sendMessage(roomId, {
        content: message.content,
        type: message.message_type
      }),
      timeoutPromise
    ])
    
    // 处理成功响应...
  } catch (error) {
    message.status = 'failed'
    if (error.message === '发送超时') {
      uni.showToast({ title: '发送超时，请重试', icon: 'none' })
    }
  }
}
```

**预估工时**: 1 天

---

### 🔄 中优先级（P1 - 增强功能）

#### 4. 消息已读回执

**任务描述**：显示消息已读/未读状态，支持已读回执

**实现步骤**：

1. **进入房间时标记已读**
```typescript
onShow(() => {
  loadMessages()
  initRoomWebSocket()
  
  // 标记当前房间为已读
  markRoomAsRead(currentRoomId.value)
})
```

2. **监听已读回执事件**
```typescript
const handleMessageRead = (data: any) => {
  const { room_id, user_id, last_read_message_id } = data
  
  if (room_id !== currentRoomId.value) return
  
  // 更新消息已读状态
  messages.value.forEach((msg) => {
    if (msg.id <= last_read_message_id && msg.is_own) {
      msg.is_read = true
    }
  })
}

socketManager.on(SocketEvent.MESSAGE_READ, handleMessageRead)
```

3. **显示已读状态**
```vue
<template>
  <view class="message-status">
    <!-- 已读 - 双对勾（蓝色） -->
    <sar-icon 
      v-if="message.is_read" 
      name="check-double" 
      size="16" 
      color="#1890ff" 
    />
    
    <!-- 已发送未读 - 单对勾（灰色） -->
    <sar-icon 
      v-else-if="message.status === 'sent'" 
      name="check" 
      size="16" 
      color="#999" 
    />
  </view>
</template>
```

4. **统计未读消息数**
```typescript
const unreadCount = computed(() => {
  return messages.value.filter(m => !m.is_own && !m.is_read).length
})
```

**预估工时**: 1 天

---

#### 5. 输入状态提示（正在输入...）

**任务描述**：显示对方正在输入的提示

**实现步骤**：

1. **检测用户输入并发送状态**
```typescript
import { debounce } from 'lodash-es'

const inputText = ref('')
const isTyping = ref(false)

// 防抖发送输入状态
const sendTypingStatus = debounce((typing: boolean) => {
  socketManager.sendTyping(currentRoomId.value, typing)
  isTyping.value = typing
}, 500)

// 监听输入框变化
watch(inputText, (newVal, oldVal) => {
  if (newVal && !oldVal) {
    // 开始输入
    sendTypingStatus(true)
  } else if (!newVal && oldVal) {
    // 停止输入
    sendTypingStatus(false)
  }
})

// 发送消息时停止输入状态
const sendTextMessage = async (content: string) => {
  sendTypingStatus(false)
  // ...发送逻辑
}
```

2. **监听对方输入状态**
```typescript
const typingUsers = ref<Set<number>>(new Set())

const handleTypingStart = (data: any) => {
  const { room_id, user_id } = data
  
  if (room_id !== currentRoomId.value) return
  if (user_id === currentUser.value.id) return // 排除自己
  
  typingUsers.value.add(user_id)
  
  // 10秒后自动清除
  setTimeout(() => {
    typingUsers.value.delete(user_id)
  }, 10000)
}

const handleTypingStop = (data: any) => {
  const { room_id, user_id } = data
  
  if (room_id !== currentRoomId.value) return
  
  typingUsers.value.delete(user_id)
}

socketManager.on(SocketEvent.TYPING_START, handleTypingStart)
socketManager.on(SocketEvent.TYPING_STOP, handleTypingStop)
```

3. **显示输入提示**
```vue
<template>
  <view v-if="typingUsers.size > 0" class="typing-indicator">
    <text>{{ getTypingText() }}</text>
    <view class="typing-dots">
      <span>.</span><span>.</span><span>.</span>
    </view>
  </view>
</template>

<script setup>
const getTypingText = () => {
  if (typingUsers.value.size === 1) {
    return '对方正在输入'
  } else {
    return `${typingUsers.value.size} 人正在输入`
  }
}
</script>

<style lang="scss">
.typing-indicator {
  display: flex;
  align-items: center;
  padding: 8rpx 32rpx;
  color: #999;
  font-size: 24rpx;
}

.typing-dots {
  margin-left: 8rpx;
  
  span {
    animation: typing 1.4s infinite;
    
    &:nth-child(2) {
      animation-delay: 0.2s;
    }
    
    &:nth-child(3) {
      animation-delay: 0.4s;
    }
  }
}

@keyframes typing {
  0%, 60%, 100% {
    opacity: 0;
  }
  30% {
    opacity: 1;
  }
}
</style>
```

**预估工时**: 1 天

---

#### 6. 优化消息列表 UI 和交互

**任务描述**：改进消息显示，添加长按菜单、时间分割线等

**实现步骤**：

1. **长按消息显示操作菜单**
```typescript
const handleLongPress = (message: Message) => {
  const items = []
  
  // 文本消息可复制
  if (message.message_type === 'text') {
    items.push('复制')
  }
  
  // 自己的消息可删除、可撤回（2分钟内）
  if (message.is_own) {
    items.push('删除')
    
    const elapsed = Date.now() - new Date(message.created_at).getTime()
    if (elapsed < 2 * 60 * 1000) {
      items.push('撤回')
    }
  }
  
  // 可转发
  items.push('转发')
  
  uni.showActionSheet({
    itemList: items,
    success: (res) => {
      const action = items[res.tapIndex]
      
      switch (action) {
        case '复制':
          uni.setClipboardData({ data: message.content })
          break
        case '删除':
          deleteMessage(message)
          break
        case '撤回':
          recallMessage(message)
          break
        case '转发':
          forwardMessage(message)
          break
      }
    }
  })
}
```

2. **时间分割线（智能显示）**
```typescript
const shouldShowTimeDivider = (currentMsg: Message, prevMsg?: Message) => {
  if (!prevMsg) return true
  
  const currentTime = new Date(currentMsg.created_at).getTime()
  const prevTime = new Date(prevMsg.created_at).getTime()
  
  // 相隔超过 1 分钟显示时间
  return (currentTime - prevTime) > 1 * 60 * 1000
}
```

```vue
<template>
  <view v-for="(message, index) in messages" :key="message.id">
    <!-- 时间分割线 -->
    <view 
      v-if="shouldShowTimeDivider(message, messages[index - 1])" 
      class="time-divider"
    >
      <text>{{ formatMessageTime(message.created_at) }}</text>
    </view>
    
    <!-- 消息内容 -->
    <view 
      class="message-item"
      @longpress="handleLongPress(message)"
    >
      <!-- ... -->
    </view>
  </view>
</template>
```

3. **图片消息预览**
```typescript
const previewImage = (imageUrl: string) => {
  // 收集所有图片消息的 URL
  const imageUrls = messages.value
    .filter(m => m.message_type === 'image')
    .map(m => m.content)
  
  uni.previewImage({
    current: imageUrl,
    urls: imageUrls
  })
}
```

4. **文件消息下载**
```typescript
const downloadFile = async (fileUrl: string, fileName: string) => {
  uni.showLoading({ title: '下载中...' })
  
  try {
    const res = await uni.downloadFile({
      url: fileUrl
    })
    
    if (res.statusCode === 200) {
      uni.saveFile({
        tempFilePath: res.tempFilePath,
        success: () => {
          uni.hideLoading()
          uni.showToast({ title: '保存成功', icon: 'success' })
        }
      })
    }
  } catch (error) {
    uni.hideLoading()
    uni.showToast({ title: '下载失败', icon: 'none' })
  }
}
```

**预估工时**: 2-3 天

---

### 📌 低优先级（P2 - 高级功能-暂时不开发）

#### 7. 消息撤回（2分钟内）
- 检测消息发送时间，2分钟内显示撤回选项
- 调用撤回 API，WebSocket 通知其他用户
- 显示"你撤回了一条消息"/"对方撤回了一条消息"

#### 8. 消息转发
- 选择转发目标（好友/群聊）
- 支持批量选择消息
- 显示转发来源

#### 9. 群聊 @ 功能
- 输入 @ 符号显示成员列表
- 点击成员插入 @mention
- 被 @ 的用户收到特殊通知

#### 10. 语音录制和播放
- 长按录音，松开发送
- 显示录音时长和波形动画
- 点击播放语音消息

---

## 技术要点总结

### 1. 响应式更新最佳实践
```typescript
// ✅ 正确：创建新数组触发响应式
messages.value = [...messages.value, newMessage]

// ✅ 正确：使用索引替换整个对象
messages.value[index] = { ...oldMessage, status: 'sent' }

// ❌ 错误：直接修改属性不会触发更新
messages.value[index].status = 'sent'
```

### 2. WebSocket 消息去重
```typescript
const messageIds = new Set()

const handleNewMessage = (data: any) => {
  if (messageIds.has(data.id)) {
    console.log('[Room] 重复消息，已忽略')
    return
  }
  
  messageIds.add(data.id)
  
  // 处理消息...
}
```

### 3. 滚动性能优化
```typescript
// 使用虚拟列表处理大量消息
import { VirtualList } from '@/components/VirtualList'

// 分批渲染消息
const visibleMessages = computed(() => {
  const start = Math.max(0, messages.value.length - 50)
  return messages.value.slice(start)
})
```

### 4. 图片压缩上传
```typescript
const compressImage = async (imagePath: string) => {
  return new Promise((resolve) => {
    uni.compressImage({
      src: imagePath,
      quality: 80, // 压缩质量
      success: (res) => {
        resolve(res.tempFilePath)
      }
    })
  })
}
```

---

## 待办事项与开发计划

### 🔥 高优先级（P0）
- [ ] 完善 room.vue 聊天窗口功能
  - [ ] 对接消息发送/接收 API
  - [ ] 集成 WebSocket 实时推送
  - [ ] 实现消息状态显示（发送中/已发送/失败）
  - [ ] 消息历史分页加载
  - [ ] 图片上传和预览

### 中优先级（P1）
- [ ] 实现消息已读回执
- [ ] 添加输入状态提示（正在输入...）
- [ ] 实现语音录制和播放
- [ ] 文件上传下载功能
- [ ] 消息搜索功能
- [ ] 联系人系统对接

### 低优先级（P2）
- [ ] 消息撤回功能（2分钟内）
- [ ] 消息转发
- [ ] 群聊 @ 功能
- [ ] 位置分享
- [ ] 视频消息
- [ ] 消息引用回复
- [ ] 长按消息菜单（复制/删除/转发）
- [ ] 会话置顶
- [ ] 消息免打扰设置

### 优化项
- [ ] 离线消息推送集成
- [ ] 图片压缩上传
- [ ] 消息本地缓存
- [ ] 网络异常重连优化
- [ ] 性能优化（大量消息渲染）

---

## 注意事项

### 1. 认证与权限
- 所有 API 接口都需要 JWT 认证
- Token 会自动由 HTTP 拦截器添加到请求头
- WebSocket 连接时需要在 URL 中传递 token

### 2. 微信小程序限制
- 需要在小程序后台配置服务器域名（wss:// 和 https://）
- 消息订阅需要配置消息模板 ID
- WebSocket 连接数有限制（通常为 5 个）

### 3. 数据同步策略
- **onShow 时刷新**: 确保从其他页面返回时数据最新
- **WebSocket 实时更新**: 后台接收消息并更新 UI
- **离线消息队列**: 断线期间的操作会在重连后自动发送

### 4. 性能优化建议
- 消息列表使用虚拟滚动（大量消息时）
- 图片使用懒加载
- 合理设置分页大小
- 避免频繁的全量刷新

### 5. 错误处理
- 网络错误自动重试
- WebSocket 断线自动重连（最多 5 次）
- 消息发送失败提示用户
- 离线状态提示

### 6. 安全注意
- 不要在前端存储敏感信息
- 图片上传前进行格式和大小验证
- 防止 XSS 攻击（消息内容转义）
- 限制消息发送频率（防止刷屏）

---

## 常见问题（FAQ）

### Q: 为什么从其他页面返回聊天列表时数据没更新？
**A:** 这是生命周期设计的问题。现在已经改用 `onShow` 钩子，每次页面显示都会重新加载数据。

### Q: WebSocket 断线后会自动重连吗？
**A:** 会的。`SocketIOManager` 实现了智能重连机制，最多重试 5 次，每次间隔 3 秒。

### Q: 隐藏会话和删除会话有什么区别？
**A:** 
- **隐藏**: 软删除，数据保留，可恢复，当所有人都隐藏时房间自动删除
- **删除**: 清空聊天记录，无法恢复，需要二次确认

### Q: 私聊和群聊的创建逻辑有何不同？
**A:** 
- **私聊**: 如果已存在且被隐藏，会自动恢复而不是创建新的
- **群聊**: 必须提供群名，支持添加多个参与者

### Q: 如何实现消息已读未读功能？
**A:** 
1. 后端记录每个参与者的 `last_read_at` 时间
2. 前端调用 `markRoomAsRead` 更新已读时间
3. WebSocket 推送 `MESSAGE_READ` 事件通知其他人

### Q: 离线消息如何处理？
**A:** 
- 消息发送失败时加入离线队列
- WebSocket 重连成功后自动重发
- 用户下次登录时通过 API 获取历史消息

---

## 相关文档

- [后端 API 文档](需要补充链接)
- [WebSocket 协议文档](需要补充链接)
- [Sard-uniapp 组件库](https://sard.wzt.zone/sard-uniapp-docs/components)
- [Socket.IO 客户端文档](https://socket.io/docs/v4/client-api/)
- [uni-app 官方文档](https://uniapp.dcloud.net.cn/)

---

## 更新日志

### 2025-11-12
- ✅ 修复页面生命周期问题，使用 `onShow`/`onHide` 替代 `onMounted`/`onUnmounted`
- ✅ 完善 README 文档，补充功能逻辑说明
- ✅ 添加详细的技术架构图
- ✅ 补充使用示例和最佳实践

### 初始版本
- ✅ 实现聊天列表页基础功能
- ✅ 集成 WebSocket 实时通信
- ✅ 实现侧滑操作（标记已读/隐藏/删除）
- ✅ 搜索和过滤功能
- ✅ 分页加载

---

## 贡献指南

如需添加新功能或修复 bug，请遵循以下步骤：

1. 创建功能分支
2. 编写代码并添加必要的注释
3. 更新 README 文档
4. 提交 PR 并说明改动内容
5. 等待代码审查

---

**最后更新**: 2025年11月12日  
**维护者**: 开发团队  
**当前版本**: v1.0.0
