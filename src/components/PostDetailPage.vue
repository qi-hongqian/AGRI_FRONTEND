<template>
  <div class="post-detail-page">
    <!-- 顶部导航栏 -->
    <div class="top-bar">
      <button class="back-btn" @click="goBack">← 返回</button>
      <div class="top-actions">
        <button v-if="isAuthor" class="action-btn" @click="showOptions">⋯</button>
      </div>
    </div>

    <!-- 加载状态 -->
    <div v-if="loading" class="loading-container">
      <div class="loading-spinner"></div>
      <p>加载中...</p>
    </div>

    <!-- 帖子内容 -->
    <div v-else-if="post" class="post-container">
      <!-- 徽章 -->
      <div class="post-badges">
        <span v-if="post.isTop" class="badge badge-top">📌 置顶</span>
        <span v-if="post.isEssence" class="badge badge-essence">⭐ 精华</span>
      </div>

      <!-- 标题 -->
      <h1 class="post-title">{{ post.title }}</h1>

      <!-- 分类和元信息 -->
      <div class="post-meta">
        <span class="category-tag">{{ post.categoryName }}</span>
        <span class="meta-item">👁️ {{ post.viewCount }}</span>
        <span class="meta-item">📅 {{ formatTime(post.createTime) }}</span>
      </div>

      <!-- 帖子正文 -->
      <div class="post-content">
        <p v-html="formatContent(post.content)"></p>
      </div>

      <!-- 媒体文件 -->
      <div v-if="media.length > 0" class="media-gallery">
        <img 
          v-for="item in media.filter(m => m.type === 1)" 
          :key="item.id"
          :src="getImageUrl(item.url)" 
          :alt="item.fileName"
          class="media-image"
          @click="previewImage(getImageUrl(item.url))"
        >
      </div>

      <!-- 互动栏 -->
      <div class="action-bar">
        <button 
          class="action-button" 
          :class="{ active: post.isLiked }"
          @click="toggleLike"
        >
          <span class="action-icon">{{ post.isLiked ? '❤️' : '🤍' }}</span>
          <span class="action-text">{{ post.likeCount }}</span>
        </button>
        
        <button class="action-button">
          <span class="action-icon">💬</span>
          <span class="action-text">{{ post.commentCount }}</span>
        </button>
        
        <button 
          class="action-button" 
          :class="{ active: post.isCollected }"
          @click="toggleCollect"
        >
          <span class="action-icon">{{ post.isCollected ? '⭐' : '☆' }}</span>
          <span class="action-text">{{ post.collectCount }}</span>
        </button>
        
        <button class="action-button" @click="sharePost">
          <span class="action-icon">📤</span>
          <span class="action-text">分享</span>
        </button>
      </div>

      <!-- 评论区 -->
      <div class="comments-section">
        <div class="comments-header">
          <h2 class="comments-title">💬 评论 ({{ comments.length }})</h2>
          <select v-model="commentSort" class="sort-select" @change="loadComments">
            <option value="time">最新</option>
            <option value="hot">最热</option>
          </select>
        </div>

        <!-- 发布评论框 -->
        <div class="comment-input-box">
          <textarea 
            v-model="newComment"
            placeholder="发表你的看法..."
            class="comment-input"
            rows="3"
          ></textarea>
          <button 
            class="submit-comment-btn" 
            :disabled="!newComment.trim()"
            @click="submitComment"
          >
            发布
          </button>
        </div>

        <!-- 评论列表 -->
        <div v-if="comments.length === 0" class="empty-comments">
          <p>暂无评论，快来抢沙发吧！</p>
        </div>

        <div v-else class="comments-list">
          <div 
            v-for="comment in comments" 
            :key="comment.id"
            class="comment-item"
          >
            <!-- 用户头像和信息 -->
            <div class="comment-header">
              <div class="user-avatar">👤</div>
              <div class="user-info">
                <span class="user-name">用户{{ comment.userId }}</span>
                <span class="comment-time">{{ formatTime(comment.createTime) }}</span>
              </div>
              <button 
                v-if="comment.userId === currentUserId || isAuthor" 
                class="delete-btn"
                @click="deleteComment(comment.id)"
              >
                删除
              </button>
            </div>

            <!-- 评论内容 -->
            <div class="comment-content">{{ comment.content }}</div>

            <!-- 评论操作 -->
            <div class="comment-actions">
              <button 
                class="comment-action-btn"
                :class="{ active: comment.isLiked }"
                @click="toggleCommentLike(comment.id)"
              >
                {{ comment.isLiked ? '❤️' : '🤍' }} {{ comment.likeCount || 0 }}
              </button>
              <button 
                class="comment-action-btn"
                @click="replyToComment(comment)"
              >
                💬 回复
              </button>
            </div>

            <!-- 回复列表 -->
            <div v-if="comment.replies && comment.replies.length > 0" class="replies-list">
              <div 
                v-for="reply in comment.replies" 
                :key="reply.id"
                class="reply-item"
              >
                <div class="reply-header">
                  <span class="reply-user">用户{{ reply.userId }}</span>
                  <span class="reply-time">{{ formatTime(reply.createTime) }}</span>
                </div>
                <div class="reply-content">{{ reply.content }}</div>
              </div>
            </div>
          </div>
        </div>

        <!-- 加载更多 -->
        <div v-if="hasMoreComments" class="load-more">
          <button class="load-more-btn" @click="loadMoreComments">
            加载更多评论
          </button>
        </div>
      </div>
    </div>

    <!-- 错误状态 -->
    <div v-else class="error-state">
      <p>帖子加载失败</p>
      <button class="retry-btn" @click="loadPostDetail">重试</button>
    </div>

    <!-- 回复弹窗 -->
    <div v-if="showReplyModal" class="modal-overlay" @click="closeReplyModal">
      <div class="reply-modal" @click.stop>
        <div class="modal-header">
          <h3>回复评论</h3>
          <button class="close-btn" @click="closeReplyModal">×</button>
        </div>
        <div class="modal-body">
          <div class="reply-to">
            回复：<span class="reply-to-user">用户{{ replyTarget?.userId }}</span>
          </div>
          <textarea 
            v-model="replyContent"
            placeholder="输入回复内容..."
            class="reply-input"
            rows="4"
          ></textarea>
        </div>
        <div class="modal-footer">
          <button class="cancel-btn" @click="closeReplyModal">取消</button>
          <button 
            class="submit-btn" 
            :disabled="!replyContent.trim()"
            @click="submitReply"
          >
            发送
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAppStore } from '../stores/app'
import api from '../api'
import { getEnvConfig } from '../config/env'

const route = useRoute()
const router = useRouter()
const appStore = useAppStore()

// 数据
const post = ref(null)
const media = ref([])
const comments = ref([])
const loading = ref(true)
const newComment = ref('')
const commentSort = ref('time')
const currentPage = ref(1)
const hasMoreComments = ref(false)

// 回复相关
const showReplyModal = ref(false)
const replyTarget = ref(null)
const replyContent = ref('')

// 当前用户ID
const currentUserId = computed(() => appStore.user?.id)

// 是否是作者
const isAuthor = computed(() => post.value?.userId === currentUserId.value)

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
  
  return `${time.getFullYear()}/${time.getMonth() + 1}/${time.getDate()}`
}

// 格式化内容（简单换行处理）
const formatContent = (content) => {
  if (!content) return ''
  return content.replace(/\n/g, '<br>')
}

// 构造完整的图片URL
const getImageUrl = (relativePath) => {
  if (!relativePath) return ''
  if (relativePath.startsWith('http')) return relativePath
  const envConfig = getEnvConfig()
  return `${envConfig.FORUM_API}${relativePath}`
}

// 加载帖子详情
const loadPostDetail = async () => {
  loading.value = true
  try {
    const postId = route.params.id
    
    // 获取帖子详情（包含媒体列表）
    // 新的数据结构：data.post 和 data.mediaList
    const res = await api.forum.getPostDetail(postId)
    if (res.success) {
      post.value = res.data.post
      media.value = res.data.mediaList || []
      
      console.log('[PostDetailPage] 帖子详情:', {
        post: res.data.post,
        mediaCount: res.data.mediaList?.length || 0
      })
      
      // 增加浏览量
      await api.forum.incrementView(postId)
      
      // 加载评论
      await loadComments()
    } else {
      console.error('加载帖子失败:', res.message)
    }
  } catch (error) {
    console.error('加载帖子失败:', error)
  } finally {
    loading.value = false
  }
}

// 加载媒体文件
// 抨注：媒体列表已经包含在 getPostDetail 的响应中，不需要单独加载
// const loadMedia = async (postId) => {
//   try {
//     const res = await api.forum.getPostMedia(postId)
//     if (res.success) {
//       media.value = res.data || []
//     }
//   } catch (error) {
//     console.error('加载媒体失败:', error)
//   }
// }

// 加载评论
const loadComments = async () => {
  try {
    const postId = route.params.id
    const res = await api.forum.getComments(postId, currentPage.value, 10, commentSort.value)
    if (res.success) {
      const data = res.data
      comments.value = data.records || []
      hasMoreComments.value = currentPage.value < data.pages
      
      // 加载每个评论的回复
      for (const comment of comments.value) {
        await loadReplies(comment)
      }
    } else {
      console.error('加载评论失败:', res.message)
    }
  } catch (error) {
    console.error('加载评论失败:', error)
  }
}

// 加载回复
const loadReplies = async (comment) => {
  try {
    const res = await api.forum.getReplies(comment.id)
    if (res.success) {
      comment.replies = res.data || []
    } else {
      console.error('加载回复失败:', res.message)
    }
  } catch (error) {
    console.error('加载回复失败:', error)
  }
}

// 加载更多评论
const loadMoreComments = async () => {
  currentPage.value++
  await loadComments()
}

// 发布评论
const submitComment = async () => {
  if (!newComment.value.trim()) return
  
  try {
    const postId = route.params.id
    const res = await api.forum.createComment(postId, newComment.value)
    if (res.success) {
      newComment.value = ''
      // 重新加载评论
      currentPage.value = 1
      await loadComments()
      // 更新评论数
      if (post.value) {
        post.value.commentCount++
      }
    } else {
      console.error('发布评论失败:', res.message)
      alert(res.message || '发布评论失败，请重试')
    }
  } catch (error) {
    console.error('发布评论失败:', error)
    alert('发布评论失败，请重试')
  }
}

// 删除评论
const deleteComment = async (commentId) => {
  if (!confirm('确定要删除这条评论吗？')) return
  
  try {
    const postId = route.params.id
    const res = isAuthor.value 
      ? await api.forum.deleteCommentByAuthor(postId, commentId)
      : await api.forum.deleteComment(commentId)
    
    if (res.success) {
      // 重新加载评论
      await loadComments()
      // 更新评论数
      if (post.value) {
        post.value.commentCount--
      }
    } else {
      console.error('删除评论失败:', res.message)
      alert(res.message || '删除失败，请重试')
    }
  } catch (error) {
    console.error('删除评论失败:', error)
    alert('删除失败，请重试')
  }
}

// 点赞帖子
const toggleLike = async () => {
  try {
    const res = await api.forum.toggleLike(route.params.id)
    if (res.success) {
      post.value.isLiked = !post.value.isLiked
      post.value.likeCount += post.value.isLiked ? 1 : -1
    } else {
      console.error('点赞失败:', res.message)
    }
  } catch (error) {
    console.error('点赞失败:', error)
  }
}

// 收藏帖子
const toggleCollect = async () => {
  try {
    const res = await api.forum.toggleCollect(route.params.id)
    if (res.success) {
      post.value.isCollected = !post.value.isCollected
      post.value.collectCount += post.value.isCollected ? 1 : -1
    } else {
      console.error('收藏失败:', res.message)
    }
  } catch (error) {
    console.error('收藏失败:', error)
  }
}

// 点赞评论
const toggleCommentLike = async (commentId) => {
  try {
    const res = await api.forum.toggleCommentLike(commentId)
    if (res.success) {
      const comment = comments.value.find(c => c.id === commentId)
      if (comment) {
        comment.isLiked = !comment.isLiked
        comment.likeCount = (comment.likeCount || 0) + (comment.isLiked ? 1 : -1)
      }
    } else {
      console.error('点赞评论失败:', res.message)
    }
  } catch (error) {
    console.error('点赞评论失败:', error)
  }
}

// 回复评论
const replyToComment = (comment) => {
  replyTarget.value = comment
  showReplyModal.value = true
}

// 提交回复
const submitReply = async () => {
  if (!replyContent.value.trim()) return
  
  try {
    const res = await api.forum.replyComment(replyTarget.value.id, replyContent.value)
    if (res.success) {
      closeReplyModal()
      // 重新加载评论
      await loadComments()
    } else {
      console.error('回复失败:', res.message)
      alert(res.message || '回复失败，请重试')
    }
  } catch (error) {
    console.error('回复失败:', error)
    alert('回复失败，请重试')
  }
}

// 关闭回复弹窗
const closeReplyModal = () => {
  showReplyModal.value = false
  replyContent.value = ''
  replyTarget.value = null
}

// 分享帖子
const sharePost = () => {
  const url = window.location.href
  if (navigator.share) {
    navigator.share({
      title: post.value.title,
      text: post.value.content.substring(0, 100),
      url: url
    })
  } else {
    // 复制链接
    navigator.clipboard.writeText(url)
    alert('链接已复制到剪贴板')
  }
}

// 预览图片
const previewImage = (url) => {
  // 简单实现：新窗口打开
  window.open(url, '_blank')
}

// 显示选项菜单
const showOptions = () => {
  // TODO: 显示编辑、删除等选项
  alert('功能开发中...')
}

// 返回
const goBack = () => {
  router.back()
}

// 页面加载
onMounted(() => {
  loadPostDetail()
})
</script>

<style scoped>
.post-detail-page {
  min-height: 100vh;
  background: #f5f5f5;
  padding-bottom: 80px;
}

/* 顶部导航 */
.top-bar {
  position: sticky;
  top: 0;
  background: white;
  padding: 12px 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  z-index: 100;
}

.back-btn {
  background: none;
  border: none;
  font-size: 16px;
  color: #333;
  cursor: pointer;
  padding: 8px;
}

.action-btn {
  background: none;
  border: none;
  font-size: 20px;
  cursor: pointer;
  padding: 8px;
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

/* 帖子容器 */
.post-container {
  background: white;
  margin: 16px;
  border-radius: 12px;
  padding: 20px;
}

/* 徽章 */
.post-badges {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}

.badge {
  padding: 4px 12px;
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

/* 标题 */
.post-title {
  font-size: 22px;
  font-weight: bold;
  color: #333;
  margin: 0 0 16px 0;
  line-height: 1.4;
}

/* 元信息 */
.post-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
  margin-bottom: 20px;
  font-size: 13px;
  color: #666;
}

.category-tag {
  background: #e8f5e9;
  color: #4caf50;
  padding: 4px 12px;
  border-radius: 12px;
  font-weight: 600;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 4px;
}

/* 内容 */
.post-content {
  font-size: 16px;
  line-height: 1.8;
  color: #333;
  margin-bottom: 20px;
}

/* 媒体画廊 */
.media-gallery {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  margin-bottom: 20px;
}

.media-image {
  width: 100%;
  aspect-ratio: 1;
  object-fit: cover;
  border-radius: 8px;
  cursor: pointer;
  transition: transform 0.3s;
}

.media-image:hover {
  transform: scale(1.05);
}

/* 互动栏 */
.action-bar {
  display: flex;
  justify-content: space-around;
  padding: 16px 0;
  border-top: 1px solid #eee;
  border-bottom: 1px solid #eee;
  margin-bottom: 24px;
}

.action-button {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  background: none;
  border: none;
  cursor: pointer;
  padding: 8px 16px;
  transition: all 0.3s;
  border-radius: 8px;
}

.action-button:hover {
  background: #f5f5f5;
}

.action-button.active {
  color: #4caf50;
}

.action-icon {
  font-size: 20px;
}

.action-text {
  font-size: 12px;
  color: #666;
}

/* 评论区 */
.comments-section {
  margin-top: 24px;
}

.comments-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.comments-title {
  font-size: 18px;
  font-weight: bold;
  color: #333;
  margin: 0;
}

.sort-select {
  padding: 6px 12px;
  border: 1px solid #ddd;
  border-radius: 16px;
  font-size: 13px;
  cursor: pointer;
}

/* 评论输入 */
.comment-input-box {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 24px;
}

.comment-input {
  width: 100%;
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-size: 14px;
  resize: vertical;
  font-family: inherit;
}

.submit-comment-btn {
  align-self: flex-end;
  padding: 10px 24px;
  background: #4caf50;
  color: white;
  border: none;
  border-radius: 20px;
  cursor: pointer;
  font-size: 14px;
  transition: background 0.3s;
}

.submit-comment-btn:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.submit-comment-btn:not(:disabled):hover {
  background: #45a049;
}

/* 评论列表 */
.empty-comments {
  text-align: center;
  padding: 40px 20px;
  color: #999;
}

.comments-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.comment-item {
  padding: 16px;
  background: #f9f9f9;
  border-radius: 8px;
}

.comment-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.user-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: #4caf50;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
}

.user-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.user-name {
  font-size: 14px;
  font-weight: 600;
  color: #333;
}

.comment-time {
  font-size: 12px;
  color: #999;
}

.delete-btn {
  padding: 4px 12px;
  background: #ff5252;
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 12px;
  cursor: pointer;
}

.comment-content {
  font-size: 14px;
  line-height: 1.6;
  color: #333;
  margin-bottom: 12px;
}

.comment-actions {
  display: flex;
  gap: 16px;
}

.comment-action-btn {
  background: none;
  border: none;
  font-size: 13px;
  color: #666;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
  transition: all 0.3s;
}

.comment-action-btn:hover {
  background: #eee;
}

.comment-action-btn.active {
  color: #4caf50;
}

/* 回复列表 */
.replies-list {
  margin-top: 12px;
  padding-left: 16px;
  border-left: 2px solid #e0e0e0;
}

.reply-item {
  padding: 12px;
  background: white;
  border-radius: 6px;
  margin-bottom: 8px;
}

.reply-header {
  display: flex;
  gap: 12px;
  margin-bottom: 8px;
  font-size: 12px;
}

.reply-user {
  font-weight: 600;
  color: #4caf50;
}

.reply-time {
  color: #999;
}

.reply-content {
  font-size: 13px;
  line-height: 1.5;
  color: #666;
}

/* 加载更多 */
.load-more {
  text-align: center;
  margin-top: 20px;
}

.load-more-btn {
  padding: 10px 32px;
  background: white;
  border: 1px solid #ddd;
  border-radius: 20px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.3s;
}

.load-more-btn:hover {
  background: #f5f5f5;
  border-color: #4caf50;
}

/* 错误状态 */
.error-state {
  text-align: center;
  padding: 60px 20px;
  color: #999;
}

.retry-btn {
  margin-top: 16px;
  padding: 10px 24px;
  background: #4caf50;
  color: white;
  border: none;
  border-radius: 20px;
  cursor: pointer;
}

/* 回复弹窗 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.reply-modal {
  background: white;
  border-radius: 16px;
  max-width: 500px;
  width: 100%;
  max-height: 80vh;
  overflow: auto;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #eee;
}

.modal-header h3 {
  margin: 0;
  font-size: 18px;
}

.close-btn {
  background: none;
  border: none;
  font-size: 28px;
  color: #999;
  cursor: pointer;
  padding: 0;
  width: 32px;
  height: 32px;
}

.modal-body {
  padding: 20px;
}

.reply-to {
  margin-bottom: 12px;
  font-size: 14px;
  color: #666;
}

.reply-to-user {
  color: #4caf50;
  font-weight: 600;
}

.reply-input {
  width: 100%;
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-size: 14px;
  resize: vertical;
  font-family: inherit;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 20px;
  border-top: 1px solid #eee;
}

.cancel-btn {
  padding: 10px 24px;
  background: white;
  border: 1px solid #ddd;
  border-radius: 20px;
  cursor: pointer;
  font-size: 14px;
}

.submit-btn {
  padding: 10px 24px;
  background: #4caf50;
  color: white;
  border: none;
  border-radius: 20px;
  cursor: pointer;
  font-size: 14px;
}

.submit-btn:disabled {
  background: #ccc;
  cursor: not-allowed;
}
</style>
