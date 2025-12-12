<template>
  <view class="chat-page">
    <!-- 自定义导航栏 -->
    <view class="nav-bar">
      <view class="nav-content">
        <text class="nav-title">信息</text>
        <view class="nav-right" @tap="handleAdd">
          <sar-icon name="plus-circle" size="22" color="#000" />
        </view>
      </view>
    </view>

    <!-- 标签栏 -->
    <sar-tabs v-model:current="activeTab" :options="tabOptions" class="tabs" />

    <!-- 消息列表 -->
    <view v-if="activeTab === 0" class="message-list">
      <!-- 搜索框 -->
      <view class="search-wrapper">
        <sar-search v-model="searchText" placeholder="搜索聊天记录或联系人" />
      </view>

      <!-- 会话列表 -->
      <sar-swipe-action
        v-for="room in filteredRooms"
        :key="room.id"
        :options="swipeOptions"
        @action="handleSwipeAction($event, room)"
      >
        <!-- 消息房间项 -->
        <view class="room-item" @tap="goToChat(room)">
          <!-- 头像 -->
          <view class="avatar-wrapper relative">
            <sar-avatar :src="getRoomAvatar(room)" size="large" />
            <sar-badge
              v-if="room.unread_count > 0"
              :value="room.unread_count > 99 ? '99+' : room.unread_count"
              :fixed="true"
            />
            <!-- 在线状态指示器 -->
            <view v-if="getRoomUserStatus(room)" class="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-[#56e48a]" />
          </view>
          <!-- 房间信息 -->
          <view class="room-info">
            <view class="room-header">
              <text class="room-name">{{ getRoomDisplayName(room) }}</text>
              <text class="room-time">{{ formatTime(room.updated_at) }}</text>
            </view>
            <view class="room-content">
              <text class="last-message">{{ room.last_message?.content || '暂无消息' }}</text>
            </view>
          </view>
        </view>
      </sar-swipe-action>

      <!-- 空状态 -->
      <view v-if="filteredRooms.length === 0" class="empty-state">
        <sar-empty description="暂无会话" />
      </view>
    </view>

    <!-- 联系人列表 -->
    <view v-if="activeTab === 1" class="contact-list">
      <view class="contact-header">
        <view class="contact-item" @tap="goToNewFriends">
          <view class="contact-icon bg-orange">
            <sar-icon name="user-add" size="20rpx" color="#fff" />
          </view>
          <text class="contact-name">新的朋友</text>
        </view>
        <view class="contact-item" @tap="goToGroups">
          <view class="contact-icon bg-green">
            <sar-icon name="users" size="20rpx" color="#fff" />
          </view>
          <text class="contact-name">群聊</text>
        </view>
      </view>

      <!-- 好友列表 -->
      <view :index-list="indexList">
        <view v-for="(group, index) in contactGroups" :key="index">
          <view :index="group.letter" />
          <view
            v-for="contact in group.contacts"
            :key="contact.id"
            class="contact-item-wrapper"
            @tap="goToChat(contact)"
          >
            <sar-avatar :src="contact.avatar" size="medium" />
            <text class="contact-item-name">{{ contact.name }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 全局悬浮按钮 -->
    <view class="fab" @tap="showFabMenu">
      <sar-icon name="message-circle" size="24rpx" color="#fff" />
      <sar-badge v-if="totalUnread > 0" :value="totalUnread > 99 ? '99+' : totalUnread" dot class="fab-badge" />
    </view>
  </view>
</template>

<script setup lang="ts">
import type { ChatRoom } from '@/api/types/chat'

import { onPullDownRefresh, onShow } from '@dcloudio/uni-app'

import { computed, onMounted } from 'vue'
import { deleteRoom, hideRoom, markRoomAsRead } from '@/api/chat'
import { useChatStore } from '@/store/chat'
import { DEFAULT_AVATARS } from './config'

definePage({
  style: {
    // 'custom' 表示开启自定义导航栏，默认 'default'
    navigationStyle: 'default',
    navigationBarTextStyle: 'black',
    navigationBarTitleText: '信息',
    navigationBarBackgroundColor: '#F8F8F8',
    backgroundColor: '#F8F8F8'
  }
})

// 类型定义
interface Contact {
  id: string
  name: string
  avatar: string
  pinyin: string
}

// 状态管理
const activeTab = ref(0)
const searchText = ref('')
const tabOptions = ['消息', '联系人']
const chatStore = useChatStore()

// 【修改】从 Store 获取会话列表（响应式）
const rooms = computed(() => chatStore.sortedConversations)
const totalUnread = computed(() => chatStore.totalUnreadCount)
const loading = computed(() => chatStore.loading)

// 获取聊天室列表（简化版：直接使用 Store）
const loadRooms = async (isRefresh = false) => {
  console.log('[Chat] 从 Store 加载会话列表...')

  // 【简化】只需调用 Store 方法加载数据
  await chatStore.fetchConversations()

  // 停止下拉刷新
  if (isRefresh) {
    uni.stopPullDownRefresh()
  }
}

// 联系人数据
const contacts = ref<Contact[]>([
  { id: 'c1', name: '张三', avatar: '/static/images/avatar1.png', pinyin: 'zhangsan' },
  { id: 'c2', name: '李四', avatar: '/static/images/avatar2.png', pinyin: 'lisi' },
  { id: 'c3', name: 'Alice', avatar: '/static/images/avatar3.png', pinyin: 'alice' }
])

// 侧滑操作选项
const swipeOptions = [
  { text: '标记已读', style: { backgroundColor: '#07c160' } },
  { text: '隐藏', style: { backgroundColor: '#ff9500' } },
  { text: '删除', style: { backgroundColor: '#ee0a24' } }
]

// 索引列表
const indexList = computed(() => {
  const letters = new Set<string>()
  contacts.value.forEach((contact) => {
    const firstChar = contact.pinyin[0].toUpperCase()
    if (/[A-Z]/.test(firstChar)) {
      letters.add(firstChar)
    }
    else {
      letters.add('#')
    }
  })
  return Array.from(letters).sort()
})

// 分组联系人
const contactGroups = computed(() => {
  const groups: { letter: string, contacts: Contact[] }[] = []
  indexList.value.forEach((letter) => {
    const groupContacts = contacts.value.filter((contact) => {
      const firstChar = contact.pinyin[0].toUpperCase()
      if (letter === '#') {
        return !/[A-Z]/.test(firstChar)
      }
      return firstChar === letter
    })
    if (groupContacts.length > 0) {
      groups.push({ letter, contacts: groupContacts })
    }
  })
  return groups
})

// 过滤后的会话列表
const filteredRooms = computed(() => {
  let result = rooms.value
  if (searchText.value) {
    const keyword = searchText.value.trim()
    result = result.filter((room) => {
      // 搜索房间名称
      const matchName = room.name?.includes(keyword)
      // 搜索最后一条消息
      const matchMessage = room.last_message?.content.includes(keyword)
      // 搜索参与者名称
      const matchParticipant = room.participants?.some(p =>
        p.name?.includes(keyword)
      )
      return matchParticipant || matchMessage || matchName
    })
  }
  // 按更新时间排序（最新的排在前面）
  return result.sort((a, b) => {
    return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
  })
})

// 格式化时间
const formatTime = (timestamp?: string) => {
  if (!timestamp)
    return ''

  const now = Date.now()
  const time = new Date(timestamp).getTime()
  const diff = now - time
  const minute = 60 * 1000
  const hour = 60 * minute
  const day = 24 * hour

  if (diff < minute) {
    return '刚刚'
  }
  else if (diff < hour) {
    return `${Math.floor(diff / minute)}分钟前`
  }
  else if (diff < day) {
    return `${Math.floor(diff / hour)}小时前`
  }
  else {
    const date = new Date(time)
    return `${date.getMonth() + 1}/${date.getDate()}`
  }
}

// 获取房间显示名称（私聊显示对方昵称，群聊显示群名）
const getRoomDisplayName = (room: ChatRoom) => {
  if (room.type === 'group') {
    return room.name || '群聊会话'
  }
  // 私聊：显示对方的昵称
  const otherParticipant = room.participants?.find(p => p.type === 'AdminUser') || room.participants?.[0]
  return otherParticipant?.name || '私聊会话'
}

// 获取房间头像（私聊显示对方头像，群聊显示群头像）
const getRoomAvatar = (room: ChatRoom) => {
  if (room.type === 'group') {
    return DEFAULT_AVATARS.GROUP
  }
  // 私聊：显示对方的头像
  const otherParticipant = room.participants?.find(p => p.type === 'AdminUser') || room.participants?.[0]
  return otherParticipant?.avatar || DEFAULT_AVATARS.USER
}

// 获取房间用户在线状态
const getRoomUserStatus = (room: ChatRoom) => {
  if (room.type === 'group') {
    return false
  }
  // 私聊：显示对方的在线状态
  const otherParticipant = room.participants?.find(p => p.type === 'AdminUser') || room.participants?.[0]
  return otherParticipant?.is_online
}

// 跳转到聊天窗口
const goToChat = (room: ChatRoom | Contact) => {
  if ('type' in room) {
    // ChatRoom 类型
    uni.navigateTo({
      url: `/pages/chat/room?id=${room.id}&name=${getRoomDisplayName(room)}`
    })
  }
  else {
    // Contact 类型
    uni.navigateTo({
      url: `/pages/chat/room?id=${room.id}&name=${room.name}`
    })
  }
}

// 处理侧滑操作
const handleSwipeAction = async (event: any, room: ChatRoom) => {
  try {
    if (event.index === 0) {
      // 标记已读
      const res1 = await markRoomAsRead(room.id)
      if (res1.code !== 200) {
        throw new Error('标记已读失败')
      }
      room.unread_count = 0
      uni.showToast({ title: '已标记为已读', icon: 'success' })
    }
    else if (event.index === 1) {
      // 隐藏会话
      uni.showModal({
        title: '确认隐藏',
        content: '隐藏后可在设置中恢复',
        success: async (res) => {
          if (res.confirm) {
            const response = await hideRoom(room.id)
            if (response.code === 200) {
              // 从列表中移除
              const index = rooms.value.findIndex(r => r.id === room.id)
              if (index > -1) {
                rooms.value.splice(index, 1)
              }
              uni.showToast({
                title: response.data?.room_deleted ? '会话已删除' : '已隐藏',
                icon: 'success'
              })
            }
          }
        }
      })
    }
    else if (event.index === 2) {
      // 删除会话
      uni.showModal({
        title: '确认删除',
        content: '删除后将清空所有聊天记录，且无法恢复',
        success: async (res) => {
          if (res.confirm) {
            const response = await deleteRoom(room.id, false)
            if (response.code === 200) {
              const index = rooms.value.findIndex(r => r.id === room.id)
              if (index > -1) {
                rooms.value.splice(index, 1)
              }
              uni.showToast({ title: '删除成功', icon: 'success' })
            }
          }
        }
      })
    }
  }
  catch (error) {
    console.error('[Chat] 侧滑操作失败:', error)
    uni.showToast({
      title: error.message || '操作失败',
      icon: 'none'
    })
  }
}
// 显示悬浮菜单
const showFabMenu = () => {
  uni.showActionSheet({
    itemList: ['发起群聊', '添加好友', '扫一扫'],
    success: (res) => {
      console.log('[Chat] FAB action selected:', res.tapIndex)
      // TODO: 处理不同的操作
      if (res.tapIndex === 0) {
        // 发起群聊
        uni.navigateTo({ url: '/pages/chat/create-group' })
      }
      else if (res.tapIndex === 1) {
        // 添加好友
        uni.navigateTo({ url: '/pages/chat/add-friend' })
      }
      else if (res.tapIndex === 2) {
        // 扫一扫
        uni.scanCode({
          success: (scanRes) => {
            console.log('[Chat] Scan result:', scanRes)
          }
        })
      }
    }
  })
}

// 添加按钮
const handleAdd = () => {
  showFabMenu()
}

// 跳转到新的朋友
const goToNewFriends = () => {
  uni.navigateTo({ url: '/pages/chat/new-friends' })
}

// 跳转到群聊
const goToGroups = () => {
  uni.navigateTo({ url: '/pages/chat/groups' })
}

// ====================== 生命周期 ======================

// 页面首次加载时请求订阅消息权限(只需要执行一次)
onMounted(() => {

  // #ifdef MP-WEIXIN
  // 请求订阅消息权限
  // uni.requestSubscribeMessage({
  //   tmplIds: Object.values(MESSAGE_TEMPLATE_IDS).filter(id => id !== 'YOUR_TEMPLATE_ID_HERE'),
  //   success: () => {
  //     console.log('[Chat] Subscribe message success')
  //   },
  //   fail: (err) => {
  //     console.warn('[Chat] Subscribe message failed:', err)
  //   }
  // })
  // #endif
})

// 【修改】页面显示时重新加载数据
onShow(() => {
  console.log('[Chat] 页面展示, 重新加载会话列表')

  // 【修改】每次显示都重新加载,确保数据最新
  // WebSocket 由 App.vue 全局管理
  loadRooms(false)
})

// 【新增】下拉刷新
onPullDownRefresh(async () => {
  await loadRooms(true)
})

// 【删除】页面隐藏/卸载时无需清理 WebSocket
// 因为 WebSocket 连接由 App.vue 全局管理，不会因页面切换而断开
</script>

<style lang="scss" scoped>
.chat-page {
  min-height: 100vh;
  background-color: #f5f5f5;
}

.nav-bar {
  background-color: #fff;
  border-bottom: 1px solid #e5e5e5;
}

.nav-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 88rpx;
  padding: 0 32rpx;
}

.nav-title {
  font-size: 36rpx;
  font-weight: 600;
  color: #000;
}

.nav-right {
  padding: 8rpx;
}

.tabs {
  background-color: #fff;
}

.message-list {
  padding-bottom: 120rpx;
}

.search-wrapper {
  padding: 16rpx 32rpx;
  background-color: #fff;
}

.room-item {
  display: flex;
  padding: 24rpx 32rpx;
  background-color: #fff;
  border-bottom: 1px solid #e5e5e5;
}

.avatar-wrapper {
  position: relative;
  margin-right: 24rpx;
}

.unread-badge {
  position: absolute;
  top: -8rpx;
  right: -8rpx;
}

.room-info {
  flex: 1;
  min-width: 0;
}

.room-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8rpx;
}

.room-name {
  font-size: 32rpx;
  font-weight: 500;
  color: #000;
}

.room-time {
  font-size: 24rpx;
  color: #999;
}

.room-content {
  display: flex;
  justify-content: space-between;
}

.last-message {
  font-size: 28rpx;
  color: #999;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.empty-state {
  padding: 120rpx 0;
}

.contact-list {
  padding-bottom: 120rpx;
}

.contact-header {
  background-color: #fff;
  border-bottom: 1px solid #e5e5e5;
}

.contact-item {
  display: flex;
  align-items: center;
  padding: 24rpx 32rpx;
  border-bottom: 1px solid #f5f5f5;
}

.contact-icon {
  width: 80rpx;
  height: 80rpx;
  border-radius: 8rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 24rpx;
}

.bg-orange {
  background-color: #ff9500;
}

.bg-green {
  background-color: #07c160;
}

.contact-name {
  font-size: 32rpx;
  color: #000;
}

.contact-item-wrapper {
  display: flex;
  align-items: center;
  padding: 24rpx 32rpx;
  background-color: #fff;
  border-bottom: 1px solid #f5f5f5;
}

.contact-item-name {
  margin-left: 24rpx;
  font-size: 32rpx;
  color: #000;
}

.fab {
  position: fixed;
  right: 32rpx;
  bottom: 160rpx;
  width: 112rpx;
  height: 112rpx;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  box-shadow: 0 8rpx 24rpx rgba(102, 126, 234, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 999;
}

.fab-badge {
  position: absolute;
  top: -8rpx;
  right: -8rpx;
}
</style>
