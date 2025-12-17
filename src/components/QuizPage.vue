<template>
  <div class="quiz-page">
    <!-- 页面标题 -->
    <div class="page-header">
      <h1 class="page-title">农业知识答题</h1>
      <p class="page-subtitle">测试您的农业知识水平</p>
    </div>

    <!-- 答题区域 -->
    <div class="quiz-container">
      <!-- 开始界面 -->
      <div v-if="!quizStarted" class="start-screen">
        <div class="quiz-intro">
          <div class="quiz-icon">🎯</div>
          <h2>准备开始答题</h2>
          <p>本测试包含10道农业相关问题，限时15分钟</p>
          <div class="quiz-stats">
            <div class="stat-item">
              <span class="stat-number">10</span>
              <span class="stat-label">题目数量</span>
            </div>
            <div class="stat-item">
              <span class="stat-number">15</span>
              <span class="stat-label">分钟限时</span>
            </div>
            <div class="stat-item">
              <span class="stat-number">{{ userScore }}</span>
              <span class="stat-label">历史最高分</span>
            </div>
          </div>
          <button @click="startQuiz" class="start-button">开始答题</button>
        </div>
      </div>

      <!-- 答题界面 -->
      <div v-else-if="quizStarted && !quizCompleted" class="quiz-screen">
        <!-- 进度条 -->
        <div class="progress-container">
          <div class="progress-bar">
            <div 
              class="progress-fill" 
              :style="{ width: progressPercentage + '%' }"
            ></div>
          </div>
          <div class="progress-text">
            {{ currentQuestionIndex + 1 }} / {{ totalQuestions }}
          </div>
        </div>

        <!-- 计时器 -->
        <div class="timer-container">
          <div class="timer" :class="{ 'timer-warning': timeRemaining < 60 }">
            <span class="timer-icon">⏰</span>
            <span class="timer-text">{{ formatTime(timeRemaining) }}</span>
          </div>
        </div>

        <!-- 题目 -->
        <div class="question-container">
          <div class="question-header">
            <span class="question-category">{{ currentQuestion.category }}</span>
            <span class="question-difficulty" :class="currentQuestion.difficulty">
              {{ getDifficultyText(currentQuestion.difficulty) }}
            </span>
          </div>
          
          <h3 class="question-text">{{ currentQuestion.question }}</h3>
          
          <div class="options-container">
            <div 
              v-for="(option, index) in currentQuestion.options" 
              :key="index"
              class="option-item"
              :class="{ 
                selected: selectedAnswer === index,
                correct: showAnswer && index === currentQuestion.answer,
                wrong: showAnswer && selectedAnswer === index && index !== currentQuestion.answer
              }"
              @click="selectAnswer(index)"
            >
              <span class="option-letter">{{ String.fromCharCode(65 + index) }}</span>
              <span class="option-text">{{ option }}</span>
              <span v-if="showAnswer && index === currentQuestion.answer" class="option-icon">✓</span>
              <span v-if="showAnswer && selectedAnswer === index && index !== currentQuestion.answer" class="option-icon">✗</span>
            </div>
          </div>
        </div>

        <!-- 操作按钮 -->
        <div class="quiz-actions">
          <button 
            @click="previousQuestion" 
            class="action-button secondary"
            :disabled="currentQuestionIndex === 0"
          >
            上一题
          </button>
          
          <button 
            @click="submitAnswer" 
            class="action-button primary"
            :disabled="selectedAnswer === null || showAnswer"
          >
            提交答案
          </button>
          
          <button 
            @click="nextQuestion" 
            class="action-button secondary"
            :disabled="!showAnswer"
          >
            {{ currentQuestionIndex === totalQuestions - 1 ? '完成' : '下一题' }}
          </button>
        </div>
      </div>

      <!-- 结果界面 -->
      <div v-else-if="quizCompleted" class="result-screen">
        <div class="result-container">
          <div class="result-icon" :class="resultGrade">{{ getResultIcon() }}</div>
          <h2 class="result-title">{{ getResultTitle() }}</h2>
          <div class="result-score">
            <span class="score-number">{{ finalScore }}</span>
            <span class="score-total">/{{ totalQuestions }}</span>
          </div>
          <div class="result-grade">{{ getGradeText() }}</div>
          
          <div class="result-stats">
            <div class="stat-item">
              <span class="stat-label">正确</span>
              <span class="stat-value correct">{{ correctAnswers }}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">错误</span>
              <span class="stat-value wrong">{{ wrongAnswers }}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">用时</span>
              <span class="stat-value">{{ formatTime(quizDuration) }}</span>
            </div>
          </div>

          <div class="result-actions">
            <button @click="restartQuiz" class="restart-button">重新答题</button>
            <button @click="goToHome" class="home-button">返回首页</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAppStore } from '../stores/app'

export default {
  name: 'QuizPage',
  setup() {
    const router = useRouter()
    const appStore = useAppStore()

    // 答题状态
    const quizStarted = ref(false)
    const quizCompleted = ref(false)
    const currentQuestionIndex = ref(0)
    const selectedAnswer = ref(null)
    const showAnswer = ref(false)
    const timeRemaining = ref(900) // 15分钟 = 900秒
    const quizStartTime = ref(null)
    const quizDuration = ref(0)

    // 答题记录
    const userAnswers = ref([])
    const correctAnswers = ref(0)
    const wrongAnswers = ref(0)

    // 题目数据
    const questions = ref([
      {
        category: '作物种植',
        difficulty: 'easy',
        question: '水稻一般在什么季节播种？',
        options: ['春季', '夏季', '秋季', '冬季'],
        answer: 0
      },
      {
        category: '土壤肥料',
        difficulty: 'medium',
        question: '以下哪种肥料属于有机肥？',
        options: ['尿素', '复合肥', '农家肥', '磷酸二氢钾'],
        answer: 2
      },
      {
        category: '病虫害防治',
        difficulty: 'hard',
        question: '稻飞虱主要危害水稻的哪个部位？',
        options: ['根部', '茎部', '叶片', '穗部'],
        answer: 2
      },
      {
        category: '农业气象',
        difficulty: 'easy',
        question: '以下哪种天气现象对农作物生长最有利？',
        options: ['连续阴雨', '适度降雨', '长期干旱', '冰雹天气'],
        answer: 1
      },
      {
        category: '现代农业',
        difficulty: 'medium',
        question: '精准农业主要依靠什么技术？',
        options: ['GPS和GIS', '传统经验', '人工判断', '随机决策'],
        answer: 0
      }
    ])

    // 计算属性
    const totalQuestions = computed(() => questions.value.length)
    const progressPercentage = computed(() => 
      ((currentQuestionIndex.value + 1) / totalQuestions.value) * 100
    )
    const finalScore = computed(() => correctAnswers.value)
    const resultGrade = computed(() => {
      const percentage = (correctAnswers.value / totalQuestions.value) * 100
      if (percentage >= 90) return 'excellent'
      if (percentage >= 70) return 'good'
      if (percentage >= 60) return 'pass'
      return 'fail'
    })
    const currentQuestion = computed(() => questions.value[currentQuestionIndex.value])
    const userScore = computed(() => {
      const scores = appStore.quizScores
      return scores.length > 0 ? Math.max(...scores.map(s => s.score)) : 0
    })

    let timer = null

    // 方法
    const startQuiz = () => {
      quizStarted.value = true
      quizStartTime.value = Date.now()
      startTimer()
    }

    const startTimer = () => {
      timer = setInterval(() => {
        timeRemaining.value--
        if (timeRemaining.value <= 0) {
          completeQuiz()
        }
      }, 1000)
    }

    const selectAnswer = (index) => {
      if (showAnswer.value) return
      selectedAnswer.value = index
    }

    const submitAnswer = () => {
      if (selectedAnswer.value === null) return
      
      showAnswer.value = true
      userAnswers.value.push(selectedAnswer.value)
      
      if (selectedAnswer.value === currentQuestion.answer) {
        correctAnswers.value++
      } else {
        wrongAnswers.value++
      }
    }

    const nextQuestion = () => {
      if (currentQuestionIndex.value < totalQuestions.value - 1) {
        currentQuestionIndex.value++
        selectedAnswer.value = null
        showAnswer.value = false
      } else {
        completeQuiz()
      }
    }

    const previousQuestion = () => {
      if (currentQuestionIndex.value > 0) {
        currentQuestionIndex.value--
        selectedAnswer.value = userAnswers.value[currentQuestionIndex.value] || null
        showAnswer.value = selectedAnswer.value !== null
      }
    }

    const completeQuiz = () => {
      if (timer) {
        clearInterval(timer)
        timer = null
      }
      
      quizCompleted.value = true
      quizDuration.value = Math.floor((Date.now() - quizStartTime.value) / 1000)
      
      // 保存成绩
      appStore.addQuizScore(correctAnswers.value)
      
      // 记录用户行为
      appStore.recordUserAction({
        action: 'complete_quiz',
        module: 'quiz',
        data: {
          score: correctAnswers.value,
          total: totalQuestions.value,
          duration: quizDuration.value
        }
      })
    }

    const restartQuiz = () => {
      // 重置状态
      quizStarted.value = false
      quizCompleted.value = false
      currentQuestionIndex.value = 0
      selectedAnswer.value = null
      showAnswer.value = false
      timeRemaining.value = 900
      quizStartTime.value = null
      quizDuration.value = 0
      userAnswers.value = []
      correctAnswers.value = 0
      wrongAnswers.value = 0
      
      if (timer) {
        clearInterval(timer)
        timer = null
      }
    }

    const goToHome = () => {
      router.push('/home')
    }

    const formatTime = (seconds) => {
      const minutes = Math.floor(seconds / 60)
      const remainingSeconds = seconds % 60
      return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
    }

    const getDifficultyText = (difficulty) => {
      const map = {
        easy: '简单',
        medium: '中等',
        hard: '困难'
      }
      return map[difficulty] || '未知'
    }

    const getResultIcon = () => {
      const icons = {
        excellent: '🏆',
        good: '🥈',
        pass: '📜',
        fail: '📚'
      }
      return icons[resultGrade.value]
    }

    const getResultTitle = () => {
      const titles = {
        excellent: '优秀！',
        good: '良好！',
        pass: '及格！',
        fail: '需要努力！'
      }
      return titles[resultGrade.value]
    }

    const getGradeText = () => {
      const percentage = (correctAnswers.value / totalQuestions.value) * 100
      return `${percentage.toFixed(0)}分`
    }

    onMounted(() => {
      // 加载用户历史成绩
      appStore.recordUserAction({
        action: 'view_quiz_page',
        module: 'quiz'
      })
    })

    onUnmounted(() => {
      if (timer) {
        clearInterval(timer)
      }
    })

    return {
      // 状态
      quizStarted,
      quizCompleted,
      currentQuestionIndex,
      selectedAnswer,
      showAnswer,
      timeRemaining,
      quizDuration,
      
      // 数据
      questions,
      userAnswers,
      correctAnswers,
      wrongAnswers,
      
      // 计算属性
      totalQuestions,
      progressPercentage,
      finalScore,
      resultGrade,
      currentQuestion,
      userScore,
      
      // 方法
      startQuiz,
      selectAnswer,
      submitAnswer,
      nextQuestion,
      previousQuestion,
      restartQuiz,
      goToHome,
      formatTime,
      getDifficultyText,
      getResultIcon,
      getResultTitle,
      getGradeText
    }
  }
}
</script>

<style scoped>
.quiz-page {
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  background-attachment: fixed;  /* 使渐变背景固定在视口 */
  min-height: 100vh;  /* 确保页面至少占满整个视口高度 */
  padding: 20px;
  padding-bottom: 50px;  /* 增加底部间距 */
}

.page-header {
  text-align: center;
  margin-bottom: 30px;
}

.page-title {
  font-size: 28px;
  color: #2c3e50;
  margin-bottom: 10px;
}

.page-subtitle {
  font-size: 16px;
  color: #7f8c8d;
}

.quiz-container {
  max-width: 600px;
  margin: 0 auto;
}

/* 开始界面 */
.start-screen {
  background: white;
  border-radius: 20px;
  padding: 40px;
  text-align: center;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
}

.quiz-intro h2 {
  font-size: 24px;
  color: #2c3e50;
  margin-bottom: 15px;
}

.quiz-intro p {
  font-size: 16px;
  color: #7f8c8d;
  margin-bottom: 30px;
}

.quiz-icon {
  font-size: 60px;
  margin-bottom: 20px;
}

.quiz-stats {
  display: flex;
  justify-content: space-around;
  margin-bottom: 30px;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.stat-number {
  font-size: 24px;
  font-weight: bold;
  color: #3498db;
}

.stat-label {
  font-size: 14px;
  color: #7f8c8d;
}

.start-button {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  padding: 15px 40px;
  border-radius: 25px;
  font-size: 18px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s ease;
}

.start-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
}

/* 答题界面 */
.quiz-screen {
  background: white;
  border-radius: 20px;
  padding: 30px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
}

.progress-container {
  display: flex;
  align-items: center;
  margin-bottom: 20px;
}

.progress-bar {
  flex: 1;
  height: 8px;
  background: #ecf0f1;
  border-radius: 4px;
  overflow: hidden;
  margin-right: 15px;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #3498db, #2ecc71);
  transition: width 0.3s ease;
}

.progress-text {
  font-size: 14px;
  color: #7f8c8d;
  font-weight: bold;
}

.timer-container {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 20px;
}

.timer {
  display: flex;
  align-items: center;
  background: #f8f9fa;
  padding: 8px 15px;
  border-radius: 20px;
  font-weight: bold;
}

.timer-warning {
  background: #ffeaa7;
  color: #d63031;
}

.timer-icon {
  margin-right: 5px;
}

.question-container {
  margin-bottom: 30px;
}

.question-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.question-category {
  background: #3498db;
  color: white;
  padding: 5px 12px;
  border-radius: 15px;
  font-size: 12px;
}

.question-difficulty {
  padding: 5px 12px;
  border-radius: 15px;
  font-size: 12px;
  font-weight: bold;
}

.question-difficulty.easy {
  background: #2ecc71;
  color: white;
}

.question-difficulty.medium {
  background: #f39c12;
  color: white;
}

.question-difficulty.hard {
  background: #e74c3c;
  color: white;
}

.question-text {
  font-size: 18px;
  color: #2c3e50;
  margin-bottom: 25px;
  line-height: 1.6;
}

.options-container {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.option-item {
  display: flex;
  align-items: center;
  background: #f8f9fa;
  padding: 15px;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
  border: 2px solid transparent;
}

.option-item:hover {
  background: #e9ecef;
  transform: translateX(5px);
}

.option-item.selected {
  background: #3498db;
  color: white;
  border-color: #2980b9;
}

.option-item.correct {
  background: #2ecc71;
  color: white;
  border-color: #27ae60;
}

.option-item.wrong {
  background: #e74c3c;
  color: white;
  border-color: #c0392b;
}

.option-letter {
  width: 30px;
  height: 30px;
  background: rgba(0, 0, 0, 0.1);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  margin-right: 15px;
  font-size: 14px;
}

.option-text {
  flex: 1;
  font-size: 16px;
}

.option-icon {
  font-size: 20px;
  margin-left: 10px;
}

.quiz-actions {
  display: flex;
  justify-content: space-between;
  gap: 15px;
}

.action-button {
  padding: 12px 24px;
  border: none;
  border-radius: 25px;
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s ease;
}

.action-button.primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  flex: 1;
}

.action-button.secondary {
  background: #95a5a6;
  color: white;
}

.action-button:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
}

.action-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* 结果界面 */
.result-screen {
  background: white;
  border-radius: 20px;
  padding: 40px;
  text-align: center;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
}

.result-container h2 {
  font-size: 28px;
  color: #2c3e50;
  margin-bottom: 20px;
}

.result-icon {
  font-size: 80px;
  margin-bottom: 20px;
}

.result-score {
  margin-bottom: 20px;
}

.score-number {
  font-size: 48px;
  font-weight: bold;
  color: #3498db;
}

.score-total {
  font-size: 24px;
  color: #7f8c8d;
}

.result-grade {
  font-size: 24px;
  font-weight: bold;
  margin-bottom: 30px;
}

.result-stats {
  display: flex;
  justify-content: space-around;
  margin-bottom: 40px;
  background: #f8f9fa;
  padding: 20px;
  border-radius: 15px;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.stat-label {
  font-size: 14px;
  color: #7f8c8d;
  margin-bottom: 5px;
}

.stat-value {
  font-size: 24px;
  font-weight: bold;
}

.stat-value.correct {
  color: #2ecc71;
}

.stat-value.wrong {
  color: #e74c3c;
}

.result-actions {
  display: flex;
  gap: 20px;
  justify-content: center;
}

.restart-button,
.home-button {
  padding: 15px 30px;
  border: none;
  border-radius: 25px;
  font-size: 16px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s ease;
}

.restart-button {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.home-button {
  background: #95a5a6;
  color: white;
}

.restart-button:hover,
.home-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
}

/* 响应式设计 */
@media (max-width: 480px) {
  .quiz-page {
    padding: 15px;
    padding-bottom: 80px;
  }
  
  .start-screen,
  .quiz-screen,
  .result-screen {
    padding: 25px;
  }
  
  .quiz-stats,
  .result-stats {
    flex-direction: column;
    gap: 15px;
  }
  
  .quiz-actions,
  .result-actions {
    flex-direction: column;
  }
  
  .score-number {
    font-size: 36px;
  }
}
</style>