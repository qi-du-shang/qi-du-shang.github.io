import { io } from 'socket.io-client'

let socket = null

export function initSocket() {
  if (!socket) {
    socket = io({
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    })

    socket.on('connect', () => {
      console.log('Socket连接成功:', socket.id)
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

export function joinArticleRoom(articleId) {
  const socket = getSocket()
  socket.emit('joinArticle', articleId)
}

export function leaveArticleRoom(articleId) {
  const socket = getSocket()
  socket.emit('leaveArticle', articleId)
}

export function onNewComment(callback) {
  const socket = getSocket()
  socket.on('newComment', callback)
}

export function onDeleteComment(callback) {
  const socket = getSocket()
  socket.on('deleteComment', callback)
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect()
    socket = null
  }
}
