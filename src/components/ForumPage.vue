<template>
  <div class="forum-page">
    <!-- 顶部标题栏 -->
    <div class="page-header">
      <h1 class="page-title">🌾 农业论坛</h1>
      <p class="page-subtitle">分享经验 · 交流技术 · 共同成长</p>
    </div>

    <!-- 搜索框 -->
    <div class="search-bar">
      <input 
        v-model="searchKeyword" 
        type="text" 
        placeholder="搜索帖子..." 
        class="search-input"
        @keyup.enter="handleSearch"
      >
      <button class="search-btn" @click="handleSearch">🔍</button>
    </div>

    <!-- 分类标签 -->
    <div class="category-section">
      <h2 class="section-title">📂 论坛分类</h2>
      <div class="category-grid">
        <div 
          v-for="category in categories" 
          :key="category.id"
          class="category-card"
          @click="goToCategory(category.id)"
        >
          <div class="category-icon">{{ getCategoryIcon(category.name) }}</div>
          <div class="category-info">
            <h3 class="category-name">{{ category.name }}</h3>
            <p class="category-desc">{{ category.description }}</p>
            <span class="post-count">{{ category.postCount }} 帖子</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 热门帖子 -->
    <div class="hot-posts-section">
      <div class="section-header">
        <h2 class="section-title">🔥 热门帖子</h2>
        <button class="refresh-btn" @click="loadHotPosts">刷新</button>
      </div>
      
      <div v-if="loading" class="loading">
        <div class="loading-spinner"></div>
        <p>加载中...</p>
      </div>

      <div v-else-if="hotPosts.length === 0" class="empty-state">
        <p>暂无热门帖子</p>
      </div>

      <div v-else class="post-list">
        <div 
          v-for="post in hotPosts" 
          :key="post.id"
          class="post-card"
          @click="goToPostDetail(post.id)"
        >
          <!-- 置顶/精华标签 -->
          <div class="post-badges">
            <span v-if="post.isTop" class="badge badge-top">📌 置顶</span>
            <span v-if="post.isEssence" class="badge badge-essence">⭐ 精华</span>
          </div>

          <!-- 帖子标题 -->
          <h3 class="post-title">{{ post.title }}</h3>

          <!-- 帖子内容预览 -->
          <p class="post-content">{{ getContentPreview(post.content) }}</p>

          <!-- 分类标签 -->
          <span class="post-category">{{ post.categoryName }}</span>

          <!-- 帖子元信息 -->
          <div class="post-meta">
            <span class="meta-item">👁️ {{ post.viewCount }}</span>
            <span class="meta-item">❤️ {{ post.likeCount }}</span>
            <span class="meta-item">💬 {{ post.commentCount }}</span>
            <span class="meta-item">📅 {{ formatTime(post.createTime) }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 悬浮发帖按钮 -->
    <button class="fab" @click="goToCreatePost" title="发布新帖子">
      ✏️
    </button>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import api from '../api'

const router = useRouter()

// 数据
const searchKeyword = ref('')
const categories = ref([])
const hotPosts = ref([])
const loading = ref(false)

// 分类图标映射
const categoryIcons = {
  '种植技术': '🌱',
  '病虫害防治': '🐛',
  '农机具': '🚜',
  '市场行情': '📈',
  '政策法规': '📋',
  '经验分享': '💡',
  '问题求助': '❓',
  '其他': '📦'
}

// 获取分类图标
const getCategoryIcon = (name) => {
  return categoryIcons[name] || '📁'
}

// 获取内容预览
const getContentPreview = (content) => {
  if (!content) return ''
  return content.length > 100 ? content.substring(0, 100) + '...' : content
}

// 格式化时间
const formatTime = (timeStr) => {
  if (!timeStr) return ''
  const time = new Date(timeStr)
  const now = new Date()
  const diff = now - time
  
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  
  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes}分钟前`
  if (hours < 24) return `${hours}小时前`
  if (days < 7) return `${days}天前`
  
  return `${time.getMonth() + 1}/${time.getDate()}`
}

// 加载分类
const loadCategories = async () => {
  try {
    const res = await api.forum.getCategories()
    if (res.success) {
      categories.value = res.data || []
    } else {
      console.error('加载分类失败:', res.message)
    }
  } catch (error) {
    console.error('加载分类失败:', error)
  }
}

// 加载热门帖子
// 请求全部帖子（不管是谁的），按热度排序
const loadHotPosts = async () => {
  loading.value = true
  try {
    // 构造请求参数：请求热门帖子列表
    // 参数：page=1, size=10, sort=hot
    // 不传 categoryId，获取全部分类的热门帖子
    const res = await api.forum.getPosts({
      page: 1,
      size: 10,
      sort: 'hot'  // 按热度排序
    })
    
    // 响应格式：{ success, data: { records: [...], pages, current, total } }
    if (res.success) {
      hotPosts.value = res.data.records || []
      console.log(`[ForumPage] 加载热门帖子成功，共${res.data.total}条`)
    } else {
      console.error('加载热门帖子失败:', res.message)
    }
  } catch (error) {
    console.error('加载热门帖子失败:', error)
  } finally {
    loading.value = false
  }
}

// 跳转到分类页面
const goToCategory = (categoryId) => {
  router.push(`/forum/category/${categoryId}`)
}

// 跳转到帖子详情
const goToPostDetail = (postId) => {
  router.push(`/forum/post/${postId}`)
}

// 跳转到发帖页面
const goToCreatePost = () => {
  router.push('/forum/create')
}

// 搜索
const handleSearch = () => {
  if (searchKeyword.value.trim()) {
    router.push(`/forum/search?keyword=${encodeURIComponent(searchKeyword.value)}`)
  }
}

// 页面加载
onMounted(() => {
  loadCategories()
  loadHotPosts()
})
</script>

<style scoped>
.forum-page {
  min-height: 100vh;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  padding: 16px;
  padding-bottom: 80px;
}

/* 页面标题 */
.page-header {
  text-align: center;
  margin-bottom: 24px;
  padding: 24px 16px;
  background: linear-gradient(135deg, #4caf50 0%, #66bb6a 100%);
  border-radius: 16px;
  box-shadow: 0 4px 12px rgba(76, 175, 80, 0.3);
}

.page-title {
  font-size: 28px;
  font-weight: bold;
  color: white;
  margin: 0 0 8px 0;
}

.page-subtitle {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.9);
  margin: 0;
}

/* 搜索框 */
.search-bar {
  display: flex;
  gap: 8px;
  margin-bottom: 24px;
  background: white;
  padding: 8px;
  border-radius: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.search-input {
  flex: 1;
  border: none;
  outline: none;
  padding: 12px 16px;
  font-size: 15px;
  background: transparent;
}

.search-btn {
  padding: 12px 20px;
  background: #4caf50;
  color: white;
  border: none;
  border-radius: 20px;
  cursor: pointer;
  font-size: 16px;
  transition: background 0.3s;
}

.search-btn:hover {
  background: #45a049;
}

/* 分类区域 */
.category-section {
  margin-bottom: 32px;
}

.section-title {
  font-size: 20px;
  font-weight: bold;
  color: #333;
  margin: 0 0 16px 0;
}

.category-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 12px;
}

.category-card {
  background: white;
  padding: 16px;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.category-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 4px 16px rgba(76, 175, 80, 0.2);
}

.category-icon {
  font-size: 32px;
  margin-bottom: 8px;
}

.category-name {
  font-size: 16px;
  font-weight: bold;
  color: #333;
  margin: 0 0 4px 0;
}

.category-desc {
  font-size: 12px;
  color: #666;
  margin: 0 0 8px 0;
  line-height: 1.4;
}

.post-count {
  font-size: 12px;
  color: #4caf50;
  font-weight: 600;
}

/* 热门帖子区域 */
.hot-posts-section {
  margin-bottom: 32px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.refresh-btn {
  padding: 8px 16px;
  background: #ff9800;
  color: white;
  border: none;
  border-radius: 16px;
  cursor: pointer;
  font-size: 14px;
  transition: background 0.3s;
}

.refresh-btn:hover {
  background: #f57c00;
}

/* 加载状态 */
.loading {
  text-align: center;
  padding: 40px 20px;
  color: #666;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  margin: 0 auto 16px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #4caf50;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* 空状态 */
.empty-state {
  text-align: center;
  padding: 40px 20px;
  color: #999;
}

/* 帖子列表 */
.post-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.post-card {
  background: white;
  padding: 16px;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.post-card:hover {
  transform: translateX(4px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
}

/* 徽章 */
.post-badges {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
}

.badge {
  display: inline-block;
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
}

.badge-top {
  background: #ff9800;
  color: white;
}

.badge-essence {
  background: #ffc107;
  color: white;
}

/* 帖子内容 */
.post-title {
  font-size: 16px;
  font-weight: bold;
  color: #333;
  margin: 0 0 8px 0;
  line-height: 1.4;
}

.post-content {
  font-size: 14px;
  color: #666;
  margin: 0 0 12px 0;
  line-height: 1.6;
}

.post-category {
  display: inline-block;
  padding: 4px 12px;
  background: #e8f5e9;
  color: #4caf50;
  border-radius: 12px;
  font-size: 12px;
  margin-bottom: 12px;
}

/* 元信息 */
.post-meta {
  display: flex;
  gap: 16px;
  font-size: 13px;
  color: #999;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 4px;
}

/* 悬浮按钮 */
.fab {
  position: fixed;
  right: 20px;
  bottom: 80px;
  width: 56px;
  height: 56px;
  background: linear-gradient(135deg, #4caf50 0%, #66bb6a 100%);
  color: white;
  border: none;
  border-radius: 50%;
  font-size: 24px;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(76, 175, 80, 0.4);
  transition: all 0.3s;
  z-index: 100;
}

.fab:hover {
  transform: scale(1.1);
  box-shadow: 0 6px 16px rgba(76, 175, 80, 0.5);
}

.fab:active {
  transform: scale(0.95);
}

/* 响应式 */
@media (max-width: 768px) {
  .category-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .page-title {
    font-size: 24px;
  }
}
</style>
