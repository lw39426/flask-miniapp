# 用户收藏功能 API 文档

## 概述

用户收藏功能允许用户收藏文章和商品，支持收藏状态切换、收藏列表查看、收藏统计等操作。

## 数据模型

### Favorite 收藏模型

| 字段 | 类型 | 说明 |
|------|------|------|
| id | Integer | 收藏ID |
| user_id | Integer | 用户ID |
| item_type | String | 收藏类型：'article'（文章）或 'product'（商品） |
| item_id | Integer | 收藏项目ID |
| created_at | DateTime | 收藏时间 |
| item_title | String | 收藏项目标题（冗余字段） |
| item_image | String | 收藏项目图片（冗余字段） |
| item_description | Text | 收藏项目描述（冗余字段） |

## API 接口

### 1. 切换收藏状态

**接口地址：** `POST /miniapp/api/favorite/toggle`

**请求头：**
```
Authorization: Bearer <JWT Token>
Content-Type: application/json
```

**请求参数：**
```json
{
    "item_type": "product",  // 收藏类型：'article' 或 'product'
    "item_id": 1            // 收藏项目ID
}
```

**响应示例：**
```json
{
    "code": 200,
    "message": "收藏成功",
    "data": {
        "is_favorited": true,
        "item_type": "product",
        "item_id": 1
    }
}
```

### 2. 检查收藏状态

**接口地址：** `POST /miniapp/api/favorite/check`

**请求头：**
```
Authorization: Bearer <JWT Token>
Content-Type: application/json
```

**请求参数：**
```json
{
    "item_type": "product",
    "item_id": 1
}
```

**响应示例：**
```json
{
    "code": 200,
    "message": "获取成功",
    "data": {
        "is_favorited": false,
        "item_type": "product",
        "item_id": 1
    }
}
```

### 3. 获取收藏列表

**接口地址：** `GET /miniapp/api/favorite/list`

**请求头：**
```
Authorization: Bearer <JWT Token>
```

**查询参数：**
- `type`: 收藏类型过滤，可选值：'article', 'product'，不传则返回全部
- `page`: 页码，默认1
- `per_page`: 每页数量，默认10，最大50

**请求示例：**
```
GET /miniapp/api/favorite/list?type=product&page=1&per_page=10
```

**响应示例：**
```json
{
    "code": 200,
    "message": "获取成功",
    "data": {
        "favorites": [
            {
                "id": 1,
                "user_id": 1,
                "item_type": "product",
                "item_id": 1,
                "created_at": "2024-01-01 10:00:00",
                "item_title": "iPhone 16 Pro",
                "item_image": "/static/temp/iphone16pro.jpg",
                "item_description": "最新的iPhone产品",
                "item_detail": {
                    "id": 1,
                    "name": "iPhone 16 Pro",
                    "price": 799900,
                    "sale_price": 699900,
                    "stock": 100,
                    "main_image": "/static/temp/iphone16pro.jpg",
                    "status": 1,
                    "sales": 500,
                    "brand": "Apple",
                    "category_name": "手机数码"
                }
            }
        ],
        "pagination": {
            "page": 1,
            "per_page": 10,
            "total": 1,
            "pages": 1,
            "has_next": false,
            "has_prev": false
        }
    }
}
```

### 4. 获取收藏统计

**接口地址：** `GET /miniapp/api/favorite/count`

**请求头：**
```
Authorization: Bearer <JWT Token>
```

**响应示例：**
```json
{
    "code": 200,
    "message": "获取成功",
    "data": {
        "total": 15,      // 总收藏数
        "article": 8,     // 文章收藏数
        "product": 7      // 商品收藏数
    }
}
```

### 5. 批量取消收藏

**接口地址：** `POST /miniapp/api/favorite/remove`

**请求头：**
```
Authorization: Bearer <JWT Token>
Content-Type: application/json
```

**请求参数：**
```json
{
    "favorite_ids": [1, 2, 3]  // 收藏ID数组
}
```

**响应示例：**
```json
{
    "code": 200,
    "message": "成功取消 3 个收藏",
    "data": {
        "removed_count": 3
    }
}
```

### 6. 清空收藏

**接口地址：** `POST /miniapp/api/favorite/clear`

**请求头：**
```
Authorization: Bearer <JWT Token>
Content-Type: application/json
```

**请求参数：**
```json
{
    "item_type": "product"  // 可选，指定清空的类型，不传则清空全部
}
```

**响应示例：**
```json
{
    "code": 200,
    "message": "成功清空 product 收藏，共 5 条",
    "data": {
        "removed_count": 5,
        "item_type": "product"
    }
}
```

## 模型方法说明

### User 模型新增方法

```python
# 添加收藏
user.add_favorite('product', 1)

# 取消收藏
user.remove_favorite('product', 1)

# 检查是否收藏
user.is_favorite('product', 1)

# 获取收藏列表
user.get_favorites(item_type='product', page=1, per_page=10)

# 获取收藏数量
user.get_favorite_count('product')
```

### Article 模型新增属性和方法

```python
# 获取收藏数量
article.favorite_count

# 检查是否被用户收藏
article.is_favorited_by_user(user_id)

# 转换为字典时包含收藏状态
article.to_dict(current_user_id=user_id)
```

### Product 模型新增属性和方法

```python
# 获取收藏数量
product.favorite_count

# 检查是否被用户收藏  
product.is_favorited_by_user(user_id)

# 转换为字典时包含收藏状态
product.to_dict(current_user_id=user_id)
```

### Favorite 模型静态方法

```python
# 切换收藏状态
is_favorited, message = Favorite.toggle_favorite(user_id, 'product', product_id)

# 检查收藏状态
is_favorited = Favorite.is_favorited(user_id, 'product', product_id)

# 获取用户收藏列表
favorites = Favorite.get_user_favorites(user_id, item_type='product', page=1, per_page=10)
```

## 错误码说明

| 错误码 | 说明 |
|--------|------|
| 200 | 操作成功 |
| 400 | 参数错误 |
| 401 | 未授权，需要登录 |
| 404 | 资源不存在 |
| 500 | 服务器内部错误 |

## 使用示例

### 前端 JavaScript 示例

```javascript
// 切换收藏状态
async function toggleFavorite(itemType, itemId) {
    try {
        const response = await fetch('/miniapp/api/favorite/toggle', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                item_type: itemType,
                item_id: itemId
            })
        });
        
        const result = await response.json();
        
        if (result.code === 200) {
            console.log(result.message);
            // 更新UI状态
            updateFavoriteUI(result.data.is_favorited);
        } else {
            console.error(result.message);
        }
    } catch (error) {
        console.error('请求失败:', error);
    }
}

// 获取收藏列表
async function getFavoriteList(type = null, page = 1) {
    try {
        let url = `/miniapp/api/favorite/list?page=${page}`;
        if (type) {
            url += `&type=${type}`;
        }
        
        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        const result = await response.json();
        
        if (result.code === 200) {
            renderFavoriteList(result.data.favorites);
            renderPagination(result.data.pagination);
        }
    } catch (error) {
        console.error('获取收藏列表失败:', error);
    }
}
```

## 数据库索引

收藏表包含以下索引以优化性能：

1. `uk_user_item_favorite`: 联合唯一索引，防止重复收藏
2. `idx_favorites_user_id`: 用户ID索引
3. `idx_favorites_type_id`: 收藏类型和项目ID联合索引

## 注意事项

1. 只能收藏已发布的文章（status=1）和上架的商品（status=1）
2. 每个用户对同一项目只能收藏一次
3. 收藏列表支持分页，单次最多返回50条记录
4. 收藏记录包含冗余字段以提升查询性能
5. 支持逻辑删除，取消收藏会直接删除记录
6. 所有接口都需要JWT认证