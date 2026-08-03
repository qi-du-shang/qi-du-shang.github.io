<template>
  <div class="profile-page">
    <!-- 顶部导航 -->
    <header class="navbar">
      <div class="nav-container">
        <router-link to="/" class="nav-logo">
          <span class="logo-icon">📅</span>
          时光轴博客
        </router-link>
        <div class="nav-right">
          <button class="nav-btn" @click="$router.push('/')">返回首页</button>
        </div>
      </div>
    </header>

    <main class="profile-main">
      <div class="profile-container">
        <!-- 个人信息卡片 -->
        <div class="profile-header card">
          <div class="avatar-section">
            <div class="avatar-wrapper">
              <img :src="userInfo?.avatar || defaultAvatar" class="avatar" alt="avatar" />
              <button class="avatar-edit-btn" @click="showAvatarModal = true" title="更换头像">
                📷
              </button>
            </div>
          </div>
          
          <div class="info-section">
            <div class="name-row">
              <h2 class="nickname">{{ userInfo?.nickname || '未设置昵称' }}</h2>
              <button class="btn btn-primary btn-sm" @click="showEditModal = true">
                编辑资料
              </button>
            </div>
            <p class="username">@{{ userInfo?.username }}</p>
            <p class="bio">{{ userInfo?.bio || '这个人很懒，什么都没写~' }}</p>
            
            <div class="stats-row">
              <div class="stat-item">
                <span class="stat-number">{{ userInfo?.articleCount || 0 }}</span>
                <span class="stat-label">文章</span>
              </div>
              <div class="stat-item">
                <span class="stat-number">{{ totalViews }}</span>
                <span class="stat-label">总阅读</span>
              </div>
              <div class="stat-item">
                <span class="stat-number">{{ userInfo?.role === 'admin' ? '管理员' : '普通用户' }}</span>
                <span class="stat-label">角色</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 我的文章 -->
        <div class="articles-section card">
          <div class="section-header">
            <h3>📝 我的文章</h3>
            <button v-if="userStore.isLoggedIn" class="btn btn-primary btn-sm" @click="showCreateModal = true">
              + 写文章
            </button>
          </div>
          
          <div class="articles-list">
            <div 
              v-for="article in myArticles" 
              :key="article.id" 
              class="article-item"
              @click="goToArticle(article.id)"
            >
              <div class="article-info">
                <h4 class="article-title">{{ article.title }}</h4>
                <p class="article-summary">{{ article.summary || article.content.substring(0, 80) + '...' }}</p>
                <div class="article-meta">
                  <span>{{ formatDate(article.created_at) }}</span>
                  <span class="meta-divider">·</span>
                  <span>👁 {{ article.view_count }}</span>
                  <span class="meta-divider">·</span>
                  <span>💬 {{ article.comment_count }}</span>
                  <span class="meta-divider">·</span>
                  <span :class="article.status === 'published' ? 'status-published' : 'status-draft'">
                    {{ article.status === 'published' ? '已发布' : '草稿' }}
                  </span>
                </div>
              </div>
              <div class="article-actions" @click.stop>
                <button class="action-btn" @click="editArticle(article)">编辑</button>
                <button class="action-btn delete" @click="handleDeleteArticle(article.id)">删除</button>
              </div>
            </div>
            
            <div v-if="myArticles.length === 0" class="empty-state">
              <p>还没有文章，快去写一篇吧~</p>
            </div>
          </div>
        </div>
      </div>
    </main>

    <!-- 编辑资料弹窗 -->
    <div v-if="showEditModal" class="modal-overlay" @click.self="showEditModal = false">
      <div class="modal card">
        <div class="modal-header">
          <h3>编辑资料</h3>
          <button class="modal-close" @click="showEditModal = false">×</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>昵称</label>
            <input type="text" v-model="editForm.nickname" class="input" placeholder="请输入昵称" />
          </div>
          <div class="form-group">
            <label>个人简介</label>
            <textarea v-model="editForm.bio" class="input" rows="4" placeholder="介绍一下自己吧"></textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-default" @click="showEditModal = false">取消</button>
          <button class="btn btn-primary" @click="saveProfile" :disabled="saving">
            {{ saving ? '保存中...' : '保存' }}
          </button>
        </div>
      </div>
    </div>

    <!-- 头像更换弹窗 -->
    <div v-if="showAvatarModal" class="modal-overlay" @click.self="showAvatarModal = false">
      <div class="modal card">
        <div class="modal-header">
          <h3>更换头像</h3>
          <button class="modal-close" @click="showAvatarModal = false">×</button>
        </div>
        <div class="modal-body">
          <p class="modal-tip">输入头像图片URL：</p>
          <input type="text" v-model="avatarUrl" class="input" placeholder="请输入图片链接" />
          <div class="avatar-preview">
            <img :src="avatarUrl || defaultAvatar" class="preview-avatar" alt="预览" />
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-default" @click="showAvatarModal = false">取消</button>
          <button class="btn btn-primary" @click="saveAvatar" :disabled="saving">
            {{ saving ? '保存中...' : '保存' }}
          </button>
        </div>
      </div>
    </div>

    <!-- 写文章弹窗 -->
    <div v-if="showCreateModal" class="modal-overlay article-modal" @click.self="showCreateModal = false">
      <div class="modal card">
        <div class="modal-header">
          <h3>{{ editingArticle ? '编辑文章' : '写文章' }}</h3>
          <button class="modal-close" @click="closeArticleModal">×</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>文章标题</label>
            <input type="text" v-model="articleForm.title" class="input" placeholder="请输入文章标题" />
          </div>
          <div class="form-group">
            <label>文章摘要</label>
            <input type="text" v-model="articleForm.summary" class="input" placeholder="简短介绍一下文章内容" />
          </div>
          <div class="form-group">
            <label>文章内容（支持HTML）</label>
            <textarea v-model="articleForm.content" class="input article-textarea" rows="12" placeholder="在这里写下你的文章..."></textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-default" @click="closeArticleModal">取消</button>
          <button class="btn btn-default" @click="saveArticle('draft')" :disabled="saving">
            保存草稿
          </button>
          <button class="btn btn-primary" @click="saveArticle('published')" :disabled="saving">
            {{ saving ? '发布中...' : '发布文章' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '../store/user'
import { getUserInfo, updateUserInfo, getArticleList, createArticle, updateArticle, deleteArticle } from '../utils/api'

const router = useRouter()
const userStore = useUserStore()

const defaultAvatar = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj48Y2lyY2xlIGN4PSI1MCIgY3k9IjUwIiByPSI1MCIgZmlsbD0iIzE4OTBmZiIvPjx0ZXh0IHg9IjUwIiB5PSI2NSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0id2hpdGUiIGZvbnQtc2l6ZT0iNDAiPkE8L3RleHQ+PC9zdmc+'

const userInfo = ref(null)
const myArticles = ref([])
const showEditModal = ref(false)
const showAvatarModal = ref(false)
const showCreateModal = ref(false)
const saving = ref(false)
const avatarUrl = ref('')
const editingArticle = ref(null)

const editForm = ref({
  nickname: '',
  bio: ''
})

const articleForm = ref({
  title: '',
  summary: '',
  content: ''
})

const totalViews = computed(() => {
  return myArticles.value.reduce((sum, a) => sum + (a.view_count || 0), 0)
})

async function fetchUserInfo() {
  try {
    const res = await getUserInfo()
    if (res.code === 200) {
      userInfo.value = res.data
      userStore.updateUserInfo(res.data)
    }
  } catch (error) {
    console.error('获取用户信息失败:', error)
  }
}

async function fetchMyArticles() {
  try {
    const res = await getArticleList({
      userId: userStore.userInfo?.id,
      page: 1,
      pageSize: 50
    })
    if (res.code === 200) {
      myArticles.value = res.data.list
    }
  } catch (error) {
    console.error('获取我的文章失败:', error)
  }
}

function openEditModal() {
  editForm.value = {
    nickname: userInfo.value?.nickname || '',
    bio: userInfo.value?.bio || ''
  }
  showEditModal.value = true
}

async function saveProfile() {
  saving.value = true
  try {
    const res = await updateUserInfo({
      nickname: editForm.value.nickname,
      bio: editForm.value.bio
    })
    if (res.code === 200) {
      alert('保存成功！')
      showEditModal.value = false
      fetchUserInfo()
    } else {
      alert(res.message || '保存失败')
    }
  } catch (error) {
    alert(error.response?.data?.message || '保存失败')
  } finally {
    saving.value = false
  }
}

async function saveAvatar() {
  if (!avatarUrl.value.trim()) {
    alert('请输入头像URL')
    return
  }
  
  saving.value = true
  try {
    const res = await updateUserInfo({ avatar: avatarUrl.value.trim() })
    if (res.code === 200) {
      alert('头像更新成功！')
      showAvatarModal.value = false
      avatarUrl.value = ''
      fetchUserInfo()
    } else {
      alert(res.message || '保存失败')
    }
  } catch (error) {
    alert(error.response?.data?.message || '保存失败')
  } finally {
    saving.value = false
  }
}

function editArticle(article) {
  editingArticle.value = article
  articleForm.value = {
    title: article.title,
    summary: article.summary || '',
    content: article.content
  }
  showCreateModal.value = true
}

function closeArticleModal() {
  showCreateModal.value = false
  editingArticle.value = null
  articleForm.value = {
    title: '',
    summary: '',
    content: ''
  }
}

async function saveArticle(status) {
  if (!articleForm.value.title.trim()) {
    alert('请输入文章标题')
    return
  }
  if (!articleForm.value.content.trim()) {
    alert('请输入文章内容')
    return
  }
  
  saving.value = true
  try {
    let res
    if (editingArticle.value) {
      res = await updateArticle(editingArticle.value.id, {
        ...articleForm.value,
        status
      })
    } else {
      res = await createArticle({
        ...articleForm.value,
        status
      })
    }
    
    if (res.code === 200) {
      alert(status === 'published' ? '发布成功！' : '草稿保存成功！')
      closeArticleModal()
      fetchMyArticles()
      fetchUserInfo()
    } else {
      alert(res.message || '保存失败')
    }
  } catch (error) {
    alert(error.response?.data?.message || '保存失败')
  } finally {
    saving.value = false
  }
}

async function handleDeleteArticle(id) {
  if (!confirm('确定要删除这篇文章吗？此操作不可恢复。')) return
  
  try {
    const res = await deleteArticle(id)
    if (res.code === 200) {
      alert('删除成功！')
      fetchMyArticles()
      fetchUserInfo()
    } else {
      alert(res.message || '删除失败')
    }
  } catch (error) {
    alert(error.response?.data?.message || '删除失败')
  }
}

function goToArticle(id) {
  router.push(`/article/${id}`)
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return date.toLocaleDateString('zh-CN')
}

onMounted(() => {
  fetchUserInfo()
  fetchMyArticles()
})
</script>

<style scoped>
.profile-page {
  min-height: 100vh;
  background-color: var(--bg-color);
}

.navbar {
  background: var(--card-bg);
  border-bottom: 1px solid var(--border-color);
  position: sticky;
  top: 0;
  z-index: 100;
}

.nav-container {
  max-width: 1000px;
  margin: 0 auto;
  padding: 0 24px;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.nav-logo {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 18px;
  font-weight: 700;
  color: var(--primary-color);
  text-decoration: none;
}

.nav-btn {
  padding: 6px 16px;
  border: 1px solid var(--border-color);
  background: transparent;
  color: var(--text-color);
  border-radius: 20px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.3s;
}

.nav-btn:hover {
  border-color: var(--primary-color);
  color: var(--primary-color);
}

.profile-main {
  max-width: 1000px;
  margin: 0 auto;
  padding: 24px;
}

.profile-header {
  display: flex;
  gap: 32px;
  padding: 32px;
  margin-bottom: 24px;
}

.avatar-section {
  flex-shrink: 0;
}

.avatar-wrapper {
  position: relative;
}

.avatar {
  width: 120px;
  height: 120px;
  border-radius: 50%;
  object-fit: cover;
  border: 4px solid var(--primary-color);
}

.avatar-edit-btn {
  position: absolute;
  bottom: 0;
  right: 0;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: var(--primary-color);
  color: white;
  border: 3px solid var(--card-bg);
  cursor: pointer;
  font-size: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.info-section {
  flex: 1;
}

.name-row {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 8px;
}

.nickname {
  font-size: 28px;
  font-weight: 700;
  color: var(--text-color);
}

.username {
  font-size: 14px;
  color: var(--text-muted);
  margin-bottom: 12px;
}

.bio {
  font-size: 15px;
  color: var(--text-secondary);
  line-height: 1.6;
  margin-bottom: 24px;
}

.stats-row {
  display: flex;
  gap: 40px;
}

.stat-item {
  display: flex;
  flex-direction: column;
}

.stat-number {
  font-size: 24px;
  font-weight: 700;
  color: var(--primary-color);
}

.stat-label {
  font-size: 13px;
  color: var(--text-muted);
  margin-top: 4px;
}

.articles-section {
  padding: 24px 32px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--border-color);
}

.section-header h3 {
  font-size: 20px;
  font-weight: 600;
  color: var(--text-color);
}

.articles-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.article-item {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 20px;
  background: var(--bg-color);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s;
}

.article-item:hover {
  background: var(--card-bg);
  box-shadow: var(--shadow);
}

.article-info {
  flex: 1;
}

.article-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-color);
  margin-bottom: 8px;
}

.article-summary {
  font-size: 14px;
  color: var(--text-secondary);
  line-height: 1.5;
  margin-bottom: 12px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.article-meta {
  font-size: 13px;
  color: var(--text-muted);
  display: flex;
  align-items: center;
  gap: 8px;
}

.meta-divider {
  color: var(--border-color);
}

.status-published {
  color: var(--success-color);
}

.status-draft {
  color: var(--warning-color);
}

.article-actions {
  display: flex;
  gap: 8px;
  margin-left: 16px;
  flex-shrink: 0;
}

.action-btn {
  padding: 4px 12px;
  border: 1px solid var(--border-color);
  background: transparent;
  color: var(--text-secondary);
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
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

.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: var(--text-muted);
}

/* 弹窗样式 */
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

.article-modal .modal {
  max-width: 700px;
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

.modal-tip {
  font-size: 14px;
  color: var(--text-secondary);
  margin-bottom: 12px;
}

.avatar-preview {
  text-align: center;
  margin-top: 20px;
}

.preview-avatar {
  width: 100px;
  height: 100px;
  border-radius: 50%;
  object-fit: cover;
  border: 3px solid var(--primary-color);
}

.article-textarea {
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 14px;
  line-height: 1.6;
  resize: vertical;
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
  .profile-main {
    padding: 16px;
  }
  
  .profile-header {
    flex-direction: column;
    text-align: center;
    padding: 24px 20px;
  }
  
  .name-row {
    justify-content: center;
  }
  
  .stats-row {
    justify-content: center;
  }
  
  .articles-section {
    padding: 20px 16px;
  }
  
  .article-item {
    flex-direction: column;
  }
  
  .article-actions {
    margin-left: 0;
    margin-top: 12px;
  }
}
</style>
