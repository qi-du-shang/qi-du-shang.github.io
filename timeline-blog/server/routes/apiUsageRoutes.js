const express = require('express');
const router = express.Router();
const apiUsageController = require('../controllers/apiUsageController');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

// 所有接口用量统计路由都需要管理员权限
router.use(authMiddleware, adminMiddleware);

// 总览统计
router.get('/overview', apiUsageController.getOverview);
// 单接口用量列表
router.get('/by-api', apiUsageController.getByApi);
// 请求量时间趋势
router.get('/trend', apiUsageController.getTrend);
// 访客IP分布
router.get('/ip-distribution', apiUsageController.getIpDistribution);
// 异常告警汇总
router.get('/alerts', apiUsageController.getAlerts);
// 原始日志查询（自身不记录，已在中间件 SKIP_EXACT 中排除）
router.get('/logs', apiUsageController.getLogs);

module.exports = router;
