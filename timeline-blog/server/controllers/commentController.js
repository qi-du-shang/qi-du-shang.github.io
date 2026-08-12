const pool = require('../config/db');

// 获取文章评论列表
async function getComments(req, res) {
  try {
    const { articleId } = req.params;
    const { page = 1, pageSize = 20 } = req.query;
    const offset = (page - 1) * pageSize;

    const [comments] = await pool.query(
      `SELECT c.*, u.nickname as user_name, u.avatar as user_avatar
       FROM comments c
       LEFT JOIN users u ON c.user_id = u.id
       WHERE c.article_id = ?
       ORDER BY c.created_at DESC
       LIMIT ? OFFSET ?`,
      [articleId, parseInt(pageSize), offset]
    );

    const [countResult] = await pool.query(
      'SELECT COUNT(*) as total FROM comments WHERE article_id = ?',
      [articleId]
    );

    res.json({
      code: 200,
      message: '获取成功',
      data: {
        list: comments,
        total: countResult[0].total,
        page: parseInt(page),
        pageSize: parseInt(pageSize)
      }
    });
  } catch (error) {
    console.error('获取评论列表错误:', error);
    res.status(500).json({
      code: 500,
      message: '服务器内部错误'
    });
  }
}

// 创建评论
async function createComment(req, res) {
  try {
    const userId = req.user.userId;
    const { articleId } = req.params;
    const { content, parent_id = null } = req.body;

    if (!content || content.trim() === '') {
      return res.status(400).json({
        code: 400,
        message: '评论内容不能为空'
      });
    }

    // 检查文章是否存在
    const [articles] = await pool.query(
      'SELECT id FROM articles WHERE id = ?',
      [articleId]
    );

    if (articles.length === 0) {
      return res.status(404).json({
        code: 404,
        message: '文章不存在'
      });
    }

    const [result] = await pool.query(
      `INSERT INTO comments (article_id, user_id, content, parent_id) 
       VALUES (?, ?, ?, ?)`,
      [articleId, userId, content.trim(), parent_id]
    );

    // 获取刚创建的评论
    const [newComments] = await pool.query(
      `SELECT c.*, u.nickname as user_name, u.avatar as user_avatar
       FROM comments c
       LEFT JOIN users u ON c.user_id = u.id
       WHERE c.id = ?`,
      [result.insertId]
    );

    // 通过Socket.io发送实时评论通知
    const io = req.app.get('io');
    if (io) {
      io.to(`article-${articleId}`).emit('newComment', newComments[0]);
    }

    res.status(201).json({
      code: 200,
      message: '评论成功',
      data: newComments[0]
    });
  } catch (error) {
    console.error('创建评论错误:', error);
    res.status(500).json({
      code: 500,
      message: '服务器内部错误'
    });
  }
}

// 删除评论
async function deleteComment(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const [comments] = await pool.query(
      'SELECT * FROM comments WHERE id = ?',
      [id]
    );

    if (comments.length === 0) {
      return res.status(404).json({
        code: 404,
        message: '评论不存在'
      });
    }

    const comment = comments[0];

    // 管理员或评论作者可以删除
    if (req.user.role !== 'admin' && comment.user_id !== userId) {
      return res.status(403).json({
        code: 403,
        message: '无权删除此评论'
      });
    }

    await pool.query('DELETE FROM comments WHERE id = ?', [id]);

    // 通过Socket.io发送评论删除通知
    const io = req.app.get('io');
    if (io) {
      io.to(`article-${comment.article_id}`).emit('deleteComment', id);
    }

    res.json({
      code: 200,
      message: '删除成功'
    });
  } catch (error) {
    console.error('删除评论错误:', error);
    res.status(500).json({
      code: 500,
      message: '服务器内部错误'
    });
  }
}

module.exports = {
  getComments,
  createComment,
  deleteComment
};
