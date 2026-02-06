<template>
  <div class="bottom-nav">
    <router-link 
      v-for="(item, index) in navItems" 
      :key="index"
      :to="item.path"
      class="bottom-nav-item"
      :class="{ active: $route.path === item.path }"
      @click="handleNavClick(item)"
    >
      <div class="nav-icon" :class="item.iconClass">{{ item.icon }}</div>
      <span class="nav-text">{{ item.title }}</span>
      <div v-if="item.badge" class="nav-badge">{{ item.badge }}</div>
    </router-link>
  </div>
</template>

<script>
import { ref, computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useAppStore } from '../stores/app'

export default {
  name: 'BottomNav',
  setup() {
    const route = useRoute()
    const appStore = useAppStore()

    // 导航项配置
    const navItems = ref([
      {
        name: 'home',
        title: '首页',
        path: '/home',
        icon: '🏠',
        iconClass: 'home-icon',
        badge: null
      },
      {
        name: 'forum',
        title: '论坛',
        path: '/forum',
        icon: '💬',
        iconClass: 'forum-icon',
        badge: computed(() => appStore.unreadMessages)
      },
      {
        name: 'mall',
        title: '小农AI',
        path: '/xiao-nong-ai',
        icon: '🤖',
        iconClass: 'ai-icon',
        badge: null
      },
      {
        name: 'quiz',
        title: '答题',
        path: '/quiz',
        icon: '🎯',
        iconClass: 'quiz-icon',
        badge: null
      },
      {
        name: 'profile',
        title: '我的',
        path: '/profile',
        icon: '👤',
        iconClass: 'profile-icon',
        badge: null
      }
    ])

    // 导航点击处理
    const handleNavClick = (item) => {
      // 触发微服务通信
      appStore.setActiveModule(item.name)
      
      // 记录用户行为
      appStore.recordUserAction({
        action: 'navigate',
        module: item.name,
        timestamp: new Date().toISOString()
      })
    }

    return {
      navItems,
      handleNavClick
    }
  }
}
</script>

<style scoped>
.bottom-nav {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background-color: white;
  display: flex;
  justify-content: space-around;
  padding: 10px 0;
  box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.1);
  z-index: 999;
  height: 60px;
}

.bottom-nav-item {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-decoration: none;
  color: #666;
  padding: 5px 10px;
  transition: all 0.3s ease;
  min-width: 60px;
}

.bottom-nav-item.active {
  color: #4CAF50;
  transform: translateY(-2px);
}

.nav-icon {
  width: 24px;
  height: 24px;
  margin-bottom: 4px;
  font-size: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
}

.bottom-nav-item.active .nav-icon {
  transform: scale(1.1);
}

.nav-text {
  font-size: 12px;
  font-weight: 500;
  transition: all 0.3s ease;
}

.nav-badge {
  position: absolute;
  top: 0;
  right: 5px;
  background-color: #ff4444;
  color: white;
  font-size: 10px;
  font-weight: bold;
  padding: 2px 5px;
  border-radius: 10px;
  min-width: 16px;
  text-align: center;
}

/* 响应式设计 */
@media (max-width: 375px) {
  .nav-text {
    font-size: 11px;
  }
  
  .bottom-nav-item {
    min-width: 50px;
    padding: 5px 8px;
  }
}

/* 安全区域适配 */
@supports (padding-bottom: env(safe-area-inset-bottom)) {
  .bottom-nav {
    padding-bottom: calc(10px + env(safe-area-inset-bottom));
  }
}
</style>