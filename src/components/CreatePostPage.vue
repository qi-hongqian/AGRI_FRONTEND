<template>
  <div class="create-post-page">
    <!-- 顶部导航 -->
    <div class="top-bar">
      <button class="cancel-btn" @click="handleCancel">取消</button>
      <h1 class="page-title">✏️ 发布帖子</h1>
      <button 
        class="publish-btn" 
        :disabled="!canPublish"
        @click="handlePublish"
      >
        发布
      </button>
    </div>

    <!-- 表单内容 -->
    <div class="form-container">
    <!-- 选择分类 -->
      <div class="form-group">
        <label class="form-label">📂 选择分类 *</label>
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
              @click="selectCategory(category.id, category.name)">
              {{ category.name }}
            </div>
          </div>
        </div>
      </div>

      <!-- 帖子标题 -->
      <div class="form-group">
        <label class="form-label">
          📝 标题 * 
          <span class="char-count">{{ titleLength }}/50</span>
        </label>
        <input 
          v-model="formData.title"
          type="text"
          placeholder="输入帖子标题（必填）"
          class="title-input"
          maxlength="50"
        >
      </div>

      <!-- 帖子内容 -->
      <div class="form-group">
        <label class="form-label">
          💬 内容 * 
          <span class="char-count">{{ contentLength }}/400</span>
        </label>
        <textarea 
          v-model="formData.content"
          placeholder="分享你的经验、提出你的问题（400字以内）..."
          class="content-textarea"
          rows="10"
          maxlength="400"
        ></textarea>
      </div>

      <!-- 上传图片 -->
      <div class="form-group">
        <label class="form-label">🖼️ 图片（选填，最多9张）</label>
        <div class="image-upload-area">
          <!-- 已上传的图片 -->
          <div 
            v-for="(image, index) in uploadedImages" 
            :key="index"
            class="image-item"
          >
            <img :src="getImageUrl(image.url)" :alt="`图片${index + 1}`" class="uploaded-image">
            <button class="remove-image-btn" @click="removeImage(index)">×</button>
          </div>

          <!-- 上传按钮 -->
          <label v-if="uploadedImages.length < 9" class="upload-btn">
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

      <!-- 提示信息 -->
      <div class="tips-box">
        <h3 class="tips-title">📢 发帖须知</h3>
        <ul class="tips-list">
          <li>请选择合适的分类，方便其他用户查找</li>
          <li>标题要简洁明了，概括帖子主要内容</li>
          <li>内容要真实有用，禁止发布广告、违法信息</li>
          <li>上传的图片建议不超过5MB</li>
          <li>文明发言，互相尊重</li>
        </ul>
      </div>
    </div>

    <!-- Toast提示 -->
    <transition name="toast">
      <div v-if="showToast" class="toast-container" :class="`toast-${toastType}`">
        <span class="toast-message">{{ toastMessage }}</span>
      </div>
    </transition>

    <!-- 加载遮罩 -->
    <div v-if="publishing" class="publishing-overlay">
      <div class="publishing-box">
        <div class="loading-spinner"></div>
        <p>发布中...</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import api from '../api'
import { getEnvConfig } from '../config/env'

const router = useRouter()

// 表单数据
const formData = ref({
  title: '',
  content: '',
  categoryId: '',
  categoryName: ''
})

// 分类列表
const categories = ref([])

// 上传的临时图片（临时URL数组）
const tempImageUrls = ref([])

// 发布状态
const publishing = ref(false)

// 下拉框的打开状态
const categoryDropdownOpen = ref(false)

// 下一阶：选中分类名称
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

// 计算字符数
const titleLength = computed(() => formData.value.title.length)
const contentLength = computed(() => formData.value.content.length)

// UI为了兼容，使用计算属性需要uploadedImages
const uploadedImages = computed(() => 
  tempImageUrls.value.map(url => ({ url }))
)

// 是否可以发布
// 为了性能，只做简单检查，主要验证由handlePublish执行
const canPublish = computed(() => {
  return formData.value.title.trim() && 
         formData.value.content.trim() && 
         formData.value.categoryId &&
         !publishing.value
})

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

// 选择分类
const selectCategory = (categoryId, categoryName) => {
  formData.value.categoryId = categoryId
  formData.value.categoryName = categoryName
  selectedCategoryName.value = categoryName
  categoryDropdownOpen.value = false
  console.log('选中分类:', { categoryId, categoryName })
}

// 处理图片上传
// 流程一：选择图片后，上传临时图片
const handleImageUpload = async (event) => {
  const files = Array.from(event.target.files)
  
  // 检查数量限制
  if (tempImageUrls.value.length + files.length > 9) {
    displayToast('最多只能上传9张图片', 'info')
    return
  }
  
  // 检查文件大小
  for (const file of files) {
    if (file.size > 5 * 1024 * 1024) {
      displayToast(`图片 ${file.name} 超过5MB，请压缩后上传`, 'error')
      return
    }
  }
  
  // 批量上传临时图片到后端
  try {
    console.log('[CreatePostPage] 开始上传', files.length, '张图片')
    const res = await api.forum.uploadTempImages(files)
    
    console.log('[CreatePostPage] 上传响应:', res)
    
    if (res.success && res.data && Array.isArray(res.data)) {
      // 临时图片URL: /api/forum-media/temp_forum_1734512345678_abc123.jpg
      // 春示时的完URL: http://localhost:8083/api/forum-media/temp_forum_xxx.jpg
      const urls = res.data.map(item => item.url)
      tempImageUrls.value.push(...urls)
      console.log('[CreatePostPage] 上传成功，临时URL:', urls)
    } else {
      displayToast(res.message || '上传失败', 'error')
    }
  } catch (error) {
    console.error('[CreatePostPage] 上传图片错误:', error)
    displayToast('上传失败，请重试', 'error')
  }
  
  // 清空input
  event.target.value = ''
}

// 流程二：删除不需要的临时图片
const removeImage = (index) => {
  const urlToDelete = tempImageUrls.value[index]
  
  // 不从后端削除，只从前端清除（匚丢维护由后端）
  tempImageUrls.value.splice(index, 1)
  console.log('[CreatePostPage] 削除了图片:', urlToDelete)
}

// 构造完整的图片URL
// 上传返回：/api/forum-media/temp_forum_xxx.jpg
// 最终春示：http://localhost:8083/api/forum-media/temp_forum_xxx.jpg
const getImageUrl = (relativePath) => {
  if (!relativePath) return ''
  
  // 如果已经是完整URL，直接返回
  if (relativePath.startsWith('http')) {
    return relativePath
  }
  
  // 构造完整URL
  const envConfig = getEnvConfig()
  return `${envConfig.FORUM_API}${relativePath}`
}
const handlePublish = async () => {
  // ============ 一：丛事字段验证 ============
  
  // 1. 标题验证
  if (!formData.value.title || formData.value.title.trim() === '') {
    displayToast('❌ 请输入帖子标题', 'error')
    return
  }
  
  if (formData.value.title.length > 50) {
    displayToast('❌ 标题不能超过50个字', 'error')
    return
  }
  
  // 2. 内容验证
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
  
  // 3. 分类验证
  if (!formData.value.categoryId) {
    displayToast('❌ 请选择帖子分类', 'error')
    return
  }
  
  // 4. 图片验证（可选）
  if (tempImageUrls.value.length > 9) {
    displayToast('❌ 最多只能上传9张图片', 'error')
    return
  }
  
  // ============ 二：构造请求体 ============
  const postData = {
    title: formData.value.title.trim(),
    content: formData.value.content.trim(),
    categoryId: formData.value.categoryId,
    categoryName: formData.value.categoryName,
    imageUrls: tempImageUrls.value  // 传入临时图片URL数组
  }
  
  console.log('[CreatePostPage] 发布帖子数据:', postData)
  
  publishing.value = true
  
  try {
    // ============ 三：发送请求 ============
    const res = await api.forum.createPost(postData)
    
    if (res.success) {
      displayToast('✅ 发布成功！', 'success')
      // 跳转到帖子详情
      const postId = res.data.id
      console.log('[CreatePostPage] 发布成功，postId:', postId, '准备跳转到详情页')
      setTimeout(() => {
        router.replace({
          name: 'PostDetail',
          params: { id: postId }
        })
      }, 1500)
    } else {
      console.error('[CreatePostPage] 发布失败:', res)
      displayToast('❌ ' + (res.message || '发布失败'), 'error')
    }
  } catch (error) {
    console.error('发布失败:', error)
    displayToast('发布失败，请重试', 'error')
  } finally {
    publishing.value = false
  }
}

// 取消发布
const handleCancel = () => {
  if (formData.value.title || formData.value.content || tempImageUrls.value.length > 0) {
    if (confirm('确定要放弃编辑吗？')) {
      router.back()
    }
  } else {
    router.back()
  }
}

// 页面加载
onMounted(() => {
  loadCategories()
})
</script>

<style scoped>
.create-post-page {
  min-height: 100vh;
  background: #f5f5f5;
  padding-bottom: 20px;
}

/* 顶部导航 */
.top-bar {
  position: sticky;
  top: 0;
  background: white;
  padding: 12px 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  z-index: 100;
}

.cancel-btn {
  background: none;
  border: none;
  color: #666;
  font-size: 15px;
  cursor: pointer;
  padding: 8px 12px;
}

.page-title {
  font-size: 18px;
  font-weight: bold;
  margin: 0;
  color: #333;
}

.publish-btn {
  padding: 8px 20px;
  background: #4caf50;
  color: white;
  border: none;
  border-radius: 20px;
  font-size: 14px;
  cursor: pointer;
  transition: background 0.3s;
}

.publish-btn:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.publish-btn:not(:disabled):hover {
  background: #45a049;
}

/* 表单容器 */
.form-container {
  padding: 16px;
}

.form-group {
  background: white;
  padding: 16px;
  border-radius: 12px;
  margin-bottom: 16px;
}

.form-label {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 15px;
  font-weight: 600;
  color: #333;
  margin-bottom: 12px;
}

.char-count {
  font-size: 12px;
  color: #999;
  font-weight: normal;
}

/* 自定义下拉框 */
.custom-select {
  position: relative;
  width: 100%;
}

.select-btn {
  width: 100%;
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-size: 15px;
  cursor: pointer;
  background: white;
  display: flex;
  justify-content: space-between;
  align-items: center;
  transition: border-color 0.3s;
}

.select-btn:hover {
  border-color: #4caf50;
}

.dropdown-icon {
  display: inline-block;
  font-size: 12px;
  transition: transform 0.3s;
}

.dropdown-icon.open {
  transform: rotate(180deg);
}

.select-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  margin-top: 4px;
  background: white;
  border: 1px solid #ddd;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 1000;
  max-height: 240px;
  overflow-y: auto;
}

.select-option {
  padding: 12px 16px;
  cursor: pointer;
  transition: background-color 0.2s;
  border-bottom: 1px solid #f0f0f0;
}

.select-option:last-child {
  border-bottom: none;
}

.select-option:hover {
  background-color: #f5f5f5;
}

.select-option:active {
  background-color: #efefef;
}

/* 有旧的分类选择 */
.category-select {
  display: none;
}

/* 标题输入 */
.title-input {
  width: 100%;
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-size: 15px;
  transition: border-color 0.3s;
}

.title-input:focus {
  outline: none;
  border-color: #4caf50;
}

/* 内容输入 */
.content-textarea {
  width: 100%;
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 8px;
  font-size: 14px;
  line-height: 1.6;
  resize: vertical;
  font-family: inherit;
  transition: border-color 0.3s;
}

.content-textarea:focus {
  outline: none;
  border-color: #4caf50;
}

/* 图片上传区域 */
.image-upload-area {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.image-item {
  position: relative;
  aspect-ratio: 1;
  border-radius: 8px;
  overflow: hidden;
}

.uploaded-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.remove-image-btn {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 24px;
  height: 24px;
  background: rgba(0, 0, 0, 0.6);
  color: white;
  border: none;
  border-radius: 50%;
  cursor: pointer;
  font-size: 18px;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.upload-btn {
  aspect-ratio: 1;
  border: 2px dashed #ddd;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s;
  background: #f9f9f9;
}

.upload-btn:hover {
  border-color: #4caf50;
  background: #f0f8f0;
}

.upload-icon {
  font-size: 32px;
  color: #4caf50;
  margin-bottom: 4px;
}

.upload-text {
  font-size: 12px;
  color: #666;
}

/* 提示框 */
.tips-box {
  background: linear-gradient(135deg, #fff9e6 0%, #fff3cd 100%);
  padding: 16px;
  border-radius: 12px;
  border-left: 4px solid #ffc107;
}

.tips-title {
  font-size: 15px;
  font-weight: 600;
  color: #333;
  margin: 0 0 12px 0;
}

.tips-list {
  margin: 0;
  padding-left: 20px;
  font-size: 13px;
  color: #666;
  line-height: 1.8;
}

.tips-list li {
  margin-bottom: 4px;
}

/* 发布遮罩 */
.publishing-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.publishing-box {
  background: white;
  padding: 32px;
  border-radius: 16px;
  text-align: center;
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

/* 响应式 */
@media (max-width: 768px) {
  .page-title {
    font-size: 16px;
  }
}
</style>
