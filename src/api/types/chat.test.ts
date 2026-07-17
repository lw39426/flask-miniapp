/**
 * Chat 类型定义测试
 * 确保类型定义正确
 */

import type { ChatMessage, MessageSendStatus } from './chat'

import { describe, expect, it } from 'vitest'

describe('chat Types', () => {
  describe('chatMessage', () => {
    it('应该支持基础消息属性', () => {
      const message: ChatMessage = {
        id: 1,
        content: 'Hello',
        message_type: 'text',
        created_at: '2025-01-01T00:00:00Z',
        sender: {
          id: 1,
          user_type: 'NormalUser',
          nickname: 'Test',
          avatar: ''
        }
      }

      expect(message.id).toBe(1)
      expect(message.content).toBe('Hello')
    })

    it('应该支持可选的 room_id', () => {
      const message: ChatMessage = {
        id: 1,
        room_id: 123,
        content: 'Hello',
        message_type: 'text',
        created_at: '2025-01-01T00:00:00Z',
        sender: {
          id: 1,
          user_type: 'NormalUser',
          nickname: 'Test',
          avatar: ''
        }
      }

      expect(message.room_id).toBe(123)
    })

    it('应该支持可选的 is_own', () => {
      const message: ChatMessage = {
        id: 1,
        content: 'Hello',
        message_type: 'text',
        created_at: '2025-01-01T00:00:00Z',
        sender: {
          id: 1,
          user_type: 'NormalUser',
          nickname: 'Test',
          avatar: ''
        },
        is_own: true
      }

      expect(message.is_own).toBe(true)
    })

    it('应该支持消息状态 status', () => {
      const message: ChatMessage = {
        id: 1,
        content: 'Hello',
        message_type: 'text',
        created_at: '2025-01-01T00:00:00Z',
        sender: {
          id: 1,
          user_type: 'NormalUser',
          nickname: 'Test',
          avatar: ''
        },
        status: 'sending'
      }

      expect(message.status).toBe('sending')
    })

    it('应该支持序列号 sequence', () => {
      const message: ChatMessage = {
        id: 1,
        content: 'Hello',
        message_type: 'text',
        created_at: '2025-01-01T00:00:00Z',
        sender: {
          id: 1,
          user_type: 'NormalUser',
          nickname: 'Test',
          avatar: ''
        },
        sequence: 42
      }

      expect(message.sequence).toBe(42)
    })

    it('应该支持不同的消息类型', () => {
      const textMessage: ChatMessage = {
        id: 1,
        content: 'Hello',
        message_type: 'text',
        created_at: '2025-01-01T00:00:00Z',
        sender: { id: 1, user_type: 'NormalUser', nickname: 'Test', avatar: '' }
      }

      const imageMessage: ChatMessage = {
        id: 2,
        content: 'https://example.com/image.jpg',
        message_type: 'image',
        created_at: '2025-01-01T00:00:00Z',
        sender: { id: 1, user_type: 'NormalUser', nickname: 'Test', avatar: '' }
      }

      const fileMessage: ChatMessage = {
        id: 3,
        content: 'https://example.com/file.pdf',
        message_type: 'file',
        created_at: '2025-01-01T00:00:00Z',
        sender: { id: 1, user_type: 'NormalUser', nickname: 'Test', avatar: '' }
      }

      expect(textMessage.message_type).toBe('text')
      expect(imageMessage.message_type).toBe('image')
      expect(fileMessage.message_type).toBe('file')
    })

    it('应该支持不同的用户类型', () => {
      const normalUserMessage: ChatMessage = {
        id: 1,
        content: 'Hello',
        message_type: 'text',
        created_at: '2025-01-01T00:00:00Z',
        sender: { id: 1, user_type: 'NormalUser', nickname: 'User', avatar: '' }
      }

      const adminUserMessage: ChatMessage = {
        id: 2,
        content: 'Hello Admin',
        message_type: 'text',
        created_at: '2025-01-01T00:00:00Z',
        sender: { id: 1, user_type: 'AdminUser', nickname: 'Admin', avatar: '' }
      }

      expect(normalUserMessage.sender.user_type).toBe('NormalUser')
      expect(adminUserMessage.sender.user_type).toBe('AdminUser')
    })
  })

  describe('messageSendStatus', () => {
    it('应该包含所有状态值', () => {
      const statuses: MessageSendStatus[] = ['sending', 'sent', 'failed', 'retry']

      expect(statuses).toContain('sending')
      expect(statuses).toContain('sent')
      expect(statuses).toContain('failed')
      expect(statuses).toContain('retry')
    })
  })
})
