import axios from 'axios'
import { useAppStore } from '../stores/app'

// 创建axios实例
const apiClient = axios.create({
  baseURL: 'http://localhost:8081',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  },
  maxRedirects: 5  // 允许跟随重定向
})

// 请求拦截器
apiClient.interceptors.request.use(
  (config) => {
    const appStore = useAppStore()
    
    // 添加认证token
    if (appStore.token) {
      config.headers.Authorization = `Bearer ${appStore.token}`
    }
    
    // 添加请求时间戳
    config.metadata = { startTime: new Date().getTime() }
    
    // 打印请求信息
    console.log(`[前端] 发起请求:`, {
      method: config.method.toUpperCase(),
      url: config.url,
      params: config.params,
      data: config.data
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
      const appStore = useAppStore()
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

// 微服务API调用类
class MicroServiceAPI {
  constructor(serviceName) {
    this.serviceName = serviceName
  }
  
  async call(endpoint, data = {}, method = 'GET') {
    try {
      const response = await apiClient({
        method,
        url: endpoint,
        data: method !== 'GET' ? data : undefined,
        params: method === 'GET' ? data : undefined
      })
      
      return response
    } catch (error) {
      console.error(`${this.serviceName} 服务调用失败:`, error)
      throw error
    }
  }
  
  // GET请求快捷方法
  async get(endpoint, params = {}) {
    return this.call(endpoint, params, 'GET')
  }
  
  // POST请求快捷方法
  async post(endpoint, data = {}) {
    return this.call(endpoint, data, 'POST')
  }
  
  // PUT请求快捷方法
  async put(endpoint, data = {}) {
    return this.call(endpoint, data, 'PUT')
  }
  
  // DELETE请求快捷方法
  async delete(endpoint, params = {}) {
    return this.call(endpoint, params, 'DELETE')
  }
}

// 创建各微服务API实例
export const userAPI = new MicroServiceAPI('user-service')
export const contentAPI = new MicroServiceAPI('content-service')
export const forumAPI = new MicroServiceAPI('forum-service')
export const answerAPI = new MicroServiceAPI('answer-service')

// 统一导出API方法
export default {
// 用户相关API
  user: {
    // 登录接口 - 使用JSON格式
    login: (phone, password, captcha) => 
      userAPI.post('/api/auth/login', {
        phone,
        password,
        captcha
      }),
    
    // 注册接口 - 使用FormData格式（支持头像上传）
    register: (formData) => {
      // 注册是公开接口，不需要认证，直接使用 axios 要求
      return axios.post('http://localhost:8081/api/user/register', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })
    },
    
    // 临时上传头像（注册前预览用）- 不需要Token
    uploadTempAvatar: (file) => {
      const formData = new FormData()
      formData.append('avatar', file)
      return axios.post('http://localhost:8081/api/user/avatar/temp-upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })
    },
    
    // 更新头像（登录后修改用）- 需要Token
    updateAvatar: (file) => {
      const formData = new FormData()
      formData.append('avatar', file)
      return apiClient.post('/api/user/avatar/update', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })
    },
    
    // 删除临时头像（单个）
    deleteTempAvatar: (avatarUrl) => {
      return axios.delete(`http://localhost:8081/api/user/avatar/temp-delete?avatarUrl=${encodeURIComponent(avatarUrl)}`)
    },
    
    // 批量删除临时头像
    deleteTempAvatarBatch: (avatarUrls) => {
      return axios.post('http://localhost:8081/api/user/avatar/temp-delete-batch', {
        avatarUrls
      }, {
        headers: {
          'Content-Type': 'application/json'
        }
      })
    },
    
    getProfile: (userId) => 
      userAPI.get('/api/user/profile', { userId }),
    
    updateProfile: (profileData) => 
      userAPI.put('/api/user/profile', profileData),
    
    // 获取性别选项
    getGenderOptions: () => 
      userAPI.get('/api/user/gender/options'),
    
    // 获取省份列表
    getProvinces: () => 
      userAPI.get('/api/user/region/provinces'),
    
    // 获取城市列表
    getCities: (provinceId) => 
      userAPI.get(`/api/user/region/cities/${provinceId}`),
    
    // 获取区县列表
    getDistricts: (cityId) => 
      userAPI.get(`/api/user/region/districts/${cityId}`),
    
    // 填写/更新个人信息
    fillUserInfo: (userInfoData) => 
      userAPI.post('/api/user/info/fill', userInfoData),
    
    // 获取用户个人信息
    getUserInfo: () => 
      userAPI.get('/api/user/info'),
    
    // 获取用户个人信息（编辑页面用，包含选项和已选值）
    getEditUserInfo: () => 
      userAPI.get('/api/user/info/edit'),
        
    // 获取验证码 - GET请求。参数作URL查询参数
    getCaptcha: (phone) => 
      userAPI.get('/api/auth/captcha', { phone })
  },
  
  // 内容相关API
  content: {
    getCarousel: () => 
      contentAPI.get('/api/content/carousel'),
    
    getNews: (page = 1, limit = 10) => 
      contentAPI.get('/api/content/news', { page, limit }),
    
    getInformation: (category, page = 1, limit = 10) => 
      contentAPI.get('/api/content/information', { category, page, limit }),
    
    getNewsDetail: (newsId) => 
      contentAPI.get(`/api/content/news/${newsId}`),
    
    incrementReadCount: (contentId, type) => 
      contentAPI.post('/api/content/read', { contentId, type })
  },
  
  // 论坛相关API
  forum: {
    getPosts: (page = 1, limit = 10, category = null) => 
      forumAPI.get('/api/forum/posts', { page, limit, category }),
    
    getPostDetail: (postId) => 
      forumAPI.get(`/api/forum/post/${postId}`),
    
    createPost: (postData) => 
      forumAPI.post('/api/forum/post', postData),
    
    getComments: (postId, page = 1, limit = 20) => 
      forumAPI.get(`/api/forum/post/${postId}/comments`, { page, limit }),
    
    createComment: (postId, content, parentId = null) => 
      forumAPI.post('/api/forum/comment', { postId, content, parentId })
  },
  
  // 答题相关API
  answer: {
    getQuestions: (category = null, difficulty = null, limit = 10) => 
      answerAPI.get('/api/answer/questions', { category, difficulty, limit }),
    
    submitAnswer: (questionId, userAnswer) => 
      answerAPI.post('/api/answer/submit', { questionId, userAnswer }),
    
    getUserPoints: (userId) => 
      answerAPI.get('/api/answer/points', { userId }),
    
    getLeaderboard: (type = 'daily', limit = 20) => 
      answerAPI.get('/api/answer/leaderboard', { type, limit }),
    
    getAnswerHistory: (userId, page = 1, limit = 20) => 
      answerAPI.get('/api/answer/history', { userId, page, limit })
  }
}