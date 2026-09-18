const { verifyToken } = require('../config/jwt');

// 认证中间件 - 验证用户是否登录
function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({
      code: 401,
      message: '未登录，请先登录'
    });
  }

  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(401).json({
      code: 401,
      message: '登录已过期，请重新登录'
    });
  }

  req.user = decoded;
  next();
}

// 管理员权限中间件
function adminMiddleware(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({
      code: 403,
      message: '权限不足，需要管理员权限'
    });
  }
  next();
}

// 可选认证中间件 - 不强制登录，但有token会解析
function optionalAuthMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (token) {
    const decoded = verifyToken(token);
    if (decoded) {
      req.user = decoded;
    }
  }
  next();
}

module.exports = {
  authMiddleware,
  adminMiddleware,
  optionalAuthMiddleware
};
