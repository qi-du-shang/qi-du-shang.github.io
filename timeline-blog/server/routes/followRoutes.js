const express = require('express');
const router = express.Router();
const followController = require('../controllers/followController');
const { authMiddleware, adminMiddleware, optionalAuthMiddleware } = require('../middleware/auth');

// 需要认证的路由
router.post('/:followingId', authMiddleware, followController.toggleFollow);
router.get('/check/:followingId', authMiddleware, followController.checkFollow);

// 公开路由
router.get('/followers/:userId', followController.getFollowers);
router.get('/following/:userId', followController.getFollowing);

// 管理员路由
router.get('/admin/stats', authMiddleware, adminMiddleware, followController.getFollowStats);

module.exports = router;
