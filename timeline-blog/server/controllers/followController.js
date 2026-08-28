const pool = require('../config/db');

/**
 * 关注/取消关注用户
 */
async function toggleFollow(req, res) {
  try {
    const followerId = req.user.userId;
    const { followingId } = req.params;

    if (followerId === parseInt(followingId)) {
      return res.status(400).json({
        code: 400,
        message: '不能关注自己'
      });
    }

    // 检查被关注用户是否存在
    const [users] = await pool.query(
      'SELECT id FROM users WHERE id = ?',
      [followingId]
    );
    if (users.length === 0) {
      return res.status(404).json({
        code: 404,
        message: '用户不存在'
      });
    }

    // 检查是否已关注
    const [follows] = await pool.query(
      'SELECT id FROM follows WHERE follower_id = ? AND following_id = ?',
      [followerId, followingId]
    );

    if (follows.length > 0) {
      // 取消关注
      await pool.query(
        'DELETE FROM follows WHERE id = ?',
        [follows[0].id]
      );
      // 更新缓存
      await updateFollowCounts(followingId);
      
      return res.json({
        code: 200,
        message: '取消关注成功',
        data: { isFollowing: false }
      });
    } else {
      // 关注
      await pool.query(
        'INSERT INTO follows (follower_id, following_id) VALUES (?, ?)',
        [followerId, followingId]
      );
      // 更新缓存
      await updateFollowCounts(followingId);
      
      return res.json({
        code: 200,
        message: '关注成功',
        data: { isFollowing: true }
      });
    }
  } catch (error) {
    console.error('关注操作错误:', error);
    res.status(500).json({
      code: 500,
      message: '服务器内部错误'
    });
  }
}

/**
 * 更新用户关注数和粉丝数缓存
 */
async function updateFollowCounts(userId) {
  await pool.query(
    `UPDATE users SET 
     follower_count = (SELECT COUNT(*) FROM follows WHERE following_id = ?),
     following_count = (SELECT COUNT(*) FROM follows WHERE follower_id = ?)
     WHERE id = ?`,
    [userId, userId, userId]
  );
}

/**
 * 检查是否关注了某用户
 */
async function checkFollow(req, res) {
  try {
    const followerId = req.user.userId;
    const { followingId } = req.params;

    const [follows] = await pool.query(
      'SELECT id FROM follows WHERE follower_id = ? AND following_id = ?',
      [followerId, followingId]
    );

    res.json({
      code: 200,
      message: '获取成功',
      data: { isFollowing: follows.length > 0 }
    });
  } catch (error) {
    console.error('检查关注状态错误:', error);
    res.status(500).json({
      code: 500,
      message: '服务器内部错误'
    });
  }
}

/**
 * 获取用户的粉丝列表
 */
async function getFollowers(req, res) {
  try {
    const { userId } = req.params;
    const { page = 1, pageSize = 20 } = req.query;
    const offset = (page - 1) * pageSize;

    const [followers] = await pool.query(
      `SELECT u.id, u.username, u.nickname, u.avatar, u.bio, u.follower_count, u.following_count
       FROM follows f
       INNER JOIN users u ON f.follower_id = u.id
       WHERE f.following_id = ?
       ORDER BY f.created_at DESC
       LIMIT ? OFFSET ?`,
      [userId, parseInt(pageSize), offset]
    );

    const [countResult] = await pool.query(
      'SELECT COUNT(*) as total FROM follows WHERE following_id = ?',
      [userId]
    );

    res.json({
      code: 200,
      message: '获取成功',
      data: {
        list: followers,
        total: countResult[0].total,
        page: parseInt(page),
        pageSize: parseInt(pageSize)
      }
    });
  } catch (error) {
    console.error('获取粉丝列表错误:', error);
    res.status(500).json({
      code: 500,
      message: '服务器内部错误'
    });
  }
}

/**
 * 获取用户的关注列表
 */
async function getFollowing(req, res) {
  try {
    const { userId } = req.params;
    const { page = 1, pageSize = 20 } = req.query;
    const offset = (page - 1) * pageSize;

    const [following] = await pool.query(
      `SELECT u.id, u.username, u.nickname, u.avatar, u.bio, u.follower_count, u.following_count
       FROM follows f
       INNER JOIN users u ON f.following_id = u.id
       WHERE f.follower_id = ?
       ORDER BY f.created_at DESC
       LIMIT ? OFFSET ?`,
      [userId, parseInt(pageSize), offset]
    );

    const [countResult] = await pool.query(
      'SELECT COUNT(*) as total FROM follows WHERE follower_id = ?',
      [userId]
    );

    res.json({
      code: 200,
      message: '获取成功',
      data: {
        list: following,
        total: countResult[0].total,
        page: parseInt(page),
        pageSize: parseInt(pageSize)
      }
    });
  } catch (error) {
    console.error('获取关注列表错误:', error);
    res.status(500).json({
      code: 500,
      message: '服务器内部错误'
    });
  }
}

/**
 * 获取关注统计数据（管理员）
 */
async function getFollowStats(req, res) {
  try {
    // 总关注数
    const [totalFollows] = await pool.query(
      'SELECT COUNT(*) as count FROM follows'
    );

    // 关注最多的用户TOP10
    const [topFollowed] = await pool.query(
      `SELECT id, username, nickname, avatar, follower_count
       FROM users
       ORDER BY follower_count DESC
       LIMIT 10`
    );

    // 近7天关注趋势
    const [followTrend] = await pool.query(
      `SELECT DATE(created_at) as date, COUNT(*) as count 
       FROM follows 
       WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
       GROUP BY DATE(created_at)
       ORDER BY date ASC`
    );

    res.json({
      code: 200,
      message: '获取成功',
      data: {
        totalFollows: totalFollows[0].count,
        topFollowed,
        followTrend
      }
    });
  } catch (error) {
    console.error('获取关注统计错误:', error);
    res.status(500).json({
      code: 500,
      message: '服务器内部错误'
    });
  }
}

module.exports = {
  toggleFollow,
  checkFollow,
  getFollowers,
  getFollowing,
  getFollowStats
};
