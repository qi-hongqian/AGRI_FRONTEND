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

// 农业资讯服务（轮播、新闻、资讯等）- 端口 8082
const agriAPIClient = axios.create({
  baseURL: envConfig.CONTENT_API,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  },
  maxRedirects: 5
})

// Agent AI服务 - 端口 8085
const agentAPIClient = axios.create({
  baseURL: envConfig.AGENT_API,
  timeout: 60000, // AI 响应可能较慢，设置1分钟超时时间
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

      // ✅ 公开接口列表 - 这些接口不需要 Authorization 头
      const publicApis = [
        '/api/auth/captcha',
        '/api/auth/login',
        '/api/auth/quick-login',
        '/api/user/register',
        '/api/user/avatar/temp-upload'
      ]

      // 检查当前请求是否是公开接口
      const isPublicApi = publicApis.some(api => config.url?.includes(api))

      // 只为非公开接口添加认证token
      if (!isPublicApi && appStore.token) {
        config.headers.Authorization = `Bearer ${appStore.token}`
        console.log(`[API请求] ✅ Token已添加到请求头`, {
          url: config.url,
          tokenLength: appStore.token.length,
          authorization: `Bearer ${appStore.token.substring(0, 20)}...`
        })
      } else if (!isPublicApi) {
        console.warn(`[API请求] ⚠️ 未找到Token`, {
          url: config.url,
          storeToken: appStore.token
        })
      } else {
        console.log(`[API请求] ✅ 公开接口，不添加Authorization头`, {
          url: config.url
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
      console.log('[前端] 响应详情:', {
        status: response.status,
        statusText: response.statusText,
        dataKeys: Object.keys(response.data || {}),
        dataType: typeof response.data,
        captchaImageLength: response.data?.captchaImage?.length
      })

      // 处理后端响应
      const { data } = response

      // 优先使用后端返回的 success 字段
      // 只有当 success 不存在时才根据 code 判定
      if (data && typeof data === 'object' && data.success === undefined) {
        data.success = data.code === 0
      }

      console.log('[API拦截器] 处理后的数据:', {
        hasSuccess: data?.success !== undefined,
        successValue: data?.success,
        hasCode: data?.code !== undefined,
        codeValue: data?.code
      })

      // 记录成功的API调用
      const appStore = useAppStore()
      appStore.recordUserAction({
        action: 'api_success',
        module: response.config.url?.split('/')[3] || 'unknown',
        data: { url: response.config.url, duration }
      })

      // 直接返回处理后的响应
      return data
    },
    (error) => {
      const { response, config } = error

      console.error('[API错误] 详细信息:', {
        url: config?.url,
        method: config?.method,
        status: response?.status,
        statusText: response?.statusText,
        errorCode: error.code,
        errorMessage: error.message,
        responseData: response?.data
      })
      console.trace('[API错误] 堆栈跟踪')

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
        console.error('[API错误] 401 未授权')

        // ✅ 公开接口不需要 token，不跳转
        const publicApis = [
          '/api/auth/captcha',
          '/api/auth/login',
          '/api/auth/quick-login',
          '/api/user/register',
          '/api/user/avatar/temp-upload'
        ]
        const isPublicApi = publicApis.some(api => config.url?.includes(api))

        if (isPublicApi) {
          console.warn('[公开接口返回401] 这是后端配置问题，公开接口不应要求 Authorization')
          errorMessage = '服务器配置错误，请联系管理员'
        } else {
          console.error('[API错误] 401 未授权，清除token并跳转到登录页')
          errorMessage = '登录已过期，请重新登录'
          // 清除token并跳转到登录页
          appStore.logout()
          window.location.href = '/login'
        }
      } else if (response?.status === 500) {
        errorMessage = '服务器错误，请稍候重试'
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

// 为四个服务都添加拦截器
createInterceptors(userAPIClient)
createInterceptors(forumAPIClient)
createInterceptors(agriAPIClient)
createInterceptors(agentAPIClient)

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
      userAPIClient.get('/api/auth/captcha', { params: { phone } }),

    // 用户注册
    // ✅ Content-Type 必须是 application/x-www-form-urlencoded
    // ✅ 所有参数都是 @RequestParam，不是 JSON body
    // ✅ avatarUrl 是可选的（如果用户不上传头像）
    // ✅ avatarUrl 必须包含 temp_ 前缀（表示临时文件）
    register: (registerData) => {
      const params = new URLSearchParams()
      params.append('phone', registerData.phone)
      params.append('password', registerData.password)
      params.append('nickname', registerData.nickname)

      // 如果用户选择了头像，添加到请求
      if (registerData.avatarUrl) {
        params.append('avatarUrl', registerData.avatarUrl)
      }

      return userAPIClient.post('/api/user/register', params, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      })
    },

    // 注册时上传临时头像（预览用）
    uploadTempAvatar: (file) => {
      const formData = new FormData()
      formData.append('avatar', file)
      return userAPIClient.post('/api/user/avatar/temp-upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
    },

    // 删除单个临时头像
    deleteTempAvatar: (avatarUrl) => {
      return userAPIClient.delete('/api/user/avatar/temp-delete', {
        params: { avatarUrl }
      })
    },

    // 批量删除临时头像
    deleteTempAvatarBatch: (avatarUrls) =>
      userAPIClient.post('/api/user/avatar/temp-delete-batch', { avatarUrls }),

    // 更新用户头像（登录后）
    updateAvatar: (file) => {
      const formData = new FormData()
      formData.append('avatar', file)  // ✅ 字段名必须是 avatar
      return userAPIClient.post('/api/user/avatar/update', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
    },

    // 修改密码
    changePassword: (oldPassword, newPassword) =>
      userAPIClient.post('/api/user/password/change', { oldPassword, newPassword }),

    // 修改手机号
    changePhone: (phone, password) =>
      userAPIClient.post('/api/user/phone/change', { phone, password }),

    // 提交用户反馈
    submitFeedback: (feedbackContent, solution) =>
      userAPIClient.post('/api/user/feedback', { feedbackContent, solution }),

    // 获取用户反馈列表
    getFeedbackList: () =>
      userAPIClient.get('/api/user/feedback'),

    // 获取用户反馈详情
    getFeedbackDetail: (id) =>
      userAPIClient.get(`/api/user/feedback/${id}`),

    // 添加快递地址
    addAddress: (addressData) =>
      userAPIClient.post('/api/user/address', addressData),

    // 获取地址列表
    getAddressList: () =>
      userAPIClient.get('/api/user/address'),

    // 获取地址详情
    getAddressDetail: (id) =>
      userAPIClient.get(`/api/user/address/${id}`),

    // 更新地址
    updateAddress: (id, addressData) =>
      userAPIClient.put(`/api/user/address/${id}`, addressData),

    // 删除地址
    deleteAddress: (id) =>
      userAPIClient.delete(`/api/user/address/${id}`),

    // 设置默认地址
    setDefaultAddress: (id) =>
      userAPIClient.put(`/api/user/address/${id}/default`),

    // ========== 黑名单管理 ==========
    // 拉黑用户
    blockUser: (blockedUserId, relationType = 1, blockType = 1, reason = '') =>
      userAPIClient.post('/api/user/blacklist', { blockedUserId, relationType, blockType, reason }),

    // 解除拉黑
    unblockUser: (blockedUserId) =>
      userAPIClient.delete(`/api/user/blacklist/${blockedUserId}`),

    // 获取我的黑名单
    getBlacklist: (page = 1, size = 10) =>
      userAPIClient.get('/api/user/blacklist', { params: { page, size } }),

    // 检查是否拉黑
    checkBlocked: (targetUserId) =>
      userAPIClient.get(`/api/user/blacklist/check/${targetUserId}`)
  },
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

    // 获取帖子评论树形结构（抖音式二级评论）
    getCommentsTree: (postId, page = 1, size = 50, sort = 'new') =>
      forumAPIClient.get(`/api/forum/posts/${postId}/comments/tree`, { params: { page, size, sort } }),

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
  },
  agri: {
    // ========== 轮播图模块 ==========
    // 查询首页轮播图列表
    getCarousels: () =>
      agriAPIClient.get('/api/agri/carousel/list'),

    // ========== 新闻模块 ==========
    // 查询农业新闻列表（分页）
    getNewsList: (params) =>
      agriAPIClient.get('/api/agri/news/list', { params }),

    // 查询农业新闻详情
    getNewsDetail: (id) =>
      agriAPIClient.get(`/api/agri/news/detail/${id}`),

    // ========== 资讯分类模块 ==========
    // 查询农业资讯分类列表
    getCategories: () =>
      agriAPIClient.get('/api/agri/category/list'),

    // ========== 资讯核心模块 ==========
    // 查询首页农业资讯列表（分页）
    getIndexInfoList: (params) =>
      agriAPIClient.get('/api/agri/info/index/list', { params }),

    // 按分类查询农业资讯列表（分页）
    getCategoryInfoList: (params) =>
      agriAPIClient.get('/api/agri/info/category/list', { params }),

    // 查询农业资讯详情
    getInfoDetail: (id) =>
      agriAPIClient.get(`/api/agri/info/detail/${id}`),

    // ========== 用户互动模块 ==========
    // 资讯点赞 / 取消点赞
    toggleInfoLike: (userId, infoId) =>
      agriAPIClient.post(`/api/agri/info/${infoId}/like`, { userId }),

    // 资讯收藏 / 取消收藏
    toggleInfoCollect: (userId, infoId) =>
      agriAPIClient.post(`/api/agri/info/${infoId}/collect`, { userId }),

    // 查询当前用户收藏的资讯列表（分页）- 通过 Authorization 识别用户
    getMyCollections: (current = 1, size = 10) =>
      agriAPIClient.get('/api/agri/info/my/collections', { params: { current, size } }),

    // ========== 评论模块 ==========
    // 查询资讯的评论列表（树形结构）
    getCommentList: (infoId, current = 1, size = 10) =>
      agriAPIClient.get(`/api/agri/comment/list/${infoId}`, { params: { current, size } }),

    // 获取评论详情
    getCommentDetail: (commentId) =>
      agriAPIClient.get(`/api/agri/comment/detail/${commentId}`),

    // 发布一级评论
    addLevel1Comment: (data) =>
      agriAPIClient.post('/api/agri/comment/add/level1', data),

    // 发布二级评论
    addLevel2Comment: (data) =>
      agriAPIClient.post('/api/agri/comment/add/level2', data),

    // 发布三级评论
    addLevel3Comment: (data) =>
      agriAPIClient.post('/api/agri/comment/add/level3', data),

    // 评论点赞 / 取消点赞
    toggleCommentLike: (userId, commentId) =>
      agriAPIClient.post(`/api/agri/comment/like/${commentId}`, { userId }),

    // 删除评论（会级联删除子评论）
    deleteComment: (userId, commentId) =>
      agriAPIClient.delete(`/api/agri/comment/delete/${commentId}`, { params: { userId } }),

    // 获取授权图片资源 (用于 v-auth-img 指令)
    // 参考论坛服务的实现，通过 axios 带 Authorization 请求头获取图片
    getAuthImage: async (imageUrl) => {
      try {
        // 如果是相对路径，使用 agriAPIClient 请求
        // 如果是完整URL，需要判断是否是我们的服务器
        const envConfig = getEnvConfig()
        let requestUrl = imageUrl
        let client = agriAPIClient

        // 如果是完整URL，检查是否需要认证
        if (imageUrl.startsWith('http')) {
          // 判断是否是本项目的服务器地址
          const isOurServer = imageUrl.includes('localhost') ||
            imageUrl.includes('192.168') ||
            imageUrl.includes('8.141.102.201')

          if (!isOurServer) {
            // 外部资源，直接返回 URL，不需要认证
            return imageUrl
          }

          // 是我们的服务器，提取相对路径
          // 例如: http://localhost:8082/api/xxx -> /api/xxx
          try {
            const urlObj = new URL(imageUrl)
            requestUrl = urlObj.pathname + urlObj.search
          } catch (e) {
            requestUrl = imageUrl
          }
        }

        console.log('[API] 获取授权图片:', requestUrl)

        // 使用 agriAPIClient 请求，自动携带 Authorization 请求头
        const response = await client.get(requestUrl, {
          responseType: 'blob'
        })

        // response 已经是拦截器处理后的 Blob 数据
        if (response instanceof Blob) {
          return URL.createObjectURL(response)
        }

        // 如果响应不是 Blob，尝试直接返回原始 URL
        console.warn('[API] 响应不是 Blob，直接返回原始 URL')
        return imageUrl
      } catch (error) {
        console.error('[API] 获取授权图片失败:', imageUrl, error)
        // 失败时返回原始 URL，让浏览器尝试直接加载
        return imageUrl
      }
    },

    // 获取天气信息
    getWeatherInfo: (adcode, extensions = 'base') =>
      agriAPIClient.get('/api/agri/weather/info', { params: { adcode, extensions } }),
    
    // 获取城市列表（树形结构）
    getWeatherCities: () =>
      agriAPIClient.get('/api/agri/weather/cities')
  },

  // ========== Agent AI服务 (8085) ==========
  agent: {
    // 1.1 生成市场分析周报
    marketAnalysis: (selectedTitles) =>
      agentAPIClient.post('/api/agent/market-analysis', { selectedTitles }),

    // 1.2 生成农技实操手册
    generateTechManual: (infoId) =>
      agentAPIClient.post(`/api/agent/tech-manual/${infoId}`),
    
    // 1.2.1 资讯AI问答 (农技实操百科)
    techQa: (infoId, question = '') =>
      agentAPIClient.post('/api/agent/tech-manual', { infoId, question }),

    // 1.3 生成数据洞察报告
    getInsightReport: () =>
      agentAPIClient.post('/api/agent/insight-report'),

    // 2.1 农业智能对话 (通用)
    chat: (question) =>
      agentAPIClient.post('/api/agent/chat', { question }),

    // 2.2 资讯问答 (基于上下文)
    newsChat: (question, newsIds) =>
      agentAPIClient.post('/api/agent/news', { question, newsIds }),

    // 2.3 图表生成
    chartGen: (question) =>
      agentAPIClient.post('/api/agent/chart', { question }),
    
    // 3.1 市场分析 - 农业智能对话
    chat: (question) =>
      agentAPIClient.post('/api/agent/chat', { question }),
    
    // 3.2 市场分析 - 生成市场周报
    marketAnalysis: (selectedTitles) =>
      agentAPIClient.post('/api/agent/market-analysis', { selectedTitles }),
    
    // 3.3 市场分析 - 获取文档内容
    getDocument: (docId) =>
      agentAPIClient.get(`/api/agent/documents/${docId}`),
    
    // 3.4 市场分析 - 下载文档
    downloadDocument: (docId) =>
      agentAPIClient.get(`/api/agent/documents/${docId}/download`),
    
    // 3.5 市场分析 - 获取新闻列表
    getNewsList: () =>
      agentAPIClient.get('/api/news/list'),
    
    // 3.6 市场分析 - 获取周报列表
    getReportList: (docType) =>
      agentAPIClient.get('/api/agent/documents', { params: { docType } }),
      
    // 获取基础URL（用于动态环境切换）
    getBaseURL: () => {
      const envConfig = getEnvConfig()
      return envConfig.AGENT_API
    }
  }
}
