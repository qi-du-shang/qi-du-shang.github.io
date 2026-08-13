# 时光轴博客系统

一个基于 Vue 3 + Node.js + MySQL 的全栈博客系统，采用 QQ 空间风格的时光轴设计。

## ✨ 功能特性

### 前台功能
- 📅 **时光轴主页** - 左右交替的时光轴布局，展示文章列表
- 🔍 **全站搜索** - 支持搜索文章标题和内容
- 📑 **文章目录** - 右侧副时光轴，点击锚点平滑滚动
- 📖 **文章详情** - 阅读进度条、文章信息、评论区
- 💬 **实时评论** - WebSocket 实时评论更新
- 👤 **个人主页** - 头像、昵称设置，文章管理
- 🎨 **主题切换** - 支持明暗主题切换
- 📱 **响应式设计** - 完美适配手机和电脑端
- 👥 **关注系统** - 关注/取消关注用户，查看关注列表，访问用户主页
- 🎵 **音乐播放器** - 基于 APlayer + Meting 的背景音乐播放器，支持网易云/QQ音乐歌单
- 📊 **阅读统计** - 记录用户阅读历史，统计阅读过的文章数量

### 管理后台
- 📊 **仪表盘** - 数据统计 + ECharts 可视化图表
- 📝 **文章管理** - 文章的增删改查
- 🔐 **权限管理** - 角色和权限管理

## 🛠️ 技术栈

### 前端
- **Vue 3** - 渐进式 JavaScript 框架
- **Vue Router** - 路由管理
- **Pinia** - 状态管理
- **Axios** - HTTP 请求库
- **Socket.io-client** - WebSocket 客户端
- **ECharts** - 数据可视化图表
- **Vite** - 前端构建工具

### 后端
- **Node.js** - JavaScript 运行时
- **Express** - Web 应用框架
- **Socket.io** - WebSocket 服务
- **MySQL2** - MySQL 数据库驱动
- **JWT** - 用户认证
- **Bcryptjs** - 密码加密

### 数据库
- **MySQL** - 关系型数据库

## 📁 项目结构

```
timeline-blog/
├── client/                 # 前端项目
│   ├── src/
│   │   ├── assets/         # 静态资源
│   │   │   └── styles/     # 全局样式
│   │   ├── components/     # 公共组件
│   │   ├── router/         # 路由配置
│   │   ├── store/          # 状态管理
│   │   ├── utils/          # 工具函数
│   │   ├── views/          # 页面组件
│   │   │   └── admin/      # 管理后台页面
│   │   ├── App.vue         # 根组件
│   │   └── main.js         # 入口文件
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
├── server/                 # 后端项目
│   ├── config/             # 配置文件
│   ├── controllers/        # 控制器
│   ├── middleware/         # 中间件
│   ├── models/             # 数据模型
│   ├── routes/             # 路由
│   ├── utils/              # 工具函数
│   ├── app.js              # 入口文件
│   ├── .env.example        # 环境变量示例
│   └── package.json
├── database/               # 数据库
│   ├── init.sql            # 数据库初始化脚本
│   ├── migration_v2.sql    # V2升级脚本（关注系统、音乐设置）
│   └── migration_v3.sql    # V3升级脚本（阅读历史记录）
└── README.md               # 说明文档
```

## 🚀 快速开始

### 环境要求
- Node.js >= 14.0.0
- MySQL >= 5.7
- npm 或 yarn

### 1. 克隆项目
```bash
git clone <repository-url>
cd timeline-blog
```

### 2. 数据库初始化

首先创建数据库并导入初始化脚本：

```bash
# 登录 MySQL
mysql -u root -p

# 执行初始化脚本
source /path/to/timeline-blog/database/init.sql;

# 执行升级脚本（关注系统、音乐设置、阅读历史）
source /path/to/timeline-blog/database/migration_v2.sql;
source /path/to/timeline-blog/database/migration_v3.sql;
```

或者使用命令行直接导入：

```bash
mysql -u root -p < database/init.sql
mysql -u root -p < database/migration_v2.sql
mysql -u root -p < database/migration_v3.sql
```

> **注意**：全新安装需依次执行 init.sql → migration_v2.sql → migration_v3.sql。
> 若已执行过 init.sql 和 migration_v2.sql，只需执行 migration_v3.sql。

### 3. 后端配置与启动

```bash
# 进入后端目录
cd server

# 复制环境变量配置文件
cp .env.example .env

# 编辑 .env 文件，配置数据库连接信息
# DB_HOST=localhost
# DB_USER=root
# DB_PASSWORD=your_password
# DB_NAME=timeline_blog

# 安装依赖
npm install

# 启动服务
npm start
```

后端服务将运行在 `http://localhost:3000`

### 4. 前端配置与启动

```bash
# 进入前端目录
cd client

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

前端服务将运行在 `http://localhost:5173`

### 5. 生产环境构建

```bash
# 前端构建
cd client
npm run build

# 构建产物在 dist 目录，可以部署到静态服务器
```

## 👤 默认账号

### 管理员账号
- 用户名：`admin`
- 密码：`admin123`

### 测试用户账号
- 用户名：`testuser`
- 密码：`123456`

## 📖 API 文档

### 用户相关
- `POST /api/users/register` - 用户注册
- `POST /api/users/login` - 用户登录
- `POST /api/users/forgot-password` - 忘记密码
- `GET /api/users/profile` - 获取用户信息
- `PUT /api/users/profile` - 更新用户信息

### 文章相关
- `GET /api/articles` - 获取文章列表
- `GET /api/articles/:id` - 获取文章详情
- `POST /api/articles` - 创建文章
- `PUT /api/articles/:id` - 更新文章
- `DELETE /api/articles/:id` - 删除文章
- `GET /api/articles/search` - 搜索文章
- `POST /api/articles/:id/like` - 点赞/取消点赞
- `POST /api/articles/:id/share` - 分享文章

### 评论相关
- `GET /api/comments/:articleId` - 获取评论列表
- `POST /api/comments/:articleId` - 发表评论
- `DELETE /api/comments/:id` - 删除评论

### 关注相关
- `POST /api/follows/:followingId` - 关注/取消关注用户
- `GET /api/follows/check/:followingId` - 检查是否关注某用户
- `GET /api/follows/followers/:userId` - 获取用户粉丝列表
- `GET /api/follows/following/:userId` - 获取用户关注列表

### 音乐设置相关
- `GET /api/music/settings` - 获取当前用户音乐设置
- `PUT /api/music/settings` - 更新当前用户音乐设置
- `GET /api/music/settings/:userId` - 获取指定用户音乐设置（公开）

### 权限相关（管理员）
- `GET /api/permissions/roles` - 获取角色列表
- `POST /api/permissions/roles` - 创建角色
- `PUT /api/permissions/roles/:id` - 更新角色
- `DELETE /api/permissions/roles/:id` - 删除角色
- `GET /api/permissions/permissions` - 获取权限列表

## 🔌 WebSocket 事件

### 客户端发送
- `joinArticle` - 加入文章房间（接收实时评论）
- `leaveArticle` - 离开文章房间

### 服务端推送
- `newComment` - 新评论通知
- `deleteComment` - 评论删除通知

## 🎨 设计特点

### 时光轴设计
- 参考 QQ 空间时光轴风格
- 黑色黑板背景 + 蓝色竖线
- 左右交替的卡片布局
- 流畅的滚动动画效果

### 响应式适配
- 桌面端：三栏布局（用户信息 + 时光轴 + 文章目录）
- 平板端：两栏布局（用户信息 + 时光轴）
- 手机端：单栏布局，时光轴改为单侧排列

## 📝 注意事项

1. 确保 MySQL 服务已启动
2. 首次运行前请先执行数据库初始化脚本
3. 生产环境请修改 JWT_SECRET
4. 建议使用 HTTPS 协议部署
5. 头像功能目前支持 URL 方式，如需本地上传可自行扩展

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

MIT License
