const fs = require('fs');
const https = require('https');

// ===================== 自定义配置区 =====================
// 重要商品名单，按需增删
const IMPORTANT_GOODS = [
  "祝福项坠",
  "棱镜球",
  "首领血脉秘药",
  "万能血脉秘药",
  "残缺魔镜",
  "适格钥匙",
  "能力钥匙",
  "炫彩蛋"
];
// 微信推送标题
const PUSH_TITLE = "洛克王国远行商人 · 重要商品上新";
// ========================================================

const API_URL = "https://rocokingdomworld.org/api/merchant/live";
const OUTPUT_FILE = "./data.json";
// 读取 GitHub 环境变量
const PUSH_TOKEN = process.env.PUSHPLUS_TOKEN || "";
const PUSH_TOPIC = process.env.PUSHPLUS_TOPIC || "";

/**
 * PushPlus 群组推送
 */
function sendGroupPush(text) {
  return new Promise((resolve) => {
    if (!PUSH_TOKEN || !PUSH_TOPIC) {
      console.log("❌ 未配置 PushPlus 密钥/群组编码，跳过推送");
      resolve(false);
      return;
    }

    const title = encodeURIComponent(PUSH_TITLE);
    const content = encodeURIComponent(text);
    // PushPlus 群组推送接口
    const pushUrl = `https://www.pushplus.plus/send?token=${PUSH_TOKEN}&topic=${PUSH_TOPIC}&title=${title}&content=${content}&template=txt`;

    https.get(pushUrl, (res) => {
      let resData = [];
      res.on('data', chunk => resData.push(chunk));
      res.on('end', () => {
        try {
          const result = JSON.parse(Buffer.concat(resData).toString());
          if (result.code === 200) {
            console.log("✅ PushPlus 群组推送成功，所有订阅用户已收到消息");
          } else {
            console.log("❌ 推送失败：", result.msg);
          }
        } catch (e) {
          console.log("❌ 推送结果解析异常");
        }
        resolve(true);
      });
    }).on('error', (err) => {
      console.log("❌ 推送接口请求异常：", err.message);
      resolve(false);
    });
  });
}

// 主流程：拉取接口 → 检测商品 → 写入JSON → 群组推送
https.get(API_URL, async (res) => {
  let chunks = [];
  res.on('data', (chunk) => chunks.push(chunk));

  res.on('end', async () => {
    try {
      const rawData = JSON.parse(Buffer.concat(chunks).toString());
      rawData.fetchedAt = new Date().toISOString();

      // 读取旧文件，判断是否已推送（防重复）
      let oldData = {};
      if (fs.existsSync(OUTPUT_FILE)) {
        oldData = JSON.parse(fs.readFileSync(OUTPUT_FILE, 'utf8'));
      }

      const currentRound = rawData.round;
      const oldRound = oldData.round || 0;
      const isPushed = oldData.hasPush || false;

      // 筛选当前轮次的重要商品
      const targetItems = rawData.items.filter(item => {
        return item.rounds && item.rounds.includes(currentRound)
          && IMPORTANT_GOODS.some(key => item.name.includes(key));
      });

      // 有重要商品 且 本轮未推送 → 执行推送
      if (targetItems.length > 0 && !(currentRound === oldRound && isPushed)) {
        console.log("🔔 检测到重要商品，开始 PushPlus 群组推送");
        let content = `当前轮次：第${currentRound}轮\n本轮开始：${rawData.startedAtBeijing}\n\n【重要商品清单】\n`;
        targetItems.forEach((item, idx) => {
          content += `${idx + 1}. ${item.name} | 价格：${item.price} 洛克贝 | 限购：${item.limit}\n`;
        });
        await sendGroupPush(content);
        rawData.hasPush = true; // 标记本轮已推送
      } else if (currentRound !== oldRound) {
        rawData.hasPush = false; // 新轮次，重置标记
      } else {
        rawData.hasPush = isPushed;
      }

      // 写入 data.json
      fs.writeFileSync(OUTPUT_FILE, JSON.stringify(rawData, null, 2), 'utf8');
      console.log("✅ 数据已成功写入 data.json");

    } catch (err) {
      console.error("❌ 数据处理失败：", err.message);
    }
  });
}).on('error', (err) => {
  console.error("❌ 请求官方API失败：", err.message);
});
