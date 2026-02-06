<template>
  <div class="edit-post-page">
    <!-- 顶部导航 -->
    <div class="top-bar">
      <button class="back-btn" @click="goBack">← 返回</button>
      <h1 class="page-title">编辑帖子</h1>
      <div style="width: 44px;"></div>
    </div>

    <!-- 加载中 -->
    <div v-if="loading" class="loading-container">
      <div class="loading-spinner"></div>
      <p>加载中...</p>
    </div>

    <!-- 编辑表单 -->
    <div v-else class="edit-form-container">
      <!-- 帖子标题 -->
      <div class="form-group">
        <label class="form-label">
          📝 标题 *
          <span class="char-count">{{ formData.title.length }}/50</span>
        </label>
        <input 
          v-model="formData.title"
          type="text"
          placeholder="请输入帖子标题（50字以内）..."
          class="title-input"
          maxlength="50"
        >
      </div>

      <!-- 帖子内容 -->
      <div class="form-group">
        <label class="form-label">
          💬 内容 *
          <span class="char-count">{{ formData.content.length }}/400</span>
        </label>
        <textarea 
          v-model="formData.content"
          placeholder="分享你的经验、提出你的问题（400字以内）..."
          class="content-textarea"
          rows="10"
          maxlength="400"
        ></textarea>
      </div>

      <!-- 分类选择 -->
      <div class="form-group">
        <label class="form-label">🏷️ 分类 *</label>
        <div class="custom-select">
          <div class="select-btn" @click="categoryDropdownOpen = !categoryDropdownOpen">
            <span>{{ selectedCategoryName || '请选择分类' }}</span>
            <span class="dropdown-icon" :class="{ open: categoryDropdownOpen }">▼</span>
          </div>
          <div v-if="categoryDropdownOpen" class="select-dropdown">
            <div 
              v-for="category in categories" 
              :key="category.id"
              class="select-option"
              @click="selectCategory(category.id, category.name)"
            >
              {{ category.name }}
            </div>
          </div>
        </div>
      </div>

      <!-- 现有图片 -->
      <div class="form-group">
        <label class="form-label">
          🖼️ 现有图片（{{ existingImages.length }}/9）
        </label>
        <div v-if="existingImages.length > 0" class="existing-images">
          <div 
            v-for="(image, index) in existingImages"
            :key="`existing-${image.id}`"
            class="image-item"
          >
            <img 
              :src="getImageUrl(image.url)"
              :alt="`图片${index + 1}`"
              class="uploaded-image"
            >
            <button 
              class="remove-image-btn"
              @click="removeExistingImage(index, image.id)"
              type="button"
            >
              ×
            </button>
          </div>
        </div>
        <p v-else class="no-images-text">暂无图片</p>
      </div>

      <!-- 新增图片 -->
      <div class="form-group">
        <label class="form-label">
          🖼️ 新增图片（{{ tempImageUrls.length }}/{{ 9 - existingImages.length }}）
        </label>
        <div class="image-upload-area">
          <!-- 新增的临时图片 -->
          <div 
            v-for="(image, index) in tempImageUrls"
            :key="`temp-${index}`"
            class="image-item"
          >
            <img :src="getImageUrl(image)" :alt="`新图片${index + 1}`" class="uploaded-image">
            <button class="remove-image-btn" @click="removeNewImage(index)" type="button">×</button>
          </div>

          <!-- 上传按钮 -->
          <label 
            v-if="(existingImages.length + tempImageUrls.length) < 9" 
            class="upload-btn"
          >
            <input 
              type="file"
              accept="image/*"
              multiple
              @change="handleImageUpload"
              style="display: none;"
            >
            <span class="upload-icon">+</span>
            <span class="upload-text">添加图片</span>
          </label>
        </div>
      </div>

      <!-- 操作按钮 -->
      <div class="form-actions">
        <button class="cancel-btn" @click="goBack">取消</button>
        <button 
          class="submit-btn"
          :disabled="!canPublish || publishing"
          @click="handlePublish"
        >
          {{ publishing ? '发布中...' : '保存修改' }}
        </button>
      </div>
    </div>

    <!-- Toast提示 -->
    <transition name="toast">
      <div v-if="showToast" class="toast-container" :class="`toast-${toastType}`">
        <span class="toast-message">{{ toastMessage }}</span>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAppStore } from '../stores/app'
import api from '../api'
import { getEnvConfig } from '../config/env'

const route = useRoute()
const router = useRouter()
const appStore = useAppStore()

// 数据
const loading = ref(false)
const publishing = ref(false)
const postId = ref(null)

const formData = ref({
  title: '',
  content: '',
  categoryId: '',
  categoryName: ''
})

const categories = ref([])
const existingImages = ref([])  // 现有的图片（来自mediaList）
const tempImageUrls = ref([])   // 新增的临时图片（新上传）
const imagesToDelete = ref([])  // 待删除的图片ID列表

const categoryDropdownOpen = ref(false)
const selectedCategoryName = ref('')

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

// 是否可以发布
const canPublish = computed(() => {
  return formData.value.title.trim() !== '' &&
         formData.value.content.trim() !== '' &&
         formData.value.categoryId !== ''
})

// 构造完整的图片URL
const getImageUrl = (relativePath) => {
  if (!relativePath) return ''
  if (relativePath.startsWith('http')) return relativePath
  const envConfig = getEnvConfig()
  return `${envConfig.FORUM_API}${relativePath}`
}

// 加载分类
const loadCategories = async () => {
  try {
    const res = await api.forum.getCategories()
    if (res.success) {
      categories.value = res.data || []
    } else {
      console.error('加载分类失败:', res.message)
    }
  } catch (error) {
    console.error('加载分类失败:', error)
  }
}

// 加载帖子详情和现有图片
const loadPostDetail = async () => {
  loading.value = true
  try {
    postId.value = route.params.id
    const res = await api.forum.getPostDetail(postId.value)
    
    if (res.success) {
      const post = res.data.post
      const mediaList = res.data.mediaList || []
      
      // 填充表单
      formData.value = {
        title: post.title,
        content: post.content,
        categoryId: post.categoryId,
        categoryName: post.categoryName
      }
      
      selectedCategoryName.value = post.categoryName
      
      // 获取现有的图片（type=1为图片）
      existingImages.value = mediaList.filter(m => m.type === 1)
      
      console.log('[EditPostPage] 加载帖子成功:', {
        title: post.title,
        existingImagesCount: existingImages.value.length
      })
    } else {
      console.error('加载帖子失败:', res.message)
      displayToast('加载帖子失败，请重试', 'error')
      setTimeout(() => router.back(), 1500)
    }
  } catch (error) {
    console.error('加载帖子失败:', error)
    displayToast('加载失败，请重试', 'error')
    setTimeout(() => router.back(), 1500)
  } finally {
    loading.value = false
  }
}

// 选择分类
const selectCategory = (categoryId, categoryName) => {
  formData.value.categoryId = categoryId
  formData.value.categoryName = categoryName
  selectedCategoryName.value = categoryName
  categoryDropdownOpen.value = false
}

// 上传新图片
const handleImageUpload = async (event) => {
  const files = Array.from(event.target.files)
  const maxImages = 9 - existingImages.value.length - tempImageUrls.value.length
  
  // 检查数量
  if (tempImageUrls.value.length + files.length > maxImages) {
    displayToast(`最多只能再上传${maxImages}张图片`, 'info')
    return
  }
  
  // 检查大小
  for (const file of files) {
    if (file.size > 5 * 1024 * 1024) {
      displayToast(`图片 ${file.name} 超过5MB，请压缩后上传`, 'error')
      return
    }
  }
  
  // 上传临时图片
  try {
    console.log('[EditPostPage] 开始上传', files.length, '张图片')
    const res = await api.forum.uploadTempImages(files)
    
    if (res.success && res.data && Array.isArray(res.data)) {
      const urls = res.data.map(item => item.url)
      tempImageUrls.value.push(...urls)
      console.log('[EditPostPage] 上传成功，临时URL:', urls)
    } else {
      displayToast(res.message || '上传失败', 'error')
    }
  } catch (error) {
    console.error('[EditPostPage] 上传图片错误:', error)
    displayToast('上传失败，请重试', 'error')
  }
  
  event.target.value = ''
}

// 删除现有图片
const removeExistingImage = (index, mediaId) => {
  if (!confirm('确定要删除这张图片吗？')) return
  
  existingImages.value.splice(index, 1)
  imagesToDelete.value.push(mediaId)
  console.log('[EditPostPage] 标记删除图片:', mediaId)
}

// 删除新增图片
const removeNewImage = (index) => {
  const urlToDelete = tempImageUrls.value[index]
  tempImageUrls.value.splice(index, 1)
  console.log('[EditPostPage] 删除了新增图片:', urlToDelete)
}

// 发布修改
const handlePublish = async () => {
  // ============ 一：字段验证 ============
  
  // 标题验证
  if (!formData.value.title || formData.value.title.trim() === '') {
    displayToast('❌ 请输入帖子标题', 'error')
    return
  }
  if (formData.value.title.length > 50) {
    displayToast('❌ 标题不能超过50个字', 'error')
    return
  }
  
  // 内容验证
  if (!formData.value.content || formData.value.content.trim() === '') {
    displayToast('❌ 请输入帖子内容', 'error')
    return
  }
  if (formData.value.content.length < 10) {
    displayToast('❌ 内容至少需要有10个字', 'error')
    return
  }
  if (formData.value.content.length > 400) {
    displayToast('❌ 内容不能超过400个字', 'error')
    return
  }
  
  // 分类验证
  if (!formData.value.categoryId) {
    displayToast('❌ 请选择帖子分类', 'error')
    return
  }
  
  // 图片验证
  const totalImages = existingImages.value.length + tempImageUrls.value.length
  if (totalImages > 9) {
    displayToast('❌ 最多只能上传9张图片', 'error')
    return
  }
  
  // ============ 二：构造请求体 ============
  const postData = {
    title: formData.value.title.trim(),
    content: formData.value.content.trim(),
    categoryId: formData.value.categoryId,
    categoryName: formData.value.categoryName,
    // 所有图片URL（现有 + 新增）
    imageUrls: [
      ...existingImages.value.map(img => img.url),
      ...tempImageUrls.value
    ],
    // 待删除的图片ID
    deleteMediaIds: imagesToDelete.value
  }
  
  publishing.value = true
  
  try {
    // ============ 三：发送请求 ============
    const res = await api.forum.updatePost(postId.value, postData)
    
    if (res.success) {
      displayToast('✅ 编辑成功！', 'success')
      setTimeout(() => {
        router.replace(`/forum/post/${postId.value}`)
      }, 1500)
    } else {
      displayToast('❌ ' + (res.message || '编辑失败'), 'error')
    }
  } catch (error) {
    console.error('编辑失败:', error)
    displayToast('❌ 编辑失败，请重试', 'error')
  } finally {
    publishing.value = false
  }
}

// 返回
const goBack = () => {
  router.back()
}

// 页面加载
onMounted(() => {
  if (!appStore.token) {
    displayToast('请先登录', 'info')
    router.push('/login')
    return
  }
  
  loadCategories()
  loadPostDetail()
})
</script>

<style scoped>
.edit-post-page {
  min-height: 100vh;
  background: #f5f5f5;
  padding-bottom: 60px;
}

/* 顶部导航 */
.top-bar {
  position: sticky;
  top: 0;
  background: linear-gradient(135deg, #4caf50 0%, #66bb6a 100%);
  padding: 12px 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 2px 8px rgba(76, 175, 80, 0.3);
  z-index: 100;
}

.back-btn {
  background: rgba(255, 255, 255, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.3);
  color: white;
  font-size: 16px;
  cursor: pointer;
  padding: 8px 12px;
  border-radius: 8px;
  transition: all 0.3s;
}

.back-btn:hover {
  background: rgba(255, 255, 255, 0.3);
}

.page-title {
  font-size: 18px;
  font-weight: bold;
  margin: 0;
  color: white;
}

/* 加载状态 */
.loading-container {
  text-align: center;
  padding: 60px 20px;
  color: #666;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  margin: 0 auto 16px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #4caf50;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* 表单容器 */
.edit-form-container {
  background: white;
  margin: 12px;
  padding: 20px;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.form-group {
  margin-bottom: 20px;
}

.form-label {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 600;
  color: #333;
  margin-bottom: 10px;
  font-size: 15px;
}

.char-count {
  font-size: 12px;
  color: #999;
  font-weight: normal;
}

.title-input,
.content-textarea {
  width: 100%;
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-size: 14px;
  font-family: inherit;
  resize: vertical;
  box-sizing: border-box;
  transition: border-color 0.3s;
}

.title-input:focus,
.content-textarea:focus {
  outline: none;
  border-color: #4caf50;
  box-shadow: 0 0 0 3px rgba(76, 175, 80, 0.1);
}

.content-textarea {
  min-height: 120px;
  line-height: 1.6;
}

/* 自定义下拉菜单 */
.custom-select {
  position: relative;
}

.select-btn {
  width: 100%;
  padding: 12px;
  background: white;
  border: 1px solid #ddd;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 14px;
  transition: all 0.3s;
}

.select-btn:hover {
  border-color: #4caf50;
}

.select-btn:focus {
  border-color: #4caf50;
  box-shadow: 0 0 0 3px rgba(76, 175, 80, 0.1);
}

.dropdown-icon {
  display: inline-block;
  transition: transform 0.3s;
  color: #999;
}

.dropdown-icon.open {
  transform: rotate(180deg);
}

.select-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: white;
  border: 1px solid #ddd;
  border-top: none;
  border-radius: 0 0 8px 8px;
  max-height: 240px;
  overflow-y: auto;
  z-index: 1000;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.select-option {
  padding: 12px 16px;
  cursor: pointer;
  transition: background-color 0.2s;
  font-size: 14px;
}

.select-option:hover {
  background-color: #f5f5f5;
  color: #4caf50;
}

/* 图片显示 */
.existing-images,
.image-upload-area {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
  gap: 12px;
}

.image-item {
  position: relative;
  width: 100%;
  aspect-ratio: 1;
  border-radius: 8px;
  overflow: hidden;
  background: #f0f0f0;
}

.uploaded-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.remove-image-btn {
  position: absolute;
  top: -8px;
  right: -8px;
  width: 28px;
  height: 28px;
  background: #ff4444;
  color: white;
  border: none;
  border-radius: 50%;
  font-size: 18px;
  cursor: pointer;
  transition: all 0.3s;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
}

.remove-image-btn:hover {
  background: #cc0000;
  transform: scale(1.1);
}

.upload-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border: 2px dashed #ddd;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s;
  aspect-ratio: 1;
}

.upload-btn:hover {
  border-color: #4caf50;
  background: #f9f9f9;
}

.upload-icon {
  font-size: 28px;
  margin-bottom: 6px;
}

.upload-text {
  font-size: 12px;
  color: #999;
}

.no-images-text {
  color: #999;
  font-size: 13px;
  text-align: center;
  padding: 20px;
  margin: 0;
}

/* 操作按钮 */
.form-actions {
  display: flex;
  gap: 12px;
  margin-top: 30px;
  padding-top: 20px;
  border-top: 1px solid #eee;
}

.cancel-btn,
.submit-btn {
  flex: 1;
  padding: 14px 20px;
  border: none;
  border-radius: 8px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
}

.cancel-btn {
  background: #f5f5f5;
  color: #666;
}

.cancel-btn:hover {
  background: #eee;
}

.submit-btn {
  background: linear-gradient(135deg, #4caf50 0%, #66bb6a 100%);
  color: white;
  box-shadow: 0 4px 12px rgba(76, 175, 80, 0.3);
}

.submit-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(76, 175, 80, 0.4);
}

.submit-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
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
  z-index: 2000;
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

.toast-message {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

/* Toast动画 */
.toast-enter-active {
  animation: toast-in 0.3s ease-out;
}

.toast-leave-active {
  animation: toast-out 0.3s ease-in;
}

@keyframes toast-in {
  0% {
    opacity: 0;
    transform: translateX(-50%) translateY(-20px);
  }
  100% {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
}

@keyframes toast-out {
  0% {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
  100% {
    opacity: 0;
    transform: translateX(-50%) translateY(-20px);
  }
}
</style>
