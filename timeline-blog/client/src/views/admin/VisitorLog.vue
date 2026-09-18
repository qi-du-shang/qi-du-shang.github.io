<template>
  <div class="visitor-log">
    <!-- 统计卡片 -->
    <div class="stats-grid">
      <div class="stat-card card">
        <div class="stat-label">今日访问</div>
        <div class="stat-value">{{ stats.today_visits || 0 }}</div>
      </div>
      <div class="stat-card card">
        <div class="stat-label">今日独立 IP</div>
        <div class="stat-value">{{ stats.today_unique_ips || 0 }}</div>
      </div>
      <div class="stat-card card">
        <div class="stat-label">今日登录访客</div>
        <div class="stat-value">{{ stats.today_login_users || 0 }}</div>
      </div>
      <div class="stat-card card">
        <div class="stat-label">累计访问</div>
        <div class="stat-value">{{ stats.total_visits || 0 }}</div>
      </div>
      <div class="stat-card card">
        <div class="stat-label">累计独立 IP</div>
        <div class="stat-value">{{ stats.total_unique_ips || 0 }}</div>
      </div>
      <div class="stat-card card">
        <div class="stat-label">当前在线</div>
        <div class="stat-value online">{{ online.total || 0 }}</div>
      </div>
    </div>

    <!-- 7日趋势 -->
    <div class="trend-card card">
      <h3 class="card-title">近7天访问趋势</h3>
      <div class="trend-chart">
        <div v-for="d in trend" :key="d.date" class="trend-col">
          <div class="trend-bar-wrap">
            <div class="trend-bar" :style="{ height: barHeight(d.visits) + '%' }"></div>
          </div>
          <div class="trend-value">{{ d.visits }}</div>
          <div class="trend-date">{{ d.date.slice(5) }}</div>
        </div>
        <div v-if="trend.length === 0" class="empty-state">暂无数据</div>
      </div>
    </div>

    <!-- 筛选工具栏 -->
    <div class="toolbar card">
      <input
        v-model="filter.keyword"
        class="input"
        placeholder="搜索 IP / 用户 / 路径"
        @keyup.enter="handleSearch"
      />
      <select v-model="filter.userType" class="select" @change="handleSearch">
        <option value="all">全部访客</option>
        <option value="login">仅登录用户</option>
        <option value="guest">仅游客</option>
      </select>
      <button class="btn btn-primary" @click="handleSearch">查询</button>
    </div>

    <!-- 记录表格 -->
    <div class="table-card card">
      <div v-if="loading" class="empty-state">加载中...</div>
      <div v-else-if="list.length === 0" class="empty-state">
        <p>暂无访客记录</p>
      </div>
      <table v-else class="visitor-table">
        <thead>
          <tr>
            <th>时间</th>
            <th>IP</th>
            <th>访客</th>
            <th>设备</th>
            <th>浏览器 / 系统</th>
            <th>访问路径</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="v in list" :key="v.id">
            <td class="time-cell">{{ formatTime(v.created_at) }}</td>
            <td class="ip-cell">{{ v.ip || '—' }}</td>
            <td>
              <div v-if="v.user_id" class="user-cell">
                <span class="user-name">{{ v.nickname || v.username || '已登录用户' }}</span>
                <span class="user-tag">登录</span>
              </div>
              <span v-else class="guest-tag">游客</span>
            </td>
            <td>
              <span class="device-tag" :class="'dev-' + (v.device || 'PC').toLowerCase()">
                {{ deviceIcon(v.device) }} {{ v.device || 'PC' }}
              </span>
            </td>
            <td class="time-cell">{{ v.browser }} / {{ v.os }}</td>
            <td class="path-cell">{{ v.path }}</td>
          </tr>
        </tbody>
      </table>

      <div class="pagination" v-if="total > pageSize">
        <button class="page-btn" :disabled="page <= 1" @click="changePage(page - 1)">上一页</button>
        <span class="page-info">第 {{ page }} / {{ totalPages }} 页（共 {{ total }} 条）</span>
        <button class="page-btn" :disabled="page >= totalPages" @click="changePage(page + 1)">下一页</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue'
import { getVisitorLogs, getVisitorStats } from '../../utils/api'
import { onOnlineStats, queryOnlineStats } from '../../utils/socket'

const list = ref([])
const loading = ref(false)
const total = ref(0)
const page = ref(1)
const pageSize = ref(20)
const totalPages = computed(() => Math.ceil(total.value / pageSize.value) || 1)

const filter = reactive({
  keyword: '',
  userType: 'all'
})

const stats = ref({})
const trend = ref([])
const online = ref({ total: 0, members: 0, guests: 0 })

async function fetchStats() {
  try {
    const res = await getVisitorStats()
    if (res.code === 200) {
      stats.value = res.data
      trend.value = res.data.trend || []
    }
  } catch (e) {
    // 静默
  }
}

async function fetchList() {
  loading.value = true
  try {
    const res = await getVisitorLogs({
      page: page.value,
      pageSize: pageSize.value,
      keyword: filter.keyword,
      userType: filter.userType
    })
    if (res.code === 200) {
      list.value = res.data.list
      total.value = res.data.total
    }
  } catch (e) {
    // 静默
  } finally {
    loading.value = false
  }
}

function handleSearch() {
  page.value = 1
  fetchList()
}

function changePage(p) {
  if (p < 1 || p > totalPages.value) return
  page.value = p
  fetchList()
}

function barHeight(v) {
  const max = Math.max(...trend.value.map(t => t.visits), 1)
  return Math.max(8, (v / max) * 100)
}

function deviceIcon(d) {
  if (d === 'Mobile') return '📱'
  if (d === 'Tablet') return '📲'
  return '💻'
}

function formatTime(t) {
  if (!t) return '—'
  return new Date(t).toLocaleString('zh-CN', { hour12: false })
}

onMounted(() => {
  fetchStats()
  fetchList()
  onOnlineStats((s) => { online.value = s })
  queryOnlineStats()
})
</script>

<style scoped>
.visitor-log {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 16px;
}

.stat-card {
  padding: 18px 20px;
}

.stat-label {
  font-size: 13px;
  color: var(--text-muted);
  margin-bottom: 8px;
}

.stat-value {
  font-size: 28px;
  font-weight: 700;
  color: var(--text-color);
}

.stat-value.online {
  color: #52c41a;
}

.trend-card {
  padding: 20px 24px;
}

.card-title {
  margin: 0 0 16px;
  font-size: 16px;
}

.trend-chart {
  display: flex;
  align-items: flex-end;
  gap: 12px;
  height: 140px;
}

.trend-col {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.trend-bar-wrap {
  flex: 1;
  width: 100%;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}

.trend-bar {
  width: 60%;
  background: linear-gradient(180deg, #1890ff 0%, rgba(24, 144, 255, 0.3) 100%);
  border-radius: 4px 4px 0 0;
  min-height: 4px;
}

.trend-value {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-color);
}

.trend-date {
  font-size: 11px;
  color: var(--text-muted);
}

.toolbar {
  padding: 14px 20px;
  display: flex;
  gap: 12px;
  align-items: center;
}

.toolbar .input {
  flex: 1;
  max-width: 320px;
}

.select {
  padding: 8px 12px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background: var(--card-bg);
  color: var(--text-color);
  outline: none;
}

.table-card {
  padding: 0;
  overflow: hidden;
}

.visitor-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.visitor-table th,
.visitor-table td {
  padding: 12px 16px;
  text-align: left;
  border-bottom: 1px solid var(--border-color);
}

.visitor-table th {
  background: var(--bg-color);
  color: var(--text-secondary);
  font-weight: 600;
}

.time-cell {
  color: var(--text-secondary);
  font-size: 12px;
}

.ip-cell {
  font-family: monospace;
  font-size: 12px;
}

.user-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}

.user-name {
  font-weight: 500;
  color: var(--text-color);
}

.user-tag {
  font-size: 11px;
  background: rgba(24, 144, 255, 0.1);
  color: #1890ff;
  padding: 1px 8px;
  border-radius: 8px;
}

.guest-tag {
  font-size: 12px;
  color: var(--text-muted);
}

.device-tag {
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 4px;
  background: var(--bg-color);
}

.path-cell {
  font-family: monospace;
  font-size: 12px;
  color: var(--text-secondary);
  max-width: 220px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 12px;
  padding: 16px;
}

.page-btn {
  padding: 6px 14px;
  border: 1px solid var(--border-color);
  background: var(--card-bg);
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
}

.page-btn:disabled { opacity: 0.5; cursor: not-allowed; }

.page-info { font-size: 13px; color: var(--text-secondary); }

.input {
  padding: 9px 12px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background: var(--bg-color);
  color: var(--text-color);
  outline: none;
}

.btn {
  padding: 8px 18px;
  border-radius: 6px;
  font-size: 14px;
  border: none;
  cursor: pointer;
}

.btn-primary {
  background: var(--primary-color);
  color: white;
}

.empty-state {
  text-align: center;
  padding: 40px 20px;
  color: var(--text-muted);
}
</style>
