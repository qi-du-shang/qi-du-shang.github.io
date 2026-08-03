<template>
  <div class="article-manage-page">
    <!-- 操作栏 -->
    <div class="action-bar card">
      <div class="search-box">
        <input 
          type="text" 
          v-model="searchKeyword" 
          class="input" 
          placeholder="搜索文章标题..."
          @keyup.enter="fetchArticles"
        />
        <button class="btn btn-primary" @click="fetchArticles">搜索</button>
      </div>
      <button class="btn btn-primary" @click="showCreateModal = true">
        + 新建文章
      </button>
    </div>

    <!-- 文章列表 -->
    <div class="article-table card">
      <table class="data-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>标题</th>
            <th>作者</th>
            <th>状态</th>
            <th>阅读量</th>
            <th>评论数</th>
            <th>发布时间</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="article in articles" :key="article.id" class="fade-in">
            <td>{{ article.id }}</td>
            <td class="title-cell">
              <span class="article-title" @click="viewArticle(article.id)">{{ article.title }}</span>
            </td>
            <td>{{ article.author_name }}</td>
            <td>
              <span 
                class="status-tag"
                :class="article.status === 'published' ? 'published' : 'draft'"
              >
                {{ article.status === 'published' ? '已发布' : '草稿' }}
              </span>
            </td>
            <td>{{ article.view_count }}</td>
            <td>{{ article.comment_count || 0 }}</td>
            <td>{{ formatDate(article.created_at) }}</td>
            <td class="action-cell">
              <button class="action-btn" @click="editArticle(article)">编辑</button>
              <button class="action-btn delete" @click="handleDelete(article.id)">删除</button>
            </td>
          </tr>
          <tr v-if="articles.length === 0">
            <td colspan="8" class="empty-cell">暂无数据</td>
          </tr>
        </tbody>
      </table>
      
      <!-- 分页 -->
      <div class="pagination">
        <button 
          class="page-btn" 
          :disabled="page <= 1"
          @click="changePage(page - 1)"
        >
          上一页
        </button>
        <span class="page-info">第 {{ page }} 页 / 共 {{ totalPages }} 页</span>
        <button 
          class="page-btn" 
          :disabled="page >= totalPages"
          @click="changePage(page + 1)"
        >
          下一页
        </button>
      </div>
    </div>

    <!-- 新建/编辑文章弹窗 -->
    <div v-if="showCreateModal" class="modal-overlay article-modal" @click.self="closeModal">
      <div class="modal card">
        <div class="modal-header">
          <h3>{{ editingArticle ? '编辑文章' : '新建文章' }}</h3>
          <button class="modal-close" @click="closeModal">×</button>
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
          <button class="btn btn-default" @click="closeModal">取消</button>
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
import { getArticleList, createArticle, updateArticle, deleteArticle } from '../../utils/api'

const router = useRouter()

const articles = ref([])
const searchKeyword = ref('')
const page = ref(1)
const pageSize = ref(10)
const total = ref(0)
const loading = ref(false)
const showCreateModal = ref(false)
const editingArticle = ref(null)
const saving = ref(false)

const articleForm = ref({
  title: '',
  summary: '',
  content: ''
})

const totalPages = computed(() => Math.ceil(total.value / pageSize.value))

async function fetchArticles() {
  loading.value = true
  try {
    const res = await getArticleList({
      page: page.value,
      pageSize: pageSize.value,
      keyword: searchKeyword.value
    })
    if (res.code === 200) {
      articles.value = res.data.list
      total.value = res.data.total
    }
  } catch (error) {
    console.error('获取文章列表失败:', error)
  } finally {
    loading.value = false
  }
}

function changePage(newPage) {
  if (newPage < 1 || newPage > totalPages.value) return
  page.value = newPage
  fetchArticles()
}

function viewArticle(id) {
  router.push(`/article/${id}`)
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

function closeModal() {
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
      alert(status === 'published' ? '发布成功！' : '保存成功！')
      closeModal()
      fetchArticles()
    } else {
      alert(res.message || '保存失败')
    }
  } catch (error) {
    alert(error.response?.data?.message || '保存失败')
  } finally {
    saving.value = false
  }
}

async function handleDelete(id) {
  if (!confirm('确定要删除这篇文章吗？此操作不可恢复。')) return
  
  try {
    const res = await deleteArticle(id)
    if (res.code === 200) {
      alert('删除成功！')
      fetchArticles()
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
  fetchArticles()
})
</script>

<style scoped>
.article-manage-page {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* 操作栏 */
.action-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  flex-wrap: wrap;
  gap: 16px;
}

.search-box {
  display: flex;
  gap: 8px;
  flex: 1;
  max-width: 400px;
}

.search-box .input {
  flex: 1;
}

/* 表格 */
.article-table {
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

.title-cell {
  max-width: 250px;
}

.article-title {
  color: var(--primary-color);
  cursor: pointer;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  display: block;
}

.article-title:hover {
  text-decoration: underline;
}

.status-tag {
  display: inline-block;
  padding: 2px 10px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

.status-tag.published {
  background: rgba(82, 196, 26, 0.1);
  color: var(--success-color);
}

.status-tag.draft {
  background: rgba(250, 173, 20, 0.1);
  color: var(--warning-color);
}

.action-cell {
  white-space: nowrap;
}

.action-btn {
  padding: 4px 12px;
  border: 1px solid var(--border-color);
  background: transparent;
  color: var(--text-secondary);
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
  margin-right: 8px;
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

.empty-cell {
  text-align: center;
  padding: 60px 20px;
  color: var(--text-muted);
}

/* 分页 */
.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 16px;
  padding: 20px;
}

.page-btn {
  padding: 6px 16px;
  border: 1px solid var(--border-color);
  background: var(--card-bg);
  color: var(--text-color);
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
  transition: all 0.3s;
}

.page-btn:hover:not(:disabled) {
  border-color: var(--primary-color);
  color: var(--primary-color);
}

.page-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.page-info {
  font-size: 13px;
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
  max-width: 700px;
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
  .action-bar {
    flex-direction: column;
    align-items: stretch;
  }
  
  .search-box {
    max-width: none;
  }
  
  .data-table {
    font-size: 12px;
  }
  
  .data-table th,
  .data-table td {
    padding: 10px 8px;
  }
  
  .title-cell {
    max-width: 120px;
  }
}
</style>
