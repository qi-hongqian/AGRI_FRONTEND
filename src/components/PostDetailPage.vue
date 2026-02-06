<template>
  <div class="post-detail-page">
    <!-- 顶部导航栏 -->
    <div class="top-bar">
      <button class="back-btn" @click="goBack">
        <span class="back-icon">←</span>
        <span>返回</span>
      </button>
      <div class="top-actions">
        <button v-if="isAuthor" class="edit-action-btn" @click="showPostOptions">
          <span class="edit-icon">⋯</span>
        </button>
        <button v-else class="block-action-btn" @click="blockPostAuthor">
          <span class="block-icon">🚫</span>
        </button>
      </div>
    </div>

    <!-- 加载状态 -->
    <div v-if="loading" class="loading-container">
      <div class="loading-spinner"></div>
      <p>加载中...</p>
    </div>

    <!-- 帖子内容 -->
    <div v-else-if="post" class="post-container">
      <!-- 作者信息 (置于首位) -->
      <div class="author-info-section">
        <div class="author-avatar-wrapper">
          <img v-if="authorInfo?.avatar" :src="getImageUrl(authorInfo.avatar, true)" class="author-avatar" />
          <div v-else class="author-avatar-placeholder">👤</div>
        </div>
        <div class="author-details">
          <span class="author-nickname">{{ authorInfo?.nickname || '用户' + post.userId }}</span>
          <span class="post-time">{{ formatTime(post.createTime) }}</span>
        </div>
      </div>

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
          :class="{ active: post.hasLiked }"
          @click="toggleLike"
        >
          <span class="action-icon">{{ post.hasLiked ? '❤️' : '🤍' }}</span>
          <span class="action-text">{{ post.likeCount }}</span>
        </button>
        
        <button class="action-button">
          <span class="action-icon">💬</span>
          <span class="action-text">{{ post.commentCount }}</span>
        </button>
        
        <button 
          class="action-button" 
          :class="{ active: post.hasCollected }"
          @click="toggleCollect"
        >
          <span class="action-icon">{{ post.hasCollected ? '⭐' : '☆' }}</span>
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
          <!-- 一级评论 -->
          <div 
            v-for="commentNode in comments" 
            :key="commentNode.comment.id"
            class="comment-item"
          >
            <!-- 用户头像和信息 -->
            <div class="comment-header">
              <div class="user-avatar">
                <img v-if="commentNode.comment.avatar" :src="getAvatarUrl(commentNode.comment.avatar)" class="avatar-img" @error="$event.target.style.display='none'">
                <span v-else class="avatar-placeholder">👤</span>
              </div>
              <div class="user-info">
                <span class="user-name">{{ commentNode.comment.nickname || '用户' + commentNode.comment.userId }}</span>
                <span class="comment-time">{{ formatTime(commentNode.comment.createTime) }}</span>
              </div>
              <button 
                v-if="commentNode.comment.userId === currentUserId || isAuthor" 
                class="delete-btn"
                @click="deleteComment(commentNode.comment.id)"
              >
                删除
              </button>
              <button 
                v-if="commentNode.comment.userId !== currentUserId && !isAuthor"
                class="block-user-btn"
                @click="blockCommentAuthor(commentNode.comment.userId)"
              >
                🚫
              </button>
            </div>
        
            <!-- 一级评论内容 -->
            <div class="comment-content">{{ commentNode.comment.content }}</div>
        
            <!-- 一级评论操作 -->
            <div class="comment-actions">
              <button 
                class="comment-action-btn"
                @click="toggleCommentLike(commentNode.comment.id)"
              >
                🤍 {{ commentNode.comment.likeCount || 0 }}
              </button>
              <button 
                v-if="commentNode.comment.userId === currentUserId"
                class="comment-action-btn"
                @click="editComment(commentNode.comment.id)"
              >
                编辑
              </button>
              <button 
                class="comment-action-btn"
                @click="replyToComment(commentNode.comment)"
              >
                💬 回复
              </button>
              <!-- 查看回复按钉 -->
              <button 
                v-if="commentNode.children && commentNode.children.length > 0"
                class="comment-action-btn view-replies-btn"
                @click="toggleCommentExpand(commentNode.comment.id)"
              >
                {{ isCommentExpanded(commentNode.comment.id) ? '⭡ 收起' : '⭣ ' }}
                {{ commentNode.children.length }}条回复
              </button>
            </div>
                    
            <!-- 二级回复列表（抬音式） -->
            <div 
              v-if="commentNode.children && commentNode.children.length > 0 && isCommentExpanded(commentNode.comment.id)" 
              class="replies-list"
            >
              <div 
                v-for="replyNode in commentNode.children" 
                :key="replyNode.comment.id"
                class="reply-item"
              >
                <div class="reply-header">
                  <div class="reply-avatar">
                    <img v-if="replyNode.comment.avatar" :src="getAvatarUrl(replyNode.comment.avatar)" class="avatar-img" @error="$event.target.style.display='none'">
                    <span v-else class="avatar-placeholder">👤</span>
                  </div>
                  <div class="reply-info">
                    <span class="reply-user">{{ replyNode.comment.nickname || '用户' + replyNode.comment.userId }}</span>
                    <span v-if="replyNode.comment.replyToUserId" class="reply-to">
                      回复 <span class="reply-to-name">@{{ getReplyToUserName(replyNode, commentNode) }}</span>
                    </span>
                  </div>
                  <span class="reply-time">{{ formatTime(replyNode.comment.createTime) }}</span>
                  <button 
                    v-if="replyNode.comment.userId === currentUserId || isAuthor" 
                    class="delete-reply-btn"
                    @click="deleteComment(replyNode.comment.id)"
                  >
                    删除
                  </button>
                  <button 
                    v-if="replyNode.comment.userId === currentUserId"
                    class="edit-reply-btn"
                    @click="editComment(replyNode.comment.id)"
                  >
                    编辑
                  </button>
                  <button 
                    v-if="replyNode.comment.userId !== currentUserId && !isAuthor"
                    class="block-user-btn"
                    @click="blockCommentAuthor(replyNode.comment.userId)"
                  >
                    🚫
                  </button>
                </div>
                <div class="reply-content">{{ replyNode.comment.content }}</div>
                <!-- 二级评论操作 -->
                <div class="reply-actions">
                  <button 
                    class="reply-action-btn"
                    @click="toggleCommentLike(replyNode.comment.id)"
                  >
                    🤍 {{ replyNode.comment.likeCount || 0 }}
                  </button>
                  <!-- 注意：点击二级评论的回复按钮时，实际是回复其父评论（一级评论） -->
                  <button 
                    class="reply-action-btn"
                    @click="replyToComment(commentNode.comment)"
                  >
                    💬 回复
                  </button>
                </div>
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

    <!-- 帖子操作菜单 -->
    <div v-if="showPostOptionsMenu" class="modal-overlay" @click="closePostOptionsMenu">
      <div class="post-options-menu" @click.stop>
        <div class="menu-header">
          <span class="menu-title">帖子操作</span>
        </div>
        <button 
          v-for="action in postActions" 
          :key="action.action"
          class="menu-item"
          :class="{ danger: action.danger }"
          @click="executePostAction(action.action)"
        >
          <span class="menu-item-text">{{ action.name }}</span>
        </button>
        <button class="menu-item cancel" @click="closePostOptionsMenu">
          <span class="menu-item-text">❌ 取消</span>
        </button>
      </div>
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
            回复：<span class="reply-to-user">{{ replyTarget?.comment?.nickname || '用户' + replyTarget?.comment?.userId }}</span>
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

    <!-- 拉黑确认弹窗 -->
    <div v-if="showBlockModal" class="modal-overlay" @click="cancelBlock">
      <div class="block-modal" @click.stop>
        <div class="modal-header">
          <h3>拉黑确认</h3>
          <button class="close-btn" @click="cancelBlock">×</button>
        </div>
        <div class="modal-body">
          <p class="block-message">确定要拉黑该用户吗？</p>
          <textarea 
            v-model="blockReason"
            placeholder="输入拉黑原因(可选)"
            class="block-reason-input"
            rows="3"
          ></textarea>
        </div>
        <div class="modal-footer">
          <button class="cancel-btn" @click="cancelBlock">取消</button>
          <button class="confirm-btn" @click="confirmBlock">确认拉黑</button>
        </div>
      </div>
    </div>

    <!-- Toast提示 -->
    <transition name="toast">
      <div v-if="showToast" class="toast-container" :class="`toast-${toastType}`">
        <span class="toast-message">{{ toastMessage }}</span>
      </div>
    </transition>
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
const authorInfo = ref(null)
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

// Toast提示相关
const showToast = ref(false)
const toastMessage = ref('')
const toastType = ref('success') // 'success' | 'error' | 'info'

// 显示Toast提示
const displayToast = (message, type = 'success') => {
  toastMessage.value = message
  toastType.value = type
  showToast.value = true
  setTimeout(() => {
    showToast.value = false
  }, 2500)
}

// 帖子操作菜单
const showPostOptionsMenu = ref(false)
// 当前用户角色
const userRole = computed(() => appStore.user?.role || 'user')
const isAdmin = computed(() => userRole.value === 'admin')

const postActions = computed(() => {
  const actions = [
    { name: '✏️ 编辑', action: 'edit', icon: '✏️' },
  ]
  
  // 只有管理员才能看到置顶、精华功能
  if (isAdmin.value) {
    actions.push(
      { name: post.value?.isTop ? '📌 取消置顶' : '📌 置顶', action: 'toggleTop', icon: '📌' },
      { name: post.value?.isEssence ? '⭐ 取消精华' : '⭐ 设为精华', action: 'toggleEssence', icon: '⭐' }
    )
  }
  
  actions.push({ name: '🗑️ 删除', action: 'delete', icon: '🗑️', danger: true })
  
  return actions
})

// 评论展开/收起状态
const expandedComments = ref(new Set())
const toggleCommentExpand = (commentId) => {
  if (expandedComments.value.has(commentId)) {
    expandedComments.value.delete(commentId)
  } else {
    expandedComments.value.add(commentId)
  }
}
const isCommentExpanded = (commentId) => {
  return expandedComments.value.has(commentId)
}

// 拉黑确认弹窗
const showBlockModal = ref(false)
const blockReason = ref('')
const blockTargetUserId = ref(null)
const blockType = ref('post') // 'post' 或 'comment'

// 当前用户ID
const currentUserId = computed(() => appStore.user?.id)

// 是否是作者（当有currentUserId且等于帖子userId时，拧为isAuthor）
const isAuthor = computed(() => {
  // 需要两个条件都满足：有currentUserId且等于postUserId
  if (!currentUserId.value || !post.value?.userId) return false
  return post.value.userId === currentUserId.value
})

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
const getImageUrl = (relativePath, isAvatar = false) => {
  if (!relativePath) return ''
  if (relativePath.startsWith('http')) return relativePath
  const envConfig = getEnvConfig()
  const baseUrl = isAvatar ? envConfig.USER_API : envConfig.FORUM_API
  return `${baseUrl}${relativePath}`
}

// 加载帖子详情
const loadPostDetail = async () => {
  loading.value = true
  try {
    const postId = route.params.id
    
    console.log('[PostDetailPage] 开始加载帖子详情:', {
      postId,
      currentUserId: currentUserId.value,
      appStoreUserId: appStore.user?.id
    })
    
    // 获取帖子详情（包含媒体列表）
    // 新的数据结构：data.post 和 data.mediaList
    const res = await api.forum.getPostDetail(postId)
    if (res.success) {
      post.value = res.data.post
      media.value = res.data.mediaList || []
      authorInfo.value = res.data.userInfo
      
      console.log('[PostDetailPage] 帖子详情加载成功:', {
        postId: post.value.id,
        postUserId: post.value.userId,
        authorName: authorInfo.value?.nickname,
        currentUserId: currentUserId.value,
        isAuthor: isAuthor.value,
        mediaCount: media.value.length
      })
      
      // 增加浏覨量
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

// 加载评论（使用树形结构，抖音式二级评论）
const loadComments = async () => {
  try {
    const postId = route.params.id
    const sortParam = commentSort.value === 'time' ? 'new' : 'hot'
    const res = await api.forum.getCommentsTree(postId, currentPage.value, 50, sortParam)
    if (res.success && res.data) {
      // 树形结构：[{ comment: {...}, children: [{comment: {...}, children: []}] }]
      comments.value = res.data
      console.log('[评论] 加载树形评论:', comments.value.length)
      console.log('[评论] 树形结构示例:', JSON.stringify(res.data[0], null, 2))
    } else {
      console.error('加载评论失败:', res.message)
    }
  } catch (error) {
    console.error('加载评论失败:', error)
  }
}

// 删除：loadReplies 函数不再需要，树形结构已包含回复

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
      // 重新加载评论（使用树形结构）
      currentPage.value = 1
      await loadComments()
      // 更新评论数
      if (post.value) {
        post.value.commentCount++
      }
      displayToast('✅ 评论发布成功', 'success')
    } else {
      console.error('发布评论失败:', res.message)
      displayToast(res.message || '发布评论失败', 'error')
    }
  } catch (error) {
    console.error('发布评论失败:', error)
    displayToast('发布评论失败，请重试', 'error')
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
      // 重新加载评论（使用树形结构）
      await loadComments()
      // 更新评论数
      if (post.value) {
        post.value.commentCount--
      }
      displayToast('✅ 评论删除成功', 'success')
    } else {
      console.error('删除评论失败:', res.message)
      displayToast(res.message || '删除失败', 'error')
    }
  } catch (error) {
    console.error('删除评论失败:', error)
    displayToast('删除失败，请重试', 'error')
  }
}

// 点赞帖子
const toggleLike = async () => {
  try {
    const res = await api.forum.toggleLike(route.params.id)
    if (res.success) {
      post.value.hasLiked = !post.value.hasLiked
      post.value.likeCount += post.value.hasLiked ? 1 : -1
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
      post.value.hasCollected = !post.value.hasCollected
      post.value.collectCount += post.value.hasCollected ? 1 : -1
    } else {
      console.error('收藏失败:', res.message)
    }
  } catch (error) {
    console.error('收藏失败:', error)
  }
}

// 点赞评论（支持一级和二级评论）
const toggleCommentLike = async (commentId) => {
  try {
    const res = await api.forum.toggleCommentLike(commentId)
    if (res.success) {
      // 在树形结构中查找并更新评论
      // 根据后端返回的新likeCount来更新前端显示
      for (const commentNode of comments.value) {
        // 检查一级评论
        if (commentNode.comment.id === commentId) {
          // 根据返回是点赞还是取消点赞来更新likeCount
          // 点赞成功与取消点赞成功的判断根据 message 中是否有“取消”两个字
          if (res.message.includes('取消')) {
            commentNode.comment.likeCount--
          } else {
            commentNode.comment.likeCount++
          }
          console.log('[评论] 点赞成功:', commentId, ', 新likeCount:', commentNode.comment.likeCount)
          return
        }
        // 检查二级评论
        if (commentNode.children) {
          for (const replyNode of commentNode.children) {
            if (replyNode.comment.id === commentId) {
              if (res.message.includes('取消')) {
                replyNode.comment.likeCount--
              } else {
                replyNode.comment.likeCount++
              }
              console.log('[评论] 点赞成功:', commentId, ', 新likeCount:', replyNode.comment.likeCount)
              return
            }
          }
        }
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
    // 使用后端提供的回复接口，回复一级评论
    const res = await api.forum.replyComment(replyTarget.value.id, replyContent.value)
    if (res.success) {
      closeReplyModal()
      // 重新加载评论（使用树形结构）
      currentPage.value = 1
      await loadComments()
      // 更新评论数
      if (post.value) {
        post.value.commentCount++
      }
      displayToast('✅ 回复成功', 'success')
    } else {
      console.error('回复失败:', res.message)
      displayToast(res.message || '回复失败', 'error')
    }
  } catch (error) {
    console.error('回复失败:', error)
    displayToast('回复失败，请重试', 'error')
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
    displayToast('✅ 链接已复制到剪贴板', 'success')
  }
}

// 预览图片
const previewImage = (url) => {
  // 简单实现：新窗口打开
  window.open(url, '_blank')
}

// 显示选项菜单
const showPostOptions = () => {
  showPostOptionsMenu.value = true
}

const closePostOptionsMenu = () => {
  showPostOptionsMenu.value = false
}

const executePostAction = async (action) => {
  closePostOptionsMenu()
  if (action === 'edit') {
    editPost()
  } else if (action === 'toggleTop') {
    await togglePostTop()
  } else if (action === 'toggleEssence') {
    await togglePostEssence()
  } else if (action === 'delete') {
    await deletePost()
  }
}

// 编辑帖子
const editPost = () => {
  router.replace({
    name: 'EditPost',
    params: { id: route.params.id }
  })
}

// 置顶/取消置顶
const togglePostTop = async () => {
  try {
    const res = await api.forum.toggleTop(route.params.id)
    if (res.success) {
      post.value.isTop = !post.value.isTop
      const message = post.value.isTop ? '✅ 置顶成功' : '✅ 取消置顶成功'
      displayToast(message, 'success')
      console.log('[帖子] 置顶操作成功')
    } else {
      displayToast(res.message || '操作失败', 'error')
    }
  } catch (error) {
    console.error('[帖子] 置顶操作失败:', error)
    displayToast('操作失败，请重试', 'error')
  }
}

// 设精华/取消精华
const togglePostEssence = async () => {
  try {
    const res = await api.forum.toggleEssence(route.params.id)
    if (res.success) {
      post.value.isEssence = !post.value.isEssence
      const message = post.value.isEssence ? '✅ 设为精华成功' : '✅ 取消精华成功'
      displayToast(message, 'success')
      console.log('[帖子] 精华操作成功')
    } else {
      displayToast(res.message || '操作失败', 'error')
    }
  } catch (error) {
    console.error('[帖子] 精华操作失败:', error)
    displayToast('操作失败，请重试', 'error')
  }
}

// 删除帖子
const deletePost = async () => {
  if (!confirm('确定要删除这个帖子吗？')) return
  
  try {
    const res = await api.forum.deletePost(route.params.id)
    if (res.success) {
      console.log('[帖子] 删除成功')
      displayToast('✅ 帖子删除成功', 'success')
      setTimeout(() => {
        router.back()
      }, 1000)
    } else {
      displayToast(res.message || '删除失败', 'error')
    }
  } catch (error) {
    console.error('[帖子] 删除失败:', error)
    displayToast('删除失败，请重试', 'error')
  }
}

// 编辑评论
const editComment = async (commentId) => {
  const newContent = prompt('编辑评论')
  if (!newContent || !newContent.trim()) return
  
  try {
    const res = await api.forum.updateComment(commentId, newContent)
    if (res.success) {
      // 重新加载评论
      await loadComments()
      displayToast('✅ 评论编辑成功', 'success')
      console.log('[评论] 编辑成功:', commentId)
    } else {
      displayToast(res.message || '编辑失败', 'error')
    }
  } catch (error) {
    console.error('[评论] 编辑失败:', error)
    displayToast('编辑失败，请重试', 'error')
  }
}

// 拉黑帖子作者
const blockPostAuthor = async () => {
  if (!post.value) return
  
  blockTargetUserId.value = post.value.userId
  blockType.value = 'post'
  blockReason.value = ''
  showBlockModal.value = true
}

// 拉黑评论作者
const blockCommentAuthor = async (userId) => {
  blockTargetUserId.value = userId
  blockType.value = 'comment'
  blockReason.value = ''
  showBlockModal.value = true
}

// 确认拉黑
const confirmBlock = async () => {
  if (!blockTargetUserId.value) return
  
  try {
    const res = await api.user.blockUser(blockTargetUserId.value, 1, 1, blockReason.value || '')
    if (res.success) {
      showBlockModal.value = false
      displayToast('✅ 拉黑成功', 'success')
      
      // 如果是拉黑帖子作者，返回
      if (blockType.value === 'post') {
        setTimeout(() => {
          router.back()
        }, 1000)
      } else {
        // 拉黑评论作者，重新加载评论
        if (comments.value) {
          await loadComments()
        }
      }
    } else {
      displayToast(res.message || '拉黑失败', 'error')
    }
  } catch (error) {
    console.error('[拉黑] 失败:', error)
    displayToast('拉黑失败，请重试', 'error')
  }
}

// 取消拉黑
const cancelBlock = () => {
  showBlockModal.value = false
  blockReason.value = ''
  blockTargetUserId.value = null
  blockType.value = 'post'
}

// 返回
const goBack = () => {
  router.back()
}

// 获取用户头像URL
const getAvatarUrl = (avatarPath) => {
  if (!avatarPath) return ''
  if (avatarPath.startsWith('http')) return avatarPath
  const envConfig = getEnvConfig()
  return `${envConfig.USER_API}${avatarPath}`
}

// 获取回复目标用户名称
const getReplyToUserName = (replyNode, parentNode) => {
  // 先尝试从 replyToUserId 查找
  if (replyNode.comment.replyToUserName) {
    return replyNode.comment.replyToUserName
  }
  // 如果没有，尝试从父评论中查找
  if (parentNode && parentNode.comment) {
    if (parentNode.comment.nickname) {
      return parentNode.comment.nickname
    }
    return '用户' + parentNode.comment.userId
  }
  return '用户' + (replyNode.comment.replyToUserId || '')
}

// 页面加载
onMounted(() => {
  console.log('[PostDetailPage] 上setup，当前用户信息:', {
    appStoreUser: appStore.user,
    appStoreToken: appStore.token ? appStore.token.substring(0, 20) + '...' : null,
    localStorageToken: localStorage.getItem('token') ? localStorage.getItem('token').substring(0, 20) + '...' : null
  })
  
  // 如果没有用户信息但有token，需要从统个地方恢复用户信息
  // 需要从后端获取用户信息
if (!appStore.user && appStore.token) {
    console.log('[PostDetailPage] 检测到token但不有用户信息，需要恢复')
    // 可以求动后端需逛的API来获取当前用户信息
    // await api.user.getUserInfo()
  }
  
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
  background: linear-gradient(135deg, #4caf50 0%, #66bb6a 100%);
  padding: 12px 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 2px 8px rgba(76, 175, 80, 0.3);
  z-index: 100;
}

.back-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  background: rgba(255, 255, 255, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.3);
  color: white;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  padding: 8px 16px;
  border-radius: 20px;
  transition: all 0.3s;
}

.back-btn:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: translateX(-2px);
}

.back-icon {
  font-size: 18px;
  font-weight: bold;
}

.top-actions {
  display: flex;
  gap: 8px;
}

.edit-action-btn,
.block-action-btn {
  width: 40px;
  height: 40px;
  background: rgba(255, 255, 255, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.3s;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
}

.edit-action-btn:hover,
.block-action-btn:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: scale(1.1);
}

.edit-icon,
.block-icon {
  color: white;
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

/* 作者信息样式 (新增) */
.author-info-section {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
  padding-bottom: 12px;
  position: relative;
}

.author-info-section::after {
  content: "";
  position: absolute;
  bottom: 0;
  left: 0;
  width: 150px;
  height: 1px;
  background: #eee;
}

.author-avatar-wrapper {
  width: 44px;
  height: 44px;
}

.author-avatar {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid #4caf50;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.author-avatar-placeholder {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  background: #f0f0f0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  color: #999;
  border: 2px solid #eee;
}

.author-details {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.author-nickname {
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.post-time {
  font-size: 12px;
  color: #999;
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
  flex-shrink: 0;
  overflow: hidden;
}

.user-avatar .avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.user-avatar .avatar-placeholder {
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

/* 回复列表（抖音式二级评论） */
.replies-list {
  margin-top: 12px;
  padding-left: 16px;
  border-left: 2px solid #e0e0e0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.reply-item {
  padding: 12px;
  background: white;
  border-radius: 6px;
}

.reply-avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: #4caf50;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  flex-shrink: 0;
  overflow: hidden;
}

.reply-avatar .avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.reply-avatar .avatar-placeholder {
  font-size: 14px;
}

.reply-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.reply-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  font-size: 12px;
  flex-wrap: wrap;
}

.reply-user {
  font-weight: 600;
  color: #4caf50;
}

.reply-to {
  color: #999;
  font-size: 11px;
}

.reply-to-name {
  color: #4caf50;
  font-weight: 600;
}

.reply-time {
  color: #999;
  margin-left: auto;
}

.delete-reply-btn {
  padding: 2px 8px;
  background: #ff5252;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 11px;
  cursor: pointer;
  transition: all 0.3s;
}

.delete-reply-btn:hover {
  background: #d32f2f;
}

.edit-reply-btn {
  padding: 2px 8px;
  background: #2196F3;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 11px;
  cursor: pointer;
  transition: all 0.3s;
}

.edit-reply-btn:hover {
  background: #1976D2;
}

.block-user-btn {
  padding: 2px 8px;
  background: #FF9800;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 11px;
  cursor: pointer;
  transition: all 0.3s;
}

.block-user-btn:hover {
  background: #F57C00;
}

.reply-content {
  font-size: 13px;
  line-height: 1.5;
  color: #333;
  margin-bottom: 8px;
}

/* 二级评论操作 */
.reply-actions {
  display: flex;
  gap: 12px;
}

.reply-action-btn {
  background: none;
  border: none;
  font-size: 12px;
  color: #666;
  cursor: pointer;
  padding: 2px 6px;
  border-radius: 4px;
  transition: all 0.3s;
}

.reply-action-btn:hover {
  background: #f5f5f5;
}

.reply-action-btn.active {
  color: #4caf50;
}

/* 查看回复按钉 */
.view-replies-btn {
  color: #4caf50;
  font-weight: 500;
  font-size: 13px;
}

.view-replies-btn:hover {
  background: #f0f8f0;
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

/* 帖子操作菜单样式 */
.post-options-menu {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: white;
  border-radius: 16px 16px 0 0;
  box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.15);
  z-index: 1001;
  max-height: 80vh;
  overflow-y: auto;
  padding: 0;
  animation: slideUp 0.3s ease-out;
}

.menu-header {
  padding: 20px;
  border-bottom: 1px solid #eee;
  display: flex;
  justify-content: center;
  align-items: center;
}

.menu-title {
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.menu-item {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  padding: 16px 20px;
  background: none;
  border: none;
  border-bottom: 1px solid #f5f5f5;
  cursor: pointer;
  font-size: 16px;
  color: #333;
  transition: all 0.2s ease;
}

.menu-item:last-child {
  border-bottom: none;
}

.menu-item:active {
  background-color: #f5f5f5;
  transform: scale(0.98);
}

.menu-item.danger {
  color: #ff5252;
}

.menu-item.cancel {
  color: #999;
  font-weight: 500;
  border-top: 8px solid #f5f5f5;
  margin-top: 8px;
}

.menu-item-text {
  font-size: 16px;
}

/* 拉黑弹窗样式 */
.block-modal {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: white;
  border-radius: 12px 12px 0 0;
  z-index: 1001;
  max-height: 80vh;
  overflow-y: auto;
  animation: slideUp 0.3s ease-out;
}

@keyframes slideUp {
  from {
    transform: translateY(100%);
  }
  to {
    transform: translateY(0);
  }
}

.block-modal .modal-header {
  padding: 16px 20px;
  border-bottom: 1px solid #eee;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.block-modal .modal-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.block-modal .close-btn {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #999;
  padding: 0;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.block-modal .modal-body {
  padding: 20px;
}

.block-message {
  margin: 0 0 16px 0;
  color: #333;
  font-size: 16px;
  font-weight: 500;
}

.block-reason-input {
  width: 100%;
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-size: 14px;
  resize: vertical;
  font-family: inherit;
  box-sizing: border-box;
}

.block-reason-input:focus {
  outline: none;
  border-color: #4caf50;
  background: #fafafa;
}

.block-modal .modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 20px;
  border-top: 1px solid #eee;
}

.confirm-btn {
  padding: 10px 24px;
  background: #ff5252;
  color: white;
  border: none;
  border-radius: 20px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s;
}

.confirm-btn:active {
  background: #ff1744;
}

/* Toast提示样式 */
.toast-container {
  position: fixed;
  top: 80px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0, 0, 0, 0.85);
  color: white;
  padding: 12px 24px;
  border-radius: 24px;
  font-size: 14px;
  font-weight: 500;
  z-index: 2000;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(10px);
  min-width: 200px;
  text-align: center;
}

.toast-success {
  background: linear-gradient(135deg, #4caf50 0%, #66bb6a 100%);
}

.toast-error {
  background: linear-gradient(135deg, #f44336 0%, #ef5350 100%);
}

.toast-info {
  background: linear-gradient(135deg, #2196F3 0%, #42a5f5 100%);
}

.toast-message {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

/* Toast动画 */
.toast-enter-active {
  animation: toast-in 0.3s ease-out;
}

.toast-leave-active {
  animation: toast-out 0.3s ease-in;
}

@keyframes toast-in {
  0% {
    opacity: 0;
    transform: translateX(-50%) translateY(-20px);
  }
  100% {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
}

@keyframes toast-out {
  0% {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
  100% {
    opacity: 0;
    transform: translateX(-50%) translateY(-20px);
  }
}
</style>
