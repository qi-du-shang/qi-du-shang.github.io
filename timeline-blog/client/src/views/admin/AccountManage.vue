<template>
  <div class="account-manage">
    <!-- 顶部工具栏 -->
    <div class="toolbar card">
      <div class="toolbar-left">
        <input
          v-model="keyword"
          class="input search-input"
          placeholder="搜索用户名 / 昵称"
          @keyup.enter="handleSearch"
        />
        <button class="btn btn-primary" @click="handleSearch">搜索</button>
      </div>
      <div class="toolbar-right">
        <span class="total-text">共 {{ total }} 个账号</span>
      </div>
    </div>

    <!-- 用户表格 -->
    <div class="table-card card">
      <div v-if="loading" class="empty-state">加载中...</div>
      <div v-else-if="list.length === 0" class="empty-state">
        <p>没有找到匹配的用户</p>
      </div>
      <table v-else class="user-table">
        <thead>
          <tr>
            <th>用户</th>
            <th>角色</th>
            <th>状态</th>
            <th>注册时间</th>
            <th>最后登录</th>
            <th class="action-col">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="u in list" :key="u.id">
            <td>
              <div class="user-cell">
                <img :src="u.avatar || defaultAvatar" class="cell-avatar" alt="" />
                <div class="cell-userinfo">
                  <span class="cell-nickname">{{ u.nickname || u.username }}</span>
                  <span class="cell-username">@{{ u.username }} #{{ u.id }}</span>
                </div>
              </div>
            </td>
            <td>
              <span class="role-tag" :class="u.role === 'admin' ? 'role-admin' : 'role-user'">
                {{ u.role === 'admin' ? '管理员' : '普通用户' }}
              </span>
            </td>
            <td>
              <span class="status-tag" :class="u.status === 1 ? 'status-disabled' : 'status-normal'">
                {{ u.status === 1 ? '已禁用' : '正常' }}
              </span>
            </td>
            <td class="time-cell">{{ formatDate(u.created_at) }}</td>
            <td class="time-cell">{{ formatDate(u.last_login_at) }}</td>
            <td class="action-col">
              <button class="mini-btn" @click="openResetModal(u)">重置密码</button>
              <button
                v-if="u.id !== currentUserId"
                class="mini-btn"
                :class="u.status === 1 ? 'btn-enable' : 'btn-disable'"
                @click="toggleStatus(u)"
              >
                {{ u.status === 1 ? '启用' : '禁用' }}
              </button>
            </td>
          </tr>
        </tbody>
      </table>

      <!-- 分页 -->
      <div class="pagination" v-if="total > pageSize">
        <button class="page-btn" :disabled="page <= 1" @click="changePage(page - 1)">上一页</button>
        <span class="page-info">第 {{ page }} / {{ totalPages }} 页</span>
        <button class="page-btn" :disabled="page >= totalPages" @click="changePage(page + 1)">下一页</button>
      </div>
    </div>

    <!-- 重置密码弹窗 -->
    <div v-if="showResetModal" class="modal-overlay" @click.self="showResetModal = false">
      <div class="modal card">
        <div class="modal-header">
          <h3>重置「{{ resetTarget?.nickname || resetTarget?.username }}」的密码</h3>
          <button class="modal-close" @click="showResetModal = false">×</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>新密码</label>
            <input type="text" v-model="newPwd" class="input" placeholder="至少6位" />
          </div>
          <div class="form-group">
            <label>确认新密码</label>
            <input type="text" v-model="newPwdConfirm" class="input" placeholder="再次输入新密码" />
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-default" @click="showResetModal = false">取消</button>
          <button class="btn btn-primary" @click="confirmReset" :disabled="resetting">
            {{ resetting ? '提交中...' : '确认重置' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { getUserList, resetUserPassword, updateUserStatus } from '../../utils/api'
import { toast } from '../../utils/toast'
import { useUserStore } from '../../store/user'

const userStore = useUserStore()
const currentUserId = computed(() => userStore.userInfo?.id)

const list = ref([])
const loading = ref(false)
const keyword = ref('')
const page = ref(1)
const pageSize = ref(10)
const total = ref(0)
const totalPages = computed(() => Math.ceil(total.value / pageSize.value) || 1)

const showResetModal = ref(false)
const resetTarget = ref(null)
const newPwd = ref('')
const newPwdConfirm = ref('')
const resetting = ref(false)

const defaultAvatar = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj48Y2lyY2xlIGN4PSI1MCIgY3k9IjUwIiByPSI1MCIgZmlsbD0iIzE4OTBmZiIvPjx0ZXh0IHg9IjUwIiB5PSI2NSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0id2hpdGUiIGZvbnQtc2l6ZT0iNDAiPkE8L3RleHQ+PC9zdmc+'

async function fetchList() {
  loading.value = true
  try {
    const res = await getUserList({
      page: page.value,
      pageSize: pageSize.value,
      keyword: keyword.value
    })
    if (res.code === 200) {
      list.value = res.data.list
      total.value = res.data.total
    }
  } catch (e) {
    toast.error('获取用户列表失败')
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

function openResetModal(u) {
  resetTarget.value = u
  newPwd.value = ''
  newPwdConfirm.value = ''
  showResetModal.value = true
}

async function confirmReset() {
  if (!newPwd.value || newPwd.value.length < 6) {
    toast.warning('新密码至少6位')
    return
  }
  if (newPwd.value !== newPwdConfirm.value) {
    toast.warning('两次密码不一致')
    return
  }
  resetting.value = true
  try {
    const res = await resetUserPassword(resetTarget.value.id, newPwd.value)
    if (res.code === 200) {
      toast.success('密码重置成功')
      showResetModal.value = false
    } else {
      toast.error(res.message || '重置失败')
    }
  } catch (e) {
    toast.error(e.response?.data?.message || '重置失败')
  } finally {
    resetting.value = false
  }
}

async function toggleStatus(u) {
  const next = u.status === 1 ? 0 : 1
  const tip = next === 1 ? `确定禁用「${u.nickname || u.username}」吗？该用户将无法登录。` : `确定启用「${u.nickname || u.username}」吗？`
  if (!confirm(tip)) return
  try {
    const res = await updateUserStatus(u.id, next)
    if (res.code === 200) {
      toast.success(res.message)
      fetchList()
    } else {
      toast.error(res.message || '操作失败')
    }
  } catch (e) {
    toast.error(e.response?.data?.message || '操作失败')
  }
}

function formatDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleString('zh-CN', { hour12: false })
}

onMounted(() => {
  fetchList()
})
</script>

<style scoped>
.account-manage {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.toolbar {
  padding: 16px 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.toolbar-left {
  display: flex;
  gap: 12px;
  align-items: center;
}

.search-input {
  width: 260px;
}

.total-text {
  font-size: 13px;
  color: var(--text-muted);
}

.table-card {
  padding: 0;
  overflow: hidden;
}

.user-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}

.user-table th,
.user-table td {
  padding: 14px 20px;
  text-align: left;
  border-bottom: 1px solid var(--border-color);
}

.user-table th {
  background: var(--bg-color);
  color: var(--text-secondary);
  font-weight: 600;
  font-size: 13px;
}

.user-table tbody tr:hover {
  background: rgba(24, 144, 255, 0.03);
}

.user-cell {
  display: flex;
  align-items: center;
  gap: 12px;
}

.cell-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  object-fit: cover;
}

.cell-userinfo {
  display: flex;
  flex-direction: column;
}

.cell-nickname {
  font-weight: 600;
  color: var(--text-color);
}

.cell-username {
  font-size: 12px;
  color: var(--text-muted);
}

.role-tag,
.status-tag {
  display: inline-block;
  padding: 2px 10px;
  border-radius: 10px;
  font-size: 12px;
}

.role-admin {
  background: rgba(24, 144, 255, 0.1);
  color: #1890ff;
}

.role-user {
  background: rgba(0, 0, 0, 0.05);
  color: var(--text-secondary);
}

.status-normal {
  background: rgba(82, 196, 26, 0.1);
  color: #52c41a;
}

.status-disabled {
  background: rgba(255, 77, 79, 0.1);
  color: #ff4d4f;
}

.time-cell {
  color: var(--text-muted);
  font-size: 13px;
}

.action-col {
  white-space: nowrap;
}

.mini-btn {
  padding: 4px 10px;
  margin-right: 6px;
  font-size: 12px;
  border: 1px solid var(--border-color);
  background: transparent;
  color: var(--text-secondary);
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
}

.mini-btn:hover {
  border-color: var(--primary-color);
  color: var(--primary-color);
}

.mini-btn.btn-disable:hover {
  border-color: #ff4d4f;
  color: #ff4d4f;
}

.mini-btn.btn-enable:hover {
  border-color: #52c41a;
  color: #52c41a;
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

.page-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.page-info {
  font-size: 13px;
  color: var(--text-secondary);
}

/* 弹窗样式（复用全局约定） */
.modal-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.modal {
  width: 100%;
  max-width: 460px;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 18px 20px;
  border-bottom: 1px solid var(--border-color);
}

.modal-header h3 {
  font-size: 16px;
  margin: 0;
}

.modal-close {
  width: 30px; height: 30px;
  border: none; background: none;
  font-size: 22px;
  color: var(--text-muted);
  cursor: pointer;
}

.modal-body {
  padding: 20px;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 14px 20px;
  border-top: 1px solid var(--border-color);
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  font-size: 13px;
  margin-bottom: 6px;
  color: var(--text-color);
}

.input {
  width: 100%;
  padding: 9px 12px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background: var(--bg-color);
  color: var(--text-color);
  font-size: 14px;
  outline: none;
  box-sizing: border-box;
}

.input:focus {
  border-color: var(--primary-color);
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

.btn-default {
  background: transparent;
  border: 1px solid var(--border-color);
  color: var(--text-secondary);
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: var(--text-muted);
}
</style>
