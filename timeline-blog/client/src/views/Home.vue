<template>
  <div class="home-page">
    <!-- 顶部导航栏 -->
    <header class="navbar">
      <div class="nav-container">
        <div class="nav-left">
          <router-link to="/" class="nav-logo">
            <span class="logo-icon">📅</span>
            时光轴博客
          </router-link>
        </div>
        
        <div class="nav-center">
          <div class="search-box">
            <input 
              type="text" 
              v-model="searchKeyword" 
              class="search-input" 
              placeholder="搜索文章或用户..."
              @keyup.enter="handleSearch"
              @input="handleSearchInput"
            />
            <button class="search-btn" @click="handleSearch">
              🔍
            </button>
          </div>
          <!-- 搜索下拉建议 -->
          <div v-if="showSearchDropdown && searchKeyword.trim()" class="search-dropdown">
            <div class="search-section">
              <div class="search-section-title">
                <span>👤 用户</span>
                <span v-if="searchResults.users.length > 0" class="search-more" @click="goToSearchResult('user')">查看更多</span>
              </div>
              <div v-if="searchResults.users.length > 0" class="search-user-list">
                <div 
                  v-for="user in searchResults.users.slice(0, 3)" 
                  :key="user.id" 
                  class="search-user-item"
                  @click="goToUserHome(user.id)"
                >
                  <img :src="user.avatar || defaultAvatar" class="search-user-avatar" alt="" />
                  <div class="search-user-info">
                    <span class="search-user-name">{{ user.nickname || user.username }}</span>
                    <span class="search-user-stats">{{ user.follower_count }} 粉丝</span>
                  </div>
                </div>
              </div>
              <div v-else class="search-empty">暂无用户</div>
            </div>
            <div class="search-section">
              <div class="search-section-title">
                <span>📝 文章</span>
                <span v-if="searchResults.articles.length > 0" class="search-more" @click="goToSearchResult('article')">查看更多</span>
              </div>
              <div v-if="searchResults.articles.length > 0" class="search-article-list">
                <div 
                  v-for="article in searchResults.articles.slice(0, 3)" 
                  :key="article.id" 
                  class="search-article-item"
                  @click="goToArticle(article.id)"
                >
                  <span class="search-article-title">{{ article.title }}</span>
                  <span class="search-article-views">👁 {{ article.view_count }}</span>
                </div>
              </div>
              <div v-else class="search-empty">暂无文章</div>
            </div>
          </div>
        </div>
        
        <div class="nav-right">
          <template v-if="userStore.isLoggedIn">
            <router-link to="/profile" class="nav-user">
              <img :src="userStore.userInfo?.avatar || defaultAvatar" class="nav-avatar" alt="avatar" />
              <span class="nav-username">{{ userStore.userInfo?.nickname || userStore.userInfo?.username }}</span>
            </router-link>
            <button v-if="userStore.isAdmin" class="nav-btn" @click="$router.push('/admin')">
              管理后台
            </button>
            <button class="nav-btn" @click="handleLogout">退出</button>
          </template>
          <template v-else>
            <button class="nav-btn" @click="$router.push('/login')">登录</button>
          </template>
        </div>
      </div>
    </header>
    <!-- 主体内容 -->
    <main class="main-content">
      <div class="content-wrapper">
        <!-- 左侧用户信息栏 -->
        <aside class="sidebar-left">
          <div class="user-card card">
            <div class="user-avatar-wrapper" @click="handleAvatarClick">
              <img :src="userStore.userInfo?.avatar || defaultAvatar" class="user-avatar" alt="avatar" />
            </div>
            <h3 class="user-name" @click="handleAvatarClick" style="cursor: pointer;">
              {{ userStore.userInfo?.nickname || '游客' }}
            </h3>
            <p class="user-bio">{{ userStore.userInfo?.bio || '欢迎来到时光轴博客' }}</p>
            <div class="user-stats">
              <div class="stat-item">
                <span class="stat-number">{{ stats.articleCount || 0 }}</span>
                <span class="stat-label">文章</span>
              </div>
              <div class="stat-item">
                <span class="stat-number">{{ stats.totalViews || 0 }}</span>
                <span class="stat-label">阅读</span>
              </div>
              <div v-if="userStore.isLoggedIn" class="stat-item">
                <span class="stat-number">{{ userStore.userInfo?.follower_count || 0 }}</span>
                <span class="stat-label">粉丝</span>
              </div>
              <div v-if="userStore.isLoggedIn" class="stat-item">
                <span class="stat-number">{{ userStore.userInfo?.following_count || 0 }}</span>
                <span class="stat-label">关注</span>
              </div>
            </div>
            <router-link v-if="userStore.isLoggedIn" to="/profile" class="btn btn-primary btn-sm profile-btn">
              个人中心
            </router-link>
          </div>
        </aside>
        <!-- 中间时光轴 -->
        <section class="timeline-section">
          <div class="timeline-header">
            <h2>📜 时光轴</h2>
            <p class="timeline-subtitle">记录每一个精彩瞬间</p>
          </div>
          
          <div class="timeline-container" ref="timelineContainer">
            <div class="timeline-line"></div>
            
            <div 
              v-for="(article, index) in articles" 
              :key="article.id"
              :id="`article-${article.id}`"
              class="timeline-item"
              :class="{ 'left': index % 2 === 0, 'right': index % 2 !== 0 }"
            >
              <div class="timeline-dot"></div>
              <div class="timeline-card card fade-in" @click="goToArticle(article.id)">
                <div class="card-date">
                  <span class="date-day">{{ formatDay(article.created_at) }}</span>
                  <span class="date-month">{{ formatMonth(article.created_at) }}</span>
                </div>
                <h3 class="card-title">{{ article.title }}</h3>
                <p class="card-summary">{{ article.summary || article.content.substring(0, 100) + '...' }}</p>
                <div class="card-meta">
                  <span class="meta-item">👁 {{ article.view_count }}</span>
                  <span class="meta-item">💬 {{ article.comment_count }}</span>
                  <span class="meta-item">❤️ {{ article.like_count }}</span>
                </div>
                <div class="card-author" @click.stop="goToUserHome(article.author_id)">
                  <img :src="article.author_avatar || defaultAvatar" class="author-avatar" alt="" />
                  <span>{{ article.author_name }}</span>
                </div>
              </div>
            </div>
            
            <div v-if="loading" class="loading-more">
              <span>加载中...</span>
            </div>
            
            <div v-if="!loading && articles.length === 0" class="empty-state">
              <p>暂无文章</p>
            </div>
          </div>
        </section>
        <!-- 右侧副时光轴（年份-月份层级目录） -->
        <aside class="sidebar-right">
          <div class="side-timeline card">
            <h4 class="side-title">📑 文章目录</h4>
            <div class="side-timeline-list" ref="sideListWrap">
              <!-- 底层固定灰色基准轴线 -->
              <div class="base-gray-line"></div>
              <!-- 蓝色跟随指示竖线，高度固定，以条目中心对齐 -->
              <div class="side-active-line" :style="lineStyle"></div>
              
              <!-- 年份分组循环 -->
              <div v-for="yearGroup in yearMonthGroupList" :key="yearGroup.year" class="year-group">
                <!-- 年份标题（可点击展开/折叠） -->
                <div 
                  class="side-timeline-item year-item"
                  :class="{ active: activeYear === yearGroup.year }"
                  @click="toggleYearExpand(yearGroup.year, $event)"
                  data-type="year"
                  data-val="yearGroup.year"
                >
                  <span class="side-dot"></span>
                  <span class="side-text">{{ yearGroup.year }}年</span>
                  <span class="expand-arrow">{{ expandYear === yearGroup.year ? '−' : '+' }}</span>
                </div>
                <!-- 月份分组（仅当前展开年份显示） -->
                <div v-show="expandYear === yearGroup.year" class="month-group-wrap">
                  <div v-for="monthGroup in yearGroup.months" :key="monthGroup.month" class="month-group">
                    <!-- 月份可点击展开/折叠 -->
                    <div 
                      class="side-timeline-item month-item"
                      :class="{ active: activeMonth === `${yearGroup.year}-${monthGroup.month}` }"
                      @click="toggleMonthExpand(yearGroup.year, monthGroup.month, $event)"
                      data-type="month"
                      data-val="`${yearGroup.year}-${monthGroup.month}`"
                    >
                      <span class="side-dot"></span>
                      <span class="side-text">{{ monthGroup.month }}月</span>
                      <span class="expand-arrow">{{ expandMonth === `${yearGroup.year}-${monthGroup.month}` ? '−' : '+' }}</span>
                    </div>
                    <!-- 当前月份下所有文章：仅展开当前月份才显示 -->
                    <div class="article-group-wrap" v-show="expandMonth === `${yearGroup.year}-${monthGroup.month}`">
                      <a 
                        v-for="article in monthGroup.articles" 
                        :key="article.id"
                        :href="`#article-${article.id}`"
                        class="side-timeline-item article-item"
                        :class="{ active: activeArticleId === article.id }"
                        data-type="article"
                        :data-val="article.id"
                        @click.prevent="scrollToArticle(article.id, $event)"
                      >
                        <span class="side-dot"></span>
                        <span class="side-text">{{ article.title }}</span>
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </main>
    <!-- 底部 -->
    <footer class="footer">
      <p>© 2024 时光轴博客 - 记录生活，分享知识</p>
    </footer>
    <!-- 回到顶部按钮 -->
    <button v-show="showBackTop" class="back-top-btn" @click="scrollToTop">
      ↑
    </button>
    
    <!-- 音乐播放器 -->
    <MusicPlayer
      v-if="musicSettings.show_player && musicSettings.playlist_id"
      :musicPlatform="musicSettings.music_platform"
      :playlistId="musicSettings.playlist_id"
      :showPlayer="musicSettings.show_player"
      :showLyric="musicSettings.show_lyric"
      :volume="musicSettings.volume"
      :autoPlay="musicSettings.auto_play"
    />
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed, watch, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '../store/user'
import { getArticleList, searchArticles, searchUsers, getUserMusicSettings } from '../utils/api'
import { toast } from '../utils/toast'
import MusicPlayer from '../components/MusicPlayer.vue'

const router = useRouter()
const userStore = useUserStore()
const defaultAvatar = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj48Y2lyY2xlIGN4PSI1MCIgY3k9IjUwIiByPSI1MCIgZmlsbD0iIzE4OTBmZiIvPjx0ZXh0IHg9IjUwIiB5PSI2NSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0id2hpdGUiIGZvbnQtc2l6ZT0iNDAiPkE8L3RleHQ+PC9zdmc+'

const articles = ref([])
// 当前登录用户自己的文章列表（和Profile数据源一致）
const myArticles = ref([])
const loading = ref(false)
const page = ref(1)
const pageSize = ref(10)
const total = ref(0)
const searchKeyword = ref('')
const showBackTop = ref(false)
const activeArticleId = ref(null)
const timelineContainer = ref(null)
const sideListWrap = ref(null)

// 搜索相关
const showSearchDropdown = ref(false)
const searchResults = ref({
  users: [],
  articles: []
})
let searchTimer = null

// 音乐设置
const musicSettings = ref({
  music_platform: 'netease',
  playlist_id: '',
  show_player: false,
  show_lyric: true,
  volume: 70,
  auto_play: false
})

// 右侧目录状态
const expandYear = ref(null) // 当前展开的年份（互斥，只存一个）
const expandMonth = ref(null) // 当前展开的月份（格式 yyyy-mm，互斥）
const activeYear = ref(null)
const activeMonth = ref(null)

// 蓝色竖线固定高度，仅动态修改top实现居中对齐
const LINE_FIX_HEIGHT = 28
const lineStyle = ref({ top: '0px', height: `${LINE_FIX_HEIGHT}px` })

// 统计逻辑完全对齐Profile.vue
const stats = computed(() => {
  if (userStore.isLoggedIn && userStore.userInfo) {
    const totalViews = myArticles.value.reduce((sum, item) => sum + (item.view_count || 0), 0)
    return {
      articleCount: userStore.userInfo.articleCount || myArticles.value.length,
      totalViews
    }
  }
  return {
    articleCount: articles.value.length,
    totalViews: articles.value.reduce((sum, a) => sum + (a.view_count || 0), 0)
  }
})

// 文章按 年-月 分组（用于右侧层级目录）
const yearMonthGroupList = computed(() => {
  const groupMap = {}
  articles.value.forEach(art => {
    const date = new Date(art.created_at)
    const year = date.getFullYear()
    const month = date.getMonth() + 1
    const yearKey = year
    const monthKey = `${year}-${month}`
    if (!groupMap[yearKey]) {
      groupMap[yearKey] = { year, months: {} }
    }
    const yearObj = groupMap[yearKey]
    if (!yearObj.months[monthKey]) {
      yearObj.months[monthKey] = { month, articles: [] }
    }
    yearObj.months[monthKey].articles.push(art)
  })
  // 转为数组并倒序（新年份在前）
  const result = Object.values(groupMap).sort((a, b) => b.year - a.year)
  result.forEach(y => {
    y.months = Object.values(y.months).sort((a, b) => b.month - a.month)
  })
  return result
})

// 更新蓝色竖线：以目标DOM垂直居中
async function updateSideActiveLine(targetEl) {
  if (!sideListWrap.value || !targetEl) return
  await nextTick()
  const wrapRect = sideListWrap.value.getBoundingClientRect()
  const targetRect = targetEl.getBoundingClientRect()
  // 计算居中top = 元素顶部 + 元素高度一半 - 蓝色线高度一半
  const centerTop = targetRect.top - wrapRect.top + (targetRect.height / 2) - (LINE_FIX_HEIGHT / 2)
  lineStyle.value.top = `${centerTop}px`
}

// 点击年份展开/折叠
function toggleYearExpand(year, e) {
  // 切换年份时清空展开月份
  if (expandYear.value === year) {
    expandYear.value = null
    expandMonth.value = null
  } else {
    expandYear.value = year
  }
  activeYear.value = year
  updateSideActiveLine(e.currentTarget)
}

// 月份展开/折叠切换，同一年互斥
function toggleMonthExpand(year, month, e) {
  const key = `${year}-${month}`
  expandYear.value = year
  activeYear.value = year
  activeMonth.value = key
  // 点击当前已展开则收起，否则展开当前、关闭其他月份
  expandMonth.value = expandMonth.value === key ? null : key
  updateSideActiveLine(e.currentTarget)
}

// 滚动到指定文章，同步激活年月并更新竖线
async function scrollToArticle(id, e) {
  e.preventDefault()
  const element = document.getElementById(`article-${id}`)
  if (!element) return
  // 滚动到文章
  element.scrollIntoView({ behavior: 'smooth', block: 'center' })
  const art = articles.value.find(x => x.id === id)
  if (!art) return
  const date = new Date(art.created_at)
  const y = date.getFullYear()
  const m = date.getMonth() + 1
  const monthKey = `${y}-${m}`
  // 先更新状态，展开年份+对应月份
  activeYear.value = y
  activeMonth.value = monthKey
  expandYear.value = y
  expandMonth.value = monthKey
  // 强制等待DOM渲染完成，两次nextTick确保节点存在
  await nextTick()
  await nextTick()
  // 精准获取当前点击的文章锚点DOM
  const targetItem = sideListWrap.value.querySelector(`.article-item[data-val="${id}"]`)
  if (targetItem) {
    updateSideActiveLine(targetItem)
  }
}

// 拉取当前登录用户自己的文章
async function fetchMyArticles() {
  if (!userStore.isLoggedIn || !userStore.userInfo?.id) return
  try {
    const res = await getArticleList({
      userId: userStore.userInfo.id,
      page: 1,
      pageSize: 999
    })
    if (res.code === 200) {
      myArticles.value = res.data.list
    }
  } catch (err) {
    console.error('拉取个人文章统计失败', err)
  }
}

// 加载音乐设置
async function loadMusicSettings() {
  try {
    // 如果已登录，加载用户自己的设置；否则使用默认设置
    if (userStore.isLoggedIn && userStore.userInfo?.id) {
      const res = await getUserMusicSettings(userStore.userInfo.id)
      if (res.code === 200) {
        musicSettings.value = res.data
      }
    }
  } catch (err) {
    console.error('加载音乐设置失败:', err)
  }
}

async function fetchArticles() {
  if (loading.value) return
  loading.value = true
  try {
    const res = await getArticleList({
      page: page.value,
      pageSize: pageSize.value
    })
    if (res.code === 200) {
      articles.value = [...articles.value, ...res.data.list]
      total.value = res.data.total
    }
  } catch (error) {
    console.error('获取文章列表失败:', error)
    toast.error('获取文章列表失败')
  } finally {
    loading.value = false
  }
}

// 搜索输入处理（防抖）
function handleSearchInput() {
  if (searchTimer) {
    clearTimeout(searchTimer)
  }
  
  if (!searchKeyword.value.trim()) {
    showSearchDropdown.value = false
    return
  }
  
  searchTimer = setTimeout(() => {
    doSearch()
  }, 300)
}

// 执行搜索
async function doSearch() {
  if (!searchKeyword.value.trim()) return
  
  try {
    const [userRes, articleRes] = await Promise.all([
      searchUsers({ keyword: searchKeyword.value, page: 1, pageSize: 5 }),
      searchArticles({ keyword: searchKeyword.value, page: 1, pageSize: 5 })
    ])
    
    searchResults.value = {
      users: userRes.code === 200 ? userRes.data.list : [],
      articles: articleRes.code === 200 ? articleRes.data.list : []
    }
    showSearchDropdown.value = true
  } catch (error) {
    console.error('搜索失败:', error)
  }
}

async function handleSearch() {
  showSearchDropdown.value = false
  
  if (!searchKeyword.value.trim()) {
    articles.value = []
    page.value = 1
    expandYear.value = null
    expandMonth.value = null
    fetchArticles()
    return
  }
  
  loading.value = true
  try {
    const res = await searchArticles({
      keyword: searchKeyword.value,
      page: 1,
      pageSize: 20
    })
    if (res.code === 200) {
      articles.value = res.data.list
      total.value = res.data.total
      // 搜索后重置展开状态
      expandYear.value = null
      expandMonth.value = null
      toast.success(`找到 ${res.data.total} 篇文章`)
    }
  } catch (error) {
    console.error('搜索失败:', error)
    toast.error('搜索失败')
  } finally {
    loading.value = false
  }
}

// 跳转到搜索结果页
function goToSearchResult(type) {
  showSearchDropdown.value = false
  // 这里可以跳转到专门的搜索结果页，暂时直接执行搜索
  handleSearch()
}

// 跳转到用户主页
function goToUserHome(userId) {
  showSearchDropdown.value = false
  router.push(`/user/${userId}`)
}

// 头像点击
function handleAvatarClick() {
  if (userStore.isLoggedIn && userStore.userInfo?.id) {
    router.push(`/user/${userStore.userInfo.id}`)
  }
}

function goToArticle(id) {
  router.push(`/article/${id}`)
}

function scrollToTop() {
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

function handleScroll() {
  showBackTop.value = window.scrollY > 300
  
  // 点击外部关闭搜索下拉
  if (showSearchDropdown.value) {
    showSearchDropdown.value = false
  }
  
  const scrollPosition = window.scrollY + window.innerHeight / 3
  let currentArt = null
  for (let i = articles.value.length - 1; i >= 0; i--) {
    const article = articles.value[i]
    const element = document.getElementById(`article-${article.id}`)
    if (element && element.offsetTop <= scrollPosition) {
      currentArt = article
      break
    }
  }
  if (currentArt && activeArticleId.value !== currentArt.id) {
    activeArticleId.value = currentArt.id
    const date = new Date(currentArt.created_at)
    const y = date.getFullYear()
    const m = date.getMonth() + 1
    const monthKey = `${y}-${m}`
    activeYear.value = y
    activeMonth.value = monthKey
    expandYear.value = y
    expandMonth.value = monthKey
    nextTick(async () => {
      await nextTick()
      const targetItem = sideListWrap.value?.querySelector(`[data-type="article"][data-val="${currentArt.id}"]`)
      if (targetItem)
        updateSideActiveLine(targetItem)
    })
  }
  // 无限滚动加载更多
  const scrollBottom = window.scrollY + window.innerHeight
  const documentHeight = document.documentElement.scrollHeight
  if (scrollBottom >= documentHeight - 200 && !loading.value && articles.value.length < total.value) {
    page.value++
    fetchArticles()
  }
}

function formatDay(dateStr) {
  const date = new Date(dateStr)
  return date.getDate()
}

function formatMonth(dateStr) {
  const date = new Date(dateStr)
  const months = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月']
  return months[date.getMonth()]
}

function handleLogout() {
  userStore.logout()
  toast.success('已退出登录')
  setTimeout(() => {
    window.location.reload()
  }, 1000)
}

// 监听登录状态变化
watch(() => userStore.isLoggedIn, (newVal) => {
  if (newVal) {
    fetchMyArticles()
    loadMusicSettings()
  }
})

onMounted(() => {
  fetchArticles()
  fetchMyArticles()
  loadMusicSettings()
  window.addEventListener('scroll', handleScroll)
})

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll)
  if (searchTimer) {
    clearTimeout(searchTimer)
  }
})
</script>

<style scoped>
.home-page {
  min-height: 100vh;
  background-color: var(--timeline-bg);
  background-image: 
    radial-gradient(circle at 20% 50%, rgba(0, 212, 255, 0.1) 0%, transparent 50%),
    radial-gradient(circle at 80% 80%, rgba(102, 126, 234, 0.1) 0%, transparent 50%);
}

/* 导航栏 */
.navbar {
  position: sticky;
  top: 0;
  z-index: 100;
  background: rgba(26, 26, 46, 0.95);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.nav-container {
  max-width: 1400px;
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
  font-size: 20px;
  font-weight: 700;
  color: white;
  text-decoration: none;
}

.logo-icon {
  font-size: 24px;
}

.nav-center {
  flex: 1;
  max-width: 400px;
  margin: 0 32px;
  position: relative;
}

.search-box {
  display: flex;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 20px;
  overflow: hidden;
}

.search-input {
  flex: 1;
  padding: 8px 16px;
  border: none;
  background: transparent;
  color: white;
  outline: none;
  font-size: 14px;
}

.search-input::placeholder {
  color: rgba(255, 255, 255, 0.5);
}

.search-btn {
  padding: 8px 16px;
  border: none;
  background: transparent;
  color: white;
  cursor: pointer;
  font-size: 16px;
}

/* 搜索下拉 */
.search-dropdown {
  position: absolute;
  top: 50px;
  left: 0;
  right: 0;
  background: var(--timeline-card-bg);
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
  overflow: hidden;
  z-index: 1000;
  max-height: 400px;
  overflow-y: auto;
}

.search-section {
  padding: 12px 16px;
  border-bottom: 1px solid var(--border-color);
}

.search-section:last-child {
  border-bottom: none;
}

.search-section-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 13px;
  color: var(--text-muted);
  margin-bottom: 8px;
  font-weight: 600;
}

.search-more {
  color: var(--primary-color);
  cursor: pointer;
  font-size: 12px;
}

.search-more:hover {
  text-decoration: underline;
}

.search-user-list,
.search-article-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.search-user-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.2s;
}

.search-user-item:hover {
  background: rgba(24, 144, 255, 0.1);
}

.search-user-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  object-fit: cover;
}

.search-user-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.search-user-name {
  font-size: 14px;
  color: var(--text-color);
  font-weight: 500;
}

.search-user-stats {
  font-size: 12px;
  color: var(--text-muted);
}

.search-article-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.2s;
}

.search-article-item:hover {
  background: rgba(24, 144, 255, 0.1);
}

.search-article-title {
  font-size: 14px;
  color: var(--text-color);
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.search-article-views {
  font-size: 12px;
  color: var(--text-muted);
  flex-shrink: 0;
}

.search-empty {
  text-align: center;
  padding: 12px;
  color: var(--text-muted);
  font-size: 13px;
}

.nav-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.nav-user {
  display: flex;
  align-items: center;
  gap: 8px;
  color: white;
  text-decoration: none;
}

.nav-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  object-fit: cover;
}

.nav-username {
  font-size: 14px;
}

.nav-btn {
  padding: 6px 16px;
  border: 1px solid rgba(255, 255, 255, 0.3);
  background: transparent;
  color: white;
  border-radius: 20px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.3s;
}

.nav-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.5);
}

/* 主体内容 */
.main-content {
  max-width: 1400px;
  margin: 0 auto;
  padding: 32px 24px;
}

.content-wrapper {
  display: grid;
  grid-template-columns: 240px 1fr 220px;
  gap: 24px;
}

/* 左侧边栏 */
.sidebar-left {
  position: sticky;
  top: 80px;
  align-self: start;
}

.user-card {
  padding: 24px;
  text-align: center;
  background: var(--timeline-card-bg);
}

.user-avatar-wrapper {
  margin-bottom: 16px;
  cursor: pointer;
}

.user-avatar {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  object-fit: cover;
  border: 3px solid var(--timeline-line);
}

.user-name {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-color);
  margin-bottom: 8px;
}

.user-bio {
  font-size: 13px;
  color: var(--text-secondary);
  margin-bottom: 20px;
  line-height: 1.5;
}

.user-stats {
  display: flex;
  justify-content: center;
  gap: 16px;
  margin-bottom: 20px;
  padding: 16px 0;
  border-top: 1px solid var(--border-color);
  border-bottom: 1px solid var(--border-color);
  flex-wrap: wrap;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 40px;
}

.stat-number {
  font-size: 18px;
  font-weight: 700;
  color: var(--primary-color);
}

.stat-label {
  font-size: 11px;
  color: var(--text-muted);
  margin-top: 4px;
}

.profile-btn {
  width: 100%;
}

/* 中间时光轴 */
.timeline-section {
  min-height: 600px;
}

.timeline-header {
  text-align: center;
  margin-bottom: 40px;
  color: white;
}

.timeline-header h2 {
  font-size: 32px;
  margin-bottom: 8px;
}

.timeline-subtitle {
  font-size: 14px;
  opacity: 0.7;
}

.timeline-container {
  position: relative;
  padding: 20px 0;
}

.timeline-line {
  position: absolute;
  left: 50%;
  top: 0;
  bottom: 0;
  width: 4px;
  background: linear-gradient(to bottom, var(--timeline-line), rgba(0, 212, 255, 0.3));
  transform: translateX(-50%);
  border-radius: 2px;
}

.timeline-item {
  position: relative;
  width: 50%;
  padding: 20px 40px;
  margin-bottom: 30px;
}

.timeline-item.left {
  left: 0;
  text-align: right;
}

.timeline-item.right {
  left: 50%;
  text-align: left;
}

.timeline-dot {
  position: absolute;
  top: 30px;
  width: 16px;
  height: 16px;
  background: var(--timeline-dot);
  border: 3px solid var(--timeline-bg);
  border-radius: 50%;
  z-index: 1;
  box-shadow: 0 0 10px var(--timeline-line);
}

.timeline-item.left .timeline-dot {
  right: -8px;
}

.timeline-item.right .timeline-dot {
  left: -8px;
}

.timeline-card {
  background: var(--timeline-card-bg);
  padding: 20px;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s;
  position: relative;
}

.timeline-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 25px rgba(0, 212, 255, 0.2);
}

.card-date {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin-bottom: 12px;
  color: var(--primary-color);
}

.timeline-item.left .card-date {
  justify-content: flex-end;
}

.date-day {
  font-size: 28px;
  font-weight: 700;
}

.date-month {
  font-size: 14px;
}

.card-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-color);
  margin-bottom: 12px;
  line-height: 1.4;
}

.card-summary {
  font-size: 14px;
  color: var(--text-secondary);
  line-height: 1.6;
  margin-bottom: 16px;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.card-meta {
  display: flex;
  gap: 16px;
  font-size: 13px;
  color: var(--text-muted);
  margin-bottom: 12px;
}

.timeline-item.left .card-meta {
  justify-content: flex-end;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 4px;
}

.card-author {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--text-secondary);
  padding-top: 12px;
  border-top: 1px solid var(--border-color);
  cursor: pointer;
  transition: color 0.2s;
}

.card-author:hover {
  color: var(--primary-color);
}

.timeline-item.left .card-author {
  justify-content: flex-end;
}

.author-avatar {
  width: 24px;
  height: 24px;
  border-radius: 50%;
}

.loading-more, .empty-state {
  text-align: center;
  padding: 40px;
  color: rgba(255, 255, 255, 0.6);
  grid-column: 1 / -1;
}

/* 右侧边栏 层级目录样式 */
.sidebar-right {
  position: sticky;
  top: 80px;
  align-self: start;
}

.side-timeline {
  padding: 20px;
  background: var(--timeline-card-bg);
  max-height: calc(100vh - 120px);
  overflow-y: auto;
}

.side-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-color);
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--border-color);
}

.side-timeline-list {
  position: relative;
  padding-left: 16px;
}

/* 底层固定灰色基准轴线 */
.base-gray-line {
  position: absolute;
  left: 4px;
  top: 0;
  bottom: 0;
  width: 2px;
  background: var(--border-color);
  z-index: 1;
}

/* 蓝色动态高亮竖线：长过渡，滑动轨迹清晰 */
.side-active-line {
  position: absolute;
  left: 4px;
  width: 2px;
  background: var(--primary-color);
  border-radius: 1px;
  /* 加长过渡时间，移动轨迹更明显可见 */
  transition: top 0.45s ease-out;
  z-index: 2;
}

.year-group {
  margin-bottom: 4px;
}

.year-item {
  font-weight: 600;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.expand-arrow {
  font-size: 16px;
  color: var(--text-muted);
}

.month-group-wrap {
  padding-left: 12px;
}

.month-group {
  margin-bottom: 2px;
}

.month-item {
  font-size: 12px;
  opacity: 0.85;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.article-group-wrap {
  padding-left: 12px;
}

.article-item {
  font-size: 12px;
}

.side-timeline-item {
  position: relative;
  display: block;
  padding: 8px 0;
  color: var(--text-secondary);
  text-decoration: none;
  line-height: 1.4;
  transition: all 0.25s;
  cursor: pointer;
}

.side-timeline-item:hover {
  color: var(--primary-color);
}

.side-timeline-item.active {
  color: var(--primary-color);
  font-weight: 600;
}

.side-dot {
  position: absolute;
  left: -16px;
  top: 14px;
  width: 8px;
  height: 8px;
  background: var(--border-color);
  border-radius: 50%;
  transition: all 0.3s;
  z-index: 3;
}

.side-timeline-item.active .side-dot {
  background: var(--primary-color);
  box-shadow: 0 0 6px var(--primary-color);
}

.side-text {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* 底部 */
.footer {
  text-align: center;
  padding: 24px;
  color: rgba(255, 255, 255, 0.5);
  font-size: 13px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

/* 回到顶部 */
.back-top-btn {
  position: fixed;
  right: 24px;
  bottom: 24px;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: var(--primary-color);
  color: white;
  border: none;
  font-size: 20px;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  transition: all 0.3s;
  z-index: 99;
}

.back-top-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.4);
}

/* 响应式 */
@media (max-width: 1024px) {
  .content-wrapper {
    grid-template-columns: 200px 1fr;
  }
  .sidebar-right {
    display: none;
  }
}

@media (max-width: 768px) {
  .nav-container {
    padding: 0 16px;
  }
  .nav-center {
    display: none;
  }
  .nav-username {
    display: none;
  }
  .main-content {
    padding: 20px 16px;
  }
  .content-wrapper {
    grid-template-columns: 1fr;
  }
  .sidebar-left {
    position: static;
    order: -1;
  }
  .timeline-line {
    left: 20px;
  }
  .timeline-item {
    width: 100%;
    left: 0 !important;
    text-align: left !important;
    padding-left: 50px;
    padding-right: 0;
  }
  .timeline-item .timeline-dot {
    left: 12px !important;
    right: auto !important;
  }
  .timeline-item .card-date,
  .timeline-item .card-meta,
  .timeline-item .card-author {
    justify-content: flex-start !important;
  }
  .timeline-header h2 {
    font-size: 24px;
  }
}
</style>
