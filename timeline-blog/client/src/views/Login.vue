<template>
  <div class="login-page">
    <div class="login-container">
      <div class="login-header">
        <h1 class="logo">时光轴博客</h1>
        <p class="subtitle">记录生活，分享知识</p>
      </div>
      
      <div class="login-tabs">
        <button 
          class="tab-btn" 
          :class="{ active: activeTab === 'login' }"
          @click="activeTab = 'login'"
        >
          登录
        </button>
        <button 
          class="tab-btn" 
          :class="{ active: activeTab === 'register' }"
          @click="activeTab = 'register'"
        >
          注册
        </button>
        <button 
          class="tab-btn" 
          :class="{ active: activeTab === 'forgot' }"
          @click="activeTab = 'forgot'"
        >
          忘记密码
        </button>
      </div>
      <!-- 登录表单 -->
      <form v-if="activeTab === 'login'" class="login-form" @submit.prevent="handleLogin">
        <div class="form-group">
          <label>用户名</label>
          <input 
            type="text" 
            v-model="loginForm.username" 
            class="input" 
            placeholder="请输入用户名"
            required
          />
        </div>
        <div class="form-group">
          <label>密码</label>
          <input 
            type="password" 
            v-model="loginForm.password" 
            class="input" 
            placeholder="请输入密码"
            required
          />
        </div>
        <button type="submit" class="btn btn-primary btn-lg btn-block" :disabled="loading">
          {{ loading ? '登录中...' : '登录' }}
        </button>
        <p class="form-tip">
          还没有账号？
          <a href="javascript:;" @click="activeTab = 'register'">立即注册</a>
        </p>
      </form>
      <!-- 注册表单 -->
      <form v-if="activeTab === 'register'" class="login-form" @submit.prevent="handleRegister">
        <div class="form-group">
          <label>用户名</label>
          <input 
            type="text" 
            v-model="registerForm.username" 
            class="input" 
            placeholder="请输入用户名（3-20个字符）"
            required
          />
        </div>
        <div class="form-group">
          <label>密码</label>
          <input 
            type="password" 
            v-model="registerForm.password" 
            class="input" 
            placeholder="请输入密码（至少6位）"
            required
          />
        </div>
        <div class="form-group">
          <label>确认密码</label>
          <input 
            type="password" 
            v-model="registerForm.confirmPassword" 
            class="input" 
            placeholder="请再次输入密码"
            required
          />
        </div>
        <button type="submit" class="btn btn-primary btn-lg btn-block" :disabled="loading">
          {{ loading ? '注册中...' : '注册' }}
        </button>
        <p class="form-tip">
          已有账号？
          <a href="javascript:;" @click="activeTab = 'login'">立即登录</a>
        </p>
      </form>
      <!-- 忘记密码表单 -->
      <form v-if="activeTab === 'forgot'" class="login-form" @submit.prevent="handleForgotPassword">
        <div class="form-group">
          <label>用户名</label>
          <input 
            type="text" 
            v-model="forgotForm.username" 
            class="input" 
            placeholder="请输入用户名"
            required
          />
        </div>
        <div class="form-group">
          <label>新密码</label>
          <input 
            type="password" 
            v-model="forgotForm.newPassword" 
            class="input" 
            placeholder="请输入新密码（至少6位）"
            required
          />
        </div>
        <button type="submit" class="btn btn-primary btn-lg btn-block" :disabled="loading">
          {{ loading ? '重置中...' : '重置密码' }}
        </button>
        <p class="form-tip">
          想起密码了？
          <a href="javascript:;" @click="activeTab = 'login'">返回登录</a>
        </p>
      </form>
      <div class="login-footer">
        <p>© 2024 时光轴博客</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '../store/user'
import { forgotPassword } from '../utils/api'
import { toast } from '../utils/toast'

const router = useRouter()
const userStore = useUserStore()
const activeTab = ref('login')
const loading = ref(false)

const loginForm = ref({
  username: '',
  password: ''
})

const registerForm = ref({
  username: '',
  password: '',
  confirmPassword: ''
})

const forgotForm = ref({
  username: '',
  newPassword: ''
})

async function handleLogin() {
  loading.value = true
  try {
    const res = await userStore.login(loginForm.value.username, loginForm.value.password)
    if (res.code === 200) {
      toast.success('登录成功！')
      setTimeout(() => {
        router.push('/')
      }, 800)
    } else {
      toast.error(res.message || '登录失败')
    }
  } catch (error) {
    toast.error(error.response?.data?.message || '登录失败，请稍后重试')
  } finally {
    loading.value = false
  }
}

async function handleRegister() {
  if (registerForm.value.password !== registerForm.value.confirmPassword) {
    toast.warning('两次输入的密码不一致')
    return
  }
  
  loading.value = true
  try {
    const res = await userStore.register(registerForm.value.username, registerForm.value.password)
    if (res.code === 200) {
      toast.success('注册成功！请登录')
      activeTab.value = 'login'
      loginForm.value.username = registerForm.value.username
    } else {
      toast.error(res.message || '注册失败')
    }
  } catch (error) {
    toast.error(error.response?.data?.message || '注册失败，请稍后重试')
  } finally {
    loading.value = false
  }
}

async function handleForgotPassword() {
  loading.value = true
  try {
    const res = await forgotPassword(forgotForm.value.username, forgotForm.value.newPassword)
    if (res.code === 200) {
      toast.success('密码重置成功！请使用新密码登录')
      activeTab.value = 'login'
      loginForm.value.username = forgotForm.value.username
    } else {
      toast.error(res.message || '重置失败')
    }
  } catch (error) {
    toast.error(error.response?.data?.message || '重置失败，请稍后重试')
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
}

.login-container {
  width: 100%;
  max-width: 420px;
  background: var(--card-bg);
  border-radius: 16px;
  padding: 40px 32px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.login-header {
  text-align: center;
  margin-bottom: 32px;
}

.logo {
  font-size: 28px;
  font-weight: 700;
  color: var(--primary-color);
  margin-bottom: 8px;
}

.subtitle {
  color: var(--text-secondary);
  font-size: 14px;
}

.login-tabs {
  display: flex;
  margin-bottom: 24px;
  border-bottom: 1px solid var(--border-color);
}

.tab-btn {
  flex: 1;
  padding: 12px 0;
  border: none;
  background: none;
  font-size: 15px;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.3s;
  position: relative;
}

.tab-btn.active {
  color: var(--primary-color);
  font-weight: 600;
}

.tab-btn.active::after {
  content: '';
  position: absolute;
  bottom: -1px;
  left: 50%;
  transform: translateX(-50%);
  width: 40px;
  height: 2px;
  background: var(--primary-color);
  border-radius: 2px;
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-group label {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-color);
}

.input {
  width: 100%;
  padding: 12px 16px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--bg-color);
  color: var(--text-color);
  font-size: 14px;
  outline: none;
  transition: border-color 0.3s;
  box-sizing: border-box;
}

.input:focus {
  border-color: var(--primary-color);
}

.btn {
  padding: 12px 24px;
  border-radius: 8px;
  font-size: 15px;
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
  transform: translateY(-1px);
}

.btn-lg {
  padding: 14px 24px;
  font-size: 16px;
}

.btn-block {
  width: 100%;
  margin-top: 8px;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.form-tip {
  text-align: center;
  font-size: 13px;
  color: var(--text-secondary);
}

.form-tip a {
  color: var(--primary-color);
  text-decoration: none;
}

.form-tip a:hover {
  text-decoration: underline;
}

.login-footer {
  margin-top: 32px;
  text-align: center;
  font-size: 12px;
  color: var(--text-muted);
}

@media (max-width: 480px) {
  .login-container {
    padding: 32px 24px;
  }
  
  .logo {
    font-size: 24px;
  }
}
</style>
