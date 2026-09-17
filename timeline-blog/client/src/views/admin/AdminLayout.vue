<template>
  <div class="admin-layout">
    <!-- 侧边栏 -->
    <aside class="sidebar">
      <div class="sidebar-header">
        <h2 class="sidebar-title">⚙️ 管理后台</h2>
      </div>
      <nav class="sidebar-nav">
        <router-link 
          to="/admin/dashboard" 
          class="nav-item magnetic-target"
          :class="{ active: $route.path === '/admin/dashboard' }"
        >
          <span class="nav-icon">📊</span>
          <span class="nav-text">仪表盘</span>
        </router-link>
        <router-link 
          to="/admin/articles" 
          class="nav-item magnetic-target"
          :class="{ active: $route.path === '/admin/articles' }"
        >
          <span class="nav-icon">📝</span>
          <span class="nav-text">文章管理</span>
        </router-link>
        <router-link 
          to="/admin/permissions" 
          class="nav-item magnetic-target"
          :class="{ active: $route.path === '/admin/permissions' }"
        >
          <span class="nav-icon">🔐</span>
          <span class="nav-text">权限管理</span>
        </router-link>
        <router-link 
          to="/admin/api-usage" 
          class="nav-item magnetic-target"
          :class="{ active: $route.path === '/admin/api-usage' }"
        >
          <span class="nav-icon">📊</span>
          <span class="nav-text">接口统计</span>
        </router-link>
      </nav>
      <div class="sidebar-footer">
        <router-link to="/" class="back-link">← 返回博客</router-link>
      </div>
    </aside>

    <!-- 主内容区 -->
    <div class="main-wrapper">
      <!-- 顶部栏 -->
      <header class="topbar">
        <div class="topbar-left">
          <h1 class="page-title">{{ $route.meta.title || '管理后台' }}</h1>
        </div>
        <div class="topbar-right">
          <div class="user-info">
            <img :src="userStore.userInfo?.avatar || defaultAvatar" class="user-avatar" alt="" />
            <span class="user-name">{{ userStore.userInfo?.nickname }}</span>
            <span class="user-role">管理员</span>
          </div>
          <button class="logout-btn" @click="handleLogout">退出</button>
        </div>
      </header>

      <!-- 内容区 -->
      <main class="content-area">
        <router-view />
      </main>
    </div>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'
import { useUserStore } from '../../store/user'

const router = useRouter()
const userStore = useUserStore()

const defaultAvatar = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj48Y2lyY2xlIGN4PSI1MCIgY3k9IjUwIiByPSI1MCIgZmlsbD0iIzE4OTBmZiIvPjx0ZXh0IHg9IjUwIiB5PSI2NSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0id2hpdGUiIGZvbnQtc2l6ZT0iNDAiPkE8L3RleHQ+PC9zdmc+'

function handleLogout() {
  if (confirm('确定要退出登录吗？')) {
    userStore.logout()
    router.push('/login')
  }
}
</script>

<style scoped>
.admin-layout {
  display: flex;
  min-height: 100vh;
  background-color: var(--bg-color);
}

/* 侧边栏 */
.sidebar {
  width: 240px;
  background: linear-gradient(180deg, #1a1a2e 0%, #16213e 100%);
  color: white;
  display: flex;
  flex-direction: column;
  position: fixed;
  top: 0;
  left: 0;
  bottom: 0;
  z-index: 100;
}

.sidebar-header {
  padding: 24px 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.sidebar-title {
  font-size: 20px;
  font-weight: 700;
}

.sidebar-nav {
  flex: 1;
  padding: 16px 12px;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  color: rgba(255, 255, 255, 0.7);
  text-decoration: none;
  border-radius: 8px;
  margin-bottom: 4px;
  transition: all 0.3s;
}

.nav-item:hover {
  background: rgba(255, 255, 255, 0.1);
  color: white;
}

.nav-item.active {
  background: var(--primary-color);
  color: white;
}

.nav-icon {
  font-size: 18px;
}

.nav-text {
  font-size: 14px;
  font-weight: 500;
}

.sidebar-footer {
  padding: 16px 20px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.back-link {
  color: rgba(255, 255, 255, 0.7);
  text-decoration: none;
  font-size: 14px;
  transition: color 0.3s;
}

.back-link:hover {
  color: white;
}

/* 主内容区 */
.main-wrapper {
  flex: 1;
  margin-left: 240px;
  display: flex;
  flex-direction: column;
}

.topbar {
  height: 60px;
  background: var(--card-bg);
  border-bottom: 1px solid var(--border-color);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  position: sticky;
  top: 0;
  z-index: 50;
}

.page-title {
  font-size: 20px;
  font-weight: 600;
  color: var(--text-color);
}

.topbar-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 10px;
}

.user-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  object-fit: cover;
}

.user-name {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-color);
}

.user-role {
  font-size: 12px;
  color: var(--primary-color);
  background: rgba(24, 144, 255, 0.1);
  padding: 2px 8px;
  border-radius: 10px;
}

.logout-btn {
  padding: 6px 16px;
  border: 1px solid var(--border-color);
  background: transparent;
  color: var(--text-secondary);
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  transition: all 0.3s;
}

.logout-btn:hover {
  border-color: var(--error-color);
  color: var(--error-color);
}

.content-area {
  flex: 1;
  padding: 24px;
  overflow-y: auto;
}

/* 响应式 */
@media (max-width: 768px) {
  .sidebar {
    width: 60px;
  }
  
  .sidebar-title, .nav-text, .back-link {
    display: none;
  }
  
  .sidebar-header {
    padding: 16px 12px;
    text-align: center;
  }
  
  .nav-item {
    justify-content: center;
    padding: 12px;
  }
  
  .main-wrapper {
    margin-left: 60px;
  }
  
  .user-name, .user-role {
    display: none;
  }
}
</style>
