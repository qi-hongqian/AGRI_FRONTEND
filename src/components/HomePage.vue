<template>
  <div class="home-page" @scroll="handleScroll" ref="homePageRef">
    <!-- 固定标题区域 - 始终存在 -->
    <div class="app-header">
      <h1 class="app-title">农业科普</h1>
    </div>
    
    <!-- 导航菜单区域 - 根据滚动显示/隐藏 -->
    <nav class="nav-bar" :class="{ 'nav-bar-hidden': !showNavBar }">
      <div class="nav-content">
        <router-link to="/home" class="nav-item">首页资讯</router-link>
        <router-link to="/forum" class="nav-item">资讯论坛</router-link>
        <router-link to="/mall" class="nav-item">农业商城</router-link>
        <router-link to="/quiz" class="nav-item">农业答题</router-link>
        <router-link to="/profile" class="nav-item">个人中心</router-link>
      </div>
    </nav>

    <!-- 轮播图 -->
    <div class="carousel" ref="carouselRef">
      <div class="carousel-container">
        <div 
          v-for="(banner, index) in banners" 
          :key="banner.id || index" 
          class="carousel-item"
          :class="{ active: index === currentIndex }"
          @click="handleBannerClick(banner)"
        >
          <div class="carousel-image-wrapper">
            <img :src="getImageUrl(banner.imageUrl)" :alt="banner.title" class="carousel-image">
          </div>
          <div class="carousel-text-wrapper">
            <h2 class="carousel-title">{{ banner.title }}</h2>
          </div>
        </div>
      </div>
      
      <!-- 轮播指示器 -->
      <div class="carousel-indicators" :class="{ 'indicators-visible': showIndicators || banners.length > 1 }">
        <button 
          v-for="(banner, index) in banners" 
          :key="banner.id || index"
          class="indicator"
          :class="{ active: index === currentIndex }"
          @click.stop="goToSlide(index)"
        ></button>
      </div>
    </div>

    <!-- 快捷功能区 (农业特色) -->
    <div class="agri-features">
      <div class="feature-card news" @click="$router.push('/news-list')">
        <div class="feature-icon">📰</div>
        <div class="feature-info">
          <span class="feature-title">农业新闻</span>
          <span class="feature-desc">掌握最新动向</span>
        </div>
      </div>

      <!-- 新增：资讯AI\统计 -->
      <div class="feature-card insight" @click="$router.push('/ai-insight')">
        <div class="feature-icon">📊</div>
        <div class="feature-info">
          <span class="feature-title">数据洞察</span>
          <span class="feature-desc">AI智能分析</span>
        </div>
      </div>
      <div class="feature-card weather" @click="goToWeather">
        <div class="feature-icon">☀️</div>
        <div class="feature-info">
          <span class="feature-title">农时天气</span>
          <span class="feature-desc">科学指导农事</span>
        </div>
      </div>
      <div class="feature-card collect" @click="handleToCollect">
        <div class="feature-icon">⭐</div>
        <div class="feature-info">
          <span class="feature-title">我的收藏</span>
          <span class="feature-desc">保存重要信息</span>
        </div>
      </div>
    </div>

    <!-- 农业资讯列表 -->
    <div class="info-section">
      <div class="section-header">
        <h2 class="section-title">农业资讯</h2>
        <div class="refresh-btn" @click="refreshList" :class="{ 'spinning': loading }">🔄</div>
      </div>
      
      <div class="info-list" v-if="infoList.length > 0">
        <div 
          v-for="info in infoList" 
          :key="info.id" 
          class="info-card"
          @click="goToDetail(info.id)"
        >
          <div class="info-card-content">
            <h3 class="info-card-title">{{ info.title }}</h3>
            <div class="info-card-meta">
              <span class="info-tag">{{ info.categoryName }}</span>
              <span class="info-time">{{ formatTime(info.createTime) }}</span>
              <span class="info-views">👁️ {{ info.viewCount }}</span>
            </div>
          </div>
          <div class="info-card-image" v-if="info.coverImage">
            <img :src="getImageUrl(info.coverImage)" :alt="info.title">
          </div>
        </div>
      </div>

      <!-- 加载更多 -->
      <div class="load-more" v-if="pagination.current < pagination.pages">
        <button @click="loadMore" :disabled="loading" class="load-more-btn">
          {{ loading ? '加载中...' : '加载更多' }}
        </button>
      </div>

      <div v-if="loading && infoList.length === 0" class="loading-state">
        <div class="loading-spinner"></div>
        <p>资讯加载中...</p>
      </div>

      <div v-if="!loading && infoList.length === 0" class="empty-state">
        <p>暂无相关资讯</p>
      </div>
    </div>

    <!-- 使用独立的底部导航组件 -->
    <BottomNav />
  </div>
</template>

<script>
import { ref, onMounted, onUnmounted, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { getEnvConfig } from '../config/env'
import BottomNav from './BottomNav.vue'
import api from '../api'
import { useAppStore } from '../stores/app'

export default {
  name: 'HomePage',
  components: {
    BottomNav
  },
  setup() {
    const router = useRouter()
    const appStore = useAppStore()
    
    // 构造完整的图片URL
    const getImageUrl = (path) => {
      if (!path) return ''
      if (path.startsWith('http')) return path
      const envConfig = getEnvConfig()
      // 资讯模块统一请求 8082 (Content API)
      return `${envConfig.CONTENT_API}${path}`
    }
    
    // 基础状态
    const homePageRef = ref(null)
    const carouselRef = ref(null)
    const showNavBar = ref(true)
    const loading = ref(false)
    
    // 轮播图状态
    const banners = ref([])
    const currentIndex = ref(0)
    const showIndicators = ref(false)
    let carouselTimer = null
    let indicatorsTimer = null

    // 资讯列表状态
    const infoList = ref([])
    const pagination = reactive({
      current: 1,
      size: 10,
      total: 0,
      pages: 0
    })

    // 处理滚动隐藏导航栏
    const handleScroll = () => {
      if (!homePageRef.value) return
      const scrollTop = homePageRef.value.scrollTop
      // 如果向上滚动超过100px，隐藏导航栏以腾出空间
      showNavBar.value = scrollTop < 100
    }

    // 获取轮播图
    const fetchCarousels = async () => {
      try {
        const res = await api.agri.getCarousels()
        if (res.success) {
          banners.value = res.data
        }
      } catch (err) {
        console.error('获取轮播失败:', err)
      }
    }

    // 获取资讯列表
    const fetchInfoList = async (page = 1) => {
      if (loading.value) return
      loading.value = true
      try {
        const res = await api.agri.getIndexInfoList({ 
          current: page, 
          size: pagination.size 
        })
        if (res.success) {
          if (page === 1) {
            infoList.value = res.data.records
          } else {
            infoList.value = [...infoList.value, ...res.data.records]
          }
          pagination.current = res.data.current
          pagination.total = res.data.total
          pagination.pages = res.data.pages
        }
      } catch (err) {
        console.error('获取资讯列表失败:', err)
      } finally {
        loading.value = false
      }
    }

    // 加载更多
    const loadMore = () => {
      if (pagination.current < pagination.pages) {
        fetchInfoList(pagination.current + 1)
      }
    }

    // 刷新列表
    const refreshList = () => {
      fetchInfoList(1)
    }

    // 轮播控制
    const startCarousel = () => {
      stopCarousel()
      carouselTimer = setInterval(() => {
        if (banners.value.length > 0) {
          currentIndex.value = (currentIndex.value + 1) % banners.value.length
          showIndicators.value = true  // 确保指示器可见
        }
      }, 3000)
    }

    const stopCarousel = () => {
      if (carouselTimer) clearInterval(carouselTimer)
    }

    const goToSlide = (index) => {
      currentIndex.value = index
      showIndicators.value = true  // 确保指示器可见
      showCarouselIndicators()
    }

    const showCarouselIndicators = () => {
      if (indicatorsTimer) clearTimeout(indicatorsTimer)
      showIndicators.value = true
      indicatorsTimer = setTimeout(() => {
        showIndicators.value = false
      }, 3000)
    }

    // 跳转逻辑
    const goToDetail = (id) => {
      router.push(`/info-detail/${id}`)
    }

    const handleBannerClick = (banner) => {
      if (banner.linkUrl) {
        // 如果是外部链接或内部路径跳转
        if (banner.linkUrl.startsWith('http')) {
          window.open(banner.linkUrl, '_blank')
        } else {
          router.push(banner.linkUrl)
        }
      }
    }

    const handleToCollect = () => {
      console.log('[收藏] 当前登录状态:', {
        isAuthenticated: appStore.isAuthenticated,
        token: appStore.token?.substring(0, 20) + '...',
        user: appStore.user
      })
      
      if (!appStore.isAuthenticated) {
        showToast('请先登录', 'error')
        setTimeout(() => router.push('/login'), 1500)
        return
      }
      router.push('/collect')
    }

    const goToWeather = () => {
      console.log('[天气] 跳转到天气页面')
      router.push('/weather')
    }

    // 工具函数
    const formatTime = (time) => {
      if (!time) return ''
      const date = new Date(time)
      return `${date.getMonth() + 1}-${date.getDate()} ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`
    }

    onMounted(async () => {
      await Promise.all([
        fetchCarousels(),
        fetchInfoList(1)
      ])
      startCarousel()
      showCarouselIndicators()
    })

    onUnmounted(() => {
      stopCarousel()
      if (indicatorsTimer) clearTimeout(indicatorsTimer)
    })

    return {
      homePageRef,
      carouselRef,
      showNavBar,
      loading,
      banners,
      currentIndex,
      showIndicators,
      infoList,
      pagination,
      handleScroll,
      goToSlide,
      loadMore,
      refreshList,
      goToDetail,
      handleBannerClick,
      handleToCollect,
      goToWeather,
      formatTime,
      getImageUrl
    }
  }
}
</script>

<style scoped>
/* 确保组件内容正确显示 */
.home-page {
  background-color: #f5f5f5;
  position: relative;
  padding-bottom: 30px;  /* 增加底部间距 */
}

/* 应用标题样式 - 固定显示 */
.app-header {
  background-color: #4CAF50;
  color: white;
  padding: 15px 0;
  text-align: center;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  position: sticky;
  top: 0;
  z-index: 1001;
}

.app-title {
  margin: 0;
  font-size: 24px;
  font-weight: bold;
}

/* 导航菜单样式 - 可隐藏 */
.nav-bar {
  background-color: #4CAF50;
  color: white;
  padding: 0;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  position: sticky;
  top: 60px;
  z-index: 1000;
  transition: transform 0.3s ease;
  height: 36px; /* 固定导航栏高度 */
  display: flex;
  align-items: center;
}

/* 确保导航内容容器强制横向布局且自适应 */
.nav-content {
  width: 100%;
  margin: 0;
  display: flex !important;
  flex-direction: row !important;
  justify-content: space-around !important;
  align-items: center !important;
  padding: 0 5px;
  box-sizing: border-box;
  height: 100%;
}

/* 隐藏导航栏的类 */
.nav-bar-hidden {
  transform: translateY(-100%);
}

/* 确保导航项水平排列且自适应 */
.nav-item {
  color: white;
  text-decoration: none;
  padding: 0 8px;
  border-radius: 4px;
  transition: background-color 0.3s;
  display: flex !important;
  align-items: center;
  justify-content: center;
  margin: 0 2px;
  float: none !important;
  font-size: 12px;
  flex: 1;
  text-align: center;
  max-width: 100px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  height: 30px;
  line-height: 1;
}

.nav-item:hover {
  background-color: rgba(255,255,255,0.1);
}

/* 轮播图样式 */
.carousel {
  position: relative;
  width: 100%;
  height: 200px;
  overflow: hidden;
  background-color: #f0f0f0;
}

.carousel-container {
  width: 100%;
  height: 100%;
  position: relative;
}

.carousel-item {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  opacity: 0;
  transition: opacity 0.5s ease;
  cursor: pointer;
}

.carousel-item.active {
  opacity: 1;
  z-index: 1;
}

.carousel-image-wrapper {
  width: 100%;
  height: 100%;
}

.carousel-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.carousel-text-wrapper {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: linear-gradient(transparent, rgba(0,0,0,0.7));
  padding: 30px 15px 10px;
  color: white;
  z-index: 2;
}

.carousel-title {
  margin: 0;
  font-size: 18px;
  font-weight: bold;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.carousel-indicators {
  position: absolute;
  bottom: 15px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 8px;
  z-index: 3;
}

.indicator {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: rgba(255,255,255,0.5);
  border: none;
  padding: 0;
  cursor: pointer;
}

.indicator.active {
  background: #4CAF50;
  width: 16px;
  border-radius: 4px;
}

/* 农业特色功能区 */
.agri-features {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  padding: 15px;
  background: white;
  margin-bottom: 10px;
}

.feature-card {
  display: flex;
  align-items: center;
  padding: 12px;
  border-radius: 12px;
  background: #f9f9f9;
  cursor: pointer;
  transition: transform 0.2s;
}

.feature-card:active {
  transform: scale(0.98);
}

.feature-icon {
  font-size: 24px;
  margin-right: 12px;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: white;
  border-radius: 10px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
}

.feature-info {
  display: flex;
  flex-direction: column;
}

.feature-title {
  font-size: 15px;
  font-weight: bold;
  color: #333;
}

.feature-desc {
  font-size: 11px;
  color: #888;
  margin-top: 2px;
}

/* 资讯列表区 */
.info-section {
  background: white;
  padding: 15px;
  min-height: 400px;
  margin-bottom: 70px; /* 为底部导航留出空间 */
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
  border-left: 4px solid #4CAF50;
  padding-left: 10px;
}

.section-title {
  margin: 0;
  font-size: 18px;
  color: #333;
}

.refresh-btn {
  font-size: 18px;
  cursor: pointer;
  color: #4CAF50;
}

.spinning {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.info-list {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.info-card {
  display: flex;
  gap: 12px;
  padding-bottom: 15px;
  border-bottom: 1px solid #f0f0f0;
}

.info-card:last-child {
  border-bottom: none;
}

.info-card-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.info-card-title {
  margin: 0;
  font-size: 16px;
  color: #333;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.info-card-meta {
  margin-top: 8px;
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 12px;
  color: #999;
}

.info-tag {
  background: #e8f5e9;
  color: #4CAF50;
  padding: 2px 6px;
  border-radius: 4px;
}

.info-card-image {
  width: 100px;
  height: 70px;
  border-radius: 8px;
  overflow: hidden;
  flex-shrink: 0;
}

.info-card-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.load-more {
  text-align: center;
  margin-top: 20px;
}

.load-more-btn {
  background: none;
  border: 1px solid #4CAF50;
  color: #4CAF50;
  padding: 8px 20px;
  border-radius: 20px;
  font-size: 14px;
  cursor: pointer;
}

.load-more-btn:disabled {
  opacity: 0.5;
  border-color: #ccc;
  color: #ccc;
}

.loading-state, .empty-state {
  text-align: center;
  padding: 40px 0;
  color: #999;
}

.loading-spinner {
  width: 30px;
  height: 30px;
  border: 3px solid #f3f3f3;
  border-top: 3px solid #4CAF50;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 10px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* 新闻元信息样式 */
.news-meta {
  display: flex;
  gap: 15px;
  margin-top: 10px;
  font-size: 12px;
  color: #999;
}

.news-date,
.news-category {
  display: flex;
  align-items: center;
}

.news-category {
  background-color: #e8f5e9;
  color: #4CAF50;
  padding: 2px 8px;
  border-radius: 4px;
}

/* 底部导航样式 */
.bottom-nav {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background-color: white;
  display: flex;
  justify-content: space-around;
  padding: 10px 0;
  box-shadow: 0 -2px 4px rgba(0,0,0,0.1);
  z-index: 999;
}

.bottom-nav-item {
  text-align: center;
  text-decoration: none;
  color: #666;
  padding: 5px 10px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.nav-icon {
  width: 24px;
  height: 24px;
  margin: 0 auto 5px;
  background-color: #e0e0e0;
  background-size: contain;
  background-repeat: no-repeat;
  background-position: center;
}

/* 为底部导航图标添加背景图片 */
.home-icon { background-image: url('https://via.placeholder.com/24/4CAF50/ffffff?text=🏠'); }
.forum-icon { background-image: url('https://via.placeholder.com/24/666/ffffff?text=💬'); }
.mall-icon { background-image: url('https://via.placeholder.com/24/666/ffffff?text=🛒'); }
.profile-icon { background-image: url('https://via.placeholder.com/24/666/ffffff?text=👤'); }

.bottom-nav-item.router-link-active {
  color: #4CAF50;
}

.bottom-nav-item.router-link-active .nav-icon {
  background-color: #4CAF50;
}

/* 响应式调整 - 统一修正 */
@media (max-width: 768px) {
  .nav-content {
    flex-direction: column;
    gap: 10px;
  }
  
  /* 轮播图移动端适配 */
  .carousel {
    height: 200px !important;
  }
  
  .carousel-text-wrapper {
    padding: 15px;
  }
  
  .carousel-title {
    font-size: 20px;
  }
  
  .tag {
    padding: 6px 12px;
    font-size: 13px;
  }
  
  .carousel-control {
    width: 40px;
    height: 40px;
    font-size: 20px;
  }
  
  /* 快捷功能适配 */
  .quick-access {
    grid-template-columns: repeat(2, 1fr);
  }
  
  /* 新闻列表适配 */
  .news-item {
    flex-direction: column;
  }
  
  .news-image {
    width: 100%;
    height: 150px;
  }
}
</style>