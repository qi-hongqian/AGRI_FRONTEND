import { ref, computed, onMounted } from 'vue'
import api from '../api'
import { useAppStore } from '../stores/app'

// 答题数据组合式函数
export function useQuizData() {
  const appStore = useAppStore()
  
  // 状态管理
  const questions = ref([])
  const currentQuestionIndex = ref(0)
  const userAnswers = ref([])
  const quizStarted = ref(false)
  const quizCompleted = ref(false)
  const loading = ref(false)
  const error = ref(null)
  const timeRemaining = ref(900) // 15分钟
  const startTime = ref(null)
  const userPoints = ref(0)
  const leaderboard = ref([])
  
  // 答题配置
  const quizConfig = ref({
    totalQuestions: 10,
    timeLimit: 900, // 15分钟
    categories: ['病虫害防治', '农药使用', '种植技术', '土壤肥料'],
    difficulties: ['简单', '中等', '困难']
  })
  
  // 当前题目
  const currentQuestion = computed(() => {
    return questions.value[currentQuestionIndex.value] || null
  })
  
  // 答题进度
  const progress = computed(() => {
    return (currentQuestionIndex.value / questions.value.length) * 100
  })
  
  // 计算得分
  const score = computed(() => {
    let correctCount = 0
    userAnswers.value.forEach((answer, index) => {
      if (answer.isCorrect) correctCount++
    })
    return correctCount
  })
  
  // 获取题目
  const fetchQuestions = async (category = null, difficulty = null, limit = 10) => {
    try {
      loading.value = true
      
      const response = await api.answer.getQuestions(category, difficulty, limit)
      
      if (response.success) {
        // 转换题目格式
        questions.value = response.data.map((q, index) => ({
          id: q.id,
          question: q.content,
          options: JSON.parse(q.options).map((opt, idx) => ({
            id: opt.id,
            content: opt.content,
            label: String.fromCharCode(65 + idx) // A, B, C, D
          })),
          correctAnswer: q.answer,
          explanation: q.explanation,
          category: q.category,
          difficulty: getDifficultyText(q.difficulty),
          score: q.score
        }))
        
        // 重置答题状态
        currentQuestionIndex.value = 0
        userAnswers.value = []
        quizStarted.value = false
        quizCompleted.value = false
        
        // 记录用户行为
        appStore.recordUserAction({
          action: 'questions_loaded',
          module: 'quiz',
          data: { category, difficulty, count: questions.value.length }
        })
      }
    } catch (err) {
      error.value = err.message
      console.error('获取题目失败:', err)
      
      // 降级方案 - 使用默认题目
      questions.value = getDefaultQuestions()
    } finally {
      loading.value = false
    }
  }
  
  // 开始答题
  const startQuiz = async (category = null, difficulty = null) => {
    try {
      await fetchQuestions(category, difficulty, quizConfig.value.totalQuestions)
      
      quizStarted.value = true
      startTime.value = Date.now()
      timeRemaining.value = quizConfig.value.timeLimit
      
      // 启动计时器
      startTimer()
      
      // 记录用户行为
      appStore.recordUserAction({
        action: 'quiz_started',
        module: 'quiz',
        data: { category, difficulty }
      })
    } catch (err) {
      error.value = err.message
      console.error('开始答题失败:', err)
    }
  }
  
  // 提交答案
  const submitAnswer = async (questionId, userAnswer) => {
    try {
      const currentQ = currentQuestion.value
      if (!currentQ) return { success: false, error: '题目不存在' }
      
      const isCorrect = userAnswer === currentQ.correctAnswer
      const answerData = {
        questionId,
        userAnswer,
        isCorrect,
        score: isCorrect ? currentQ.score : 0
      }
      
      // 保存答案记录
      userAnswers.value.push({
        ...answerData,
        question: currentQ.question,
        correctAnswer: currentQ.correctAnswer,
        explanation: currentQ.explanation
      })
      
      // 调用后端API记录答题
      const response = await api.answer.submitAnswer(questionId, userAnswer)
      
      if (response.success) {
        // 如果正确，增加积分
        if (isCorrect) {
          await updateUserPoints(currentQ.score, '答题正确')
        }
        
        // 记录用户行为
        appStore.recordUserAction({
          action: 'answer_submitted',
          module: 'quiz',
          data: { questionId, userAnswer, isCorrect, score: currentQ.score }
        })
        
        return { success: true, isCorrect, score: currentQ.score }
      }
    } catch (err) {
      console.error('提交答案失败:', err)
      return { success: false, error: err.message }
    }
  }
  
  // 下一题
  const nextQuestion = () => {
    if (currentQuestionIndex.value < questions.value.length - 1) {
      currentQuestionIndex.value++
      return true
    } else {
      // 答题完成
      completeQuiz()
      return false
    }
  }
  
  // 完成答题
  const completeQuiz = async () => {
    quizCompleted.value = true
    
    // 计算总分和用时
    const totalScore = score.value
    const totalPossibleScore = questions.value.reduce((sum, q) => sum + q.score, 0)
    const duration = Math.floor((Date.now() - startTime.value) / 1000)
    
    // 更新用户积分（额外奖励）
    const bonusPoints = Math.floor(totalScore * 2) // 每题额外2分奖励
    if (bonusPoints > 0) {
      await updateUserPoints(bonusPoints, '答题完成奖励')
    }
    
    // 保存到全局状态
    appStore.addQuizScore(totalScore)
    
    // 记录用户行为
    appStore.recordUserAction({
      action: 'quiz_completed',
      module: 'quiz',
      data: {
        totalScore,
        totalPossibleScore,
        duration,
        correctCount: score.value,
        totalCount: questions.value.length
      }
    })
    
    // 刷新排行榜
    await fetchLeaderboard()
  }
  
  // 获取用户积分
  const fetchUserPoints = async () => {
    try {
      const userId = appStore.user?.id
      if (!userId) return
      
      const response = await api.answer.getUserPoints(userId)
      
      if (response.success) {
        userPoints.value = response.data.total_point || 0
      }
    } catch (err) {
      console.error('获取用户积分失败:', err)
      userPoints.value = 0 // 降级方案
    }
  }
  
  // 更新用户积分
  const updateUserPoints = async (points, reason) => {
    try {
      // 这里可以调用后端API更新积分
      // 目前在前端先更新本地状态
      userPoints.value += points
      
      // 记录积分变动
      appStore.recordUserAction({
        action: 'points_updated',
        module: 'quiz',
        data: { points, reason, currentTotal: userPoints.value }
      })
      
      return { success: true }
    } catch (err) {
      console.error('更新积分失败:', err)
      return { success: false, error: err.message }
    }
  }
  
  // 获取排行榜
  const fetchLeaderboard = async (type = 'daily', limit = 20) => {
    try {
      const response = await api.answer.getLeaderboard(type, limit)
      
      if (response.success) {
        leaderboard.value = response.data.map((user, index) => ({
          rank: index + 1,
          userId: user.user_id,
          nickname: user.nickname || '匿名用户',
          avatar: user.avatar || getDefaultAvatar(user.user_id),
          points: user.total_point,
          region: user.region || '未知地区'
        }))
        
        // 记录用户行为
        appStore.recordUserAction({
          action: 'leaderboard_viewed',
          module: 'quiz',
          data: { type, count: leaderboard.value.length }
        })
      }
    } catch (err) {
      console.error('获取排行榜失败:', err)
      leaderboard.value = getDefaultLeaderboard() // 降级方案
    }
  }
  
  // 获取答题历史
  const fetchAnswerHistory = async (page = 1, limit = 20) => {
    try {
      const userId = appStore.user?.id
      if (!userId) return []
      
      const response = await api.answer.getAnswerHistory(userId, page, limit)
      
      if (response.success) {
        return response.data.list.map(record => ({
          id: record.id,
          question: record.question_content,
          userAnswer: record.user_answer,
          correctAnswer: record.correct_answer,
          isCorrect: record.is_correct === 1,
          score: record.score,
          answerTime: formatTime(record.answer_time)
        }))
      }
      
      return []
    } catch (err) {
      console.error('获取答题历史失败:', err)
      return [] // 降级方案
    }
  }
  
  // 工具函数
  const getDifficultyText = (difficulty) => {
    const map = {
      1: '简单',
      2: '中等', 
      3: '困难'
    }
    return map[difficulty] || '未知'
  }
  
  const formatTime = (timeString) => {
    const date = new Date(timeString)
    const now = new Date()
    const diff = now - date
    
    if (diff < 3600000) {
      const minutes = Math.floor(diff / 60000)
      return minutes <= 0 ? '刚刚' : `${minutes}分钟前`
    }
    
    if (diff < 86400000) {
      const hours = Math.floor(diff / 3600000)
      return `${hours}小时前`
    }
    
    return date.toLocaleDateString('zh-CN')
  }
  
  const getDefaultAvatar = (userId) => {
    const colors = ['e91e63', '9c27b0', '673ab7', '3f51b5', '2196f3', '00bcd4', '009688', '4caf50']
    const color = colors[userId % colors.length]
    return `https://via.placeholder.com/100/${color}/ffffff?text=👤`
  }
  
  // 计时器
  let timer = null
  
  const startTimer = () => {
    if (timer) clearInterval(timer)
    
    timer = setInterval(() => {
      timeRemaining.value--
      if (timeRemaining.value <= 0) {
        completeQuiz()
      }
    }, 1000)
  }
  
  const stopTimer = () => {
    if (timer) {
      clearInterval(timer)
      timer = null
    }
  }
  
  // 降级方案 - 默认题目
  const getDefaultQuestions = () => [
    {
      id: 1,
      question: '水稻一般在什么季节播种？',
      options: [
        { id: 'A', content: '春季', label: 'A' },
        { id: 'B', content: '夏季', label: 'B' },
        { id: 'C', content: '秋季', label: 'C' },
        { id: 'D', content: '冬季', label: 'D' }
      ],
      correctAnswer: 'A',
      explanation: '水稻一般在春季播种，这是最佳的季节。',
      category: '种植技术',
      difficulty: '简单',
      score: 10
    },
    {
      id: 2,
      question: '以下哪种肥料属于有机肥？',
      options: [
        { id: 'A', content: '尿素', label: 'A' },
        { id: 'B', content: '复合肥', label: 'B' },
        { id: 'C', content: '农家肥', label: 'C' },
        { id: 'D', content: '磷酸二氢钾', label: 'D' }
      ],
      correctAnswer: 'C',
      explanation: '农家肥是典型的有机肥料，来源于动植物残体。',
      category: '土壤肥料',
      difficulty: '中等',
      score: 15
    }
  ]
  
  const getDefaultLeaderboard = () => [
    {
      rank: 1,
      userId: 1,
      nickname: '农业专家王老师',
      avatar: 'https://via.placeholder.com/100/4CAF50/ffffff?text=王',
      points: 2580,
      region: '山东省济南市'
    },
    {
      rank: 2,
      userId: 2,
      nickname: '种植能手老李',
      avatar: 'https://via.placeholder.com/100/2196F3/ffffff?text=李',
      points: 2340,
      region: '河南省郑州市'
    },
    {
      rank: 3,
      userId: 3,
      nickname: '农技推广员小张',
      avatar: 'https://via.placeholder.com/100/FF9800/ffffff?text=张',
      points: 2120,
      region: '江苏省南京市'
    }
  ]
  
  // 初始化
  const initializeQuizData = async () => {
    await fetchUserPoints()
    await fetchLeaderboard()
  }
  
  // 清理资源
  const cleanup = () => {
    stopTimer()
  }
  
  return {
    // 状态
    questions,
    currentQuestionIndex,
    userAnswers,
    quizStarted,
    quizCompleted,
    loading,
    error,
    timeRemaining,
    userPoints,
    leaderboard,
    quizConfig,
    
    // 计算属性
    currentQuestion,
    progress,
    score,
    
    // 方法
    fetchQuestions,
    startQuiz,
    submitAnswer,
    nextQuestion,
    completeQuiz,
    fetchUserPoints,
    updateUserPoints,
    fetchLeaderboard,
    fetchAnswerHistory,
    initializeQuizData,
    cleanup
  }
}