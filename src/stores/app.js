import { defineStore } from 'pinia'

export const useAppStore = defineStore('app', {
  state: () => ({
    // 用户状态
    user: null,
    token: localStorage.getItem('token') || null,
    infoCompletionRate: 0,  // 添加：缓存信息完成度
    
    // 微服务状态
    activeModule: 'home',
    moduleStates: {
      home: { loading: false, data: null },
      forum: { loading: false, data: null },
      mall: { loading: false, data: null },
      quiz: { loading: false, data: null },
      profile: { loading: false, data: null }
    },
    
    // 业务数据
    unreadMessages: 0,
    cartItemCount: 0,
    quizScores: [],
    
    // 用户行为记录
    userActions: [],
    
    // 系统状态
    isOnline: navigator.onLine,
    networkStatus: 'online'
  }),

  getters: {
    isAuthenticated: (state) => !!state.token,
    currentModule: (state) => state.activeModule,
    
    // 获取模块状态
    getModuleState: (state) => (moduleName) => {
      return state.moduleStates[moduleName] || { loading: false, data: null }
    },
    
    // 计算未读消息总数
    totalUnreadCount: (state) => {
      return state.unreadMessages + (state.cartItemCount > 0 ? 1 : 0)
    }
  },

  actions: {
    // 用户认证
    setUser(user) {
      this.user = user
      if (user && user.token) {
        this.token = user.token
        localStorage.setItem('token', user.token)
      }
    },
    
    logout() {
      this.user = null
      this.token = null
      this.infoCompletionRate = 0  // 添加：登出时清除完成度
      localStorage.removeItem('token')
      this.clearAllModuleData()
    },
    
    // 添加：设置信息完成度
    setInfoCompletionRate(rate) {
      this.infoCompletionRate = rate
      console.log('[Store] 更新信息完成度:', rate + '%')
    },
    
    // 微服务状态管理
    setActiveModule(moduleName) {
      this.activeModule = moduleName
      console.log(`切换到 ${moduleName} 模块`)
    },
    
    setModuleLoading(moduleName, loading) {
      if (this.moduleStates[moduleName]) {
        this.moduleStates[moduleName].loading = loading
      }
    },
    
    setModuleData(moduleName, data) {
      if (this.moduleStates[moduleName]) {
        this.moduleStates[moduleName].data = data
      }
    },
    
    clearModuleData(moduleName) {
      if (this.moduleStates[moduleName]) {
        this.moduleStates[moduleName].data = null
      }
    },
    
    clearAllModuleData() {
      Object.keys(this.moduleStates).forEach(module => {
        this.moduleStates[module].data = null
        this.moduleStates[module].loading = false
      })
    },
    
    // 业务数据管理
    setUnreadMessages(count) {
      this.unreadMessages = count
    },
    
    setCartItemCount(count) {
      this.cartItemCount = count
    },
    
    addQuizScore(score) {
      this.quizScores.push({
        score,
        timestamp: new Date().toISOString()
      })
    },
    
    // 用户行为记录
    recordUserAction(action) {
      this.userActions.push({
        ...action,
        id: Date.now(),
        timestamp: new Date().toISOString()
      })
      
      // 保持最近100条记录
      if (this.userActions.length > 100) {
        this.userActions = this.userActions.slice(-100)
      }
    },
    
    // 网络状态管理
    setNetworkStatus(status) {
      this.networkStatus = status
      this.isOnline = status === 'online'
    },
    
    // 微服务通信
    async callMicroservice(serviceName, endpoint, data = {}) {
      try {
        this.setModuleLoading(serviceName, true)
        
        // 模拟API调用
        const response = await fetch(`/api/${serviceName}/${endpoint}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.token}`
          },
          body: JSON.stringify(data)
        })
        
        const result = await response.json()
        
        if (result.success) {
          this.setModuleData(serviceName, result.data)
          return { success: true, data: result.data }
        } else {
          throw new Error(result.message)
        }
      } catch (error) {
        console.error(`微服务 ${serviceName} 调用失败:`, error)
        return { success: false, error: error.message }
      } finally {
        this.setModuleLoading(serviceName, false)
      }
    },
    
    // 数据同步
    async syncUserData() {
      if (!this.token) return
      
      try {
        const services = ['user-service', 'content-service', 'forum-service']
        
        for (const service of services) {
          await this.callMicroservice(service, 'sync')
        }
        
        console.log('用户数据同步完成')
      } catch (error) {
        console.error('数据同步失败:', error)
      }
    }
  }
})