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
            {{ loadingCaptcha ? '加载中...' : '验证码' }}
          </button>
        </div>

        <!-- 注册链接 -->
        <div class="register-link">
          <div class="env-section">
            <div class="env-hint">
              💡 访问 http://8.141.102.201 切换生产环境
            </div>
            <button class="env-switch-btn" @click="toggleEnv" :title="'当前: ' + currentEnvDisplay">
              {{ currentEnvDisplay }}
            </button>
          </div>
          <span @click="handleRegister" class="register-text">立即注册</span>
        </div>

        <!-- 错误提示 -->
        <div v-if="loginError" class="error-message">
          {{ loginError }}
        </div>

        <!-- 一键登录按钮 (测试用) -->
        <button class="quick-login-button" @click="quickLogin" :disabled="quickLoginLoading">
          {{ quickLoginLoading ? '登录中...' : '一键登录(免输入)' }}
        </button>

        <!-- 登录按钮 -->
        <button class="login-button" @click="handleLogin" :disabled="loginLoading">
          {{ loginLoading ? '登录中...' : '登录' }}
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
            type="password"
            v-model="registerData.password" 
            placeholder="请输入密码" 
            class="input-field"
          />
        </div>

        <!-- 重复密码输入框 -->
        <div class="input-group">
          <i class="icon-lock">🔒</i>
          <input 
            type="password"
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

    <!-- 成功提示弹窗 (用于注册成功等) -->
    <div v-if="showSuccessModal" class="modal-overlay" @click="closeSuccessModal">
      <div class="confirm-modal" @click.stop>
        <div class="modal-content">
          <div class="modal-icon">🎉</div>
          <h3 class="modal-title">注册成功</h3>
          <p class="modal-text">恭喜您，账号注册成功！现在您可以返回登录页面，使用刚才注册的账号进行登录了。</p>
        </div>
        <div class="modal-footer">
          <button class="modal-btn confirm single" @click="closeSuccessModal">确定</button>
        </div>
      </div>
    </div>

    <!-- 确认提示弹窗 (用于环境切换等) -->
    <div v-if="showConfirmModal" class="modal-overlay" @click="closeConfirmModal">
      <div class="confirm-modal" @click.stop>
        <div class="modal-content">
          <div class="modal-icon">🌐</div>
          <h3 class="modal-title">切换环境</h3>
          <p class="modal-text">确定要切换到 {{ pendingEnvName }} 吗？应用将会刷新以应用新配置。</p>
        </div>
        <div class="modal-footer">
          <button class="modal-btn cancel" @click="closeConfirmModal">取消</button>
          <button class="modal-btn confirm" @click="confirmEnvSwitch">确定</button>
        </div>
      </div>
    </div>

    <!-- Toast 提示 -->
    <transition name="toast">
      <div v-if="showToast" class="toast-container" :class="`toast-${toastType}`">
        <span class="toast-message">{{ toastMessage }}</span>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import api from '../api'
import { useAppStore } from '../stores/app'
import { getEnvConfig, getCurrentEnv, setEnv } from '../config/env'

const router = useRouter()
const appStore = useAppStore()

// 登录表单数据
const phone = ref('')
const password = ref('')
const captcha = ref('')
const captchaImage = ref('')
const showPassword = ref(false)
const isRegister = ref(false)
const time = ref('')
const loginLoading = ref(false)
const loginError = ref('')
const loadingCaptcha = ref(false)  // 验证码加载中状态
const quickLoginLoading = ref(false)  // 一键登录加载中状态

// 弹窗相关状态
const showSuccessModal = ref(false)
const showConfirmModal = ref(false)
const pendingEnvName = ref('')
const pendingEnvValue = ref('')

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
const refreshCaptcha = async (phoneNumber = '', isAutoLoad = false) => {
  const phoneToUse = phoneNumber || phone.value
  
  console.log('[refreshCaptcha 被调用]', {
    phoneNumber,
    phoneToUse,
    isAutoLoad,
    phone: phone.value,
    timestamp: new Date().toISOString()
  })
  
  if (!phoneToUse.trim()) {
    console.log('[验证码] 手机号为空')
    if (!isAutoLoad) {  // 只有手动点击时才显示错误
      loginError.value = '请先输入手机号'
    }
    return
  }
  
  try {
    loadingCaptcha.value = true
    if (!isAutoLoad) {  // 只有手动点击时才清空错误
      loginError.value = ''
    }
    console.log('[开始加载验证码]', { phone: phoneToUse, isAutoLoad, timestamp: new Date().toISOString() })
    console.log('[调用 api.user.getCaptcha 之前]')
    
    // 添加 try-catch 来捕获任何可能的异常
    let response
    try {
      console.log('[即将调用 getCaptcha]', { phone: phoneToUse })
      response = await api.user.getCaptcha(phoneToUse)
      console.log('[getCaptcha 调用完成]', { hasResponse: !!response })
    } catch (apiError) {
      console.error('[getCaptcha 调用异常]', {
        message: apiError.message,
        name: apiError.name,
        code: apiError.code
      })
      throw apiError
    }
    
    console.log('[验证码响应]', response)
    
    if (response && response.success) {
      // ✅ axios 拦截器已经返回 data 对象，直接访问 response.captchaImage
      // 后端返回格式：{ success, message, captchaImage: "data:image/png;base64,...", expireTime: 300 }
      const captchaImageData = response.captchaImage
      
      console.log('[验证码数据]', {
        hasCaptchaImage: !!captchaImageData,
        captchaImageLength: captchaImageData?.length,
        expireTime: response.expireTime
      })
          
      if (captchaImageData) {
        // ✅ captchaImage 是 base64 格式，可以直接赋值给 img 的 src
        captchaImage.value = captchaImageData
        captcha.value = ''  // 清空之前输入的验证码
        console.log('[✅ 验证码图片加载成功]', {
          isAutoLoad,
          imageLength: captchaImageData.length,
          expireTime: response.expireTime,
          timestamp: new Date().toISOString()
        })
      } else {
        console.log('[❌ 验证码图片不存在]', response)
        if (!isAutoLoad) {
          loginError.value = '验证码数据不合法'
        }
      }
    } else {
      console.log('[❌ 验证码失败]', response?.message)
      if (!isAutoLoad) {
        loginError.value = response?.message || '获取验证码失败'
      } else {
        // 自动加载失败時，仅输出日志，不改变 loginError
        console.warn('[自动加载验证码失败]', response?.message || '未知错误')
      }
    }
  } catch (error) {
    console.error('[❌ 验证码输入未捕获的例外]', error)
    console.error('[例外详情]', {
      message: error.message,
      name: error.name,
      code: error.code,
      stack: error.stack,
      timestamp: new Date().toISOString()
    })
    if (!isAutoLoad) {
      loginError.value = '获取验证码失败，请检查网络连接'
    } else {
      // 自动加载失败，不显示错误提示，缓静输出日志
      console.warn('[自动加载验证码错误]', error.message)
    }
  } finally {
    loadingCaptcha.value = false
    console.log('[refreshCaptcha 完成]', { timestamp: new Date().toISOString() })
  }
}

// 刷新验证码图片（包裹refreshCaptcha）
const refreshCaptchaImage = async () => {
  await refreshCaptcha()
}

// 诊断网络连接状态
const diagnosisNetwork = async () => {
  const envConfig = getEnvConfig()
  const currentEnv = getCurrentEnv()
  
  console.log('\n========== 网络诊断 ==========')
  console.log('当前环境:', currentEnv)
  console.log('环境配置:', envConfig)
  console.log('USER_API:', envConfig.USER_API)
  console.log('localStorage APP_ENV:', localStorage.getItem('APP_ENV'))
  
  // 测试与后端的连接
  try {
    console.log('\n📡 测试 8081 连接...')
    const response = await fetch(`${envConfig.USER_API}/api/auth/captcha?phone=13800138000`, {
      method: 'GET'
    })
    console.log('响应状态:', response.status)
    console.log('响应头:', response.headers)
    const data = await response.json()
    console.log('响应数据:', data)
  } catch (error) {
    console.error('❌ 连接失败:', error.message)
  }
  
  console.log('========== 诊断结束 ==========\n')
}

// 如果手机号有效，会自动加载验证码，否则要求用户次总点击加载
const loadCaptchaIfNeeded = async () => {
  console.log('[👆 用户点击加载验证码按钮]', { timestamp: new Date().toISOString() })
  
  const phoneToUse = phone.value
  if (!phoneToUse.trim()) {
    loginError.value = '请先输入手机号'
    console.log('[❌ 手机号为空]')
    return
  }
  const phoneReg = /^1[3-9]\d{9}$/
  if (!phoneReg.test(phoneToUse)) {
    loginError.value = '手机号格式不正确'
    console.log('[❌ 手机号格式不正确]', phoneToUse)
    return
  }
  
  console.log('[✅ 准备调用 refreshCaptcha]', { phone: phoneToUse, timestamp: new Date().toISOString() })
  
  try {
    await refreshCaptcha(phoneToUse)
    console.log('[✅ refreshCaptcha 调用成功]', { timestamp: new Date().toISOString() })
  } catch (error) {
    console.error('[❌ refreshCaptcha 调用失败]', error)
  }
  
  console.log('[✅ loadCaptchaIfNeeded 执行完毕]', { timestamp: new Date().toISOString() })
}

// 手机号一样时改变时，随之也自动加载验证码
const onPhoneChange = (event) => {
  // 阻止任何默认行为
  if (event && event.preventDefault) {
    event.preventDefault()
  }
  if (event && event.stopPropagation) {
    event.stopPropagation()
  }
  
  console.log('[⚠️ onPhoneChange 被调用]', {
    timestamp: new Date().toISOString(),
    phoneValue: phone.value,
    event: event?.type
  })
  
  // 检查手机号是否有效
  const phoneReg = /^1[3-9]\d{9}$/
  console.log('[手机号变化]', {
    phone: phone.value,
    isValid: phoneReg.test(phone.value),
    length: phone.value.length
  })
  
  if (phoneReg.test(phone.value)) {
    // 手机号有效，自动加载验证码（传递 isAutoLoad = true）
    // 即使失败也不显示错误，只输出日志
    console.log('[触发自动加载验证码]', phone.value)
    refreshCaptcha(phone.value, true)  // ✅ 第二个参数: isAutoLoad = true
  } else {
    // 手机号无效，清除验证码图片
    console.log('[手机号无效，清除验证码]')
    captchaImage.value = ''
  }
  
  console.log('[\u2705 onPhoneChange \u6267\u884c\u5b8c\u6bd5]', { timestamp: new Date().toISOString() })
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
    
    // 📝 调用登录API
    // 请求格式：POST /api/auth/login
    // Content-Type: application/json
    // Body: { phone, password, captcha }
    const response = await api.user.login(phone.value, password.value, captcha.value)
    
    console.log('[登录请求]', {
      phone: phone.value,
      password: '***',
      captcha: captcha.value
    })
    console.log('[登录响应]', response)
    
    if (response.success) {
      // ✅ 保存用户信息和token到store
      appStore.setUser({
        ...response.user,
        token: response.token
      })
      
      // 记录登录成功
      console.log('✅ 登录成功', {
        userId: response.user?.id,
        tokenLength: response.token?.length
      })
      
      // 跳转到首页
      router.push('/home')
    } else {
      // 处理错误响应（验证码错误、密码错误等）
      loginError.value = response.message || '登录失败'
      console.warn('❌ 登录失败:', response.message)
      refreshCaptcha()  // 重新加载验证码
    }
  } catch (error) {
    console.error('❌ 登录错误:', error)
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
    const envConfig = getEnvConfig()
    const response = await fetch(`${envConfig.USER_API}/api/auth/quick-login`, {
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
  
  pendingEnvName.value = envName
  pendingEnvValue.value = nextEnv
  showConfirmModal.value = true
}

// 确认切换环境
const confirmEnvSwitch = () => {
  console.log(`[环境切换] -> ${pendingEnvValue.value}`)
  setEnv(pendingEnvValue.value)
  showConfirmModal.value = false
}

// 关闭确认弹窗
const closeConfirmModal = () => {
  showConfirmModal.value = false
}

// 关闭成功弹窗
const closeSuccessModal = () => {
  showSuccessModal.value = false
  cancelRegister() // 注册成功关闭弹窗后返回登录页
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
    
    console.log('[临时头像响应]', response)
    
    // ✅ 直接从 response.data 中取值（axios 拦截器已经返回 data 对象）
    if (response.success && response.data?.avatarUrl) {
      const newTempUrl = response.data.avatarUrl
      
      // 添加到所有临时头像数组
      allTempAvatars.value.push(newTempUrl)
      
      // 设置当前选择的头像
      selectedAvatarUrl.value = newTempUrl
      tempAvatarUrl.value = newTempUrl
      const envConfig = getEnvConfig()
      avatarPreviewUrl.value = `${envConfig.USER_API}${newTempUrl}`
      
      console.log('[临时头像上传成功]', {
        newTempUrl,
        allTempAvatars: allTempAvatars.value,
        selectedAvatarUrl: selectedAvatarUrl.value
      })
    } else {
      registerError.value = response.message || '头像上传失败'
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
    
    // ✅ 使用普通对象传递数据，而不是 FormData
    // ✅ API 层会将其转换为 URLSearchParams 和 application/x-www-form-urlencoded
    const registerPayload = {
      phone: registerData.value.phone,
      password: registerData.value.password,
      nickname: registerData.value.nickname
    }
    
    // 如果用户选择了头像，添加到请求
    if (selectedAvatarUrl.value) {
      registerPayload.avatarUrl = selectedAvatarUrl.value
    }
        
    console.log('[注册请求]', {
      phone: registerPayload.phone,
      nickname: registerPayload.nickname,
      avatarUrl: registerPayload.avatarUrl || '无',
      allTempAvatars: allTempAvatars.value
    })
    
    // 调用注册 API
    const response = await api.user.register(registerPayload)
    
    console.log('[注册响应]', response)
    
    // ✅ axios 拦截器已经返回 data 对象
    if (response.success) {
      console.log('注册成功', response.data?.user)
          
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
          
      // ✅ 注册成功显示自定义弹窗
      showSuccessModal.value = true
    } else {
      registerError.value = response.message || '注册失败'
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
  
  // 从 URL query 参数中读取手机号（用于修改密码或修改手机号后回填）
  const route = useRoute()
  if (route.query.phone) {
    phone.value = route.query.phone
    console.log('[登录页] 从 URL query 中回填手机号:', phone.value)
  }
  
  // 更新时间
  updateTime()
  timeUpdateTimer = setInterval(updateTime, 60000)
  
  // 监听页面关闭，删除临时头像
  window.addEventListener('beforeunload', handleBeforeUnload)
})

// 页面关闭前的处理
const handleBeforeUnload = () => {
  if (allTempAvatars.value.length > 0) {
    const envConfig = getEnvConfig()
    // 使用 keepalive 确保请求在页面关闭后继
    // 异常关闭时删除所有临时头像（包括 selectedAvatarUrl）
    fetch(`${envConfig.USER_API}/api/user/avatar/temp-delete-batch`, {
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

.icon-user, .icon-lock, .icon-shield, .icon-phone {
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

/* 环境切换按钮 */
.env-switch-btn {
  background: none;
  border: none;
  color: #999;
  font-size: 14px;
  cursor: pointer;
  padding: 0 12px 0 0;
  margin-right: 12px;
  transition: all 0.3s ease;
  border-right: 1px solid #ddd;
}

.env-switch-btn:hover {
  color: #66BB6A;
  transform: scale(1.05);
}

/* 环境区域 */
.env-section {
  display: flex;
  align-items: center;
  gap: 8px;
}

/* 环境提示文字 */
.env-hint {
  font-size: 12px;
  color: #999;
  line-height: 1.4;
  white-space: nowrap;
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
  margin-top: 12px;
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

/* 一键登录按钮 */
.quick-login-button {
  width: 100%;
  height: 56px;
  background: #FFA726;
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 18px;
  font-weight: bold;
  cursor: pointer;
  margin-top: 32px;
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
  color: #66BB6A;
}

.modal-btn.confirm.single {
  border-right: none;
}

.modal-btn:active {
  background: #f9f9f9;
}

/* Toast 提示样式 */
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

.toast-message {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

/* Toast 动画 */
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