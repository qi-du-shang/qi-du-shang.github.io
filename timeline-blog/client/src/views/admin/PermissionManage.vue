<template>
  <div class="permission-manage-page">
    <!-- 标签页 -->
    <div class="tabs card">
      <button 
        class="tab-btn" 
        :class="{ active: activeTab === 'roles' }"
        @click="activeTab = 'roles'"
      >
        角色管理
      </button>
      <button 
        class="tab-btn" 
        :class="{ active: activeTab === 'permissions' }"
        @click="activeTab = 'permissions'"
      >
        权限列表
      </button>
    </div>

    <!-- 角色管理 -->
    <div v-if="activeTab === 'roles'" class="roles-section">
      <div class="action-bar card">
        <h3>角色列表</h3>
        <button class="btn btn-primary" @click="showRoleModal = true">
          + 新建角色
        </button>
      </div>

      <div class="roles-grid">
        <div v-for="role in roles" :key="role.id" class="role-card card">
          <div class="role-header">
            <h4 class="role-name">{{ role.name }}</h4>
            <div class="role-actions">
              <button class="action-btn" @click="editRole(role)">编辑</button>
              <button class="action-btn delete" @click="handleDeleteRole(role.id)">删除</button>
            </div>
          </div>
          <p class="role-desc">{{ role.description || '暂无描述' }}</p>
          <div class="role-permissions">
            <span class="perm-label">权限：</span>
            <div class="perm-tags">
              <span 
                v-for="perm in getRolePermissions(role.id)" 
                :key="perm.id" 
                class="perm-tag"
              >
                {{ perm.name }}
              </span>
              <span v-if="getRolePermissions(role.id).length === 0" class="no-perm">暂无权限</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 权限列表 -->
    <div v-if="activeTab === 'permissions'" class="permissions-section">
      <div class="action-bar card">
        <h3>权限列表</h3>
      </div>

      <div class="permission-table card">
        <table class="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>权限名称</th>
              <th>权限代码</th>
              <th>描述</th>
              <th>创建时间</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="perm in permissions" :key="perm.id" class="fade-in">
              <td>{{ perm.id }}</td>
              <td>{{ perm.name }}</td>
              <td><code>{{ perm.code }}</code></td>
              <td>{{ perm.description || '-' }}</td>
              <td>{{ formatDate(perm.created_at) }}</td>
            </tr>
            <tr v-if="permissions.length === 0">
              <td colspan="5" class="empty-cell">暂无数据</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- 新建/编辑角色弹窗 -->
    <div v-if="showRoleModal" class="modal-overlay" @click.self="closeRoleModal">
      <div class="modal card">
        <div class="modal-header">
          <h3>{{ editingRole ? '编辑角色' : '新建角色' }}</h3>
          <button class="modal-close" @click="closeRoleModal">×</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>角色名称</label>
            <input type="text" v-model="roleForm.name" class="input" placeholder="请输入角色名称" />
          </div>
          <div class="form-group">
            <label>角色描述</label>
            <input type="text" v-model="roleForm.description" class="input" placeholder="请输入角色描述" />
          </div>
          <div class="form-group">
            <label>分配权限</label>
            <div class="permission-checkboxes">
              <label 
                v-for="perm in permissions" 
                :key="perm.id" 
                class="perm-checkbox"
              >
                <input 
                  type="checkbox" 
                  :value="perm.id" 
                  v-model="roleForm.permissions"
                />
                <span class="perm-name">{{ perm.name }}</span>
                <span class="perm-code">({{ perm.code }})</span>
              </label>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-default" @click="closeRoleModal">取消</button>
          <button class="btn btn-primary" @click="saveRole" :disabled="saving">
            {{ saving ? '保存中...' : '保存' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { getRoles, createRole, updateRole, deleteRole, getPermissions, getRolePermissions as fetchRolePermissions } from '../../utils/api'

const activeTab = ref('roles')
const roles = ref([])
const permissions = ref([])
const rolePermissionsMap = ref({})
const showRoleModal = ref(false)
const editingRole = ref(null)
const saving = ref(false)

const roleForm = ref({
  name: '',
  description: '',
  permissions: []
})

async function fetchRoles() {
  try {
    const res = await getRoles()
    if (res.code === 200) {
      roles.value = res.data
      // 获取每个角色的权限
      for (const role of res.data) {
        fetchRolePerms(role.id)
      }
    }
  } catch (error) {
    console.error('获取角色列表失败:', error)
  }
}

async function fetchRolePerms(roleId) {
  try {
    const res = await fetchRolePermissions(roleId)
    if (res.code === 200) {
      rolePermissionsMap.value[roleId] = res.data
    }
  } catch (error) {
    console.error('获取角色权限失败:', error)
  }
}

async function fetchPermissions() {
  try {
    const res = await getPermissions()
    if (res.code === 200) {
      permissions.value = res.data
    }
  } catch (error) {
    console.error('获取权限列表失败:', error)
  }
}

function getRolePermissions(roleId) {
  return rolePermissionsMap.value[roleId] || []
}

function editRole(role) {
  editingRole.value = role
  const perms = getRolePermissions(role.id).map(p => p.id)
  roleForm.value = {
    name: role.name,
    description: role.description || '',
    permissions: perms
  }
  showRoleModal.value = true
}

function closeRoleModal() {
  showRoleModal.value = false
  editingRole.value = null
  roleForm.value = {
    name: '',
    description: '',
    permissions: []
  }
}

async function saveRole() {
  if (!roleForm.value.name.trim()) {
    alert('请输入角色名称')
    return
  }
  
  saving.value = true
  try {
    let res
    if (editingRole.value) {
      res = await updateRole(editingRole.value.id, {
        name: roleForm.value.name,
        description: roleForm.value.description,
        permissions: roleForm.value.permissions
      })
    } else {
      res = await createRole({
        name: roleForm.value.name,
        description: roleForm.value.description,
        permissions: roleForm.value.permissions
      })
    }
    
    if (res.code === 200) {
      alert('保存成功！')
      closeRoleModal()
      fetchRoles()
    } else {
      alert(res.message || '保存失败')
    }
  } catch (error) {
    alert(error.response?.data?.message || '保存失败')
  } finally {
    saving.value = false
  }
}

async function handleDeleteRole(roleId) {
  if (!confirm('确定要删除这个角色吗？')) return
  
  try {
    const res = await deleteRole(roleId)
    if (res.code === 200) {
      alert('删除成功！')
      fetchRoles()
    } else {
      alert(res.message || '删除失败')
    }
  } catch (error) {
    alert(error.response?.data?.message || '删除失败')
  }
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return date.toLocaleDateString('zh-CN')
}

onMounted(() => {
  fetchRoles()
  fetchPermissions()
})
</script>

<style scoped>
.permission-manage-page {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* 标签页 */
.tabs {
  display: flex;
  gap: 0;
  padding: 0;
  overflow: hidden;
}

.tab-btn {
  flex: 1;
  padding: 16px 24px;
  border: none;
  background: transparent;
  font-size: 15px;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.3s;
  border-bottom: 2px solid transparent;
}

.tab-btn:hover {
  color: var(--primary-color);
}

.tab-btn.active {
  color: var(--primary-color);
  font-weight: 600;
  border-bottom-color: var(--primary-color);
  background: rgba(24, 144, 255, 0.05);
}

/* 操作栏 */
.action-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
}

.action-bar h3 {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-color);
}

/* 角色卡片网格 */
.roles-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 20px;
}

.role-card {
  padding: 20px;
}

.role-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;
}

.role-name {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-color);
}

.role-actions {
  display: flex;
  gap: 8px;
}

.action-btn {
  padding: 4px 10px;
  border: 1px solid var(--border-color);
  background: transparent;
  color: var(--text-secondary);
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  transition: all 0.3s;
}

.action-btn:hover {
  border-color: var(--primary-color);
  color: var(--primary-color);
}

.action-btn.delete:hover {
  border-color: var(--error-color);
  color: var(--error-color);
}

.role-desc {
  font-size: 14px;
  color: var(--text-secondary);
  margin-bottom: 16px;
  line-height: 1.5;
}

.role-permissions {
  padding-top: 16px;
  border-top: 1px solid var(--border-color);
}

.perm-label {
  font-size: 13px;
  color: var(--text-muted);
  display: block;
  margin-bottom: 8px;
}

.perm-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.perm-tag {
  padding: 2px 10px;
  background: rgba(24, 144, 255, 0.1);
  color: var(--primary-color);
  border-radius: 12px;
  font-size: 12px;
}

.no-perm {
  font-size: 13px;
  color: var(--text-muted);
}

/* 权限表格 */
.permission-table {
  overflow: hidden;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
}

.data-table th {
  background: var(--bg-color);
  padding: 14px 16px;
  text-align: left;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-secondary);
  border-bottom: 1px solid var(--border-color);
}

.data-table td {
  padding: 14px 16px;
  font-size: 14px;
  color: var(--text-color);
  border-bottom: 1px solid var(--border-color);
}

.data-table tbody tr:hover {
  background: var(--bg-color);
}

.data-table code {
  background: var(--bg-color);
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 13px;
  font-family: 'Consolas', 'Monaco', monospace;
  color: var(--primary-color);
}

.empty-cell {
  text-align: center;
  padding: 60px 20px;
  color: var(--text-muted);
}

/* 弹窗 */
.modal-overlay {
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
  padding: 20px;
}

.modal {
  width: 100%;
  max-width: 500px;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid var(--border-color);
}

.modal-header h3 {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-color);
}

.modal-close {
  width: 32px;
  height: 32px;
  border: none;
  background: none;
  font-size: 24px;
  color: var(--text-muted);
  cursor: pointer;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal-close:hover {
  background: var(--bg-color);
}

.modal-body {
  padding: 24px;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: var(--text-color);
  margin-bottom: 8px;
}

.permission-checkboxes {
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-height: 250px;
  overflow-y: auto;
  padding: 12px;
  background: var(--bg-color);
  border-radius: 8px;
}

.perm-checkbox {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  padding: 6px 8px;
  border-radius: 4px;
  transition: background 0.2s;
}

.perm-checkbox:hover {
  background: var(--card-bg);
}

.perm-checkbox input[type="checkbox"] {
  width: 16px;
  height: 16px;
  cursor: pointer;
}

.perm-name {
  font-size: 14px;
  color: var(--text-color);
}

.perm-code {
  font-size: 12px;
  color: var(--text-muted);
  font-family: 'Consolas', 'Monaco', monospace;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 24px;
  border-top: 1px solid var(--border-color);
}

/* 响应式 */
@media (max-width: 768px) {
  .roles-grid {
    grid-template-columns: 1fr;
  }
  
  .data-table {
    font-size: 12px;
  }
  
  .data-table th,
  .data-table td {
    padding: 10px 8px;
  }
}
</style>
