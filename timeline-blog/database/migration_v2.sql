-- 时光轴博客数据库升级脚本 V2
-- 新增功能：关注系统、音乐播放器设置、用户搜索优化

USE timeline_blog;

-- ============================================
-- 1. 关注表（用户互相关注）
-- ============================================
CREATE TABLE IF NOT EXISTS follows (
  id INT AUTO_INCREMENT PRIMARY KEY,
  follower_id INT NOT NULL COMMENT '关注者用户ID',
  following_id INT NOT NULL COMMENT '被关注用户ID',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '关注时间',
  UNIQUE KEY uk_follower_following (follower_id, following_id),
  INDEX idx_follower_id (follower_id),
  INDEX idx_following_id (following_id),
  FOREIGN KEY (follower_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (following_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户关注表';

-- ============================================
-- 2. 用户音乐播放器设置表
-- ============================================
CREATE TABLE IF NOT EXISTS user_music_settings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL UNIQUE COMMENT '用户ID',
  music_platform VARCHAR(20) DEFAULT 'netease' COMMENT '音乐平台：netease(网易云)/tencent(QQ音乐)/kugou(酷狗)/xiami(虾米)',
  playlist_id VARCHAR(100) DEFAULT '' COMMENT '歌单ID',
  show_player TINYINT(1) DEFAULT 1 COMMENT '是否在主页显示音乐播放器：0-否，1-是',
  show_lyric TINYINT(1) DEFAULT 1 COMMENT '是否显示歌词：0-否，1-是',
  volume INT DEFAULT 70 COMMENT '音量：0-100',
  auto_play TINYINT(1) DEFAULT 0 COMMENT '是否自动播放：0-否，1-是',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户音乐播放器设置表';

-- 为已有用户创建默认音乐设置
INSERT INTO user_music_settings (user_id, music_platform, playlist_id, show_player)
SELECT id, 'netease', '', 1 FROM users
WHERE id NOT IN (SELECT user_id FROM user_music_settings);

-- ============================================
-- 3. 用户表新增字段：粉丝数、关注数缓存（提高性能）
-- ============================================
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS follower_count INT DEFAULT 0 COMMENT '粉丝数（缓存）' AFTER bio,
ADD COLUMN IF NOT EXISTS following_count INT DEFAULT 0 COMMENT '关注数（缓存）' AFTER follower_count;

-- 更新已有用户的粉丝数和关注数
UPDATE users u SET 
follower_count = (SELECT COUNT(*) FROM follows f WHERE f.following_id = u.id),
following_count = (SELECT COUNT(*) FROM follows f WHERE f.follower_id = u.id);

-- ============================================
-- 4. 插入示例关注数据
-- ============================================
-- 测试用户关注管理员
INSERT IGNORE INTO follows (follower_id, following_id) VALUES (2, 1);
-- 管理员关注测试用户
INSERT IGNORE INTO follows (follower_id, following_id) VALUES (1, 2);

-- 更新用户关注数缓存
UPDATE users u SET 
follower_count = (SELECT COUNT(*) FROM follows f WHERE f.following_id = u.id),
following_count = (SELECT COUNT(*) FROM follows f WHERE f.follower_id = u.id);

-- ============================================
-- 5. 新增权限：用户管理、关注统计
-- ============================================
INSERT IGNORE INTO permissions (name, code, description) VALUES
('用户管理', 'user:manage', '管理所有用户'),
('关注统计', 'follow:stats', '查看关注数据统计');

-- 给管理员分配新权限
INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT 1, id FROM permissions WHERE code IN ('user:manage', 'follow:stats');

SELECT '数据库升级完成！' as message;
SELECT '新增表：follows(关注表), user_music_settings(音乐设置表)' as new_tables;
SELECT '新增字段：users.follower_count, users.following_count' as new_fields;
SELECT '新增权限：user:manage, follow:stats' as new_permissions;
