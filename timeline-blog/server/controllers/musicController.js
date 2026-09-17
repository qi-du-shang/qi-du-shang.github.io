const pool = require('../config/db');

/**
 * 获取用户音乐播放器设置
 */
async function getMusicSettings(req, res) {
  try {
    const userId = req.user.userId;

    const [settings] = await pool.query(
      'SELECT * FROM user_music_settings WHERE user_id = ?',
      [userId]
    );

    if (settings.length === 0) {
      // 如果没有设置，创建默认设置
      await pool.query(
        'INSERT INTO user_music_settings (user_id) VALUES (?)',
        [userId]
      );
      
      const [newSettings] = await pool.query(
        'SELECT * FROM user_music_settings WHERE user_id = ?',
        [userId]
      );
      
      return res.json({
        code: 200,
        message: '获取成功',
        data: newSettings[0]
      });
    }

    res.json({
      code: 200,
      message: '获取成功',
      data: settings[0]
    });
  } catch (error) {
    console.error('获取音乐设置错误:', error);
    res.status(500).json({
      code: 500,
      message: '服务器内部错误'
    });
  }
}

/**
 * 更新用户音乐播放器设置
 */
async function updateMusicSettings(req, res) {
  try {
    const userId = req.user.userId;
    const { 
      music_platform, 
      playlist_id, 
      show_player, 
      show_lyric, 
      volume, 
      auto_play 
    } = req.body;

    const updates = [];
    const values = [];

    if (music_platform !== undefined) {
      if (!['netease', 'tencent', 'kugou', 'xiami', 'baidu'].includes(music_platform)) {
        return res.status(400).json({
          code: 400,
          message: '无效的音乐平台'
        });
      }
      updates.push('music_platform = ?');
      values.push(music_platform);
    }

    if (playlist_id !== undefined) {
      updates.push('playlist_id = ?');
      values.push(playlist_id);
    }

    if (show_player !== undefined) {
      updates.push('show_player = ?');
      values.push(show_player ? 1 : 0);
    }

    if (show_lyric !== undefined) {
      updates.push('show_lyric = ?');
      values.push(show_lyric ? 1 : 0);
    }

    if (volume !== undefined) {
      const vol = parseInt(volume);
      if (vol < 0 || vol > 100) {
        return res.status(400).json({
          code: 400,
          message: '音量必须在0-100之间'
        });
      }
      updates.push('volume = ?');
      values.push(vol);
    }

    if (auto_play !== undefined) {
      updates.push('auto_play = ?');
      values.push(auto_play ? 1 : 0);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        code: 400,
        message: '没有需要更新的内容'
      });
    }

    values.push(userId);

    // 检查是否存在设置记录
    const [existing] = await pool.query(
      'SELECT id FROM user_music_settings WHERE user_id = ?',
      [userId]
    );

    if (existing.length === 0) {
      // 不存在则创建
      await pool.query(
        `INSERT INTO user_music_settings (user_id, ${updates.map(u => u.split(' = ')[0]).join(', ')})
         VALUES (?, ${updates.map(() => '?').join(', ')})`,
        [userId, ...values.slice(0, -1)]
      );
    } else {
      // 存在则更新
      await pool.query(
        `UPDATE user_music_settings SET ${updates.join(', ')} WHERE user_id = ?`,
        values
      );
    }

    // 返回更新后的设置
    const [updatedSettings] = await pool.query(
      'SELECT * FROM user_music_settings WHERE user_id = ?',
      [userId]
    );

    res.json({
      code: 200,
      message: '更新成功',
      data: updatedSettings[0]
    });
  } catch (error) {
    console.error('更新音乐设置错误:', error);
    res.status(500).json({
      code: 500,
      message: '服务器内部错误'
    });
  }
}

/**
 * 获取指定用户的音乐设置（公开，用于访问用户主页时）
 */
async function getUserMusicSettings(req, res) {
  try {
    const { userId } = req.params;

    const [settings] = await pool.query(
      'SELECT music_platform, playlist_id, show_player, show_lyric, volume, auto_play FROM user_music_settings WHERE user_id = ?',
      [userId]
    );

    if (settings.length === 0) {
      // 返回默认设置
      return res.json({
        code: 200,
        message: '获取成功',
        data: {
          music_platform: 'netease',
          playlist_id: '',
          show_player: 1,
          show_lyric: 1,
          volume: 70,
          auto_play: 0
        }
      });
    }

    res.json({
      code: 200,
      message: '获取成功',
      data: settings[0]
    });
  } catch (error) {
    console.error('获取用户音乐设置错误:', error);
    res.status(500).json({
      code: 500,
      message: '服务器内部错误'
    });
  }
}

module.exports = {
  getMusicSettings,
  updateMusicSettings,
  getUserMusicSettings
};
