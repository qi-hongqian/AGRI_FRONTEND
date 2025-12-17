<template>
  <div class="app-wrapper">
    <router-view />
    <!-- 只在登录后显示底部导航栏 -->
    <BottomNav v-if="showBottomNav" />
  </div>
</template>

<script>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useAppStore } from './stores/app'
import BottomNav from './components/BottomNav.vue'

export default {
  name: 'App',
  components: {
    BottomNav
  },
  setup() {
    const route = useRoute()
    const appStore = useAppStore()
    
    // 只在非登录页面显示底部导航
    const showBottomNav = computed(() => {
      return route.path !== '/login' && localStorage.getItem('token')
    })
    
    return {
      showBottomNav
    }
  }
}
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html, body {
  height: 100%;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
}

#app {
  height: 100%;
}

.app-wrapper {
  position: relative;
  min-height: 100vh;
  padding-bottom: 90px;  /* 为底部导航所留空间，包括内容和导航栏之间的距离 */
}

/* 路由视图区域 */
router-view {
  /* 不需要额外的 padding-bottom，由 app-wrapper 处理 */
}
</style>