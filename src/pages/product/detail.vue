<template>
  <view class="product-detail-page">
    <!-- 自定义导航栏 -->
    <view class="nav-bar" :style="{ paddingTop: `${safeAreaTop}px` }">
      <view class="nav-back" @tap="goBack">
        <text class="back-icon">←</text>
      </view>
      <text class="nav-title">{{ '商品详情' }}</text>
      <view class="nav-actions">
        <!-- <text class="nav-action" @tap="shareArticle">分享</text> -->
      </view>
    </view>

    <scroll-view v-if="product" :style="{ paddingTop: `${navbarHeight}px` }" class="detail-scroll" :scroll-y="true">
      <!-- 商品图片 -->
      <view class="mb-[20rpx] bg-[#fff] py-[20rpx]">
        <swiper class="image-swiper" :indicator-dots="true" autoplay circular>
          <swiper-item v-for="(image, index) in productImages" :key="index">
            <image class="swiper-image" :src="image || ''" mode="aspectFit" />
          </swiper-item>
        </swiper>
      </view>

      <!-- 商品信息 -->
      <view class="product-info">
        <view class="product-header">
          <text class="product-name">{{ product.name }}</text>
          <text class="product-price">¥{{ product.price }}</text>
        </view>

        <view class="product-meta">
          <text class="meta-item">库存: {{ product.stock }}</text>
          <text class="meta-item">销量: {{ product.sales || 0 }}</text>
          <text v-if="product.brand" class="meta-item">品牌: {{ product.brand }}</text>
          <text class="meta-item">商品ID: {{ productId }}</text>
          <text class="meta-item">登录状态: {{ tokenStore.hasLogin ? '已登录' : '未登录' }}</text>
        </view>

        <view v-if="product.description" class="product-desc">
          <text class="desc-title">商品描述</text>
          <text class="desc-content">{{ product.description }}</text>
        </view>
        <view v-else class="product-desc">
          <text class="desc-title">商品描述</text>
          <text class="desc-empty">暂无描述</text>
        </view>
      </view>

      <!-- 商品详情HTML/Markdown -->
      <view v-if="product.detail_html" class="product-detail-html">
        <text class="section-title">商品详情</text>
        <rich-text :nodes="product.detail_html" />
      </view>
      <view v-else class="product-detail-html">
        <text class="section-title">商品详情</text>
        <text class="detail-empty">暂无详情</text>
      </view>

      <!-- 评论区域 -->
      <view v-if="productId != null" class="comment-section">
        <CommentSystem
          :product-id="productId"
          :current-user="currentUser"
          @update-stats="updateCommentStats"
        />
      </view>
    </scroll-view>

    <!-- 加载状态 -->
    <view v-if="loading" class="loading-container">
      <text class="loading-text">加载中...</text>
    </view>

    <!-- 空状态 -->
    <view v-if="!loading && !product" class="empty-container">
      <text class="empty-title">暂无商品信息</text>
      <text class="empty-subtitle">请稍后重试或返回上一页</text>
      <button class="empty-action" @tap="goBack">
        返回
      </button>
    </view>

    <!-- 底部操作栏 -->
    <view v-if="product" class="bottom-bar">
      <view class="quantity-section">
        <text class="quantity-label">数量:</text>
        <view class="quantity-control">
          <view class="quantity-btn minus" :class="{ disabled: quantity <= 1 }" @tap="decreaseQuantity">
            -
          </view>
          <text class="quantity-value">{{ quantity }}</text>
          <view class="quantity-btn plus" :class="{ disabled: quantity >= product.stock }" @tap="increaseQuantity">
            +
          </view>
        </view>
        <text class="stock-info">库存: {{ product.stock }}</text>
      </view>
      <view class="action-buttons">
        <button class="btn-favorite" @tap="toggleFavorite">
          <text class="btn-icon">{{ isFavorited ? '❤️' : '🤍' }}</text>
        </button>
        <button class="btn-cart" :disabled="product.stock <= 0 || isAddingToCart" @tap="addToCart">
          {{
            product.stock <= 0 ? '加入购物车'
            : isAddingToCart ? '添加中...'
              : '加入购物车'
          }}
        </button>
        <button class="btn-buy" :disabled="product.stock <= 0 || isBuying" @tap="buyNow">
          {{
            product.stock <= 0 ? '立即购买'
            : isBuying ? '处理中...'
              : '立即购买'
          }}
        </button>
      </view>
    </view>
  </view>
</template>

<script lang="ts" setup>
import type { ProductDetail } from '@/api/category'
import type { CommentStatistics } from '@/api/comment'
import { onLoad } from '@dcloudio/uni-app'
import { computed, onMounted, ref } from 'vue'
import { addToCart as addToCartAPI } from '@/api/cart'
import { getProductDetail } from '@/api/category'
import { checkFavorite, FavoriteType, toggleFavorite as toggleFavoriteApi } from '@/api/favorite'
import CommentSystem from '@/components/CommentSystem.vue'
import { useNavbar } from '@/hooks/useNavbar'
import { useTokenStore } from '@/store/token'

definePage({
  style: {
    navigationStyle: 'custom',
    navigationBarTitleText: '商品详情',
  },
})

// 导航栏适配
const { safeAreaTop, navbarHeight } = useNavbar()

// 响应式数据
const product = ref<ProductDetail>()
const loading = ref(false)
const productId = ref<number>()
const isFavorited = ref(false) // 收藏状态
const quantity = ref(1) // 购买数量
const isAddingToCart = ref(false) // 防止重复添加购物车
const isBuying = ref(false) // 防止重复购买

// 获取token store
const tokenStore = useTokenStore()

const commentStats = ref<CommentStatistics | null>(null)
const currentUser = ref({
  id: 1,
  nickname: '当前用户',
  avatar: '/static/images/default-avatar.svg'
})

// 计算属性
const productImages = computed(() => {
  if (!product.value)
    return []
  const images = [product.value.main_image]
  if (product.value.images && product.value.images.length > 0) {
    images.push(...product.value.images)
  }
  return images
})

// 获取页面参数 - 通过onLoad生命周期获取
const initPageData = (options: any) => {
  console.log('页面参数:', options)

  if (options.id) {
    productId.value = Number.parseInt(options.id) || 1
    console.log('设置商品ID:', productId.value)
  }
  else {
    console.error('缺少商品ID参数')
    uni.showToast({
      title: '商品参数错误',
      icon: 'none'
    })
  }
}

// 加载商品详情
const loadProductDetail = async () => {
  if (!productId.value)
    return

  try {
    loading.value = true
    const res = await getProductDetail(productId.value)
    product.value = res.data

    // 检查收藏状态
    if (tokenStore.hasLogin) {
      // eslint-disable-next-line ts/no-use-before-define
      await checkFavoriteStatus()
    }
  }
  catch (error) {
    console.error('获取商品详情失败:', error)
    product.value = {
      brand: '',
      category_id: 1,
      category_name: '动漫',
      description: '名侦探柯南主角，工藤新一',
      detail_html: '<h3><span style="font-size: 14px;">人物介绍</span></h3><p><span style="font-size: 14px;"><strong>工藤新一</strong></span><span style="font-size: 14px;">（日语：工藤新一）原是高中生侦探，后因被灌下APTX-4869 而身体缩小变成7岁小孩，因某些原因，便化名为**江户川柯南**（日语：江戸川コナン／えどがわ コナン</span><span style="font-size: 14px;"><sup> </sup></span><span style="font-size: 14px;">Edogawa Konan，是日本漫画家青山刚昌所创作的漫画作品《名侦探柯南》中的主人公。</span></p><p><img src="http://127.0.0.1:5050/static/temp/846e.png" alt="846e.png" data-href="http://127.0.0.1:5050/static/temp/846e.png" style="width: 100%;"/></p><h4><span style="font-size: 14px;">创造与构思</span></h4><p><span style="font-size: 14px;">将工藤新一变成一个小孩的想法，来源于《三毛猫福尔摩斯系列》的主角。青山刚昌的想法是，这只猫将表明解决此案件所需的关键证据。由孩子求助的新一所做的表演是为帮助周围的人进行调查。而新一的灵感来自于虚构的私家侦探工藤俊作。</span></p><p><span style="font-size: 14px;">工藤新一取自日本经典侦探连续剧《侦探物语》侦探物语的主角工藤俊作和日本科幻小说家星新一。 江户川柯南命名来源则取自日本推理小说 始祖 江户川乱步 和英国名推理小说家柯南·道尔。而青山透露过，他的责任编辑反对取“柯南”这个名字，因为与动画作品《未来少年柯南》中的主人公同名，并建议改名他为道尔。但青山坚持要使用柯南这个名字，认为它将会取代《未来少年柯南》。</span></p><p><span style="font-size: 14px;">在《绀青之拳》中，柯南化名为“亚瑟·平井”，同样取自这两位著名推理小说家。其中“平井”取自江户川乱步的本名平井太郎。</span></p><p><br></p>',
      id: 15,
      images: [
      ],
      main_image: '',
      name: '工藤新一',
      price: 0,
      sales: 0,
      stock: 2
    }
    await uni.showToast({
      title: '获取商品详情失败',
      icon: 'error'
    })
  }
  finally {
    loading.value = false
  }
}

// 返回上一页
const goBack = () => {
  uni.navigateBack()
}

// 增加数量
const increaseQuantity = () => {
  if (product.value && quantity.value < product.value.stock) {
    quantity.value++
  }
}

// 减少数量
const decreaseQuantity = () => {
  if (quantity.value > 1) {
    quantity.value--
  }
}

// 加入购物车
const addToCart = async () => {
  // 防抖处理：如果正在添加，直接返回
  if (isAddingToCart.value) {
    console.log('正在添加到购物车，跳过重复请求')
    return
  }

  console.log('点击加入购物车')
  console.log('商品信息:', product.value)
  console.log('商品ID:', productId.value)
  console.log('购买数量:', quantity.value)

  if (!product.value || !productId.value) {
    console.error('商品信息或ID缺失')
    uni.showToast({
      title: '商品信息错误',
      icon: 'none'
    })
    return
  }

  // 检查登录状态
  if (!tokenStore.hasLogin) {
    uni.showModal({
      title: '提示',
      content: '请先登录后再添加到购物车',
      confirmText: '去登录',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          uni.navigateTo({
            url: '/pages/login/login'
          })
        }
      }
    })
    return
  }

  // 检查库存
  if (product.value.stock <= 0) {
    uni.showToast({
      title: '商品已售罄',
      icon: 'none'
    })
    return
  }

  // 检查数量是否超过库存
  if (quantity.value > product.value.stock) {
    uni.showToast({
      title: '数量超过库存',
      icon: 'none'
    })
    return
  }

  try {
    // 设置添加状态，防止重复请求
    isAddingToCart.value = true

    console.log('调用购物车API')

    // 显示加载提示
    uni.showLoading({
      title: '添加中...'
    })

    const response = await addToCartAPI(productId.value, quantity.value)

    console.log('API响应:', response)

    uni.hideLoading()

    if (response.code === 200) {
      uni.showToast({
        title: '添加成功',
        icon: 'success'
      })

      // 发送购物车更新事件
      uni.$emit('cartChanged')
    }
    else {
      throw new Error(response.message)
    }
  }
  catch (error: any) {
    uni.hideLoading()
    console.error('加入购物车失败:', error)

    let errorMessage = '添加失败'
    if (error.message) {
      if (error.message.includes('库存不足')) {
        errorMessage = '商品库存不足'
      }
      else if (error.message.includes('不存在')) {
        errorMessage = '商品不存在或已下架'
      }
      else {
        errorMessage = error.message
      }
    }

    uni.showToast({
      title: errorMessage,
      icon: 'none'
    })
  }
  finally {
    // 重置添加状态，允许下次添加
    isAddingToCart.value = false
  }
}

// 立即购买
const buyNow = async () => {
  // 防抖处理：如果正在购买，直接返回
  if (isBuying.value) {
    console.log('正在处理购买，跳过重复请求')
    return
  }

  if (!product.value || !productId.value)
    return

  // 检查登录状态
  if (!tokenStore.hasLogin) {
    uni.showModal({
      title: '提示',
      content: '请先登录后再购买',
      confirmText: '去登录',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          uni.navigateTo({
            url: '/pages/login/login'
          })
        }
      }
    })
    return
  }

  // 检查库存
  if (product.value.stock <= 0) {
    uni.showToast({
      title: '商品已售罄',
      icon: 'none'
    })
    return
  }

  // 检查数量是否超过库存
  if (quantity.value > product.value.stock) {
    uni.showToast({
      title: '数量超过库存',
      icon: 'none'
    })
    return
  }

  try {
    // 设置购买状态，防止重复请求
    isBuying.value = true

    // 先添加到购物车（不显示成功提示）
    uni.showLoading({
      title: '处理中...'
    })

    const response = await addToCartAPI(productId.value, quantity.value)

    uni.hideLoading()

    if (response.code === 200) {
      // 跳转到购物车页面
      uni.switchTab({
        url: '/pages/cart/cart'
      })
    }
    else {
      throw new Error(response.message)
    }
  }
  catch (error: any) {
    uni.hideLoading()
    console.error('立即购买失败:', error)
    uni.showToast({
      title: error.message || '操作失败',
      icon: 'none'
    })
  }
  finally {
    // 重置购买状态，允许下次购买
    isBuying.value = false
  }
}

// 检查收藏状态
const checkFavoriteStatus = async () => {
  if (!productId.value || !tokenStore.hasLogin)
    return

  try {
    const res = await checkFavorite({
      item_type: FavoriteType.PRODUCT,
      item_id: productId.value
    })
    isFavorited.value = res.data.is_favorited
  }
  catch (error) {
    console.error('检查收藏状态失败:', error)
  }
}

// 切换收藏状态
const toggleFavorite = async () => {
  if (!productId.value)
    return

  // 检查登录状态
  if (!tokenStore.hasLogin) {
    uni.showModal({
      title: '提示',
      content: '请先登录后再收藏商品',
      confirmText: '去登录',
      success: (res) => {
        if (res.confirm) {
          uni.navigateTo({
            url: '/pages/login/login'
          })
        }
      }
    })
    return
  }

  try {
    const res = await toggleFavoriteApi({
      item_type: FavoriteType.PRODUCT,
      item_id: productId.value
    })

    isFavorited.value = res.data.is_favorited

    uni.showToast({
      title: res.data.is_favorited ? '收藏成功' : '已取消收藏',
      icon: 'success'
    })

    // 触发全局收藏状态变化事件
    uni.$emit('favoriteChanged', {
      type: 'product',
      id: productId.value,
      is_favorited: res.data.is_favorited
    })
  }
  catch (error) {
    console.error('收藏操作失败:', error)
    uni.showToast({
      title: '操作失败，请重试',
      icon: 'error'
    })
  }
}

/* 评论统计回调 */
const updateCommentStats = (stats: CommentStatistics) => {
  commentStats.value = stats
}
// 页面加载 - 使用onLoad获取参数
onLoad((options) => {
  initPageData(options)
  loadProductDetail()

  // 延迟检查收藏状态，确保productId已设置
  setTimeout(() => {
    checkFavoriteStatus()
  }, 100)
})

onReady(() => {
})

// 页面挂载
onMounted(() => {
})
</script>

<style lang="scss" scoped>
.product-detail-page {
  background-color: #f8f6f0;
  height: 100vh;
  display: flex;
  flex-direction: column;
}

/* 导航栏 */
.nav-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  /* padding: var(--status-bar-height) 32rpx 10rpx; */
  padding: 0 32rpx 10rpx;
  background: #ffffff;
  box-shadow: 0 2rpx 10rpx rgba(0, 0, 0, 0.05);
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
}

.nav-back {
  width: 60rpx;
  height: 60rpx;
  display: flex;
  align-items: center;
  justify-content: flex-start;
}

.back-icon {
  font-size: 36rpx;
  color: #2c2c2c;
}

.nav-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #2c2c2c;
  max-width: 400rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  transition: all 0.3s ease;
}

.nav-actions {
  width: 60rpx;
  display: flex;
  justify-content: flex-end;
}

/* 详情滚动区域 */
.detail-scroll {
  flex: 1;
  // padding-top: 166rpx; /* 为固定导航栏留出空间 */
  padding-bottom: 220rpx;
}

/* 商品图片 */
.product-images {
  background: #ffffff;
}

.image-swiper {
  width: 100%;
  height: 600rpx;
}

.swiper-image {
  width: 100%;
  height: 100%;
}

/* 商品信息 */
.product-info {
  background: #ffffff;
  padding: 32rpx;
  margin-bottom: 20rpx;
}

.product-header {
  margin-bottom: 24rpx;
}

.product-name {
  font-size: 32rpx;
  font-weight: 600;
  color: #2c2c2c;
  margin-bottom: 16rpx;
  display: block;
  line-height: 1.4;
}

.product-price {
  font-size: 36rpx;
  color: #e74c3c;
  font-weight: 700;
}

.product-meta {
  display: flex;
  flex-wrap: wrap;
  margin-bottom: 24rpx;
}

.meta-item {
  font-size: 26rpx;
  color: #666666;
  margin-right: 32rpx;
  margin-bottom: 8rpx;
}

.product-desc {
  border-top: 1rpx solid #f0f0f0;
  padding-top: 24rpx;
}

.desc-title {
  font-size: 28rpx;
  font-weight: 600;
  color: #2c2c2c;
  margin-bottom: 16rpx;
  display: block;
}

.desc-content {
  font-size: 26rpx;
  color: #666666;
  line-height: 1.6;
}

/* 商品详情HTML */
.product-detail-html {
  background: #ffffff;
  padding: 32rpx;
}

.section-title {
  font-size: 28rpx;
  font-weight: 600;
  color: #2c2c2c;
  margin-bottom: 24rpx;
  display: block;
}

.comment-section {
  background: #f8f9fa;
  padding: 32rpx 0;
}

/* 加载状态 */
.loading-container {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
}

.loading-text {
  font-size: 28rpx;
  color: #999999;
}

.empty-container {
  flex: 1;
  padding: 60rpx 32rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.empty-title {
  font-size: 28rpx;
  color: #2c2c2c;
  margin-bottom: 12rpx;
}

.empty-subtitle {
  font-size: 24rpx;
  color: #999999;
  margin-bottom: 20rpx;
}

.empty-action {
  height: 72rpx;
  padding: 0 32rpx;
  border-radius: 36rpx;
  background: #2c2c2c;
  color: #ffffff;
  border: none;
  font-size: 26rpx;
}

.desc-empty,
.detail-empty {
  font-size: 26rpx;
  color: #999999;
  line-height: 1.6;
}

/* 底部操作栏 */
.bottom-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: #ffffff;
  padding: 20rpx 32rpx;
  box-shadow: 0 -2rpx 10rpx rgba(0, 0, 0, 0.1);
  padding-bottom: env(safe-area-inset-bottom);
}

/* 数量选择区域 */
.quantity-section {
  display: flex;
  align-items: center;
  margin-bottom: 20rpx;
  padding: 10rpx 0;

  .quantity-label {
    font-size: 28rpx;
    color: #333;
    margin-right: 20rpx;
  }

  .quantity-control {
    display: flex;
    align-items: center;
    border: 2rpx solid #e0e0e0;
    border-radius: 8rpx;
    margin-right: 20rpx;

    .quantity-btn {
      width: 60rpx;
      height: 60rpx;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 32rpx;
      color: #333;
      background: #f5f5f5;

      &.minus {
        border-radius: 6rpx 0 0 6rpx;
      }

      &.plus {
        border-radius: 0 6rpx 6rpx 0;
      }

      &.disabled {
        color: #ccc;
        background: #f0f0f0;
      }
    }

    .quantity-value {
      width: 80rpx;
      height: 60rpx;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 28rpx;
      border-left: 2rpx solid #e0e0e0;
      border-right: 2rpx solid #e0e0e0;
      background: #fff;
    }
  }

  .stock-info {
    font-size: 24rpx;
    color: #999;
  }
}

.action-buttons {
  display: flex;
  gap: 20rpx;
  align-items: center;
}

.btn-favorite {
  width: 80rpx;
  height: 80rpx;
  border-radius: 40rpx;
  background: #f8f6f0;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 20rpx;
}

.btn-favorite .btn-icon {
  font-size: 36rpx;
}

.btn-favorite {
  width: 80rpx;
  height: 80rpx;
  border-radius: 40rpx;
  background: #ffffff;
  border: 2rpx solid #e0e0e0;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 20rpx;
}

.btn-favorite .btn-icon {
  font-size: 36rpx;
}

.btn-cart,
.btn-buy {
  flex: 1;
  height: 80rpx;
  border-radius: 40rpx;
  font-size: 28rpx;
  font-weight: 600;
  border: none;
}

.btn-cart {
  background: #f8f6f0;
  color: #2c2c2c;
  margin-right: 20rpx;
}

.btn-buy {
  background: #2c2c2c;
  color: #ffffff;
}

/* 按钮禁用状态 */
button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
