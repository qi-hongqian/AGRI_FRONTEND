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
    <div class="carousel" ref="carousel">
      <div class="carousel-container">
        <!-- 每张轮播图及对应的文字 -->
        <div 
          v-for="(banner, index) in banners" 
          :key="index" 
          class="carousel-item"
          :class="{ active: index === currentIndex }"
          @touchstart="showCarouselIndicators" 
          @mousedown="showCarouselIndicators">
          <!-- 图片部分 -->
          <div class="carousel-image-wrapper">
            <img :src="banner.image" :alt="banner.title" class="carousel-image">
          </div>
          
          <!-- 文字部分 - 位于图片下方 -->
          <div class="carousel-text-wrapper">
            <h2 class="carousel-title">{{ banner.title }}</h2>
            <div class="carousel-tags">
              <span 
                v-for="(tag, tagIndex) in banner.tags" 
                :key="tagIndex" 
                class="tag">{{ tag }}</span>
            </div>
          </div>
        </div>
      </div>
      
      <!-- 轮播指示器 -->
      <div class="carousel-indicators" :class="{ 'indicators-visible': showIndicators }" @click="showCarouselIndicators">
        <button 
          v-for="(banner, index) in banners" 
          :key="index"
          class="indicator"
          :class="{ active: index === currentIndex }"
          @click="goToSlide(index)"
          :aria-label="'跳转到第' + (index + 1) + '张'">
        </button>
      </div>
      
      <!-- 轮播控制按钮 -->
      <button class="carousel-control prev" @click="prevBanner" aria-label="上一张">‹</button>
      <button class="carousel-control next" @click="nextBanner" aria-label="下一张">›</button>
    </div>

    <!-- 快捷功能按钮 - 修改为与导航栏一致的路由链接 -->
    <div class="quick-access">
      <router-link to="/home" class="quick-item">
        <div class="quick-icon home-icon"></div>
        <span>首页资讯</span>
      </router-link>
      <router-link to="/forum" class="quick-item">
        <div class="quick-icon forum-icon"></div>
        <span>资讯论坛</span>
      </router-link>
      <router-link to="/mall" class="quick-item">
        <div class="quick-icon mall-icon"></div>
        <span>农业商城</span>
      </router-link>
      <router-link to="/quiz" class="quick-item">
        <div class="quick-icon quiz-icon"></div>
        <span>农业答题</span>
      </router-link>
    </div>

    <!-- 咨询新闻 -->
    <div class="news-section">
      <h2 class="section-title">最新资讯</h2>
      <div class="news-list" v-if="!loading">
        <div 
          v-for="(news, index) in newsList" 
          :key="index" 
          class="news-item"
          @click="trackNewsClick(news)">
          <div class="news-content">
            <h3 class="news-title">{{ news.title }}</h3>
            <p class="news-summary">{{ news.summary }}</p>
            <div class="news-meta">
              <span class="news-date">{{ news.publishDate }}</span>
              <span class="news-category">{{ news.category }}</span>
            </div>
          </div>
          <div class="news-image">
            <img :src="news.image" :alt="news.title" loading="lazy">
          </div>
        </div>
      </div>
      <div v-else class="loading-state">
        <div class="loading-spinner"></div>
        <p>加载中...</p>
      </div>
    </div>

    <!-- 使用独立的底部导航组件 -->
    <BottomNav />
  </div>
</template>

<script>
import { ref, onMounted, onUnmounted, computed } from 'vue'
import BottomNav from './BottomNav.vue'
import { useHomeData } from '../composables/useHomeData'

export default {
  name: 'HomePage',
  components: {
    BottomNav
  },
  setup() {
    // 使用首页数据管理组合式函数
    const { carouselList, newsList, loading, fetchCarousel, fetchNews } = useHomeData()
    // 响应式状态
    const homePageRef = ref(null);
    const showNavBar = ref(true); // 默认显示导航栏
    const showIndicators = ref(false); // 轮播点显示状态
    let lastScrollTop = 0;
    // 轮播点自动隐藏的定时器
    let indicatorsTimer = null;
    
    // 处理滚动事件
    const handleScroll = () => {
      if (!homePageRef.value || !carousel.value) return;
      
      const scrollTop = homePageRef.value.scrollTop;
      const carouselRect = carousel.value.getBoundingClientRect();
      const headerHeight = 60; // 固定标题高度
      const navbarHeight = 36; // 导航栏高度
      
      // 优化的滚动逻辑，解决下拉留白问题
      // 当轮播图顶部接近标题底部时就显示导航栏
      // 使用负数阈值，让导航栏在轮播图超过顶部标签一点点时就显示
      if (carouselRect.top <= headerHeight - 10) {
        // 轮播图超过标题底部一定距离，隐藏导航栏
        showNavBar.value = false;
      } else {
        // 轮播图接近或未到达标题底部，显示导航栏
        showNavBar.value = true;
      }
      
      lastScrollTop = scrollTop;
    };
    
    // 计算属性：将API数据转换为组件需要的格式
    const banners = computed(() => {
      return carouselList.value.map(item => ({
        image: item.image,
        title: item.title,
        tags: item.tags || ['农业', '科技', '创新']
      }))
    })
    
    const currentIndex = ref(0)
    const carousel = ref(null)
    let timer = null
    
    // 显示轮播点并设置自动隐藏
    const showCarouselIndicators = () => {
      // 清除之前的定时器
      if (indicatorsTimer) {
        clearTimeout(indicatorsTimer)
      }
      
      // 显示轮播点
      showIndicators.value = true
      
      // 设置定时器，3秒后自动隐藏
      indicatorsTimer = setTimeout(() => {
        showIndicators.value = false
      }, 3000)
    }
    
    // 自动轮播
    const startAutoPlay = () => {
      timer = setInterval(() => {
        nextBanner()
      }, 3000) // 3秒切换一次
    }
    
    // 清除自动轮播
    const stopAutoPlay = () => {
      if (timer) {
        clearInterval(timer)
        timer = null
      }
    }
    
    // 下一张
    const nextBanner = () => {
      currentIndex.value = (currentIndex.value + 1) % banners.length
    }
    
    // 上一张
    const prevBanner = () => {
      currentIndex.value = (currentIndex.value - 1 + banners.length) % banners.length
    }
    
    // 跳转到指定幻灯片
    const goToSlide = (index) => {
      currentIndex.value = index
      showCarouselIndicators()
    }

    // 新闻点击跟踪
    const trackNewsClick = (news) => {
      // 这里可以集成用户行为跟踪
      console.log('News clicked:', news.title)
      // 可以在这里添加路由跳转逻辑
      // router.push(`/news/${news.id}`)
    }
    onMounted(async () => {
      // 加载首页数据
      await fetchCarousel()
      await fetchNews()
      
      startAutoPlay()
      
      // 鼠标悬停时停止轮播，离开时继续
      if (carousel.value) {
        carousel.value.addEventListener('mouseenter', stopAutoPlay)
        carousel.value.addEventListener('mouseleave', startAutoPlay)
      }
      
      // 初始显示轮播点2秒，之后自动隐藏
      showCarouselIndicators()
    })
    
    // 组件卸载时清除定时器和事件监听
    onUnmounted(() => {
      stopAutoPlay()
      if (carousel.value) {
        carousel.value.removeEventListener('mouseenter', stopAutoPlay)
        carousel.value.removeEventListener('mouseleave', startAutoPlay)
      }
      // 清除轮播点定时器，避免内存泄漏
      if (indicatorsTimer) {
        clearTimeout(indicatorsTimer)
      }
    })
    
    return {
      banners,
      newsList,
      loading,
      currentIndex,
      carousel,
      nextBanner,
      prevBanner,
      goToSlide,
      homePageRef,
      showNavBar,
      showIndicators,
      showCarouselIndicators,
      handleScroll,
      trackNewsClick
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

/* 轮播图样式 - 核心修正：移除白色背景和圆角，与导航栏连接 */
.carousel {
  position: relative;
  width: 100%; /* 改为100%宽度，与导航栏完全对齐 */
  margin: -1px auto 0 auto; /* 负边距让轮播图向上移动，与导航栏完全连接 */
  overflow: hidden;
  box-shadow: 0 4px 8px rgba(0,0,0,0.1);
  border-radius: 0; /* 明确设置无边角 */
  /* 添加与导航栏相同的背景色，视觉上隐藏留白 */
  background-color: #4CAF50; /* 与导航栏背景色一致 */
  height: 100px !important; /* 使用!important确保覆盖全局样式 */
}

/* 轮播容器 */
.carousel-container {
  height: 100%;
  position: relative;
}

/* 单个轮播项 - 修正：取消默认背景继承 */
.carousel-item {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  opacity: 0; /* 默认隐藏 */
  transition: opacity 0.5s ease-in-out;
  display: flex;
  flex-direction: column;
  background: transparent; /* 明确设置透明，避免继承 */
}

.carousel-item.active {
  opacity: 1; /* 只显示活动的轮播项 */
  z-index: 10;
}

/* 图片包装器 - 占满轮播高度 */
.carousel-image-wrapper {
  height: 100%; /* 修正：让图片区域占满轮播图高度 */
  overflow: hidden;
}

.carousel-image {
  width: 100%;
  height: 100%;
  object-fit: cover; /* 保持图片比例并铺满容器 */
  display: block;
}

/* 文字包装器 - 核心修正：悬浮在图片上方，半透明背景增强可读性 */
.carousel-text-wrapper {
  position: absolute; /* 脱离文档流，悬浮在图片上方 */
  bottom: 0; /* 靠底部对齐 */
  left: 0;
  right: 0; /* 左右铺满图片宽度 */
  padding: 10px 20px; /* 减少垂直内边距 */
  text-align: center;
  background-color: rgba(0, 0, 0, 0.3); /* 半透明黑色背景，不遮挡图片细节 */
  display: flex;
  flex-direction: column;
  max-height: 80px; /* 添加最大高度限制 */
  justify-content: center; /* 垂直居中内容 */
  justify-content: center;
  z-index: 15; /* 确保在图片上方，低于指示器和控制按钮 */
}

.carousel-title {
  margin: 0 0 8px 0; /* 减少标题与标签之间的间距 */
  font-size: 20px; /* 减小字体大小 */
  font-weight: bold;
  color: white; /* 白色文字适配半透明背景 */
  text-shadow: 1px 1px 3px rgba(0, 0, 0, 0.8); /* 增强文字立体感 */
}

.carousel-tags {
  display: flex;
  gap: 15px;
  flex-wrap: wrap;
  justify-content: center;
  align-items: center;
}

.tag {
  background-color: rgba(76, 175, 80, 0.8);
  color: white;
  padding: 8px 20px;
  border-radius: 25px;
  font-size: 15px;
  font-weight: 500;
  display: inline-block;
}

/* 轮播指示器 */
.carousel-indicators {
  position: absolute;
  bottom: 10px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 10px;
  z-index: 20; /* 确保在文字区域上方 */
  opacity: 0; /* 默认隐藏 */
  transition: opacity 0.5s ease-in-out; /* 渐变效果 */
}

/* 轮播点可见状态 */
.carousel-indicators.indicators-visible {
  opacity: 1; /* 可见时完全不透明 */
}

.indicator {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background-color: rgba(255,255,255,0.5);
  border: none;
  cursor: pointer;
  transition: all 0.3s ease;
  outline: none;
  padding: 0;
}

.indicator.active {
  background-color: white;
  transform: scale(1.2);
}

.indicator:hover {
  background-color: rgba(255,255,255,0.8);
}

/* 轮播控制按钮 */
.carousel-control {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 50px;
  height: 50px;
  background-color: rgba(0, 0, 0, 0.3);
  color: white;
  border: none;
  border-radius: 50%;
  font-size: 24px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.3s;
  z-index: 20; /* 确保在最上层 */
}

.carousel-control.prev {
  left: 20px;
}

.carousel-control.next {
  right: 20px;
}

.carousel-control:hover {
  background-color: rgba(0,0,0,0.6);
}

/* 快捷功能按钮样式 */
.quick-access {
  max-width: 1200px;
  margin: 30px auto;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
  padding: 0 20px;
}

.quick-item {
  background-color: white;
  padding: 20px;
  border-radius: 8px;
  text-align: center;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  transition: transform 0.3s, box-shadow 0.3s;
  text-decoration: none;
  color: #333;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.quick-item:hover,
.quick-item.router-link-active {
  transform: translateY(-5px);
  box-shadow: 0 6px 12px rgba(0,0,0,0.15);
  color: #4CAF50;
}

.quick-icon {
  width: 60px;
  height: 60px;
  margin: 0 auto 10px;
  background-color: #e3f2fd;
  border-radius: 50%;
  background-size: contain;
  background-repeat: no-repeat;
  background-position: center;
}

/* 快捷功能图标样式 */
.quick-icon.home-icon {
  background-color: #e8f5e9;
  background-image: url('https://via.placeholder.com/40/4CAF50/ffffff?text=🏠');
}

.quick-icon.forum-icon {
  background-color: #e3f2fd;
  background-image: url('https://via.placeholder.com/40/2196f3/ffffff?text=💬');
}

.quick-icon.mall-icon {
  background-color: #fff3e0;
  background-image: url('https://via.placeholder.com/40/ff9800/ffffff?text=🛒');
}

.quick-icon.quiz-icon {
  background-color: #fce4ec;
  background-image: url('https://via.placeholder.com/40/e91e63/ffffff?text=🎯');
}

.quick-icon.profile-icon {
  background-color: #f3e5f5;
  background-image: url('https://via.placeholder.com/40/9c27b0/ffffff?text=👤');
}

/* 激活状态的快捷功能图标 */
.quick-item.router-link-active .quick-icon {
  background-color: #4CAF50;
}

/* 新闻样式 */
.news-section {
  max-width: 1200px;
  margin: 30px auto;
  padding: 0 20px;
}

.section-title {
  color: #333;
  margin-bottom: 20px;
  padding-bottom: 10px;
  border-bottom: 2px solid #4CAF50;
}

.news-list {
  display: grid;
  gap: 20px;
  margin-bottom: 50px;  
}

.news-item {
  background-color: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  display: flex;
  gap: 20px;
}

.news-content {
  flex: 1;
}

.news-title {
  color: #333;
  margin: 0 0 10px 0;
  font-size: 18px;
}

.news-summary {
  color: #666;
  margin: 0;
  line-height: 1.6;
}

.news-image {
  width: 150px;
  height: 100px;
  overflow: hidden;
  border-radius: 4px;
}

.news-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* 加载状态样式 */
.loading-state {
  text-align: center;
  padding: 40px 20px;
  color: #666;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #f3f3f3;
  border-top: 3px solid #4CAF50;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 20px;
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