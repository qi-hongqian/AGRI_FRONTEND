<template>
  <div class="profile-container">
    <!-- 顶部背景 -->
    <div class="profile-header">
      <!-- 用户头像 -->
      <div class="avatar-section">
        <div class="avatar-circle">
          <img v-if="user.avatar" :src="avatarUrl" :alt="user.nickname" class="avatar-image" />
          <div v-else class="avatar-placeholder">
            <i>👤</i>
          </div>
        </div>
      </div>

      <!-- 用户基本信息 -->
      <div class="user-info-section">
        <h2 class="user-nickname">{{ user.nickname }}</h2>
        <p class="user-phone">
          <span class="label">手机号：</span>
          <span class="value">{{ maskPhone(user.phone) }}</span>
        </p>
        <div class="user-meta">
          <span class="user-id">ID: {{ user.id }}</span>
          <span class="user-role">{{ roleText }}</span>
        </div>
      </div>

      <!-- 编辑按钮 -->
      <button class="edit-button" @click="goToEditProfile">
        <i>✏️</i> 编辑
      </button>
    </div>

    <!-- 功能菜单区域 -->
    <div class="menu-section">
      <!-- 账户设置 -->
      <div class="menu-group">
        <h3 class="group-title">账户设置</h3>
        <div class="menu-list">
          <div class="menu-item" @click="handleMenuClick('changePassword')">
            <span class="menu-icon">🔐</span>
            <span class="menu-text">修改密码</span>
            <span class="menu-arrow">›</span>
          </div>
          <div class="menu-item" @click="handleMenuClick('changePhone')">
            <span class="menu-icon">📱</span>
            <span class="menu-text">修改手机号</span>
            <span class="menu-arrow">›</span>
          </div>
          <div class="menu-item" @click="handleMenuClick('bindEmail')">
            <span class="menu-icon">📧</span>
            <span class="menu-text">绑定邮箱</span>
            <span class="menu-arrow">›</span>
          </div>
        </div>
      </div>

      <!-- 隐私设置 -->
      <div class="menu-group">
        <h3 class="group-title">隐私设置</h3>
        <div class="menu-list">
          <div class="menu-item" @click="handleMenuClick('privacySettings')">
            <span class="menu-icon">🔒</span>
            <span class="menu-text">隐私设置</span>
            <span class="menu-arrow">›</span>
          </div>
          <div class="menu-item" @click="handleMenuClick('blockList')">
            <span class="menu-icon">🚫</span>
            <span class="menu-text">黑名单</span>
            <span class="menu-arrow">›</span>
          </div>
        </div>
      </div>

      <!-- 其他设置 -->
      <div class="menu-group">
        <h3 class="group-title">其他</h3>
        <div class="menu-list">
          <div class="menu-item" @click="handleMenuClick('aboutApp')">
            <span class="menu-icon">ℹ️</span>
            <span class="menu-text">关于应用</span>
            <span class="menu-arrow">›</span>
          </div>
          <div class="menu-item" @click="handleMenuClick('feedback')">
            <span class="menu-icon">💬</span>
            <span class="menu-text">意见反馈</span>
            <span class="menu-arrow">›</span>
          </div>
        </div>
      </div>

      <!-- 登出按钮 -->
      <div class="logout-section">
        <button class="logout-button" @click="handleLogout">
          登出账户
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAppStore } from '../stores/app'

const router = useRouter()
const appStore = useAppStore()

// 用户信息
const user = ref({
  id: null,
  phone: '',
  nickname: '',
  avatar: '',
  role: 'user'
})

// 计算头像URL
const avatarUrl = computed(() => {
  if (!user.value.avatar) return ''
  // 如果是相对路径，添加基础URL
  if (user.value.avatar.startsWith('/')) {
    return `http://localhost:8081${user.value.avatar}`
  }
  return user.value.avatar
})

// 角色文本
const roleText = computed(() => {
  const roleMap = {
    'user': '普通用户',
    'admin': '管理员',
    'moderator': '版主'
  }
  return roleMap[user.value.role] || user.value.role
})

// 隐藏手机号中间部分
const maskPhone = (phone) => {
  if (!phone) return ''
  return phone.slice(0, 3) + '****' + phone.slice(7)
}

// 页面加载时获取用户信息
onMounted(() => {
  loadUserInfo()
})

// 加载用户信息
const loadUserInfo = () => {
  const userData = appStore.user
  if (userData) {
    user.value = {
      id: userData.id,
      phone: userData.phone,
      nickname: userData.nickname,
      avatar: userData.avatar,
      role: userData.role || 'user'
    }
    console.log('[个人页面] 加载用户信息:', user.value)
  } else {
    console.warn('[个人页面] 用户信息未找到')
    // 如果没有用户信息，重定向到登录页
    router.push('/login')
  }
}

// 菜单点击处理
const handleMenuClick = (action) => {
  console.log('[菜单点击]', action)
  // TODO: 根据不同的 action 导航到相应的设置页面
  // 这里先预留功能，后续可以实现各个设置页面
  const messages = {
    'changePassword': '修改密码功能开发中...',
    'changePhone': '修改手机号功能开发中...',
    'bindEmail': '绑定邮箱功能开发中...',
    'privacySettings': '隐私设置功能开发中...',
    'blockList': '黑名单功能开发中...',
    'aboutApp': '关于应用功能开发中...',
    'feedback': '意见反馈功能开发中...'
  }
  alert(messages[action] || '功能开发中...')
}

// 前往编辑个人信息
const goToEditProfile = () => {
  console.log('[编辑个人信息]')
  alert('编辑个人信息功能开发中...')
  // TODO: 导航到编辑个人信息页面
  // router.push('/edit-profile')
}

// 登出账户
const handleLogout = async () => {
  if (confirm('确定要登出账户吗？')) {
    try {
      // 清除用户信息和token
      appStore.logout()
      console.log('[登出成功]')
      // 重定向到登录页
      router.push('/login')
    } catch (error) {
      console.error('[登出失败]', error)
      alert('登出失败，请重试')
    }
  }
}
</script>

<style scoped>
.profile-container {
  min-height: 100vh;
  background: linear-gradient(to bottom, #FAF8F0, #FFFFFF);
  padding-bottom: 70px; /* 为底部导航留空间 */
}

/* 顶部信息区域 */
.profile-header {
  background: linear-gradient(135deg, #66BB6A, #81C784);
  padding: 32px 16px 24px;
  color: white;
  position: relative;
}

/* 头像区域 */
.avatar-section {
  display: flex;
  justify-content: center;
  margin-bottom: 20px;
}

.avatar-circle {
  width: 140px;
  height: 140px;
  border-radius: 50%;
  overflow: hidden;
  border: 5px solid white;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.2);
  background: white;
}

.avatar-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 60px;
  background: #E8F5E9;
}

/* 用户信息区域 */
.user-info-section {
  text-align: center;
  margin-bottom: 16px;
}

.user-nickname {
  font-size: 24px;
  font-weight: bold;
  margin: 0 0 8px 0;
  word-break: break-all;
}

.user-phone {
  font-size: 14px;
  margin: 0 0 12px 0;
  opacity: 0.95;
}

.label {
  opacity: 0.8;
}

.value {
  font-weight: 500;
}

.user-meta {
  display: flex;
  justify-content: center;
  gap: 16px;
  flex-wrap: wrap;
  font-size: 12px;
  opacity: 0.9;
}

.user-id {
  background: rgba(255, 255, 255, 0.2);
  padding: 4px 12px;
  border-radius: 12px;
}

.user-role {
  background: rgba(255, 255, 255, 0.2);
  padding: 4px 12px;
  border-radius: 12px;
}

/* 编辑按钮 */
.edit-button {
  position: absolute;
  top: 16px;
  right: 16px;
  background: rgba(255, 255, 255, 0.2);
  border: 1px solid white;
  color: white;
  padding: 8px 16px;
  border-radius: 20px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  transition: all 0.3s;
  display: flex;
  align-items: center;
  gap: 6px;
}

.edit-button:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: scale(1.05);
}

.edit-button:active {
  transform: scale(0.95);
}

/* 菜单区域 */
.menu-section {
  padding: 16px;
}

.menu-group {
  margin-bottom: 20px;
}

.group-title {
  font-size: 13px;
  color: #999;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin: 0 0 8px 16px;
  padding-bottom: 8px;
}

.menu-list {
  background: white;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.menu-item {
  display: flex;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid #F5F5F5;
  cursor: pointer;
  transition: all 0.3s;
}

.menu-item:last-child {
  border-bottom: none;
}

.menu-item:hover {
  background: #F9F9F9;
}

.menu-item:active {
  background: #F0F0F0;
}

.menu-icon {
  font-size: 20px;
  margin-right: 12px;
  min-width: 24px;
}

.menu-text {
  flex: 1;
  font-size: 15px;
  color: #333;
  font-weight: 500;
}

.menu-arrow {
  font-size: 18px;
  color: #CCC;
  margin-left: 8px;
}

/* 登出区域 */
.logout-section {
  margin-top: 24px;
  padding: 0 16px;
}

.logout-button {
  width: 100%;
  padding: 14px;
  background: #FF5252;
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
  box-shadow: 0 2px 8px rgba(255, 82, 82, 0.2);
}

.logout-button:hover {
  background: #FF1744;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(255, 82, 82, 0.3);
}

.logout-button:active {
  transform: translateY(0);
}

/* 响应式设计 */
@media (max-width: 600px) {
  .profile-header {
    padding: 24px 12px 20px;
  }

  .user-nickname {
    font-size: 20px;
  }

  .avatar-circle {
    width: 120px;
    height: 120px;
    border-width: 4px;
  }

  .edit-button {
    font-size: 12px;
    padding: 6px 12px;
  }
}
</style>
