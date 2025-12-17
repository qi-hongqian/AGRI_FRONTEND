<template>
  <div class="login-container">

    <!-- 标题栏 -->
    <div class="toolbar">
      <h1 class="toolbar-title">{{ isRegister ? '用户注册' : '农业科普平台' }}</h1>
      <button v-if="isRegister" @click="cancelRegister" class="back-button">
        &lt;
      </button>
    </div>

    <!-- 内容区域 -->
    <div class="content">
      <!-- Logo 区域 - 仅登录页面显示 -->
      <div v-if="!isRegister" class="logo-container">
        <div class="logo-circle">
          <!-- 使用logo图片 -->
          <img src="/src/assets/logo.png" alt="农业科普平台" class="logo-image" />
        </div>
      </div>

      <!-- 登录表单 -->
      <div v-if="!isRegister" class="form-container">
        <!-- 手机号输入框 -->
        <div class="input-group">
          <i class="icon-user">📱</i>
          <input 
            type="tel" 
            v-model="phone" 
            placeholder="请输入手机号" 
            class="input-field"
            @input="onPhoneChange"
          />
        </div>

        <!-- 密码输入框 -->
        <div class="input-group">
          <i class="icon-lock">🔒</i>
          <input 
            :type="showPassword ? 'text' : 'password'" 
            v-model="password" 
            placeholder="请输入密码" 
            class="input-field"
          />
          <button 
            @click="togglePasswordVisibility" 
            class="toggle-password"
            type="button"
          >
            {{ showPassword ? '👁️‍🗨️' : '👁️' }}
          </button> 
        </div>

        <!-- 验证码输入框 -->
        <div class="input-group captcha-group">
          <i class="icon-shield">🛡️</i>
          <input 
            type="text" 
            v-model="captcha" 
            placeholder="请输入验证码" 
            class="input-field"
          />
          <!-- 验证码图片 -->
          <div v-if="captchaImage" class="captcha-wrapper">
            <img 
              :src="captchaImage" 
              alt="验证码" 
              class="captcha-image" 
              @click="refreshCaptchaImage"
              :title="'点击刷新验证码'"
            />
          </div>
          <button v-else type="button" class="captcha-loading-btn" @click="loadCaptchaIfNeeded" :disabled="loadingCaptcha">
            {{ loadingCaptcha ? '加载中...' : '点击加载验证码' }}
          </button>
        </div>

        <!-- 注册链接 -->
        <div class="register-link">
          <span @click="handleRegister" class="register-text">立即注册</span>
        </div>

        <!-- 错误提示 -->
        <div v-if="loginError" class="error-message">
          {{ loginError }}
        </div>

        <!-- 登录按钮 -->
        <button class="login-button" @click="handleLogin" :disabled="loginLoading">
          {{ loginLoading ? '登录中...' : '登录' }}
        </button>

        <!-- 一键登录按钮 (测试用) -->
        <button class="quick-login-button" @click="quickLogin" :disabled="quickLoginLoading">
          {{ quickLoginLoading ? '登录中...' : '一键登录(测试)' }}
        </button>
      </div>

      <!-- 注册表单 -->
      <div v-else class="form-container">
        <!-- 头像上传（圆形，可点击修改） -->
        <div class="avatar-upload-wrapper">
          <div v-if="avatarPreviewUrl" class="avatar-preview-circle">
            <img :src="avatarPreviewUrl" alt="头像" class="preview-image-circle" />
            <div class="avatar-overlay" @click="triggerAvatarInput">
              <span class="overlay-text">📷 修改</span>
            </div>
          </div>
          <div v-else class="avatar-placeholder" @click="triggerAvatarInput">
            <i class="placeholder-icon">📷</i>
            <p class="placeholder-text">点击上传头像</p>
          </div>
          <input 
            ref="avatarInput"
            id="avatar-upload"
            type="file" 
            accept="image/*"
            @change="handleAvatarChange"
            class="file-input"
          />
        </div>

        <!-- 手机号输入框 -->
        <div class="input-group">
          <i class="icon-phone">📱</i>
          <input 
            type="tel" 
            v-model="registerData.phone" 
            placeholder="请输入手机号" 
            class="input-field"
          />
        </div>

        <!-- 密码输入框 -->
        <div class="input-group">
          <i class="icon-lock">🔒</i>
          <input 
            :type="showRegisterPassword ? 'text' : 'password'" 
            v-model="registerData.password" 
            placeholder="请输入密码" 
            class="input-field"
          />
          <button 
            @click="toggleRegisterPasswordVisibility" 
            class="toggle-password"
            type="button"
          >
            {{ showRegisterPassword ? '👁️‍🗨️' : '👁️' }}
          </button> 
        </div>

        <!-- 重复密码输入框 -->
        <div class="input-group">
          <i class="icon-lock">🔒</i>
          <input 
            :type="showRegisterPassword ? 'text' : 'password'" 
            v-model="registerData.confirmPassword" 
            placeholder="请重复密码" 
            class="input-field"
          />
        </div>

        <!-- 昵称输入框 -->
        <div class="input-group">
          <i class="icon-user">👤</i>
          <input 
            type="text" 
            v-model="registerData.nickname" 
            placeholder="请输入昵称" 
            class="input-field"
          />
        </div>

        <!-- 错误提示 -->
        <div v-if="registerError" class="error-message">
          {{ registerError }}
        </div>

        <!-- 注册按钮 -->
        <div class="register-buttons">
          <button class="cancel-button" @click="cancelRegister">
            取消
          </button>
          <button class="submit-button" @click="submitRegister" :disabled="registerLoading">
            {{ registerLoading ? '提交中...' : '提交' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import api from '../api'
import { useAppStore } from '../stores/app'

const router = useRouter()
const appStore = useAppStore()

// 登录表单数据
const phone = ref('')
const password = ref('')
const captcha = ref('')
const captchaImage = ref('')
const showPassword = ref(false)
const showRegisterPassword = ref(false)
const isRegister = ref(false)
const time = ref('')
const loginLoading = ref(false)
const loginError = ref('')
const loadingCaptcha = ref(false)  // 验证码加载中状态
const quickLoginLoading = ref(false)  // 一键登录加载中状态

// 注册表单数据
const registerData = ref({
  phone: '',
  password: '',
  confirmPassword: '',
  nickname: ''
})
const registerLoading = ref(false)
const registerError = ref('')
const avatarFile = ref(null)  // 头像文件
const avatarFileName = ref('')  // 头像文件名
const tempAvatarUrl = ref('')  // 临时头像 URL（后端返回）
const avatarPreviewUrl = ref('')  // 头像预览 URL（完整路径）
const allTempAvatars = ref([])  // 所有临时头像 URL 数组
const selectedAvatarUrl = ref('')  // 最终选择的头像 URL

// 计算属性 - 空的，不再使用角色切换

// 刷新验证码图片
const refreshCaptcha = async (phoneNumber = '') => {
  const phoneToUse = phoneNumber || phone.value
  
  if (!phoneToUse.trim()) {
    loginError.value = '请先输入手机号'
    return
  }
  
  try {
    loadingCaptcha.value = true
    loginError.value = ''
    console.log('[\u5f00\u59cb\u52a0\u8f7d\u9a8c\u8bc1\u7801]', { phone: phoneToUse })
    
    const response = await api.user.getCaptcha(phoneToUse)
    
    console.log('[\u9a8c\u8bc1\u7801\u54cd\u5e94]', response)
    
    if (response.success) {
      // \u68c0\u67e5\u54cd\u5e94\u7ed3\u6784\uff0c\u4e0d\u540c\u7684\u540e\u7aef\u53ef\u80fd\u8fd4\u56de\u4e0d\u540c\u7684\u5b57\u6bb5
      const captchaImageData = response.captchaImage || response.data?.captchaImage
      
      if (captchaImageData) {
        captchaImage.value = captchaImageData
        captcha.value = ''
        console.log('[\u9a8c\u8bc1\u7801\u56fe\u7247\u52a0\u8f7d\u6210\u529f]')
      } else {
        loginError.value = '\u9a8c\u8bc1\u7801\u6570\u636e\u4e0d\u5408\u6cd5'
        console.error('[\u9a8c\u8bc1\u7801\u6570\u636e\u7ed3\u6784\u5f02\u5e38]', response)
      }
    } else {
      loginError.value = response.message || '\u83b7\u53d6\u9a8c\u8bc1\u7801\u5931\u8d25'
      console.error('[\u9a8c\u8bc1\u7801\u8bf7\u6c42\u5931\u8d25]', response.message)
    }
  } catch (error) {
    console.error('[\u9a8c\u8bc1\u7801\u52a0\u8f7d\u9519\u8bef]', error)
    loginError.value = '\u83b7\u53d6\u9a8c\u8bc1\u7801\u5931\u8d25\uff0c\u8bf7\u68c0\u67e5\u7f51\u7edc\u8fde\u63a5'
  } finally {
    loadingCaptcha.value = false
  }
}

// \u5237\u65b0\u9a8c\u8bc1\u7801\u56fe\u7247\uff08\u5305\u88f9refreshCaptcha\uff09
const refreshCaptchaImage = async () => {
  await refreshCaptcha()
}

// \u5982\u679c\u624b\u673a\u53f7\u6709\u6548\uff0c\u4f1a\u81ea\u52a8\u52a0\u8f7d\u9a8c\u8bc1\u7801\uff0c\u5426\u5219\u8981\u6c42\u7528\u6237\u6b21总\u70b9\u51fb\u52a0\u8f7d
const loadCaptchaIfNeeded = async () => {
  const phoneToUse = phone.value
  if (!phoneToUse.trim()) {
    loginError.value = '\u8bf7\u5148\u8f93\u5165\u624b\u673a\u53f7'
    return
  }
  const phoneReg = /^1[3-9]\d{9}$/
  if (!phoneReg.test(phoneToUse)) {
    loginError.value = '\u624b\u673a\u53f7\u683c\u5f0f\u4e0d\u6b63\u786e'
    return
  }
  await refreshCaptcha(phoneToUse)
}

// 手机号一样时改变时，随之也自动加载验证码
const onPhoneChange = () => {
  // 检查手机号是否有效
  const phoneReg = /^1[3-9]\d{9}$/
  if (phoneReg.test(phone.value)) {
    // 手机号有效，自动加载验证码
    refreshCaptcha()
  } else {
    // 手机号无效，清除验证码图片
    captchaImage.value = ''
  }
}

const validateLoginForm = () => {
  if (!phone.value.trim()) {
    loginError.value = '请输入手机号'
    return false
  }
  const phoneReg = /^1[3-9]\d{9}$/
  if (!phoneReg.test(phone.value)) {
    loginError.value = '手机号格式不正确'
    return false
  }
  if (!password.value) {
    loginError.value = '请输入密码'
    return false
  }
  if (!captcha.value) {
    loginError.value = '请输入验证码'
    return false
  }
  return true
}

const validateRegisterForm = () => {
  const { phone, password: pwd, confirmPassword, nickname } = registerData.value
  
  // 验证手机号
  if (!phone || !phone.trim()) {
    registerError.value = '请输入手机号'
    return false
  }
  const phoneReg = /^1[3-9]\d{9}$/
  if (!phoneReg.test(phone)) {
    registerError.value = '手机号格式不正确'
    return false
  }
  
  // 验证密码
  if (!pwd || !pwd.trim()) {
    registerError.value = '请输入密码'
    return false
  }
  if (pwd.length < 6) {
    registerError.value = '密码长度不能小于 6 位'
    return false
  }
  
  // 验证确认密码
  if (!confirmPassword || !confirmPassword.trim()) {
    registerError.value = '请确认密码'
    return false
  }
  if (pwd !== confirmPassword) {
    registerError.value = '两次输入的密码不一致'
    return false
  }
  
  // 验证昵称
  if (!nickname || !nickname.trim()) {
    registerError.value = '请输入昵称'
    return false
  }
  
  return true
}

// 处理登录
const handleLogin = async () => {
  loginError.value = ''
  
  // 表单验证
  if (!validateLoginForm()) {
    return
  }
  
  try {
    loginLoading.value = true
    
    // 调用登录API
    const response = await api.user.login(phone.value, password.value, captcha.value)
    
    console.log('[登录响应]', response)
    
    if (response.success) {
      // 保存用户信息和token到store
      appStore.setUser({
        ...response.user,
        token: response.token
      })
      
      // 记录登录成功
      console.log('登录成功', {
        user: response.user,
        token: response.token
      })
      
      // 跳转到首页
      router.push('/home')
    } else {
      // 处理错误响应（验证码错误、密码错误等）
      loginError.value = response.message || '登录失败'
      refreshCaptcha()  // 重新加载验证码
    }
  } catch (error) {
    console.error('登录错误:', error)
    loginError.value = error.message || '登录失败，请检查网络连接'
    refreshCaptcha()
  } finally {
    loginLoading.value = false
  }
}

// 一键登录
 const quickLogin = async () => {
  try {
    quickLoginLoading.value = true
    loginError.value = ''
    
    console.log('[\u4e00键登录\u5f00\u59cb]')
    
    // 调\u7528\u540e\u7aef\u7684\u4e00\u952e\u767b\u5f55\u63a5\u53e3
    const response = await fetch('http://localhost:8081/api/auth/quick-login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    })
    
    const data = await response.json()
    
    console.log('[\u4e00\u952e\u767b\u5f55\u54cd\u5e94]', data)
    
    if (data.success) {
      // \u4fdd\u5b58\u7528\u6237\u4fe1\u606f\u548ctoken\u5230store
      appStore.setUser({
        ...data.user,
        token: data.token
      })
      
      console.log('[\u4e00\u952e\u767b\u5f55\u6210\u529f]', {
        user: data.user,
        token: data.token
      })
      
      // \u8df3\u8f6c\u5230\u9996\u9875
      router.push('/home')
    } else {
      loginError.value = data.message || '\u4e00\u952e\u767b\u5f55\u5931\u8d25'
      console.error('[\u4e00\u952e\u767b\u5f55\u5931\u8d25]', data.message)
    }
  } catch (error) {
    console.error('[\u4e00\u952e\u767b\u5f55\u9519\u8bef]:', error)
    loginError.value = '\u4e00\u952e\u767b\u5f55\u5931\u8d25\uff0c\u8bf7\u68c0\u67e5\u7f51\u7edc\u8fde\u63a5'
  } finally {
    quickLoginLoading.value = false
  }
}

// \u5904\u7406\u6ce8\u518c
const handleRegister = () => {
  isRegister.value = true
  registerError.value = ''
}

// 取消注册
const cancelRegister = async () => {
  // 如果有临时头像，批量删除（包括选中的，因为是异常关闭）
  if (allTempAvatars.value.length > 0) {
    try {
      console.log('[异常关闭：批量删除所有临时头像]', allTempAvatars.value)
      await api.user.deleteTempAvatarBatch(allTempAvatars.value)
      console.log('[所有临时头像已删除]')
    } catch (error) {
      console.error('[删除临时头像失败]', error)
    }
  }
  
  isRegister.value = false
  registerError.value = ''
  registerData.value = {
    phone: '',
    password: '',
    confirmPassword: '',
    nickname: ''
  }
  avatarFile.value = null
  avatarFileName.value = ''
  tempAvatarUrl.value = ''
  avatarPreviewUrl.value = ''
  allTempAvatars.value = []
  selectedAvatarUrl.value = ''
}

const avatarInput = ref(null)  // 文件输入DOM

// 触发文件输入
const triggerAvatarInput = () => {
  avatarInput.value?.click()
}

// 处理头像上传
const handleAvatarChange = async (event) => {
  const file = event.target.files[0]
  if (!file) return
  
  // 验证文件类型
  if (!file.type.startsWith('image/')) {
    registerError.value = '请选择图片文件'
    return
  }
  // 验证文件大小（最大 2MB）
  if (file.size > 2 * 1024 * 1024) {
    registerError.value = '头像文件大小不能超过 2MB'
    return
  }
  
  avatarFile.value = file
  avatarFileName.value = file.name
  registerError.value = ''
  
  try {
    console.log('[开始上传临时头像]', file.name)
    
    // 立即上传到后端获取临时 URL
    const response = await api.user.uploadTempAvatar(file)
    const data = response.data || response
    
    if (data.success && data.avatarUrl) {
      const newTempUrl = data.avatarUrl
      
      // 添加到所有临时头像数组
      allTempAvatars.value.push(newTempUrl)
      
      // 设置当前选择的头像
      selectedAvatarUrl.value = newTempUrl
      tempAvatarUrl.value = newTempUrl
      avatarPreviewUrl.value = `http://localhost:8081${newTempUrl}`
      
      console.log('[临时头像上传成功]', {
        newTempUrl,
        allTempAvatars: allTempAvatars.value,
        selectedAvatarUrl: selectedAvatarUrl.value
      })
    } else {
      registerError.value = data.message || '头像上传失败'
    }
  } catch (error) {
    console.error('[头像上传错误]', error)
    registerError.value = '头像上传失败，请重试'
  }
}

// 提交注册
const submitRegister = async () => {
  console.log('[点击提交按钮]') // 调试日志
  registerError.value = ''
  
  console.log('[注册数据]', {
    phone: registerData.value.phone,
    password: registerData.value.password,
    confirmPassword: registerData.value.confirmPassword,
    nickname: registerData.value.nickname
  })
  
  // 表单验证
  if (!validateRegisterForm()) {
    console.log('[验证失败]', registerError.value)
    return
  }
  
  console.log('[验证成功]，开始发送请求')
  
  try {
    registerLoading.value = true
    
    // 创建 FormData 对象
    const formData = new FormData()
    formData.append('phone', registerData.value.phone)
    formData.append('password', registerData.value.password)
    formData.append('nickname', registerData.value.nickname)
    
    // 传递已上传的头像 URL（而不是文件）
    formData.append('avatarUrl', selectedAvatarUrl.value || '')
        
    console.log('[注册请求]', {
      phone: registerData.value.phone,
      nickname: registerData.value.nickname,
      avatarUrl: selectedAvatarUrl.value || '无',
      allTempAvatars: allTempAvatars.value
    })
    
    // 调用注册 API
    const response = await api.user.register(formData)
    
    console.log('[注册响应]', response)
    
    // 直接 axios 返回的是 response 对象，数据在 response.data 中
    const data = response.data || response
        
    if (data.success) {
      console.log('注册成功', data.user)
          
      // 批量删除未使用的临时头像（不包括选中的头像）
      const unusedAvatars = allTempAvatars.value.filter(url => url !== selectedAvatarUrl.value)
      if (unusedAvatars.length > 0) {
        try {
          console.log('[开始删除未使用的临时头像]', unusedAvatars)
          // 注意：不删除 selectedAvatarUrl，后端会将它重新命名为正式头像
          await api.user.deleteTempAvatarBatch(unusedAvatars)
          console.log('[未使用的临时头像删除成功]')
        } catch (error) {
          console.error('[删除临时头像失败]', error)
        }
      }
          
      // 清空所有临时数据
      allTempAvatars.value = []
      selectedAvatarUrl.value = ''
      tempAvatarUrl.value = ''
          
      alert('注册成功，请登录')
      cancelRegister()
    } else {
      registerError.value = data.message || '注册失败'
    }
  } catch (error) {
    console.error('注册错误:', error)
    registerError.value = error.message || '注册失败，请检查网络连接'
  } finally {
    registerLoading.value = false
  }
}

// 切换密码可见性
const togglePasswordVisibility = () => {
  showPassword.value = !showPassword.value
}

const toggleRegisterPasswordVisibility = () => {
  showRegisterPassword.value = !showRegisterPassword.value
}

// 定时器引用
let timeUpdateTimer = null

// 更新时间
const updateTime = () => {
  const now = new Date()
  const hours = now.getHours().toString().padStart(2, '0')
  const minutes = now.getMinutes().toString().padStart(2, '0')
  time.value = `${hours}:${minutes}`
}

// 组件挂载
onMounted(() => {
  // 不会在挂载时也调用获取验证码，因为手机号为空
  // 等用户输入手机号后再调用
  
  // 更新时间
  updateTime()
  timeUpdateTimer = setInterval(updateTime, 60000)
  
  // 监听页面关闭，删除临时头像
  window.addEventListener('beforeunload', handleBeforeUnload)
})

// 页面关闭前的处理
const handleBeforeUnload = () => {
  if (allTempAvatars.value.length > 0) {
    // 使用 keepalive 确保请求在页面关闭后继续
    // 异常关闭时删除所有临时头像（包括选中的）
    fetch('http://localhost:8081/api/user/avatar/temp-delete-batch', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        avatarUrls: allTempAvatars.value  // 删除所有，包括 selectedAvatarUrl
      }),
      keepalive: true
    })
  }
}

// 组件卸载
onUnmounted(() => {
  if (timeUpdateTimer) {
    clearInterval(timeUpdateTimer)
  }
  
  // 移除页面关闭监听
  window.removeEventListener('beforeunload', handleBeforeUnload)
  
  // 如果有临时头像，批量删除所有（包括选中的，因为是异常卡錀）
  if (allTempAvatars.value.length > 0) {
    api.user.deleteTempAvatarBatch(allTempAvatars.value).catch(err => {
      console.error('[卸载时批量删除临时头像失败]', err)
    })
  }
})
</script>

<style scoped>
.login-container {
  height: 100vh;
  background: linear-gradient(to bottom, #FAF8F0, #FFFFFF);
  display: flex;
  flex-direction: column;
  position: relative;
}

/* 系统状态栏 */
.system-bar {
  height: 32px;
  background: #66BB6A;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  color: black;
  font-size: 14px;
}

.status-icons {
  display: flex;
  gap: 4px;
}

.time {
  font-weight: 500;
}

/* 标题栏 */
.toolbar {
  height: 56px;
  background: linear-gradient(135deg, #66BB6A, #81C784);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  position: relative;
}

.back-button {
  position: absolute;
  left: 16px;
  background: none;
  border: none;
  font-size: 24px;
  color: white;
  cursor: pointer;
  padding: 8px;
}

.toolbar-title {
  color: white;
  font-size: 24px;
  font-weight: bold;
}

/* 内容区域 */
.content {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 16px;
  overflow-y: auto;
}

/* Logo 区域 */
.logo-container {
  margin-bottom: 24px;
  display: flex;
  justify-content: center;
  padding: 0;
}

.logo-circle {
  width: 400px;
  height: 400px;
  border-radius: 24px;
  background: linear-gradient(135deg, #E8F5E9, #C8E6C9);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  padding: 0;
}

.logo-image {
  width: 360px;
  height: 360px;
  object-fit: contain;
  border-radius: 16px;
  max-width: none;
  max-height: none;
}

/* 表单容器 */
.form-container {
  width: 100%;
  max-width: 400px;
}

/* 输入组 */
.input-group {
  position: relative;
  margin-bottom: 20px;
  background: white;
  border: 1px solid #E0E0E0;
  border-radius: 12px;
  display: flex;
  align-items: center;
  padding: 0 16px;
  height: 56px;
}

.icon-user, .icon-lock, .icon-shield {
  font-size: 20px;
  margin-right: 12px;
  color: #757575;
}

.input-field {
  flex: 1;
  border: none;
  outline: none;
  height: 100%;
  font-size: 16px;
  color: #212121;
  background: transparent;
}

.toggle-password {
  background: none;
  border: none;
  font-size: 20px;
  cursor: pointer;
  padding: 4px;
  margin-left: 8px;
  color: #757575;
}

.input-field::placeholder {
  color: #9E9E9E;
}

/* 验证码组 */
.captcha-group {
  display: flex;
  align-items: center;
}

.captcha-code {
  font-size: 18px;
  font-weight: bold;
  color: #F44336;
  padding: 8px 16px;
  background: #F5F5F5;
  border-radius: 8px;
  margin-left: 12px;
  min-width: 80px;
  text-align: center;
  cursor: pointer;
  user-select: none;
  transition: background-color 0.3s;
}

.captcha-code:hover {
  background: #E0E0E0;
}

/* 头像上传 */
.upload-group {
  position: relative;
}

.upload-label {
  flex: 1;
  padding: 12px;
  background: #F5F5F5;
  border-radius: 8px;
  cursor: pointer;
  transition: background-color 0.3s;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: #666;
}

.upload-label:hover {
  background: #E0E0E0;
}

.file-input {
  display: none;
}

/* 头像上传布局 */
.avatar-upload-wrapper {
  display: flex;
  justify-content: center;
  margin-bottom: 24px;
}

/* 头像预览圆形 */
.avatar-preview-circle {
  position: relative;
  width: 140px;
  height: 140px;
  border-radius: 50%;
  overflow: hidden;
  border: 4px solid #66BB6A;
  box-shadow: 0 4px 12px rgba(102, 187, 106, 0.3);
}

.preview-image-circle {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* 头像整上改改布 */
.avatar-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.3s;
}

.avatar-preview-circle:hover .avatar-overlay {
  opacity: 1;
}

.overlay-text {
  color: white;
  font-size: 16px;
  font-weight: bold;
}

/* 头像占位符 */
.avatar-placeholder {
  width: 140px;
  height: 140px;
  border-radius: 50%;
  background: #F5F5F5;
  border: 3px dashed #66BB6A;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s;
}

.avatar-placeholder:hover {
  background: #EFEFEF;
  border-color: #4CAF50;
}

.placeholder-icon {
  font-size: 48px;
  margin-bottom: 8px;
}

.placeholder-text {
  font-size: 12px;
  color: #666;
  margin: 0;
  text-align: center;
}

/* 验证码图片 */
.captcha-image {
  height: 40px;
  width: auto;
  border-radius: 4px;
  margin-left: 8px;
  cursor: pointer;
  transition: all 0.3s;
  user-select: none;
}

.captcha-image:hover {
  opacity: 0.7;
  transform: scale(1.02);
}

.captcha-image:active {
  transform: scale(0.98);
}

/* 验证码包裹 */
.captcha-wrapper {
  display: flex;
  align-items: center;
  gap: 8px;
  position: relative;
}

.captcha-tip {
  font-size: 12px;
  color: #999;
  white-space: nowrap;
  user-select: none;
}

/* 验证码加载按饁 */
.captcha-loading-btn {
  background: #66BB6A;
  color: white;
  border: none;
  padding: 10px 12px;
  border-radius: 4px;
  margin-left: 8px;
  cursor: pointer;
  font-size: 13px;
  transition: all 0.3s;
  white-space: nowrap;
}

.captcha-loading-btn:hover:not(:disabled) {
  background: #4CAF50;
  transform: translateY(-1px);
  box-shadow: 0 2px 6px rgba(102, 187, 106, 0.3);
}

.captcha-loading-btn:active:not(:disabled) {
  transform: translateY(0);
}

.captcha-loading-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* 验证码加载提示 */
.captcha-loading {
  height: 40px;
  width: 80px;
  margin-left: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #999;
  font-size: 12px;
  background: #F5F5F5;
  border-radius: 4px;
}

/* 错误提示样式 */
.error-message {
  color: #f44336;
  font-size: 14px;
  margin-bottom: 16px;
  padding: 8px 12px;
  background-color: #ffebee;
  border-radius: 4px;
  border-left: 3px solid #f44336;
}

/* 注册链接 */
.register-link {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 24px;
}

.register-text {
  color: #66BB6A;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
}

/* 角色切换 */
.role-tabs {
  display: flex;
  justify-content: space-around;
  margin-bottom: 8px;
  position: relative;
}

.role-tab {
  flex: 1;
  text-align: center;
  padding: 12px 0;
  font-size: 16px;
  color: #757575;
  cursor: pointer;
  transition: color 0.3s ease;
}

.role-tab.active {
  color: #66BB6A;
  font-weight: 500;
}

.role-indicator {
  position: absolute;
  bottom: 0;
  width: 33.33%;
  height: 3px;
  background: #66BB6A;
  border-radius: 2px;
}

/* 登录按钮 */
.login-button {
  width: 100%;
  height: 56px;
  background: #66BB6A;
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 18px;
  font-weight: bold;
  cursor: pointer;
  margin-top: 32px;
  transition: background 0.3s ease;
}

.login-button:hover:not(:disabled) {
  background: #4CAF50;
}

.login-button:active:not(:disabled) {
  background: #43A047;
}

.login-button:disabled {
  background: #BDBDBD;
  cursor: not-allowed;
  opacity: 0.6;
}

/* 一\u952e\u767b\u5f55\u6309钮 */
.quick-login-button {
  width: 100%;
  height: 48px;
  background: #FFA726;
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
  margin-top: 12px;
  transition: background 0.3s ease;
}

.quick-login-button:hover:not(:disabled) {
  background: #FF7043;
}

.quick-login-button:active:not(:disabled) {
  background: #E64A19;
}

.quick-login-button:disabled {
  background: #BDBDBD;
  cursor: not-allowed;
  opacity: 0.6;
}

/* 注\u518c\u6309钮\u6837\u5f0f */
.register-buttons {
  display: flex;
  gap: 16px;
  margin-top: 32px;
}

.cancel-button,
.submit-button {
  flex: 1;
  height: 56px;
  border: none;
  border-radius: 12px;
  font-size: 18px;
  font-weight: bold;
  cursor: pointer;
  transition: background 0.3s ease;
}

.cancel-button {
  background: #E0E0E0;
  color: #757575;
}

.cancel-button:hover {
  background: #BDBDBD;
}

.cancel-button:active {
  background: #9E9E9E;
}

.submit-button {
  background: #66BB6A;
  color: white;
}

.submit-button:hover:not(:disabled) {
  background: #4CAF50;
}

.submit-button:active:not(:disabled) {
  background: #43A047;
}

.submit-button:disabled {
  background: #BDBDBD;
  cursor: not-allowed;
  opacity: 0.6;
}

/* 响应式设计 */
@media (max-width: 480px) {
  .logo-circle {
    width: 300px;
    height: 300px;
  }
  
  .logo-image {
    width: 260px;
    height: 260px;
  }
  
  .toolbar-title {
    font-size: 20px;
  }
}
</style>