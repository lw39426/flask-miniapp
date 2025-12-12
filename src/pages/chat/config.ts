/**
 * 聊天系统配置
 */

// 消息订阅模板 ID（需要在微信小程序后台配置）
export const MESSAGE_TEMPLATE_IDS = {
  // 客服回复通知
  SERVICE_REPLY: 'YOUR_TEMPLATE_ID_HERE',
  // 新消息通知
  NEW_MESSAGE: 'YOUR_TEMPLATE_ID_HERE',
  // 群聊 @ 提醒
  GROUP_MENTION: 'YOUR_TEMPLATE_ID_HERE'
}

// 聊天室类型
export const ROOM_TYPES = {
  PRIVATE: 'private', // 私聊
  GROUP: 'group' // 群聊
} as const

// 消息类型
export const MESSAGE_TYPES = {
  TEXT: 'text', // 文本
  IMAGE: 'image', // 图片
  FILE: 'file' // 文件
} as const

// 用户类型
export const USER_TYPES = {
  NORMAL: 'NormalUser', // 普通用户
  ADMIN: 'AdminUser' // 管理员
} as const

// 分页配置
export const PAGINATION = {
  ROOMS_PER_PAGE: 20, // 聊天室列表每页数量
  MESSAGES_PER_PAGE: 20, // 消息列表每页数量
  MAX_ROOMS_PER_PAGE: 20, // 聊天室列表最大每页数量
  MAX_MESSAGES_PER_PAGE: 100 // 消息列表最大每页数量
}

// 默认头像
export const DEFAULT_AVATARS = {
  USER: '/static/images/avatar-default.png',
  GROUP: '/static/images/group-default.png',
  SERVICE: '/static/images/customer-service.png'
}

// WebSocket 配置（待实现）
export const WEBSOCKET_CONFIG = {
  // URL: 'http://localhost:5050',
  URL: 'http://193.112.118.107:5050', // WebSocket 连接地址
  RECONNECT_INTERVAL: 3000, // 重连间隔（毫秒）
  MAX_RECONNECT_ATTEMPTS: 5 // 最大重连次数
}

// 消息状态
export const MESSAGE_STATUS = {
  SENDING: 'sending', // 发送中
  SENT: 'sent', // 已发送
  DELIVERED: 'delivered', // 已送达
  READ: 'read', // 已读
  FAILED: 'failed' // 发送失败
} as const

// 聊天功能开关
export const FEATURE_FLAGS = {
  ENABLE_VOICE_MESSAGE: false, // 语音消息
  ENABLE_VIDEO_MESSAGE: false, // 视频消息
  ENABLE_MESSAGE_RECALL: false, // 消息撤回
  ENABLE_MESSAGE_FORWARD: false, // 消息转发
  ENABLE_GROUP_AT: false, // 群聊 @ 功能
  ENABLE_READ_RECEIPT: false // 已读回执
}
