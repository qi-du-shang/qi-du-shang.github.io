/**
 * 接口用量统计控制器
 * 仅管理员可访问
 */
const pool = require('../config/db');

// 辅助：获取日期范围的 SQL 条件
function getDateRangeCondition(days) {
  if (!days || days === 'all') {
    return '1=1';
  }
  return `created_at >= DATE_SUB(NOW(), INTERVAL ${parseInt(days)} DAY)`;
}

/**
 * 总览统计
 * GET /api/admin/api-usage/overview
 */
async function getOverview(req, res) {
  try {
    // 累计总量
    const [totalRow] = await pool.execute(
      'SELECT COUNT(*) AS total, AVG(duration) AS avg_duration FROM api_usage_logs'
    );
    // 今日
    const [todayRow] = await pool.execute(
      `SELECT COUNT(*) AS total, 
              SUM(CASE WHEN status_code >= 200 AND status_code < 400 THEN 1 ELSE 0 END) AS success,
              SUM(CASE WHEN status_code >= 500 THEN 1 ELSE 0 END) AS server_error,
              AVG(duration) AS avg_duration
       FROM api_usage_logs WHERE DATE(created_at) = CURDATE()`
    );
    // 昨日
    const [yesterdayRow] = await pool.execute(
      `SELECT COUNT(*) AS total,
              SUM(CASE WHEN status_code >= 200 AND status_code < 400 THEN 1 ELSE 0 END) AS success,
              SUM(CASE WHEN status_code >= 500 THEN 1 ELSE 0 END) AS server_error,
              AVG(duration) AS avg_duration
       FROM api_usage_logs WHERE DATE(created_at) = DATE_SUB(CURDATE(), INTERVAL 1 DAY)`
    );
    // 近7天
    const [weekRow] = await pool.execute(
      `SELECT COUNT(*) AS total,
              SUM(CASE WHEN status_code >= 200 AND status_code < 400 THEN 1 ELSE 0 END) AS success,
              SUM(CASE WHEN status_code >= 500 THEN 1 ELSE 0 END) AS server_error,
              AVG(duration) AS avg_duration
       FROM api_usage_logs WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)`
    );
    // 近30天
    const [monthRow] = await pool.execute(
      `SELECT COUNT(*) AS total,
              SUM(CASE WHEN status_code >= 200 AND status_code < 400 THEN 1 ELSE 0 END) AS success,
              SUM(CASE WHEN status_code >= 500 THEN 1 ELSE 0 END) AS server_error,
              AVG(duration) AS avg_duration
       FROM api_usage_logs WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)`
    );

    // 接口总数
    const [apiCountRow] = await pool.execute(
      'SELECT COUNT(DISTINCT route_key) AS count FROM api_usage_logs'
    );
    // 独立IP数（累计）
    const [ipCountRow] = await pool.execute(
      'SELECT COUNT(DISTINCT ip) AS count FROM api_usage_logs WHERE ip IS NOT NULL'
    );

    const calcRate = (success, total) => {
      if (!total) return 0;
      return Number(((success / total) * 100).toFixed(2));
    };

    res.json({
      code: 200,
      message: '获取成功',
      data: {
        total: {
          count: totalRow[0]?.total || 0,
          avg_duration: Number((totalRow[0]?.avg_duration || 0).toFixed(2)),
          api_count: apiCountRow[0]?.count || 0,
          unique_ips: ipCountRow[0]?.count || 0
        },
        today: {
          count: todayRow[0]?.total || 0,
          success: todayRow[0]?.success || 0,
          server_error: todayRow[0]?.server_error || 0,
          avg_duration: Number((todayRow[0]?.avg_duration || 0).toFixed(2)),
          success_rate: calcRate(todayRow[0]?.success, todayRow[0]?.total)
        },
        yesterday: {
          count: yesterdayRow[0]?.total || 0,
          success: yesterdayRow[0]?.success || 0,
          server_error: yesterdayRow[0]?.server_error || 0,
          avg_duration: Number((yesterdayRow[0]?.avg_duration || 0).toFixed(2)),
          success_rate: calcRate(yesterdayRow[0]?.success, yesterdayRow[0]?.total)
        },
        last7days: {
          count: weekRow[0]?.total || 0,
          success: weekRow[0]?.success || 0,
          server_error: weekRow[0]?.server_error || 0,
          avg_duration: Number((weekRow[0]?.avg_duration || 0).toFixed(2)),
          success_rate: calcRate(weekRow[0]?.success, weekRow[0]?.total)
        },
        last30days: {
          count: monthRow[0]?.total || 0,
          success: monthRow[0]?.success || 0,
          server_error: monthRow[0]?.server_error || 0,
          avg_duration: Number((monthRow[0]?.avg_duration || 0).toFixed(2)),
          success_rate: calcRate(monthRow[0]?.success, monthRow[0]?.total)
        }
      }
    });
  } catch (error) {
    console.error('获取接口用量总览失败:', error);
    res.status(500).json({ code: 500, message: '获取统计数据失败' });
  }
}

/**
 * 单接口用量统计列表
 * GET /api/admin/api-usage/by-api?days=7&page=1&pageSize=20&sort=count
 */
async function getByApi(req, res) {
  try {
    const days = req.query.days || '7';
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 20;
    const sort = req.query.sort || 'count'; // count / avg_duration / error_rate
    const offset = (page - 1) * pageSize;
    const dateCondition = getDateRangeCondition(days);

    const sortField = {
      count: 'total_count DESC',
      avg_duration: 'avg_duration DESC',
      error_rate: 'error_rate DESC',
      server_error: 'server_error_count DESC'
    }[sort] || 'total_count DESC';

    // 统计每个接口
    const [rows] = await pool.execute(
      `SELECT route_key,
              method,
              MAX(path) AS sample_path,
              COUNT(*) AS total_count,
              SUM(CASE WHEN status_code >= 200 AND status_code < 400 THEN 1 ELSE 0 END) AS success_count,
              SUM(CASE WHEN status_code >= 400 THEN 1 ELSE 0 END) AS error_count,
              SUM(CASE WHEN status_code >= 500 THEN 1 ELSE 0 END) AS server_error_count,
              AVG(duration) AS avg_duration,
              MAX(duration) AS max_duration,
              SUM(CASE WHEN duration >= 60000 THEN 1 ELSE 0 END) AS slow_count,
              COUNT(DISTINCT ip) AS unique_ips
       FROM api_usage_logs
       WHERE ${dateCondition}
       GROUP BY route_key, method
       ORDER BY ${sortField}
       LIMIT ? OFFSET ?`,
      [pageSize, offset]
    );

    // 总数
    const [countRow] = await pool.execute(
      `SELECT COUNT(DISTINCT route_key, method) AS total FROM api_usage_logs WHERE ${dateCondition}`
    );

    const list = rows.map(r => ({
      route_key: r.route_key,
      method: r.method,
      sample_path: r.sample_path,
      total_count: r.total_count,
      success_count: r.success_count,
      error_count: r.error_count,
      server_error_count: r.server_error_count,
      success_rate: r.total_count ? Number(((r.success_count / r.total_count) * 100).toFixed(2)) : 0,
      error_rate: r.total_count ? Number(((r.error_count / r.total_count) * 100).toFixed(2)) : 0,
      avg_duration: Number((r.avg_duration || 0).toFixed(2)),
      max_duration: r.max_duration || 0,
      slow_count: r.slow_count || 0,
      unique_ips: r.unique_ips || 0,
      // 告警标记
      alerts: {
        high_error: r.total_count >= 10 && (r.error_count / r.total_count) >= 0.2, // 调用>=10且错误率>=20%
        high_server_error: r.server_error_count >= 5, // 5xx >= 5次
        slow: r.slow_count > 0, // 有超1分钟请求
        high_avg_duration: (r.avg_duration || 0) >= 3000 // 平均耗时>=3秒
      }
    }));

    res.json({
      code: 200,
      message: '获取成功',
      data: {
        list,
        total: countRow[0]?.total || 0,
        page,
        pageSize
      }
    });
  } catch (error) {
    console.error('获取单接口统计失败:', error);
    res.status(500).json({ code: 500, message: '获取统计数据失败' });
  }
}

/**
 * 请求量时间趋势
 * GET /api/admin/api-usage/trend?days=30
 */
async function getTrend(req, res) {
  try {
    const days = parseInt(req.query.days) || 30;

    const [rows] = await pool.execute(
      `SELECT DATE(created_at) AS date,
              COUNT(*) AS total_count,
              SUM(CASE WHEN status_code >= 200 AND status_code < 400 THEN 1 ELSE 0 END) AS success_count,
              SUM(CASE WHEN status_code >= 500 THEN 1 ELSE 0 END) AS server_error_count,
              AVG(duration) AS avg_duration
       FROM api_usage_logs
       WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
       GROUP BY DATE(created_at)
       ORDER BY date ASC`,
      [days - 1]
    );

    // 补齐没有数据的日期
    const dateMap = {};
    rows.forEach(r => {
      dateMap[r.date.toISOString().split('T')[0]] = r;
    });
    const result = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const row = dateMap[dateStr];
      result.push({
        date: dateStr,
        total_count: row ? row.total_count : 0,
        success_count: row ? row.success_count : 0,
        server_error_count: row ? row.server_error_count : 0,
        avg_duration: row ? Number((row.avg_duration || 0).toFixed(2)) : 0
      });
    }

    res.json({ code: 200, message: '获取成功', data: result });
  } catch (error) {
    console.error('获取趋势失败:', error);
    res.status(500).json({ code: 500, message: '获取趋势数据失败' });
  }
}

/**
 * 访客 IP 分布 TOP
 * GET /api/admin/api-usage/ip-distribution?days=7&limit=20
 */
async function getIpDistribution(req, res) {
  try {
    const days = req.query.days || '7';
    const limit = parseInt(req.query.limit) || 20;
    const dateCondition = getDateRangeCondition(days);

    const [rows] = await pool.execute(
      `SELECT ip,
              COUNT(*) AS request_count,
              COUNT(DISTINCT route_key) AS api_count,
              SUM(CASE WHEN status_code >= 400 THEN 1 ELSE 0 END) AS error_count,
              MAX(created_at) AS last_seen
       FROM api_usage_logs
       WHERE ${dateCondition} AND ip IS NOT NULL AND ip != ''
       GROUP BY ip
       ORDER BY request_count DESC
       LIMIT ?`,
      [limit]
    );

    res.json({
      code: 200,
      message: '获取成功',
      data: rows.map(r => ({
        ip: r.ip,
        request_count: r.request_count,
        api_count: r.api_count,
        error_count: r.error_count,
        last_seen: r.last_seen
      }))
    });
  } catch (error) {
    console.error('获取IP分布失败:', error);
    res.status(500).json({ code: 500, message: '获取IP分布失败' });
  }
}

/**
 * 异常告警汇总
 * GET /api/admin/api-usage/alerts
 * 包含：短时间暴增接口、高频500接口、单次耗时超1分钟的请求
 */
async function getAlerts(req, res) {
  try {
    // 1. 高频500错误接口（近24小时 5xx >= 3次）
    const [serverErrorApis] = await pool.execute(
      `SELECT route_key, method, COUNT(*) AS error_count, MAX(created_at) AS last_error_at
       FROM api_usage_logs
       WHERE status_code >= 500 AND created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
       GROUP BY route_key, method
       HAVING error_count >= 3
       ORDER BY error_count DESC
       LIMIT 20`
    );

    // 2. 短时间暴增接口：最近1小时请求量 > 过去6天同时段均值的3倍，且绝对值>=20
    const [spikeApis] = await pool.execute(
      `SELECT route_key, method,
              SUM(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL 1 HOUR) THEN 1 ELSE 0 END) AS last_hour_count,
              COUNT(*) AS last_7days_count
       FROM api_usage_logs
       WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
       GROUP BY route_key, method
       HAVING last_hour_count >= 20 AND last_hour_count > (last_7days_count / 168) * 3
       ORDER BY last_hour_count DESC
       LIMIT 20`
    );

    // 3. 单次耗时超1分钟的请求（近7天）
    const [slowRequests] = await pool.execute(
      `SELECT id, route_key, method, path, duration, status_code, ip, created_at
       FROM api_usage_logs
       WHERE duration >= 60000 AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
       ORDER BY duration DESC
       LIMIT 20`
    );

    // 4. 近24小时错误率高的接口（调用>=10，错误率>=30%）
    const [highErrorRateApis] = await pool.execute(
      `SELECT route_key, method,
              COUNT(*) AS total_count,
              SUM(CASE WHEN status_code >= 400 THEN 1 ELSE 0 END) AS error_count,
              ROUND(SUM(CASE WHEN status_code >= 400 THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 2) AS error_rate
       FROM api_usage_logs
       WHERE created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
       GROUP BY route_key, method
       HAVING total_count >= 10 AND error_rate >= 30
       ORDER BY error_rate DESC
       LIMIT 20`
    );

    res.json({
      code: 200,
      message: '获取成功',
      data: {
        server_error_apis: serverErrorApis,
        spike_apis: spikeApis,
        slow_requests: slowRequests,
        high_error_rate_apis: highErrorRateApis
      }
    });
  } catch (error) {
    console.error('获取告警失败:', error);
    res.status(500).json({ code: 500, message: '获取告警数据失败' });
  }
}

/**
 * 原始日志查询（分页，用于排查）
 * GET /api/admin/api-usage/logs?page=1&pageSize=50&route_key=xxx&status=500
 */
async function getLogs(req, res) {
  try {
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 50;
    const offset = (page - 1) * pageSize;
    const { route_key, status, method, ip } = req.query;

    const conditions = ['1=1'];
    const params = [];
    if (route_key) { conditions.push('route_key = ?'); params.push(route_key); }
    if (status) { conditions.push('status_code = ?'); params.push(parseInt(status)); }
    if (method) { conditions.push('method = ?'); params.push(method); }
    if (ip) { conditions.push('ip = ?'); params.push(ip); }

    const where = conditions.join(' AND ');

    const [rows] = await pool.execute(
      `SELECT id, method, path, route_key, status_code, duration, ip, user_id, created_at
       FROM api_usage_logs
       WHERE ${where}
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, pageSize, offset]
    );

    const [countRow] = await pool.execute(
      `SELECT COUNT(*) AS total FROM api_usage_logs WHERE ${where}`,
      params
    );

    res.json({
      code: 200,
      message: '获取成功',
      data: { list: rows, total: countRow[0]?.total || 0, page, pageSize }
    });
  } catch (error) {
    console.error('获取日志失败:', error);
    res.status(500).json({ code: 500, message: '获取日志失败' });
  }
}

module.exports = {
  getOverview,
  getByApi,
  getTrend,
  getIpDistribution,
  getAlerts,
  getLogs
};
