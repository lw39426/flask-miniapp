# 评论系统前端接口设计文档

## 📋 概述

本文档为前端开发者提供评论系统的完整API接口规范，包括数据结构、请求示例和响应格式。

## 🔧 基础配置

### API Base URL
```
http://localhost:5050/api/comments
```

### 认证方式
所有需要用户身份的接口都需要在请求头中包含认证信息：

```javascript
// 示例：使用JWT认证
headers: {
  'Content-Type': 'application/json',
  'Authorization': 'Bearer your_jwt_token'
}
```

## 📡 API接口详情

### 1. 获取文章评论列表

**接口地址**: `GET /api/comments/article/{article_id}`

**请求参数**:
```javascript
// URL参数
article_id: number  // 文章ID

// Query参数（可选）
{
  page: 1,           // 页码，默认1
  per_page: 20,      // 每页数量，默认20，最大100
  sort_by: 'created_at',  // 排序字段：created_at | like_count
  order: 'desc'      // 排序方向：desc | asc
}
```

**请求示例**:
```javascript
// 获取文章ID为1的评论，按时间倒序，每页20条
fetch('/api/comments/article/1?page=1&per_page=20&sort_by=created_at&order=desc')
  .then(response => response.json())
  .then(data => console.log(data));
```

**响应格式**:
```json
{
  "success": true,
  "message": "获取成功",
  "data": {
    "comments": [
      {
        "id": 1,
        "article_id": 1,
        "user_id": 123,
        "content": "这是一条评论",
        "created_at": "2025-09-24 17:00:00",
        "updated_at": "2025-09-24 17:00:00",
        "parent_id": null,
        "level": 1,
        "like_count": 5,
        "reply_count": 2,
        "is_deleted": false,
        "status": "approved",
        "user_nickname": "张三",
        "user_avatar": "/static/images/avatar.jpg",
        "user_role": "author",
        "is_author": true,
        "reply_to_user_id": null,
        "reply_to_nickname": null,
        "is_liked": false,
        "children": [
          {
            "id": 2,
            "parent_id": 1,
            "level": 2,
            "content": "回复内容",
            "reply_to_user_id": 123,
            "reply_to_nickname": "张三",
            "user_nickname": "李四",
            "user_role": "user",
            "is_author": false,
            "like_count": 1,
            "is_liked": true,
            "children": []
          }
        ]
      }
    ],
    "pagination": {
      "page": 1,
      "per_page": 20,
      "total": 50,
      "pages": 3,
      "has_prev": false,
      "has_next": true
    }
  }
}
```

### 2. 创建评论

**接口地址**: `POST /api/comments/create`

**认证要求**: 需要登录

**请求体**:
```json
{
  "article_id": 1,
  "content": "评论内容",
  "parent_id": null,        // 可选，楼中楼回复时填写父评论ID
  "reply_to_user_id": null  // 可选，回复特定用户时填写用户ID
}
```

**请求示例**:
```javascript
// 创建一级评论
fetch('/api/comments/create', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer your_token'
  },
  body: JSON.stringify({
    article_id: 1,
    content: '这是一条新评论'
  })
});

// 创建回复评论
fetch('/api/comments/create', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer your_token'
  },
  body: JSON.stringify({
    article_id: 1,
    content: '回复内容',
    parent_id: 1,           // 父评论ID
    reply_to_user_id: 123   // 回复的用户ID
  })
});
```

**响应格式**:
```json
{
  "success": true,
  "message": "评论发表成功",
  "data": {
    "comment": {
      "id": 3,
      "article_id": 1,
      "content": "评论内容",
      "created_at": "2025-09-24 17:00:00",
      "user_nickname": "当前用户",
      "user_avatar": "/static/images/user.jpg",
      "user_role": "user",
      "is_author": false,
      "level": 1,
      "like_count": 0,
      "is_liked": false
    }
  }
}
```

### 3. 点赞/取消点赞

**接口地址**: `POST /api/comments/{comment_id}/like`

**认证要求**: 需要登录

**请求示例**:
```javascript
// 点赞评论ID为1的评论
fetch('/api/comments/1/like', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer your_token'
  }
});
```

**响应格式**:
```json
{
  "success": true,
  "message": "点赞成功",
  "data": {
    "is_liked": true,
    "like_count": 6
  }
}
```

### 4. 删除评论

**接口地址**: `DELETE /api/comments/{comment_id}/delete`

**认证要求**: 需要登录（只能删除自己的评论或管理员删除）

**请求示例**:
```javascript
fetch('/api/comments/1/delete', {
  method: 'DELETE',
  headers: {
    'Authorization': 'Bearer your_token'
  }
});
```

**响应格式**:
```json
{
  "success": true,
  "message": "评论删除成功"
}
```

### 5. 获取用户评论

**接口地址**: `GET /api/comments/user/{user_id}`

**请求参数**:
```javascript
// Query参数（可选）
{
  page: 1,
  per_page: 20
}
```

**响应格式**:
```json
{
  "success": true,
  "data": {
    "comments": [
      {
        "id": 1,
        "article_id": 1,
        "article_title": "文章标题",
        "content": "评论内容",
        "created_at": "2025-09-24 17:00:00",
        "like_count": 5,
        "reply_count": 2
      }
    ],
    "pagination": {
      "page": 1,
      "total": 10
    }
  }
}
```

### 6. 获取评论统计

**接口地址**: `GET /api/comments/statistics/{article_id}`

**请求示例**:
```javascript
fetch('/api/comments/statistics/1')
  .then(response => response.json())
  .then(data => console.log(data));
```

**响应格式**:
```json
{
  "success": true,
  "data": {
    "total_comments": 50,
    "root_comments": 30,
    "reply_comments": 20,
    "total_likes": 150,
    "today_comments": 5
  }
}
```

## 🎨 前端组件设计建议

### 评论组件结构

```javascript
// CommentSystem.vue
<template>
  <div class="comment-system">
    <!-- 评论统计 -->
    <CommentStats :stats="statistics" />
    
    <!-- 发表评论 -->
    <CommentForm 
      v-if="currentUser"
      :article-id="articleId"
      :reply-target="replyTarget"
      @submit="handleSubmit"
      @cancel="cancelReply"
    />
    
    <!-- 评论列表 -->
    <CommentList 
      :comments="comments"
      :current-user="currentUser"
      @reply="handleReply"
      @like="handleLike"
      @delete="handleDelete"
    />
    
    <!-- 分页 -->
    <Pagination 
      :pagination="pagination"
      @change="loadComments"
    />
  </div>
</template>
```

### 数据状态管理

```javascript
// 使用Vuex或Pinia管理评论状态
const commentStore = {
  state: {
    comments: [],
    statistics: {},
    pagination: {},
    loading: false,
    replyTarget: null
  },
  
  actions: {
    async loadComments({ commit }, { articleId, page = 1, sortBy = 'created_at' }) {
      commit('SET_LOADING', true);
      try {
        const response = await api.getArticleComments(articleId, { page, sort_by: sortBy });
        commit('SET_COMMENTS', response.data.comments);
        commit('SET_PAGINATION', response.data.pagination);
      } catch (error) {
        console.error('加载评论失败:', error);
      } finally {
        commit('SET_LOADING', false);
      }
    },
    
    async createComment({ dispatch }, commentData) {
      try {
        await api.createComment(commentData);
        // 重新加载评论列表
        dispatch('loadComments', { articleId: commentData.article_id });
      } catch (error) {
        console.error('发表评论失败:', error);
      }
    }
  }
};
```

### API封装示例

```javascript
// api/comment.js
class CommentAPI {
  constructor(baseURL = '/api/comments') {
    this.baseURL = baseURL;
  }
  
  async getArticleComments(articleId, params = {}) {
    const query = new URLSearchParams(params).toString();
    const response = await fetch(`${this.baseURL}/article/${articleId}?${query}`);
    return response.json();
  }
  
  async createComment(data) {
    const response = await fetch(`${this.baseURL}/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.getToken()}`
      },
      body: JSON.stringify(data)
    });
    return response.json();
  }
  
  async toggleLike(commentId) {
    const response = await fetch(`${this.baseURL}/${commentId}/like`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.getToken()}`
      }
    });
    return response.json();
  }
  
  async deleteComment(commentId) {
    const response = await fetch(`${this.baseURL}/${commentId}/delete`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${this.getToken()}`
      }
    });
    return response.json();
  }
  
  getToken() {
    // 根据实际认证方式获取token
    return localStorage.getItem('token') || '';
  }
}

export const commentAPI = new CommentAPI();
```

## 🎯 特殊功能实现

### 1. 楼中楼展示

```javascript
// 递归渲染评论组件
<template>
  <div class="comment-item" :class="`level-${comment.level}`">
    <div class="comment-content">
      <!-- 评论内容 -->
      <div class="comment-body">
        <span v-if="comment.reply_to_nickname" class="reply-to">
          回复 @{{ comment.reply_to_nickname }}：
        </span>
        {{ comment.content }}
      </div>
      
      <!-- 作者标识 -->
      <span v-if="comment.is_author" class="author-badge">作者</span>
    </div>
    
    <!-- 子评论递归渲染 -->
    <div v-if="comment.children && comment.children.length" class="children-comments">
      <CommentItem 
        v-for="child in comment.children"
        :key="child.id"
        :comment="child"
        :current-user="currentUser"
        @reply="$emit('reply', $event)"
        @like="$emit('like', $event)"
      />
    </div>
  </div>
</template>
```

### 2. 实时点赞更新

```javascript
// 点赞功能实现
async handleLike(commentId) {
  try {
    const response = await commentAPI.toggleLike(commentId);
    if (response.success) {
      // 更新本地状态
      this.updateCommentLike(commentId, response.data);
    }
  } catch (error) {
    this.$message.error('操作失败');
  }
},

updateCommentLike(commentId, { is_liked, like_count }) {
  const updateComment = (comments) => {
    comments.forEach(comment => {
      if (comment.id === commentId) {
        comment.is_liked = is_liked;
        comment.like_count = like_count;
      }
      if (comment.children) {
        updateComment(comment.children);
      }
    });
  };
  updateComment(this.comments);
}
```

### 3. 错误处理

```javascript
// 统一错误处理
const handleAPIError = (error, defaultMessage = '操作失败') => {
  if (error.response) {
    const { status, data } = error.response;
    switch (status) {
      case 401:
        message.error('请先登录');
        // 跳转到登录页
        break;
      case 403:
        message.error('权限不足');
        break;
      case 400:
        message.error(data.message || '请求参数错误');
        break;
      default:
        message.error(data.message || defaultMessage);
    }
  } else {
    message.error('网络错误，请稍后重试');
  }
};
```

## 📱 响应式设计建议

```css
/* 评论系统样式 */
.comment-system {
  max-width: 800px;
  margin: 0 auto;
}

.comment-item {
  border-left: 2px solid #f0f0f0;
  padding-left: 16px;
  margin-bottom: 16px;
}

.comment-item.level-2 {
  margin-left: 20px;
  border-left-color: #e6f7ff;
}

.comment-item.level-3 {
  margin-left: 40px;
  border-left-color: #f6ffed;
}

.author-badge {
  background: #1890ff;
  color: white;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 12px;
}

.reply-to {
  color: #1890ff;
  font-weight: 500;
}

/* 移动端适配 */
@media (max-width: 768px) {
  .comment-item.level-2 {
    margin-left: 10px;
  }
  
  .comment-item.level-3 {
    margin-left: 20px;
  }
}
```

## 🔍 调试建议

1. **开发环境下启用详细日志**
2. **使用浏览器开发者工具监控网络请求**
3. **实现请求/响应拦截器记录API调用**
4. **添加加载状态和错误提示**

---

**文档版本**: v1.0  
**更新时间**: 2025-09-24  
**联系方式**: 如有问题请查看 `applications/docs/comment_system_guide.md`