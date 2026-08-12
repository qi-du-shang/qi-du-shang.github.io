const express = require('express');
const router = express.Router();
const commentController = require('../controllers/commentController');
const { authMiddleware } = require('../middleware/auth');

// 公开路由
router.get('/:articleId', commentController.getComments);

// 需要认证的路由
router.post('/:articleId', authMiddleware, commentController.createComment);
router.delete('/:id', authMiddleware, commentController.deleteComment);

module.exports = router;
