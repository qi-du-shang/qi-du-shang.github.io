-- 时光轴博客数据库升级脚本 V3
-- 新增功能：文章阅读历史记录、用户阅读数统计

USE timeline_blog;

-- ============================================
-- 1. 文章阅读记录表（记录用户阅读过的文章，去重）
-- ============================================
CREATE TABLE IF NOT EXISTS article_reads (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL COMMENT '用户ID',
  article_id INT NOT NULL COMMENT '文章ID',
  read_count INT DEFAULT 1 COMMENT '阅读次数',
  last_read_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '最后阅读时间',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '首次阅读时间',
  UNIQUE KEY uk_user_article (user_id, article_id),
  INDEX idx_user_id (user_id),
  INDEX idx_article_id (article_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='文章阅读记录表';

-- ============================================
-- 2. 用户表新增字段：阅读数缓存（提高性能）
-- ============================================
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS read_count INT DEFAULT 0 COMMENT '阅读过的文章数量（缓存）' AFTER following_count;

-- 更新已有用户的阅读数（目前没有数据，保持0）
UPDATE users u SET 
read_count = (SELECT COUNT(*) FROM article_reads ar WHERE ar.user_id = u.id);

SELECT '数据库升级V3完成！' as message;
SELECT '新增表：article_reads(文章阅读记录表)' as new_tables;
SELECT '新增字段：users.read_count' as new_fields;
