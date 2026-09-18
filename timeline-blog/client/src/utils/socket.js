import { io } from 'socket.io-client'

let socket = null

export function initSocket() {
  if (!socket) {
    const token = localStorage.getItem('token') || ''
    socket = io({
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      auth: { token }
    })

    socket.on('connect', () => {
      console.log('Socket连接成功:', socket.id)
      // 连接成功后主动上报自身身份（登录用户）
      identifyCurrentUser()
    })

    socket.on('disconnect', () => {
      console.log('Socket断开连接')
    })

    socket.on('connect_error', (error) => {
      console.error('Socket连接错误:', error)
    })
  }
  return socket
}

export function getSocket() {
  if (!socket) {
    return initSocket()
  }
  return socket
}

// 登录成功后调用：把当前用户身份同步到 socket 服务端
export function identifyCurrentUser() {
  const s = getSocket()
  const token = localStorage.getItem('token')
  if (!token) return
  try {
    // 从 localStorage 里取用户信息（用户 store 里持久化的字段在登录时写入）
    const raw = localStorage.getItem('userInfo')
    if (raw) {
      const info = JSON.parse(raw)
      s.emit('identify', info)
    }
  } catch (e) {
    // 忽略解析错误
  }
}

// 监听在线人数变化
export function onOnlineStats(callback) {
  const s = getSocket()
  s.on('online:stats', callback)
}

// 主动拉一次在线列表
export function queryOnlineStats() {
  const s = getSocket()
  s.emit('online:query')
}

export function joinArticleRoom(articleId) {
  const s = getSocket()
  s.emit('joinArticle', articleId)
}

export function leaveArticleRoom(articleId) {
  const s = getSocket()
  s.emit('leaveArticle', articleId)
}

export function onNewComment(callback) {
  const s = getSocket()
  s.on('newComment', callback)
}

export function onDeleteComment(callback) {
  const s = getSocket()
  s.on('deleteComment', callback)
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect()
    socket = null
  }
}
