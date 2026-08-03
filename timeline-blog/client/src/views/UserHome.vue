<template>
  <div class="user-home-page">
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

    <main class="user-main">
      <div class="user-container">
        <!-- 用户信息卡片 -->
        <div class="user-header card">
          <div class="avatar-section">
            <img :src="userInfo?.avatar || defaultAvatar" class="avatar" alt="avatar" />
          </div>
          <div class="info-section">
            <h2 class="nickname">{{ userInfo?.nickname || userInfo?.username }}</h2>
            <p class="username">@{{ userInfo?.username }}</p>
            <p class="bio">{{ userInfo?.bio || '这个人很神秘，什么都没留下~' }}</p>
            <div class="stats-row">
              <div class="stat-item">
                <span class="stat-number">{{ articles.length }}</span>
                <span class="stat-label">文章</span>
              </div>
              <div class="stat-item">
                <span class="stat-number">{{ totalViews }}</span>
                <span class="stat-label">总阅读</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 用户文章 -->
        <div class="articles-section card">
          <div class="section-header">
            <h3>📝 TA的文章</h3>
          </div>
          
          <div class="articles-list">
            <div 
              v-for="article in articles" 
              :key="article.id" 
              class="article-item"
              @click="goToArticle(article.id)"
            >
              <h4 class="article-title">{{ article.title }}</h4>
              <p class="article-summary">{{ article.summary || article.content.substring(0, 100) + '...' }}</p>
              <div class="article-meta">
                <span>{{ formatDate(article.created_at) }}</span>
                <span class="meta-divider">·</span>
                <span>👁 {{ article.view_count }}</span>
                <span class="meta-divider">·</span>
                <span>💬 {{ article.comment_count }}</span>
                <span class="meta-divider">·</span>
                <span>❤️ {{ article.like_count }}</span>
              </div>
            </div>
            
            <div v-if="articles.length === 0" class="empty-state">
              <p>TA还没有发布文章~</p>
            </div>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getArticleList } from '../utils/api'

const route = useRoute()
const router = useRouter()

const defaultAvatar = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj48Y2lyY2xlIGN4PSI1MCIgY3k9IjUwIiByPSI1MCIgZmlsbD0iIzE4OTBmZiIvPjx0ZXh0IHg9IjUwIiB5PSI2NSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0id2hpdGUiIGZvbnQtc2l6ZT0iNDAiPkE8L3RleHQ+PC9zdmc+'

const userInfo = ref(null)
const articles = ref([])

const totalViews = computed(() => {
  return articles.value.reduce((sum, a) => sum + (a.view_count || 0), 0)
})

async function fetchUserArticles() {
  try {
    const res = await getArticleList({
      userId: route.params.id,
      page: 1,
      pageSize: 50
    })
    if (res.code === 200) {
      articles.value = res.data.list
      if (res.data.list.length > 0) {
        userInfo.value = {
          id: res.data.list[0].author_id,
          username: res.data.list[0].author_name,
          nickname: res.data.list[0].author_name,
          avatar: res.data.list[0].author_avatar
        }
      }
    }
  } catch (error) {
    console.error('获取用户文章失败:', error)
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
  fetchUserArticles()
})
</script>

<style scoped>
.user-home-page {
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

.user-main {
  max-width: 1000px;
  margin: 0 auto;
  padding: 24px;
}

.user-header {
  display: flex;
  gap: 32px;
  padding: 32px;
  margin-bottom: 24px;
}

.avatar-section {
  flex-shrink: 0;
}

.avatar {
  width: 100px;
  height: 100px;
  border-radius: 50%;
  object-fit: cover;
  border: 3px solid var(--primary-color);
}

.info-section {
  flex: 1;
}

.nickname {
  font-size: 24px;
  font-weight: 700;
  color: var(--text-color);
  margin-bottom: 4px;
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
  margin-bottom: 20px;
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
  font-size: 22px;
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
  padding: 20px;
  background: var(--bg-color);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s;
}

.article-item:hover {
  background: var(--card-bg);
  box-shadow: var(--shadow);
  transform: translateY(-2px);
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

.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: var(--text-muted);
}

@media (max-width: 768px) {
  .user-main {
    padding: 16px;
  }
  
  .user-header {
    flex-direction: column;
    text-align: center;
    padding: 24px 20px;
  }
  
  .stats-row {
    justify-content: center;
  }
  
  .articles-section {
    padding: 20px 16px;
  }
}
</style>
