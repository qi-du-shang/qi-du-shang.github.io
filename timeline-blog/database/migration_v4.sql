-- 时光轴博客 v4 迁移：接口用量统计
-- 执行方式：mysql -u root -p timeline_blog < migration_v4.sql

USE timeline_blog;

-- 接口调用日志表
CREATE TABLE IF NOT EXISTS api_usage_logs (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  method VARCHAR(10) NOT NULL COMMENT '请求方法 GET/POST/PUT/DELETE',
  path VARCHAR(500) NOT NULL COMMENT '完整请求路径',
  route_key VARCHAR(200) DEFAULT NULL COMMENT '归一化路由标识，如 GET /api/users/:id',
  status_code INT DEFAULT NULL COMMENT 'HTTP 响应状态码',
  duration INT DEFAULT NULL COMMENT '响应耗时（毫秒）',
  ip VARCHAR(50) DEFAULT NULL COMMENT '访客 IP',
  user_id INT DEFAULT NULL COMMENT '关联用户ID（未登录为 NULL）',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '请求时间',
  INDEX idx_created_at (created_at),
  INDEX idx_route_key (route_key),
  INDEX idx_status (status_code),
  INDEX idx_ip (ip)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='接口调用日志表';

-- 接口每日聚合表（提升统计查询性能）
CREATE TABLE IF NOT EXISTS api_usage_daily (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  stat_date DATE NOT NULL COMMENT '统计日期',
  route_key VARCHAR(200) NOT NULL COMMENT '归一化路由标识',
  method VARCHAR(10) NOT NULL COMMENT '请求方法',
  path VARCHAR(500) DEFAULT NULL COMMENT '示例路径',
  total_count INT DEFAULT 0 COMMENT '总调用次数',
  success_count INT DEFAULT 0 COMMENT '成功次数（2xx/3xx）',
  error_count INT DEFAULT 0 COMMENT '失败次数（4xx/5xx）',
  server_error_count INT DEFAULT 0 COMMENT '5xx 次数',
  total_duration BIGINT DEFAULT 0 COMMENT '总耗时（毫秒）',
  max_duration INT DEFAULT 0 COMMENT '最大单次耗时（毫秒）',
  slow_count INT DEFAULT 0 COMMENT '耗时超 1 分钟次数',
  unique_ips INT DEFAULT 0 COMMENT '独立 IP 数（近似，由日志表统计）',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_date_route (stat_date, route_key),
  INDEX idx_stat_date (stat_date),
  INDEX idx_route_key (route_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='接口每日聚合统计表';

SELECT 'migration_v4 执行完成：已创建 api_usage_logs / api_usage_daily 表' AS message;
