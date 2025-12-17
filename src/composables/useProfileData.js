import { ref, computed, onMounted } from 'vue'
import api from '../api'
import { useAppStore } from '../stores/app'

// 个人信息数据组合式函数
export function useProfileData() {
  const appStore = useAppStore()
  
  // 状态管理
  const userProfile = ref(null)
  const userStats = ref({
    points: 0,
    quizScores: [],
    postCount: 0,
    commentCount: 0
  })
  const loading = ref(false)
  const error = ref(null)
  const isEditing = ref(false)
  
  // 编辑表单
  const editForm = ref({
    nickname: '',
    realName: '',
    gender: null,
    region: '',
    profession: '',
    introduction: ''
  })
  
  // 头像上传
  const uploadingAvatar = ref(false)
  
  // 计算属性
  const isAuthenticated = computed(() => appStore.isAuthenticated)
  const userId = computed(() => appStore.user?.id)
  
  const profileCompletePercentage = computed(() => {
    if (!userProfile.value) return 0
    
    const fields = ['nickname', 'realName', 'gender', 'region', 'profession', 'introduction']
    const completedFields = fields.filter(field => {
      const value = userProfile.value[field]
      return value !== null && value !== undefined && value !== ''
    })
    
    return Math.round((completedFields.length / fields.length) * 100)
  })
  
  // 获取用户资料
  const fetchUserProfile = async () => {
    if (!userId.value) return
    
    try {
      loading.value = true
      
      const response = await api.user.getProfile(userId.value)
      
      if (response.success) {
        const profile = response.data
        
        // 合并用户基础信息和详细资料
        userProfile.value = {
          id: profile.id,
          phone: profile.phone,
          nickname: profile.nickname,
          avatar: profile.avatar,
          role: profile.role,
          status: profile.status,
          lastLoginTime: formatTime(profile.last_login_time),
          createTime: formatTime(profile.create_time),
          // 详细资料
          realName: profile.real_name,
          gender: profile.gender,
          region: profile.region,
          profession: profile.profession,
          introduction: profile.introduction
        }
        
        // 初始化编辑表单
        editForm.value = {
          nickname: profile.nickname || '',
          realName: profile.real_name || '',
          gender: profile.gender,
          region: profile.region || '',
          profession: profile.profession || '',
          introduction: profile.introduction || ''
        }
        
        // 记录用户行为
        appStore.recordUserAction({
          action: 'profile_viewed',
          module: 'profile',
          data: { userId: userId.value }
        })
      }
    } catch (err) {
      error.value = err.message
      console.error('获取用户资料失败:', err)
      
      // 降级方案 - 使用默认数据
      userProfile.value = getDefaultUserProfile()
    } finally {
      loading.value = false
    }
  }
  
  // 更新用户资料
  const updateUserProfile = async (profileData) => {
    try {
      loading.value = true
      
      const response = await api.user.updateProfile({
        userId: userId.value,
        ...profileData
      })
      
      if (response.success) {
        // 更新本地数据
        Object.assign(userProfile.value, profileData)
        
        // 更新全局用户状态
        if (appStore.user) {
          appStore.user.nickname = profileData.nickname
        }
        
        // 记录用户行为
        appStore.recordUserAction({
          action: 'profile_updated',
          module: 'profile',
          data: { userId: userId.value, fields: Object.keys(profileData) }
        })
        
        return { success: true, message: '资料更新成功' }
      }
    } catch (err) {
      console.error('更新用户资料失败:', err)
      return { success: false, error: err.message }
    } finally {
      loading.value = false
    }
  }
  
  // 上传头像
  const uploadAvatar = async (file) => {
    if (!file) return { success: false, error: '请选择图片文件' }
    
    try {
      uploadingAvatar.value = true
      
      // 这里应该调用文件上传服务
      // 暂时模拟上传过程
      const formData = new FormData()
      formData.append('avatar', file)
      formData.append('userId', userId.value)
      
      // 模拟上传API调用
      const response = await simulateAvatarUpload(formData)
      
      if (response.success) {
        const avatarUrl = response.data.avatarUrl
        
        // 更新用户头像
        userProfile.value.avatar = avatarUrl
        
        // 更新全局用户状态
        if (appStore.user) {
          appStore.user.avatar = avatarUrl
        }
        
        // 记录用户行为
        appStore.recordUserAction({
          action: 'avatar_updated',
          module: 'profile',
          data: { userId: userId.value }
        })
        
        return { success: true, message: '头像上传成功', avatarUrl }
      }
    } catch (err) {
      console.error('上传头像失败:', err)
      return { success: false, error: err.message }
    } finally {
      uploadingAvatar.value = false
    }
  }
  
  // 模拟头像上传
  const simulateAvatarUpload = async (formData) => {
    return new Promise((resolve) => {
      setTimeout(() => {
        // 模拟上传成功，返回头像URL
        const avatarUrl = `https://via.placeholder.com/200/${getRandomColor()}/ffffff?text=${userProfile.value?.nickname?.charAt(0) || 'U'}`
        resolve({
          success: true,
          data: { avatarUrl }
        })
      }, 1500)
    })
  }
  
  // 获取用户统计数据
  const fetchUserStats = async () => {
    if (!userId.value) return
    
    try {
      // 并行获取各种统计数据
      const [pointsResponse, quizResponse, postResponse, commentResponse] = await Promise.all([
        api.answer.getUserPoints(userId.value),
        // 这里可以调用其他API获取统计数据
        Promise.resolve({ success: true, data: { list: [] } }), // 模拟数据
        Promise.resolve({ success: true, data: { count: 0 } }), // 模拟数据
        Promise.resolve({ success: true, data: { count: 0 } })  // 模拟数据
      ])
      
      // 更新统计数据
      userStats.value = {
        points: pointsResponse.success ? pointsResponse.data.total_point || 0 : 0,
        quizScores: quizResponse.success ? quizResponse.data.list || [] : [],
        postCount: postResponse.success ? postResponse.data.count || 0 : 0,
        commentCount: commentResponse.success ? commentResponse.data.count || 0 : 0
      }
      
      // 更新全局积分状态
      appStore.setCartItemCount(userStats.value.points) // 复用购物车数量显示积分
    } catch (err) {
      console.error('获取用户统计数据失败:', err)
      
      // 降级方案 - 使用默认数据
      userStats.value = getDefaultUserStats()
    }
  }
  
  // 保存编辑的资料
  const saveEditProfile = async () => {
    const hasChanges = Object.keys(editForm.value).some(key => {
      return editForm.value[key] !== userProfile.value[key]
    })
    
    if (!hasChanges) {
      isEditing.value = false
      return { success: true, message: '资料未修改' }
    }
    
    const result = await updateUserProfile(editForm.value)
    
    if (result.success) {
      isEditing.value = false
    }
    
    return result
  }
  
  // 取消编辑
  const cancelEdit = () => {
    // 恢复原始数据
    editForm.value = {
      nickname: userProfile.value.nickname || '',
      realName: userProfile.value.realName || '',
      gender: userProfile.value.gender,
      region: userProfile.value.region || '',
      profession: userProfile.value.profession || '',
      introduction: userProfile.value.introduction || ''
    }
    isEditing.value = false
  }
  
  // 工具函数
  const formatTime = (timeString) => {
    if (!timeString) return '未知'
    
    const date = new Date(timeString)
    return date.toLocaleDateString('zh-CN')
  }
  
  const getRandomColor = () => {
    const colors = ['4CAF50', '2196F3', 'FF9800', '9C27B0', '00BCD4', '795548', '607D8B']
    return colors[Math.floor(Math.random() * colors.length)]
  }
  
  const getDefaultUserProfile = () => ({
    id: appStore.user?.id || 1,
    phone: appStore.user?.phone || '138****8888',
    nickname: '农业达人',
    avatar: 'https://via.placeholder.com/200/4CAF50/ffffff?text=农',
    role: 'user',
    status: 1,
    lastLoginTime: '刚刚',
    createTime: '2024-01-01',
    realName: '',
    gender: null,
    region: '',
    profession: '',
    introduction: ''
  })
  
  const getDefaultUserStats = () => ({
    points: 1280,
    quizScores: [
      { score: 85, date: '2024-01-15' },
      { score: 92, date: '2024-01-14' },
      { score: 78, date: '2024-01-13' }
    ],
    postCount: 12,
    commentCount: 35
  })
  
  // 初始化数据
  const initializeProfileData = async () => {
    if (!isAuthenticated.value) return
    
    loading.value = true
    try {
      await Promise.all([
        fetchUserProfile(),
        fetchUserStats()
      ])
    } catch (err) {
      error.value = err.message
    } finally {
      loading.value = false
    }
  }
  
  // 处理文件选择
  const handleAvatarSelect = (event) => {
    const file = event.target.files[0]
    if (!file) return
    
    // 验证文件类型
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif']
    if (!allowedTypes.includes(file.type)) {
      alert('请选择 JPG、PNG 或 GIF 格式的图片')
      return
    }
    
    // 验证文件大小（最大2MB）
    const maxSize = 2 * 1024 * 1024
    if (file.size > maxSize) {
      alert('图片大小不能超过2MB')
      return
    }
    
    uploadAvatar(file)
  }
  
  return {
    // 状态
    userProfile,
    userStats,
    loading,
    error,
    isEditing,
    editForm,
    uploadingAvatar,
    
    // 计算属性
    isAuthenticated,
    userId,
    profileCompletePercentage,
    
    // 方法
    fetchUserProfile,
    updateUserProfile,
    uploadAvatar,
    fetchUserStats,
    saveEditProfile,
    cancelEdit,
    handleAvatarSelect,
    initializeProfileData
  }
}