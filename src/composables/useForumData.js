import { ref, computed, onMounted } from 'vue'
import api from '../api'
import { useAppStore } from '../stores/app'

// 论坛数据组合式函数
export function useForumData() {
  const appStore = useAppStore()
  
  // 状态管理
  const posts = ref([])
  const currentPost = ref(null)
  const comments = ref([])
  const categories = ref([
    { id: 'all', name: '全部', icon: '📝' },
    { id: '种植问题', name: '种植问题', icon: '🌱' },
    { id: '经验分享', name: '经验分享', icon: '💡' },
    { id: '病虫害', name: '病虫害', icon: '🐛' },
    { id: '市场行情', name: '市场行情', icon: '📈' },
    { id: '政策解读', name: '政策解读', icon: '📋' }
  ])
  const currentCategory = ref('all')
  const loading = ref(false)
  const error = ref(null)
  const pagination = ref({
    page: 1,
    limit: 10,
    total: 0,
    hasMore: true
  })
  
  // 获取帖子列表
  const fetchPosts = async (category = 'all', page = 1, append = false) => {
    try {
      loading.value = true
      
      const response = await api.forum.getPosts(page, pagination.value.limit, category === 'all' ? null : category)
      
      if (response.success) {
        const newPosts = response.data.list.map(post => ({
          id: post.id,
          title: post.title,
          content: extractSummary(post.content, 150),
          author: {
            id: post.user_id,
            name: post.nickname || '匿名用户',
            avatar: post.avatar || getDefaultAvatar(post.user_id)
          },
          category: post.category,
          viewCount: post.view_count,
          commentCount: post.comment_count,
          isTop: post.is_top === 1,
          createTime: formatTime(post.create_time),
          status: post.status
        }))
        
        if (append) {
          posts.value.push(...newPosts)
        } else {
          posts.value = newPosts
        }
        
        pagination.value = {
          page,
          limit: pagination.value.limit,
          total: response.data.total,
          hasMore: newPosts.length === pagination.value.limit
        }
        
        // 记录用户行为
        appStore.recordUserAction({
          action: 'forum_posts_loaded',
          module: 'forum',
          data: { category, page, count: newPosts.length }
        })
      }
    } catch (err) {
      error.value = err.message
      console.error('获取帖子列表失败:', err)
      
      // 降级方案
      if (!append) {
        posts.value = getDefaultPosts()
      }
    } finally {
      loading.value = false
    }
  }
  
  // 获取帖子详情
  const fetchPostDetail = async (postId) => {
    try {
      loading.value = true
      
      const response = await api.forum.getPostDetail(postId)
      
      if (response.success) {
        const post = response.data
        currentPost.value = {
          id: post.id,
          title: post.title,
          content: post.content,
          author: {
            id: post.user_id,
            name: post.nickname || '匿名用户',
            avatar: post.avatar || getDefaultAvatar(post.user_id),
            region: post.region || '未知地区',
            profession: post.profession || '未知职业'
          },
          category: post.category,
          viewCount: post.view_count,
          commentCount: post.comment_count,
          isTop: post.is_top === 1,
          createTime: formatTime(post.create_time),
          status: post.status
        }
        
        // 记录用户行为
        appStore.recordUserAction({
          action: 'forum_post_viewed',
          module: 'forum',
          data: { postId }
        })
      }
    } catch (err) {
      error.value = err.message
      console.error('获取帖子详情失败:', err)
      
      // 降级方案
      currentPost.value = getDefaultPostDetail(postId)
    } finally {
      loading.value = false
    }
  }
  
  // 获取评论列表
  const fetchComments = async (postId, page = 1, append = false) => {
    try {
      const response = await api.forum.getComments(postId, page)
      
      if (response.success) {
        const newComments = response.data.list.map(comment => ({
          id: comment.id,
          content: comment.content,
          author: {
            id: comment.user_id,
            name: comment.nickname || '匿名用户',
            avatar: comment.avatar || getDefaultAvatar(comment.user_id)
          },
          parentId: comment.parent_id,
          createTime: formatTime(comment.create_time),
          status: comment.status,
          replies: [] // 回复将在前端组装
        }))
        
        // 组装评论树结构
        const commentTree = buildCommentTree(newComments)
        
        if (append) {
          comments.value.push(...newComments.filter(c => !c.parentId))
        } else {
          comments.value = commentTree
        }
        
        // 记录用户行为
        appStore.recordUserAction({
          action: 'forum_comments_loaded',
          module: 'forum',
          data: { postId, page, count: newComments.length }
        })
      }
    } catch (err) {
      console.error('获取评论失败:', err)
      comments.value = getDefaultComments(postId) // 降级方案
    }
  }
  
  // 创建新帖子
  const createPost = async (postData) => {
    try {
      const response = await api.forum.createPost(postData)
      
      if (response.success) {
        // 刷新帖子列表
        await fetchPosts(currentCategory.value, 1)
        
        // 记录用户行为
        appStore.recordUserAction({
          action: 'forum_post_created',
          module: 'forum',
          data: { postId: response.data.id }
        })
        
        return { success: true, postId: response.data.id }
      }
    } catch (err) {
      console.error('创建帖子失败:', err)
      return { success: false, error: err.message }
    }
  }
  
  // 创建评论
  const createComment = async (postId, content, parentId = null) => {
    try {
      const response = await api.forum.createComment(postId, content, parentId)
      
      if (response.success) {
        // 刷新评论列表
        await fetchComments(postId)
        
        // 记录用户行为
        appStore.recordUserAction({
          action: 'forum_comment_created',
          module: 'forum',
          data: { postId, commentId: response.data.id, parentId }
        })
        
        return { success: true, commentId: response.data.id }
      }
    } catch (err) {
      console.error('创建评论失败:', err)
      return { success: false, error: err.message }
    }
  }
  
  // 工具函数
  const buildCommentTree = (comments) => {
    const commentMap = {}
    const rootComments = []
    
    // 首先将所有评论放入map
    comments.forEach(comment => {
      commentMap[comment.id] = { ...comment, replies: [] }
    })
    
    // 然后构建树结构
    comments.forEach(comment => {
      if (comment.parentId && commentMap[comment.parentId]) {
        // 这是回复，添加到父评论的replies中
        commentMap[comment.parentId].replies.push(commentMap[comment.id])
      } else if (!comment.parentId) {
        // 这是一级评论
        rootComments.push(commentMap[comment.id])
      }
    })
    
    return rootComments
  }
  
  const getDefaultAvatar = (userId) => {
    // 根据用户ID生成默认头像（可以使用Gravatar或其他服务）
    const colors = ['e91e63', '9c27b0', '673ab7', '3f51b5', '2196f3', '00bcd4', '009688', '4caf50']
    const color = colors[userId % colors.length]
    return `https://via.placeholder.com/100/${color}/ffffff?text=👤`
  }
  
  const formatTime = (timeString) => {
    const date = new Date(timeString)
    const now = new Date()
    const diff = now - date
    
    if (diff < 3600000) {
      const minutes = Math.floor(diff / 60000)
      return minutes <= 0 ? '刚刚' : `${minutes}分钟前`
    }
    
    if (diff < 86400000) {
      const hours = Math.floor(diff / 3600000)
      return `${hours}小时前`
    }
    
    if (diff < 604800000) { // 7天内
      const days = Math.floor(diff / 86400000)
      return `${days}天前`
    }
    
    return date.toLocaleDateString('zh-CN')
  }
  
  const extractSummary = (content, maxLength) => {
    const plainText = content.replace(/<[^>]*>/g, '')
    return plainText.length > maxLength 
      ? plainText.substring(0, maxLength) + '...'
      : plainText
  }
  
  // 切换分类
  const switchCategory = async (category) => {
    currentCategory.value = category
    await fetchPosts(category, 1)
  }
  
  // 加载更多
  const loadMore = async () => {
    if (!pagination.value.hasMore || loading.value) return
    
    const nextPage = pagination.value.page + 1
    await fetchPosts(currentCategory.value, nextPage, true)
  }
  
  // 降级方案 - 默认数据
  const getDefaultPosts = () => [
    {
      id: 1,
      title: '春季小麦田间管理要点分享',
      content: '春季是小麦生长的关键时期，做好田间管理对提高产量至关重要。主要包括适时追肥、合理灌溉、病虫害防治等几个方面...',
      author: {
        id: 1,
        name: '农技专家张老师',
        avatar: 'https://via.placeholder.com/100/4CAF50/ffffff?text=张'
      },
      category: '经验分享',
      viewCount: 1250,
      commentCount: 23,
      isTop: true,
      createTime: '2小时前',
      status: 1
    },
    {
      id: 2,
      title: '水稻纹枯病的防治方法求助',
      content: '最近田里水稻出现了纹枯病症状，叶片上有云纹状病斑，请问各位有什么好的防治方法吗？',
      author: {
        id: 2,
        name: '种植户老李',
        avatar: 'https://via.placeholder.com/100/2196F3/ffffff?text=李'
      },
      category: '种植问题',
      viewCount: 856,
      commentCount: 15,
      isTop: false,
      createTime: '4小时前',
      status: 1
    }
  ]
  
  const getDefaultPostDetail = (postId) => ({
    id: postId,
    title: '春季小麦田间管理要点分享',
    content: '<p>春季是小麦生长的关键时期，做好田间管理对提高产量至关重要。</p><p>主要包括以下几个方面：</p><p>1. <strong>适时追肥</strong>：根据苗情追施氮肥</p><p>2. <strong>合理灌溉</strong>：保持土壤湿润</p><p>3. <strong>病虫害防治</strong>：重点防治纹枯病、蚜虫等</p>',
    author: {
      id: 1,
      name: '农技专家张老师',
      avatar: 'https://via.placeholder.com/100/4CAF50/ffffff?text=张',
      region: '山东省济南市',
      profession: '农业技术推广员'
    },
    category: '经验分享',
    viewCount: 1250,
    commentCount: 23,
    isTop: true,
    createTime: '2小时前',
    status: 1
  })
  
  const getDefaultComments = (postId) => [
    {
      id: 1,
      content: '张老师分享得很详细，学到了很多！',
      author: {
        id: 3,
        name: '农民小王',
        avatar: 'https://via.placeholder.com/100/FF9800/ffffff?text=王'
      },
      parentId: null,
      createTime: '1小时前',
      status: 1,
      replies: [
        {
          id: 2,
          content: '是啊，今年我也准备按照这个方法试试',
          author: {
            id: 4,
            name: '种植户老刘',
            avatar: 'https://via.placeholder.com/100/9C27B0/ffffff?text=刘'
          },
          parentId: 1,
          createTime: '30分钟前',
          status: 1,
          replies: []
        }
      ]
    }
  ]
  
  // 初始化
  const initializeForumData = async () => {
    await fetchPosts()
  }
  
  return {
    // 状态
    posts,
    currentPost,
    comments,
    categories,
    currentCategory,
    loading,
    error,
    pagination,
    
    // 计算属性
    hasData: computed(() => posts.value.length > 0),
    
    // 方法
    fetchPosts,
    fetchPostDetail,
    fetchComments,
    createPost,
    createComment,
    switchCategory,
    loadMore,
    initializeForumData
  }
}