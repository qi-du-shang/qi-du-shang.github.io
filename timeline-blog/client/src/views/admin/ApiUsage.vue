<template>
  <div class="api-usage-page">
    <!-- 异常告警横幅 -->
    <div v-if="hasAlerts" class="alert-banner">
      <div class="alert-icon">⚠️</div>
      <div class="alert-content">
        <span class="alert-title">检测到 {{ alertCount }} 项异常</span>
        <span class="alert-desc">
          <span v-if="alerts.server_error_apis?.length">{{ alerts.server_error_apis.length }} 个接口高频500 · </span>
          <span v-if="alerts.spike_apis?.length">{{ alerts.spike_apis.length }} 个接口流量暴增 · </span>
          <span v-if="alerts.slow_requests?.length">{{ alerts.slow_requests.length }} 次请求超时(>1min) · </span>
          <span v-if="alerts.high_error_rate_apis?.length">{{ alerts.high_error_rate_apis.length }} 个接口高错误率</span>
        </span>
      </div>
      <button class="alert-close" @click="showAlertBanner = false">×</button>
    </div>

    <!-- 时间维度切换 -->
    <div class="time-tabs">
      <button
        v-for="tab in timeTabs"
        :key="tab.key"
        class="time-tab"
        :class="{ active: activeTimeTab === tab.key }"
        @click="switchTimeTab(tab.key)"
      >
        {{ tab.label }}
      </button>
      <button class="refresh-btn" @click="fetchAllData" :disabled="loading">
        <span :class="{ spinning: loading }">🔄</span> 刷新
      </button>
    </div>

    <!-- 统计卡片 -->
    <div class="stats-cards">
      <div class="stat-card card glow-blue">
        <div class="stat-header">
          <span class="stat-icon">📊</span>
          <span class="stat-trend" :class="trendClass(overview.today?.count, overview.yesterday?.count)">
            {{ trendText(overview.today?.count, overview.yesterday?.count) }}
          </span>
        </div>
        <div class="stat-value">{{ formatNumber(overview.today?.count) }}</div>
        <div class="stat-label">今日请求量</div>
        <div class="stat-sub">昨日 {{ formatNumber(overview.yesterday?.count) }}</div>
      </div>

      <div class="stat-card card glow-green">
        <div class="stat-header">
          <span class="stat-icon">✅</span>
          <span class="stat-rate">{{ overview.today?.success_rate ?? 0 }}%</span>
        </div>
        <div class="stat-value">{{ overview.today?.success_rate ?? 0 }}%</div>
        <div class="stat-label">今日成功率</div>
        <div class="stat-sub">5xx 错误 {{ overview.today?.server_error ?? 0 }} 次</div>
      </div>

      <div class="stat-card card glow-purple">
        <div class="stat-header">
          <span class="stat-icon">⚡</span>
        </div>
        <div class="stat-value">{{ overview.today?.avg_duration ?? 0 }}<span class="stat-unit">ms</span></div>
        <div class="stat-label">今日平均响应耗时</div>
        <div class="stat-sub">近7天 {{ overview.last7days?.avg_duration ?? 0 }}ms</div>
      </div>

      <div class="stat-card card glow-orange">
        <div class="stat-header">
          <span class="stat-icon">🌐</span>
        </div>
        <div class="stat-value">{{ formatNumber(overview.total?.count) }}</div>
        <div class="stat-label">累计总请求量</div>
        <div class="stat-sub">{{ overview.total?.api_count ?? 0 }} 个接口 · {{ overview.total?.unique_ips ?? 0 }} 个IP</div>
      </div>
    </div>

    <!-- 时间维度数据卡片 -->
    <div class="time-stats-row">
      <div class="time-stat-card card" v-for="item in timeStatsList" :key="item.key">
        <div class="time-stat-label">{{ item.label }}</div>
        <div class="time-stat-value">{{ formatNumber(item.value) }}</div>
        <div class="time-stat-meta">
          <span class="meta-item success">成功 {{ item.success }}</span>
          <span class="meta-item error">5xx {{ item.serverError }}</span>
          <span class="meta-item">平均 {{ item.avgDuration }}ms</span>
        </div>
      </div>
    </div>

    <!-- 趋势图 -->
    <div class="chart-card card">
      <div class="chart-header">
        <h3 class="chart-title">📈 请求量趋势（近{{ trendDays }}天）</h3>
        <div class="chart-legend">
          <span class="legend-dot" style="background:#1890ff"></span>总请求
          <span class="legend-dot" style="background:#52c41a"></span>成功
          <span class="legend-dot" style="background:#f5222d"></span>5xx错误
        </div>
      </div>
      <div ref="trendChartRef" class="chart-container"></div>
    </div>

    <!-- 单接口用量 + IP分布 -->
    <div class="detail-row">
      <!-- 单接口用量表格 -->
      <div class="api-table-card card">
        <div class="card-header">
          <h3 class="card-title">🔌 单接口用量</h3>
          <div class="table-controls">
            <select v-model="apiSort" class="sort-select" @change="fetchByApi">
              <option value="count">按调用量</option>
              <option value="avg_duration">按平均耗时</option>
              <option value="error_rate">按错误率</option>
              <option value="server_error">按5xx次数</option>
            </select>
          </div>
        </div>
        <div class="table-wrapper">
          <table class="api-table">
            <thead>
              <tr>
                <th>接口</th>
                <th class="num">调用量</th>
                <th class="num">成功率</th>
                <th class="num">平均耗时</th>
                <th class="num">最大耗时</th>
                <th>状态</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="api in apiList"
                :key="api.route_key"
                :class="{ 'alert-row': hasApiAlert(api) }"
                @click="showApiDetail(api)"
              >
                <td class="api-name">
                  <span class="method-badge" :class="api.method.toLowerCase()">{{ api.method }}</span>
                  <span class="route-text">{{ api.route_key.replace(/^[A-Z]+\s/, '') }}</span>
                </td>
                <td class="num">{{ formatNumber(api.total_count) }}</td>
                <td class="num">
                  <span :class="api.success_rate >= 95 ? 'text-success' : api.success_rate >= 80 ? 'text-warning' : 'text-danger'">
                    {{ api.success_rate }}%
                  </span>
                </td>
                <td class="num" :class="{ 'text-warning': api.avg_duration >= 3000, 'text-danger': api.avg_duration >= 10000 }">
                  {{ api.avg_duration }}ms
                </td>
                <td class="num" :class="{ 'text-danger': api.max_duration >= 60000 }">
                  {{ api.max_duration >= 60000 ? (api.max_duration / 1000).toFixed(1) + 's' : api.max_duration + 'ms' }}
                </td>
                <td>
                  <span v-if="api.alerts.high_server_error" class="alert-tag error">高频500</span>
                  <span v-if="api.alerts.slow" class="alert-tag warning">超时</span>
                  <span v-if="api.alerts.high_error" class="alert-tag error">高错误率</span>
                  <span v-if="api.alerts.high_avg_duration" class="alert-tag warning">慢响应</span>
                  <span v-if="!hasApiAlert(api)" class="status-ok">正常</span>
                </td>
              </tr>
              <tr v-if="!apiList.length">
                <td colspan="6" class="empty-cell">暂无数据，接口调用后将自动统计</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="pagination" v-if="apiTotal > apiPageSize">
          <button class="page-btn" :disabled="apiPage <= 1" @click="changeApiPage(apiPage - 1)">上一页</button>
          <span class="page-info">{{ apiPage }} / {{ Math.ceil(apiTotal / apiPageSize) }}</span>
          <button class="page-btn" :disabled="apiPage >= Math.ceil(apiTotal / apiPageSize)" @click="changeApiPage(apiPage + 1)">下一页</button>
        </div>
      </div>

      <!-- IP分布 -->
      <div class="ip-card card">
        <div class="card-header">
          <h3 class="card-title">🌍 访客 IP 分布 TOP 10</h3>
        </div>
        <div class="ip-list">
          <div v-for="(item, index) in ipList" :key="item.ip" class="ip-item">
            <span class="ip-rank" :class="`rank-${index + 1}`">{{ index + 1 }}</span>
            <div class="ip-info">
              <div class="ip-address">{{ item.ip }}</div>
              <div class="ip-meta">{{ item.api_count }} 个接口 · {{ item.error_count }} 次错误</div>
            </div>
            <div class="ip-count">
              <span class="count-num">{{ formatNumber(item.request_count) }}</span>
              <span class="count-label">次请求</span>
            </div>
          </div>
          <div v-if="!ipList.length" class="empty-cell">暂无IP数据</div>
        </div>
      </div>
    </div>

    <!-- 异常告警详情 -->
    <div class="alerts-card card">
      <div class="card-header">
        <h3 class="card-title">🚨 异常告警中心</h3>
        <span class="alerts-badge" v-if="alertCount > 0">{{ alertCount }}</span>
      </div>
      <div class="alerts-grid">
        <!-- 高频500 -->
        <div class="alert-section">
          <h4 class="alert-section-title">🔴 高频 500 错误接口（近24h ≥3次）</h4>
          <div v-if="alerts.server_error_apis?.length" class="alert-list">
            <div v-for="item in alerts.server_error_apis" :key="item.route_key" class="alert-item danger">
              <span class="alert-route">{{ item.route_key }}</span>
              <span class="alert-count">{{ item.error_count }} 次</span>
            </div>
          </div>
          <div v-else class="no-alert">✓ 无高频500错误</div>
        </div>

        <!-- 流量暴增 -->
        <div class="alert-section">
          <h4 class="alert-section-title">🟠 流量暴增接口（近1h）</h4>
          <div v-if="alerts.spike_apis?.length" class="alert-list">
            <div v-for="item in alerts.spike_apis" :key="item.route_key" class="alert-item warning">
              <span class="alert-route">{{ item.route_key }}</span>
              <span class="alert-count">{{ item.last_hour_count }} 次/h</span>
            </div>
          </div>
          <div v-else class="no-alert">✓ 流量平稳</div>
        </div>

        <!-- 超时请求 -->
        <div class="alert-section">
          <h4 class="alert-section-title">🟡 超时请求（>1分钟，近7天）</h4>
          <div v-if="alerts.slow_requests?.length" class="alert-list">
            <div v-for="item in alerts.slow_requests.slice(0, 5)" :key="item.id" class="alert-item slow">
              <span class="alert-route">{{ item.route_key }}</span>
              <span class="alert-count">{{ (item.duration / 1000).toFixed(1) }}s</span>
            </div>
          </div>
          <div v-else class="no-alert">✓ 无超时请求</div>
        </div>

        <!-- 高错误率 -->
        <div class="alert-section">
          <h4 class="alert-section-title">🟣 高错误率接口（近24h ≥30%）</h4>
          <div v-if="alerts.high_error_rate_apis?.length" class="alert-list">
            <div v-for="item in alerts.high_error_rate_apis" :key="item.route_key" class="alert-item danger">
              <span class="alert-route">{{ item.route_key }}</span>
              <span class="alert-count">{{ item.error_rate }}%</span>
            </div>
          </div>
          <div v-else class="no-alert">✓ 错误率正常</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import * as echarts from 'echarts'
import {
  getApiUsageOverview,
  getApiUsageByApi,
  getApiUsageTrend,
  getApiUsageIpDistribution,
  getApiUsageAlerts
} from '../../utils/api'

const loading = ref(false)
const showAlertBanner = ref(true)
const activeTimeTab = ref('today')
const trendDays = ref(30)

const timeTabs = [
  { key: 'today', label: '今日' },
  { key: 'yesterday', label: '昨日' },
  { key: '7days', label: '近7天' },
  { key: '30days', label: '近30天' }
]

const overview = ref({})
const trendData = ref([])
const apiList = ref([])
const apiTotal = ref(0)
const apiPage = ref(1)
const apiPageSize = ref(10)
const apiSort = ref('count')
const ipList = ref([])
const alerts = ref({})

const trendChartRef = ref(null)
let trendChart = null

const timeStatsList = computed(() => [
  { key: 'today', label: '今日', value: overview.value.today?.count || 0, success: overview.value.today?.success || 0, serverError: overview.value.today?.server_error || 0, avgDuration: overview.value.today?.avg_duration || 0 },
  { key: 'yesterday', label: '昨日', value: overview.value.yesterday?.count || 0, success: overview.value.yesterday?.success || 0, serverError: overview.value.yesterday?.server_error || 0, avgDuration: overview.value.yesterday?.avg_duration || 0 },
  { key: '7days', label: '近7天', value: overview.value.last7days?.count || 0, success: overview.value.last7days?.success || 0, serverError: overview.value.last7days?.server_error || 0, avgDuration: overview.value.last7days?.avg_duration || 0 },
  { key: '30days', label: '近30天', value: overview.value.last30days?.count || 0, success: overview.value.last30days?.success || 0, serverError: overview.value.last30days?.server_error || 0, avgDuration: overview.value.last30days?.avg_duration || 0 }
])

const alertCount = computed(() => {
  return (alerts.value.server_error_apis?.length || 0) +
    (alerts.value.spike_apis?.length || 0) +
    (alerts.value.slow_requests?.length || 0) +
    (alerts.value.high_error_rate_apis?.length || 0)
})

const hasAlerts = computed(() => alertCount.value > 0 && showAlertBanner.value)

function hasApiAlert(api) {
  return api.alerts && (api.alerts.high_server_error || api.alerts.slow || api.alerts.high_error || api.alerts.high_avg_duration)
}

function formatNumber(num) {
  if (!num) return 0
  if (num >= 10000) return (num / 10000).toFixed(1) + 'w'
  if (num >= 1000) return (num / 1000).toFixed(1) + 'k'
  return num
}

function trendClass(current, previous) {
  if (!current || !previous) return ''
  if (current > previous) return 'up'
  if (current < previous) return 'down'
  return ''
}

function trendText(current, previous) {
  if (!current || !previous) return ''
  const diff = current - previous
  const pct = previous ? Math.abs(Math.round((diff / previous) * 100)) : 0
  if (diff > 0) return `↑${pct}%`
  if (diff < 0) return `↓${pct}%`
  return '持平'
}

function switchTimeTab(key) {
  activeTimeTab.value = key
  const daysMap = { today: 1, yesterday: 2, '7days': 7, '30days': 30 }
  fetchByApi()
}

async function fetchAllData() {
  loading.value = true
  try {
    await Promise.all([
      fetchOverview(),
      fetchTrend(),
      fetchByApi(),
      fetchIpDistribution(),
      fetchAlerts()
    ])
  } catch (e) {
    console.error('获取统计数据失败:', e)
  } finally {
    loading.value = false
  }
}

async function fetchOverview() {
  try {
    const res = await getApiUsageOverview()
    if (res.code === 200) overview.value = res.data
  } catch (e) { console.error(e) }
}

async function fetchTrend() {
  try {
    const res = await getApiUsageTrend(trendDays.value)
    if (res.code === 200) {
      trendData.value = res.data
      await nextTick()
      initTrendChart()
    }
  } catch (e) { console.error(e) }
}

async function fetchByApi() {
  try {
    const daysMap = { today: 1, yesterday: 2, '7days': 7, '30days': 30 }
    const res = await getApiUsageByApi({
      days: daysMap[activeTimeTab.value],
      page: apiPage.value,
      pageSize: apiPageSize.value,
      sort: apiSort.value
    })
    if (res.code === 200) {
      apiList.value = res.data.list
      apiTotal.value = res.data.total
    }
  } catch (e) { console.error(e) }
}

async function fetchIpDistribution() {
  try {
    const daysMap = { today: 1, yesterday: 2, '7days': 7, '30days': 30 }
    const res = await getApiUsageIpDistribution({ days: daysMap[activeTimeTab.value], limit: 10 })
    if (res.code === 200) ipList.value = res.data
  } catch (e) { console.error(e) }
}

async function fetchAlerts() {
  try {
    const res = await getApiUsageAlerts()
    if (res.code === 200) alerts.value = res.data
  } catch (e) { console.error(e) }
}

function changeApiPage(page) {
  apiPage.value = page
  fetchByApi()
}

function showApiDetail(api) {
  // 可扩展：点击展示该接口的详细日志
  console.log('接口详情:', api)
}

function initTrendChart() {
  if (!trendChartRef.value) return
  if (trendChart) trendChart.dispose()
  trendChart = echarts.init(trendChartRef.value)

  const dates = trendData.value.map(d => d.date.slice(5))
  const totals = trendData.value.map(d => d.total_count)
  const successes = trendData.value.map(d => d.success_count)
  const errors = trendData.value.map(d => d.server_error_count)

  trendChart.setOption({
    tooltip: { trigger: 'axis', backgroundColor: 'rgba(0,0,0,0.8)', borderWidth: 0, textStyle: { color: '#fff' } },
    grid: { left: '3%', right: '4%', bottom: '3%', top: '10%', containLabel: true },
    xAxis: {
      type: 'category', data: dates, boundaryGap: false,
      axisLine: { lineStyle: { color: '#ddd' } }, axisLabel: { color: '#999' }
    },
    yAxis: {
      type: 'value', minInterval: 1,
      axisLine: { show: false }, axisLabel: { color: '#999' },
      splitLine: { lineStyle: { color: '#f0f0f0', type: 'dashed' } }
    },
    series: [
      {
        name: '总请求', type: 'line', data: totals, smooth: true, symbol: 'circle', symbolSize: 6,
        lineStyle: { color: '#1890ff', width: 3 },
        itemStyle: { color: '#1890ff' },
        areaStyle: { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: 'rgba(24,144,255,0.25)' }, { offset: 1, color: 'rgba(24,144,255,0.02)' }
        ])}
      },
      {
        name: '成功', type: 'line', data: successes, smooth: true, symbol: 'circle', symbolSize: 4,
        lineStyle: { color: '#52c41a', width: 2 }, itemStyle: { color: '#52c41a' }
      },
      {
        name: '5xx错误', type: 'line', data: errors, smooth: true, symbol: 'circle', symbolSize: 4,
        lineStyle: { color: '#f5222d', width: 2 }, itemStyle: { color: '#f5222d' }
      }
    ]
  })
}

function handleResize() { trendChart?.resize() }

onMounted(() => {
  fetchAllData()
  window.addEventListener('resize', handleResize)
})
onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  trendChart?.dispose()
})
</script>

<style scoped>
.api-usage-page {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* 告警横幅 */
.alert-banner {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 20px;
  background: linear-gradient(135deg, #fff1f0, #fff7e6);
  border: 1px solid #ffccc7;
  border-radius: 10px;
  animation: slideDown 0.4s ease-out;
}
@keyframes slideDown {
  from { opacity: 0; transform: translateY(-10px); }
  to { opacity: 1; transform: translateY(0); }
}
.alert-icon { font-size: 22px; }
.alert-content { flex: 1; }
.alert-title { font-weight: 600; color: #cf1322; font-size: 14px; }
.alert-desc { font-size: 12px; color: #d46b08; margin-left: 8px; }
.alert-close {
  background: none; border: none; font-size: 20px; color: #999;
  cursor: pointer; padding: 0 4px; line-height: 1;
}
.alert-close:hover { color: #666; }

/* 时间切换 */
.time-tabs {
  display: flex;
  align-items: center;
  gap: 8px;
}
.time-tab {
  padding: 8px 18px;
  border: 1px solid var(--border-color);
  background: var(--card-bg);
  color: var(--text-secondary);
  border-radius: 20px;
  cursor: pointer;
  font-size: 13px;
  transition: all 0.25s;
}
.time-tab:hover { border-color: var(--primary-color); color: var(--primary-color); }
.time-tab.active {
  background: var(--primary-color);
  color: #fff;
  border-color: var(--primary-color);
  box-shadow: 0 2px 8px rgba(24,144,255,0.3);
}
.refresh-btn {
  margin-left: auto;
  padding: 8px 16px;
  border: 1px solid var(--border-color);
  background: var(--card-bg);
  color: var(--text-secondary);
  border-radius: 20px;
  cursor: pointer;
  font-size: 13px;
  transition: all 0.25s;
}
.refresh-btn:hover { border-color: var(--primary-color); color: var(--primary-color); }
.refresh-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.spinning { display: inline-block; animation: spin 1s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

/* 统计卡片 */
.stats-cards {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}
.stat-card {
  padding: 20px;
  position: relative;
  overflow: hidden;
  transition: transform 0.3s, box-shadow 0.3s;
}
.stat-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 8px 24px rgba(0,0,0,0.1);
}
.glow-blue::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px; background: linear-gradient(90deg, #1890ff, #36cfc9); }
.glow-green::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px; background: linear-gradient(90deg, #52c41a, #95de64); }
.glow-purple::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px; background: linear-gradient(90deg, #722ed1, #b37feb); }
.glow-orange::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px; background: linear-gradient(90deg, #fa8c16, #ffc53d); }
.stat-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
.stat-icon { font-size: 24px; }
.stat-trend { font-size: 12px; font-weight: 600; }
.stat-trend.up { color: #f5222d; }
.stat-trend.down { color: #52c41a; }
.stat-rate { font-size: 13px; font-weight: 600; color: #52c41a; }
.stat-value {
  font-size: 32px;
  font-weight: 700;
  color: var(--text-color);
  line-height: 1.1;
}
.stat-unit { font-size: 16px; font-weight: 400; color: var(--text-muted); margin-left: 4px; }
.stat-label { font-size: 13px; color: var(--text-muted); margin-top: 6px; }
.stat-sub { font-size: 12px; color: var(--text-muted); margin-top: 4px; }

/* 时间维度数据 */
.time-stats-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}
.time-stat-card {
  padding: 16px 20px;
  transition: transform 0.3s;
}
.time-stat-card:hover { transform: translateY(-2px); }
.time-stat-label { font-size: 13px; color: var(--text-muted); }
.time-stat-value { font-size: 24px; font-weight: 700; color: var(--text-color); margin: 6px 0; }
.time-stat-meta { display: flex; gap: 10px; font-size: 11px; }
.meta-item { color: var(--text-muted); }
.meta-item.success { color: #52c41a; }
.meta-item.error { color: #f5222d; }

/* 图表 */
.chart-card { padding: 20px; }
.chart-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.chart-title { font-size: 16px; font-weight: 600; color: var(--text-color); }
.chart-legend { display: flex; gap: 14px; font-size: 12px; color: var(--text-muted); align-items: center; }
.legend-dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; margin-right: 4px; }
.chart-container { height: 280px; }

/* 详情行 */
.detail-row {
  display: grid;
  grid-template-columns: 1.6fr 1fr;
  gap: 20px;
}
.card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.card-title { font-size: 16px; font-weight: 600; color: var(--text-color); }
.api-table-card { padding: 20px; }
.sort-select {
  padding: 6px 12px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background: var(--card-bg);
  color: var(--text-color);
  font-size: 13px;
  cursor: pointer;
  outline: none;
}
.table-wrapper { overflow-x: auto; }
.api-table { width: 100%; border-collapse: collapse; font-size: 13px; }
.api-table th {
  text-align: left;
  padding: 10px 12px;
  background: var(--bg-color);
  color: var(--text-muted);
  font-weight: 500;
  font-size: 12px;
  border-bottom: 1px solid var(--border-color);
}
.api-table th.num { text-align: right; }
.api-table td {
  padding: 12px;
  border-bottom: 1px solid var(--border-color);
  color: var(--text-color);
}
.api-table td.num { text-align: right; font-variant-numeric: tabular-nums; }
.api-table tbody tr { cursor: pointer; transition: background 0.2s; }
.api-table tbody tr:hover { background: var(--bg-color); }
.api-table tbody tr.alert-row { background: rgba(245,34,45,0.04); }
.api-table tbody tr.alert-row:hover { background: rgba(245,34,45,0.08); }
.api-name { display: flex; align-items: center; gap: 8px; max-width: 280px; }
.method-badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 700;
  color: #fff;
  flex-shrink: 0;
}
.method-badge.get { background: #52c41a; }
.method-badge.post { background: #1890ff; }
.method-badge.put { background: #faad14; }
.method-badge.delete { background: #f5222d; }
.route-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-family: 'SF Mono', Monaco, monospace;
  font-size: 12px;
}
.text-success { color: #52c41a; font-weight: 600; }
.text-warning { color: #faad14; font-weight: 600; }
.text-danger { color: #f5222d; font-weight: 600; }
.alert-tag {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 11px;
  font-weight: 500;
  margin-right: 4px;
}
.alert-tag.error { background: #fff1f0; color: #cf1322; }
.alert-tag.warning { background: #fff7e6; color: #d46b08; }
.status-ok { color: #52c41a; font-size: 12px; }
.empty-cell { text-align: center; padding: 40px; color: var(--text-muted); }

/* 分页 */
.pagination { display: flex; justify-content: center; align-items: center; gap: 12px; margin-top: 16px; }
.page-btn {
  padding: 6px 14px;
  border: 1px solid var(--border-color);
  background: var(--card-bg);
  color: var(--text-color);
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  transition: all 0.2s;
}
.page-btn:hover:not(:disabled) { border-color: var(--primary-color); color: var(--primary-color); }
.page-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.page-info { font-size: 13px; color: var(--text-muted); }

/* IP分布 */
.ip-card { padding: 20px; }
.ip-list { display: flex; flex-direction: column; gap: 10px; }
.ip-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  background: var(--bg-color);
  border-radius: 8px;
  transition: transform 0.2s;
}
.ip-item:hover { transform: translateX(4px); }
.ip-rank {
  width: 24px; height: 24px;
  border-radius: 6px;
  display: flex; align-items: center; justify-content: center;
  font-size: 12px; font-weight: 700; color: #fff;
  flex-shrink: 0;
}
.rank-1 { background: linear-gradient(135deg, #ffd700, #ffb700); }
.rank-2 { background: linear-gradient(135deg, #c0c0c0, #a0a0a0); }
.rank-3 { background: linear-gradient(135deg, #cd7f32, #b87333); }
.rank-4, .rank-5, .rank-6, .rank-7, .rank-8, .rank-9, .rank-10 { background: #999; }
.ip-info { flex: 1; min-width: 0; }
.ip-address { font-size: 13px; font-weight: 500; color: var(--text-color); font-family: monospace; }
.ip-meta { font-size: 11px; color: var(--text-muted); margin-top: 2px; }
.ip-count { text-align: right; flex-shrink: 0; }
.count-num { font-size: 16px; font-weight: 700; color: var(--text-color); }
.count-label { font-size: 11px; color: var(--text-muted); display: block; }

/* 告警中心 */
.alerts-card { padding: 20px; }
.alerts-badge {
  background: #f5222d;
  color: #fff;
  font-size: 12px;
  font-weight: 700;
  padding: 2px 10px;
  border-radius: 10px;
  animation: pulse 2s infinite;
}
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}
.alerts-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20px;
}
.alert-section-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-color);
  margin-bottom: 10px;
}
.alert-list { display: flex; flex-direction: column; gap: 6px; }
.alert-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 12px;
}
.alert-item.danger { background: #fff1f0; border-left: 3px solid #f5222d; }
.alert-item.warning { background: #fff7e6; border-left: 3px solid #faad14; }
.alert-item.slow { background: #f9f0ff; border-left: 3px solid #722ed1; }
.alert-route { color: var(--text-color); font-family: monospace; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 200px; }
.alert-count { font-weight: 700; flex-shrink: 0; margin-left: 8px; }
.alert-item.danger .alert-count { color: #cf1322; }
.alert-item.warning .alert-count { color: #d46b08; }
.alert-item.slow .alert-count { color: #531dab; }
.no-alert { font-size: 12px; color: #52c41a; padding: 8px 0; }

/* 响应式 */
@media (max-width: 1200px) {
  .stats-cards, .time-stats-row { grid-template-columns: repeat(2, 1fr); }
  .detail-row { grid-template-columns: 1fr; }
}
@media (max-width: 640px) {
  .stats-cards, .time-stats-row { grid-template-columns: 1fr; }
  .alerts-grid { grid-template-columns: 1fr; }
}
</style>
