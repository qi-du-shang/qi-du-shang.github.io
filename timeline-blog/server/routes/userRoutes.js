const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

// 公开路由
router.post('/register', userController.register);
router.post('/login', userController.login);
router.post('/forgot-password', userController.forgotPassword);
router.get('/detail/:userId', userController.getUserDetail);
router.get('/search', userController.searchUsers);

// 需要认证的路由
router.get('/profile', authMiddleware, userController.getUserInfo);
router.put('/profile', authMiddleware, userController.updateUserInfo);
router.put('/password', authMiddleware, userController.changePassword);

// 管理员路由
router.get('/list', authMiddleware, adminMiddleware, userController.getUserList);
router.put('/:userId/role', authMiddleware, adminMiddleware, userController.updateUserRole);
router.put('/:userId/reset-password', authMiddleware, adminMiddleware, userController.resetUserPassword);
router.put('/:userId/status', authMiddleware, adminMiddleware, userController.toggleUserStatus);
router.delete('/:userId', authMiddleware, adminMiddleware, userController.deleteUser);

module.exports = router;
