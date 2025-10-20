# 购物车功能 API 文档

## 概述

购物车功能允许用户添加、查看、修改和删除商品，支持库存检查和数量管理。所有接口都需要用户登录认证。

## 数据模型

### Cart 购物车模型

| 字段 | 类型 | 说明 |
|------|------|------|
| id | Integer | 购物车项ID |
| user_id | Integer | 用户ID |
| product_id | BigInteger | 商品ID |
| quantity | Integer | 商品数量，默认1 |

### 关联数据

购物车项会关联商品信息，返回数据包含：
- 商品名称、图片、价格
- 库存信息
- 商品状态（仅显示上架商品）

## API 接口

### 1. 获取购物车商品列表

**接口地址：** `GET /miniapp/api/cart`

**请求头：**
```
Authorization: Bearer <JWT Token>
```

**响应示例：**
```json
{
    "code": 200,
    "message": "获取购物车成功",
    "data": [
        {
            "id": 1,
            "product_id": 7,
            "product_name": "汤姆猫",
            "product_image": "/static/temp/9012800.jpg",
            "price": 299900,
            "quantity": 2,
            "stock": 100
        },
        {
            "id": 2,
            "product_id": 15,
            "product_name": "iPhone 16 Pro",
            "product_image": "/static/temp/iphone16pro.jpg",
            "price": 799900,
            "quantity": 1,
            "stock": 50
        }
    ]
}
```

**说明：**
- 只返回上架状态（status=1）的商品
- price 字段单位为分（需要前端除以100显示）
- 自动过滤已下架的商品

### 2. 添加商品到购物车

**接口地址：** `POST /miniapp/api/cart`

**请求头：**
```
Authorization: Bearer <JWT Token>
Content-Type: application/json
```

**请求参数：**
```json
{
    "product_id": 7,     // 商品ID
    "quantity": 2        // 数量，可选，默认1
}
```

**响应示例：**
```json
{
    "code": 200,
    "message": "添加到购物车成功"
}
```

**错误响应：**
```json
{
    "code": 400,
    "message": "商品库存不足"
}
```

```json
{
    "code": 404,
    "message": "商品不存在或已下架"
}
```

**业务逻辑：**
- 自动检查商品是否存在且已上架
- 验证库存是否充足
- 如果购物车中已有该商品，则累加数量
- 数量不能超过商品库存

### 3. 更新购物车商品数量

**接口地址：** `PUT /miniapp/api/cart/{cart_item_id}`

**请求头：**
```
Authorization: Bearer <JWT Token>
Content-Type: application/json
```

**路径参数：**
- `cart_item_id`: 购物车项ID

**请求参数：**
```json
{
    "quantity": 3        // 新的数量
}
```

**响应示例：**
```json
{
    "code": 200,
    "message": "更新购物车成功"
}
```

**错误响应：**
```json
{
    "code": 404,
    "message": "购物车商品不存在"
}
```

**业务逻辑：**
- 验证购物车项归属（只能修改自己的购物车）
- 数量为0时自动删除该项
- 数量超过库存时自动调整为最大库存数
- 商品下架时返回错误

### 4. 删除购物车商品

**接口地址：** `DELETE /miniapp/api/cart/{cart_item_id}`

**请求头：**
```
Authorization: Bearer <JWT Token>
```

**路径参数：**
- `cart_item_id`: 购物车项ID

**响应示例：**
```json
{
    "code": 200,
    "message": "删除购物车商品成功"
}
```

**错误响应：**
```json
{
    "code": 404,
    "message": "购物车商品不存在"
}
```

**业务逻辑：**
- 验证购物车项归属
- 物理删除购物车项

### 5. 清空购物车

**接口地址：** `DELETE /miniapp/api/cart/clear`

**请求头：**
```
Authorization: Bearer <JWT Token>
```

**响应示例：**
```json
{
    "code": 200,
    "message": "清空购物车成功"
}
```

**业务逻辑：**
- 删除当前用户的所有购物车项
- 不影响其他用户的购物车

## 错误码说明

| 错误码 | 说明 |
|--------|------|
| 200 | 操作成功 |
| 400 | 参数错误或业务逻辑错误（如库存不足） |
| 401 | 未授权，需要登录 |
| 404 | 资源不存在（商品不存在、购物车项不存在） |
| 500 | 服务器内部错误 |

## 前端对接示例

### JavaScript 示例

```javascript
class CartAPI {
    constructor(baseURL, token) {
        this.baseURL = baseURL;
        this.token = token;
    }

    // 获取购物车列表
    async getCartItems() {
        try {
            const response = await fetch(`${this.baseURL}/miniapp/api/cart`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });
            
            const result = await response.json();
            
            if (result.code === 200) {
                return result.data.map(item => ({
                    ...item,
                    displayPrice: (item.price / 100).toFixed(2), // 转换为元
                    totalPrice: ((item.price * item.quantity) / 100).toFixed(2)
                }));
            } else {
                throw new Error(result.message);
            }
        } catch (error) {
            console.error('获取购物车失败:', error);
            throw error;
        }
    }

    // 添加到购物车
    async addToCart(productId, quantity = 1) {
        try {
            const response = await fetch(`${this.baseURL}/miniapp/api/cart`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.token}`
                },
                body: JSON.stringify({
                    product_id: productId,
                    quantity: quantity
                })
            });
            
            const result = await response.json();
            
            if (result.code !== 200) {
                throw new Error(result.message);
            }
            
            return result;
        } catch (error) {
            console.error('添加到购物车失败:', error);
            throw error;
        }
    }

    // 更新购物车商品数量
    async updateCartItem(cartItemId, quantity) {
        try {
            const response = await fetch(`${this.baseURL}/miniapp/api/cart/${cartItemId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.token}`
                },
                body: JSON.stringify({
                    quantity: quantity
                })
            });
            
            const result = await response.json();
            
            if (result.code !== 200) {
                throw new Error(result.message);
            }
            
            return result;
        } catch (error) {
            console.error('更新购物车失败:', error);
            throw error;
        }
    }

    // 删除购物车商品
    async deleteCartItem(cartItemId) {
        try {
            const response = await fetch(`${this.baseURL}/miniapp/api/cart/${cartItemId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });
            
            const result = await response.json();
            
            if (result.code !== 200) {
                throw new Error(result.message);
            }
            
            return result;
        } catch (error) {
            console.error('删除购物车商品失败:', error);
            throw error;
        }
    }

    // 清空购物车
    async clearCart() {
        try {
            const response = await fetch(`${this.baseURL}/miniapp/api/cart/clear`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });
            
            const result = await response.json();
            
            if (result.code !== 200) {
                throw new Error(result.message);
            }
            
            return result;
        } catch (error) {
            console.error('清空购物车失败:', error);
            throw error;
        }
    }

    // 计算购物车总价
    calculateTotal(cartItems) {
        return cartItems.reduce((total, item) => {
            return total + (item.price * item.quantity / 100);
        }, 0).toFixed(2);
    }

    // 计算购物车总数量
    calculateTotalQuantity(cartItems) {
        return cartItems.reduce((total, item) => total + item.quantity, 0);
    }
}

// 使用示例
const cartAPI = new CartAPI('http://127.0.0.1:5050', 'your-jwt-token');

// 获取购物车
cartAPI.getCartItems()
    .then(items => {
        console.log('购物车商品:', items);
        console.log('总价:', cartAPI.calculateTotal(items));
        console.log('总数量:', cartAPI.calculateTotalQuantity(items));
    })
    .catch(error => {
        console.error('操作失败:', error);
    });

// 添加商品到购物车
cartAPI.addToCart(7, 2)
    .then(result => {
        console.log('添加成功:', result.message);
        // 重新获取购物车列表
        return cartAPI.getCartItems();
    })
    .then(items => {
        console.log('更新后的购物车:', items);
    })
    .catch(error => {
        console.error('添加失败:', error.message);
    });
```

### Vue.js 组件示例

```vue
<template>
  <div class="cart-container">
    <div v-if="loading" class="loading">加载中...</div>
    
    <div v-else-if="cartItems.length === 0" class="empty-cart">
      购物车是空的
    </div>
    
    <div v-else>
      <div v-for="item in cartItems" :key="item.id" class="cart-item">
        <img :src="item.product_image" :alt="item.product_name" class="product-image">
        
        <div class="product-info">
          <h3>{{ item.product_name }}</h3>
          <p class="price">￥{{ (item.price / 100).toFixed(2) }}</p>
          <p class="stock">库存: {{ item.stock }}</p>
        </div>
        
        <div class="quantity-controls">
          <button @click="decreaseQuantity(item)" :disabled="item.quantity <= 1">-</button>
          <span>{{ item.quantity }}</span>
          <button @click="increaseQuantity(item)" :disabled="item.quantity >= item.stock">+</button>
        </div>
        
        <button @click="deleteItem(item)" class="delete-btn">删除</button>
      </div>
      
      <div class="cart-summary">
        <p>总计: ￥{{ totalPrice }}</p>
        <p>数量: {{ totalQuantity }}件</p>
        <button @click="clearCart" class="clear-btn">清空购物车</button>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'CartComponent',
  data() {
    return {
      cartItems: [],
      loading: false
    }
  },
  
  computed: {
    totalPrice() {
      return this.cartItems.reduce((total, item) => {
        return total + (item.price * item.quantity / 100);
      }, 0).toFixed(2);
    },
    
    totalQuantity() {
      return this.cartItems.reduce((total, item) => total + item.quantity, 0);
    }
  },
  
  mounted() {
    this.loadCartItems();
  },
  
  methods: {
    async loadCartItems() {
      this.loading = true;
      try {
        const response = await this.$http.get('/miniapp/api/cart');
        this.cartItems = response.data.data;
      } catch (error) {
        this.$message.error('加载购物车失败: ' + error.message);
      } finally {
        this.loading = false;
      }
    },
    
    async updateQuantity(item, newQuantity) {
      try {
        await this.$http.put(`/miniapp/api/cart/${item.id}`, {
          quantity: newQuantity
        });
        
        // 如果数量为0，从列表中移除
        if (newQuantity === 0) {
          this.cartItems = this.cartItems.filter(i => i.id !== item.id);
        } else {
          item.quantity = newQuantity;
        }
        
        this.$message.success('更新成功');
      } catch (error) {
        this.$message.error('更新失败: ' + error.message);
      }
    },
    
    increaseQuantity(item) {
      if (item.quantity < item.stock) {
        this.updateQuantity(item, item.quantity + 1);
      }
    },
    
    decreaseQuantity(item) {
      if (item.quantity > 1) {
        this.updateQuantity(item, item.quantity - 1);
      }
    },
    
    async deleteItem(item) {
      try {
        await this.$http.delete(`/miniapp/api/cart/${item.id}`);
        this.cartItems = this.cartItems.filter(i => i.id !== item.id);
        this.$message.success('删除成功');
      } catch (error) {
        this.$message.error('删除失败: ' + error.message);
      }
    },
    
    async clearCart() {
      if (confirm('确定要清空购物车吗？')) {
        try {
          await this.$http.delete('/miniapp/api/cart/clear');
          this.cartItems = [];
          this.$message.success('购物车已清空');
        } catch (error) {
          this.$message.error('清空失败: ' + error.message);
        }
      }
    }
  }
}
</script>

<style scoped>
.cart-container {
  padding: 20px;
}

.cart-item {
  display: flex;
  align-items: center;
  padding: 15px;
  border-bottom: 1px solid #eee;
}

.product-image {
  width: 80px;
  height: 80px;
  object-fit: cover;
  margin-right: 15px;
}

.product-info {
  flex: 1;
}

.quantity-controls {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 0 15px;
}

.quantity-controls button {
  width: 30px;
  height: 30px;
  border: 1px solid #ddd;
  background: white;
  cursor: pointer;
}

.quantity-controls button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.delete-btn, .clear-btn {
  background: #ff4757;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
}

.cart-summary {
  margin-top: 20px;
  padding: 15px;
  background: #f8f9fa;
  border-radius: 4px;
}

.empty-cart, .loading {
  text-align: center;
  padding: 50px;
  color: #666;
}
</style>
```

## 注意事项

1. **价格单位**：API返回的价格单位为分，前端需要除以100显示为元
2. **库存检查**：添加和更新时会自动检查库存，超出部分会被调整
3. **商品状态**：只有上架的商品才会在购物车中显示
4. **用户隔离**：每个用户只能操作自己的购物车
5. **数据同步**：修改购物车后建议重新获取列表以确保数据一致性
6. **错误处理**：前端应该处理所有可能的错误情况并给用户友好提示

## 业务流程

### 典型的购物车使用流程：

1. **浏览商品** → 商品详情页
2. **添加到购物车** → `POST /cart` 
3. **查看购物车** → `GET /cart`
4. **调整数量** → `PUT /cart/{id}`
5. **删除商品** → `DELETE /cart/{id}`
6. **结算订单** → 转到订单模块

### 推荐的前端实现：

1. 在商品列表和详情页提供"加入购物车"按钮
2. 在页面头部显示购物车数量徽章
3. 提供购物车浮层或独立页面
4. 支持批量选择和批量操作
5. 实时计算总价和优惠信息
6. 在库存不足时给出明确提示