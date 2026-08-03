const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const userRoutes = require('./routes/userRoutes');
const articleRoutes = require('./routes/articleRoutes');
const commentRoutes = require('./routes/commentRoutes');
const permissionRoutes = require('./routes/permissionRoutes');

const app = express();
const server = http.createServer(app);

// Socket.io配置
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// 将io实例挂载到app上，方便在控制器中使用
app.set('io', io);

// 中间件
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// 静态文件服务
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// 路由
app.use('/api/users', userRoutes);
app.use('/api/articles', articleRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/permissions', permissionRoutes);

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({
    code: 200,
    message: '服务正常运行',
    timestamp: new Date().toISOString()
  });
});

// Socket.io连接处理
io.on('connection', (socket) => {
  console.log('用户连接:', socket.id);

  // 加入文章房间（用于接收文章评论实时更新）
  socket.on('joinArticle', (articleId) => {
    socket.join(`article-${articleId}`);
    console.log(`用户 ${socket.id} 加入文章房间: article-${articleId}`);
  });

  // 离开文章房间
  socket.on('leaveArticle', (articleId) => {
    socket.leave(`article-${articleId}`);
    console.log(`用户 ${socket.id} 离开文章房间: article-${articleId}`);
  });

  // 断开连接
  socket.on('disconnect', () => {
    console.log('用户断开连接:', socket.id);
  });
});

// 错误处理中间件
app.use((err, req, res, next) => {
  console.error('服务器错误:', err);
  res.status(500).json({
    code: 500,
    message: '服务器内部错误'
  });
});

// 404处理
app.use((req, res) => {
  res.status(404).json({
    code: 404,
    message: '接口不存在'
  });
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`🚀 服务器运行在 http://localhost:${PORT}`);
  console.log(`🔌 Socket.io 服务已启动`);
});

module.exports = { app, server, io };
