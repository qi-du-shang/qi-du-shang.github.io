-- ============================================================
-- 迁移脚本 v5：富文本编辑器支持
-- 日期：2026-08-28
-- 说明：
--   1. 文章内容字段扩容为 MEDIUMTEXT（最大 16MB），支持含 base64 图片的富文本
--   2. 评论内容字段扩容为 MEDIUMTEXT，支持富文本评论
--   3. 摘要字段保持 VARCHAR(500)，存储纯文本摘要
-- ============================================================

USE timeline_blog;

-- 文章表：content 字段从 TEXT 扩容为 MEDIUMTEXT
ALTER TABLE articles
  MODIFY COLUMN content MEDIUMTEXT NOT NULL COMMENT '文章内容（富文本HTML）';

-- 评论表：content 字段从 TEXT 扩容为 MEDIUMTEXT
ALTER TABLE comments
  MODIFY COLUMN content MEDIUMTEXT NOT NULL COMMENT '评论内容（富文本HTML）';

-- 验证迁移结果
SELECT '迁移 v5 完成：articles.content 和 comments.content 已扩容为 MEDIUMTEXT' AS message;
