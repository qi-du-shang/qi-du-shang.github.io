/**
 * 接口用量统计中间件
 * 记录每个 API 请求的方法、路径、状态码、耗时、IP、用户ID
 * 采用内存缓冲 + 定时批量写入，避免阻塞主响应流程
 */
const pool = require('../config/db');

// 需要跳过统计的路径前缀
const SKIP_PREFIXES = ['/uploads/', '/favicon.ico', '/api/health'];
// 需要跳过统计的精确路径
const SKIP_EXACT = ['/api/admin/api-usage/logs']; // 统计接口自身不记录，避免无限递归

// 归一化路由：把动态参数替换为 :param
// 例如 /api/users/123 -> /api/users/:id, /api/articles/5/comments -> /api/articles/:id/comments
function normalizeRoute(method, originalUrl) {
  // 去掉 query string
  let path = originalUrl.split('?')[0];
  // 去掉末尾斜杠
  if (path.length > 1 && path.endsWith('/')) {
    path = path.slice(0, -1);
  }
  const segments = path.split('/');
  const normalized = segments.map(seg => {
    // 纯数字 -> :id
    if (/^\d+$/.test(seg)) return ':id';
    // UUID 格式
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(seg)) return ':uuid';
    // 看起来像 token / hash 的长串（>=24位字母数字混合）
    if (/^[a-zA-Z0-9_-]{24,}$/.test(seg)) return ':token';
    return seg;
  }).join('/');
  return `${method} ${normalized}`;
}

// 内存缓冲队列
const buffer = [];
const BUFFER_FLUSH_INTERVAL = 5000; // 5秒刷一次
const BUFFER_MAX_SIZE = 200; // 超过200条立即刷

let flushTimer = null;
let isFlushing = false;

async function flushBuffer() {
  if (isFlushing || buffer.length === 0) return;
  isFlushing = true;
  const batch = buffer.splice(0, buffer.length);
  try {
    if (batch.length === 1) {
      const r = batch[0];
      await pool.execute(
        `INSERT INTO api_usage_logs (method, path, route_key, status_code, duration, ip, user_id, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [r.method, r.path, r.route_key, r.status_code, r.duration, r.ip, r.user_id, r.created_at]
      );
    } else {
      const placeholders = batch.map(() => '(?,?,?,?,?,?,?,?)').join(',');
      const values = [];
      batch.forEach(r => {
        values.push(r.method, r.path, r.route_key, r.status_code, r.duration, r.ip, r.user_id, r.created_at);
      });
      await pool.execute(
        `INSERT INTO api_usage_logs (method, path, route_key, status_code, duration, ip, user_id, created_at)
         VALUES ${placeholders}`,
        values
      );
    }
  } catch (err) {
    // 统计失败不影响业务，只打日志
    console.error('[apiUsage] 批量写入失败:', err.message);
    // 写回缓冲，下次重试（避免内存无限增长，超过上限丢弃最旧的）
    if (buffer.length + batch.length > 1000) {
      buffer.unshift(...batch.slice(buffer.length + batch.length - 1000));
    } else {
      buffer.unshift(...batch);
    }
  } finally {
    isFlushing = false;
  }
}

function startFlushTimer() {
  if (flushTimer) return;
  flushTimer = setInterval(() => {
    flushBuffer();
  }, BUFFER_FLUSH_INTERVAL);
  flushTimer.unref?.(); // 不阻塞进程退出
}

// 主中间件
function apiUsageMiddleware(req, res, next) {
  // 跳过不需要统计的路径
  const url = req.originalUrl || req.url;
  if (SKIP_PREFIXES.some(p => url.startsWith(p)) || SKIP_EXACT.includes(url.split('?')[0])) {
    return next();
  }

  const startTime = Date.now();
  const method = req.method;
  const path = url.split('?')[0];
  const routeKey = normalizeRoute(method, url);
  const ip = (req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || req.socket?.remoteAddress || '').split(',')[0].trim() || null;
  const userId = req.user?.id || null;

  // 响应完成时记录
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const record = {
      method,
      path,
      route_key: routeKey,
      status_code: res.statusCode,
      duration,
      ip,
      user_id: userId,
      created_at: new Date()
    };
    buffer.push(record);
    if (buffer.length >= BUFFER_MAX_SIZE) {
      flushBuffer();
    }
  });

  // 响应关闭（异常中断）也记录
  res.on('close', () => {
    if (!res.writableEnded) {
      const duration = Date.now() - startTime;
      buffer.push({
        method,
        path,
        route_key: routeKey,
        status_code: 0,
        duration,
        ip,
        user_id: userId,
        created_at: new Date()
      });
    }
  });

  next();
}

// 优雅关闭：进程退出前刷完缓冲
async function gracefulShutdown() {
  if (flushTimer) {
    clearInterval(flushTimer);
    flushTimer = null;
  }
  await flushBuffer();
}

process.on('SIGINT', async () => {
  await gracefulShutdown();
  process.exit(0);
});
process.on('SIGTERM', async () => {
  await gracefulShutdown();
  process.exit(0);
});

// 启动定时刷写
startFlushTimer();

module.exports = {
  apiUsageMiddleware,
  flushBuffer,
  normalizeRoute
};
