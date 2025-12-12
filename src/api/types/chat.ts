/**
 * 聊天系统类型定义
 */

/**
 * 用户类型
 */
export type UserType = 'NormalUser' | 'AdminUser'

/**
 * 聊天室类型
 */
export type RoomType = 'private' | 'group'

/**
 * 消息类型
 */
export type MessageType = 'text' | 'image' | 'file'

/**
 * 参与者信息
 */
export interface Participant {
  id: number
  avatar?: string
  is_online?: boolean
  last_seen_at?: string | null
  name?: string
  online_status?: string
  phone?: string
  type: UserType
}

/**
 * 发送者显示信息
 */
export interface Sender {
  id: number
  user_type: UserType
  nickname: string
  avatar: string
}

/**
 * 消息对象
 */
export interface ChatMessage {
  id: number
  room_id?: number
  content: string
  message_type: MessageType
  created_at: string
  sender: Sender
  is_own?: boolean // 是否为当前用户发送
}

/**
 * 聊天室对象
 */
export interface ChatRoom {
  id: number
  type: RoomType
  name: string
  created_at: string
  updated_at: string
  participants: Participant[]
  participant_count: number
  unread_count: number
  last_message?: ChatMessage
  is_hidden?: boolean // 当前用户是否隐藏了该房间
}

/**
 * 创建聊天室请求参数
 */
export interface CreateRoomRequest {
  type: RoomType
  name?: string // 群聊必填，私聊可选
  participants: Array<{
    user_id: number
    user_type: UserType
  }>
}

/**
 * 创建聊天室响应
 */
export interface CreateRoomResponse {
  code: number
  message: string
  data: {
    room_id: number
    type: RoomType
    name: string
    created_at: string
    was_hidden?: boolean // 私聊房间是否是被恢复的
  }
}

/**
 * 聊天室列表响应
 */
export interface RoomListResponse {
  code: number
  message: string
  data: {
    rooms: ChatRoom[]
    pagination: {
      page: number
      per_page: number
      total: number
      pages: number
      has_next: boolean
      has_prev: boolean
    }
  }
}

/**
 * 发送消息请求参数
 */
export interface SendMessageRequest {
  content: string
  type: MessageType
}

/**
 * 消息列表响应
 */
export interface MessageListResponse {
  code: number
  message: string
  data: {
    messages: ChatMessage[]
    pagination: {
      page: number
      per_page: number
      total: number
      pages: number
      has_next: boolean
      has_prev: boolean
    }
  }
}

/**
 * 参与者列表响应
 */
export interface ParticipantsResponse {
  code: number
  message: string
  data: {
    participants: Participant[]
    count: number
  }
}

/**
 * 添加参与者请求参数
 */
export interface AddParticipantsRequest {
  participants: Array<{
    id: number
    type: UserType
  }>
}
