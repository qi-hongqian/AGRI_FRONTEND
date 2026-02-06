<template>
  <div class="profile-container">
    <!-- 顶部背景 -->
    <div class="profile-header">
      <!-- 用户头像 -->
      <div class="avatar-section">
        <div class="avatar-circle" @click="triggerAvatarInput" :class="{ 'avatar-editable': true }">
          <img v-if="user.avatar" :src="avatarUrl" :alt="user.nickname" class="avatar-image" />
          <div v-else class="avatar-placeholder">
            <i>👤</i>
          </div>
          <div class="avatar-overlay">
            <span class="overlay-text">📷 修改</span>
          </div>
        </div>
        <input 
          ref="avatarInput"
          type="file" 
          accept="image/*"
          @change="handleAvatarChange"
          class="avatar-file-input"
          style="display: none"
        />
      </div>

      <!-- 用户基本信息 -->
      <div class="user-info-section">
        <h2 class="user-nickname">{{ user.nickname }}</h2>
        <p class="user-phone">
          <span class="label">手机号：</span>
          <span class="value">{{ phoneDisplay }}</span>
          <img 
            :src="eyeIconUrl" 
            alt="toggle visibility" 
            class="eye-icon" 
            @click="togglePhoneVisibility"
          >
        </p>
        <div class="user-meta">
          <span class="user-id">ID: {{ user.id }}</span>
          <span class="user-role">{{ roleText }}</span>
          <span 
            v-if="!isLoading"
            class="info-completion" 
            :class="`completion-${getCompletionLevel()}`"
          >
            信息完成度: {{ infoCompletionRate }}%
          </span>
          <span 
            v-else
            class="info-completion info-loading"
          >
            加载中...
          </span>
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
          <div class="menu-item" @click="handleMenuClick('expressAddress')">
            <span class="menu-icon">📦</span>
            <span class="menu-text">快递地址</span>
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
          <!-- 环境切换 -->
          <div class="menu-item" @click="toggleEnv">
            <span class="menu-icon">🌐</span>
            <span class="menu-text">环境切换: {{ currentEnvDisplay }}</span>
            <span class="menu-arrow">›</span>
          </div>
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

  <!-- 确认弹窗 (用于退出登录、切换环境等) -->
  <div v-if="showConfirmModal" class="modal-overlay" @click="closeConfirmModal">
    <div class="confirm-modal" @click.stop>
      <div class="modal-content">
        <div class="modal-icon">{{ confirmModalIcon }}</div>
        <h3 class="modal-title">{{ confirmModalTitle }}</h3>
        <p class="modal-text">{{ confirmModalText }}</p>
      </div>
      <div class="modal-footer">
        <button class="modal-btn cancel" @click="closeConfirmModal">取消</button>
        <button class="modal-btn confirm" :class="confirmModalType" @click="executePendingAction">确定</button>
      </div>
    </div>
  </div>

  <!-- Toast提示 -->
  <transition name="toast">
    <div v-if="showToast" class="toast-container" :class="`toast-${toastType}`">
      <span class="toast-message">{{ toastMessage }}</span>
    </div>
  </transition>
</template>

<script setup>
import { ref, computed, onMounted, onActivated } from 'vue'
import { useRouter } from 'vue-router'
import { useAppStore } from '../stores/app'
import { getEnvConfig, getCurrentEnv, setEnv } from '../config/env'
import api from '../api/index.js'
import eyesOpenIcon from '@/assets/icon/eyes_open.png'
import eyesCloseIcon from '@/assets/icon/eyes_close.png'

const router = useRouter()
const appStore = useAppStore()
const avatarInput = ref(null)
const isUploadingAvatar = ref(false)

// 用户信息
const user = ref({
  id: null,
  phone: '',
  nickname: '',
  avatar: '',
  role: 'user'
})

// 状态
// 添加：如果已有缓存，初始化为 false，避免闪烁
const isLoading = ref(appStore.infoCompletionRate === 0)
// 从 Store 中取值，或使用存储的值
const infoCompletionRate = computed(() => appStore.infoCompletionRate)

// 弹窗相关状态
const showConfirmModal = ref(false)
const confirmModalTitle = ref('')
const confirmModalText = ref('')
const confirmModalIcon = ref('❓')
const confirmModalType = ref('default') // 'default' | 'danger'
const pendingAction = ref(null)

// Toast提示相关
const showToast = ref(false)
const toastMessage = ref('')
const toastType = ref('success') // 'success' | 'error' | 'info'

// 显示Toast提示
const displayToast = (message, type = 'success') => {
  toastMessage.value = message
  toastType.value = type
  showToast.value = true
  setTimeout(() => {
    showToast.value = false
  }, 2500)
}

// 打开确认弹窗
const openConfirmModal = (options) => {
  confirmModalTitle.value = options.title || '确认提示'
  confirmModalText.value = options.text || '确定要执行此操作吗？'
  confirmModalIcon.value = options.icon || '❓'
  confirmModalType.value = options.type || 'default'
  pendingAction.value = options.action
  showConfirmModal.value = true
}

// 关闭弹窗
const closeConfirmModal = () => {
  showConfirmModal.value = false
  pendingAction.value = null
}

// 执行弹窗确认后的操作
const executePendingAction = () => {
  if (pendingAction.value) {
    pendingAction.value()
  }
  closeConfirmModal()
}

// 控制手机号显示状态
const isPhoneVisible = ref(false)

// 眼睛图标URL
const eyeIconUrl = computed(() => {
  return isPhoneVisible.value ?  eyesOpenIcon : eyesCloseIcon
})

// 计算显示的手机号
const phoneDisplay = computed(() => {
  if (!user.value.phone) return ''
  return isPhoneVisible.value ? user.value.phone : maskPhone(user.value.phone)
})

// 切换手机号显示状态
const togglePhoneVisibility = () => {
  isPhoneVisible.value = !isPhoneVisible.value
}

// 计算头像URL
const avatarUrl = computed(() => {
  if (!user.value.avatar) return ''
  // 如果是相对路径，添加基础URL
  if (user.value.avatar.startsWith('/')) {
    const envConfig = getEnvConfig()
    return `${envConfig.USER_API}${user.value.avatar}`
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

// 汚柩住客户紙第一揉强国版
const maskPhone = (phone) => {
  if (!phone) return ''
  return phone.slice(0, 3) + '****' + phone.slice(7)
}

// 当前环境显示文本
const currentEnvDisplay = computed(() => {
  const env = getCurrentEnv()
  const envMap = {
    'development': '🌐 本地',
    'testing': '🜖 测试',
    'production': '🚀 生产'
  }
  return envMap[env] || '本地'
})

// 切换环境（三个环境循环切换）
const toggleEnv = () => {
  const currentEnv = getCurrentEnv()
  let nextEnv
  let envName
  
  // 循环切换: development -> testing -> production -> development
  if (currentEnv === 'development') {
    nextEnv = 'testing'
    envName = '手机测试环境 (192.168.103.25)'
  } else if (currentEnv === 'testing') {
    nextEnv = 'production'
    envName = '生产环境 (8.141.102.201)'
  } else {
    nextEnv = 'development'
    envName = '本地开发环境 (localhost)'
  }
  
  openConfirmModal({
    title: '环境切换',
    text: `确定要切换到${envName}吗？应用将会刷新以应用新配置。`,
    icon: '🌐',
    action: () => {
      console.log(`[环境切换] ${currentEnv} -> ${nextEnv}`)
      setEnv(nextEnv)
    }
  })
}

// 计算信息完成度级别
const getCompletionLevel = () => {
  const rate = infoCompletionRate.value
  if (rate < 40) {
    return 'low'      // 红色 - 信息不上
  } else if (rate < 80) {
    return 'medium'   // 黄色 - 信息有所不足
  } else {
    return 'high'     // 绿色 - 信息完整
  }
}

// 页面加载时获取用户信息
onMounted(() => {
  loadUserInfo()
})

// 页面激活时重新加载（从编辑页面返回时）
onActivated(() => {
  console.log('[个人页面] 页面激活，重新加载用户信息')
  loadUserInfo(true) // 传入true表示强制刷新
})

// 加载用户信息
const loadUserInfo = async (forceRefresh = false) => {
  try {
    // 先检查是否有 token
    if (!appStore.token) {
      console.warn('[个人页面] 没有 token，跳转登录')
      router.push('/login')
      return
    }
    
    // 如果强制刷新或 store 中没有 user 信息，从后端获取
    let userData = appStore.user
    if (forceRefresh || !userData) {
      console.log('[个人页面] 从后端获取用户信息', { forceRefresh, hasUser: !!userData })
      const res = await api.user.getUserInfo()
      if (res.success && res.data) {
        userData = res.data
        // 保存到 store
        appStore.setUser(userData)
      } else {
        console.warn('[个人页面] 获取用户信息失败:', res.message)
        router.push('/login')
        return
      }
    }
    
    if (userData) {
      user.value = {
        id: userData.id,
        phone: userData.phone,
        nickname: userData.nickname,
        avatar: userData.avatar,
        role: userData.role || 'user'
      }
      console.log('[个人页面] 加载用户信息:', user.value)
      
      // 获取信息完成度
      const res = await api.user.getEditUserInfo()
      console.log('[个人页面] API响应:', res)
      if (res.success && res.data) {
        // 根据用户信息计算完成度
        let completedCount = 0
        const totalFields = 7 // 真实姓名、性别、职业、地区、个人简介、邮箱、详细地址
                          
        if (res.data.realName) completedCount++
        if (res.data.gender) completedCount++
        if (res.data.profession) completedCount++
        if (res.data.region && res.data.region.provinceId) completedCount++
        if (res.data.introduction) completedCount++
        if (res.data.email) completedCount++
        if (res.data.detailAddress) completedCount++
                          
        const rate = Math.round((completedCount / totalFields) * 100)
        console.log('[个人页面] 计算完成度:', completedCount, '/', totalFields, '=', rate + '%')
        // 保存到 Store 中，以便其他页面可以直接使用
        appStore.setInfoCompletionRate(rate)
      } else {
        console.warn('[个人页面] API返回数据异常:', res)
      }
    } else {
      console.warn('[个人页面] 用户信息没找到')
      // 如果没有用户信息，重定向到登录页
      router.push('/login')
    }
  } catch (error) {
    console.error('[个人页面] 获取信息完成度失败:', error)
    // 失败时使用上次缓存的值，或默认0
  } finally {
    isLoading.value = false  // 结束加载
  }
}

// 菜单点击处理
const handleMenuClick = (action) => {
  console.log('[\u83dc单\u70b9\u51fb]', action)
  // \u4e0d\u540c\u7684 action \u5bfc\u822a\u5230\u76f8\u5e94\u7684\u9875\u9762
  switch (action) {
    case 'changePassword':
      // \u5bfc\u822a\u5230\u4fee\u6539\u5bc6\u7801\u9875\u9762
      router.push('/change-password')
      break
    case 'changePhone':
      // \u5bfc\u822a\u5230\u4fee\u6539\u624b\u673a\u53f7\u9875\u9762
      router.push('/change-phone')
      break
    case 'expressAddress':
      // 导航到快递地址页面
      router.push('/express-address')
      break
    case 'privacySettings':
      // 导航到隐私设置页面
      router.push('/privacy-settings')
      break
    case 'blockList':
      // 导航到黑名单页面
      router.push('/block-list')
      break
    case 'aboutApp':
      // 导航到关于应用页面
      router.push('/about-app')
      break
    case 'feedback':
      // 导航到意见反馈页面
      router.push('/feedback')
      break
    default:
      displayToast('功能开发中...', 'info')
  }
}

// 前往编辑个人信息
const goToEditProfile = () => {
  console.log('[编辑个人信息]')
  // 导航到编辑个人信息页面
  router.push('/user-info')
}

// 登出账户
const handleLogout = () => {
  openConfirmModal({
    title: '退出登录',
    text: '确定要登出当前账户吗？登出后需重新登录才能访问完整功能。',
    icon: '🚪',
    type: 'danger',
    action: async () => {
      try {
        // 清除用户信息和token
        appStore.logout()
        console.log('[登出成功]')
        // 重定向到登录页
        router.push('/login')
      } catch (error) {
        console.error('[登出失败]', error)
        displayToast('登出失败，请重试', 'error')
      }
    }
  })
}

// 打开头像文件选择
const triggerAvatarInput = () => {
  avatarInput.value?.click()
}

// 处理头像改变
const handleAvatarChange = async (event) => {
  const file = event.target.files?.[0]
  if (!file) return
  
  // 验证文件类丛
  if (!file.type.startsWith('image/')) {
    displayToast('请选择图片文件', 'error')
    return
  }
  
  // 验证文件大小 (最大 5MB)
  if (file.size > 5 * 1024 * 1024) {
    displayToast('图片大小不能超过 5MB', 'error')
    return
  }
  
  try {
    isUploadingAvatar.value = true
    console.log('[开始上传头像]', file.name)
    
    // 调用更新头像接口(需要Token)
    const response = await api.user.updateAvatar(file)
    
    console.log('[头像上传响应]', response)
    
    if (response.success) {
      const newAvatarUrl = response.data?.avatarUrl  // ✅ 改为什中 data 中取值
      
      if (newAvatarUrl) {
        // 更新本地用户信息
        user.value.avatar = newAvatarUrl
        
        // 更新 store 中的用户信息
        appStore.setUser({
          ...appStore.user,
          avatar: newAvatarUrl
        })
        
        console.log('[头像上传成功]', newAvatarUrl)
        displayToast('✅ 头像上传成功', 'success')
      } else {
        console.error('[头像响应中缺少 avatarUrl]', response)
        displayToast('❌ 头像上传失败，请重试', 'error')
      }
    } else {
      console.error('[头像上传失败]', response.message)
      
      // 根据具体错误消息显示提示
      let errorMsg = `❌ 上传失败: ${response.message || '未知错误'}`
      
      if (response.message?.includes('文件格式')) {
        errorMsg = '❌ 不支持的文件格式'
      } else if (response.message?.includes('请先登录')) {
        errorMsg = '❌ 登录已过期'
      }
      
      displayToast(errorMsg, 'error')
    }
  } catch (error) {
    console.error('[头像上传错误]', error)
    
    // 提供更详细的错误提示
    let errorMsg = '❌ 网络连接失败'
    
    if (error.message?.includes('timeout')) {
      errorMsg = '❌ 请求超时'
    } else if (error.status === 401) {
      errorMsg = '❌ 登录已过期'
    }
    
    displayToast(errorMsg, 'error')
  } finally {
    isUploadingAvatar.value = false
    // 清除文件输入（为了下次不是的处理）
    if (avatarInput.value) {
      avatarInput.value.value = ''
    }
  }
}
</script>

<style scoped>
.profile-container {
  background: linear-gradient(to bottom, #FAF8F0, #FFFFFF);
  padding-bottom: 30px;  /* 增加底部间距 */
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
  position: relative;
  cursor: pointer;
  transition: all 0.3s ease;
}

.avatar-circle.avatar-editable:hover {
  transform: scale(1.05);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.3);
}

.avatar-circle.avatar-editable:active {
  transform: scale(0.98);
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

/* 头像覆盖层 */
.avatar-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.3s ease;
  border-radius: 50%;
}

.avatar-circle:hover .avatar-overlay {
  opacity: 1;
}

.overlay-text {
  color: white;
  font-size: 14px;
  font-weight: 600;
  white-space: nowrap;
}

.avatar-file-input {
  display: none;
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
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
}

.label {
  opacity: 0.8;
}

.value {
  font-weight: 500;
}

.eye-icon {
  width: 20px;
  height: 20px;
  cursor: pointer;
  margin-left: 8px;
  user-select: none;
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

/* 信息完成度指示器 */
.info-completion {
  background: rgba(255, 255, 255, 0.2);
  padding: 4px 12px;
  border-radius: 12px;
  font-weight: 600;
  transition: all 0.3s ease;
}

/* 完成度级别样式 */
.info-completion.completion-low {
  background: #ef5350;
  color: white;
  box-shadow: 0 2px 8px rgba(239, 83, 80, 0.3);
}

.info-completion.completion-medium {
  background: #ffa726;
  color: white;
  box-shadow: 0 2px 8px rgba(255, 167, 38, 0.3);
}

.info-completion.completion-high {
  background: #66bb6a;
  color: white;
  box-shadow: 0 2px 8px rgba(102, 187, 106, 0.3);
}

/* 加载中状态 */
.info-completion.info-loading {
  background: rgba(255, 255, 255, 0.15);
  color: rgba(255, 255, 255, 0.8);
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 0.6;
  }
  50% {
    opacity: 1;
  }
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
  padding-bottom: 40px;  /* 为loigout-section 提供足够空间 */
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

/* 弹窗样式 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 3000;
  padding: 32px;
  backdrop-filter: blur(4px);
}

.confirm-modal {
  background: white;
  width: 100%;
  max-width: 320px;
  border-radius: 20px;
  overflow: hidden;
  animation: modalIn 0.3s cubic-bezier(0.18, 0.89, 0.32, 1.28);
}

@keyframes modalIn {
  from { transform: scale(0.8); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}

.modal-content {
  padding: 32px 24px;
  text-align: center;
}

.modal-icon {
  font-size: 48px;
  margin-bottom: 16px;
}

.modal-title {
  font-size: 18px;
  font-weight: bold;
  color: #333;
  margin: 0 0 12px 0;
}

.modal-text {
  font-size: 14px;
  color: #666;
  line-height: 1.6;
  margin: 0;
}

.modal-footer {
  display: flex;
  border-top: 1px solid #f0f0f0;
}

.modal-btn {
  flex: 1;
  padding: 16px;
  border: none;
  background: none;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}

.modal-btn.cancel {
  color: #999;
  border-right: 1px solid #f0f0f0;
}

.modal-btn.confirm {
  color: #4CAF50;
}

.modal-btn.confirm.danger {
  color: #FF5252;
}

.modal-btn:active {
  background: #f9f9f9;
}

/* Toast提示样式 */
.toast-container {
  position: fixed;
  top: 80px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0, 0, 0, 0.85);
  color: white;
  padding: 12px 24px;
  border-radius: 24px;
  font-size: 14px;
  font-weight: 500;
  z-index: 4000;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
  backdrop-filter: blur(10px);
  min-width: 200px;
  text-align: center;
}

.toast-success {
  background: linear-gradient(135deg, #4caf50 0%, #66bb6a 100%);
}

.toast-error {
  background: linear-gradient(135deg, #f44336 0%, #ef5350 100%);
}

.toast-info {
  background: linear-gradient(135deg, #2196F3 0%, #42a5f5 100%);
}

/* Toast动画 */
.toast-enter-active {
  animation: toast-in 0.3s ease-out;
}

.toast-leave-active {
  animation: toast-out 0.3s ease-in;
}

@keyframes toast-in {
  0% { opacity: 0; transform: translateX(-50%) translateY(-20px); }
  100% { opacity: 1; transform: translateX(-50%) translateY(0); }
}

@keyframes toast-out {
  0% { opacity: 1; transform: translateX(-50%) translateY(0); }
  100% { opacity: 0; transform: translateX(-50%) translateY(-20px); }
}
</style>
