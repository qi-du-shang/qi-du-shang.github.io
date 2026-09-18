const express = require('express');
const router = express.Router();
const permissionController = require('../controllers/permissionController');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

// 所有权限相关路由都需要管理员权限
router.use(authMiddleware, adminMiddleware);

// 角色管理
router.get('/roles', permissionController.getRoles);
router.post('/roles', permissionController.createRole);
router.put('/roles/:id', permissionController.updateRole);
router.delete('/roles/:id', permissionController.deleteRole);
router.get('/roles/:roleId/permissions', permissionController.getRolePermissions);

// 权限管理
router.get('/permissions', permissionController.getPermissions);

module.exports = router;
