const fs = require('fs');
const https = require('https');

// 环境变量配置（在腾讯云SCF里配置）
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_REPO = process.env.GITHUB_REPO; // 格式: 用户名/仓库名
const GITHUB_USERNAME = process.env.GITHUB_USERNAME;
const PUSHPLUS_TOKEN = process.env.PUSHPLUS_TOKEN;
const PUSHPLUS_TOPIC = process.env.PUSHPLUS_TOPIC; // PushPlus群组编号，群推送必填

// 重要商品筛选列表（可按需增减）
// ======= 可配置参数（按需修改） =======
// 触发推送的重要商品名单
const IMPORTANT_ITEMS = [
    '祝福项坠',
    '首领血脉秘药',
    '万能血脉秘药',
    '奇异血脉秘药',
    // '国王球',
    '棱镜球',
    '炫彩蛋'
];

// 重试配置
const MAX_RETRY = 3;      // 最大重试次数（不含首次请求，总计请求 1+3=4 次）
const RETRY_INTERVAL = 30; // 每次重试间隔，单位：秒

// PushPlus推送重试配置
const PUSH_RETRY = 3;       // 推送最大重试次数（不含首次）
const PUSH_RETRY_INTERVAL = 5; // 推送重试间隔，单位：秒

// ======= 新增: 数据完整性校验 =======
function isDataComplete(data) {
    // 4层校验，覆盖绝大多数"数据未完全写入"的场景
    if (!data || typeof data !== 'object') return false;
    if (data.live !== true) return false;                // 接口服务状态异常
    if (!data.round || ![1,2,3,4].includes(data.round)) return false; // 轮次非法
    if (!Array.isArray(data.items) || data.items.length === 0) return false; // 总商品为空
    if (!data.rounds || !Array.isArray(data.rounds[data.round]) || data.rounds[data.round].length === 0) return false; // 当前轮次详情为空
    return true;
}

// ======= 新增: 带重试的数据拉取 =======
async function fetchMerchantDataWithRetry() {
    const API_URL = 'https://rocokingdomworld.org/api/merchant/live';
    const headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36'
    };

    for (let i = 0; i <= MAX_RETRY; i++) {
        try {
            console.log(`[拉取] 第${i+1}次请求数据...`);
            const response = await fetch(API_URL, { headers });

            if (!response.ok) throw new Error(`HTTP状态码异常: ${response.status}`);
            const data = await response.json();

            if (isDataComplete(data)) {
                console.log(`[拉取] 数据校验通过, 当前轮次: ${data.round}`);
                return data;
            }

            console.warn(`[拉取] 第${i+1}次数据不完整`);
            if (i < MAX_RETRY) {
                console.log(`等待 ${RETRY_INTERVAL} 秒后重试...`);
                await new Promise(resolve => setTimeout(resolve, RETRY_INTERVAL * 1000));
            }
        } catch (err) {
            console.error(`[拉取] 第${i+1}次请求失败: ${err.message}`);
            if (i < MAX_RETRY) {
                await new Promise(resolve => setTimeout(resolve, RETRY_INTERVAL * 1000));
            } else {
                throw err; // 最后一次仍失败，抛出错误
            }
        }
    }
    throw new Error(`累计${MAX_RETRY+1}次请求均未获取到完整数据`);
}

// ----------------------- 核心入口函数 -----------------------
exports.main_handler = async (event, context) => {
    try {
      console.log('=== 洛克王国远行商人数据更新任务开始 ===');
      // 1. 带重试拉取并校验数据
      const merchantData = await fetchMerchantDataWithRetry();
      const currentRound = merchantData.round || merchantData.currentRound || 0;
  
      // 2. 更新GitHub仓库的data.json
      console.log('开始更新GitHub数据文件...');
      await updateGitHubFile('data.json', JSON.stringify(merchantData, null, 2), `定时更新: ${new Date().toLocaleString('zh-CN')}`);
      console.log('✅ data.json已成功更新');
  
      // 3. 筛选重要商品 + 仅在非连续轮次时推送（核心修改：处理跳跃轮次）
      const items = merchantData.items || merchantData.goods || [];
      const importantItems = items.filter(item => {
        // 第一步：匹配重要商品名单
        if (!IMPORTANT_ITEMS.includes(item.name)) return false;
  
        // 第二步：判断是否需要推送
        const rounds = item.rounds || [currentRound]; // 无rounds字段则默认仅本轮
        
        // 如果本轮不在商品的出现轮次列表中，肯定不推送
        if (!rounds.includes(currentRound)) return false;
  
        // 如果是商品的第一个出现轮次，需要推送
        const firstRound = Math.min(...rounds);
        if (currentRound === firstRound) return true;
  
        // 检查上一轮是否在商品的出现轮次中
        // 如果上一轮也出现了，说明是连续轮次，不需要重复推送
        const previousRound = currentRound - 1;
        if (rounds.includes(previousRound)) return false;
  
        // 否则，上一轮没有出现，说明是跳跃轮次（如1,3或1,4），需要推送
        return true;
      });
  
      console.log(`本轮筛选出${importantItems.length}件需要推送的重要商品`);
  
      // 4. 推送通知（推送失败不中断主流程）
      if (importantItems.length > 0) {
        // 组装标题：提取稀有商品名字
     const itemNameList = importantItems.map(i => i.name);
     let pushTitle;
     if(itemNameList.length === 1){
         pushTitle = `稀有商品：${itemNameList[0]}`;
     }else{
         // 多个商品，逗号拼接，过长截断
         const nameStr = itemNameList.join('、');
         pushTitle = `稀有商品：${nameStr.length>30 ? nameStr.slice(0,30)+'…' : nameStr}`;
     }
        const pushContent = `
  ## 🔥 远行商人刷新！本轮有${importantItems.length}件稀有商品
  
  ### 🛒 必买清单
  ${importantItems.map(item => {
    const rounds = item.rounds || [currentRound];
    const startRound = Math.min(...rounds);
    const endRound = Math.max(...rounds);
    const durationText = startRound === endRound ? '⏳ 限时商品（仅本轮有效）' : `♻️ 常驻商品（持续${startRound}-${endRound}轮）`;
    return `
  - **${item.name}**  · ${durationText}
    - 价格：${item.price} 洛克贝
    - 限购：${item.limit} 个
    - 简介：${item.description || '暂无描述'}
    `;
  }).join('')}
  
  ### 🕒 本轮信息
  - 轮次：第${currentRound}轮
  - 开始时间：${merchantData.startedAtBeijing || merchantData.startTime || '未知'}
  - 下次刷新：${merchantData.nextRefreshBeijing || merchantData.nextRefresh || '未知'}
  
  点击查看完整商品列表：https://qi-du-shang.github.io/roco
        `;
        try {
          await sendPushPlus(pushTitle, pushContent);
          console.log('✅ 推送通知已发送');
        } catch (pushError) {
          // 推送失败只记警告，不影响整体任务结果
          console.warn('⚠️ 推送通知发送失败（数据已正常更新）:', pushError.message);
        }
      } else {
        console.log('ℹ️ 本轮无需要推送的重要商品，跳过推送');
      }
  
      console.log('=== 任务执行成功 ===');
      return { statusCode: 200, body: '任务执行成功' };
    } catch (error) {
      console.error('❌ 任务执行失败：', error);
      // 失败告警建议保留，方便及时排查故障；推送失败也不影响错误返回
      try {
        await sendPushPlus('❌ 远行商人数据更新失败', `错误信息: ${error.message}\n\n${error.stack}`);
      } catch (alertError) {
        console.error('⚠️ 失败告警推送也失败了:', alertError.message);
      }
      return { statusCode: 500, body: `任务执行失败: ${error.message}` };
    }
  };

// ----------------------- GitHub API 更新文件函数（无需Git）-----------------------
async function updateGitHubFile(filePath, content, message) {
    const getOptions = {
        hostname: 'api.github.com',
        path: `/repos/${GITHUB_REPO}/contents/${filePath}`,
        method: 'GET',
        headers: {
            'User-Agent': GITHUB_USERNAME,
            'Authorization': `token ${GITHUB_TOKEN}`,
            'Accept': 'application/vnd.github.v3+json'
        }
    };

    // 获取文件当前的SHA值（必须）
    let sha;
    try {
        const getResponse = await new Promise((resolve, reject) => {
            const req = https.request(getOptions, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => resolve({ statusCode: res.statusCode, data: JSON.parse(data) }));
            });
            req.on('error', reject);
            req.end();
        });

        if (getResponse.statusCode === 200) {
            sha = getResponse.data.sha;
        } else if (getResponse.statusCode === 404) {
            // 文件不存在，首次创建
            sha = null;
        } else {
            throw new Error(`获取文件信息失败: ${getResponse.statusCode}`);
        }
    } catch (err) {
        throw new Error(`获取文件SHA失败: ${err.message}`);
    }

    // 提交更新
    const updateData = {
        message: message,
        content: Buffer.from(content).toString('base64'),
        sha: sha
    };

    const updateOptions = {
        hostname: 'api.github.com',
        path: `/repos/${GITHUB_REPO}/contents/${filePath}`,
        method: 'PUT',
        headers: {
            'User-Agent': GITHUB_USERNAME,
            'Authorization': `token ${GITHUB_TOKEN}`,
            'Accept': 'application/vnd.github.v3+json',
            'Content-Type': 'application/json'
        }
    };

    await new Promise((resolve, reject) => {
        const req = https.request(updateOptions, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                if (res.statusCode === 200 || res.statusCode === 201) {
                    resolve();
                } else {
                    reject(new Error(`更新文件失败: ${res.statusCode} ${data}`));
                }
            });
        });
        req.on('error', reject);
        req.write(JSON.stringify(updateData));
        req.end();
    });
}

// ----------------------- PushPlus群推送函数（带重试+稳定写法）-----------------------
async function sendPushPlus(title, content) {
    const PUSHPLUS_URL = "https://www.pushplus.plus/send";
    const token = process.env.PUSHPLUS_TOKEN;
    const topic = process.env.PUSHPLUS_TOPIC;

    // 前置校验：token不能为空
    if (!token) {
        console.error('推送失败: PUSHPLUS_TOKEN 环境变量未配置');
        return { code: 999, msg: "token未配置" };
    }

    // 标题自动截断：官方限制100字符，预留余量设为90字符，超出自动加省略号
    const safeTitle = title.length > 90 ? title.slice(0, 90) + "..." : title;

    // 构造请求体，topic为空则不携带该字段，避免多余校验
    const requestBody = {
        token: token,
        title: safeTitle,
        content: content
    };
    if (topic) {
        requestBody.topic = topic;
    }

    // 带重试的请求
    let lastError = null;
    for (let i = 0; i <= PUSH_RETRY; i++) {
        try {
            if (i > 0) {
                console.log(`[推送] 第${i}次重试...`);
            }
            const response = await fetch(PUSHPLUS_URL, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36"
                },
                body: JSON.stringify(requestBody)
            });
            const result = await response.json();
            console.log('推送接口完整返回：', JSON.stringify(result));
            if (result.code !== 200) {
                console.error(`推送失败：错误码 ${result.code}, 原因: ${result.msg}`);
                throw new Error(`推送返回错误: ${result.msg}`);
            }
            return result;
        } catch (err) {
            lastError = err;
            console.error(`[推送] 第${i + 1}次请求失败：${err.message}`);
            if (i < PUSH_RETRY) {
                console.log(`等待 ${PUSH_RETRY_INTERVAL} 秒后重试...`);
                await new Promise(resolve => setTimeout(resolve, PUSH_RETRY_INTERVAL * 1000));
            }
        }
    }
    // 所有重试都失败了
    console.error('推送请求网络异常（重试全部失败）：', lastError.message);
    throw lastError;
}
