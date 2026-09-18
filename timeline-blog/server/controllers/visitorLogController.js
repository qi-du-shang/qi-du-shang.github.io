const pool = require('../config/db');

// 从 User-Agent 字符串解析浏览器、操作系统、设备类型（轻量版，不引入外部依赖）
function parseUserAgent(ua = '') {
  let browser = '未知';
  let os = '未知';
  let device = 'PC';

  // 设备类型判定（Mobile 优先于 Tablet）
  if (/iPad|Tablet|PlayBook|Silk/i.test(ua) && !/Mobile/i.test(ua)) {
    device = 'Tablet';
  } else if (/Mobile|Android|iPhone|iPod|Windows Phone/i.test(ua)) {
    device = 'Mobile';
  }

  // 操作系统
  if (/Windows NT 10\.0/i.test(ua)) os = 'Windows 10/11';
  else if (/Windows NT 6\.3/i.test(ua)) os = 'Windows 8.1';
  else if (/Windows NT 6\.1/i.test(ua)) os = 'Windows 7';
  else if (/Windows/i.test(ua)) os = 'Windows';
  else if (/Mac OS X/i.test(ua)) os = 'macOS';
  else if (/Android/i.test(ua)) os = 'Android';
  else if (/iPhone|iPad|iPod/i.test(ua)) os = 'iOS';
  else if (/Linux/i.test(ua)) os = 'Linux';

  // 浏览器
  if (/Edg(e|A|iOS)?\//i.test(ua)) browser = 'Edge';
  else if (/OPR\/|Opera/i.test(ua)) browser = 'Opera';
  else if (/Firefox\/|FxiOS\//i.test(ua)) browser = 'Firefox';
  else if (/Chrome\/|CriOS\//i.test(ua) && !/Chromium/i.test(ua)) browser = 'Chrome';
  else if (/Safari\//i.test(ua) && /Version\//i.test(ua)) browser = 'Safari';
  else if (/MSIE|Trident/i.test(ua)) browser = 'IE';
  else if (/MicroMessenger/i.test(ua)) browser = '微信内置';

  return { browser, os, device };
}

// 前端上报一条访问记录
async function reportVisit(req, res) {
  try {
    const { path, referer } = req.body || {};
    if (!path) {
      return res.status(400).json({ code: 400, message: 'path 不能为空' });
    }

    const ip = (req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || req.socket?.remoteAddress || '').split(',')[0].trim();
    const ua = (req.headers['user-agent'] || '').slice(0, 500);
    const { browser, os, device } = parseUserAgent(ua);

    // 登录用户信息
    let userId = null;
    let username = null;
    let nickname = null;
    if (req.user) {
      userId = req.user.userId;
      username = req.user.username || null;
      const [u] = await pool.query('SELECT nickname FROM users WHERE id = ?', [userId]);
      if (u.length > 0) nickname = u[0].nickname;
    }

    await pool.execute(
      `INSERT INTO visitor_logs (ip, user_id, username, nickname, path, referer, user_agent, browser, os, device)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [ip, userId, username, nickname, path.slice(0, 255), (referer || '').slice(0, 499), ua, browser, os, device]
    );

    res.json({ code: 200, message: 'ok' });
  } catch (err) {
    console.error('[visitorLog] 上报失败:', err.message);
    // 上报失败不影响用户访问
    res.json({ code: 200, message: 'ok' });
  }
}

// 管理员：访客记录列表
async function getVisitorLogs(req, res) {
  try {
    const {
      page = 1,
      pageSize = 20,
      keyword = '',
      userType = 'all',
      startDate = '',
      endDate = ''
    } = req.query;
    const offset = (page - 1) * pageSize;

    const where = [];
    const params = [];

    if (keyword) {
      where.push('(ip LIKE ? OR username LIKE ? OR nickname LIKE ? OR path LIKE ?)');
      const kw = `%${keyword}%`;
      params.push(kw, kw, kw, kw);
    }
    if (userType === 'login') {
      where.push('user_id IS NOT NULL');
    } else if (userType === 'guest') {
      where.push('user_id IS NULL');
    }
    if (startDate) {
      where.push('created_at >= ?');
      params.push(startDate);
    }
    if (endDate) {
      where.push('created_at <= ?');
      params.push(endDate + ' 23:59:59');
    }

    const whereSql = where.length ? 'WHERE ' + where.join(' AND ') : '';

    const [countResult] = await pool.query(
      `SELECT COUNT(*) AS total FROM visitor_logs ${whereSql}`,
      params
    );

    const [list] = await pool.query(
      `SELECT id, ip, user_id, username, nickname, path, referer, browser, os, device, created_at
       FROM visitor_logs ${whereSql}
       ORDER BY id DESC
       LIMIT ? OFFSET ?`,
      [...params, parseInt(pageSize), offset]
    );

    res.json({
      code: 200,
      message: '获取成功',
      data: {
        list,
        total: countResult[0].total,
        page: parseInt(page),
        pageSize: parseInt(pageSize)
      }
    });
  } catch (err) {
    console.error('[visitorLog] 查询列表失败:', err);
    res.status(500).json({ code: 500, message: '服务器内部错误' });
  }
}

// 管理员：访客统计概览
async function getVisitorStats(req, res) {
  try {
    const [[today]] = await pool.query(
      `SELECT COUNT(*) AS today_visits,
              COUNT(DISTINCT ip) AS today_unique_ips,
              COUNT(DISTINCT user_id) AS today_login_users
       FROM visitor_logs
       WHERE DATE(created_at) = CURDATE()`
    );

    const [[total]] = await pool.query(
      `SELECT COUNT(*) AS total_visits,
              COUNT(DISTINCT ip) AS total_unique_ips
       FROM visitor_logs`
    );

    // 最近7天趋势
    const [trend] = await pool.query(
      `SELECT DATE(created_at) AS date, COUNT(*) AS visits, COUNT(DISTINCT ip) AS uniques
       FROM visitor_logs
       WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)
       GROUP BY DATE(created_at)
       ORDER BY date ASC`
    );

    // 最近访问 Top10
    const [recent] = await pool.query(
      `SELECT ip, user_id, username, nickname, path, browser, os, device, created_at
       FROM visitor_logs
       ORDER BY id DESC
       LIMIT 10`
    );

    res.json({
      code: 200,
      message: '获取成功',
      data: {
        ...today,
        ...total,
        trend,
        recent
      }
    });
  } catch (err) {
    console.error('[visitorLog] 统计失败:', err);
    res.status(500).json({ code: 500, message: '服务器内部错误' });
  }
}

module.exports = {
  reportVisit,
  getVisitorLogs,
  getVisitorStats,
  parseUserAgent
};
