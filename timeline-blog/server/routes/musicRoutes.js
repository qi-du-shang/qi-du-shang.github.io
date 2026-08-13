const express = require('express');
const router = express.Router();
const musicController = require('../controllers/musicController');
const { authMiddleware } = require('../middleware/auth');

// 需要认证的路由 - 当前用户的音乐设置
router.get('/settings', authMiddleware, musicController.getMusicSettings);
router.put('/settings', authMiddleware, musicController.updateMusicSettings);

// 公开路由 - 获取指定用户的音乐设置
router.get('/settings/:userId', musicController.getUserMusicSettings);

module.exports = router;
