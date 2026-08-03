const pool = require('../config/db');
const bcrypt = require('bcryptjs');
const { generateToken } = require('../config/jwt');

// 用户注册
async function register(req, res) {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        code: 400,
        message: '用户名和密码不能为空'
      });
    }

    if (username.length < 3 || username.length > 20) {
      return res.status(400).json({
        code: 400,
        message: '用户名长度应在3-20个字符之间'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        code: 400,
        message: '密码长度不能少于6位'
      });
    }

    // 检查用户名是否已存在
    const [existingUsers] = await pool.query(
      'SELECT id FROM users WHERE username = ?',
      [username]
    );

    if (existingUsers.length > 0) {
      return res.status(400).json({
        code: 400,
        message: '用户名已被注册'
      });
    }

    // 加密密码
    const hashedPassword = await bcrypt.hash(password, 10);

    // 创建用户
    const [result] = await pool.query(
      'INSERT INTO users (username, password, nickname, role) VALUES (?, ?, ?, ?)',
      [username, hashedPassword, username, 'user']
    );

    res.status(201).json({
      code: 200,
      message: '注册成功',
      data: {
        userId: result.insertId,
        username
      }
    });
  } catch (error) {
    console.error('注册错误:', error);
    res.status(500).json({
      code: 500,
      message: '服务器内部错误'
    });
  }
}

// 用户登录
async function login(req, res) {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        code: 400,
        message: '用户名和密码不能为空'
      });
    }

    // 查找用户
    const [users] = await pool.query(
      'SELECT * FROM users WHERE username = ?',
      [username]
    );

    if (users.length === 0) {
      return res.status(400).json({
        code: 400,
        message: '用户名或密码错误'
      });
    }

    const user = users[0];

    // 验证密码
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(400).json({
        code: 400,
        message: '用户名或密码错误'
      });
    }

    // 生成token
    const token = generateToken({
      userId: user.id,
      username: user.username,
      role: user.role
    });

    // 更新最后登录时间
    await pool.query(
      'UPDATE users SET last_login_at = NOW() WHERE id = ?',
      [user.id]
    );

    res.json({
      code: 200,
      message: '登录成功',
      data: {
        token,
        user: {
          id: user.id,
          username: user.username,
          nickname: user.nickname,
          avatar: user.avatar,
          role: user.role
        }
      }
    });
  } catch (error) {
    console.error('登录错误:', error);
    res.status(500).json({
      code: 500,
      message: '服务器内部错误'
    });
  }
}

// 忘记密码
async function forgotPassword(req, res) {
  try {
    const { username, newPassword } = req.body;

    if (!username || !newPassword) {
      return res.status(400).json({
        code: 400,
        message: '用户名和新密码不能为空'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        code: 400,
        message: '新密码长度不能少于6位'
      });
    }

    // 查找用户
    const [users] = await pool.query(
      'SELECT id FROM users WHERE username = ?',
      [username]
    );

    if (users.length === 0) {
      return res.status(400).json({
        code: 400,
        message: '用户不存在'
      });
    }

    // 加密新密码
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // 更新密码
    await pool.query(
      'UPDATE users SET password = ? WHERE id = ?',
      [hashedPassword, users[0].id]
    );

    res.json({
      code: 200,
      message: '密码重置成功'
    });
  } catch (error) {
    console.error('重置密码错误:', error);
    res.status(500).json({
      code: 500,
      message: '服务器内部错误'
    });
  }
}

// 获取用户信息
async function getUserInfo(req, res) {
  try {
    const userId = req.user.userId;

    const [users] = await pool.query(
      'SELECT id, username, nickname, avatar, bio, role, created_at, last_login_at FROM users WHERE id = ?',
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({
        code: 404,
        message: '用户不存在'
      });
    }

    // 获取用户文章数
    const [articleCount] = await pool.query(
      'SELECT COUNT(*) as count FROM articles WHERE author_id = ? AND status = "published"',
      [userId]
    );

    res.json({
      code: 200,
      message: '获取成功',
      data: {
        ...users[0],
        articleCount: articleCount[0].count
      }
    });
  } catch (error) {
    console.error('获取用户信息错误:', error);
    res.status(500).json({
      code: 500,
      message: '服务器内部错误'
    });
  }
}

// 更新用户信息
async function updateUserInfo(req, res) {
  try {
    const userId = req.user.userId;
    const { nickname, bio, avatar } = req.body;

    const updates = [];
    const values = [];

    if (nickname !== undefined) {
      updates.push('nickname = ?');
      values.push(nickname);
    }
    if (bio !== undefined) {
      updates.push('bio = ?');
      values.push(bio);
    }
    if (avatar !== undefined) {
      updates.push('avatar = ?');
      values.push(avatar);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        code: 400,
        message: '没有需要更新的内容'
      });
    }

    values.push(userId);

    await pool.query(
      `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
      values
    );

    res.json({
      code: 200,
      message: '更新成功'
    });
  } catch (error) {
    console.error('更新用户信息错误:', error);
    res.status(500).json({
      code: 500,
      message: '服务器内部错误'
    });
  }
}

// 获取用户列表（管理员）
async function getUserList(req, res) {
  try {
    const { page = 1, pageSize = 10, keyword = '' } = req.query;
    const offset = (page - 1) * pageSize;

    let whereClause = '';
    const params = [];

    if (keyword) {
      whereClause = 'WHERE username LIKE ? OR nickname LIKE ?';
      params.push(`%${keyword}%`, `%${keyword}%`);
    }

    const [users] = await pool.query(
      `SELECT id, username, nickname, avatar, role, created_at, last_login_at 
       FROM users ${whereClause} 
       ORDER BY created_at DESC 
       LIMIT ? OFFSET ?`,
      [...params, parseInt(pageSize), offset]
    );

    const [countResult] = await pool.query(
      `SELECT COUNT(*) as total FROM users ${whereClause}`,
      params
    );

    res.json({
      code: 200,
      message: '获取成功',
      data: {
        list: users,
        total: countResult[0].total,
        page: parseInt(page),
        pageSize: parseInt(pageSize)
      }
    });
  } catch (error) {
    console.error('获取用户列表错误:', error);
    res.status(500).json({
      code: 500,
      message: '服务器内部错误'
    });
  }
}

// 更新用户角色（管理员）
async function updateUserRole(req, res) {
  try {
    const { userId } = req.params;
    const { role } = req.body;

    if (!['user', 'admin'].includes(role)) {
      return res.status(400).json({
        code: 400,
        message: '无效的角色'
      });
    }

    await pool.query(
      'UPDATE users SET role = ? WHERE id = ?',
      [role, userId]
    );

    res.json({
      code: 200,
      message: '角色更新成功'
    });
  } catch (error) {
    console.error('更新用户角色错误:', error);
    res.status(500).json({
      code: 500,
      message: '服务器内部错误'
    });
  }
}

module.exports = {
  register,
  login,
  forgotPassword,
  getUserInfo,
  updateUserInfo,
  getUserList,
  updateUserRole
};
