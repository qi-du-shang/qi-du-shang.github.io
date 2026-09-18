-- 时光轴博客数据库初始化脚本
-- 创建数据库
CREATE DATABASE IF NOT EXISTS timeline_blog DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE timeline_blog;

-- 用户表
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE COMMENT '用户名',
  password VARCHAR(255) NOT NULL COMMENT '密码（加密）',
  nickname VARCHAR(50) DEFAULT NULL COMMENT '昵称',
  avatar VARCHAR(500) DEFAULT NULL COMMENT '头像URL',
  bio VARCHAR(500) DEFAULT NULL COMMENT '个人简介',
  role VARCHAR(20) DEFAULT 'user' COMMENT '角色：user/admin',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  last_login_at DATETIME DEFAULT NULL COMMENT '最后登录时间',
  INDEX idx_username (username),
  INDEX idx_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户表';

-- 文章表
CREATE TABLE IF NOT EXISTS articles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(200) NOT NULL COMMENT '文章标题',
  content TEXT NOT NULL COMMENT '文章内容',
  summary VARCHAR(500) DEFAULT NULL COMMENT '文章摘要',
  cover_image VARCHAR(500) DEFAULT NULL COMMENT '封面图片',
  author_id INT NOT NULL COMMENT '作者ID',
  status VARCHAR(20) DEFAULT 'draft' COMMENT '状态：draft/published',
  view_count INT DEFAULT 0 COMMENT '阅读数',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX idx_author_id (author_id),
  INDEX idx_status (status),
  INDEX idx_created_at (created_at),
  FULLTEXT idx_title_content (title, content)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='文章表';

-- 评论表
CREATE TABLE IF NOT EXISTS comments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  article_id INT NOT NULL COMMENT '文章ID',
  user_id INT NOT NULL COMMENT '用户ID',
  content TEXT NOT NULL COMMENT '评论内容',
  parent_id INT DEFAULT NULL COMMENT '父评论ID（用于回复）',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX idx_article_id (article_id),
  INDEX idx_user_id (user_id),
  INDEX idx_parent_id (parent_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='评论表';

-- 点赞表
CREATE TABLE IF NOT EXISTS likes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  article_id INT NOT NULL COMMENT '文章ID',
  user_id INT NOT NULL COMMENT '用户ID',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  UNIQUE KEY uk_article_user (article_id, user_id),
  INDEX idx_article_id (article_id),
  INDEX idx_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='点赞表';

-- 分享表
CREATE TABLE IF NOT EXISTS shares (
  id INT AUTO_INCREMENT PRIMARY KEY,
  article_id INT NOT NULL COMMENT '文章ID',
  user_id INT DEFAULT NULL COMMENT '用户ID（未登录可为空）',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  INDEX idx_article_id (article_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='分享表';

-- 角色表
CREATE TABLE IF NOT EXISTS roles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE COMMENT '角色名称',
  description VARCHAR(200) DEFAULT NULL COMMENT '角色描述',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='角色表';

-- 权限表
CREATE TABLE IF NOT EXISTS permissions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE COMMENT '权限名称',
  code VARCHAR(50) NOT NULL UNIQUE COMMENT '权限代码',
  description VARCHAR(200) DEFAULT NULL COMMENT '权限描述',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='权限表';

-- 角色权限关联表
CREATE TABLE IF NOT EXISTS role_permissions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  role_id INT NOT NULL COMMENT '角色ID',
  permission_id INT NOT NULL COMMENT '权限ID',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  UNIQUE KEY uk_role_permission (role_id, permission_id),
  INDEX idx_role_id (role_id),
  INDEX idx_permission_id (permission_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='角色权限关联表';

-- 插入初始权限数据
INSERT INTO permissions (name, code, description) VALUES
('文章管理', 'article:manage', '管理所有文章'),
('用户管理', 'user:manage', '管理所有用户'),
('权限管理', 'permission:manage', '管理角色和权限'),
('仪表盘查看', 'dashboard:view', '查看仪表盘数据'),
('评论管理', 'comment:manage', '管理所有评论');

-- 插入初始角色数据
INSERT INTO roles (name, description) VALUES
('admin', '管理员，拥有所有权限'),
('user', '普通用户，基础权限');

-- 给管理员分配所有权限
INSERT INTO role_permissions (role_id, permission_id)
SELECT 1, id FROM permissions;

-- 插入默认管理员用户（密码：admin123）
INSERT INTO users (username, password, nickname, role) VALUES
('admin', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', '管理员', 'admin');

-- 插入测试用户（密码：123456）
INSERT INTO users (username, password, nickname, role) VALUES
('testuser', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', '测试用户', 'user');

-- 插入示例文章
INSERT INTO articles (title, content, summary, author_id, status, view_count) VALUES
('欢迎来到时光轴博客', '<h2>欢迎来到时光轴博客！</h2><p>这是一个基于Vue + Node.js + MySQL的全栈博客系统，采用QQ空间风格的时光轴设计。</p><p>主要功能包括：</p><ul><li>时光轴形式的文章展示</li><li>文章评论与实时更新</li><li>用户个人主页</li><li>管理后台</li><li>响应式设计，支持手机和电脑</li></ul><p>希望你喜欢这个博客系统！</p>', '欢迎来到时光轴博客，这是一个基于Vue + Node.js + MySQL的全栈博客系统。', 1, 'published', 100),
('第一篇技术文章', '<h2>Vue 3 组合式API入门</h2><p>Vue 3 引入了组合式API（Composition API），这是一种全新的组织组件逻辑的方式。</p><h3>为什么需要组合式API？</h3><p>在Vue 2中，我们使用选项式API来组织代码。随着组件变得越来越复杂，相关的逻辑会分散在不同的选项中，导致代码难以维护。</p><h3>基本用法</h3><p>组合式API的核心是setup函数。在setup函数中，我们可以使用响应式API、计算属性、侦听器等。</p><pre><code>import { ref, computed } from \'vue\'\n\nexport default {\n  setup() {\n    const count = ref(0)\n    const doubleCount = computed(() => count.value * 2)\n    \n    function increment() {\n      count.value++\n    }\n    \n    return { count, doubleCount, increment }\n  }\n}</code></pre><p>通过组合式API，我们可以将相关的逻辑组织在一起，提高代码的可维护性和复用性。</p>', 'Vue 3 组合式API入门教程，介绍组合式API的基本概念和用法。', 1, 'published', 250),
('生活随笔', '<h2>关于生活的一些思考</h2><p>生活就像一场旅行，不在乎目的地，在乎的是沿途的风景和看风景的心情。</p><p>每一天都是新的开始，每一刻都值得珍惜。我们常常忙于追逐未来，却忘记了享受当下。</p><p>有时候，慢下来，看看身边的人和事，你会发现生活中充满了美好。</p><p>愿我们都能在忙碌的生活中，找到属于自己的那份宁静与快乐。</p>', '关于生活的一些思考，愿我们都能在忙碌中找到宁静。', 2, 'published', 80),
('Node.js 后端开发实践', '<h2>Node.js 后端开发最佳实践</h2><p>Node.js 是一个基于 Chrome V8 引擎的 JavaScript 运行时，使得 JavaScript 可以在服务端运行。</p><h3>项目结构</h3><p>一个好的项目结构对于后端开发至关重要。推荐采用分层架构：</p><ul><li>路由层（Routes）：处理URL路由</li><li>控制器层（Controllers）：处理业务逻辑</li><li>模型层（Models）：处理数据操作</li><li>中间件（Middleware）：处理通用逻辑</li></ul><h3>错误处理</h3><p>统一的错误处理机制可以大大提高代码的可维护性。建议使用全局错误处理中间件。</p><h3>数据库操作</h3><p>使用连接池来管理数据库连接，可以有效提高性能。同时注意SQL注入防护。</p>', 'Node.js 后端开发最佳实践，包括项目结构、错误处理和数据库操作。', 1, 'published', 180),
('前端性能优化指南', '<h2>前端性能优化完全指南</h2><p>前端性能优化是提升用户体验的重要手段。本文将从多个方面介绍前端性能优化的方法。</p><h3>加载性能优化</h3><ul><li>代码分割：按需加载，减少首屏加载时间</li><li>资源压缩：压缩JS、CSS、图片等资源</li><li>CDN加速：使用CDN分发静态资源</li><li>缓存策略：合理设置HTTP缓存</li></ul><h3>运行时性能优化</h3><ul><li>虚拟列表：处理长列表渲染</li><li>防抖节流：优化频繁触发的事件</li><li>Web Worker：将耗时任务放到后台线程</li><li>requestAnimationFrame：优化动画</li></ul><h3>性能监控</h3><p>优化的前提是测量。使用Lighthouse、Performance API等工具进行性能监控和分析。</p>', '前端性能优化完全指南，涵盖加载性能、运行时性能和性能监控。', 2, 'published', 320);

-- 插入示例评论
INSERT INTO comments (article_id, user_id, content) VALUES
(1, 2, '写得真好！期待更多内容！'),
(1, 1, '感谢支持！会继续更新的~'),
(2, 2, '组合式API确实比选项式好用多了'),
(3, 1, '很有感触，生活确实需要慢下来'),
(4, 2, '干货满满，收藏了！');

-- 插入示例点赞
INSERT INTO likes (article_id, user_id) VALUES
(1, 2),
(2, 2),
(3, 1),
(4, 2),
(5, 1),
(5, 2);

-- 插入示例分享
INSERT INTO shares (article_id, user_id) VALUES
(1, 2),
(2, 1),
(5, 2);

SELECT '数据库初始化完成！' as message;
SELECT '默认管理员账号：admin / admin123' as admin_account;
SELECT '测试用户账号：testuser / 123456' as test_account;
