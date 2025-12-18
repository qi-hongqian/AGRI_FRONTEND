<template>
  <div class="user-info-container">
    <!-- 顶部进度条和标题 -->
    <div class="header-section">
      <button class="back-button" @click="goBack">
        <span>‹</span> 返回
      </button>
      <h1 class="page-title">完善个人信息</h1>
      <div class="progress-bar">
        <div class="progress-fill" :style="{ width: progressPercentage + '%' }"></div>
      </div>
      <p class="progress-text">完整度：{{ progressPercentage }}%</p>
    </div>

    <!-- 表单区域 -->
    <form @submit.prevent="submitForm" class="form-container">
      <!-- 真实姓名 -->
      <div class="form-group">
        <label class="form-label">真实姓名 <span class="optional">(可选)</span></label>
        <input
          v-model="formData.realName"
          type="text"
          placeholder="请输入您的真实姓名"
          maxlength="20"
          class="form-input"
        />
        <span class="char-count">{{ formData.realName.length }}/20</span>
      </div>

      <!-- 性别 -->
      <div class="form-group">
        <label class="form-label">性别 <span class="optional">(可选)</span></label>
        <div class="gender-options">
          <label v-for="option in genderOptions" :key="option.value" class="gender-radio">
            <input
              type="radio"
              :value="option.value"
              v-model.number="formData.gender"
              class="radio-input"
            />
            <span class="radio-label">{{ option.label }}</span>
          </label>
        </div>
      </div>

      <!-- 职业 -->
      <div class="form-group">
        <label class="form-label">职业 <span class="optional">(可选)</span></label>
        <input
          v-model="formData.profession"
          type="text"
          placeholder="例如：种植户、农技员等"
          maxlength="20"
          class="form-input"
        />
        <span class="char-count">{{ formData.profession.length }}/20</span>
      </div>

      <!-- 地区选择 -->
      <div class="form-group">
        <label class="form-label">地区 <span class="optional">(可选)</span></label>
        <div class="region-select-group">
          <!-- \u7701\u4efd -->
          <div class="region-select">
            <select
              v-model="selectedProvince"
              @change="() => handleProvinceChange(selectedProvince)"
              class="form-select"
            >
              <option value="">选择省份</option>
              <option v-for="prov in provinces" :key="prov.provinceId" :value="prov.provinceId">
                {{ prov.provinceName }}
              </option>
            </select>
          </div>

          <!-- \u57ce\u5e02 -->
          <div class="region-select">
            <select
              v-model="selectedCity"
              @change="() => handleCityChange(selectedCity)"
              class="form-select"
              :disabled="!selectedProvince"
            >
              <option value="">选择城市</option>
              <option v-for="city in cities" :key="city.cityId" :value="city.cityId">
                {{ city.cityName }}
              </option>
            </select>
          </div>

          <!-- 区县 -->
          <div class="region-select">
            <select
              v-model="selectedDistrict"
              class="form-select"
              :disabled="!selectedCity"
            >
              <option value="">选择区县</option>
              <option v-for="dist in districts" :key="dist.districtId" :value="dist.districtId">
                {{ dist.districtName }}
              </option>
            </select>
          </div>
        </div>
      </div>

      <!-- 个人简介 -->
      <div class="form-group">
        <label class="form-label">个人简介 <span class="optional">(可选)</span></label>
        <textarea
          v-model="formData.introduction"
          placeholder="简要介绍自己，例如：种植经验、特长等"
          maxlength="200"
          rows="5"
          class="form-textarea"
        ></textarea>
        <span class="char-count">{{ formData.introduction.length }}/200</span>
      </div>

      <!-- 提示信息 -->
      <div v-if="errorMessage" class="error-message">
        <span class="error-icon">⚠️</span>
        <span>{{ errorMessage }}</span>
      </div>

      <div v-if="successMessage" class="success-message">
        <span class="success-icon">✓</span>
        <span>{{ successMessage }}</span>
      </div>

      <!-- 按钮组 -->
      <div class="button-group">
        <button type="button" class="btn-secondary" @click="skipFill">
          暂时跳过
        </button>
        <button type="submit" class="btn-primary" :disabled="isSubmitting">
          <span v-if="!isSubmitting">保存信息</span>
          <span v-else>保存中...</span>
        </button>
      </div>
    </form>

    <!-- 底部提示 -->
    <div class="footer-tip">
      <p>💡 完善个人信息能帮助我们更好地为您推荐相关内容</p>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAppStore } from '../stores/app'
import api from '../api/index.js'

const router = useRouter()
const appStore = useAppStore()

// 表单数据
const formData = ref({
  realName: '',
  gender: null,
  profession: '',
  region: '',
  introduction: ''
})

// 地区数据
const provinces = ref([])
const cities = ref([])
const districts = ref([])

// 选中的地区ID
const selectedProvince = ref('')
const selectedCity = ref('')
const selectedDistrict = ref('')

// 性别选项
const genderOptions = ref([
  { value: 1, label: '男' },
  { value: 2, label: '女' }
])

// 状态
const isSubmitting = ref(false)
const errorMessage = ref('')
const successMessage = ref('')
const isLoading = ref(true)

// 计算完整度百分比
const progressPercentage = computed(() => {
  let count = 0
  const total = 5

  if (formData.value.realName) count++
  if (formData.value.gender) count++
  if (formData.value.profession) count++
  if (selectedProvince.value && selectedCity.value && selectedDistrict.value) count++
  if (formData.value.introduction) count++

  return Math.round((count / total) * 100)
})

// 页面加载
onMounted(async () => {
  try {
    isLoading.value = true
    
    // 使用编辑接口一次性加载所有需要的数据
    const editRes = await api.user.getEditUserInfo()
    if (editRes.success && editRes.data) {
      const data = editRes.data
      
      // 加载性别选项
      if (data.genderOptions && data.genderOptions.length > 0) {
        genderOptions.value = data.genderOptions
      }
      
      // 加载省份列表
      if (data.provinces && data.provinces.length > 0) {
        provinces.value = data.provinces
      }
      
      // 回显用户已填写的信息
      if (data.realName) formData.value.realName = data.realName
      if (data.gender && data.gender.value) formData.value.gender = data.gender.value
      if (data.profession) formData.value.profession = data.profession
      if (data.introduction) formData.value.introduction = data.introduction
      
      // 处理地区信息
      if (data.region) {
        selectedProvince.value = data.region.provinceId
        selectedCity.value = data.region.cityId
        selectedDistrict.value = data.region.districtId
        
        // 加载对应的城市列表（如果已选中省份）
        if (data.region.provinceId) {
          const citiesRes = await api.user.getCities(data.region.provinceId)
          if (citiesRes.success && citiesRes.data) {
            cities.value = citiesRes.data
          }
        }
        
        // 加载对应的区县列表（如果已选中城市）
        if (data.region.cityId) {
          const districtsRes = await api.user.getDistricts(data.region.cityId)
          if (districtsRes.success && districtsRes.data) {
            districts.value = districtsRes.data
          }
        }
      }
    }
  } catch (error) {
    console.error('加载数据失败:', error)
    errorMessage.value = '加载数据失败，请刷新重试'
  } finally {
    isLoading.value = false
  }
})


// \u7701\u4efd\u53d8\u66f4\u5904\u7406
const handleProvinceChange = async (provinceId) => {
  try {
    selectedCity.value = ''
    selectedDistrict.value = ''
    cities.value = []
    districts.value = []

    if (!provinceId) return

    const res = await api.user.getCities(provinceId)
    if (res.success && res.data) {
      cities.value = res.data
    }
  } catch (error) {
    console.error('\u52a0\u8f7d\u57ce\u5e02\u5931\u8d25:', error)
    errorMessage.value = '\u52a0\u8f7d\u57ce\u5e02\u5217\u8868\u5931\u8d25'
  }
}

// \u57ce\u5e02\u53d8\u66f4\u5904\u7406
const handleCityChange = async (cityId) => {
  try {
    selectedDistrict.value = ''
    districts.value = []

    if (!cityId) return

    const res = await api.user.getDistricts(cityId)
    if (res.success && res.data) {
      districts.value = res.data
    }
  } catch (error) {
    console.error('\u52a0\u8f7d\u533a\u53bf\u5931\u8d25:', error)
    errorMessage.value = '\u52a0\u8f7d\u533a\u53bf\u5217\u8868\u5931\u8d25'
  }
}

// 提交表单
const submitForm = async () => {
  try {
    // 清除之前的消息
    errorMessage.value = ''
    successMessage.value = ''

    isSubmitting.value = true

    // 构建提交数据
    // 注意：允许传空字符串来清空字段
    const submitData = {
      realName: formData.value.realName || '',  // 允许清空
      gender: formData.value.gender || '',      // 允许清空
      profession: formData.value.profession || '',  // 允许清空
      introduction: formData.value.introduction || ''  // 允许清空
    }

    // 构建地区文本格式
    if (selectedProvince.value && selectedCity.value && selectedDistrict.value) {
      // 需要反向查询获取地区名称
      const provinceName = provinces.value.find(p => p.provinceId === selectedProvince.value)?.provinceName || ''
      const cityName = cities.value.find(c => c.cityId === selectedCity.value)?.cityName || ''
      const districtName = districts.value.find(d => d.districtId === selectedDistrict.value)?.districtName || ''

      if (provinceName && cityName && districtName) {
        submitData.region = `${provinceName}-${cityName}-${districtName}`
      } else {
        submitData.region = ''  // 允许清空地区
      }
    } else {
      submitData.region = ''  // 允许清空地区
    }

    console.log('[用户信息页面] 提交数据:', submitData)
    
    // 提交数据
    const res = await api.user.fillUserInfo(submitData)

    if (res.success) {
      successMessage.value = '信息保存成功！'
      setTimeout(() => {
        router.push('/profile')
      }, 1500)
    } else {
      errorMessage.value = res.message || '保存失败，请重试'
    }
  } catch (error) {
    console.error('提交失败:', error)
    errorMessage.value = error.message || '网络错误，请检查连接后重试'
  } finally {
    isSubmitting.value = false
  }
}

// 暂时跳过
const skipFill = () => {
  if (confirm('确定要跳过吗？您可以稍后在个人页面编辑这些信息。')) {
    router.push('/profile')
  }
}

// 返回
const goBack = () => {
  router.back()
}
</script>

<style scoped>
.user-info-container {
  min-height: 100vh;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  padding: 0;
  display: flex;
  flex-direction: column;
}

/* 顶部区域 */
.header-section {
  background: white;
  padding: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  position: sticky;
  top: 0;
  z-index: 100;
}

.back-button {
  background: none;
  border: none;
  color: #4CAF50;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  padding: 8px 12px;
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  gap: 4px;
  transition: all 0.3s;
}

.back-button:hover {
  color: #45a049;
  transform: translateX(-4px);
}

.page-title {
  font-size: 24px;
  font-weight: bold;
  color: #2c3e50;
  margin: 0 0 12px 0;
}

.progress-bar {
  width: 100%;
  height: 6px;
  background: #e0e0e0;
  border-radius: 3px;
  overflow: hidden;
  margin-bottom: 8px;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #4CAF50, #81C784);
  transition: width 0.3s ease;
  border-radius: 3px;
}

.progress-text {
  font-size: 12px;
  color: #999;
  margin: 0;
}

/* 表单区域 */
.form-container {
  flex: 1;
  padding: 20px 16px;
  max-width: 600px;
  margin: 0 auto;
  width: 100%;
}

.form-group {
  background: white;
  padding: 16px;
  border-radius: 12px;
  margin-bottom: 16px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.05);
}

.form-label {
  display: block;
  font-size: 15px;
  font-weight: 600;
  color: #2c3e50;
  margin-bottom: 10px;
}

.optional {
  font-size: 12px;
  font-weight: 400;
  color: #999;
}

/* 输入框 */
.form-input,
.form-select,
.form-textarea {
  width: 100%;
  padding: 12px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  font-size: 14px;
  font-family: inherit;
  transition: all 0.3s;
  color: #2c3e50;
}

.form-input:focus,
.form-select:focus,
.form-textarea:focus {
  outline: none;
  border-color: #4CAF50;
  box-shadow: 0 0 0 3px rgba(76, 175, 80, 0.1);
}

.form-input::placeholder,
.form-select::placeholder {
  color: #bdbdbd;
}

.form-textarea {
  resize: vertical;
  min-height: 100px;
  font-family: inherit;
}

/* 字符计数 */
.char-count {
  display: block;
  text-align: right;
  font-size: 12px;
  color: #bdbdbd;
  margin-top: 6px;
}

/* 性别选项 */
.gender-options {
  display: flex;
  gap: 16px;
}

.gender-radio {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  padding: 8px 12px;
  border-radius: 8px;
  transition: all 0.3s;
}

.gender-radio:hover {
  background: #f5f5f5;
}

.radio-input {
  width: 18px;
  height: 18px;
  cursor: pointer;
  accent-color: #4CAF50;
}

.radio-label {
  font-size: 14px;
  color: #2c3e50;
  font-weight: 500;
  cursor: pointer;
}

/* 地区选择 */
.region-select-group {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.region-select {
  width: 100%;
}

.form-select:disabled {
  background-color: #f5f5f5;
  color: #bdbdbd;
  cursor: not-allowed;
}

/* 消息提示 */
.error-message,
.success-message {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  border-radius: 8px;
  margin-bottom: 16px;
  font-size: 14px;
  animation: slideIn 0.3s ease;
}

.error-message {
  background: #ffebee;
  color: #c62828;
  border-left: 4px solid #c62828;
}

.success-message {
  background: #e8f5e9;
  color: #2e7d32;
  border-left: 4px solid #2e7d32;
}

.error-icon,
.success-icon {
  font-size: 16px;
}

/* 按钮组 */
.button-group {
  display: flex;
  gap: 12px;
  margin-top: 24px;
  margin-bottom: 20px;
}

.btn-primary,
.btn-secondary {
  flex: 1;
  padding: 14px 20px;
  border: none;
  border-radius: 10px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
}

.btn-primary {
  background: linear-gradient(135deg, #4CAF50, #81C784);
  color: white;
  box-shadow: 0 4px 12px rgba(76, 175, 80, 0.3);
}

.btn-primary:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(76, 175, 80, 0.4);
}

.btn-primary:active:not(:disabled) {
  transform: translateY(0);
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-secondary {
  background: white;
  color: #4CAF50;
  border: 2px solid #4CAF50;
}

.btn-secondary:hover {
  background: #f0f0f0;
}

.btn-secondary:active {
  background: #e8e8e8;
}

/* 底部提示 */
.footer-tip {
  text-align: center;
  padding: 20px 16px;
  color: #666;
  font-size: 13px;
}

.footer-tip p {
  margin: 0;
}

/* 动画 */
@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 响应式设计 */
@media (max-width: 600px) {
  .form-container {
    padding: 16px 12px;
  }

  .form-group {
    padding: 14px;
    margin-bottom: 12px;
  }

  .header-section {
    padding: 12px;
  }

  .page-title {
    font-size: 20px;
  }

  .button-group {
    flex-direction: column;
    gap: 10px;
  }

  .btn-primary,
  .btn-secondary {
    width: 100%;
  }

  .gender-options {
    flex-direction: column;
    gap: 10px;
  }

  .region-select-group {
    gap: 8px;
  }
}
</style>
