const pool = require('../config/db');

// 获取文章列表（时光轴）
async function getArticleList(req, res) {
  try {
    const { page = 1, pageSize = 20, keyword = '', userId = '' } = req.query;
    const offset = (page - 1) * pageSize;

    let whereClause = 'WHERE a.status = "published"';
    const params = [];

    if (keyword) {
      whereClause += ' AND (a.title LIKE ? OR a.content LIKE ?)';
      params.push(`%${keyword}%`, `%${keyword}%`);
    }

    if (userId) {
      whereClause += ' AND a.author_id = ?';
      params.push(userId);
    }

    const [articles] = await pool.query(
      `SELECT a.*, u.nickname as author_name, u.avatar as author_avatar,
              (SELECT COUNT(*) FROM comments c WHERE c.article_id = a.id) as comment_count,
              (SELECT COUNT(*) FROM likes l WHERE l.article_id = a.id) as like_count
       FROM articles a
       LEFT JOIN users u ON a.author_id = u.id
       ${whereClause}
       ORDER BY a.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, parseInt(pageSize), offset]
    );

    const [countResult] = await pool.query(
      `SELECT COUNT(*) as total FROM articles a ${whereClause}`,
      params
    );

    res.json({
      code: 200,
      message: '获取成功',
      data: {
        list: articles,
        total: countResult[0].total,
        page: parseInt(page),
        pageSize: parseInt(pageSize)
      }
    });
  } catch (error) {
    console.error('获取文章列表错误:', error);
    res.status(500).json({
      code: 500,
      message: '服务器内部错误'
    });
  }
}

// 获取文章详情
async function getArticleDetail(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user?.userId || null;

    const [articles] = await pool.query(
      `SELECT a.*, u.nickname as author_name, u.avatar as author_avatar,
              (SELECT COUNT(*) FROM comments c WHERE c.article_id = a.id) as comment_count,
              (SELECT COUNT(*) FROM likes l WHERE l.article_id = a.id) as like_count,
              (SELECT COUNT(*) FROM shares s WHERE s.article_id = a.id) as share_count
       FROM articles a
       LEFT JOIN users u ON a.author_id = u.id
       WHERE a.id = ?`,
      [id]
    );

    if (articles.length === 0) {
      return res.status(404).json({
        code: 404,
        message: '文章不存在'
      });
    }

    // 增加阅读数
    await pool.query(
      'UPDATE articles SET view_count = view_count + 1 WHERE id = ?',
      [id]
    );

    const article = articles[0];
    article.view_count += 1;

    // 记录用户阅读历史（登录用户才记录，去重）
    if (userId) {
      const [existingRead] = await pool.query(
        'SELECT id, read_count FROM article_reads WHERE user_id = ? AND article_id = ?',
        [userId, id]
      );

      if (existingRead.length > 0) {
        // 已阅读过，更新阅读次数和最后阅读时间
        await pool.query(
          'UPDATE article_reads SET read_count = read_count + 1, last_read_at = NOW() WHERE id = ?',
          [existingRead[0].id]
        );
      } else {
        // 首次阅读，插入记录
        await pool.query(
          'INSERT INTO article_reads (user_id, article_id) VALUES (?, ?)',
          [userId, id]
        );
        // 更新用户阅读数缓存
        await pool.query(
          'UPDATE users SET read_count = (SELECT COUNT(*) FROM article_reads WHERE user_id = ?) WHERE id = ?',
          [userId, userId]
        );
      }
    }

    // 计算字数
    article.word_count = article.content ? article.content.replace(/<[^>]*>/g, '').length : 0;

    res.json({
      code: 200,
      message: '获取成功',
      data: article
    });
  } catch (error) {
    console.error('获取文章详情错误:', error);
    res.status(500).json({
      code: 500,
      message: '服务器内部错误'
    });
  }
}

// 创建文章
async function createArticle(req, res) {
  try {
    const authorId = req.user.userId;
    const { title, content, summary, cover_image, status = 'draft' } = req.body;

    if (!title || !content) {
      return res.status(400).json({
        code: 400,
        message: '标题和内容不能为空'
      });
    }

    const [result] = await pool.query(
      `INSERT INTO articles (title, content, summary, cover_image, author_id, status) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [title, content, summary || '', cover_image || '', authorId, status]
    );

    res.status(201).json({
      code: 200,
      message: '创建成功',
      data: {
        articleId: result.insertId
      }
    });
  } catch (error) {
    console.error('创建文章错误:', error);
    res.status(500).json({
      code: 500,
      message: '服务器内部错误'
    });
  }
}

// 更新文章
async function updateArticle(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user.userId;
    const { title, content, summary, cover_image, status } = req.body;

    // 检查文章是否存在且属于当前用户（或管理员）
    const [articles] = await pool.query(
      'SELECT * FROM articles WHERE id = ?',
      [id]
    );

    if (articles.length === 0) {
      return res.status(404).json({
        code: 404,
        message: '文章不存在'
      });
    }

    const article = articles[0];

    // 非管理员只能编辑自己的文章
    if (req.user.role !== 'admin' && article.author_id !== userId) {
      return res.status(403).json({
        code: 403,
        message: '无权编辑此文章'
      });
    }

    const updates = [];
    const values = [];

    if (title !== undefined) {
      updates.push('title = ?');
      values.push(title);
    }
    if (content !== undefined) {
      updates.push('content = ?');
      values.push(content);
    }
    if (summary !== undefined) {
      updates.push('summary = ?');
      values.push(summary);
    }
    if (cover_image !== undefined) {
      updates.push('cover_image = ?');
      values.push(cover_image);
    }
    if (status !== undefined) {
      updates.push('status = ?');
      values.push(status);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        code: 400,
        message: '没有需要更新的内容'
      });
    }

    updates.push('updated_at = NOW()');
    values.push(id);

    await pool.query(
      `UPDATE articles SET ${updates.join(', ')} WHERE id = ?`,
      values
    );

    res.json({
      code: 200,
      message: '更新成功'
    });
  } catch (error) {
    console.error('更新文章错误:', error);
    res.status(500).json({
      code: 500,
      message: '服务器内部错误'
    });
  }
}

// 删除文章
async function deleteArticle(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const [articles] = await pool.query(
      'SELECT * FROM articles WHERE id = ?',
      [id]
    );

    if (articles.length === 0) {
      return res.status(404).json({
        code: 404,
        message: '文章不存在'
      });
    }

    const article = articles[0];

    if (req.user.role !== 'admin' && article.author_id !== userId) {
      return res.status(403).json({
        code: 403,
        message: '无权删除此文章'
      });
    }

    await pool.query('DELETE FROM articles WHERE id = ?', [id]);
    await pool.query('DELETE FROM comments WHERE article_id = ?', [id]);
    await pool.query('DELETE FROM likes WHERE article_id = ?', [id]);

    res.json({
      code: 200,
      message: '删除成功'
    });
  } catch (error) {
    console.error('删除文章错误:', error);
    res.status(500).json({
      code: 500,
      message: '服务器内部错误'
    });
  }
}

// 搜索文章
async function searchArticles(req, res) {
  try {
    const { keyword, page = 1, pageSize = 10 } = req.query;

    if (!keyword) {
      return res.status(400).json({
        code: 400,
        message: '搜索关键词不能为空'
      });
    }

    const offset = (page - 1) * pageSize;

    const [articles] = await pool.query(
      `SELECT a.id, a.title, a.summary, a.created_at, a.view_count,
              u.nickname as author_name, u.avatar as author_avatar,
              (SELECT COUNT(*) FROM comments c WHERE c.article_id = a.id) as comment_count
       FROM articles a
       LEFT JOIN users u ON a.author_id = u.id
       WHERE a.status = "published" AND (a.title LIKE ? OR a.content LIKE ?)
       ORDER BY a.created_at DESC
       LIMIT ? OFFSET ?`,
      [`%${keyword}%`, `%${keyword}%`, parseInt(pageSize), offset]
    );

    const [countResult] = await pool.query(
      `SELECT COUNT(*) as total FROM articles a 
       WHERE a.status = "published" AND (a.title LIKE ? OR a.content LIKE ?)`,
      [`%${keyword}%`, `%${keyword}%`]
    );

    res.json({
      code: 200,
      message: '搜索成功',
      data: {
        list: articles,
        total: countResult[0].total,
        page: parseInt(page),
        pageSize: parseInt(pageSize)
      }
    });
  } catch (error) {
    console.error('搜索文章错误:', error);
    res.status(500).json({
      code: 500,
      message: '服务器内部错误'
    });
  }
}

// 点赞文章
async function likeArticle(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    // 检查是否已点赞
    const [likes] = await pool.query(
      'SELECT id FROM likes WHERE article_id = ? AND user_id = ?',
      [id, userId]
    );

    if (likes.length > 0) {
      // 取消点赞
      await pool.query(
        'DELETE FROM likes WHERE id = ?',
        [likes[0].id]
      );
      return res.json({
        code: 200,
        message: '取消点赞成功',
        data: { liked: false }
      });
    } else {
      // 点赞
      await pool.query(
        'INSERT INTO likes (article_id, user_id) VALUES (?, ?)',
        [id, userId]
      );
      return res.json({
        code: 200,
        message: '点赞成功',
        data: { liked: true }
      });
    }
  } catch (error) {
    console.error('点赞文章错误:', error);
    res.status(500).json({
      code: 500,
      message: '服务器内部错误'
    });
  }
}

// 分享文章
async function shareArticle(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user?.userId || null;

    await pool.query(
      'INSERT INTO shares (article_id, user_id) VALUES (?, ?)',
      [id, userId]
    );

    res.json({
      code: 200,
      message: '分享成功'
    });
  } catch (error) {
    console.error('分享文章错误:', error);
    res.status(500).json({
      code: 500,
      message: '服务器内部错误'
    });
  }
}

// 获取仪表盘统计数据
async function getDashboardStats(req, res) {
  try {
    // 文章总数
    const [articleCount] = await pool.query(
      'SELECT COUNT(*) as count FROM articles WHERE status = "published"'
    );

    // 用户总数
    const [userCount] = await pool.query(
      'SELECT COUNT(*) as count FROM users'
    );

    // 评论总数
    const [commentCount] = await pool.query(
      'SELECT COUNT(*) as count FROM comments'
    );

    // 总阅读量
    const [totalViews] = await pool.query(
      'SELECT SUM(view_count) as total FROM articles'
    );

    // 近7天文章发布趋势
    const [articleTrend] = await pool.query(
      `SELECT DATE(created_at) as date, COUNT(*) as count 
       FROM articles 
       WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
       GROUP BY DATE(created_at)
       ORDER BY date ASC`
    );

    // 热门文章TOP5
    const [topArticles] = await pool.query(
      `SELECT id, title, view_count 
       FROM articles 
       WHERE status = "published"
       ORDER BY view_count DESC 
       LIMIT 5`
    );

    // 用户角色分布
    const [userRoles] = await pool.query(
      `SELECT role, COUNT(*) as count 
       FROM users 
       GROUP BY role`
    );

    res.json({
      code: 200,
      message: '获取成功',
      data: {
        totalArticles: articleCount[0].count,
        totalUsers: userCount[0].count,
        totalComments: commentCount[0].count,
        totalViews: totalViews[0].total || 0,
        articleTrend,
        topArticles,
        userRoles
      }
    });
  } catch (error) {
    console.error('获取仪表盘数据错误:', error);
    res.status(500).json({
      code: 500,
      message: '服务器内部错误'
    });
  }
}

module.exports = {
  getArticleList,
  getArticleDetail,
  createArticle,
  updateArticle,
  deleteArticle,
  searchArticles,
  likeArticle,
  shareArticle,
  getDashboardStats
};
