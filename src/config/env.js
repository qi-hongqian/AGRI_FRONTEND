/**
 * 环境配置文件
 * 支持开发、测试、生产三个环境
 * 
 * 使用方式：
 * import { getEnvConfig } from '@/config/env'
 * const config = getEnvConfig()
 * const baseURL = config.USER_API
 */

// 开发环境配置（本地开发）
const DEV_CONFIG = {
  // 用户服务
  USER_API: 'http://localhost:8081',
  
  // 论坛服务
  FORUM_API: 'http://localhost:8083',
  
  // 内容服务
  CONTENT_API: 'http://localhost:8082',
  
  // 问答服务
  ANSWER_API: 'http://localhost:8084',
  
  // Agent AI服务
  AGENT_API: 'http://localhost:8085',
  
  // 环境名称
  ENV_NAME: 'development',
  DEBUG: true
}

// 测试环境配置（手机/其他设备测试）
const TEST_CONFIG = {
  // 用户服务
  USER_API: 'http://192.168.103.25:8081',
  
  // 论坛服务
  FORUM_API: 'http://192.168.103.25:8083',
  
  // 内容服务
  CONTENT_API: 'http://192.168.103.25:8082',
  
  // 问答服务
  ANSWER_API: 'http://192.168.103.25:8084',
  
  // Agent AI服务
  AGENT_API: 'http://192.168.103.25:8085',
  
  // 环境名称
  ENV_NAME: 'testing',
  DEBUG: false
}

// 生产环境配置（阿里云服务器）
const PROD_CONFIG = {
  // 用户服务
  USER_API: 'http://8.141.102.201:8081',
  
  // 论坛服务
  FORUM_API: 'http://8.141.102.201:8083',
  
  // 内容服务
  CONTENT_API: 'http://8.141.102.201:8082',
  
  // 问答服务
  ANSWER_API: 'http://8.141.102.201:8084',
  
  // Agent AI服务
  AGENT_API: 'http://8.141.102.201:8085',
  
  // 环境名称
  ENV_NAME: 'production',
  DEBUG: false
}

/**
 * 获取当前环境配置
 * 
 * 优先级：
 * 1. localStorage 中的 APP_ENV 设置
 * 2. 环境变量 VITE_APP_ENV
 * 3. 默认使用开发环境
 * 
 * @returns {Object} 环境配置对象
 */
let cachedConfig = null
let cachedEnv = null

export const getEnvConfig = () => {
  // 检查 localStorage 中是否有保存的环境设置
  const storedEnv = localStorage.getItem('APP_ENV')
  
  // 检查 Vite 环境变量
  const viteEnv = import.meta.env.VITE_APP_ENV
  
  // 确定当前环境
  // 优先级: Vite ENV > localStorage > 默认值
  let currentEnv = viteEnv || storedEnv || 'development'
  
  // 使用缓存，避免重复执行
  if (cachedEnv === currentEnv && cachedConfig) {
    return cachedConfig
  }
  
  // 如果是生产环境，清除 localStorage 中的旧设置
  // 不让本地 localStorage 中的旧环境干扰生产环境的配置
  if (currentEnv === 'production' && storedEnv && storedEnv !== 'production') {
    console.warn('[⚠️ 检测到环境不一致] currentEnv:', currentEnv, 'storedEnv:', storedEnv)
    console.warn('[⚠️ 即将清除 localStorage.APP_ENV]')
    console.trace('[堆栈跟踪] localStorage.removeItem 调用位置')
    localStorage.removeItem('APP_ENV')
    console.warn('[✅ 已清除 localStorage.APP_ENV]')
  }
  
  // 日\u5fd7
  if (DEV_CONFIG.DEBUG || viteEnv) {
    console.log('[\u73af\u5883\u914d\u7f6e]', {
      viteEnv,
      storedEnv,
      currentEnv,
      finalEnv: currentEnv
    })
  }
  
  // 根\u636e\u73af\u5883\u8fd4\u56de\u5bf9\u5e94\u914d\u7f6e
  let config
  if (currentEnv === 'testing') {
    config = TEST_CONFIG
  } else if (currentEnv === 'production') {
    config = PROD_CONFIG
  } else {
    config = DEV_CONFIG
  }
  
  // \u7f13\u5b58\u914d\u7f6e
  cachedEnv = currentEnv
  cachedConfig = config
  
  return config
}

/**
 * 设置环境
 * 
 * @param {string} env - 环境名称：'development'、'testing' 或 'production'
 */
export const setEnv = (env) => {
  if (['development', 'testing', 'production'].includes(env)) {
    console.log('[环境切换] 即将切换到', env, '环境')
    console.trace('[环境切换] 堆栈跟踪')
    localStorage.setItem('APP_ENV', env)
    console.log('[环境切换] 已切换到', env, '环境')
    // 刷新页面使配置生效
    setTimeout(() => {
      window.location.reload()
    }, 500)
  } else {
    console.error('[环境切换] 无效的环境:', env)
  }
}

/**
 * 获取当前环境名称
 */
export const getCurrentEnv = () => {
  return getEnvConfig().ENV_NAME
}

/**
 * 是否开发环境
 */
export const isDevelopment = () => {
  return getCurrentEnv() === 'development'
}

/**
 * 是否测试环境
 */
export const isTesting = () => {
  return getCurrentEnv() === 'testing'
}

/**
 * 是否开启调试
 */
export const isDebugMode = () => {
  return getEnvConfig().DEBUG
}

export default getEnvConfig
