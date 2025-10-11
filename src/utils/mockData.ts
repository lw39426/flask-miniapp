import type { Comment } from '@/api/comment'

// 模拟评论数据（用于开发测试）
export const mockComments: Comment[] = [
  {
    id: 1,
    article_id: 1,
    user_id: 2,
    content: '这篇文章写得很好，学到了很多东西！',
    created_at: '2025-09-24 16:30:00',
    updated_at: '2025-09-24 16:30:00',
    parent_id: null,
    level: 1,
    like_count: 5,
    reply_count: 2,
    is_deleted: false,
    status: 'approved',
    user_nickname: '张三',
    user_avatar: '/static/images/default-avatar.svg',
    user_role: 'user',
    is_author: false,
    reply_to_user_id: null,
    reply_to_nickname: null,
    is_liked: false,
    children: [
      {
        id: 2,
        article_id: 1,
        user_id: 1,
        content: '谢谢你的支持！',
        created_at: '2025-09-24 16:45:00',
        updated_at: '2025-09-24 16:45:00',
        parent_id: 1,
        level: 2,
        like_count: 2,
        reply_count: 0,
        is_deleted: false,
        status: 'approved',
        user_nickname: '文章作者',
        user_avatar: '/static/images/default-avatar.svg',
        user_role: 'author',
        is_author: true,
        reply_to_user_id: 2,
        reply_to_nickname: '张三',
        is_liked: true,
        children: []
      },
      {
        id: 3,
        article_id: 1,
        user_id: 3,
        content: '我也觉得很有用，已经收藏了！',
        created_at: '2025-09-24 17:00:00',
        updated_at: '2025-09-24 17:00:00',
        parent_id: 1,
        level: 2,
        like_count: 1,
        reply_count: 0,
        is_deleted: false,
        status: 'approved',
        user_nickname: '李四',
        user_avatar: '/static/images/default-avatar.svg',
        user_role: 'user',
        is_author: false,
        reply_to_user_id: 2,
        reply_to_nickname: '张三',
        is_liked: false,
        children: []
      }
    ]
  },
  {
    id: 4,
    article_id: 1,
    user_id: 4,
    content: '有个小问题想请教一下，关于第三部分的内容...',
    created_at: '2025-09-24 17:15:00',
    updated_at: '2025-09-24 17:15:00',
    parent_id: null,
    level: 1,
    like_count: 1,
    reply_count: 0,
    is_deleted: false,
    status: 'approved',
    user_nickname: '王五',
    user_avatar: '/static/images/default-avatar.svg',
    user_role: 'user',
    is_author: false,
    reply_to_user_id: null,
    reply_to_nickname: null,
    is_liked: false,
    children: []
  }
]

// 模拟评论统计数据
export const mockCommentStats = {
  total_comments: 4,
  root_comments: 2,
  reply_comments: 2,
  total_likes: 9,
  today_comments: 4
}
