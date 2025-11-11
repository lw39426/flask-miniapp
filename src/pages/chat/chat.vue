<template>
  <view class="chat-page">
    <!-- 自定义导航栏 -->
    <view class="nav-bar">
      <view class="nav-content">
        <text class="nav-title">星云沟通中心</text>
        <view class="nav-right" @tap="handleAdd">
          <sar-icon name="plus-circle" size="22" color="#000" />
        </view>
      </view>
    </view>

    <!-- 标签栏 -->
    <s-tabs v-model:current="activeTab" :options="tabOptions" class="tabs" />

    <!-- 消息列表 -->
    <view v-if="activeTab === 0" class="message-list">
      <!-- 搜索框 -->
      <view class="search-wrapper">
        <s-search v-model="searchText" placeholder="搜索聊天记录或联系人" />
      </view>

      <!-- 会话列表 -->
      <s-swipe-action-group>
        <s-swipe-action
          v-for="room in filteredRooms"
          :key="room.id"
          :options="swipeOptions"
          @action="handleSwipeAction($event, room)"
        >
          <view class="room-item" @tap="goToChat(room)">
            <view class="avatar-wrapper">
              <s-avatar :src="room.avatar" size="large" />
              <s-badge
                v-if="room.unreadCount > 0"
                :value="room.unreadCount > 99 ? '99+' : room.unreadCount"
                class="unread-badge"
              />
            </view>
            <view class="room-info">
              <view class="room-header">
                <text class="room-name">{{ room.name }}</text>
                <text class="room-time">{{ formatTime(room.lastTime) }}</text>
              </view>
              <view class="room-content">
                <text class="last-message">{{ room.lastMessage }}</text>
              </view>
            </view>
          </view>
        </s-swipe-action>
      </s-swipe-action-group>

      <!-- 空状态 -->
      <view v-if="filteredRooms.length === 0" class="empty-state">
        <s-empty description="暂无会话" />
      </view>
    </view>

    <!-- 联系人列表 -->
    <view v-if="activeTab === 1" class="contact-list">
      <view class="contact-header">
        <view class="contact-item" @tap="goToNewFriends">
          <view class="contact-icon bg-orange">
            <s-icon name="user-add" :size="20" color="#fff" />
          </view>
          <text class="contact-name">新的朋友</text>
        </view>
        <view class="contact-item" @tap="goToGroups">
          <view class="contact-icon bg-green">
            <s-icon name="users" :size="20" color="#fff" />
          </view>
          <text class="contact-name">群聊</text>
        </view>
      </view>

      <!-- 好友列表 -->
      <s-index-bar :index-list="indexList">
        <view v-for="(group, index) in contactGroups" :key="index">
          <s-index-bar-anchor :index="group.letter" />
          <view
            v-for="contact in group.contacts"
            :key="contact.id"
            class="contact-item-wrapper"
            @tap="goToChat(contact)"
          >
            <s-avatar :src="contact.avatar" size="medium" />
            <text class="contact-item-name">{{ contact.name }}</text>
          </view>
        </view>
      </s-index-bar>
    </view>

    <!-- 全局悬浮按钮 -->
    <view class="fab" @tap="showFabMenu">
      <s-icon name="message-circle" :size="24" color="#fff" />
      <s-badge v-if="totalUnread > 0" :value="totalUnread > 99 ? '99+' : totalUnread" dot class="fab-badge" />
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'

definePage({
  style: {
    // 'custom' 表示开启自定义导航栏，默认 'default'
    navigationStyle: 'default',
    navigationBarTextStyle: 'black',
    navigationBarTitleText: '星云沟通中心',
    navigationBarBackgroundColor: '#F8F8F8',
    backgroundColor: '#F8F8F8'
  }

})

// 类型定义
interface Room {
  id: string
  name: string
  avatar: string
  lastMessage: string
  lastTime: number
  unreadCount: number
  isPinned: boolean
  type: 'customer' | 'friend' | 'group'
}

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

// 会话列表数据
const rooms = ref<Room[]>([
  {
    id: 'cs-001',
    name: '官方客服',
    avatar: '/static/images/customer-service.png',
    lastMessage: '您好，有什么可以帮您的？',
    lastTime: Date.now() - 60000,
    unreadCount: 2,
    isPinned: true,
    type: 'customer'
  },
  {
    id: 'user-001',
    name: '张三',
    avatar: '/static/images/avatar1.png',
    lastMessage: '晚上一起吃饭吗？',
    lastTime: Date.now() - 3600000,
    unreadCount: 0,
    isPinned: false,
    type: 'friend'
  },
  {
    id: 'group-001',
    name: '项目讨论组',
    avatar: '/static/images/group1.png',
    lastMessage: '李四: 明天的会议准备好了吗？',
    lastTime: Date.now() - 7200000,
    unreadCount: 5,
    isPinned: false,
    type: 'group'
  }
])

// 联系人数据
const contacts = ref<Contact[]>([
  { id: 'c1', name: '张三', avatar: '/static/images/avatar1.png', pinyin: 'zhangsan' },
  { id: 'c2', name: '李四', avatar: '/static/images/avatar2.png', pinyin: 'lisi' },
  { id: 'c3', name: 'Alice', avatar: '/static/images/avatar3.png', pinyin: 'alice' }
])

// 侧滑操作选项
const swipeOptions = [
  { text: '标记已读', style: { backgroundColor: '#07c160' } },
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
    result = result.filter(room =>
      room.name.toLowerCase().includes(searchText.value.toLowerCase())
      || room.lastMessage.toLowerCase().includes(searchText.value.toLowerCase())
    )
  }
  // 置顶会话排在前面
  return result.sort((a, b) => {
    if (a.isPinned && !b.isPinned)
      return -1
    if (!a.isPinned && b.isPinned)
      return 1
    return b.lastTime - a.lastTime
  })
})

// 总未读数
const totalUnread = computed(() => {
  return rooms.value.reduce((sum, room) => sum + room.unreadCount, 0)
})

// 格式化时间
const formatTime = (timestamp: number) => {
  const now = Date.now()
  const diff = now - timestamp
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
    const date = new Date(timestamp)
    return `${date.getMonth() + 1}/${date.getDate()}`
  }
}

// 跳转到聊天窗口
const goToChat = (room: Room | Contact) => {
  uni.navigateTo({
    url: `/pages/chat/room?id=${room.id}&name=${room.name}`
  })
}

// 处理侧滑操作
const handleSwipeAction = (event: any, room: Room) => {
  if (event.index === 0) {
    // 标记已读
    room.unreadCount = 0
    uni.showToast({ title: '已标记为已读', icon: 'success' })
  }
  else if (event.index === 1) {
    // 删除会话
    uni.showModal({
      title: '确认删除',
      content: '确定要删除该会话吗？',
      success: (res) => {
        if (res.confirm) {
          const index = rooms.value.findIndex(r => r.id === room.id)
          if (index > -1) {
            rooms.value.splice(index, 1)
          }
        }
      }
    })
  }
}

// 显示悬浮菜单
const showFabMenu = () => {
  uni.showActionSheet({
    itemList: ['发起群聊', '添加好友', '扫一扫'],
    success: (res) => {
      console.log('[v0] FAB action selected:', res.tapIndex)
      // 处理不同的操作
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

// 页面加载时请求消息订阅权限
onLoad(() => {
  // 请求订阅消息权限
  uni.requestSubscribeMessage({
    tmplIds: ['客服回复通知模板ID'],
    success: () => {
      console.log('[v0] Subscribe message success')
    }
  })
})
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
