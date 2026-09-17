<template>
  <div class="dashboard-page">
    <!-- 统计卡片 -->
    <div class="stats-cards">
      <div class="stat-card card card-hover">
        <div class="stat-icon" style="background: rgba(24, 144, 255, 0.1);">
          📝
        </div>
        <div class="stat-info">
          <span class="stat-value">{{ stats.totalArticles || 0 }}</span>
          <span class="stat-label">文章总数</span>
        </div>
      </div>
      <div class="stat-card card card-hover">
        <div class="stat-icon" style="background: rgba(82, 196, 26, 0.1);">
          👥
        </div>
        <div class="stat-info">
          <span class="stat-value">{{ stats.totalUsers || 0 }}</span>
          <span class="stat-label">用户总数</span>
        </div>
      </div>
      <div class="stat-card card card-hover">
        <div class="stat-icon" style="background: rgba(250, 173, 20, 0.1);">
          💬
        </div>
        <div class="stat-info">
          <span class="stat-value">{{ stats.totalComments || 0 }}</span>
          <span class="stat-label">评论总数</span>
        </div>
      </div>
      <div class="stat-card card card-hover">
        <div class="stat-icon" style="background: rgba(245, 34, 45, 0.1);">
          👁
        </div>
        <div class="stat-info">
          <span class="stat-value">{{ formatNumber(stats.totalViews) }}</span>
          <span class="stat-label">总阅读量</span>
        </div>
      </div>
    </div>

    <!-- 图表区域 -->
    <div class="charts-row">
      <div class="chart-card card">
        <h3 class="chart-title">📈 近7天文章发布趋势</h3>
        <div ref="trendChartRef" class="chart-container"></div>
      </div>
      <div class="chart-card card">
        <h3 class="chart-title">👥 用户角色分布</h3>
        <div ref="roleChartRef" class="chart-container"></div>
      </div>
    </div>

    <!-- 热门文章 -->
    <div class="hot-articles card">
      <h3 class="section-title">🔥 热门文章 TOP 5</h3>
      <div class="articles-list">
        <div 
          v-for="(article, index) in stats.topArticles || []" 
          :key="article.id" 
          class="article-item"
          @click="goToArticle(article.id)"
        >
          <span class="rank" :class="`rank-${index + 1}`">{{ index + 1 }}</span>
          <span class="article-title">{{ article.title }}</span>
          <span class="view-count">👁 {{ article.view_count }}</span>
        </div>
        <div v-if="!stats.topArticles?.length" class="empty-state">
          暂无数据
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import * as echarts from 'echarts'
import { getDashboardStats } from '../../utils/api'

const router = useRouter()

const stats = ref({})
const trendChartRef = ref(null)
const roleChartRef = ref(null)
let trendChart = null
let roleChart = null

async function fetchStats() {
  try {
    const res = await getDashboardStats()
    if (res.code === 200) {
      stats.value = res.data
      await nextTick()
      initCharts()
    }
  } catch (error) {
    console.error('获取仪表盘数据失败:', error)
  }
}

function initCharts() {
  initTrendChart()
  initRoleChart()
}

function initTrendChart() {
  if (!trendChartRef.value) return
  
  if (trendChart) {
    trendChart.dispose()
  }
  
  trendChart = echarts.init(trendChartRef.value)
  
  const trendData = stats.value.articleTrend || []
  const dates = trendData.map(item => {
    const date = new Date(item.date)
    return `${date.getMonth() + 1}/${date.getDate()}`
  })
  const counts = trendData.map(item => item.count)
  
  const option = {
    tooltip: {
      trigger: 'axis'
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '3%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: dates,
      axisLine: {
        lineStyle: {
          color: '#ddd'
        }
      },
      axisLabel: {
        color: '#666'
      }
    },
    yAxis: {
      type: 'value',
      minInterval: 1,
      axisLine: {
        lineStyle: {
          color: '#ddd'
        }
      },
      axisLabel: {
        color: '#666'
      },
      splitLine: {
        lineStyle: {
          color: '#f0f0f0'
        }
      }
    },
    series: [
      {
        data: counts,
        type: 'line',
        smooth: true,
        symbol: 'circle',
        symbolSize: 8,
        lineStyle: {
          color: '#1890ff',
          width: 3
        },
        itemStyle: {
          color: '#1890ff'
        },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(24, 144, 255, 0.3)' },
            { offset: 1, color: 'rgba(24, 144, 255, 0.05)' }
          ])
        }
      }
    ]
  }
  
  trendChart.setOption(option)
}

function initRoleChart() {
  if (!roleChartRef.value) return
  
  if (roleChart) {
    roleChart.dispose()
  }
  
  roleChart = echarts.init(roleChartRef.value)
  
  const roleData = stats.value.userRoles || []
  const data = roleData.map(item => ({
    name: item.role === 'admin' ? '管理员' : '普通用户',
    value: item.count
  }))
  
  const option = {
    tooltip: {
      trigger: 'item',
      formatter: '{b}: {c} ({d}%)'
    },
    legend: {
      orient: 'vertical',
      right: 10,
      top: 'center',
      textStyle: {
        color: '#666'
      }
    },
    series: [
      {
        type: 'pie',
        radius: ['40%', '70%'],
        center: ['40%', '50%'],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 10,
          borderColor: '#fff',
          borderWidth: 2
        },
        label: {
          show: false,
          position: 'center'
        },
        emphasis: {
          label: {
            show: true,
            fontSize: 20,
            fontWeight: 'bold'
          }
        },
        labelLine: {
          show: false
        },
        data: data,
        color: ['#1890ff', '#52c41a']
      }
    ]
  }
  
  roleChart.setOption(option)
}

function formatNumber(num) {
  if (!num) return 0
  if (num >= 10000) {
    return (num / 10000).toFixed(1) + 'w'
  }
  return num
}

function goToArticle(id) {
  router.push(`/article/${id}`)
}

function handleResize() {
  trendChart?.resize()
  roleChart?.resize()
}

onMounted(() => {
  fetchStats()
  window.addEventListener('resize', handleResize)
})
</script>

<style scoped>
.dashboard-page {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

/* 统计卡片 */
.stats-cards {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 24px;
}

.stat-icon {
  width: 56px;
  height: 56px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
}

.stat-info {
  display: flex;
  flex-direction: column;
}

.stat-value {
  font-size: 28px;
  font-weight: 700;
  color: var(--text-color);
  line-height: 1.2;
}

.stat-label {
  font-size: 14px;
  color: var(--text-muted);
  margin-top: 4px;
}

/* 图表区域 */
.charts-row {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 20px;
}

.chart-card {
  padding: 24px;
}

.chart-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-color);
  margin-bottom: 20px;
}

.chart-container {
  height: 300px;
  width: 100%;
}

/* 热门文章 */
.hot-articles {
  padding: 24px;
}

.section-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-color);
  margin-bottom: 20px;
}

.articles-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.article-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px 16px;
  background: var(--bg-color);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s;
}

.article-item:hover {
  background: var(--card-bg);
  box-shadow: var(--shadow);
}

.rank {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 700;
  color: white;
  flex-shrink: 0;
}

.rank-1 {
  background: linear-gradient(135deg, #ffd700, #ffb700);
}

.rank-2 {
  background: linear-gradient(135deg, #c0c0c0, #a0a0a0);
}

.rank-3 {
  background: linear-gradient(135deg, #cd7f32, #b87333);
}

.rank-4, .rank-5 {
  background: #999;
}

.article-title {
  flex: 1;
  font-size: 14px;
  color: var(--text-color);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.view-count {
  font-size: 13px;
  color: var(--text-muted);
  flex-shrink: 0;
}

.empty-state {
  text-align: center;
  padding: 40px;
  color: var(--text-muted);
}

/* 响应式 */
@media (max-width: 1024px) {
  .stats-cards {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .charts-row {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .stats-cards {
    grid-template-columns: 1fr;
  }
  
  .stat-card {
    padding: 20px;
  }
  
  .stat-value {
    font-size: 24px;
  }
}
</style>
