/**
 * 环境配置文件
 * 支持开发环境和测试环境
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
  
  // 环境名称
  ENV_NAME: 'testing',
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
export const getEnvConfig = () => {
  // 检查 localStorage 中是否有环保存的环境设置
  const storedEnv = localStorage.getItem('APP_ENV')
  
  // 检查 Vite 环境变量
  const viteEnv = import.meta.env.VITE_APP_ENV
  
  // 确定当前环境
  let currentEnv = storedEnv || viteEnv || 'development'
  
  // 日志
  if (TEST_CONFIG.DEBUG || DEV_CONFIG.DEBUG) {
    console.log('[环境配置]', {
      storedEnv,
      viteEnv,
      currentEnv
    })
  }
  
  return currentEnv === 'testing' ? TEST_CONFIG : DEV_CONFIG
}

/**
 * 设置环境
 * 
 * @param {string} env - 环境名称：'development' 或 'testing'
 */
export const setEnv = (env) => {
  if (['development', 'testing'].includes(env)) {
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
