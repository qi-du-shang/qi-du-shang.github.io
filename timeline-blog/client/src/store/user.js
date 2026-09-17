import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { login as apiLogin, register as apiRegister, getUserInfo } from '../utils/api'

export const useUserStore = defineStore('user', () => {
  const token = ref(localStorage.getItem('token') || '')
  const userInfo = ref(null)
  const isLoggedIn = computed(() => !!token.value)
  const isAdmin = computed(() => userInfo.value?.role === 'admin')

  function initUser() {
    if (token.value) {
      fetchUserInfo()
    }
  }

  async function fetchUserInfo() {
    try {
      const res = await getUserInfo()
      if (res.code === 200) {
        userInfo.value = res.data
      }
    } catch (error) {
      console.error('获取用户信息失败:', error)
      logout()
    }
  }

  async function login(username, password) {
    const res = await apiLogin(username, password)
    if (res.code === 200) {
      token.value = res.data.token
      userInfo.value = res.data.user
      localStorage.setItem('token', res.data.token)
    }
    return res
  }

  async function register(username, password) {
    return await apiRegister(username, password)
  }

  function logout() {
    token.value = ''
    userInfo.value = null
    localStorage.removeItem('token')
  }

  function updateUserInfo(info) {
    userInfo.value = { ...userInfo.value, ...info }
  }

  return {
    token,
    userInfo,
    isLoggedIn,
    isAdmin,
    initUser,
    fetchUserInfo,
    login,
    register,
    logout,
    updateUserInfo
  }
})
