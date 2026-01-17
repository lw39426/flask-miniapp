<template>
  <view>
    <HomeSkeleton v-if="isLoading" />
    <view v-else class="home-page">
      <!-- 沉浸式轮播与搜索 -->
      <view class="banner-section immersive">
        <swiper class="banner-swiper" indicator-dots circular autoplay :interval="3000" :duration="500">
          <swiper-item v-for="(banner, index) in banners" :key="index">
            <image class="banner-image" :src="banner?.image || banner?.image_url || ''" mode="aspectFill" @tap="onBannerTap(banner)" />
          </swiper-item>
        </swiper>
        <!-- 搜索栏 -->
        <NavBarSearch @click="goToSearch" />
      </view>

      <!-- 问候条（黑色） -->
      <view class="greet-section">
        <view class="greet-left">
          <image class="greet-avatar" :src="user?.avatar || ''" mode="aspectFill" />
          <view class="greet-texts">
            <view class="greet-name">
              <view class="text-[22rpx] text-[#fff]">
                <text class="mr-[8rpx]">Hey</text>
                <text class="">{{ 'kiko' }}</text>
              </view>
              <text class="greet-hey">来跟幸运打个招呼</text>
            </view>
            <text class="greet-level">Lv1 小蓝鹿 ›</text>
          </view>
        </view>
      </view>

      <!-- 优惠活动卡片 -->
      <view class="promo-section">
        <view
          class="promo-left promo-card primary"
          @tap="goAlert('孩子，你做什么梦呢？？？？？？' + '\n' + '哈哈哈哈哈哈哈')"
        >
          <text class="promo-title">加奈幸运 好礼周周领</text>
          <text class="promo-sub text-[26rpx]">点击免费领取</text>
          <text class="bold text-align-center text-[28rpx]">iPhone 17 Pro Max</text>
          <view class="promo-btn">
            立即领取
          </view>
        </view>
        <view class="promo-right">
          <view class="promo-card primary" @tap="goToMore">
            <text class="promo-title">邀好友 得100元</text>
            <text class="promo-sub">新朋友首杯专享福利</text>
          </view>
          <view class="promo-card primary" @tap="goToMore">
            <text class="promo-title">还差1杯得</text>
            <text class="promo-sub">电子勋章</text>
          </view>
        </view>
      </view>

      <!-- 宣传卡片功能导航 -->
      <view class="nav-section">
        <!-- <swiper class="banner-swiper" circular :interval="3000" :duration="500">
        <swiper-item v-for="(banner, index) in bannersMid" :key="index">
          <image class="banner-image" :src="banner.image || banner?.image_url" mode="aspectFill" @tap="onBannerTap(banner)" />
        </swiper-item>
      </swiper> -->
        <view class="banner-swiper center" circular :interval="3000" :duration="500">
          <image
            v-if="bannersMid.length > 0"
            class="banner-image"
            :src="bannersMid[0]?.image || bannersMid[0]?.image_url"
            mode="aspectFill"
            @tap="onBannerTap(bannersMid[0])"
          />
          <sar-empty v-else class="banner-image" text="暂无中间轮播图" />
        </view>
      </view>

      <!-- 产品分类和商品组件 -->
      <CategoryProducts
        :categories="navItems || []"
        :default-category-id="activeCategory || (navItems[0] && navItems[0].id)"
        @category-change="onCategoryChange"
        @product-click="goToProduct"
        @view-more="goToCategoryDetail"
      />

      <!-- 精选文章 -->
      <view class="articles-section">
        <view class="section-header">
          <text class="section-title">精选文章</text>
          <text class="section-more" @tap="goToMoreArticles">查看更多</text>
        </view>
        <view v-if="articles.length > 0" class="articles-list">
          <view v-for="(article, index) in articles" :key="index" class="article-item" @tap="goToArticle(article)">
            <!-- 左侧：图片 -->
            <view class="card-left">
              <!-- mode="aspectFill" 保证图片填满且不拉伸变形 -->
              <image
                class="article-img"
                :src="article.image || '/static/default-cover.png'"
                mode="aspectFill"
                onerror="this.src='/static/images/boy.jpg'"
              />
            </view>

            <!-- 右侧：内容区域 -->
            <view class="card-right">
              <!-- 1. 标题 (单行省略) -->
              <text class="article-title">{{ article.title || '暂无标题' }}</text>
              <!-- 2. 简介 (两行省略) -->
              <text class="article-desc">
                {{ article.description || '暂无简介内容...' }}
              </text>

              <!-- 3. 底部信息 (作者、时间、阅读量) -->
              <view class="article-footer">
                <text class="footer-text">{{ article.author || '匿名' }}</text>
                <!-- 这里的 formatDate 请确保你在 script 里定义了，或者直接用 article.date -->
                <text class="footer-text">{{ article.published_date }}</text>
                <text class="footer-text">{{ article.views || 0 }}人已阅读</text>
              </view>
            </view>
          </view>
        </view>
        <!-- 空状态 -->
        <view v-else class="empty-state">
          <text class="empty-text">暂无文章</text>
        </view>
      </view>
    </view>
    <GlobalLoading :loading="isGlobalLoading" />
  </view>
</template>

<script lang="ts" setup>
import type { Article, Banner, Product } from '@/api/home'
import { onMounted, ref } from 'vue'
import { getBanners, getHomeData } from '@/api/home'
import GlobalLoading from '@/components/GlobalLoading.vue'
import NavBarSearch from '@/components/NavBarSearch.vue'
import { useUserStore } from '@/store/user'
import HomeSkeleton from './components/HomeSkeleton.vue'

definePage({
  type: 'home',
  style: { navigationStyle: 'custom', navigationBarTitleText: '首页' }
})

/* 状态 */
const userStore = useUserStore()
const user = computed(() => userStore.userInfo)

const banners = ref<Banner[]>([]) // 轮播图数据
const bannersMid = ref<Banner[]>([]) // 中间轮播图数据
const navItems = ref<{ id: number, name: string, icon: string, url: string }[]>([]) // 分类标签数据
const recommendItems = ref<Product[]>([])
const products = ref<Product[]>([])
const articles = ref<Article[]>([])
const hot_products = ref<Product[]>([])
const activeCategory = ref<number | null>(null) // 激活的分类标签

const isLoading = ref(true)
const isGlobalLoading = ref(true)

/* 跳转方法 */
const goToSearch = () => uni.navigateTo({ url: '/pages/search/index' })
const goToMessage = () => uni.navigateTo({ url: '/pages/message/index' })
const onBannerTap = (banner: Banner) => {
  console.log('点击了轮播图：', banner)
  if (banner.link_type === 'product') {
    uni.navigateTo({ url: `/pages/product/detail?id=${banner.link_value}` })
  }
}
const onNavTap = (nav: { url: string }) => uni.navigateTo({ url: nav.url })
const goToMore = () => uni.navigateTo({ url: '/pages/product/list?type=recommend' })
const goAlert = (msg: string) => uni.showModal({ title: '傻逼一个嘻嘻嘻', content: msg, icon: 'none', duration: 2000 })
/** 跳转至商品详情 */
const goToProduct = (product: { id: number }) => uni.navigateTo({ url: `/pages/product/detail?id=${product.id}` })
const goToArticle = (art: Article) => uni.navigateTo({ url: `/pages/article/detail?id=${art.id}` })
/** 跳转到更多文章页面 */
const goToMoreArticles = () => uni.navigateTo({ url: '/pages/article/list' })
/** 格式化日期 */
const formatDate = (dateStr: string) => {
  if (!dateStr)
    return ''
  let normalized = dateStr.trim()

  // iOS 兼容："yyyy-MM-dd HH:mm:ss" -> "yyyy/MM/dd HH:mm:ss"
  if (/^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}$/.test(normalized)) {
    normalized = normalized?.replace(/-/g, '/')
  }

  let date = new Date(normalized)

  // 兜底：尝试 ISO 格式 "yyyy-MM-ddTHH:mm:ss"
  if (Number.isNaN(date.getTime())) {
    const tIso = dateStr.replace(' ', 'T')
    date = new Date(tIso)
  }

  if (Number.isNaN(date.getTime()))
    return ''

  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))

  if (days === 0)
    return '今天'
  if (days === 1)
    return '昨天'
  if (days < 7)
    return `${days}天前`
  if (days < 30)
    return `${Math.floor(days / 7)}周前`
  return date.toLocaleDateString()
}

/** 分类变更处理 */
const onCategoryChange = (categoryId: number, categoryName: string) => {
  activeCategory.value = categoryId
}

/** 跳转到分类详情页 */
const goToCategoryDetail = (categoryId: number | null) => {
  if (categoryId) {
    uni.navigateTo({ url: `/pages/product/list?categoryId=${categoryId}` })
  }
}

/** 首页所有数据加载 */
const loadHomeData = async () => {
  if (banners.value.length === 0) {
    isLoading.value = true
  }
  try {
    const res = await getHomeData()
    // 轮播数据
    const bannersTopRes = await getBanners({ placement_key: 'home_top_banner' })
    const bannersMidRes = await getBanners({ placement_key: 'home_middle_banner' })
    console.log('轮播数据加载结果：', bannersTopRes, bannersMidRes)
    banners.value = (bannersTopRes as any).data.banners || []
    bannersMid.value = (bannersMidRes as any).data.banners || [{
      id: null,
      title: '默认中间轮播图',
      image: '',
      link_type: 'product',
      link_value: 9,
      description: '这是一个默认的中间轮播图'
    }]
    // 文章列表
    articles.value = res.data.articles || []
    hot_products.value = res.data.hot_products || []
    // 九宫格由后端 categories 映射
    navItems.value = (res.data.categories || []).slice(0, 8).map(c => ({
      id: c.id,
      name: c.name,
      icon: c.image || '🧩', // 可根据后端返回的icon字段替换
      url: `/pages/product/list?categoryId=${c.id}`
    }))

    // 默认选中第一个分类
    if (navItems.value.length > 0) {
      activeCategory.value = navItems.value[0].id
    }

    // 今日推荐使用 new_products
    recommendItems.value = (res.data.new_products || []).slice(0, 8)

    // 精选商品区用 featured.products
    products.value = (res.data.featured?.products || []).map(p => ({
      ...p,
      desc: res.data.featured.tag_name || '精选推荐',
    }))
  }
  catch (e: any) {
    // 演示时使用----
    banners.value = [{
      id: null,
      title: '汤姆猫',
      image: 'https://www.toopic.cn/public/uploads/small/1759043205775175904320543.jpg',
      link_type: 'product',
      link_value: 7,
      description: '猫和老鼠的汤姆猫'
    }]
    bannersMid.value = [{
      id: null,
      title: '杰瑞鼠',
      image: 'https://www.toopic.cn/public/uploads/small/1759043205775175904320543.jpg',
      link_type: 'product',
      link_value: 8,
      description: '猫和老鼠的杰瑞鼠'
    }]
    articles.value = [
      {
        author: '匿名用户',
        category_name: '\u52A8\u6F2B\u5C0F\u8BF4',
        content: '',
        description: '动画《狐妖小红娘》改编自小新创作的同名漫画作品 [1]。作品主要讲述了以红娘为职业的狐妖在为前世恋人牵红线过程当中发生的一系列有趣、神秘的故事',
        id: 23,
        image: 'https://pic.kts.g.mi.com/0b6f8c016b82e699588fe5a61f8685f99080080050210315033.png',
        published_date: '2024-06-15 22:26:16',
        tags: [
          {
            color: '#ff4141',
            id: 7,
            name: '\u70ED\u95E8\u63A8\u8350'
          }
        ],
        title: '《狐妖小红娘》',
        views: 1505
      },
      {
        author: '匿名用户',
        category_name: '\u52A8\u6F2B\u5C0F\u8BF4',
        content: '',
        description: '动画《狐妖小红娘》改编自小新创作的同名漫画作品 [1]。作品主要讲述了以红娘为职业的狐妖在为前世恋人牵红线过程当中发生的一系列有趣、神秘的故事',
        id: 22,
        image: 'https://ts4.tc.mm.bing.net/th/id/OIP-C.OmmRhieRFO_ehJsGyy2IMgHaEJ?rs=1&pid=ImgDetMain&o=7&rm=3',
        published_date: '2024-06-12 22:15:20',
        tags: [
          {
            color: '#ff4141',
            id: 7,
            name: '\u70ED\u95E8\u63A8\u8350'
          }
        ],
        title: '《凡人修仙传》',
        views: 5213
      },
      {
        author: '匿名用户',
        category_name: '\u52A8\u6F2B\u5C0F\u8BF4',
        content: '',
        description: '何青青表示，被校草看上真的很无奈，她只想离他远远的，可奈何无法逃脱他的手掌心。',
        id: 22,
        image: 'https://www.wenzizhan.com/Files/wenji/1EFA9BEE-DC41-44CF-AE46-C0DD3961372A.jpg',
        published_date: '2024-05-12 22:15:20',
        tags: [
          {
            color: '#ff4141',
            id: 7,
            name: '\u70ED\u95E8\u63A8\u8350'
          }
        ],
        title: '《余生有你：我爱青菜》',
        views: 5213
      },
      {
        author: '匿名用户',
        category_name: '\u52A8\u6F2B\u5C0F\u8BF4',
        content: '',
        description: '窗台上的玻璃罐积着薄灰，标签边缘卷翘成记忆的弧度',
        id: 22,
        image: 'https://www.wenzizhan.com/Files/wenji/75FE2030-3805-4AC9-BB39-0928B3913DF9.jpg',
        published_date: '2024-06-09 22:15:20',
        tags: [
          {
            color: '#ff4141',
            id: 7,
            name: '\u70ED\u95E8\u63A8\u8350'
          }
        ],
        title: '《玻璃罐里的雨季》',
        views: 5213
      },
      {
        author: '匿名用户',
        category_name: '\u52A8\u6F2B\u5C0F\u8BF4',
        content: '',
        description: '戴斌和赵文伟两家是世交，到了他们这代，关系不但没淡化，反而走得更近了',
        id: 22,
        image: 'https://www.wenzizhan.com/Files/wenji/26D9077A-0D61-4F69-A45F-C4D928DF1196.jpg',
        published_date: '2024-06-05 22:15:20',
        tags: [
          {
            color: '#ff4141',
            id: 7,
            name: '\u70ED\u95E8\u63A8\u8350'
          }
        ],
        title: '《寻宝闹剧》',
        views: 5213
      }
    ]
    // 演示时使用截止-----
    uni.showToast({ title: e?.message || '首页数据获取失败', icon: 'none' })
  }
  finally {
    isLoading.value = false
    uni.stopPullDownRefresh()
  }
}
onMounted(() => {
  isGlobalLoading.value = false
  loadHomeData()
})
onShow(() => {
  // loadHomeData()
})
</script>

<style scoped>
.home-page {
  background-color: #f8f6f0;
  min-height: 100vh;
}

/* 沉浸式轮播与搜索 */
.banner-section.immersive {
  position: relative;
  margin: 0;
}
.banner-section.immersive .banner-swiper {
  height: 470rpx;
  border-radius: 0;
}

/* 轮播图 */
.banner-swiper {
  height: 320rpx;
  border: 2rpx solid #e0e0e0;
  border-radius: 20rpx;
  overflow: hidden;
}
.banner-image {
  width: 100%;
  height: 100%;
}

/* 导航栏 */
.nav-section {
  margin: 20rpx 32rpx 0; /* 向上移动，部分覆盖在轮播图上 */
}
.nav-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 24rpx;
  background: #ffffff;
  border-radius: 16rpx;
  padding: 40rpx 20rpx;
  box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.08);
}
.nav-item {
  display: flex;
  flex-direction: column;
  align-items: center;
}
.nav-icon {
  font-size: 48rpx;
  margin-bottom: 16rpx;
}
.nav-icon-image {
  height: 56rpx;
  width: 56rpx;
}
.nav-text {
  font-size: 24rpx;
  color: #2c2c2c;
  font-weight: 500;
}

/* 瑞幸风格扩展样式 */
.greet-section {
  margin: -40rpx 32rpx 0; /* 向上移动，部分覆盖在轮播图上 */
  position: relative;
  z-index: 11;
  background: #1f1f1f;
  border-radius: 16rpx;
  color: #fff;
  padding: 24rpx;
  display: flex;
  align-items: center;
}
.greet-left {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 16rpx;
}
.greet-avatar {
  width: 72rpx;
  height: 72rpx;
  border-radius: 50%;
  margin-right: 16rpx;
  background: #333;
}
.greet-texts {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.greet-hey {
  font-size: 28rpx;
  font-weight: 600;
}
.greet-level {
  font-size: 22rpx;
  color: #cfcfcf;
}

/* 活动卡片 */
.promo-section {
  display: flex;
  justify-content: space-between;
  gap: 20rpx;
  margin: 36rpx 32rpx 0;
}
.promo-card {
  background: #fff;
  border-radius: 16rpx;
  padding: 24rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.06);
}
.promo-card.primary {
  background: linear-gradient(135deg, #eaf2ff 0%, #ffffff 100%);
  margin-bottom: 16rpx;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}
.promo-left {
  display: flex;
  flex-direction: column;
  flex-basis: 50%;
  padding: 24rpx 0;
}
.promo-title {
  font-size: 30rpx;
  font-weight: 700;
  color: #2c2c2c;
}
.promo-sub {
  font-size: 24rpx;
  text-align: center;
  color: #666;
  margin-top: 6rpx;
}
.promo-btn {
  margin-top: 16rpx;
  background: #2d63ff;
  color: #fff;
  padding: 12rpx 24rpx;
  border-radius: 999rpx;
  font-size: 22rpx;
}
.promo-right {
  display: flex;
  flex-direction: column;
  flex-basis: 50%;
}
.promo-img {
  width: 160rpx;
  height: 120rpx;
  margin-left: 16rpx;
}

.promo-grid {
  display: flex;
  gap: 16rpx;
}

/* 通用区块头部 */
.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 32rpx;
  margin-bottom: 24rpx;
}
.section-title {
  font-size: 36rpx;
  font-weight: 600;
  color: #2c2c2c;
  border-left: 10rpx solid #e60000;
  padding-left: 10rpx;
}
.section-more {
  font-size: 24rpx;
  color: #666666;
}

/* 精选文章 */
.articles-section {
  margin-top: 24rpx;
  padding: 32rpx 0;
  background: #ffffff;
}

.articles-list {
  padding: 0 32rpx;
}

.article-item {
  display: flex; /* 开启 Flex 布局，让图片和文字左右排列 */
  padding: 20rpx 0; /* 卡片内边距 */
  background-color: #fff;
  border-bottom: 1rpx solid #f0f0f0; /* 下划线，不需要可去掉 */
}

.article-item:last-child {
  border-bottom: none;
}

.article-item:active {
  background-color: #f8f9fa;
}

.article-cover {
  width: 200rpx;
  height: 140rpx;
  border-radius: 12rpx;
  background-color: #f5f5f5;
  flex-shrink: 0;
  margin-right: 24rpx;
}

/* 左侧图片样式 */
.card-left {
  margin-right: 20rpx; /* 图片和右边文字的间距 */
}

.article-img {
  width: 200rpx; /* 根据截图推测的宽度 */
  height: 140rpx; /* 根据截图推测的高度 */
  border-radius: 12rpx; /* 图片圆角 */
  background-color: #eee; /* 图片未加载时的占位色 */
}

/* 右侧内容容器 */
.card-right {
  flex: 1; /* 占满剩余宽度 */
  display: flex;
  flex-direction: column; /* 内容从上到下排列 */
  justify-content: space-between; /* 标题顶头，底部信息沉底 */
  min-height: 140rpx; /* 必须和图片高度一致，才能实现 space-between */
  min-width: 0; /* 关键：防止 flex 子项被内容撑开，解决破页问题 */
}

/* 1. 标题样式 */
.article-title {
  font-size: 32rpx;
  font-weight: bold;
  color: #333;

  /* 单行省略号 */
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

/* 2. 简介样式 */
.article-desc {
  font-size: 24rpx;
  color: #666;
  line-height: 1.4;
  margin-top: 8rpx;

  /* 多行省略号 (核心代码) */
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2; /* 限制显示2行 */
  overflow: hidden;
}

/* 3. 底部信息样式 */
.article-footer {
  display: flex;
  align-items: center;
  justify-content: space-between; /* 让三个信息分散对齐，或者用 gap */
  margin-top: auto; /* 确保沉底 */
}

.footer-text {
  font-size: 20rpx;
  color: #999;
}

/* 空状态 */
.empty-state {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 200rpx;
}

.empty-text {
  font-size: 28rpx;
  color: #999999;
}

/* 响应式适配 */
@media screen and (max-width: 750rpx) {
  .article-cover {
    width: 160rpx;
    height: 112rpx;
    margin-right: 20rpx;
  }

  .article-content {
    height: 112rpx;
  }

  .article-title {
    font-size: 28rpx;
  }

  .article-summary {
    font-size: 24rpx;
  }
}

/* 产品分类导航样式 */
.category-scroll-wrapper {
  margin: 24rpx 0;
  white-space: nowrap;
}

.category-nav {
  display: flex;
  padding: 0 32rpx;
}

.category-item {
  flex-shrink: 0;
  padding: 12rpx 36rpx;
  margin-right: 24rpx;
  background: #ffffff;
  border-radius: 30rpx;
  font-size: 28rpx;
  color: #666;
  transition: all 0.3s ease;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.06);
  border: 2rpx solid transparent;
}

.category-item.active {
  background: #2d63ff;
  color: #fff;
}

.category-item:last-child {
  margin-right: 0;
}
</style>
