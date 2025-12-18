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
    component: EmptyPage
  },
  { 
    path: '/mall', 
    name: 'Mall',
    component: EmptyPage
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

// 使用插件
app.use(pinia)
app.use(router)

// 全局错误处理
app.config.errorHandler = (error, instance, info) => {
  console.error('全局错误:', error, info)
}

// 挂载应用
app.mount('#app')