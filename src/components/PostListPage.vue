<template>
  <div class="post-list-page">
    <!-- 顶部导航栏 -->
    <div class="top-bar">
      <button class="back-btn" @click="goBack">← 返回</button>
      <h1 class="page-title">{{ currentCategoryName }}</h1>
      <button class="search-btn" @click="showSearch = !showSearch">🔍</button>
    </div>

    <!-- 搜索框 -->
    <div v-if="showSearch" class="search-box">
      <input 
        v-model="searchKeyword" 
        type="text" 
        placeholder="搜索帖子..." 
        class="search-input"
        @keyup.enter="handleSearch"
      >
      <button class="search-submit-btn" @click="handleSearch">搜索</button>
    </div>

    <!-- 分类筛选 -->
    <div class="filter-bar">
      <div class="category-tabs">
        <button 
          class="category-tab"
          :class="{ active: selectedCategory === null }"
          @click="selectCategory(null)"
        >
          🌐 全部
        </button>
        <button 
          v-for="category in categories" 
          :key="category.id"
          class="category-tab"
          :class="{ active: selectedCategory === category.id }"
          @click="selectCategory(category.id)"
        >
          {{ getCategoryIcon(category.name) }} {{ category.name }}
        </button>
      </div>
    </div>

    <!-- 排序方式 -->
    <div class="sort-bar">
      <button 
        class="sort-btn"
        :class="{ active: sortType === 'new' }"
        @click="changeSortType('new')"
      >
        🆕 最新
      </button>
      <button 
        class="sort-btn"
        :class="{ active: sortType === 'hot' }"
        @click="changeSortType('hot')"
      >
        🔥 最热
      </button>
      <button 
        class="sort-btn"
        :class="{ active: sortType === 'top' }"
        @click="changeSortType('top')"
      >
        📌 置顶
      </button>
    </div>

    <!-- 帖子列表 -->
    <div v-if="loading" class="loading-container">
      <div class="loading-spinner"></div>
      <p>加载中...</p>
    </div>

    <div v-else-if="posts.length === 0" class="empty-state">
      <div class="empty-icon">📭</div>
      <p class="empty-text">暂无帖子</p>
      <button class="create-btn" @click="goToCreatePost">发布第一个帖子</button>
    </div>

    <div v-else class="posts-container">
      <div 
        v-for="post in posts" 
        :key="post.id"
        class="post-card"
        @click="goToPostDetail(post.id)"
      >
        <!-- 作者信息 (置于首位) -->
        <div class="author-wrapper">
          <img v-if="post.avatar" :src="getImageUrl(post.avatar, true)" class="author-avatar" />
          <div v-else class="author-avatar-placeholder">👤</div>
          <span class="author-name">{{ post.nickname || '用户' + post.userId }}</span>
        </div>

        <!-- 缩略图 -->
        <div v-if="getPostThumbnail(post)" class="post-thumbnail-wrapper">
          <img 
            :src="getPostThumbnail(post)" 
            :alt="post.title"
            class="post-thumbnail"
            @error="e => e.target.style.display = 'none'"
          >
        </div>

        <!-- 置顶/精华标签 -->
        <div class="post-badges">
          <span v-if="post.isTop" class="badge badge-top">📌 置顶</span>
          <span v-if="post.isEssence" class="badge badge-essence">⭐ 精华</span>
          <span v-if="post.isRecommend" class="badge badge-recommend">👍 推荐</span>
        </div>

        <!-- 帖子标题 -->
        <h3 class="post-title">{{ post.title }}</h3>

        <!-- 帖子内容预览 -->
        <p class="post-preview">{{ getContentPreview(post.content) }}</p>

        <!-- 分类信息 -->
        <div class="post-info">
          <span class="category-tag">{{ post.categoryName }}</span>
        </div>

        <!-- 帖子统计 -->
        <div class="post-stats">
          <span class="stat-item">
            <span class="stat-icon">👁️</span>
            <span class="stat-value">{{ formatNumber(post.viewCount) }}</span>
          </span>
          <span class="stat-item" :class="{ liked: post.hasLiked }">
            <span class="stat-icon">{{ post.hasLiked ? '❤️' : '🤍' }}</span>
            <span class="stat-value">{{ formatNumber(post.likeCount) }}</span>
          </span>
          <span class="stat-item">
            <span class="stat-icon">💬</span>
            <span class="stat-value">{{ formatNumber(post.commentCount) }}</span>
          </span>
          <span class="stat-item time">
            <span class="stat-icon">📅</span>
            <span class="stat-value">{{ formatTime(post.createTime) }}</span>
          </span>
        </div>
      </div>

      <!-- 加载更多 -->
      <div v-if="hasMore" class="load-more">
        <button 
          class="load-more-btn" 
          :disabled="loadingMore"
          @click="loadMorePosts"
        >
          {{ loadingMore ? '加载中...' : '加载更多' }}
        </button>
      </div>

      <!-- 没有更多 -->
      <div v-else class="no-more">
        <p>- 没有更多了 -</p>
      </div>
    </div>

    <!-- 悬浮发帖按钮 -->
    <button class="fab" @click="goToCreatePost" title="发布新帖子">
      ✏️
    </button>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import api from '../api'
import { getEnvConfig } from '../config/env'

const route = useRoute()
const router = useRouter()

// 数据
const categories = ref([])
const posts = ref([])
const selectedCategory = ref(null)
const sortType = ref('new') // new, hot, top
const currentPage = ref(1)
const pageSize = ref(10)
const totalPages = ref(0)
const loading = ref(false)
const loadingMore = ref(false)
const showSearch = ref(false)
const searchKeyword = ref('')

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

// 当前分类名称
const currentCategoryName = computed(() => {
  if (selectedCategory.value === null) return '全部帖子'
  const category = categories.value.find(c => c.id === selectedCategory.value)
  return category ? category.name : '帖子列表'
})

// 是否还有更多
const hasMore = computed(() => currentPage.value < totalPages.value)

// 获取分类图标
const getCategoryIcon = (name) => {
  return categoryIcons[name] || '📁'
}

// 获取内容预览
const getContentPreview = (content) => {
  if (!content) return ''
  return content.length > 100 ? content.substring(0, 100) + '...' : content
}

// 构造完整的图片URL
const getImageUrl = (relativePath, isAvatar = false) => {
  if (!relativePath) return ''
  if (relativePath.startsWith('http')) return relativePath
  const envConfig = getEnvConfig()
  const baseUrl = isAvatar ? envConfig.USER_API : envConfig.FORUM_API
  return `${baseUrl}${relativePath}`
}

// 获取帖子的第一张图片（缩略图）
const getPostThumbnail = (post) => {
  // 如果有thumbnailUrl，优先使用
  if (post.thumbnailUrl) {
    return getImageUrl(post.thumbnailUrl)
  }
  
  // 或者从 mediaList 中取第一张图片
  if (post.mediaList && post.mediaList.length > 0) {
    const firstImage = post.mediaList.find(m => m.type === 1)  // 1 = 图片
    if (firstImage) {
      return getImageUrl(firstImage.url)
    }
  }
  
  return ''  // 没有图片，返回空
}

// 格式化数字
const formatNumber = (num) => {
  if (!num) return 0
  if (num >= 10000) return (num / 10000).toFixed(1) + 'w'
  if (num >= 1000) return (num / 1000).toFixed(1) + 'k'
  return num
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

// 加载帖子列表
// 请求全部帖子（不管是谁的），可选筛选分类
const loadPosts = async (reset = true) => {
  if (reset) {
    loading.value = true
    currentPage.value = 1
    posts.value = []
  } else {
    loadingMore.value = true
  }

  try {
    // 构造请求参数
    // 必填：page, size, sort
    // 可选：categoryId
    const params = {
      page: currentPage.value,
      size: pageSize.value,
      sort: sortType.value  // new(最新)、hot(最热)、top(置顶)
    }

    // 如果选择了分类，添加分类筛选
    if (selectedCategory.value !== null) {
      params.categoryId = selectedCategory.value
    }

    // 发送请求：GET /api/forum/posts?page=1&size=10&sort=hot&categoryId=1
    const res = await api.forum.getPosts(params)
    
    // 响应格式：{ success, data: { records: [...], total, pages, current } }
    if (res.success) {
      const data = res.data
      // 遍历帖子列表
      // records 中包含：id, title, content, categoryName, viewCount, likeCount, commentCount, createTime 等
      if (reset) {
        posts.value = data.records || []
      } else {
        posts.value = [...posts.value, ...(data.records || [])]
      }
      totalPages.value = data.pages || 0
      console.log(`[PostListPage] 加载成功，共${data.total}条，当前第${data.current}页`)
    } else {
      console.error('加载帖子失败:', res.message)
    }
  } catch (error) {
    console.error('加载帖子失败:', error)
  } finally {
    loading.value = false
    loadingMore.value = false
  }
}

// 加载更多
const loadMorePosts = async () => {
  if (loadingMore.value || !hasMore.value) return
  currentPage.value++
  await loadPosts(false)
}

// 选择分类
const selectCategory = (categoryId) => {
  selectedCategory.value = categoryId
  loadPosts(true)
}

// 切换排序
const changeSortType = (type) => {
  sortType.value = type
  loadPosts(true)
}

// 搜索
const handleSearch = () => {
  if (searchKeyword.value.trim()) {
    router.push(`/forum/search?keyword=${encodeURIComponent(searchKeyword.value)}`)
  }
}

// 跳转到帖子详情
const goToPostDetail = (postId) => {
  router.push(`/forum/post/${postId}`)
}

// 跳转到发帖页面
const goToCreatePost = () => {
  router.push('/forum/create')
}

// 返回
const goBack = () => {
  router.back()
}

// 监听路由参数变化
watch(() => route.params.categoryId, (newVal) => {
  if (newVal) {
    selectedCategory.value = parseInt(newVal)
  }
  loadPosts(true)
})

// 页面加载
onMounted(() => {
  // 从路由参数获取分类ID
  if (route.params.categoryId) {
    selectedCategory.value = parseInt(route.params.categoryId)
  }
  
  loadCategories()
  loadPosts(true)
})
</script>

<style scoped>
.post-list-page {
  min-height: 100vh;
  background: #f5f5f5;
  padding-bottom: 80px;
}

/* 顶部导航 */
.top-bar {
  position: sticky;
  top: 0;
  background: linear-gradient(135deg, #4caf50 0%, #66bb6a 100%);
  padding: 12px 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 2px 8px rgba(76, 175, 80, 0.3);
  z-index: 100;
}

.back-btn, .search-btn {
  background: rgba(255, 255, 255, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.3);
  color: white;
  font-size: 16px;
  cursor: pointer;
  padding: 8px 12px;
  border-radius: 8px;
  transition: all 0.3s;
}

.back-btn:hover, .search-btn:hover {
  background: rgba(255, 255, 255, 0.3);
}

.page-title {
  font-size: 18px;
  font-weight: bold;
  margin: 0;
  color: white;
}

/* 搜索框 */
.search-box {
  background: white;
  padding: 12px 16px;
  display: flex;
  gap: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.search-input {
  flex: 1;
  padding: 10px 12px;
  border: 1px solid #ddd;
  border-radius: 20px;
  font-size: 14px;
  outline: none;
}

.search-input:focus {
  border-color: #4caf50;
}

.search-submit-btn {
  padding: 10px 20px;
  background: #4caf50;
  color: white;
  border: none;
  border-radius: 20px;
  cursor: pointer;
  font-size: 14px;
  transition: background 0.3s;
}

.search-submit-btn:hover {
  background: #45a049;
}

/* 分类筛选栏 */
.filter-bar {
  background: white;
  padding: 12px 0;
  overflow-x: auto;
  border-bottom: 1px solid #eee;
}

.category-tabs {
  display: flex;
  gap: 8px;
  padding: 0 16px;
  white-space: nowrap;
}

.category-tab {
  padding: 8px 16px;
  background: #f5f5f5;
  border: none;
  border-radius: 20px;
  cursor: pointer;
  font-size: 14px;
  color: #666;
  transition: all 0.3s;
  flex-shrink: 0;
}

.category-tab:hover {
  background: #e8f5e9;
  color: #4caf50;
}

.category-tab.active {
  background: #4caf50;
  color: white;
  font-weight: 600;
}

/* 排序栏 */
.sort-bar {
  background: white;
  padding: 12px 16px;
  display: flex;
  gap: 12px;
  border-bottom: 1px solid #eee;
}

.sort-btn {
  padding: 6px 16px;
  background: #f5f5f5;
  border: none;
  border-radius: 16px;
  cursor: pointer;
  font-size: 13px;
  color: #666;
  transition: all 0.3s;
}

.sort-btn:hover {
  background: #e8f5e9;
  color: #4caf50;
}

.sort-btn.active {
  background: #4caf50;
  color: white;
  font-weight: 600;
}

/* 加载状态 */
.loading-container {
  text-align: center;
  padding: 60px 20px;
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
  padding: 60px 20px;
}

.empty-icon {
  font-size: 64px;
  margin-bottom: 16px;
}

.empty-text {
  font-size: 16px;
  color: #999;
  margin: 0 0 20px 0;
}

.create-btn {
  padding: 12px 32px;
  background: #4caf50;
  color: white;
  border: none;
  border-radius: 24px;
  cursor: pointer;
  font-size: 15px;
  transition: background 0.3s;
}

.create-btn:hover {
  background: #45a049;
}

/* 帖子容器 */
.posts-container {
  padding: 16px;
}

.post-card {
  background: white;
  padding: 16px;
  border-radius: 12px;
  margin-bottom: 12px;
  cursor: pointer;
  transition: all 0.3s;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.post-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
}

/* 缩略图 */
.post-thumbnail-wrapper {
  width: 100%;
  height: 160px;
  margin: -16px -16px 12px -16px;
  background: #f0f0f0;
  border-radius: 12px 12px 0 0;
  overflow: hidden;
}

.post-thumbnail {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.post-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 10px;
}

.badge {
  padding: 3px 10px;
  border-radius: 10px;
  font-size: 11px;
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

.badge-recommend {
  background: #2196f3;
  color: white;
}

/* 帖子标题 */
.post-title {
  font-size: 16px;
  font-weight: 600;
  color: #333;
  margin: 0 0 10px 0;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* 内容预览 */
.post-preview {
  font-size: 14px;
  color: #666;
  margin: 0 0 12px 0;
  line-height: 1.6;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* 帖子信息 */
.post-info {
  display: flex;
  gap: 12px;
  align-items: center;
  margin-bottom: 12px;
}

.category-tag {
  padding: 4px 10px;
  background: #e8f5e9;
  color: #4caf50;
  border-radius: 10px;
  font-size: 12px;
  font-weight: 600;
}

.author-wrapper {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  position: relative;
  padding-bottom: 8px;
}

.author-wrapper::after {
  content: "";
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100px;
  height: 1px;
  background: #eee;
}

.author-avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  object-fit: cover;
  border: 1.5px solid #4caf50;
}

.author-avatar-placeholder {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: #f0f0f0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  color: #999;
  border: 1.5px solid #eee;
}

.author-name {
  font-size: 13px;
  font-weight: 600;
  color: #333;
}

/* 帖子统计 */
.post-stats {
  display: flex;
  gap: 16px;
  font-size: 12px;
  color: #999;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 4px;
}

.stat-item.time {
  margin-left: auto;
}

.stat-icon {
  font-size: 13px;
}

.stat-value {
  font-size: 12px;
}

/* 加载更多 */
.load-more {
  text-align: center;
  margin: 20px 0;
}

.load-more-btn {
  padding: 12px 40px;
  background: white;
  border: 1px solid #ddd;
  border-radius: 24px;
  cursor: pointer;
  font-size: 14px;
  color: #666;
  transition: all 0.3s;
}

.load-more-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.load-more-btn:not(:disabled):hover {
  background: #f5f5f5;
  border-color: #4caf50;
  color: #4caf50;
}

/* 没有更多 */
.no-more {
  text-align: center;
  padding: 20px;
  color: #999;
  font-size: 13px;
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

.stat-item.liked {
  color: #f44336;
}

.stat-item.liked .stat-icon {
  text-shadow: 0 0 5px rgba(244, 67, 54, 0.3);
}

/* 响应式 */
@media (max-width: 768px) {
  .page-title {
    font-size: 16px;
  }
  
  .post-title {
    font-size: 15px;
  }
}
</style>
