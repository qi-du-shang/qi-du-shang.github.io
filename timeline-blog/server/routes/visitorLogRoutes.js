const express = require('express');
const router = express.Router();
const visitorLogController = require('../controllers/visitorLogController');
const { authMiddleware, adminMiddleware, optionalAuthMiddleware } = require('../middleware/auth');

// 前端上报访问（可选认证：登录用户会关联到 user_id）
router.post('/report', optionalAuthMiddleware, visitorLogController.reportVisit);

// 管理员：访客记录与统计
router.get('/logs', authMiddleware, adminMiddleware, visitorLogController.getVisitorLogs);
router.get('/stats', authMiddleware, adminMiddleware, visitorLogController.getVisitorStats);

module.exports = router;
