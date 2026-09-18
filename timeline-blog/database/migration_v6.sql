-- ============================================================
-- 迁移脚本 v6：账号管理 + 访客记录 + 在线用户
-- 日期：2026-09-17
-- 说明：
--   1. users 表新增 status 字段（0-正常，1-禁用），用于账号管理
--   2. 新建 visitor_logs 访客访问记录表
--   3. 在线人数由 Socket.io 内存维护，无需建表
-- ============================================================

USE timeline_blog;

-- 1. users 表新增账号状态字段
ALTER TABLE users
  ADD COLUMN status TINYINT NOT NULL DEFAULT 0
  COMMENT '账号状态：0-正常，1-禁用'
  AFTER role;

-- 2. 访客访问记录表
CREATE TABLE IF NOT EXISTS visitor_logs (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  ip VARCHAR(64) DEFAULT NULL COMMENT '访问者IP',
  user_id INT DEFAULT NULL COMMENT '登录用户ID，游客为NULL',
  username VARCHAR(50) DEFAULT NULL COMMENT '登录用户名冗余字段',
  nickname VARCHAR(50) DEFAULT NULL COMMENT '登录用户昵称冗余字段',
  path VARCHAR(255) DEFAULT NULL COMMENT '访问前端路由路径',
  referer VARCHAR(500) DEFAULT NULL COMMENT '上一页面来源',
  user_agent VARCHAR(500) DEFAULT NULL COMMENT '原始UA字符串',
  browser VARCHAR(50) DEFAULT NULL COMMENT '浏览器',
  os VARCHAR(50) DEFAULT NULL COMMENT '操作系统',
  device VARCHAR(50) DEFAULT NULL COMMENT '设备类型：PC/Mobile/Tablet',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '访问时间',
  INDEX idx_user_id (user_id),
  INDEX idx_ip (ip),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='访客访问记录表';

SELECT '迁移 v6 完成：users.status 已新增，visitor_logs 表已创建' AS message;
