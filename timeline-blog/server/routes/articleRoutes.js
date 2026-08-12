const express = require('express');
const router = express.Router();
const articleController = require('../controllers/articleController');
const { authMiddleware, adminMiddleware, optionalAuthMiddleware } = require('../middleware/auth');

// 公开路由
router.get('/', articleController.getArticleList);
router.get('/search', articleController.searchArticles);
router.get('/:id', articleController.getArticleDetail);

// 需要认证的路由
router.post('/', authMiddleware, articleController.createArticle);
router.put('/:id', authMiddleware, articleController.updateArticle);
router.delete('/:id', authMiddleware, articleController.deleteArticle);
router.post('/:id/like', authMiddleware, articleController.likeArticle);
router.post('/:id/share', optionalAuthMiddleware, articleController.shareArticle);

// 管理员路由
router.get('/admin/dashboard', authMiddleware, adminMiddleware, articleController.getDashboardStats);

module.exports = router;
