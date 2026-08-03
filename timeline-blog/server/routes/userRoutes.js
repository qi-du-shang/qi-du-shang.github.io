const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

// 公开路由
router.post('/register', userController.register);
router.post('/login', userController.login);
router.post('/forgot-password', userController.forgotPassword);

// 需要认证的路由
router.get('/profile', authMiddleware, userController.getUserInfo);
router.put('/profile', authMiddleware, userController.updateUserInfo);

// 管理员路由
router.get('/list', authMiddleware, adminMiddleware, userController.getUserList);
router.put('/:userId/role', authMiddleware, adminMiddleware, userController.updateUserRole);

module.exports = router;
