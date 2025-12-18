import axios from 'axios'
import { useAppStore } from '../stores/app'
import { getEnvConfig } from '../config/env'

// ========== 分布式架构：多服务端点配置 ==========
// 获取环境配置
const envConfig = getEnvConfig()

// 用户服务（登录、个人信息等）- 端口 8081
const userAPIClient = axios.create({
  baseURL: envConfig.USER_API,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  },
  maxRedirects: 5
})

// 论坛服务（帖子、评论、分类等）- 端口 8083
const forumAPIClient = axios.create({
  baseURL: envConfig.FORUM_API,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  },
  maxRedirects: 5
})

// ========== 创建统一的拦截器函数 ==========
const createInterceptors = (apiClient) => {
  // 请求拦截器
  apiClient.interceptors.request.use(
    (config) => {
      const appStore = useAppStore()
      
      // 添加认证token
      if (appStore.token) {
        config.headers.Authorization = `Bearer ${appStore.token}`
        console.log(`[API请求] ✅ Token已添加到请求头`, {
          url: config.url,
          tokenLength: appStore.token.length,
          authorization: `Bearer ${appStore.token.substring(0, 20)}...`
        })
      } else {
        console.warn(`[API请求] ⚠️ 未找到Token`, {
          url: config.url,
          storeToken: appStore.token
        })
      }
      
      // 添加请求时间戳
      config.metadata = { startTime: new Date().getTime() }
      
      // 打印请求信息
      console.log(`[前端] 发起请求:`, {
        method: config.method.toUpperCase(),
        url: config.url,
        params: config.params,
        data: config.data,
        hasAuthorization: !!config.headers.Authorization
      })
      
      return config
    },
    (error) => {
      return Promise.reject(error)
    }
  )

  // 响应拦截器
  apiClient.interceptors.response.use(
    (response) => {
      // 计算响应时间
      const duration = new Date().getTime() - response.config.metadata.startTime
      console.log(`API调用耗时: ${duration}ms`)
      
      // 打印完整响应
      console.log('[前端] 收到响应:', response.data)
      
      // 后端已经返回了 success 字段，直接传递
      const { data } = response
      
      // 记录成功的API调用
      const appStore = useAppStore()
      appStore.recordUserAction({
        action: 'api_success',
        module: response.config.url?.split('/')[3] || 'unknown',
        data: { url: response.config.url, duration }
      })
      
      // 直接返回后端的响应
      return data
    },
    (error) => {
      const { response, config } = error
      
      // 记录失败的API调用
      const appStore = useAppStore()
      appStore.recordUserAction({
        action: 'api_error',
        module: config.url?.split('/')[3] || 'unknown',
        data: { 
          url: config.url, 
          status: response?.status,
          message: response?.data?.message || error.message 
        }
      })
      
      // 统一错误处理
      let errorMessage = '网络请求失败'
      
      if (error.code === 'ECONNABORTED') {
        errorMessage = '请求超时，请检查网络连接'
      } else if (response?.status === 401) {
        errorMessage = '登录已过期，请重新登录'
        // 清除token并跳转到登录页
        appStore.logout()
        window.location.href = '/login'
      } else if (response?.status === 500) {
        errorMessage = '服务器错误，请稍后重试'
      } else if (response?.data?.message) {
        errorMessage = response.data.message
      }
      
      return Promise.reject({
        success: false,
        message: errorMessage,
        status: response?.status
      })
    }
  )
}

// 为两个服务都添加拦截器
createInterceptors(userAPIClient)
createInterceptors(forumAPIClient)

// ========== API 导出对象 ==========
export default {
  // 用户相关API（请求到8081端口）
  user: {
    // 登录
    login: (phone, password, captcha) => 
      userAPIClient.post('/api/auth/login', { phone, password, captcha }),
    
    // 获取编辑页面完整信息
    getEditUserInfo: () => 
      userAPIClient.get('/api/user/info/edit'),
    
    // 获取城市列表
    getCities: (provinceId) => 
      userAPIClient.get(`/api/user/region/cities/${provinceId}`),
    
    // 获取区县列表
    getDistricts: (cityId) => 
      userAPIClient.get(`/api/user/region/districts/${cityId}`),
    
    // 填写/更新个人信息
    fillUserInfo: (userInfoData) => 
      userAPIClient.post('/api/user/info/fill', userInfoData),
    
    // 获取用户个人信息
    getUserInfo: () => 
      userAPIClient.get('/api/user/info'),
    
    // 获取验证码
    getCaptcha: (phone) => 
      userAPIClient.get('/api/auth/captcha', { params: { phone } })
  },
  
  // 论坛相关API（请求到8083端口）
  forum: {
    // ========== 分类管理 ==========
    // 获取所有分类
    getCategories: () => 
      forumAPIClient.get('/api/forum/categories'),
    
    // 获取分类详情
    getCategoryDetail: (id) => 
      forumAPIClient.get(`/api/forum/categories/${id}`),
    
    // 获取热门分类
    getHotCategories: () => 
      forumAPIClient.get('/api/forum/categories/hot'),
    
    // ========== 帖子管理 ==========
    // 发布新帖子
    createPost: (postData) => 
      forumAPIClient.post('/api/forum/posts', postData),
    
    // 编辑帖子
    updatePost: (id, postData) => 
      forumAPIClient.put(`/api/forum/posts/${id}`, postData),
    
    // 删除帖子
    deletePost: (id) => 
      forumAPIClient.delete(`/api/forum/posts/${id}`),
    
    // 隐藏帖子
    hidePost: (id) => 
      forumAPIClient.put(`/api/forum/posts/${id}/hide`),
    
    // 恢复帖子
    recoverPost: (id) => 
      forumAPIClient.put(`/api/forum/posts/${id}/recover`),
    
    // 置顶/取消置顶
    toggleTop: (id) => 
      forumAPIClient.put(`/api/forum/posts/${id}/top`),
    
    // 设精华/取消精华
    toggleEssence: (id) => 
      forumAPIClient.put(`/api/forum/posts/${id}/essence`),
    
    // 获取帖子详情
    getPostDetail: (id) => 
      forumAPIClient.get(`/api/forum/posts/${id}`),
    
    // 编辑帖子
    updatePost: (id, postData) =>
      forumAPIClient.put(`/api/forum/posts/${id}`, postData),
    
    // 获取帖子列表（分页）
    getPosts: (params) => 
      forumAPIClient.get('/api/forum/posts', { params }),
    
    // 搜索帖子
    searchPosts: (keyword, page = 1, size = 10) => 
      forumAPIClient.get('/api/forum/posts/search', { params: { keyword, page, size } }),
    
    // 获取相似帖子
    getSimilarPosts: (id) => 
      forumAPIClient.get(`/api/forum/posts/${id}/similar`),
    
    // 增加浏览量
    incrementView: (id) => 
      forumAPIClient.post(`/api/forum/posts/${id}/view`),
    
    // 点赞/取消点赞帖子
    toggleLike: (id) => 
      forumAPIClient.post(`/api/forum/posts/${id}/like`),
    
    // 收藏/取消收藏帖子
    toggleCollect: (id) => 
      forumAPIClient.post(`/api/forum/posts/${id}/collect`),
    
    // 禁止用户评论
    blockUserComment: (id, userId, expireTime) => 
      forumAPIClient.post(`/api/forum/posts/${id}/permissions/block`, { userId, expireTime }),
    
    // 取消禁言
    unblockUserComment: (id, targetUserId) => 
      forumAPIClient.delete(`/api/forum/posts/${id}/permissions/block/${targetUserId}`),
    
    // 获取被禁言用户列表
    getBlockedUsers: (id) => 
      forumAPIClient.get(`/api/forum/posts/${id}/permissions/blocked-users`),
    
    // ========== 评论管理 ==========
    // 发布评论
    createComment: (postId, content) => 
      forumAPIClient.post(`/api/forum/posts/${postId}/comments`, { content }),
    
    // 回复评论
    replyComment: (commentId, content) => 
      forumAPIClient.post(`/api/forum/comments/${commentId}/reply`, { content }),
    
    // 删除评论（用户删除自己的）
    deleteComment: (commentId) => 
      forumAPIClient.delete(`/api/forum/comments/${commentId}`),
    
    // 帖子作者删除评论
    deleteCommentByAuthor: (postId, commentId) => 
      forumAPIClient.delete(`/api/forum/posts/${postId}/comments/${commentId}`),
    
    // 编辑评论
    updateComment: (commentId, content) => 
      forumAPIClient.put(`/api/forum/comments/${commentId}`, { content }),
    
    // 获取帖子评论列表
    getComments: (postId, page = 1, size = 10, sort = 'time') => 
      forumAPIClient.get(`/api/forum/posts/${postId}/comments`, { params: { page, size, sort } }),
    
    // 获取评论的回复列表
    getReplies: (commentId) => 
      forumAPIClient.get(`/api/forum/comments/${commentId}/replies`),
    
    // 获取用户的所有评论
    getUserComments: (userId, page = 1, size = 10) => 
      forumAPIClient.get(`/api/forum/users/${userId}/comments`, { params: { page, size } }),
    
    // 点赞/取消点赞评论
    toggleCommentLike: (commentId) => 
      forumAPIClient.post(`/api/forum/comments/${commentId}/like`),
    
    // 获取点赞用户列表
    getCommentLikers: (commentId) => 
      forumAPIClient.get(`/api/forum/comments/${commentId}/likers`),
    
    // ========== 媒体管理 ==========
    // 上传临时图片（批量）
    // POST /api/forum/upload/temp-images
    // 返回数据：[{ url: '/api/forum-media/temp_forum_xxx.jpg', fileName: 'xxx', fileSize: 123 }, ...]
    // 最终春示路径：http://localhost:8083/api/forum-media/temp_forum_xxx.jpg
    uploadTempImages: (files) => {
      const formData = new FormData()
      files.forEach(file => formData.append('files', file))
      return forumAPIClient.post('/api/forum/upload/temp-images', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
    },
    
    // 删除临时图片（批量）
    deleteTempImages: (imageUrls) => 
      forumAPIClient.delete('/api/forum/upload/temp-images', {
        data: imageUrls
      }),
    
    // 上传图片（单个）
    uploadImage: (file) => {
      const formData = new FormData()
      formData.append('file', file)
      return forumAPIClient.post('/api/forum/upload/image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
    },
    
    // 上传视频
    uploadVideo: (file) => {
      const formData = new FormData()
      formData.append('file', file)
      return forumAPIClient.post('/api/forum/upload/video', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
    },
    
    // 批量上传
    uploadBatch: (files) => {
      const formData = new FormData()
      files.forEach(file => formData.append('files', file))
      return forumAPIClient.post('/api/forum/upload/batch', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
    },
    
    // 删除媒体文件
    deleteMedia: (id) => 
      forumAPIClient.delete(`/api/forum/media/${id}`),
    
    // 获取帖子的媒体列表
    getPostMedia: (postId) => 
      forumAPIClient.get(`/api/forum/posts/${postId}/media`),
    
    // 获取评论的媒体列表
    getCommentMedia: (commentId) => 
      forumAPIClient.get(`/api/forum/comments/${commentId}/media`),
    
    // 调整媒体排序
    updateMediaSort: (id, sortOrder) => 
      forumAPIClient.put(`/api/forum/media/${id}/sort`, null, { params: { sortOrder } }),
    
    // ========== 黑名单管理 ==========
    // 拉黑用户
    blockUser: (blockedUserId, relationType = 1, blockType = 1, remark = '') => 
      userAPIClient.post('/api/users/blacklist', { blockedUserId, relationType, blockType, remark }),
    
    // 取消拉黑
    unblockUser: (blockedUserId) => 
      userAPIClient.delete(`/api/users/blacklist/${blockedUserId}`),
    
    // 获取我的黑名单列表
    getBlacklist: () => 
      userAPIClient.get('/api/users/blacklist'),
    
    // 检查是否拉黑某用户
    checkBlocked: (targetUserId) => 
      userAPIClient.get(`/api/users/blacklist/check-blocked/${targetUserId}`)
  }
}
