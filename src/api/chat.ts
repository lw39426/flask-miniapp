/**
 * 聊天系统 API
 * 基于 Flask + Socket.IO 实现
 */

import type {
  AddParticipantsRequest,
  ChatMessage,
  CreateRoomRequest,
  CreateRoomResponse,
  MessageListResponse,
  ParticipantsResponse,
  RoomListResponse,
  SendMessageRequest
} from './types'
import { http } from '@/http/http'

const BASE_URL = '/chat-system/chat'

// 响应类型
export interface BaseResponse<T = any> {
  code: number
  message: string
  data?: T
}

/**
 * 创建聊天室（私聊或群聊）
 * 私聊若已存在且被隐藏会自动恢复
 */
export function createChatRoom(data: CreateRoomRequest) {
  return http<CreateRoomResponse>({
    url: `${BASE_URL}/rooms`,
    method: 'POST',
    data
  })
}

/**
 * 获取我的聊天室列表
 * @param page 页码，默认 1
 * @param per_page 每页数量，默认 20，最大 20
 * @param include_hidden 是否包含隐藏会话，默认 false
 */
export function getChatRooms(params?: {
  page?: number
  per_page?: number
  include_hidden?: boolean
}) {
  return http<RoomListResponse>({
    url: `${BASE_URL}/rooms`,
    method: 'GET',
    query: params
  })
}

/**
 * 发送消息
 * @param roomId 聊天室 ID
 * @param data 消息内容和类型
 */
export function sendMessage(roomId: number, data: SendMessageRequest) {
  return http<BaseResponse<ChatMessage>>({
    url: `${BASE_URL}/rooms/${roomId}/messages`,
    method: 'POST',
    data
  })
}

/**
 * 获取消息历史
 * @param roomId 聊天室 ID
 * @param page 页码，默认 1
 * @param per_page 每页数量，默认 50，最大 100
 */
export function getMessages(roomId: number, params?: { page?: number, per_page?: number }) {
  return http<MessageListResponse>({
    url: `${BASE_URL}/rooms/${roomId}/messages`,
    method: 'GET',
    query: params
  })
}

/**
 * 获取聊天室参与者
 */
export function getRoomParticipants(roomId: number) {
  return http<ParticipantsResponse>({
    url: `${BASE_URL}/rooms/${roomId}/participants`,
    method: 'GET'
  })
}

/**
 * 添加聊天室参与者（仅群聊）
 */
export function addRoomParticipants(roomId: number, data: AddParticipantsRequest) {
  return http<BaseResponse<{ added_count: number }>>({
    url: `${BASE_URL}/rooms/${roomId}/participants`,
    method: 'POST',
    data
  })
}

/**
 * 隐藏会话（软删除）
 * 当所有参与者都隐藏时，房间会被删除
 */
export function hideRoom(roomId: number) {
  return http<BaseResponse<{ room_id: number, room_deleted: boolean }>>({
    url: `${BASE_URL}/rooms/${roomId}/hide`,
    method: 'POST'
  })
}

/**
 * 恢复会话
 */
export function restoreRoom(roomId: number) {
  return http<BaseResponse<{ room_id: number }>>({
    url: `${BASE_URL}/rooms/${roomId}/restore`,
    method: 'POST'
  })
}

/**
 * 标记房间已读
 */
export function markRoomAsRead(roomId: number) {
  return http<BaseResponse<{ last_read_at: string }>>({
    url: `${BASE_URL}/rooms/${roomId}/read`,
    method: 'POST'
  })
}

/**
 * 退出聊天室
 */
export function leaveRoom(roomId: number) {
  return http<BaseResponse<{ room_deleted: boolean }>>({
    url: `${BASE_URL}/rooms/${roomId}/leave`,
    method: 'POST'
  })
}

/**
 * 清空聊天记录
 */
export function clearRoomMessages(roomId: number) {
  return http<BaseResponse<{ deleted_count: number }>>({
    url: `${BASE_URL}/rooms/${roomId}/clear`,
    method: 'POST'
  })
}

/**
 * 删除聊天室
 * @param roomId 聊天室 ID
 * @param force_delete 是否强制删除（硬删除），仅超级管理员可用
 */
export function deleteRoom(roomId: number, force_delete = false) {
  return http<BaseResponse<{ delete_type: 'hard_delete' | 'soft_delete' }>>({
    url: `${BASE_URL}/rooms/${roomId}`,
    method: 'DELETE',
    data: { force_delete }
  })
}
