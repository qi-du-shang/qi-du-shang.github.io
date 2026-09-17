const pool = require('../config/db');

// 获取角色列表
async function getRoles(req, res) {
  try {
    const [roles] = await pool.query(
      'SELECT * FROM roles ORDER BY created_at DESC'
    );

    res.json({
      code: 200,
      message: '获取成功',
      data: roles
    });
  } catch (error) {
    console.error('获取角色列表错误:', error);
    res.status(500).json({
      code: 500,
      message: '服务器内部错误'
    });
  }
}

// 创建角色
async function createRole(req, res) {
  try {
    const { name, description, permissions = [] } = req.body;

    if (!name) {
      return res.status(400).json({
        code: 400,
        message: '角色名称不能为空'
      });
    }

    // 检查角色名是否已存在
    const [existingRoles] = await pool.query(
      'SELECT id FROM roles WHERE name = ?',
      [name]
    );

    if (existingRoles.length > 0) {
      return res.status(400).json({
        code: 400,
        message: '角色名称已存在'
      });
    }

    const [result] = await pool.query(
      'INSERT INTO roles (name, description) VALUES (?, ?)',
      [name, description || '']
    );

    // 分配权限
    if (permissions.length > 0) {
      const permissionValues = permissions.map(permId => [result.insertId, permId]);
      await pool.query(
        'INSERT INTO role_permissions (role_id, permission_id) VALUES ?',
        [permissionValues]
      );
    }

    res.status(201).json({
      code: 200,
      message: '创建成功',
      data: { roleId: result.insertId }
    });
  } catch (error) {
    console.error('创建角色错误:', error);
    res.status(500).json({
      code: 500,
      message: '服务器内部错误'
    });
  }
}

// 更新角色
async function updateRole(req, res) {
  try {
    const { id } = req.params;
    const { name, description, permissions } = req.body;

    const [roles] = await pool.query(
      'SELECT * FROM roles WHERE id = ?',
      [id]
    );

    if (roles.length === 0) {
      return res.status(404).json({
        code: 404,
        message: '角色不存在'
      });
    }

    const updates = [];
    const values = [];

    if (name !== undefined) {
      updates.push('name = ?');
      values.push(name);
    }
    if (description !== undefined) {
      updates.push('description = ?');
      values.push(description);
    }

    if (updates.length > 0) {
      values.push(id);
      await pool.query(
        `UPDATE roles SET ${updates.join(', ')} WHERE id = ?`,
        values
      );
    }

    // 更新权限
    if (permissions !== undefined) {
      await pool.query('DELETE FROM role_permissions WHERE role_id = ?', [id]);
      
      if (permissions.length > 0) {
        const permissionValues = permissions.map(permId => [id, permId]);
        await pool.query(
          'INSERT INTO role_permissions (role_id, permission_id) VALUES ?',
          [permissionValues]
        );
      }
    }

    res.json({
      code: 200,
      message: '更新成功'
    });
  } catch (error) {
    console.error('更新角色错误:', error);
    res.status(500).json({
      code: 500,
      message: '服务器内部错误'
    });
  }
}

// 删除角色
async function deleteRole(req, res) {
  try {
    const { id } = req.params;

    const [roles] = await pool.query(
      'SELECT * FROM roles WHERE id = ?',
      [id]
    );

    if (roles.length === 0) {
      return res.status(404).json({
        code: 404,
        message: '角色不存在'
      });
    }

    // 检查是否有用户使用此角色
    const [users] = await pool.query(
      'SELECT COUNT(*) as count FROM users WHERE role = ?',
      [roles[0].name]
    );

    if (users[0].count > 0) {
      return res.status(400).json({
        code: 400,
        message: '该角色下还有用户，无法删除'
      });
    }

    await pool.query('DELETE FROM roles WHERE id = ?', [id]);
    await pool.query('DELETE FROM role_permissions WHERE role_id = ?', [id]);

    res.json({
      code: 200,
      message: '删除成功'
    });
  } catch (error) {
    console.error('删除角色错误:', error);
    res.status(500).json({
      code: 500,
      message: '服务器内部错误'
    });
  }
}

// 获取权限列表
async function getPermissions(req, res) {
  try {
    const [permissions] = await pool.query(
      'SELECT * FROM permissions ORDER BY created_at DESC'
    );

    res.json({
      code: 200,
      message: '获取成功',
      data: permissions
    });
  } catch (error) {
    console.error('获取权限列表错误:', error);
    res.status(500).json({
      code: 500,
      message: '服务器内部错误'
    });
  }
}

// 获取角色权限
async function getRolePermissions(req, res) {
  try {
    const { roleId } = req.params;

    const [permissions] = await pool.query(
      `SELECT p.* 
       FROM permissions p
       INNER JOIN role_permissions rp ON p.id = rp.permission_id
       WHERE rp.role_id = ?
       ORDER BY p.created_at DESC`,
      [roleId]
    );

    res.json({
      code: 200,
      message: '获取成功',
      data: permissions
    });
  } catch (error) {
    console.error('获取角色权限错误:', error);
    res.status(500).json({
      code: 500,
      message: '服务器内部错误'
    });
  }
}

module.exports = {
  getRoles,
  createRole,
  updateRole,
  deleteRole,
  getPermissions,
  getRolePermissions
};
