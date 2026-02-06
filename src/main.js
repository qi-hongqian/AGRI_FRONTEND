import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import { createPinia } from 'pinia'
import App from './App.vue'
import './assets/main.css'

// 导入组件
import LoginPage from './components/LoginPage.vue'
import HomePage from './components/HomePage.vue'
import QuizPage from './components/QuizPage.vue'
import ProfilePage from './components/ProfilePage.vue'
import UserInfoPage from './components/UserInfoPage.vue'
import ForumPage from './components/ForumPage.vue'
import PostListPage from './components/PostListPage.vue'
import PostDetailPage from './components/PostDetailPage.vue'
import CreatePostPage from './components/CreatePostPage.vue'
import EditPostPage from './components/EditPostPage.vue'
import MallPage from './components/MallPage.vue'
import InfoDetailPage from './components/InfoDetailPage.vue'
import NewsListPage from './components/NewsListPage.vue'
import NewsDetailPage from './components/NewsDetailPage.vue'
import CategoryListPage from './components/CategoryListPage.vue'
import CollectPage from './components/CollectPage.vue'
import ChangePasswordPage from './components/ChangePasswordPage.vue'
import ChangePhonePage from './components/ChangePhonePage.vue'
import ExpressAddressPage from './components/ExpressAddressPage.vue'
import PrivacySettingsPage from './components/PrivacySettingsPage.vue'
import BlockListPage from './components/BlockListPage.vue'
import AboutAppPage from './components/AboutAppPage.vue'
import FeedbackPage from './components/FeedbackPage.vue'
import SearchPostPage from './components/SearchPostPage.vue'
import WeatherPage from './components/WeatherPage.vue'
import api from './api/index.js'

// 创建Pinia实例
const pinia = createPinia()

// 创建简单的占位组件
const EmptyPage = {
  name: 'EmptyPage',
  template: `
    <div style="padding: 40px; text-align: center; min-height: 100vh; display: flex; flex-direction: column; justify-content: center; align-items: center;">
      <div style="font-size: 60px; margin-bottom: 20px;">🚧</div>
      <h2 style="color: #666; margin-bottom: 10px;">页面正在开发中...</h2>
      <p style="color: #999;">该模块正在紧急开发中，敬请期待</p>
    </div>
  `
}

// 配置路由
const routes = [
  {
    path: '/',
    redirect: '/login'
  }, // 默认重定向到登录页
  {
    path: '/login',
    name: 'Login',
    component: LoginPage
  },
  {
    path: '/home',
    name: 'Home',
    component: HomePage
  },
  {
    path: '/forum',
    name: 'Forum',
    component: ForumPage
  },
  {
    path: '/forum/category/:categoryId',
    name: 'PostList',
    component: PostListPage
  },
  {
    path: '/forum/post/:id',
    name: 'PostDetail',
    component: PostDetailPage
  },
  {
    path: '/forum/create',
    name: 'CreatePost',
    component: CreatePostPage
  },
  {
    path: '/forum/post/:id/edit',
    name: 'EditPost',
    component: EditPostPage
  },
  {
    path: '/mall',
    name: 'Mall',
    component: () => import('./components/AiAgentPage.vue')
  },
  {
    path: '/info-detail/:id',
    name: 'InfoDetail',
    component: InfoDetailPage
  },
  {
    path: '/news-list',
    name: 'NewsList',
    component: NewsListPage
  },
  {
    path: '/news-detail/:id',
    name: 'NewsDetail',
    component: NewsDetailPage
  },
  {
    path: '/category-list',
    name: 'CategoryList',
    component: CategoryListPage
  },
  {
    path: '/collect',
    name: 'Collect',
    component: CollectPage
  },
  {
    path: '/quiz',
    name: 'Quiz',
    component: QuizPage
  },
  {
    path: '/profile',
    name: 'Profile',
    component: ProfilePage
  },
  {
    path: '/user-info',
    name: 'UserInfo',
    component: UserInfoPage
  },
  {
    path: '/change-password',
    name: 'ChangePassword',
    component: ChangePasswordPage
  },
  {
    path: '/change-phone',
    name: 'ChangePhone',
    component: ChangePhonePage
  },
  {
    path: '/express-address',
    name: 'ExpressAddress',
    component: ExpressAddressPage
  },
  {
    path: '/privacy-settings',
    name: 'PrivacySettings',
    component: PrivacySettingsPage
  },
  {
    path: '/block-list',
    name: 'BlockList',
    component: BlockListPage
  },
  {
    path: '/about-app',
    name: 'AboutApp',
    component: AboutAppPage
  },
  {
    path: '/forum/search',
    name: 'SearchPost',
    component: SearchPostPage
  },
  {
    path: '/feedback',
    name: 'Feedback',
    component: FeedbackPage
  },
  {
    path: '/weather',
    name: 'Weather',
    component: WeatherPage
  },
  {
    path: '/ai-insight',
    name: 'AiInsight',
    component: () => import('./components/AiInsightPage.vue')
  },
  {
    path: '/ai-chat',
    name: 'AiChat',
    component: () => import('./components/AiChatPage.vue')
  },
  {
    path: '/xiao-nong-ai',
    name: 'XiaoNongAi',
    component: () => import('./components/XiaoNongAiPage.vue')
  }
]

// 创建路由实例
const router = createRouter({
  history: createWebHistory(),
  routes
})

// 路由守卫 - 检查认证状态
router.beforeEach((to, from, next) => {
  console.log('路由跳转:', from.path, '->', to.path)

  // 检查是否需要认证
  const publicPages = ['/login']
  const authRequired = !publicPages.includes(to.path)

  if (authRequired && !localStorage.getItem('token')) {
    // 需要认证但未登录，跳转到登录页
    next('/login')
  } else {
    next()
  }
})

// 创建应用实例
const app = createApp(App)

// ✨ 注册授权图片指令 v-auth-img
// 用法: <img v-auth-img="imageUrl" />
// 该指令会使用带 Authorization 的请求获取图片 Blob，解决直接用 src 无法带请求头的问题
// 参考论坛服务的实现方式
app.directive('auth-img', {
  async mounted(el, binding) {
    const loadImage = async (url) => {
      if (!url) return

      // 如果已经是 blob/data URL，直接设置
      if (url.startsWith('data:') || url.startsWith('blob:')) {
        el.src = url
        return
      }

      try {
        // 通过 API 获取带认证的图片
        const blobUrl = await api.agri.getAuthImage(url)
        if (blobUrl) {
          // 释放旧的 ObjectURL (如果有)
          if (el._authImgUrl && el._authImgUrl.startsWith('blob:')) {
            URL.revokeObjectURL(el._authImgUrl)
          }
          el.src = blobUrl
          el._authImgUrl = blobUrl
        }
      } catch (error) {
        console.error('[v-auth-img] 加载图片失败:', url, error)
        // 失败时尝试直接设置 src
        el.src = url
      }
    }

    el._watchUrl = binding.value
    await loadImage(binding.value)
  },
  async updated(el, binding) {
    if (binding.value !== el._watchUrl) {
      el._watchUrl = binding.value

      const loadImage = async (url) => {
        if (!url) return

        if (url.startsWith('data:') || url.startsWith('blob:')) {
          el.src = url
          return
        }

        try {
          const blobUrl = await api.agri.getAuthImage(url)
          if (blobUrl) {
            if (el._authImgUrl && el._authImgUrl.startsWith('blob:')) {
              URL.revokeObjectURL(el._authImgUrl)
            }
            el.src = blobUrl
            el._authImgUrl = blobUrl
          }
        } catch (error) {
          console.error('[v-auth-img] 加载图片失败:', url, error)
          el.src = url
        }
      }
      await loadImage(binding.value)
    }
  },
  unmounted(el) {
    // 释放 ObjectURL 防止内存泄漏
    if (el._authImgUrl && el._authImgUrl.startsWith('blob:')) {
      URL.revokeObjectURL(el._authImgUrl)
    }
  }
})

// 使用插件
app.use(pinia)
app.use(router)

// 全局错误处理
app.config.errorHandler = (error, instance, info) => {
  console.error('全局错误:', error, info)
}

// 🔍 使用 sessionStorage 持久化日志，页面刷新后仍然可以查看
const originalLog = console.log
const originalError = console.error
const originalWarn = console.warn

// 从 sessionStorage 读取已有日志
let logBuffer = []
try {
  const stored = sessionStorage.getItem('__logBuffer')
  if (stored) {
    logBuffer = JSON.parse(stored)
  }
} catch (e) {
  console.error('无法读取日志缓冲区:', e)
}

const addToBuffer = (type, args) => {
  const logEntry = {
    type,
    time: new Date().toISOString(),
    message: args.map(arg =>
      typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
    ).join(' ')
  }

  logBuffer.push(logEntry)

  // 上限 500 条日志
  if (logBuffer.length > 500) {
    logBuffer.shift()
  }

  // 持久化到 sessionStorage
  try {
    sessionStorage.setItem('__logBuffer', JSON.stringify(logBuffer))
  } catch (e) {
    // sessionStorage 可能已满，清除一半旧日志
    logBuffer = logBuffer.slice(250)
    try {
      sessionStorage.setItem('__logBuffer', JSON.stringify(logBuffer))
    } catch (e2) {
      // 忽略错误
    }
  }
}

console.log = function (...args) {
  addToBuffer('log', args)
  return originalLog.apply(console, args)
}

console.error = function (...args) {
  addToBuffer('error', args)
  return originalError.apply(console, args)
}

console.warn = function (...args) {
  addToBuffer('warn', args)
  return originalWarn.apply(console, args)
}

// 全局可访问，便查看日志
window.__logBuffer = logBuffer
window.__clearLogBuffer = () => {
  logBuffer.length = 0
  sessionStorage.removeItem('__logBuffer')
  console.log('日志缓冲区已清空')
}

// 挂载应用
app.mount('#app')