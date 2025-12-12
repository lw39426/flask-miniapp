import type { ChatRoom } from '@/api/types/chat'

import { defineStore } from 'pinia'

import { getChatRooms } from '@/api/chat'
import { tabbarStore } from '@/tabbar/store'
import { socketManager } from '@/utils/socket'

/**
 * 会话更新数据接口
 */
interface ConversationUpdate {
  roomId: number
  latestMessage: string
  senderId: number
  unreadCount: number
  timestamp: string
}

/**
 * 聊天全局状态管理
 * 负责管理：
 * 1. 全局用户在线状态（所有用户）
 * 2. 会话列表（从 API 加载的完整数据）
 * 3. 总未读数（TabBar 徽标）
 */
export const useChatStore = defineStore('chat', {
  state: () => ({
    // 全局用户在线状态 Map<userId, isOnline>
    userOnlineStatus: new Map<number, boolean>(),

    // 会话列表（从 API 加载的完整数据）
    conversations: [] as ChatRoom[],

    // 总未读数
    totalUnreadCount: 0,

    // 加载状态
    loading: false
  }),

  getters: {
    /**
     * 获取用户在线状态
     * @param userId 用户ID
     * @returns 是否在线（未找到时返回 false）
     */
    getUserOnlineStatus: state => (userId: number) => {
      return state.userOnlineStatus.get(userId) ?? false
    },

    /**
     * 获取会话列表（按最新消息时间排序）
     */
    sortedConversations: (state) => {
      return [...state.conversations].sort((a, b) => {
        const timeA = new Date(a.updated_at || 0).getTime()
        const timeB = new Date(b.updated_at || 0).getTime()
        return timeB - timeA
      })
    },

    /**
     * 获取指定房间的会话
     * @param roomId 房间ID
     */
    getConversation: state => (roomId: number) => {
      return state.conversations.find(c => c.id === roomId)
    }
  },

  actions: {
    /**
     * 更新全局用户在线状态
     * 由 WebSocket 全局监听器调用
     * @param userId 用户ID
     * @param isOnline 是否在线
     */
    updateUserOnlineStatus(userId: number, isOnline: boolean) {
      console.log('[ChatStore] 更新用户在线状态:', userId, isOnline)

      this.userOnlineStatus.set(userId, isOnline)

      // 更新会话列表中对应用户的在线状态
      const conversation = this.conversations.find((c) => {
        // 私聊会话：查找对方用户
        if (c.type === 'private') {
          const otherParticipant = c.participants?.find(p => p.type === 'AdminUser') || c.participants?.[0]
          return otherParticipant?.id === userId
        }
        return false
      })

      if (conversation) {
        const otherParticipant = conversation.participants?.find(p => p.type === 'AdminUser') || conversation.participants?.[0]
        if (otherParticipant) {
          otherParticipant.is_online = isOnline
          console.log('[ChatStore] 已更新会话中的用户在线状态:', conversation, conversation.id)
        }
      }
    },

    /**
     * 更新会话项的最新消息和未读数
     * 由 WebSocket 全局监听器调用
     * @param update 会话更新数据
     */
    updateConversationItem(update: ConversationUpdate) {
      console.log('[ChatStore] 更新会话项:', update)

      const conversation = this.conversations.find(c => c.id === update.roomId)

      if (conversation) {
        // 更新已存在的会话
        conversation.last_message = {
          ...conversation.last_message,
          content: update.latestMessage
        } as any
        conversation.updated_at = update.timestamp
        conversation.unread_count = update.unreadCount

        // 重新排序（最新消息的会话排在前面）
        this.conversations.sort((a, b) => {
          return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
        })

        console.log('[ChatStore] 会话已更新:', conversation.id)
      }
      else {
        // 如果是新会话，重新加载会话列表
        console.log('[ChatStore] 检测到新会话，重新加载列表')
        this.fetchConversations()
      }

      // 更新总未读数
      this.updateTotalUnreadCount()
    },

    /**
     * 加载会话列表（HTTP API）
     */
    async fetchConversations() {
      console.log('[ChatStore] 正在加载会话列表...', this.loading)
      if (this.loading) {
        console.log('[ChatStore] Already loading conversations')
        return
      }
      console.log('[ChatStore] 没有请求getChatRooms', this.loading)
      this.loading = true

      try {
        const response = await getChatRooms({
          page: 1,
          per_page: 50,
          include_hidden: false
        })

        if (response.code === 200 && response.data) {
          this.conversations = response.data.rooms
          this.updateTotalUnreadCount()

          console.log('[ChatStore] ✅ Conversations loaded:', this.conversations.length)

          // 加载成功后，自动加入所有会话房间以接收 WebSocket 实时更新
          this.joinAllConversationRooms()
        }
      }
      catch (error) {
        console.error('[ChatStore] ❌ Failed to fetch conversations:', error)
      }
      finally {
        this.loading = false
      }
    },

    /**
     * 加入所有会话房间（用于接收 WebSocket 实时更新）
     * 注意：无论 WebSocket 是否连接，都会缓存房间 ID，连接成功后自动补发joinAllLoadedConversations
     */
    joinAllConversationRooms() {
      if (!socketManager.isConnected()) {
        console.log('[ChatStore] 💤 WebSocket not connected yet, will auto-join on connect')
        return
      }

      console.log('[ChatStore] 🚪 Joining all conversation rooms...')

      this.conversations.forEach((conversation) => {
        socketManager.joinConversationRoom(conversation.id)
      })

      console.log('[ChatStore] ✅ Joined', this.conversations.length, 'conversation rooms')
    },

    /**
     * 标记会话为已读
     * @param roomId 房间ID
     */
    markConversationAsRead(roomId: number) {
      const conversation = this.conversations.find(c => c.id === roomId)
      if (conversation && conversation.unread_count > 0) {
        conversation.unread_count = 0
        this.updateTotalUnreadCount()

        console.log('[ChatStore] ✅ Marked conversation as read:', roomId)
      }
    },

    /**
     * 更新总未读数并更新 TabBar 徽标
     */
    updateTotalUnreadCount() {
      this.totalUnreadCount = this.conversations.reduce(
        (sum, conv) => sum + (conv.unread_count || 0),
        0
      )

      console.log('[ChatStore] 📊 Total unread count:', this.totalUnreadCount)

      // 【修改】始终尝试更新 TabBar 徽标,不再检查页面类型
      // 因为 TabBar 是全局的,在任何页面都应该更新
      if (this.totalUnreadCount > 0) {
        console.log('[ChatStore] ✅ 设置当前 TabBar 索引徽标:', tabbarStore.curIdx)
        tabbarStore.setTabbarItemBadge(2, this.totalUnreadCount)
      }
      else {
        console.log('[ChatStore] ✅ TabBar badge removed')
        tabbarStore.setTabbarItemBadge(2, 0)
      }
    },

    /**
     * 重置 Store（登出时调用）
     */
    $reset() {
      this.userOnlineStatus.clear()
      this.conversations = []
      this.totalUnreadCount = 0
      this.loading = false

      // 清除 TabBar 徽标
      tabbarStore.setTabbarItemBadge(2, 0)

      console.log('[ChatStore] 🔄 Store reset')
    }
  }
})
