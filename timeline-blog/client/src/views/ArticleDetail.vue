<template>
  <div class="article-detail-page" :class="{ 'dark-theme': isDark }">
    <!-- 阅读进度条 -->
    <div class="progress-bar">
      <div class="progress-fill" :style="{ width: readProgress + '%' }"></div>
    </div>
    <!-- 顶部导航 -->
    <header class="article-header">
      <div class="header-container">
        <button class="back-btn" @click="$router.back()">
          ← 返回
        </button>
        <h1 class="header-title">文章详情</h1>
        <div class="header-actions">
          <!-- <button class="action-btn" @click="toggleTheme" :title="isDark ? '浅色模式' : '深色模式'">
            {{ isDark ? '☀️' : '🌙' }}
          </button> -->
        </div>
      </div>
    </header>
    <!-- 文章内容 -->
    <main class="article-main" ref="articleContent">
      <article class="article-card card">
        <!-- 文章标题 -->
        <h1 class="article-title">{{ article?.title }}</h1>
        
        <!-- 文章信息 -->
        <div class="article-meta">
          <div class="meta-left" @click="goToAuthorHome" style="cursor: pointer;">
            <img :src="article?.author_avatar || defaultAvatar" class="author-avatar" alt="" />
            <div class="author-info">
              <span class="author-name">{{ article?.author_name }}</span>
              <span class="publish-date">{{ formatDate(article?.created_at) }}</span>
            </div>
          </div>
          <div class="meta-right">
            <span class="meta-item">
              <span class="meta-icon">👁</span>
              <span>{{ article?.view_count || 0 }} 阅读</span>
            </span>
            <span class="meta-item">
              <span class="meta-icon">💬</span>
              <span>{{ article?.comment_count || 0 }} 评论</span>
            </span>
            <span class="meta-item">
              <span class="meta-icon">📝</span>
              <span>{{ article?.word_count || 0 }} 字</span>
            </span>
          </div>
        </div>
        <!-- 文章正文 -->
        <div class="article-content" v-html="article?.content"></div>
        <!-- 文章操作 -->
        <div class="article-actions">
          <button class="action-btn-large" :class="{ active: isLiked }" @click="handleLike">
            <span class="action-icon">❤️</span>
            <span>{{ article?.like_count || 0 }}</span>
            <span class="action-text">喜欢</span>
          </button>
          <button class="action-btn-large" @click="handleShare">
            <span class="action-icon">🔗</span>
            <span>{{ article?.share_count || 0 }}</span>
            <span class="action-text">分享</span>
          </button>
        </div>
      </article>
      <!-- 评论区 -->
      <section class="comments-section card">
        <h3 class="comments-title">
          💬 评论 ({{ comments.length }})
        </h3>
        <!-- 评论输入框 -->
        <div v-if="userStore.isLoggedIn" class="comment-input-wrapper">
          <img :src="userStore.userInfo?.avatar || defaultAvatar" class="comment-avatar" alt="" />
          <div class="comment-input-box">
            <textarea 
              v-model="newComment" 
              class="comment-textarea" 
              placeholder="写下你的评论..."
              rows="3"
            ></textarea>
            <div class="comment-actions">
              <button class="btn btn-primary btn-sm" @click="submitComment" :disabled="!newComment.trim()">
                发表评论
              </button>
            </div>
          </div>
        </div>
        <div v-else class="comment-login-tip">
          请先 <router-link to="/login">登录</router-link> 后发表评论
        </div>
        <!-- 评论列表 -->
        <div class="comments-list">
          <div 
            v-for="comment in comments" 
            :key="comment.id" 
            class="comment-item fade-in"
          >
            <img :src="comment.user_avatar || defaultAvatar" class="comment-avatar" alt="" @click="goToUserHome(comment.user_id)" style="cursor: pointer;" />
            <div class="comment-content">
              <div class="comment-header">
                <span class="comment-user" @click="goToUserHome(comment.user_id)" style="cursor: pointer;">{{ comment.user_name }}</span>
                <span class="comment-time">{{ formatTime(comment.created_at) }}</span>
              </div>
              <p class="comment-text">{{ comment.content }}</p>
              <div class="comment-footer">
                <button 
                  v-if="userStore.isAdmin || userStore.userInfo?.id === comment.user_id"
                  class="comment-delete-btn" 
                  @click="handleDeleteComment(comment.id)"
                >
                  删除
                </button>
              </div>
            </div>
          </div>
          
          <div v-if="comments.length === 0" class="no-comments">
            暂无评论，快来抢沙发吧~
          </div>
        </div>
      </section>
    </main>
    <!-- 右下角悬浮按钮 -->
    <div class="floating-buttons">
      <button v-show="showBackTop" class="float-btn" @click="scrollToTop" title="回到顶部">
        ↑
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUserStore } from '../store/user'
import { useThemeStore } from '../store/theme'
import { getArticleDetail, getComments, createComment, deleteComment, likeArticle, shareArticle } from '../utils/api'
import { initSocket, joinArticleRoom, leaveArticleRoom, onNewComment, onDeleteComment, disconnectSocket } from '../utils/socket'
import { toast } from '../utils/toast'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const themeStore = useThemeStore()

const defaultAvatar = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj48Y2lyY2xlIGN4PSI1MCIgY3k9IjUwIiByPSI1MCIgZmlsbD0iIzE4OTBmZiIvPjx0ZXh0IHg9IjUwIiB5PSI2NSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0id2hpdGUiIGZvbnQtc2l6ZT0iNDAiPkE8L3RleHQ+PC9zdmc+'

const article = ref(null)
const comments = ref([])
const newComment = ref('')
const readProgress = ref(0)
const showBackTop = ref(false)
const isLiked = ref(false)
const articleContent = ref(null)

const isDark = computed(() => themeStore.isDark)

function toggleTheme() {
  themeStore.toggleTheme()
}

// 跳转到作者主页
function goToAuthorHome() {
  if (article.value?.author_id) {
    router.push(`/user/${article.value.author_id}`)
  }
}

// 跳转到用户主页
function goToUserHome(userId) {
  if (userId) {
    router.push(`/user/${userId}`)
  }
}

async function fetchArticle() {
  try {
    const res = await getArticleDetail(route.params.id)
    if (res.code === 200) {
      article.value = res.data
    }
  } catch (error) {
    console.error('获取文章详情失败:', error)
    toast.error('获取文章详情失败')
  }
}

async function fetchComments() {
  try {
    const res = await getComments(route.params.id, { page: 1, pageSize: 50 })
    if (res.code === 200) {
      comments.value = res.data.list
    }
  } catch (error) {
    console.error('获取评论失败:', error)
    toast.error('获取评论失败')
  }
}

async function submitComment() {
  if (!newComment.value.trim()) return
  
  try {
    const res = await createComment(route.params.id, { content: newComment.value })
    if (res.code === 200) {
      newComment.value = ''
      toast.success('评论发表成功')
      // 评论会通过WebSocket实时添加
    }
  } catch (error) {
    toast.error(error.response?.data?.message || '评论失败')
  }
}

async function handleDeleteComment(commentId) {
  if (!confirm('确定要删除这条评论吗？')) return
  
  try {
    const res = await deleteComment(commentId)
    if (res.code === 200) {
      toast.success('删除成功')
      // 评论会通过WebSocket实时删除
    }
  } catch (error) {
    toast.error('删除失败')
  }
}

async function handleLike() {
  if (!userStore.isLoggedIn) {
    toast.warning('请先登录')
    router.push('/login')
    return
  }
  
  try {
    const res = await likeArticle(route.params.id)
    if (res.code === 200) {
      isLiked.value = res.data.liked
      if (res.data.liked) {
        article.value.like_count++
        toast.success('点赞成功')
      } else {
        article.value.like_count--
        toast.info('已取消点赞')
      }
    }
  } catch (error) {
    toast.error('操作失败')
  }
}

async function handleShare() {
  try {
    await shareArticle(route.params.id)
    article.value.share_count++
    
    // 复制链接到剪贴板
    const url = window.location.href
    navigator.clipboard.writeText(url).then(() => {
      toast.success('链接已复制到剪贴板！')
    }).catch(() => {
      toast.success('分享成功！')
    })
  } catch (error) {
    console.error('分享失败:', error)
    toast.error('分享失败')
  }
}

function handleScroll() {
  const scrollTop = window.scrollY
  const scrollHeight = document.documentElement.scrollHeight - window.innerHeight
  
  // 计算阅读进度
  if (scrollHeight > 0) {
    readProgress.value = Math.min(100, Math.round((scrollTop / scrollHeight) * 100))
  }
  
  showBackTop.value = scrollTop > 300
}

function scrollToTop() {
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

function formatTime(dateStr) {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  const now = new Date()
  const diff = now - date
  
  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return Math.floor(diff / 60000) + '分钟前'
  if (diff < 86400000) return Math.floor(diff / 3600000) + '小时前'
  if (diff < 2592000000) return Math.floor(diff / 86400000) + '天前'
  
  return date.toLocaleDateString('zh-CN')
}

function setupSocket() {
  initSocket()
  joinArticleRoom(route.params.id)
  
  onNewComment((comment) => {
    comments.value.unshift(comment)
    if (article.value) {
      article.value.comment_count++
    }
  })
  
  onDeleteComment((commentId) => {
    comments.value = comments.value.filter(c => c.id !== commentId)
    if (article.value) {
      article.value.comment_count--
    }
  })
}

onMounted(() => {
  fetchArticle()
  fetchComments()
  setupSocket()
  window.addEventListener('scroll', handleScroll)
})

onUnmounted(() => {
  leaveArticleRoom(route.params.id)
  disconnectSocket()
  window.removeEventListener('scroll', handleScroll)
})
</script>

<style scoped>
.article-detail-page {
  min-height: 100vh;
  background-color: var(--bg-color);
  transition: background-color 0.3s;
}

/* 阅读进度条 */
.progress-bar {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: var(--border-color);
  z-index: 1000;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--primary-color), #00d4ff);
  transition: width 0.1s linear;
}

/* 顶部导航 */
.article-header {
  position: sticky;
  top: 0;
  z-index: 100;
  background: var(--card-bg);
  border-bottom: 1px solid var(--border-color);
  box-shadow: var(--shadow);
}

.header-container {
  max-width: 800px;
  margin: 0 auto;
  padding: 0 24px;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.back-btn {
  padding: 6px 12px;
  border: none;
  background: none;
  color: var(--text-color);
  cursor: pointer;
  font-size: 14px;
  border-radius: 4px;
  transition: background 0.3s;
}

.back-btn:hover {
  background: var(--bg-color);
}

.header-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-color);
}

.header-actions {
  display: flex;
  gap: 8px;
}

.action-btn {
  width: 36px;
  height: 36px;
  border: none;
  background: none;
  border-radius: 50%;
  cursor: pointer;
  font-size: 18px;
  transition: background 0.3s;
}

.action-btn:hover {
  background: var(--bg-color);
}

/* 文章主体 */
.article-main {
  max-width: 800px;
  margin: 0 auto;
  padding: 24px;
}

.article-card {
  padding: 40px;
  margin-bottom: 24px;
}

.article-title {
  font-size: 32px;
  font-weight: 700;
  color: var(--text-color);
  line-height: 1.3;
  margin-bottom: 24px;
}

.article-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 24px;
  margin-bottom: 24px;
  border-bottom: 1px solid var(--border-color);
  flex-wrap: wrap;
  gap: 16px;
}

.meta-left {
  display: flex;
  align-items: center;
  gap: 12px;
  transition: opacity 0.2s;
}

.meta-left:hover {
  opacity: 0.8;
}

.author-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  object-fit: cover;
}

.author-info {
  display: flex;
  flex-direction: column;
}

.author-name {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-color);
}

.publish-date {
  font-size: 13px;
  color: var(--text-muted);
  margin-top: 2px;
}

.meta-right {
  display: flex;
  gap: 24px;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  color: var(--text-secondary);
}

.meta-icon {
  font-size: 16px;
}

/* 文章内容 */
.article-content {
  font-size: 16px;
  line-height: 1.8;
  color: var(--text-color);
}

.article-content :deep(h1),
.article-content :deep(h2),
.article-content :deep(h3) {
  margin: 24px 0 16px;
  font-weight: 600;
  line-height: 1.4;
}

.article-content :deep(h2) {
  font-size: 24px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--border-color);
}

.article-content :deep(h3) {
  font-size: 20px;
}

.article-content :deep(p) {
  margin-bottom: 16px;
}

.article-content :deep(ul),
.article-content :deep(ol) {
  margin-bottom: 16px;
  padding-left: 24px;
}

.article-content :deep(li) {
  margin-bottom: 8px;
}

.article-content :deep(pre) {
  background: var(--bg-color);
  padding: 16px;
  border-radius: 8px;
  overflow-x: auto;
  margin-bottom: 16px;
}

.article-content :deep(code) {
  background: var(--bg-color);
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 14px;
  font-family: 'Consolas', 'Monaco', monospace;
}

.article-content :deep(pre code) {
  background: none;
  padding: 0;
}

.article-content :deep(img) {
  max-width: 100%;
  border-radius: 8px;
  margin: 16px 0;
}

.article-content :deep(blockquote) {
  border-left: 4px solid var(--primary-color);
  padding-left: 16px;
  margin: 16px 0;
  color: var(--text-secondary);
  background: var(--bg-color);
  padding: 12px 16px;
  border-radius: 0 8px 8px 0;
}

/* 文章操作 */
.article-actions {
  display: flex;
  justify-content: center;
  gap: 32px;
  padding-top: 32px;
  margin-top: 32px;
  border-top: 1px solid var(--border-color);
}

.action-btn-large {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 12px 24px;
  border: 1px solid var(--border-color);
  background: var(--card-bg);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s;
  min-width: 100px;
}

.action-btn-large:hover {
  border-color: var(--primary-color);
  transform: translateY(-2px);
}

.action-btn-large.active {
  background: rgba(245, 34, 45, 0.1);
  border-color: var(--error-color);
}

.action-icon {
  font-size: 24px;
}

.action-btn-large span:nth-child(2) {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-color);
}

.action-text {
  font-size: 12px;
  color: var(--text-muted);
}

/* 评论区 */
.comments-section {
  padding: 32px;
}

.comments-title {
  font-size: 20px;
  font-weight: 600;
  color: var(--text-color);
  margin-bottom: 24px;
}

.comment-input-wrapper {
  display: flex;
  gap: 12px;
  margin-bottom: 32px;
}

.comment-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  object-fit: cover;
  flex-shrink: 0;
  transition: opacity 0.2s;
}

.comment-avatar:hover {
  opacity: 0.8;
}

.comment-input-box {
  flex: 1;
}

.comment-textarea {
  width: 100%;
  padding: 12px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  resize: vertical;
  font-size: 14px;
  font-family: inherit;
  color: var(--text-color);
  background: var(--card-bg);
  outline: none;
  transition: border-color 0.3s;
}

.comment-textarea:focus {
  border-color: var(--primary-color);
}

.comment-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 8px;
}

.comment-login-tip {
  text-align: center;
  padding: 24px;
  color: var(--text-secondary);
  background: var(--bg-color);
  border-radius: 8px;
  margin-bottom: 32px;
}

.comments-list {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.comment-item {
  display: flex;
  gap: 12px;
}

.comment-content {
  flex: 1;
}

.comment-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
}

.comment-user {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-color);
  transition: color 0.2s;
}

.comment-user:hover {
  color: var(--primary-color);
}

.comment-time {
  font-size: 12px;
  color: var(--text-muted);
}

.comment-text {
  font-size: 14px;
  color: var(--text-color);
  line-height: 1.6;
  margin-bottom: 8px;
}

.comment-footer {
  display: flex;
  gap: 16px;
}

.comment-delete-btn {
  border: none;
  background: none;
  color: var(--text-muted);
  font-size: 12px;
  cursor: pointer;
  padding: 0;
}

.comment-delete-btn:hover {
  color: var(--error-color);
}

.no-comments {
  text-align: center;
  padding: 40px;
  color: var(--text-muted);
  font-size: 14px;
}

/* 悬浮按钮 */
.floating-buttons {
  position: fixed;
  right: 24px;
  bottom: 24px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  z-index: 99;
}

.float-btn {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: var(--primary-color);
  color: white;
  border: none;
  font-size: 20px;
  cursor: pointer;
  box-shadow: var(--shadow);
  transition: all 0.3s;
}

.float-btn:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-hover);
}

.btn {
  padding: 8px 20px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s;
  border: none;
}

.btn-primary {
  background: var(--primary-color);
  color: white;
}

.btn-primary:hover {
  opacity: 0.9;
}

.btn-sm {
  padding: 6px 14px;
  font-size: 13px;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* 响应式 */
@media (max-width: 768px) {
  .article-main {
    padding: 16px;
  }
  
  .article-card {
    padding: 24px 20px;
  }
  
  .article-title {
    font-size: 24px;
  }
  
  .article-meta {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .meta-right {
    gap: 16px;
  }
  
  .article-content {
    font-size: 15px;
  }
  
  .article-actions {
    gap: 16px;
  }
  
  .action-btn-large {
    min-width: 80px;
    padding: 10px 16px;
  }
  
  .comments-section {
    padding: 24px 20px;
  }
  
  .floating-buttons {
    right: 16px;
    bottom: 16px;
  }
}
</style>
