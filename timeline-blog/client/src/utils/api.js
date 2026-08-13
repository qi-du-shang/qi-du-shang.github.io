import axios from 'axios'

const request = axios.create({
  baseURL: '/api',
  timeout: 10000
})

// 请求拦截器
request.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// 响应拦截器
request.interceptors.response.use(
  (response) => {
    return response.data
  },
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

// 用户相关API
export function login(username, password) {
  return request.post('/users/login', { username, password })
}

export function register(username, password) {
  return request.post('/users/register', { username, password })
}

export function forgotPassword(username, newPassword) {
  return request.post('/users/forgot-password', { username, newPassword })
}

export function getUserInfo() {
  return request.get('/users/profile')
}

export function updateUserInfo(data) {
  return request.put('/users/profile', data)
}

export function getUserDetail(userId) {
  return request.get(`/users/detail/${userId}`)
}

export function searchUsers(params) {
  return request.get('/users/search', { params })
}

export function getUserList(params) {
  return request.get('/users/list', { params })
}

export function updateUserRole(userId, role) {
  return request.put(`/users/${userId}/role`, { role })
}

export function deleteUser(userId) {
  return request.delete(`/users/${userId}`)
}

// 文章相关API
export function getArticleList(params) {
  return request.get('/articles', { params })
}

export function getArticleDetail(id) {
  return request.get(`/articles/${id}`)
}

export function createArticle(data) {
  return request.post('/articles', data)
}

export function updateArticle(id, data) {
  return request.put(`/articles/${id}`, data)
}

export function deleteArticle(id) {
  return request.delete(`/articles/${id}`)
}

export function searchArticles(params) {
  return request.get('/articles/search', { params })
}

export function likeArticle(id) {
  return request.post(`/articles/${id}/like`)
}

export function shareArticle(id) {
  return request.post(`/articles/${id}/share`)
}

export function getDashboardStats() {
  return request.get('/articles/admin/dashboard')
}

// 评论相关API
export function getComments(articleId, params) {
  return request.get(`/comments/${articleId}`, { params })
}

export function createComment(articleId, data) {
  return request.post(`/comments/${articleId}`, data)
}

export function deleteComment(id) {
  return request.delete(`/comments/${id}`)
}

// 权限相关API
export function getRoles() {
  return request.get('/permissions/roles')
}

export function createRole(data) {
  return request.post('/permissions/roles', data)
}

export function updateRole(id, data) {
  return request.put(`/permissions/roles/${id}`, data)
}

export function deleteRole(id) {
  return request.delete(`/permissions/roles/${id}`)
}

export function getPermissions() {
  return request.get('/permissions/permissions')
}

export function getRolePermissions(roleId) {
  return request.get(`/permissions/roles/${roleId}/permissions`)
}

// 关注相关API
export function toggleFollow(followingId) {
  return request.post(`/follows/${followingId}`)
}

export function checkFollow(followingId) {
  return request.get(`/follows/check/${followingId}`)
}

export function getFollowers(userId, params) {
  return request.get(`/follows/followers/${userId}`, { params })
}

export function getFollowing(userId, params) {
  return request.get(`/follows/following/${userId}`, { params })
}

export function getFollowStats() {
  return request.get('/follows/admin/stats')
}

// 音乐相关API
export function getMusicSettings() {
  return request.get('/music/settings')
}

export function updateMusicSettings(data) {
  return request.put('/music/settings', data)
}

export function getUserMusicSettings(userId) {
  return request.get(`/music/settings/${userId}`)
}

export default request
