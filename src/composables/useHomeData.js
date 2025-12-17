import { ref, onMounted, computed } from 'vue'
import api from '../api'
import { useAppStore } from '../stores/app'

// 首页数据组合式函数
export function useHomeData() {
  const appStore = useAppStore()
  
  // 状态管理
  const carouselList = ref([])
  const newsList = ref([])
  const informationList = ref([])
  const loading = ref(false)
  const error = ref(null)
  
  // 获取轮播图数据
  const fetchCarousel = async () => {
    try {
      loading.value = true
      const response = await api.content.getCarousel()
      
      if (response.success) {
        // 转换数据格式以适配前端展示
        carouselList.value = response.data.map(item => ({
          id: item.id,
          title: item.title,
          image: item.image_url,
          link: item.link_url,
          tags: ['农业', '科技', '创新'] // 默认标签，可根据需求调整
        }))
        
        // 记录数据获取成功
        appStore.recordUserAction({
          action: 'carousel_loaded',
          module: 'home',
          data: { count: carouselList.value.length }
        })
      }
    } catch (err) {
      error.value = err.message
      console.error('获取轮播图失败:', err)
      
      // 使用默认数据作为降级方案
      carouselList.value = getDefaultCarousel()
    } finally {
      loading.value = false
    }
  }
  
  // 获取新闻数据
  const fetchNews = async (page = 1, limit = 10) => {
    try {
      const response = await api.content.getNews(page, limit)
      
      if (response.success) {
        newsList.value = response.data.list.map(item => ({
          id: item.id,
          title: item.title,
          summary: extractSummary(item.content, 100), // 提取摘要
          image: item.cover_image || getDefaultNewsImage(item.category),
          source: item.source,
          readCount: item.read_count,
          publishTime: formatTime(item.publish_time),
          category: item.category
        }))
        
        appStore.recordUserAction({
          action: 'news_loaded',
          module: 'home',
          data: { page, count: newsList.value.length }
        })
      }
    } catch (err) {
      console.error('获取新闻失败:', err)
      newsList.value = getDefaultNews() // 降级方案
    }
  }
  
  // 获取资讯数据
  const fetchInformation = async (category = null, page = 1, limit = 10) => {
    try {
      const response = await api.content.getInformation(category, page, limit)
      
      if (response.success) {
        informationList.value = response.data.list.map(item => ({
          id: item.id,
          title: item.title,
          summary: extractSummary(item.content, 80),
          image: item.cover_image || getDefaultInfoImage(item.category),
          author: item.author,
          readCount: item.read_count,
          publishTime: formatTime(item.publish_time),
          category: item.category
        }))
      }
    } catch (err) {
      console.error('获取资讯失败:', err)
      informationList.value = getDefaultInformation() // 降级方案
    }
  }
  
  // 增加阅读量
  const incrementReadCount = async (contentId, type = 'news') => {
    try {
      await api.content.incrementReadCount(contentId, type)
      
      appStore.recordUserAction({
        action: 'content_read',
        module: 'home',
        data: { contentId, type }
      })
    } catch (err) {
      console.error('增加阅读量失败:', err)
    }
  }
  
  // 工具函数
  const extractSummary = (content, maxLength) => {
    // 移除HTML标签，提取纯文本
    const plainText = content.replace(/<[^>]*>/g, '')
    return plainText.length > maxLength 
      ? plainText.substring(0, maxLength) + '...'
      : plainText
  }
  
  const formatTime = (timeString) => {
    const date = new Date(timeString)
    const now = new Date()
    const diff = now - date
    
    // 小于1小时显示"刚刚"、"几分钟前"
    if (diff < 3600000) {
      const minutes = Math.floor(diff / 60000)
      return minutes <= 0 ? '刚刚' : `${minutes}分钟前`
    }
    
    // 小于24小时显示"几小时前"
    if (diff < 86400000) {
      const hours = Math.floor(diff / 3600000)
      return `${hours}小时前`
    }
    
    // 显示具体日期
    return date.toLocaleDateString('zh-CN')
  }
  
  const getDefaultNewsImage = (category) => {
    const categoryImages = {
      '科技': 'https://via.placeholder.com/150x100/3498db/ffffff?text=科技',
      '可持续': 'https://via.placeholder.com/150x100/2ecc71/ffffff?text=可持续',
      '电商': 'https://via.placeholder.com/150x100/e74c3c/ffffff?text=电商',
      '政策': 'https://via.placeholder.com/150x100/9b59b6/ffffff?text=政策',
      '行情': 'https://via.placeholder.com/150x100/f39c12/ffffff?text=行情'
    }
    
    return categoryImages[category] || 'https://via.placeholder.com/150x100/95a5a6/ffffff?text=农业'
  }
  
  const getDefaultInfoImage = (category) => {
    return getDefaultNewsImage(category) // 复用新闻图片逻辑
  }
  
  // 降级方案 - 默认数据
  const getDefaultCarousel = () => [
    {
      id: 1,
      title: '有机好大米',
      image: '/src/assets/banner/banner1.png',
      link: '/detail/1',
      tags: ['营养', '安全', '新鲜', '美味']
    },
    {
      id: 2,
      title: '农业科技创新',
      image: '/src/assets/banner/banner2.png',
      link: '/detail/2',
      tags: ['科技', '创新', '高效', '智能']
    },
    {
      id: 3,
      title: '绿色农业发展',
      image: '/src/assets/banner/banner3.png',
      link: '/detail/3',
      tags: ['环保', '可持续', '健康', '未来']
    }
  ]
  
  const getDefaultNews = () => [
    {
      id: 1,
      title: '农业科技创新推动产业升级',
      summary: '农业科技创新成为推动农业产业升级的关键力量，各种新技术的应用为传统农业带来了新的活力。',
      image: 'https://via.placeholder.com/150x100/3498db/ffffff?text=科技',
      source: '农业农村部',
      readCount: 1250,
      publishTime: '2小时前',
      category: '科技'
    },
    {
      id: 2,
      title: '可持续农业发展趋势',
      summary: '人们对环境保护和可持续发展的关注度不断提高，可持续农业成为未来农业发展的重要方向。',
      image: 'https://via.placeholder.com/150x100/2ecc71/ffffff?text=可持续',
      source: '农业科学院',
      readCount: 980,
      publishTime: '4小时前',
      category: '可持续'
    },
    {
      id: 3,
      title: '农产品电商助力乡村振兴',
      summary: '农产品电商的兴起为振兴村莊帶來了新的机遇，帮助农民拓宽了销售渠道，增加了收入。',
      image: 'https://via.placeholder.com/150x100/e74c3c/ffffff?text=电商',
      source: '商务部',
      readCount: 1560,
      publishTime: '6小时前',
      category: '电商'
    }
  ]
  
  const getDefaultInformation = () => [
    {
      id: 1,
      title: '春季小麦田间管理要点',
      summary: '春季是小麦生长的关键时期，做好田间管理对提高产量至关重要...',
      image: 'https://via.placeholder.com/150x100/27ae60/ffffff?text=种植',
      author: '张农技',
      readCount: 520,
      publishTime: '1天前',
      category: '种植技术'
    }
  ]
  
  // 初始化数据
  const initializeHomeData = async () => {
    loading.value = true
    try {
      await Promise.all([
        fetchCarousel(),
        fetchNews(),
        fetchInformation()
      ])
    } catch (err) {
      error.value = err.message
    } finally {
      loading.value = false
    }
  }
  
  // 计算属性
  const hasData = computed(() => 
    carouselList.value.length > 0 || 
    newsList.value.length > 0 || 
    informationList.value.length > 0
  )
  
  return {
    // 状态
    carouselList,
    newsList,
    informationList,
    loading,
    error,
    hasData,
    
    // 方法
    fetchCarousel,
    fetchNews,
    fetchInformation,
    incrementReadCount,
    initializeHomeData
  }
}